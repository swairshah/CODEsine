// ink.js, pencil edition: graphite and wax crayon for Canvas2D.
// Every mark is still a filled polygon recorded once into "plates" and replayed at any zoom, but a
// mark is now either graphite (lines, construction strokes, hatching, smudges) or crayon (colour laid
// in hand scribbles). Each frame is drawn twice in lockstep (see paper.js): once for colour, and once
// for how hard each mark was pressed. A paper shader then decides, pixel by pixel, whether the wax or
// the graphite caught on the tooth of the sheet.
'use strict';

(function (global) {
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const mulM = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function area(pts) {
    let s = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return s / 2;
  }

  function centroid(pts) {
    let x = 0, y = 0;
    for (const p of pts) { x += p[0]; y += p[1]; }
    return [x / pts.length, y / pts.length];
  }

  function inside(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }

  function catmull(pts, seg) {
    if (pts.length < 3) return pts.slice();
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let s = 0; s < seg; s++) {
        const t = s / seg, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) =>
          0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[n - 1]);
    return out;
  }

  function densify(pts, n) {
    if (pts.length !== 2) return pts;
    const [a, b] = pts, out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return out;
  }

  // A tapered stroke along a path: thin at both ends, swelling toward `skew`.
  function gougePoly(pts, w, o = {}) {
    const P = o.smooth === false || pts.length < 3 ? densify(pts, o.n || 6) : catmull(pts, o.seg || 4);
    const n = P.length;
    if (n < 2) return null;
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = cum[n - 1];
    if (tot < 1e-6) return null;
    const taper = o.taper ?? 0.06, pw = o.pow ?? 0.55, sk = o.skew ?? 0.5;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d;
      const u = cum[i] / tot;
      const wu = u < sk ? (0.5 * u) / sk : 0.5 + (0.5 * (u - sk)) / (1 - sk);
      const prof = taper + (1 - taper) * Math.pow(Math.sin(Math.PI * wu), pw);
      const hw = 0.5 * (typeof w === 'function' ? w(P[i][0], P[i][1]) : w) * prof;
      L.push([P[i][0] + nx * hw, P[i][1] + ny * hw]);
      R.push([P[i][0] - nx * hw, P[i][1] - ny * hw]);
    }
    return L.concat(R.reverse());
  }

  // Constant-width offset of a closed polygon: returns [outer, inner].
  function offsetRing(pts, w) {
    const n = pts.length, A = [], B = [];
    for (let i = 0; i < n; i++) {
      const p = pts[(i - 1 + n) % n], c = pts[i], q = pts[(i + 1) % n];
      let ax = c[0] - p[0], ay = c[1] - p[1], la = Math.hypot(ax, ay) || 1;
      let bx = q[0] - c[0], by = q[1] - c[1], lb = Math.hypot(bx, by) || 1;
      ax /= la; ay /= la; bx /= lb; by /= lb;
      let nx = -(ay + by), ny = ax + bx;
      const ln = Math.hypot(nx, ny) || 1;
      nx /= ln; ny /= ln;
      const dot = nx * -ay + ny * ax;
      const k = (0.5 * w) / Math.max(0.35, dot);
      A.push([c[0] + nx * k, c[1] + ny * k]);
      B.push([c[0] - nx * k, c[1] - ny * k]);
    }
    return [A, B];
  }

  function resampleOpen(pts, step) {
    const out = [pts[0]];
    let carry = step;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let s = carry;
      while (s < d) {
        out.push([a[0] + ((b[0] - a[0]) * s) / d, a[1] + ((b[1] - a[1]) * s) / d]);
        s += step;
      }
      carry = s - d;
    }
    const last = pts[pts.length - 1], prev = out[out.length - 1];
    if (Math.hypot(last[0] - prev[0], last[1] - prev[1]) > step * 0.25) out.push(last);
    else out[out.length - 1] = last;
    return out;
  }

  // Sutherland–Hodgman against an axis-aligned rectangle [x0, y0, x1, y1].
  function clipRect(pts, [x0, y0, x1, y1]) {
    const edges = [(p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1];
    const cut = [
      (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])],
      (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])],
      (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0],
      (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1],
    ];
    let out = pts;
    for (let e = 0; e < 4 && out.length; e++) {
      const inp = out;
      out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[i], b = inp[(i + 1) % inp.length];
        const ia = edges[e](a), ib = edges[e](b);
        if (ia) out.push(a);
        if (ia !== ib) out.push(cut[e](a, b));
      }
    }
    return out;
  }

  function addPoly(path, pts, sign) {
    const rev = (area(pts) < 0) !== (sign < 0);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[rev ? n - 1 - i : i];
      if (i) path.lineTo(p[0], p[1]);
      else path.moveTo(p[0], p[1]);
    }
    path.closePath();
  }

  // The crossings of the line v = const (in a frame turned by `ang`) with a polygon, sorted along u.
  function crossings(poly, ca, sa, v) {
    const us = [];
    for (let i = 0, n = poly.length; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n];
      const pv = -p[0] * sa + p[1] * ca, qv = -q[0] * sa + q[1] * ca;
      if ((pv - v) * (qv - v) < 0) {
        const k = (v - pv) / (qv - pv);
        us.push((p[0] + (q[0] - p[0]) * k) * ca + (p[1] + (q[1] - p[1]) * k) * sa);
      }
    }
    return us.sort((a, b) => a - b);
  }
  function vRange(poly, ca, sa) {
    let lo = Infinity, hi = -Infinity;
    for (const p of poly) {
      const v = -p[0] * sa + p[1] * ca;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return [lo, hi];
  }

  // How hard each graphite role presses, 0..1. Construction lines are barely there; the contour is
  // drawn with confidence; hatching and smudges carry the shade.
  const GRAPHITE = { graphite: 0.9, graphite2: 0.34, graphiteNote: 0.86, graphiteH: 0.5, graphiteH2: 0.74, graphiteS: 0.26, graphiteE: 0.6 };
  // graphite that shades (laid in with the colour) rather than draws
  const SHADING = { graphiteH: 1, graphiteH2: 1, graphiteS: 1 };
  const isGraphite = (role) => role.charCodeAt(0) === 103 && role.startsWith('graphite');
  // the right-handed hatching diagonal, on the page: up and to the right
  const HATCH = -1.02;
  // a line in 'ink' is a pencil line; a fill in 'ink' is black wax
  const lineRole = (role) => (role === 'ink' ? 'graphite' : role);
  // a stroke direction, folded to [0, π) and kept to 32 steps, as stored in the pressure canvas's blue
  const angQ = (a) => Math.round(((((a % Math.PI) + Math.PI) % Math.PI) / Math.PI) * 32) % 32;

  class Plate {
    constructor(seed) {
      this.layers = [];
      this.seed = seed;
      this.r = rng(seed);
      this.lod = 0;
      this.M = null;
    }
    withM(M, fn) {
      const prev = this.M;
      this.M = prev ? mulM(prev, M) : M;
      try { fn(); } finally { this.M = prev; }
    }
    withClip(rect, fn) {
      const prev = this.clipR;
      this.clipR = rect;
      try { fn(); } finally { this.clipR = prev; }
    }
    tx(pts) {
      if (this.clipR) pts = clipRect(pts, this.clipR);
      const M = this.M;
      if (!M) return pts;
      return pts.map(([x, y]) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]]);
    }
    // page units per local unit, so marks keep their size on the page whatever frame they are drawn in
    unit() {
      const M = this.M;
      return M ? Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1 : 1;
    }
    // a direction on the page, as an angle in the local frame
    localAngle(a) {
      const M = this.M;
      if (!M) return a;
      const det = M[0] * M[3] - M[1] * M[2] || 1;
      const dx = Math.cos(a), dy = Math.sin(a);
      return Math.atan2((-M[1] * dx + M[0] * dy) / det, (M[3] * dx - M[2] * dy) / det);
    }
    rand(a = 0, b = 1) {
      return a + (b - a) * this.r();
    }
    // A layer is one merged path of marks that share a role, a level of detail, an opacity and a
    // pressure. occ marks a fill that hides what is behind it (a surface), as opposed to a stroke on it.
    // the page direction of a local angle
    pageAngle(a) {
      const M = this.M;
      if (!M) return a;
      const dx = Math.cos(a), dy = Math.sin(a);
      return Math.atan2(M[1] * dx + M[3] * dy, M[0] * dx + M[2] * dy);
    }
    // run fn with crayon strokes going in local direction a (the grain of the wax follows them)
    withDir(a, fn) {
      const prev = this.sa;
      this.sa = this.pageAngle(a);
      try { fn(); } finally { this.sa = prev; }
    }
    layer(role, lod, alpha = 1, pr, occ = false) {
      const g = isGraphite(role);
      if (pr == null) pr = g ? GRAPHITE[role] ?? 0.7 : 0.84;
      pr = Math.round(pr * 20) / 20;
      alpha = Math.round(alpha * 20) / 20;
      const aq = g ? 0 : angQ(this.sa ?? HATCH);
      let L = this.layers[this.layers.length - 1];
      if (!L || L.kind !== 'path' || L.role !== role || L.lod !== lod || L.alpha !== alpha || L.pr !== pr || L.occ !== occ || L.aq !== aq) {
        L = { kind: 'path', role, lod, alpha, pr, occ, g, aq, path: new Path2D() };
        this.layers.push(L);
      }
      return L;
    }
    add(role, pts, lod, alpha, pr, occ) {
      if (!pts || pts.length < 3) return;
      const q = this.tx(pts);
      if (q.length >= 3) addPoly(this.layer(role, lod, alpha, pr, occ).path, q, 1);
    }
    // a patch of colour pressed in evenly: a surface (occluding) unless told otherwise
    crayon(role, pts, pr, lod = this.lod, alpha = 1, occ = true) {
      this.add(role, pts, lod, alpha, role === 'paper' ? 0 : pr, occ);
    }
    wash(role, pts, alpha, lod = 0) {
      if (alpha < 0.02) return;
      this.crayon(role, pts, 0.55, lod, alpha, false);
    }
    fill(role, pts, lod = this.lod) {
      if (!pts || pts.length < 3) return;
      if (role === 'shadow') return this.shadow(pts, lod);
      if (isGraphite(role)) return this.add(role, pts, lod, 1);
      this.crayon(role, pts, role === 'ink' ? 0.95 : 0.86, lod);
    }
    // a cast shadow on the table: rubbed graphite with a few hatched strokes through it
    shadow(pts, lod = 0) {
      this.add('graphiteS', pts, lod, 1);
      this.hatchG(pts, () => 0.5, { lod: Math.max(lod, 0.5), lim: 0.72, span: 0.6, gap: 3.6, cross: false });
    }
    ring(role, pts, w, lod = this.lod) {
      role = lineRole(role);
      const [A, B] = offsetRing(area(pts) < 0 ? pts.slice().reverse() : pts, w);
      const L = this.layer(role, lod, 1, isGraphite(role) ? undefined : 0.86);
      const a = this.tx(A), b = this.tx(B);
      if (a.length >= 3) addPoly(L.path, a, 1);
      if (b.length >= 3) addPoly(L.path, b, -1);
    }
    gouge(role, pts, w, o = {}) {
      role = lineRole(role);
      const poly = gougePoly(pts, w, o);
      if (poly) this.add(role, poly, o.lod ?? this.lod, o.alpha ?? 1, o.pr ?? (isGraphite(role) ? undefined : 0.86), false);
    }
    line(role, x1, y1, x2, y2, w, o = {}) {
      const bow = o.bow ?? 0;
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const mx = (x1 + x2) / 2 - (dy / d) * bow, my = (y1 + y2) / 2 + (dx / d) * bow;
      this.gouge(role, [[x1, y1], [mx, my], [x2, y2]], w, { seg: 3, ...o });
    }
    // Parallel strokes clipped to a polygon whose width follows o.tone(x, y): kept for the few places
    // machines hatch directly (vents, grilles). Drawn in pencil.
    hatch(role, poly, o = {}) {
      const ang = o.angle ?? 0, gap = o.gap ?? 8, w = o.w ?? 2.2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const [vmin, vmax] = vRange(poly, ca, sa);
      const lod = o.lod ?? 1;
      for (let v = vmin + this.rand(0.3, 0.7) * gap; v < vmax; v += gap) {
        const us = crossings(poly, ca, sa, v);
        for (let i = 0; i + 1 < us.length; i += 2) {
          const u0 = us[i], u1 = us[i + 1];
          const um = (u0 + u1) / 2, mx = um * ca - v * sa, my = um * sa + v * ca;
          const ww = w * (o.tone ? o.tone(mx, my) : 1);
          if (ww > 0.05 * w) this.gouge(role, [[u0 * ca - v * sa, u0 * sa + v * ca], [u1 * ca - v * sa, u1 * sa + v * ca]], ww, { lod, smooth: false, taper: 0.2, pow: 0.35 });
        }
      }
    }
    rings(role, cx, cy, rx, ry, o = {}) {
      const n = o.n ?? 12, from = o.from ?? 0.3, to = o.to ?? 1, w = o.w ?? 2;
      const lod = o.lod ?? 1;
      for (let k = 0; k < n; k++) {
        const f = from + ((to - from) * k) / Math.max(1, n - 1);
        const arcs = Math.max(4, Math.round((f * (rx + ry)) / 22));
        let a = this.rand(0, 1);
        const a1 = a + Math.PI * 2;
        while (a < a1) {
          const span = ((Math.PI * 2) / arcs) * this.rand(0.75, 1.1);
          const pts = [];
          for (let j = 0; j <= 4; j++) {
            const th = a + (span * j) / 4;
            pts.push([cx + rx * f * Math.cos(th), cy + ry * f * Math.sin(th)]);
          }
          const m = pts[2];
          if (!o.clip || inside(o.clip, m[0], m[1])) {
            const ww = w * (o.tone ? o.tone(m[0], m[1]) : 1);
            if (ww > 0.1 * w) this.gouge(role, pts, ww, { lod, taper: 0.08 });
          }
          a += span + this.rand(0.04, 0.12);
        }
      }
    }

    // ---------- graphite ----------
    // A graphite line: a little unsteady, its weight rising and falling with the pressure of the hand,
    // and running past its ends the way a draughtsman's stroke does.
    pencil(pts, o = {}) {
      const k = this.unit();
      let P = pts.length > 2 && o.curve ? catmull(pts, 4) : pts.slice();
      if (P.length < 2) return;
      const ov = (o.over ?? 5) / k;
      if (ov > 0) {
        const ext = (a, b, e) => {
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
          return [a[0] + ((a[0] - b[0]) / d) * e, a[1] + ((a[1] - b[1]) / d) * e];
        };
        P.unshift(ext(P[0], P[1], ov * this.rand(0.3, 1.3)));
        P.push(ext(P[P.length - 1], P[P.length - 2], ov * this.rand(0.3, 1.3)));
      }
      const Q = resampleOpen(P, (o.step ?? 7) / k);
      const amp = (o.wob ?? 0.35) / k, p1 = this.rand(0, 6), p2 = this.rand(0, 6), f1 = this.rand(0.04, 0.08) * k, f2 = this.rand(0.15, 0.3) * k;
      let s = 0;
      const W = Q.map((q, i) => {
        if (i) s += Math.hypot(q[0] - Q[i - 1][0], q[1] - Q[i - 1][1]);
        const a = Q[Math.max(0, i - 1)], b = Q[Math.min(Q.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const off = amp * (0.65 * Math.sin(s * f1 + p1) + 0.35 * Math.sin(s * f2 + p2));
        return [q[0] - (dy / d) * off, q[1] + (dx / d) * off];
      });
      // pressure: the line swells and thins along its length
      const w0 = o.w ?? 0.85, ph = this.rand(0, 6), fq = this.rand(0.02, 0.05) * k;
      const wf = (x, y) => w0 * (0.72 + 0.5 * (0.5 + 0.5 * Math.sin((x + y * 0.7) * fq + ph)));
      this.gouge(o.role || 'graphite', W, wf, { smooth: false, taper: o.taper ?? 0.18, pow: 0.3, lod: o.lod ?? 0.5 });
    }
    // Find a shape the way a draughtsman does: light construction strokes first, long and overshooting
    // the corners, then the contour pressed in over them, broken where the hand lifted.
    sketch(poly, o = {}) {
      if (!Plate.sketchy) return;
      const n = poly.length;
      if (n < 2) return;
      const k = this.unit();
      const closed = o.closed ?? true;
      const turn = (i) => {
        const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
        const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        return Math.abs(Math.atan2(Math.sin(t2 - t1), Math.cos(t2 - t1)));
      };
      let start = 0;
      if (closed) for (let i = 0; i < n; i++) if (turn(i) > 0.6) { start = i; break; }
      const seq = [];
      for (let kk = 0; kk <= (closed ? n : n - 1); kk++) seq.push(kk === n ? start : (start + kk) % n);
      const passes = [];
      if (o.construct !== false) passes.push({ role: 'graphite2', w: 0.7, over: 13, jit: 1.6, wob: 0.55, run: [60, 160] });
      if (o.contour) passes.push({ role: 'graphite', w: o.contour, over: 2.5, jit: 0.35, wob: 0.3, run: [140, 320] });
      for (const ps of passes) {
        // the contour goes over everything else in the part, as the last thing the hand does
        const late = ps.role === 'graphite';
        let keep;
        if (late) { keep = this.layers; this.layers = this.late || (this.late = []); }
        const jx = this.rand(-ps.jit, ps.jit) / k, jy = this.rand(-ps.jit, ps.jit) / k;
        let run = [], len = 0, maxLen = this.rand(ps.run[0], ps.run[1]) / k;
        const flush = () => {
          if (run.length >= 2) this.pencil(run.map(([x, y]) => [x + jx, y + jy]), { role: ps.role, w: ps.w / k, over: ps.over, lod: o.lod ?? 0.5, wob: ps.wob });
        };
        for (let kk = 0; kk < seq.length; kk++) {
          const i = seq[kk], p = poly[i];
          if (run.length) len += Math.hypot(p[0] - run[run.length - 1][0], p[1] - run[run.length - 1][1]);
          run.push(p);
          const corner = closed && kk > 0 && kk < seq.length - 1 && turn(i) > 0.6;
          if (corner || len > maxLen) {
            flush();
            run = [p];
            len = 0;
            maxLen = this.rand(ps.run[0], ps.run[1]) / k;
          }
        }
        flush();
        if (late) this.layers = keep;
      }
    }
    // end of a part: its contours go on top
    finish() {
      if (this.late) { this.layers.push(...this.late); this.late = null; }
    }
    // Hand hatching for shade: short parallel strokes in patches, all on the same right-handed diagonal
    // across the page, each flicked off at its end. Darker tone means closer, heavier strokes, and in the
    // deepest shade a second, crossing set.
    hatchG(poly, T, o = {}) {
      const k = this.unit();
      const lim = o.lim ?? 0.7, span = o.span ?? 0.45, lod = o.lod ?? 1;
      const sets = [[this.localAngle(HATCH), 1]];
      if (o.cross !== false) sets.push([this.localAngle(HATCH + 0.82), 0.62]);
      sets.forEach(([ang, strength], si) => {
        const gap = ((o.gap ?? 2.9) * (si ? 1.25 : 1)) / k;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const [vmin, vmax] = vRange(poly, ca, sa);
        for (let v = Math.ceil(vmin / gap) * gap; v < vmax; v += gap) {
          const us = crossings(poly, ca, sa, v);
          for (let i = 0; i + 1 < us.length; i += 2) {
            const u1 = us[i + 1] + this.rand(-1, 1.5) / k;
            let u = us[i] + this.rand(-1, 2) / k;
            while (u < u1 - 1 / k) {
              const ue = Math.min(u1, u + this.rand(16, 42) / k);
              const um = (u + ue) / 2;
              const vv = v + this.rand(-0.3, 0.3) * gap;
              const at = (uu) => [uu * ca - vv * sa, uu * sa + vv * ca];
              const m = at(um);
              const d = clamp((lim - T(m[0], m[1])) / span, 0, 1.2) * strength - (si ? 0.55 : 0);
              if (d > 0.04 + this.r() * 0.22) {
                const bow = this.rand(-0.6, 0.6) / k;
                const a = at(u), b = at(ue);
                this.gouge(d > 0.62 ? 'graphiteH2' : 'graphiteH', [a, [m[0] - sa * bow, m[1] + ca * bow], b], (0.42 + 0.5 * Math.min(1, d)) / k, { lod, taper: 0.1, skew: 0.32, seg: 3, pow: 0.4 });
              }
              u = ue + this.rand(-2, 3) / k;
            }
          }
        }
      });
    }
    // Rubbed graphite: a soft, even film of tone, rubbed in with a finger in the deepest shade.
    smudge(poly, amount, lod = 0.5) {
      this.add('graphiteS', poly, lod, clamp(amount, 0, 1));
    }

    // ---------- crayon ----------
    // Colour laid in the way a hand lays it: back-and-forth strokes that follow the surface, turning
    // in little hooks at the ends, running over the outline here and stopping short there, in runs of a
    // few passes before the crayon is lifted. Two pressures alternate from run to run.
    scribble(role, poly, o = {}) {
      const k = this.unit();
      const ang = o.angle ?? 0, ca = Math.cos(ang), sa = Math.sin(ang);
      const gap = (o.gap ?? 4.2) / k, w = (o.w ?? (o.gap ?? 4.2) * 0.66) / k;
      const [vmin, vmax] = vRange(poly, ca, sa);
      const groups = [[], []];
      const at = (u, v) => [u * ca - v * sa, u * sa + v * ca];
      let run = [], dir = this.r() < 0.5 ? 1 : -1, n = 0, maxN = 3 + Math.floor(this.r() * 9), g = 0;
      const flush = () => {
        if (run.length >= 2) {
          const pp = gougePoly(run, w, { smooth: false, taper: 0.3, pow: 0.12 });
          if (pp) groups[g].push(pp);
        }
        run = [];
        n = 0;
        maxN = 3 + Math.floor(this.r() * 9);
        g = this.r() < 0.45 ? 1 : 0;
      };
      const over = o.over ?? 1;
      for (let v = Math.ceil(vmin / gap) * gap + gap * 0.5; v < vmax; v += gap) {
        const us = crossings(poly, ca, sa, v);
        if (us.length < 2) { flush(); continue; }
        if (us.length > 2) {
          flush();
          for (let i = 0; i + 1 < us.length; i += 2) {
            const ov = Math.min(1, ((us[i + 1] - us[i]) * k) / 40) * over / k;
            const a = us[i] - this.rand(-1.5, 3) * ov, b = us[i + 1] + this.rand(-1.5, 3) * ov;
            if (b - a > gap * 0.4) run = [at(a, v), at(b, v)], flush();
          }
          continue;
        }
        const u0 = us[0], u1 = us[1];
        if (o.keep) {
          const m = at((u0 + u1) / 2, v);
          if (!o.keep(m[0], m[1])) { flush(); continue; }
        }
        const ov = Math.min(1, ((u1 - u0) * k) / 40) * over / k;
        const a = u0 - this.rand(-1.6, 3.2) * ov, b = u1 + this.rand(-1.6, 3.2) * ov;
        if (b - a < gap * 0.3) continue;
        const vj = v + this.rand(-0.22, 0.22) * gap;
        const A = dir > 0 ? at(a, vj) : at(b, vj), B = dir > 0 ? at(b, vj) : at(a, vj);
        if (run.length) {
          // the hook where the hand turns: a small loop bulging past the end of the stroke
          const E = run[run.length - 1], hs = -dir * gap * 0.42;
          run.push([(E[0] + A[0]) / 2 + ca * hs, (E[1] + A[1]) / 2 + sa * hs]);
        }
        run.push(A, B);
        dir = -dir;
        if (++n >= maxN || this.r() < 0.04) flush();
      }
      flush();
      const prs = o.pr || [0.82, 0.64];
      this.withDir(ang, () => groups.forEach((G, i) => {
        if (!G.length) return;
        const L = this.layer(role, o.lod ?? 1, o.alpha ?? 1, prs[i], false);
        for (const pp of G) {
          const q = this.tx(pp);
          if (q.length >= 3) addPoly(L.path, q, 1);
        }
      }));
    }

    // A pencilled dimension: a line with end ticks and a small hand-lettered label.
    dim(x1, y1, x2, y2, label, o = {}) {
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, t = o.tick ?? 6;
      const lod = o.lod ?? 1;
      this.pencil([[x1, y1], [x2, y2]], { role: 'graphiteNote', w: 0.6, over: 3, lod, wob: 0.2 });
      for (const [x, y] of [[x1, y1], [x2, y2]]) this.pencil([[x - nx * t, y - ny * t], [x + nx * t, y + ny * t]], { role: 'graphiteNote', w: 0.6, over: 0, lod, wob: 0 });
      let a = Math.atan2(dy, dx);
      if (a > Math.PI / 2) a -= Math.PI;
      if (a < -Math.PI / 2) a += Math.PI;
      const off = o.off ?? 12;
      this.text('graphiteNote', label, (x1 + x2) / 2 + nx * off, (y1 + y2) / 2 + ny * off, (o.size ?? 13) * 1.15, { font: 'hand', weight: 400, rot: a, lod });
    }
    note(x, y, str, o = {}) {
      this.text('graphiteNote', str, x, y, (o.size ?? 15) * 1.2, { font: 'hand', weight: 400, align: o.align || 'left', rot: (o.rot || 0) - 0.015, lod: o.lod ?? 1 });
    }

    // A shaded surface. tone: 0 = black, 1 = white (number or fn(x, y)).
    // A coloured surface is crayon: an even first layer, pressed lighter where the light falls, then
    // scribbled strokes that follow the surface, a darker crayon crossed over the shade, and a touch of
    // white wax where it catches the light. A plain surface (white plastic, aluminium) is left as paper
    // and modelled in graphite. Dark materials are black wax. Graphite hatching and, in the deepest
    // shade, a rubbed smudge go over all of it, and the contour is drawn last.
    face(poly, tone, o = {}) {
      const T = typeof tone === 'function' ? tone : () => tone;
      const c = centroid(poly);
      const t0 = T(c[0], c[1]);
      const k = this.unit();
      const size = Math.sqrt(Math.abs(area(poly))) * k;
      const ang = o.angle ?? 0;
      const lod = o.lod ?? 0;
      const dark = !!o.dark || o.fill === 'ink';
      let role = o.fill || (dark ? 'ink' : null);
      // the face's extent on the page along its surface direction and across it: thin bands (rounded
      // edges, rims) are coloured evenly, not scribbled
      const cu = Math.cos(ang), su = Math.sin(ang);
      const [v0, v1] = vRange(poly, cu, su), [w0, w1] = vRange(poly, -su, cu);
      const strokes = Math.min(v1 - v0, w1 - w0) * k > 9 && size > 7;
      const prevSa = this.sa;
      this.sa = this.pageAngle(ang);
      if (dark) {
        this.crayon(role, poly, 0.97 - 0.36 * clamp((t0 - 0.18) / 0.6, 0, 1), lod);
        if (strokes) {
          this.scribble(role, poly, { angle: ang + this.rand(-0.1, 0.1), gap: 3.6, pr: [0.98, 0.86] });
          // light glancing off the wax
          if (t0 > 0.5) this.scribble('light', poly, { angle: ang + 0.4, gap: 9, w: 2, pr: [0.4, 0.3], alpha: 0.22, keep: (x, y) => T(x, y) > 0.6 + this.r() * 0.2 });
        }
      } else if (role) {
        this.crayon(role, poly, 0.66 - 0.3 * clamp((t0 - 0.32) / 0.62, 0, 1), lod);
        if (strokes) {
          this.scribble(role, poly, { angle: ang + this.rand(-0.12, 0.12), gap: 4.2, pr: [0.84, 0.66] });
          if (o.hatch !== false) this.scribble(role + '~d', poly, { angle: ang + 0.55 + this.rand(-0.1, 0.1), gap: 5, pr: [0.78, 0.6], alpha: 0.62, keep: (x, y) => T(x, y) < 0.6 + this.r() * 0.16 });
          if (t0 > 0.84) this.scribble('light', poly, { angle: ang - 0.3, gap: 6, w: 3, pr: [0.6, 0.45], alpha: 0.45, keep: (x, y) => T(x, y) > 0.86 + this.r() * 0.06 });
        }
      } else {
        // left as paper, a cool grey pencil laid lightly over the turning faces
        role = 'paper';
        this.crayon('paper', poly, 0, lod);
        const pr = 0.3 * clamp((0.82 - t0) / 0.45, 0, 1);
        if (pr > 0.05) this.crayon('mist', poly, pr, lod, 1, false);
        if (strokes && t0 < 0.78) this.scribble('mist', poly, { angle: ang, gap: 5.2, pr: [0.58, 0.44], alpha: 0.7, keep: (x, y) => T(x, y) < 0.74 + this.r() * 0.1 });
      }
      if (o.hatch !== false && !dark) {
        const lim = role === 'paper' ? 0.8 : 0.66;
        if (t0 < 0.5) this.smudge(poly, 0.35 + (0.5 - t0), 0.5);
        if (size > 4) this.hatchG(poly, T, { lim, span: 0.46, lod: 1 });
      }
      this.sa = prevSa;
      if (o.edge && o.edge > 0) this.sketch(poly, { lod: 0.5, contour: 1.15 + 0.4 * o.edge, construct: o.pencil !== false && size > 26 && this.r() < 0.7 });
      else if (o.pencil !== false && size > 26) this.sketch(poly, { lod: 0.5 });
      return role;
    }
    dots(role, poly, gap, r, lod = 1) {
      let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
      for (const p of poly) {
        xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]);
        ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]);
      }
      let row = 0;
      for (let y = ymin + gap / 2; y < ymax; y += gap, row++) {
        for (let x = xmin + gap / 2 + (row % 2) * gap * 0.5; x < xmax; x += gap) {
          if (!inside(poly, x, y)) continue;
          const d = [];
          for (let kk = 0; kk < 8; kk++) d.push([x + r * Math.cos((kk * Math.PI) / 4), y + r * Math.sin((kk * Math.PI) / 4)]);
          this.add(lineRole(role), d, lod, 1, isGraphite(lineRole(role)) ? undefined : 0.86, false);
        }
      }
    }
    text(role, str, x, y, size, o = {}) {
      if (role === 'ink' && o.font !== 'hand') role = 'graphiteE';
      this.layers.push({ kind: 'text', role, g: isGraphite(role), pr: isGraphite(role) ? GRAPHITE[role] ?? 0.7 : 0.9, alpha: 1, lod: o.lod ?? 0.5, str, x, y, size, font: o.font || 'mono', align: o.align || 'center', rot: o.rot || 0, weight: o.weight || 500, italic: !!o.italic, track: o.track || 0, M: this.M, base: o.base || 'middle' });
    }
  }

  Plate.notes = true;
  Plate.sketchy = true;
  Plate.style = 'pencil';

  const FONTS = {
    mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    serif: '"Old Standard TT", "Iowan Old Style", Georgia, serif',
    hand: '"Architects Daughter", "Bradley Hand", "Segoe Print", cursive',
  };

  function fontStr(L) {
    return `${L.italic ? 'italic ' : ''}${L.weight} ${L.size}px ${FONTS[L.font] || L.font}`;
  }

  // halo > 0 strokes the letters that wide instead of filling them
  function drawText(c, L, halo) {
    c.save();
    if (L.M) c.transform(L.M[0], L.M[1], L.M[2], L.M[3], L.M[4], L.M[5]);
    c.translate(L.x, L.y);
    if (L.rot) c.rotate(L.rot);
    c.font = fontStr(L);
    c.textAlign = L.align;
    c.textBaseline = L.base;
    if ('letterSpacing' in c) c.letterSpacing = `${L.track || 0}px`;
    if (halo) {
      c.lineWidth = halo;
      c.lineJoin = 'round';
      c.strokeText(L.str, 0, 0);
    } else c.fillText(L.str, 0, 0);
    c.restore();
  }

  // Fine layers fade in as a device grows on screen.
  function lodAlpha(lod, detail) {
    if (!lod) return 1;
    return smooth(lod * 0.16, lod * 0.42, detail);
  }

  // ---------- colours ----------
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  function parseColour(s) {
    if (s[0] === '#') return s.length >= 7 ? hex(s) : [parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), parseInt(s[3] + s[3], 16)];
    const m = s.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1] : [0, 0, 0];
  }
  function makePal(rgb) {
    const p = { rgb };
    for (const k in rgb) p[k] = css(rgb[k]);
    return p;
  }
  function mixPal(A, B, t) {
    if (t <= 0) return A;
    if (t >= 1) return B;
    const rgb = {};
    for (const k in A.rgb) rgb[k] = mix(A.rgb[k], B.rgb[k] || A.rgb[k], t);
    return makePal(rgb);
  }
  // A role's crayon. 'x~d' is the darker crayon an illustrator crosses over x in shade: the same hue
  // pushed toward a deep violet-brown, as coloured-pencil artists shade with a complement.
  const SHADE = [58, 44, 66];
  function rgbOf(role, pal) {
    if (role[0] === '#') return pal.mapHex ? parseColour(pal.mapHex(role)) : hex(role);
    return (pal.rgb && pal.rgb[role]) || (pal.rgb && pal.rgb.ink) || [40, 36, 34];
  }
  function colourOf(role, pal) {
    const t = role.indexOf('~');
    if (t > 0) return css(mix(rgbOf(role.slice(0, t), pal), SHADE, 0.42));
    if (role[0] === '#') return pal.mapHex ? pal.mapHex(role) : role;
    return pal[role] || pal.ink;
  }

  // ---------- replay ----------
  const PR = [];
  for (let i = 0; i <= 20; i++) PR.push(`rgb(${Math.round((i / 20) * 255)},0,0)`);
  const PRA = new Map();
  const prAngStyle = (pr, aq) => {
    const key = Math.round(clamp(pr, 0, 1) * 20) * 32 + aq;
    let s = PRA.get(key);
    if (!s) PRA.set(key, (s = `rgb(${Math.round(clamp(pr, 0, 1) * 255)},0,${aq * 8})`));
    return s;
  };
  const GR = [];
  for (let i = 0; i <= 20; i++) GR.push(`rgb(0,${Math.round((i / 20) * 255)},0)`);
  const prStyle = (pr) => PR[Math.round(clamp(pr, 0, 1) * 20)];
  const grStyle = (pr) => GR[Math.round(clamp(pr, 0, 1) * 20)];

  // The edge of the colouring as it advances across a drawing: ragged, like the line where someone
  // stopped colouring in, in the plate's own 1000 × 1000 frame.
  function revealPath(r, seed) {
    const path = new Path2D();
    const x0 = -140 + r * 1280, ph = (seed % 97) * 0.13;
    path.moveTo(-4000, -3000);
    for (let y = -3000; y <= 4000; y += 18) {
      const tooth = (Math.abs(((y * 0.021 + ph) % 2 + 2) % 2 - 1) - 0.5) * 34;
      const x = x0 + tooth + 26 * Math.sin(y * 0.0063 + ph * 3) + 9 * Math.sin(y * 0.047 + ph);
      path.lineTo(x, y);
    }
    path.lineTo(-4000, 4000);
    path.closePath();
    return path;
  }

  // Replay a plate into a dual context D (D.C colour, D.P pressure). alpha is how far its colour has
  // been laid in (a ragged front sweeping across it), pencil how far its drawing has come; opt.fade
  // makes alpha a plain transparency instead, for glass and motion blur.
  function drawPlate(D, plate, pal, alpha, detail, pencil = alpha, opt) {
    const C = D.C, P = D.P;
    const fade = opt && opt.fade;
    const partial = !fade && alpha < 0.997;
    const reveal = partial && alpha > 0.003 ? revealPath(alpha, plate.seed || 1) : null;
    const colA = fade ? alpha : alpha > 0.003 ? 1 : 0;
    const paperCol = pal.paper;
    for (const L of plate.layers) {
      const lodA = lodAlpha(L.g && !SHADING[L.role] ? L.lod * 0.4 : L.lod, detail);
      if (L.g && !SHADING[L.role]) {
        // the drawing: construction strokes come first, the contour after them
        if (L.role === 'graphiteNote' && !Plate.notes) continue;
        let a = (L.role === 'graphite2' ? smooth(0, 0.42, pencil) * (1 - smooth(1.8, 3.6, detail)) : L.role === 'graphiteNote' ? pencil : smooth(0.16, 0.7, pencil)) * lodA * L.alpha;
        if (fade) a *= alpha;
        if (a < 0.004) continue;
        if (L.role === 'graphiteNote' && L.kind === 'text') {
          // a note is written where the paper was rubbed clean for it first
          C.globalAlpha = P.globalAlpha = a;
          C.strokeStyle = paperCol;
          P.strokeStyle = PR[0];
          drawText(C, L, L.size * 0.5);
          drawText(P, L, L.size * 0.5);
        }
        P.globalCompositeOperation = 'lighter';
        P.globalAlpha = a;
        P.fillStyle = grStyle(L.pr);
        if (L.kind === 'path') P.fill(L.path);
        else drawText(P, L);
        P.globalCompositeOperation = 'source-over';
        continue;
      }
      // a surface not yet coloured still hides what is behind it, as a drawn outline would
      if (partial && L.occ && L.kind === 'path') {
        const ka = Math.min(1, pencil * 1.4) * lodA;
        if (ka > 0.004) {
          C.globalAlpha = P.globalAlpha = ka;
          C.fillStyle = paperCol;
          P.fillStyle = PR[0];
          C.fill(L.path);
          P.fill(L.path);
        }
      }
      let a = colA * lodA * L.alpha;
      // hatching drawn for normal size would turn into bars seen close up: it lifts away as you zoom
      if (L.lod >= 1 && L.g) a *= 1 - 0.92 * smooth(1.8, 4.2, detail);
      if (a < 0.004) continue;
      if (reveal) {
        C.save(); P.save();
        C.clip(reveal); P.clip(reveal);
      }
      if (L.g) {
        P.globalCompositeOperation = 'lighter';
        P.globalAlpha = a;
        P.fillStyle = grStyle(L.pr);
        P.fill(L.path);
        P.globalCompositeOperation = 'source-over';
      } else {
        C.globalAlpha = P.globalAlpha = a;
        C.fillStyle = colourOf(L.role, pal);
        P.fillStyle = prAngStyle(L.pr, L.aq || 0);
        if (L.kind === 'path') {
          C.fill(L.path);
          P.fill(L.path);
        } else {
          drawText(C, L);
          drawText(P, L);
        }
      }
      if (reveal) { C.restore(); P.restore(); }
    }
    C.globalAlpha = 1;
    P.globalAlpha = 1;
  }

  function fillPoly(ctx, pts) {
    if (!pts) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  global.Ink = { rng, clamp, smooth, area, centroid, inside, catmull, resampleOpen, gougePoly, Plate, drawPlate, fillPoly, lodAlpha, hex, mix, css, makePal, mixPal, parseColour, prStyle, grStyle, FONTS };
})(window);
