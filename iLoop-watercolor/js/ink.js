// ink.js: watercolour and pen mark-making for Canvas2D.
// Marks are recorded once per machine into "plates" of merged Path2D layers and replayed at any zoom.
// A layer is one of four kinds of paint:
//   over  an area painted in one wash, as if the painter had reserved it: it hides what is under it
//   mul   a transparent glaze laid over what is already there (multiply), for shading and shadows
//   lift  pigment lifted back out with a damp brush, so the paper shows through again (blooms)
//   line  a pen line or a fine brush line; dark ones go to the ink sheet, light ones are body colour
// Washes are drawn to one canvas and pen lines to another, so the compositor (paper.js) can pool,
// granulate and texture the washes without putting a halo round the ink.
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

  // Value noise in the plane, the same everywhere for the same point: an edge shared by two faces
  // wobbles the same way for both, and a wash's wobble travels with the machine.
  function hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function noise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  const fbm2 = (x, y) => 0.62 * noise2(x, y) + 0.26 * noise2(x * 2.3 + 17, y * 2.3 - 9) + 0.12 * noise2(x * 5.1 - 3, y * 5.1 + 31);

  function area(pts) {
    let s = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return s / 2;
  }
  function perimeter(pts, closed = true) {
    let s = 0;
    for (let i = 0, n = pts.length; i < (closed ? n : n - 1); i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      s += Math.hypot(q[0] - p[0], q[1] - p[1]);
    }
    return s;
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

  // A stroke along a path: thin at both ends, swelling toward `skew`. w may be a function of
  // position or of the distance along the stroke (w(x, y, u)), so one line can swell and thin.
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
      const hw = 0.5 * (typeof w === 'function' ? w(P[i][0], P[i][1], cum[i]) : w) * prof;
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

  // A closed polygon with points at most `step` apart, keeping its corners.
  function resampleClosed(pts, step) {
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
    }
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

  // Keep the part of a polygon on the side of a line where (p - c) · g < k.
  function clipHalf(pts, c, g, k) {
    const f = (p) => (p[0] - c[0]) * g[0] + (p[1] - c[1]) * g[1] - k;
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const fa = f(a), fb = f(b);
      if (fa < 0) out.push(a);
      if ((fa < 0) !== (fb < 0)) {
        const t = fa / (fa - fb);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
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

  // A wash never quite fills the shape it was meant for: its edge wanders a little, it stops short
  // of the line in places and runs over it in others. Amounts are in the plate's units (the machine's
  // 1000 × 1000 frame), and shrink on narrow shapes so a rim is never painted away.
  function wobble(q, amp, inset, seed, o = {}) {
    const A = area(q), per = perimeter(q);
    if (per < 1e-3) return q;
    const inr = (2 * Math.abs(A)) / per;
    const k = clamp(inr / (o.ref ?? 10), 0, 1);
    const am = amp * k, ins = Math.min(inset * k, inr * 0.3);
    if (am < 0.05 && ins < 0.05) return q;
    const step = o.step ?? clamp(per / 90, 2.5, 7);
    const P = resampleClosed(q, step);
    const n = P.length, out = [];
    const sg = A > 0 ? 1 : -1;
    const f1 = o.freq ?? 0.05, sx = seed * 7.13, sy = seed * 3.71;
    for (let i = 0; i < n; i++) {
      const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], p = P[i];
      const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      const nx = (sg * ty) / tl, ny = (-sg * tx) / tl;
      const d = -ins + am * (2 * fbm2(p[0] * f1 + sx, p[1] * f1 + sy) - 1) * 1.6;
      out.push([p[0] + nx * d, p[1] + ny * d]);
    }
    return out;
  }

  // The outline of a bloom (a back-run): a cauliflower edge round a soft centre.
  function blob(cx, cy, r, seed, n = 40, lobes = 0.22) {
    const R = rng(seed), ph = [R() * 6.3, R() * 6.3, R() * 6.3, R() * 6.3];
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + lobes * (0.5 * Math.sin(3 * a + ph[0]) + 0.3 * Math.sin(5 * a + ph[1]) + 0.25 * Math.sin(9 * a + ph[2]) + 0.15 * Math.sin(14 * a + ph[3]));
      pts.push([cx + r * k * Math.cos(a), cy + r * k * Math.sin(a)]);
    }
    return pts;
  }

  class Plate {
    constructor(seed) {
      this.layers = [];
      this.r = rng(seed);
      this.seed = seed % 997;
      this.lod = 0;
      this.M = null;
      // each part's washes sit a little off its line, as if painted after the drawing in one sitting
      this.off = [this.rand(-1.4, 1.4), this.rand(-1.1, 1.1)];
    }
    // Draw in another coordinate system (a face of a 3D model, a screen): every point passes through M.
    withM(M, fn) {
      const prev = this.M;
      this.M = prev ? mulM(prev, M) : M;
      try { fn(); } finally { this.M = prev; }
    }
    // Keep marks inside a rectangle of the current coordinates (a screen): polygons are cut to it.
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
    // how much the current coordinates are enlarged on the plate
    get k() {
      const M = this.M;
      return M ? Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) : 1;
    }
    rand(a = 0, b = 1) {
      return a + (b - a) * this.r();
    }
    layer(role, lod, alpha = 1, mode = 'over') {
      alpha = Math.round(alpha * 20) / 20;
      let L = this.layers[this.layers.length - 1];
      if (!L || L.kind !== 'path' || L.role !== role || L.lod !== lod || L.alpha !== alpha || L.mode !== mode) {
        L = { kind: 'path', role, lod, alpha, mode, path: new Path2D() };
        this.layers.push(L);
      }
      return L;
    }
    // add a polygon already in plate units
    put(mode, role, q, lod, alpha = 1) {
      if (!q || q.length < 3 || alpha < 0.02) return;
      addPoly(this.layer(role, lod, alpha, mode).path, q, 1);
    }
    // A pen stroke: its outline for normal size, and its centreline (with the nib's width) so that
    // seen close up it can be drawn with a fine nib instead of being blown up with everything else.
    stroke(role, outline, spine, w, lod, closed = false) {
      if (!outline || outline.length < 3) return;
      const L = this.layer(role, lod, 1, 'line');
      addPoly(L.path, outline, 1);
      if (!spine || spine.length < 2) return;
      if (!L.spine) { L.spine = new Path2D(); L.wsum = 0; L.wn = 0; }
      spine.forEach(([x, y], i) => (i ? L.spine.lineTo(x, y) : L.spine.moveTo(x, y)));
      if (closed) L.spine.closePath();
      L.wsum += w;
      L.wn++;
    }
    shift(q) {
      const [dx, dy] = this.off;
      return q.map(([x, y]) => [x + dx, y + dy]);
    }
    // a transparent glaze over a polygon
    wash(role, pts, alpha, lod = 0, o = {}) {
      if (!pts || pts.length < 3 || alpha < 0.02) return;
      let q = this.tx(pts);
      if (o.wob) q = wobble(q, o.wob, o.inset ?? 0, this.seed + (o.seed || 0), { ref: o.ref ?? 4, freq: o.freq });
      this.put('mul', role, q, lod, alpha);
    }
    // an area painted in one colour, reserved from what is under it
    fill(role, pts, lod = this.lod) {
      if (!pts || pts.length < 3) return;
      this.put('over', role, this.tx(pts), lod);
    }
    // pigment lifted out: the paper comes back, with a hard edge where the water stopped
    lift(pts, alpha, lod = 0.5) {
      this.put('lift', 'paper', pts, lod, alpha);
    }
    ring(role, pts, w, lod = this.lod) {
      const q = this.tx(pts);
      if (q.length < 3) return;
      const wk = w * this.k, per = perimeter(q);
      // a large outline is drawn with a pen; a small one (an icon, a key) is ruled exactly
      if (per > 70 && wk < 6) return this.penLoop(role, q, wk, lod);
      const src = this.clipR ? clipRect(pts, this.clipR) : pts;
      const [A, B] = offsetRing(area(src) < 0 ? src.slice().reverse() : src, w);
      const L = this.layer(role, lod, 1, 'line');
      const a = this.tx(A), b = this.tx(B);
      if (a.length >= 3) addPoly(L.path, a, 1);
      if (b.length >= 3) addPoly(L.path, b, -1);
      if (!L.spine) { L.spine = new Path2D(); L.wsum = 0; L.wn = 0; }
      q.forEach(([x, y], i) => (i ? L.spine.lineTo(x, y) : L.spine.moveTo(x, y)));
      L.spine.closePath();
      L.wsum += wk;
      L.wn++;
    }
    // A pen going round a shape: one stroke from corner to corner, pressing harder in the middle,
    // running a little past each corner, now and then lifting. The marks depend only on the points,
    // so an edge two faces share is drawn the same way twice and reads as one line.
    penLoop(role, q, w, lod = 0) {
      const n = q.length;
      const turn = (i) => {
        const a = q[(i - 1 + n) % n], b = q[i], c = q[(i + 1) % n];
        const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        return Math.abs(Math.atan2(Math.sin(t2 - t1), Math.cos(t2 - t1)));
      };
      const corners = [];
      for (let i = 0; i < n; i++) if (turn(i) > 0.5) corners.push(i);
      // a smooth outline (a circle) is drawn in three strokes that overlap where they meet
      if (corners.length < 2) {
        const off = Math.floor((hash2(q[0][0] * 10, q[0][1] * 10) * n) / 3);
        corners.length = 0;
        for (let i = 0; i < 3; i++) corners.push((off + Math.floor((i * n) / 3)) % n);
      }
      for (let c = 0; c < corners.length; c++) {
        const i0 = corners[c], i1 = corners[(c + 1) % corners.length];
        const run = [];
        for (let i = i0; ; i = (i + 1) % n) {
          run.push(q[i]);
          if (i === i1 || run.length > n) break;
        }
        if (run.length >= 2) this.penRun(role, run, w, lod, turn(i0) > 0.5, turn(i1) > 0.5);
      }
    }
    penRun(role, run, w, lod, sharp0 = true, sharp1 = true) {
      let P = run;
      const a = P[0], b = P[P.length - 1];
      // canonical direction, so a shared edge comes out identical from either face
      if (a[0] > b[0] + 1e-6 || (Math.abs(a[0] - b[0]) <= 1e-6 && a[1] > b[1])) { P = P.slice().reverse(); [sharp0, sharp1] = [sharp1, sharp0]; }
      const A = P[0], B = P[P.length - 1];
      const len = perimeter(P, false);
      if (len < 0.5) return;
      const h = hash2(Math.round(A[0] * 4) + Math.round(B[0] * 4) * 31, Math.round(A[1] * 4) + Math.round(B[1] * 4) * 17);
      const h2 = hash2(Math.round(B[1] * 7), Math.round(A[0] * 7) + 5);
      const ext = (p, q, e) => {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1;
        return [p[0] + ((p[0] - q[0]) / d) * e, p[1] + ((p[1] - q[1]) / d) * e];
      };
      // overshoot past a sharp corner, overlap where a smooth outline is joined
      const e0 = sharp0 ? 0.6 + h * 2.6 : 2.5, e1 = sharp1 ? 0.6 + h2 * 2.6 : 2.5;
      P = [ext(P[0], P[1] || P[0], e0), ...P, ext(P[P.length - 1], P[P.length - 2] || P[P.length - 1], e1)];
      const step = clamp(len / 24, 1.2, 6);
      const Q = resampleOpen(P, step);
      // the nib's pressure: heavier in the middle of the stroke, with a slow wander along it
      const ph = h * 40;
      const wf = (x, y, s) => w * (0.62 + 0.62 * noise2(s * 0.035 + ph, ph));
      // the odd break where the pen skipped on the paper's tooth
      if (len > 140 && h2 > 0.55) {
        const cut = 0.3 + 0.4 * h, gap = clamp(3 + h * 5, 2, 9) / len;
        const iA = Math.max(2, Math.floor(Q.length * cut)), iB = Math.min(Q.length - 2, Math.ceil(Q.length * (cut + gap)));
        const p1 = gougePoly(Q.slice(0, iA), wf, { smooth: false, n: 1, taper: 0.28, pow: 0.35 });
        const p2 = gougePoly(Q.slice(iB), wf, { smooth: false, n: 1, taper: 0.28, pow: 0.35 });
        this.stroke(role, p1, Q.slice(0, iA), w, lod);
        this.stroke(role, p2, Q.slice(iB), w, lod);
        return;
      }
      const poly = gougePoly(Q, wf, { smooth: false, n: 1, taper: 0.3, pow: 0.35 });
      this.stroke(role, poly, Q, w, lod);
    }
    gouge(role, pts, w, o = {}) {
      const poly = gougePoly(pts, w, o);
      if (!poly) return;
      const wk = (typeof w === 'function' ? w(pts[0][0], pts[0][1], 0) : w) * this.k * 0.8;
      this.stroke(role, this.tx(poly), this.tx(pts.length > 2 && o.smooth !== false ? catmull(pts, 3) : pts), wk, o.lod ?? this.lod);
    }
    line(role, x1, y1, x2, y2, w, o = {}) {
      const bow = o.bow ?? 0;
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const mx = (x1 + x2) / 2 - (dy / d) * bow, my = (y1 + y2) / 2 + (dx / d) * bow;
      this.gouge(role, [[x1, y1], [mx, my], [x2, y2]], w, { seg: 3, ...o });
    }
    // Parallel pen strokes clipped to a polygon, broken into short runs whose width follows o.tone(x, y).
    hatch(role, poly, o = {}) {
      const ang = o.angle ?? 0, gap = o.gap ?? 8, w = o.w ?? 2.2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const sc = o.scoop || [70, 150];
      const inset = o.inset ?? 2.5;
      const lod = o.lod ?? 1;
      let vmin = Infinity, vmax = -Infinity;
      for (const p of poly) {
        const v = -p[0] * sa + p[1] * ca;
        vmin = Math.min(vmin, v);
        vmax = Math.max(vmax, v);
      }
      for (let v = vmin + (o.phase ?? this.rand(0.3, 0.7) * gap); v < vmax; v += gap) {
        const us = [];
        for (let i = 0, n = poly.length; i < n; i++) {
          const p = poly[i], q = poly[(i + 1) % n];
          const pv = -p[0] * sa + p[1] * ca, qv = -q[0] * sa + q[1] * ca;
          if ((pv - v) * (qv - v) < 0) {
            const k = (v - pv) / (qv - pv);
            us.push((p[0] + (q[0] - p[0]) * k) * ca + (p[1] + (q[1] - p[1]) * k) * sa);
          }
        }
        us.sort((a, b) => a - b);
        for (let i = 0; i + 1 < us.length; i += 2) {
          const u0 = us[i] + inset * 0.1, u1 = us[i + 1] - inset * 0.1;
          if (u1 - u0 < 0.01) continue;
          let u = u0;
          while (u < u1) {
            let ue = Math.min(u1, u + Math.max(sc[0], (u1 - u0) * 0.6));
            const um = (u + ue) / 2;
            const mx = um * ca - v * sa, my = um * sa + v * ca;
            const ww = w * (o.tone ? o.tone(mx, my) : 1);
            if (ww > 0.02) this.gouge(role, [[u * ca - v * sa, u * sa + v * ca], [ue * ca - v * sa, ue * sa + v * ca]], Math.min(ww, w * 1.15), { lod, taper: 0.3, smooth: false });
            u = ue + gap * 0.3;
          }
        }
      }
    }
    // Concentric arcs, kept inside `clip` when given.
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
            if (ww > 0.02) this.gouge(role, pts, ww, { lod, taper: 0.08 });
          }
          a += span + this.rand(0.04, 0.12);
        }
      }
    }
    // A graphite line: thin, a little unsteady, running past its ends like a construction stroke.
    pencil(pts, o = {}) {
      let P = pts.length > 2 && o.curve ? catmull(pts, 4) : pts.slice();
      if (P.length < 2) return;
      const ov = o.over ?? 5;
      if (ov > 0) {
        const ext = (a, b, e) => {
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
          return [a[0] + ((a[0] - b[0]) / d) * e, a[1] + ((a[1] - b[1]) / d) * e];
        };
        P.unshift(ext(P[0], P[1], ov * this.rand(0.3, 1.3)));
        P.push(ext(P[P.length - 1], P[P.length - 2], ov * this.rand(0.3, 1.3)));
      }
      const Q = resampleOpen(P, o.step ?? 9);
      const amp = o.wob ?? 0.12, p1 = this.rand(0, 6), p2 = this.rand(0, 6), f1 = this.rand(0.05, 0.09), f2 = this.rand(0.18, 0.3);
      let s = 0;
      const W = Q.map((q, i) => {
        if (i) s += Math.hypot(q[0] - Q[i - 1][0], q[1] - Q[i - 1][1]);
        const a = Q[Math.max(0, i - 1)], b = Q[Math.min(Q.length - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const off = amp * (0.65 * Math.sin(s * f1 + p1) + 0.35 * Math.sin(s * f2 + p2));
        return [q[0] - (dy / d) * off, q[1] + (dx / d) * off];
      });
      this.gouge(o.role || 'graphite', W, o.w ?? 0.85, { smooth: false, taper: o.taper ?? 0.3, pow: 0.3, lod: o.lod ?? 0.5 });
    }
    // The pencil underdrawing a watercolour starts from: faint, broken, overshooting the corners.
    sketch(poly, o = {}) {
      if (!Plate.sketchy) return;
      const n = poly.length;
      if (n < 2) return;
      let run = [], len = 0, maxLen = this.rand(140, 260);
      const flush = () => {
        if (run.length >= 2) this.pencil(run, { role: 'graphite2', w: 0.7, over: 3, lod: o.lod ?? 0.5, wob: 0.3 });
      };
      for (let k = 0; k <= n; k++) {
        const p = poly[k % n];
        if (run.length) len += Math.hypot(p[0] - run[run.length - 1][0], p[1] - run[run.length - 1][1]);
        run.push(p);
        if (len > maxLen) { flush(); run = [p]; len = 0; maxLen = this.rand(140, 260); }
      }
      flush();
    }
    // A dimension in pen: a line with end ticks and a small hand-lettered label.
    dim(x1, y1, x2, y2, label, o = {}) {
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, t = o.tick ?? 6;
      const lod = o.lod ?? 1;
      this.pencil([[x1, y1], [x2, y2]], { role: 'graphiteNote', w: 0.6, over: 0, lod, wob: 0.2 });
      for (const [x, y] of [[x1, y1], [x2, y2]]) this.pencil([[x - nx * t, y - ny * t], [x + nx * t, y + ny * t]], { role: 'graphiteNote', w: 0.6, over: 0, lod, wob: 0 });
      let a = Math.atan2(dy, dx);
      if (a > Math.PI / 2) a -= Math.PI;
      if (a < -Math.PI / 2) a += Math.PI;
      const off = o.off ?? 11;
      this.text('graphiteNote', label, (x1 + x2) / 2 + nx * off, (y1 + y2) / 2 + ny * off, (o.size ?? 13) * 1.25, { font: 'hand', weight: 500, rot: a, lod });
    }
    note(x, y, str, o = {}) {
      this.text('graphiteNote', str, x, y, (o.size ?? 15) * 1.3, { font: 'hand', weight: 500, align: o.align || 'left', rot: (o.rot || 0) - 0.03, lod: o.lod ?? 1 });
    }
    // A surface as a watercolourist paints it: the shape reserved, one wash of its own colour that
    // wanders off the line, a cool glaze for the shade that deepens toward the dark side, sometimes
    // a bloom where the wash was disturbed while wet, and the pen line round it last.
    // tone: 0 = black, 1 = white (number or fn(x, y)).
    face(poly, tone, o = {}) {
      const T = typeof tone === 'function' ? tone : () => tone;
      const c = centroid(poly);
      const t0 = T(c[0], c[1]);
      const local = o.dark ? o.fill || 'ink' : o.fill ?? 'paper';
      const dark = !!o.dark || local === 'ink';
      const Q = this.tx(poly);
      if (Q.length < 3) return local;
      const lod = o.lod ?? 0;
      const A = Math.abs(area(Q)), per = perimeter(Q), inr = (2 * A) / Math.max(per, 1e-6);
      const qc = centroid(Q);
      // the shape is reserved: whatever was behind it is gone
      this.put('over', 'paper', Q, lod);
      const sd = (Math.round(qc[0] * 3) * 13 + Math.round(qc[1] * 3) * 7) % 1000;
      const S = this.shift(Q);
      if (local !== 'paper' && local !== 'light') {
        // the local colour: darker materials are painted denser, but the side facing the light is
        // left thinner so the paper glows through
        const a = dark ? 0.97 - 0.42 * smooth(0.15, 0.85, t0) : 0.9 + 0.08 * (1 - t0);
        this.put('mul', local, wobble(S, 1.5, 1.9, sd), lod, a);
      } else if (local === 'light' || t0 > 0.97) {
        // a white surface in full light is the paper itself
      }
      // the shade, as a cool glaze, heavier the more the face turns away
      const sh = Math.pow(clamp((0.94 - t0) / 0.62, 0, 1), 1.25) * (dark ? 0.4 : 0.72);
      if (sh > 0.03) this.put('mul', 'shade', wobble(S, 1.3, 1.4, sd + 41), lod, sh);
      // a second glaze on the darker half, so the face is graded rather than flat
      if (inr > 5 && (o.hatch !== false || o.grade)) {
        const e = Math.sqrt(A) * 0.5 + 1;
        const gx = T(c[0] + 1, c[1]) - T(c[0] - 1, c[1]), gy = T(c[0], c[1] + 1) - T(c[0], c[1] - 1);
        // the gradient in plate units (through M when drawing on a face's own frame)
        let G = [gx, gy];
        if (this.M) { const M = this.M, det = M[0] * M[3] - M[1] * M[2] || 1; G = [(M[3] * gx - M[1] * gy) / det, (-M[2] * gx + M[0] * gy) / det]; }
        const gl = Math.hypot(G[0], G[1]);
        if (gl > 1e-6) {
          const spread = gl * e * 2;
          const ga = clamp(spread * 1.1, 0, 0.26) * (dark ? 0.6 : 1);
          if (ga > 0.04) {
            const half = clipHalf(S, qc, [G[0] / gl, G[1] / gl], (hash2(sd, 3) - 0.6) * e * 0.5);
            if (half.length >= 3) this.put('mul', 'shade', wobble(half, 2.2, 0.6, sd + 7, { freq: 0.03 }), Math.max(lod, 0.3), ga);
          }
        }
      }
      // now and then a bloom, where water ran back into a drying wash
      if (inr > 22 && hash2(sd, 11) < 0.22 && !(local === 'paper' && sh < 0.12)) {
        const r = clamp(inr * (0.35 + 0.4 * hash2(sd, 12)), 8, 60);
        const ang = hash2(sd, 13) * 6.28, d = inr * 0.5;
        const bb = blob(qc[0] + Math.cos(ang) * d, qc[1] + Math.sin(ang) * d, r, sd + 99);
        const inS = bb.filter((p) => inside(S, p[0], p[1]));
        if (inS.length > bb.length * 0.6) this.lift(bb, 0.32, 0.6);
      }
      if (o.edge) this.penLoop(o.edgeRole ?? 'ink', Q, o.edge * 1.05, o.edgeLod ?? 0);
      if (o.pencil !== false) this.sketch(Q, { lod: 0.5 });
      return local;
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
          for (let k = 0; k < 8; k++) d.push([x + r * Math.cos((k * Math.PI) / 4), y + r * Math.sin((k * Math.PI) / 4)]);
          this.fill(role, d, lod);
        }
      }
    }
    text(role, str, x, y, size, o = {}) {
      this.layers.push({ kind: 'text', role, lod: o.lod ?? 0.5, str, x, y, size, font: o.font || 'mono', align: o.align || 'center', rot: o.rot || 0, weight: o.weight || 500, italic: !!o.italic, track: o.track || 0, M: this.M, base: o.base || 'middle' });
    }
  }

  Plate.notes = true;
  // a faint pencil underdrawing under the washes (?pencil=0 in the URL turns it off)
  Plate.sketchy = !(typeof location !== 'undefined' && new URLSearchParams(location.search).get('pencil') === '0');

  const FONTS = {
    mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    serif: '"Cormorant Garamond", "Iowan Old Style", Georgia, serif',
    hand: '"Caveat", "Bradley Hand", "Segoe Print", cursive',
  };

  function fontStr(L) {
    return `${L.italic ? 'italic ' : ''}${L.weight} ${L.size}px ${FONTS[L.font] || L.font}`;
  }

  // halo: words written over a line knock the line out round them, so a note is always legible
  function drawText(ctx, L, halo) {
    ctx.save();
    if (L.M) ctx.transform(L.M[0], L.M[1], L.M[2], L.M[3], L.M[4], L.M[5]);
    ctx.translate(L.x, L.y);
    if (L.rot) ctx.rotate(L.rot);
    ctx.font = fontStr(L);
    ctx.textAlign = L.align;
    ctx.textBaseline = L.base;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${L.track || 0}px`;
    if (halo) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.lineWidth = L.size * 0.36;
      ctx.lineJoin = 'round';
      ctx.strokeText(L.str, 0, 0);
      ctx.restore();
    }
    ctx.fillText(L.str, 0, 0);
    ctx.restore();
  }

  // Fine layers fade in as a device grows on screen.
  function lodAlpha(lod, detail) {
    if (!lod) return 1;
    return smooth(lod * 0.16, lod * 0.42, detail);
  }

  // ---------- colour: what each role looks like as paint ----------
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c) => `rgb(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0})`;
  const lum = (c) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
  // Watercolour has no black: the darkest wash is a dense Payne's grey, slightly blue.
  const PAYNE = [40, 45, 58];
  // the cool shadow mixture (ultramarine with a little burnt sienna) and the cast-shadow glaze
  const SHADE = [136, 140, 158];
  const SHADOW = [134, 134, 154];
  const PEN = [33, 27, 23];
  function watercolour(c) {
    const l = lum(c);
    const k = Math.pow(1 - l, 3) * 0.6;
    return mix(c, PAYNE, k).map((v) => Math.max(v, 22));
  }
  // the role's colour (through the palette and any screen look)
  function roleRgb(pal, role) {
    if (role === 'shade') return pal.mapRgb ? pal.mapRgb(SHADE) : SHADE;
    if (role === 'shadow') return pal.mapRgb ? pal.mapRgb(SHADOW) : SHADOW;
    if (role === 'graphiteNote') return pal.rgb.graphite;
    const c = pal.rgb[role];
    if (c) return c;
    if (role[0] === '#') return pal.mapRgb ? pal.mapRgb(hex(role)) : hex(role);
    return pal.rgb.ink;
  }
  const CACHE = new WeakMap();
  function paint(pal, role, kind) {
    let m = CACHE.get(pal);
    if (!m) { m = new Map(); CACHE.set(pal, m); }
    const key = kind + role;
    let v = m.get(key);
    if (v) return v;
    const paper = pal.rgb.paper;
    const c = roleRgb(pal, role);
    if (kind === 'over') {
      // light roles are the paper itself, or very nearly
      const w = role === 'paper' ? paper : role === 'light' ? mix(c, paper, 0.4) : watercolour(c);
      v = { css: css(w), rgb: w };
    } else if (kind === 'mul') {
      // a glaze is a filter: over bare paper it gives exactly its colour
      const w = role === 'shade' || role === 'shadow' ? c : watercolour(c);
      const g = [0, 1, 2].map((i) => clamp((w[i] / Math.max(1, paper[i])) * 255, 0, 255));
      v = { css: css(g), rgb: g };
    } else {
      // lines: the 'ink' role is the pen's sepia-black, other dark roles are coloured inks
      const w = role === 'ink' ? pal.rgb.pen || PEN : c;
      v = { css: css(w), rgb: w, dark: lum(w) < 0.6 };
    }
    m.set(key, v);
    return v;
  }

  // ---------- the two sheets: washes, and the pen ----------
  // A context that draws washes on one canvas and pen work on another, keeping their transforms and
  // clips in step. Anything that is not a plate (an easter egg's own drawing) goes to the washes.
  class Sheets {
    constructor(w, k) { this.w = w; this.k = k; }
    save() { this.w.save(); this.k.save(); }
    restore() { this.w.restore(); this.k.restore(); }
    setTransform(...a) { this.w.setTransform(...a); this.k.setTransform(...a); }
    transform(...a) { this.w.transform(...a); this.k.transform(...a); }
    translate(...a) { this.w.translate(...a); this.k.translate(...a); }
    rotate(a) { this.w.rotate(a); this.k.rotate(a); }
    scale(...a) { this.w.scale(...a); this.k.scale(...a); }
    resetTransform() { this.w.resetTransform(); this.k.resetTransform(); }
    beginPath() { this.w.beginPath(); this.k.beginPath(); }
    closePath() { this.w.closePath(); this.k.closePath(); }
    moveTo(x, y) { this.w.moveTo(x, y); this.k.moveTo(x, y); }
    lineTo(x, y) { this.w.lineTo(x, y); this.k.lineTo(x, y); }
    arc(...a) { this.w.arc(...a); this.k.arc(...a); }
    arcTo(...a) { this.w.arcTo(...a); this.k.arcTo(...a); }
    ellipse(...a) { this.w.ellipse(...a); this.k.ellipse(...a); }
    rect(...a) { this.w.rect(...a); this.k.rect(...a); }
    quadraticCurveTo(...a) { this.w.quadraticCurveTo(...a); this.k.quadraticCurveTo(...a); }
    bezierCurveTo(...a) { this.w.bezierCurveTo(...a); this.k.bezierCurveTo(...a); }
    clip(...a) { this.w.clip(...a); this.k.clip(...a); }
    fill(...a) { this.w.fill(...a); }
    stroke(...a) { this.w.stroke(...a); }
    fillRect(...a) { this.w.fillRect(...a); }
    strokeRect(...a) { this.w.strokeRect(...a); }
    clearRect(...a) { this.w.clearRect(...a); }
    fillText(...a) { this.w.fillText(...a); }
    strokeText(...a) { this.w.strokeText(...a); }
    measureText(s) { return this.w.measureText(s); }
    createLinearGradient(...a) { return this.w.createLinearGradient(...a); }
    createRadialGradient(...a) { return this.w.createRadialGradient(...a); }
    createPattern(...a) { return this.w.createPattern(...a); }
    getTransform() { return this.w.getTransform(); }
  }
  for (const prop of ['fillStyle', 'strokeStyle', 'globalAlpha', 'lineWidth', 'font', 'textAlign', 'textBaseline', 'lineCap', 'lineJoin', 'letterSpacing', 'globalCompositeOperation', 'miterLimit', 'shadowBlur', 'shadowColor']) {
    Object.defineProperty(Sheets.prototype, prop, { get() { return this.w[prop]; }, set(v) { this.w[prop] = v; } });
  }

  // The front of a wash as it spreads across damp paper, in plate units.
  function floodPath(f) {
    const r = Math.max(0.5, f.r * (0.04 + 1.3 * f.amt));
    const pts = blob(f.c[0], f.c[1], r, f.seed || 7, 64, 0.3);
    const p = new Path2D();
    addPoly(p, pts, 1);
    return p;
  }

  // Replay a plate. alpha is the washes' strength, pencil the pen's (the line usually comes first).
  // flood = { amt, c, r } lets the washes in through a spreading wet front instead of fading them.
  function drawPlate(ctx, plate, pal, alpha, detail, pencil = alpha, flood = null) {
    const W = ctx.w || ctx, K = ctx.k || ctx;
    const fl = flood && flood.amt < 0.999 ? flood : null;
    const washOff = fl && fl.amt <= 0.001;
    if (fl && !washOff) {
      W.save();
      W.clip(floodPath(fl));
    }
    for (const L of plate.layers) {
      const isLine = L.kind === 'text' || L.mode === 'line';
      if (!isLine && washOff) continue;
      const graphite = L.role.startsWith('graphite');
      let a = (isLine ? pencil : alpha) * lodAlpha(graphite ? L.lod * 0.6 : L.lod, detail) * (L.alpha ?? 1);
      // close up, the faint underdrawing and fine lines drawn for normal size give way to the washes
      if (graphite && L.role !== 'graphiteNote') a *= 0.55 * (1 - smooth(1.8, 3.6, detail));
      else if (isLine && L.lod >= 1) a *= 1 - 0.7 * smooth(2.6, 6, detail);
      const note = L.role === 'graphiteNote';
      if (note && !Plate.notes) continue;
      if (a < 0.004) continue;
      if (L.kind === 'path') {
        if (L.mode === 'over') {
          const c = paint(pal, L.role, 'over');
          W.globalAlpha = a;
          W.fillStyle = c.css;
          W.fill(L.path);
          // what is painted over hides the pen lines under it
          if (K !== W && !fl) {
            K.globalCompositeOperation = 'destination-out';
            K.globalAlpha = a;
            K.fill(L.path);
            K.globalCompositeOperation = 'source-over';
          }
        } else if (L.mode === 'mul') {
          W.globalCompositeOperation = 'multiply';
          W.globalAlpha = a;
          W.fillStyle = paint(pal, L.role, 'mul').css;
          W.fill(L.path);
          W.globalCompositeOperation = 'source-over';
        } else if (L.mode === 'lift') {
          W.globalAlpha = a;
          W.fillStyle = pal.paper;
          W.fill(L.path);
        } else {
          const c = paint(pal, L.role, 'line');
          const C = c.dark ? K : W;
          // Close up, the stroke is redrawn along its centreline with a nib that only slowly gets
          // wider, so the line stays a pen line instead of becoming a brush.
          const near = L.spine ? smooth(1.4, 2.4, detail) : 0;
          C.fillStyle = c.css;
          if (near < 1) {
            C.globalAlpha = a * (1 - near);
            C.fill(L.path);
          }
          if (near > 0) {
            const wAvg = L.wsum / L.wn;
            C.globalAlpha = a * near;
            C.strokeStyle = c.css;
            C.lineWidth = (wAvg * (1 + 0.45 * Math.log(detail))) / detail;
            C.lineCap = 'round';
            C.lineJoin = 'round';
            C.stroke(L.spine);
          }
        }
      } else {
        const c = paint(pal, L.role, 'line');
        const C = c.dark ? K : W;
        C.globalAlpha = a;
        C.fillStyle = c.css;
        drawText(C, L, note && C === K);
      }
    }
    W.globalAlpha = 1;
    if (K !== W) K.globalAlpha = 1;
    if (fl && !washOff) W.restore();
  }

  function fillPoly(ctx, pts) {
    if (!pts) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  // Palettes: role → css string, with .rgb for blending.
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

  global.Ink = { floodPath, rng, clamp, smooth, area, centroid, inside, catmull, resampleOpen, gougePoly, wobble, blob, noise2, fbm2, Plate, Sheets, drawPlate, fillPoly, lodAlpha, hex, mix, css, lum, makePal, mixPal, watercolour, FONTS, PEN };
})(window);
