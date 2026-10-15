// ink.js, marker edition: an industrial designer's presentation sketch for Canvas2D.
// Every mark is still a filled polygon recorded once into "plates" and replayed at any zoom. A mark
// now belongs to one stage of the drawing, in the order a designer works on grey marker paper: loose
// pencil construction lines, confident contours over them, translucent marker laid in one or two
// layers, solid colour for screens and labels, and white pencil for the highlights. Each frame is
// drawn twice in lockstep (see paper.js): once for colour, and once for how each mark was made, so a
// paper shader can streak the marker along its strokes and break the pencil up on the paper's tooth.
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

  // ---------- the stages of a drawing ----------
  //   occ    the paper inside a surface: it hides what is behind it as soon as the outline is drawn
  //   con    construction lines, light and long, running past the corners
  //   line   contours and dark accents, pressed in over the construction
  //   m1     the first layer of marker
  //   m2     the second layer, on the shadow side, and the cast shadow on the table
  //   flat   solid colour: screens, labels, keys and other small parts
  //   white  white pencil: highlights on the edges that catch the light, glints, chalk on lit faces
  //   note   handwritten notes and dimensions
  const PEN = { con: 1, line: 1, white: 1, note: 1 };
  // how hard each pencil presses, 0..1
  const PRESS = { graphite: 0.92, ink: 0.9, graphite2: 0.5, graphiteNote: 0.78, graphiteE: 0.8, chalk: 0.9 };
  const isGraphite = (role) => role.charCodeAt(0) === 103 && role.startsWith('graphite');
  const penStage = (role) => (role === 'graphite2' ? 'con' : role === 'graphiteNote' ? 'note' : role === 'chalk' ? 'white' : 'line');
  const isWhite = (role) => role === 'light' || role === 'paper' || role === 'chalk';
  // marker density written for solid colour: low, so screens and labels stay clean
  const FLAT = 0.1;
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
    // the page direction of a local angle
    pageAngle(a) {
      const M = this.M;
      if (!M) return a;
      const dx = Math.cos(a), dy = Math.sin(a);
      return Math.atan2(M[1] * dx + M[3] * dy, M[0] * dx + M[2] * dy);
    }
    rand(a = 0, b = 1) {
      return a + (b - a) * this.r();
    }
    // A layer is one merged path of marks that share a stage, a colour, a level of detail, an opacity
    // and a density (marker) or pressure (pencil). aq is the direction of marker strokes.
    layer(st, role, lod, alpha = 1, pt = 0, aq = 0) {
      alpha = Math.round(alpha * 40) / 40;
      pt = Math.round(pt * 20) / 20;
      let L = this.layers[this.layers.length - 1];
      if (!L || L.kind !== 'path' || L.st !== st || L.role !== role || L.lod !== lod || L.alpha !== alpha || L.pt !== pt || L.aq !== aq) {
        L = { kind: 'path', st, role, lod, alpha, pt, aq, path: new Path2D() };
        this.layers.push(L);
      }
      return L;
    }
    put(st, role, pts, lod, alpha, pt, aq = 0) {
      if (!pts || pts.length < 3) return;
      const q = this.tx(pts);
      if (q.length >= 3) addPoly(this.layer(st, role, lod, alpha, pt, aq).path, q, 1);
    }

    // ---------- solid colour and lines, for everything a machine draws itself ----------
    fill(role, pts, lod = this.lod) {
      if (!pts || pts.length < 3) return;
      if (role === 'shadow') return this.shadow(pts, lod);
      if (isGraphite(role)) return this.put(penStage(role), 'pen', pts, lod, 1, PRESS[role] ?? 0.8);
      if (role === 'paper') role = 'blank';
      this.put('flat', role, pts, lod, 1, role === 'ink' ? 0.5 : FLAT);
    }
    // a line in 'ink' is pencil; in 'light' or 'paper' it is white pencil; in a colour it is solid
    lineLayer(role, lod, alpha = 1) {
      if (role === 'ink' || isGraphite(role)) return this.layer(penStage(role), 'pen', lod, alpha, PRESS[role] ?? 0.8);
      if (isWhite(role)) return this.layer('white', 'chalk', lod, alpha * (role === 'paper' ? 0.7 : 1), 0.9);
      return this.layer('flat', role, lod, alpha, FLAT);
    }
    ring(role, pts, w, lod = this.lod) {
      const [A, B] = offsetRing(area(pts) < 0 ? pts.slice().reverse() : pts, w);
      const L = this.lineLayer(role, lod);
      const a = this.tx(A), b = this.tx(B);
      if (a.length >= 3) addPoly(L.path, a, 1);
      if (b.length >= 3) addPoly(L.path, b, -1);
    }
    gouge(role, pts, w, o = {}) {
      const poly = gougePoly(pts, w, o);
      if (!poly) return;
      const q = this.tx(poly);
      if (q.length >= 3) addPoly(this.lineLayer(role, o.lod ?? this.lod, o.alpha ?? 1).path, q, 1);
    }
    line(role, x1, y1, x2, y2, w, o = {}) {
      const bow = o.bow ?? 0;
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const mx = (x1 + x2) / 2 - (dy / d) * bow, my = (y1 + y2) / 2 + (dx / d) * bow;
      this.gouge(role, [[x1, y1], [mx, my], [x2, y2]], w, { seg: 3, ...o });
    }
    // Parallel strokes clipped to a polygon whose width follows o.tone(x, y): vents and grilles.
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
          this.fill(role, d, lod);
        }
      }
    }
    text(role, str, x, y, size, o = {}) {
      const hand = role === 'graphiteNote' || o.font === 'hand';
      if (role === 'paper') role = 'blank';
      this.layers.push({ kind: 'text', st: hand ? 'note' : 'flat', role: hand ? 'pen' : role, pt: hand ? PRESS.graphiteNote : FLAT, aq: 0, alpha: 1, lod: o.lod ?? 0.5, str, x, y, size, font: o.font || 'mono', align: o.align || 'center', rot: o.rot || 0, weight: o.weight || 500, italic: !!o.italic, track: o.track || 0, M: this.M, base: o.base || 'middle' });
    }

    // ---------- pencil ----------
    // A pencil line: a little unsteady, its weight rising and falling with the pressure of the hand,
    // and running past its ends the way a designer's stroke does. o.role: 'graphite' a contour,
    // 'graphite2' a construction line, 'graphiteNote' a note, 'chalk' white pencil.
    pencil(pts, o = {}) {
      const k = this.unit();
      let P = pts.length > 2 && o.curve ? catmull(pts, 4) : pts.slice();
      if (P.length < 2) return;
      const ov = (o.over ?? 5) / k;
      const ext = (a, b, e) => {
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        return [a[0] + ((a[0] - b[0]) / d) * e, a[1] + ((a[1] - b[1]) / d) * e];
      };
      if (ov > 0) {
        P.unshift(ext(P[0], P[1], ov * this.rand(0.4, 1.3)));
        P.push(ext(P[P.length - 1], P[P.length - 2], ov * this.rand(0.4, 1.3)));
      } else if (ov < 0) {
        // stopping short of both ends: a highlight is laid inside the edge, not to its corners
        const L = P.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]) : 0), 0);
        if (L < -ov * 3) return;
        P[0] = ext(P[0], P[1], ov * this.rand(0.5, 1.5));
        P[P.length - 1] = ext(P[P.length - 1], P[P.length - 2], ov * this.rand(0.5, 1.5));
      }
      const Q = resampleOpen(P, (o.step ?? 7) / k);
      if (Q.length < 2) return;
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
      const wf = (x, y) => w0 * (0.62 + 0.62 * (0.5 + 0.5 * Math.sin((x + y * 0.7) * fq + ph)));
      const role = o.role || 'graphite';
      const poly = gougePoly(W, wf, { smooth: false, taper: o.taper ?? 0.18, pow: 0.3 });
      if (!poly) return;
      const q = this.tx(poly);
      const L = role === 'chalk' ? this.layer('white', 'chalk', o.lod ?? 0.5, o.alpha ?? 1, 0.9) : this.layer(penStage(role), 'pen', o.lod ?? 0.5, o.alpha ?? 1, PRESS[role] ?? 0.8);
      if (q.length >= 3) addPoly(L.path, q, 1);
    }
    // Find a shape the way a designer does: light construction lines first, long and running well
    // past the corners, then the contour pressed in over them, broken where the hand lifted.
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
      const size = Math.sqrt(Math.abs(area(poly))) * k;
      const passes = [];
      // construction lines run further past the corners the bigger the shape
      if (o.construct !== false) passes.push({ role: 'graphite2', w: 0.85, over: o.over ?? clamp(size * 0.38, 12, 120), jit: 1.6, wob: 0.5, run: [70, 220] });
      if (o.contour) passes.push({ role: 'graphite', w: o.contour, over: 3.5, jit: 0.35, wob: 0.3, run: [150, 340] });
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

    // ---------- white pencil ----------
    // a soft rub of white across a surface, a reflection on glass
    sheen(pts, alpha, lod = 0.5) {
      this.put('white', 'chalk', pts, lod, alpha, 0);
    }
    // The designer's last flick: a star of light where a corner catches the sun.
    glint(x, y, s, lod = 0.5) {
      const k = this.unit();
      const L = s / k;
      this.gouge('chalk', [[x - L, y], [x + L, y]], 1.5 / k, { smooth: false, taper: 0.02, pow: 0.9, lod });
      this.gouge('chalk', [[x, y - L * 0.8], [x, y + L * 0.8]], 1.3 / k, { smooth: false, taper: 0.02, pow: 0.9, lod });
      this.gouge('chalk', [[x - L * 0.3, y - L * 0.3], [x + L * 0.3, y + L * 0.3]], 0.9 / k, { smooth: false, taper: 0.05, pow: 0.9, lod });
    }

    // ---------- marker ----------
    // Marker laid in fast parallel strokes of a chisel nib, in direction o.angle. A stroke goes down
    // only where the surface under its middle is darker than o.theta (everywhere when theta is
    // large), so on a lit face the strokes gather on the shadow side and thin out toward the light.
    // Each stroke runs the full length of the surface, its ends following the outline, a little over
    // it in places and short of it in others. Neighbouring strokes overlap, and their union is one
    // translucent layer, smooth like wet marker; a few are gone over twice, which leaves the darker
    // streaks of real marker.
    marker(role, poly, T, o = {}) {
      const k = this.unit();
      const ang = o.angle ?? 0, ca = Math.cos(ang), sa = Math.sin(ang);
      const nib = (o.nib ?? 11) / k;
      const theta = o.theta ?? 9, soft = o.soft ?? 0.05;
      const st = o.stage || 'm1', alpha = o.alpha ?? 0.4, lod = o.lod ?? 0, pt = o.pt ?? 1;
      const over = (o.over ?? 2.5) / k;
      const [vmin, vmax] = vRange(poly, ca, sa);
      const at = (u, v) => [u * ca - v * sa, u * sa + v * ca];
      const main = [], again = [];
      const step = nib * 0.86;
      // the chord at v, or the nearest one inside the outline
      const chord = (v, um) => {
        const us = crossings(poly, ca, sa, v);
        let best = null;
        for (let i = 0; i + 1 < us.length; i += 2) if (!best || Math.abs((us[i] + us[i + 1]) / 2 - um) < Math.abs((best[0] + best[1]) / 2 - um)) best = [us[i], us[i + 1]];
        return best;
      };
      // where the strokes thin out toward the light they go in small runs, not one by one: the
      // threshold wanders smoothly across the face
      const ph = this.rand(0, 100), fr = this.rand(0.35, 0.55) / step;
      const wander = (v) => Math.sin(v * fr + ph) * 0.6 + Math.sin(v * fr * 2.3 + ph * 1.7) * 0.4;
      for (let v = vmin + step * this.rand(0.05, 0.45); v < vmax + step * 0.2; v += step * this.rand(0.82, 1.1)) {
        const vc = Math.min(v, vmax - nib * 0.15);
        const us = crossings(poly, ca, sa, vc);
        for (let i = 0; i + 1 < us.length; i += 2) {
          const u0 = us[i], u1 = us[i + 1];
          if ((u1 - u0) * k < 2) continue;
          const um = (u0 + u1) / 2, m = at(um, vc);
          if (theta < 2 && !(T(m[0], m[1]) < theta + soft * wander(vc) + this.rand(-0.01, 0.01))) continue;
          if (o.skip && o.skip(m)) continue;
          const hw = nib * this.rand(0.5, 0.6);
          // the outline where the two sides of the stroke cross it, so its ends lie along the edge
          const A = chord(vc - hw, um) || [u0, u1], B = chord(vc + hw, um) || [u0, u1];
          const lo = Math.max(A[0], B[0]) - Math.min(A[0], B[0]) > (u1 - u0) * 0.5, hi = Math.max(A[1], B[1]) - Math.min(A[1], B[1]) > (u1 - u0) * 0.5;
          const a0 = lo ? u0 : A[0], a1 = lo ? u0 : B[0], b0 = hi ? u1 : A[1], b1 = hi ? u1 : B[1];
          const e0 = over * this.rand(-0.7, 1), e1 = over * this.rand(-0.7, 1);
          // now and then the hand stops short, and the stroke ends a little way in
          const short = this.r() < (o.short ?? 0.1) ? (u1 - u0) * this.rand(0.04, 0.16) : 0;
          const sp = [at(a0 - e0, vc - hw), at(b0 + e1 - short, vc - hw), at(b1 + e1 - short * 1.1, vc + hw), at(a1 - e0, vc + hw)];
          main.push(sp);
          if (this.r() < (o.again ?? 0.12)) {
            // gone over again for part of its length, while the first pass was still wet
            const L = b0 - a0, s0 = a0 + L * this.rand(0, 0.5), s1 = s0 + L * this.rand(0.25, 0.5);
            again.push([at(s0, vc - hw * 0.8), at(s1, vc - hw * 0.8), at(s1, vc + hw * 0.8), at(s0, vc + hw * 0.8)]);
          }
        }
      }
      const aq = angQ(this.pageAngle(ang));
      const add = (G, al) => {
        if (!G.length) return;
        const L = this.layer(st, role, lod, al, pt, aq);
        for (const pp of G) {
          const q = this.tx(pp);
          if (q.length >= 3) addPoly(L.path, q, 1);
        }
      };
      add(main, alpha);
      add(again, alpha * 0.4);
    }
    // a cast shadow on the table: one dark marker swiped flat across under the machine
    shadow(pts, lod = 0) {
      const c = centroid(pts);
      const g = pts.map(([x, y]) => [c[0] + (x - c[0]) * 1.04, c[1] + (y - c[1]) * 1.1]);
      // strokes along the shadow's longest side, swiped a little past its ends
      let best = 0, ang = 0;
      for (let i = 0; i < g.length; i++) {
        const a = g[i], b = g[(i + 1) % g.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d > best) { best = d; ang = Math.atan2(b[1] - a[1], b[0] - a[0]); }
      }
      this.marker('shadow', g, () => 0, { angle: ang, nib: 30, alpha: 0.7, stage: 'm2', lod, over: 4, again: 0.3, short: 0.04 });
    }

    // A shaded surface. tone: 0 = black, 1 = white (number or fn(x, y)). o.mang is the direction of
    // the marker strokes: up and down on a vertical face, along the surface on others.
    // The paper inside the outline is laid first, so the surface hides what is behind it. Then:
    //   uncoloured (white plastic, aluminium): cool grey marker, toned only toward the shadow edge on
    //     a lit face, a full layer and half a second on a turning one, two layers in shadow; the
    //     brightest faces get white chalk on their lit side;
    //   coloured: the machine's own colour, a layer over the face with a streak of paper left near
    //     the light, a second on the shadow side, and cool grey over it in shadow;
    //   dark: black marker, with a streak of paper left where it shines.
    face(poly, tone, o = {}) {
      const T = typeof tone === 'function' ? tone : () => tone;
      const c = centroid(poly);
      const t0 = T(c[0], c[1]);
      const k = this.unit();
      const size = Math.sqrt(Math.abs(area(poly))) * k;
      const ang = o.mang ?? o.angle ?? 0;
      const lod = o.lod ?? 0;
      const dark = !!o.dark || o.fill === 'ink';
      const role = o.fill || (dark ? 'ink' : null);
      this.put('occ', 'paper', poly, lod, 1, 0);
      const cu = Math.cos(ang), su = Math.sin(ang);
      const [v0, v1] = vRange(poly, cu, su), [w0, w1] = vRange(poly, -su, cu);
      const strokes = Math.min(v1 - v0, w1 - w0) * k > 8 && size > 14;
      const nib = clamp(size * 0.075, 5, 12);
      const M = (r, theta, alpha, st, x = {}) => this.marker(r, poly, T, { angle: ang, nib, theta, alpha, stage: st, lod, ...x });
      // the face's lightest and darkest tones, so a streak of paper can be left on its lit side
      let tmin = t0, tmax = t0;
      for (const q of poly) { const t = T(q[0], q[1]); tmin = Math.min(tmin, t); tmax = Math.max(tmax, t); }
      const streak = (q) => T(q[0], q[1]) > tmax - 0.22 * (tmax - tmin) && this.r() < 0.35;
      const chalk = (from, alpha) => this.marker('chalk', poly, (x, y) => 1 - T(x, y), { angle: ang, nib: nib * 1.2, theta: 1 - from, alpha, stage: 'white', lod, pt: 0, again: 0 });
      if (!strokes) {
        // a narrow face (a rounded corner, a rim, a slice of a cylinder): one swipe, as deep as its tone
        const d = clamp((0.86 - t0) / 0.55, 0, 1);
        if (dark) this.put('m1', role, poly, lod, 0.92 - 0.25 * clamp((t0 - 0.3) / 0.5, 0, 1), 1);
        else if (role) {
          this.put('m1', role, poly, lod, 0.6 + 0.25 * d, 1);
          if (d > 0.5) this.put('m2', 'cg', poly, lod, 0.4 * (d - 0.5) * 2, 1);
        } else if (d > 0.04) this.put('m1', 'cg', poly, lod, 0.6 * d, 1);
        else if (t0 > 0.86) this.put('white', 'chalk', poly, lod, 0.25, 0);
      } else if (dark) {
        M(role, 9, t0 > 0.5 ? 0.78 : 0.9, 'm1', { skip: t0 > 0.42 ? streak : null });
        M(role, t0 + 0.02, 0.45, 'm2');
      } else if (role) {
        // the second layer is the same marker a few steps darker, as a designer keeps a run of each
        if (t0 > 0.64) {
          M(role, 9, 0.66, 'm1', { skip: streak });
          M(role + '~d', t0 - 0.02, 0.34, 'm2');
          if (t0 > 0.84) chalk(t0 + 0.04, 0.22);
        } else {
          // on grey paper the paper is the middle tone: a face turned from the light goes down in the
          // darker marker, with cool grey over it in the deepest part
          M(role + (t0 < 0.56 ? '~d' : ''), 9, 0.8, 'm1');
          M(role + '~d', t0 + 0.06, 0.45, 'm2');
          if (t0 < 0.56) M('cg', t0 + 0.04, 0.34, 'm2');
        }
      } else if (t0 > 0.84) {
        // the lightest faces, the tops: paper, a little grey at the shadow edge, chalk toward the light
        M('cg', t0 - 0.07, 0.28, 'm1');
        chalk(t0 + 0.02, 0.3);
      } else if (t0 > 0.64) {
        // lit faces keep most of their paper and are toned toward their shadow edge
        M('cg', t0 - 0.02, 0.3, 'm1');
        M('cg', t0 - 0.11, 0.26, 'm2');
        if (t0 > 0.74) chalk(t0 + 0.09, 0.18);
      } else if (t0 > 0.5) {
        M('cg', 9, 0.34, 'm1', { skip: streak });
        M('cg', t0 + 0.02, 0.32, 'm2');
      } else {
        // shadow sides: two layers, and a darker grey in the deepest part
        M('cg', 9, 0.42, 'm1');
        M('cg', t0 + 0.12, 0.4, 'm2');
        if (t0 < 0.42) M('cgd', t0 + 0.03, 0.34, 'm2');
      }
      if (o.edge && o.edge > 0) this.sketch(poly, { lod: 0.5, contour: 1.0 + 0.35 * o.edge, construct: o.pencil !== false && size > 30 && this.r() < 0.85 });
      else if (o.pencil !== false && size > 30) this.sketch(poly, { lod: 0.5 });
      return role || 'paper';
    }
  }

  Plate.notes = true;
  Plate.sketchy = true;
  Plate.style = 'marker';

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
  // 'x~d' is the darker marker of the same family as x: its colour pushed toward a cool dark grey
  const DEEP = [46, 48, 56];
  const deepCache = new WeakMap();
  function colourOf(role, pal) {
    const t = role.indexOf('~');
    if (t > 0) {
      const base = role.slice(0, t);
      let m = deepCache.get(pal);
      if (!m) deepCache.set(pal, (m = {}));
      return m[base] || (m[base] = css(mix(parseColour(colourOf(base, pal)), DEEP, 0.38)));
    }
    if (role[0] === '#') return pal.mapHex ? pal.mapHex(role) : role;
    return pal[role] || pal.ink;
  }

  // ---------- replay ----------
  const DS = new Map();
  // the pressure canvas: red is marker density, blue the stroke direction
  const denStyle = (pt, aq) => {
    const key = Math.round(clamp(pt, 0, 1) * 20) * 32 + aq;
    let s = DS.get(key);
    if (!s) DS.set(key, (s = `rgb(${Math.round(clamp(pt, 0, 1) * 255)},0,${aq * 8})`));
    return s;
  };
  // green is pencil, black or white
  const GR = [];
  for (let i = 0; i <= 20; i++) GR.push(`rgb(0,${Math.round((i / 20) * 255)},0)`);
  const grStyle = (pr) => GR[Math.round(clamp(pr, 0, 1) * 20)];

  // The wet front of the marker as it sweeps across a drawing, left to right: the ends of strokes,
  // each a different length, in the plate's own 1000 × 1000 frame.
  function sweepPath(r, seed) {
    const path = new Path2D();
    const x0 = -420 + r * 1840, ph = (seed % 97) * 0.37;
    path.moveTo(-5000, -1500);
    for (let y = -1500, i = 0; y <= 2500; y += 16, i++) {
      const h = Math.sin(i * 12.9898 + ph) * 43758.5453;
      const x = x0 + 80 * (h - Math.floor(h)) + 30 * Math.sin(y * 0.004 + ph) - 0.12 * (y - 500);
      path.lineTo(x, y);
      path.lineTo(x, y + 16);
    }
    path.lineTo(-5000, 2516);
    path.closePath();
    return path;
  }

  // How far each stage has come. A machine arrives in the order a designer draws it: pencil (pencil
  // 0 → 1) first, construction lines and then contours; then (ink 0 → 1) the first marker layer
  // sweeps across it, the second follows on the shadow side, and the white pencil flicks on last.
  // Run backwards, the same order takes a drawing apart.
  function stages(ink, pencil, detail) {
    return {
      occ: Math.min(1, pencil * 1.6),
      con: smooth(0, 0.35, pencil) * (1 - 0.85 * smooth(1.8, 3.6, detail)),
      // contours drawn for the whole machine would turn into bars seen close up: they lighten as you zoom
      line: smooth(0.12, 0.6, pencil) * (1 - 0.5 * smooth(2.5, 7, detail)),
      note: pencil,
      m1: smooth(0.02, 0.55, ink),
      flat: smooth(0.02, 0.55, ink),
      m2: smooth(0.3, 0.8, ink),
      white: smooth(0.8, 0.96, ink),
    };
  }

  // Replay a plate into a dual context D (D.C colour, D.P how it was made). opt.fade makes ink a
  // plain transparency instead, for glass and motion blur.
  function drawPlate(D, plate, pal, ink, detail, pencil = ink, opt) {
    const C = D.C, P = D.P;
    const fade = opt && opt.fade;
    const A = fade ? null : stages(ink, pencil, detail);
    // marker stages sweep in behind a wet front rather than fading
    const sw = {};
    const sweep = (st) => {
      if (fade) return null;
      const r = st === 'm2' ? A.m2 : st === 'm1' || st === 'flat' ? A.m1 : 1;
      if (r >= 0.997) return null;
      return sw[st === 'flat' ? 'm1' : st] || (sw[st === 'flat' ? 'm1' : st] = sweepPath(r, plate.seed || 1));
    };
    for (const L of plate.layers) {
      const st = L.st;
      if (st === 'note' && !Plate.notes) continue;
      const pen = PEN[st];
      let a = fade ? ink : A[st];
      if (!fade && (st === 'm1' || st === 'm2' || st === 'flat')) a = a > 0.003 ? 1 : 0;
      a *= lodAlpha(pen ? L.lod * 0.4 : L.lod, detail) * L.alpha;
      if (a < 0.004) continue;
      if (pen) {
        if (st === 'note' && L.kind === 'text') {
          // a note is written where the paper was rubbed clean for it first
          C.globalAlpha = P.globalAlpha = a * 0.8;
          C.strokeStyle = pal.paper;
          P.strokeStyle = '#000';
          drawText(C, L, L.size * 0.45);
          drawText(P, L, L.size * 0.45);
        }
        C.globalAlpha = a * (L.role === 'chalk' ? 0.92 : Math.min(1, L.pt * 1.05));
        C.fillStyle = colourOf(L.role, pal);
        P.globalCompositeOperation = 'lighter';
        P.globalAlpha = a;
        P.fillStyle = grStyle(L.pt);
        if (L.kind === 'path') { C.fill(L.path); P.fill(L.path); }
        else { drawText(C, L); drawText(P, L); }
        P.globalCompositeOperation = 'source-over';
        continue;
      }
      const clip = st === 'occ' ? null : sweep(st);
      if (clip) { C.save(); P.save(); C.clip(clip); P.clip(clip); }
      C.globalAlpha = P.globalAlpha = a;
      if (st === 'occ') {
        C.fillStyle = pal.paper;
        P.fillStyle = '#000';
      } else {
        C.fillStyle = colourOf(L.role, pal);
        P.fillStyle = denStyle(L.pt, L.aq || 0);
      }
      if (L.kind === 'path') { C.fill(L.path); P.fill(L.path); }
      else { drawText(C, L); drawText(P, L); }
      if (clip) { C.restore(); P.restore(); }
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

  global.Ink = { rng, clamp, smooth, area, centroid, inside, catmull, resampleOpen, gougePoly, Plate, drawPlate, fillPoly, lodAlpha, hex, mix, css, makePal, mixPal, parseColour, grStyle, denStyle, sweepPath, FONTS };
})(window);
