// ink.js: clean flat-colour mark-making for Canvas2D.
// Every mark is a filled polygon recorded once, in the machine's own units, under a role name; the
// colour of each role is looked up when it is drawn, so a poster's palette can change under it. A
// surface is never shaded with lines: its light is cut into flat tonal steps of its own colour. A role
// written "name@k" is step k of that colour's ramp: 2 is the colour itself, 0 and 1 its shadows, 3
// and 4 its lights.
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

  // A tapered stroke along a path: thin at both ends, swelling toward `skew`. In a print it is a cut
  // in a flat drawing, so it is used sparingly: keylines, highlights along an edge, cables.
  function gougePoly(pts, w, o = {}) {
    const P = o.smooth === false || pts.length < 3 ? densify(pts, o.n || 6) : catmull(pts, o.seg || 4);
    const n = P.length;
    if (n < 2) return null;
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const tot = cum[n - 1];
    if (tot < 1e-6) return null;
    const taper = o.taper ?? 0.82, pw = o.pow ?? 0.3, sk = o.skew ?? 0.5;
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

  // Keep the part of a polygon where a·p lies between lo and hi (a slab across it).
  function clipSlab(pts, ax, ay, lo, hi) {
    const half = (src, keep, k) => {
      const out = [];
      for (let i = 0; i < src.length; i++) {
        const a = src[i], b = src[(i + 1) % src.length];
        const va = a[0] * ax + a[1] * ay, vb = b[0] * ax + b[1] * ay;
        const ia = keep(va), ib = keep(vb);
        if (ia) out.push(a);
        if (ia !== ib) {
          const t = (k - va) / (vb - va);
          out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      return out;
    };
    let out = half(pts, (v) => v >= lo, lo);
    if (out.length >= 3) out = half(out, (v) => v <= hi, hi);
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

  // ---------- inks ----------
  // A poster is printed with four inks on cream stock: black (K), signal red (R), and two spot colours
  // that change from machine to machine: S, the machine's own colour, and A, an accent. A recipe is how
  // much of each ink a colour is mixed from: 1 is the ink itself, 0.5 and 0.25 are its tints.
  const RECIPES = {
    paper: {}, K1: { K: 1 }, K5: { K: 0.5 }, K25: { K: 0.25 },
    R1: { R: 1 }, R5: { R: 0.5 }, S1: { S: 1 }, S5: { S: 0.5 }, S25: { S: 0.25 }, A1: { A: 1 }, A5: { A: 0.5 },
    RK: { R: 1, K: 0.5 }, SK: { S: 1, K: 0.5 }, AK: { A: 1, K: 0.5 }, S5K: { S: 0.5, K: 0.25 },
    RA: { R: 1, A: 1 }, RS: { R: 1, S: 1 }, SA: { S: 1, A: 1 }, R5A: { R: 0.5, A: 1 },
  };
  const PLATES = ['K', 'R', 'S', 'A'];
  // Where a recipe is cut by an edge, the edge is printed solid or not at all.
  const SOLID = (r) => PLATES.every((k) => !r[k] || r[k] === 1);
  // The colour of a recipe: inks multiply over the paper; a tint is a lighter mix of its ink.
  function recipeRgb(inks, r) {
    const out = inks.paper.slice();
    for (const k of PLATES) {
      const c = r[k] || 0;
      if (!c) continue;
      for (let j = 0; j < 3; j++) out[j] *= 1 - c * (1 - inks[k][j] / 255);
    }
    return out;
  }
  // What the old roles print as.
  const ALIAS = { tint2b: 'S5K', ink: 'K1', umber: 'K1', earth: 'K5', warm: 'K25', light: 'paper', tint: 'S1', tint2: 'A1', graphite: 'K1', graphite2: 'K5', graphiteNote: 'K1' };
  // Each role posterised into [shadow, middle, light].
  const LEVELS = {
    null: ['K25', 'paper', 'paper'], paper: ['K25', 'paper', 'paper'], light: ['K25', 'paper', 'paper'],
    warm: ['K5', 'K25', 'paper'], ink: ['K1', 'K1', 'K5'], umber: ['K1', 'K1', 'K5'], earth: ['K1', 'K5', 'K25'],
    tint: ['SK', 'S1', 'S5'], tint2: ['AK', 'A1', 'A5'], tint2b: ['SK', 'S5K', 'S25'], graphite: ['K1', 'K5', 'K25'], graphite2: ['K5', 'K25', 'paper'],
  };

  class Plate {
    constructor(seed) {
      this.layers = [];
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
    rand(a = 0, b = 1) {
      return a + (b - a) * this.r();
    }
    layer(role, lod, alpha = 1) {
      let L = this.layers[this.layers.length - 1];
      if (!L || L.kind !== 'path' || L.role !== role || L.lod !== lod || (L.alpha ?? 1) !== alpha) {
        L = { kind: 'path', role, lod, alpha, path: new Path2D() };
        this.layers.push(L);
      }
      return L;
    }
    // A translucent wash: glass, a reflection, a shadow laid over a face.
    wash(role, pts, alpha, lod = 0) {
      if (!pts || pts.length < 3 || alpha < 0.02) return;
      if (Plate.remap && Plate.remap[role]) role = Plate.remap[role];
      const q = this.tx(pts);
      if (q.length >= 3) addPoly(this.layer(role, lod, Math.min(1, alpha)).path, q, 1);
    }
    fill(role, pts, lod = this.lod) {
      if (!pts || pts.length < 3) return;
      if (Plate.remap && Plate.remap[role]) role = Plate.remap[role];
      const q = this.tx(pts);
      if (q.length >= 3) addPoly(this.layer(role, lod).path, q, 1);
    }
    ring(role, pts, w, lod = this.lod) {
      const [A, B] = offsetRing(area(pts) < 0 ? pts.slice().reverse() : pts, w);
      const L = this.layer(role, lod);
      const a = this.tx(A), b = this.tx(B);
      if (a.length >= 3) addPoly(L.path, a, 1);
      if (b.length >= 3) addPoly(L.path, b, -1);
    }
    gouge(role, pts, w, o = {}) {
      const poly = gougePoly(pts, w, o);
      if (poly) this.fill(role, poly, o.lod ?? this.lod);
    }
    line(role, x1, y1, x2, y2, w, o = {}) {
      const bow = o.bow ?? 0;
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const mx = (x1 + x2) / 2 - (dy / d) * bow, my = (y1 + y2) / 2 + (dx / d) * bow;
      this.gouge(role, [[x1, y1], [mx, my], [x2, y2]], w, { seg: 3, ...o });
    }
    // Explicit patterns a machine asks for (a speaker grille, a screen's scan lines): even, untapered
    // bars of one width, ruled.
    hatch(role, poly, o = {}) {
      const ang = o.angle ?? 0, gap = o.gap ?? 8, w = o.w ?? 2.2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const lod = o.lod ?? 1;
      let vmin = Infinity, vmax = -Infinity;
      for (const p of poly) {
        const v = -p[0] * sa + p[1] * ca;
        vmin = Math.min(vmin, v);
        vmax = Math.max(vmax, v);
      }
      for (let v = vmin + gap * 0.5; v < vmax; v += gap) {
        const ww = w * (o.tone ? clamp((0.9 - o.tone(0, 0)) / 0.5, 0.3, 1.2) : 1);
        const band = clipSlab(poly, -sa, ca, v - ww / 2, v + ww / 2);
        if (band.length >= 3) this.fill(role, band, lod);
      }
    }
    rings(role, cx, cy, rx, ry, o = {}) {
      const n = o.n ?? 12, from = o.from ?? 0.3, to = o.to ?? 1, w = o.w ?? 2;
      const lod = o.lod ?? 1;
      for (let k = 0; k < n; k++) {
        const f = from + ((to - from) * k) / Math.max(1, n - 1);
        const ring = [];
        for (let j = 0; j < 40; j++) {
          const th = (j / 40) * Math.PI * 2;
          ring.push([cx + rx * f * Math.cos(th), cy + ry * f * Math.sin(th)]);
        }
        this.ring(role, ring, w * 0.8, lod);
      }
    }
    // A ruled line, even and straight: in a poster, construction lines are printed in the key ink.
    pencil(pts, o = {}) {
      const P = pts.length > 2 && o.curve ? catmull(pts, 4) : pts.slice();
      if (P.length < 2) return;
      const role = o.role || 'graphite';
      // a rule is never finer than about a millimetre, so it reads at a distance
      const w = Math.max(2, (o.w ?? 0.85) * 1.6);
      this.gouge(role, P, w, { smooth: false, taper: 0.9, pow: 0.1, lod: o.lod ?? 0.5 });
    }
    sketch() {}
    // A dimension, as a printer's callout: a hairline with square ends and the figure set in a
    // condensed grotesque, on a knocked-out patch.
    dim(x1, y1, x2, y2, label, o = {}) {
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, t = o.tick ?? 5;
      const lod = o.lod ?? 1;
      this.pencil([[x1, y1], [x2, y2]], { role: 'graphiteNote', w: 1.1, lod });
      for (const [x, y] of [[x1, y1], [x2, y2]]) this.pencil([[x - nx * t, y - ny * t], [x + nx * t, y + ny * t]], { role: 'graphiteNote', w: 2.2, lod });
      let a = Math.atan2(dy, dx);
      if (a > Math.PI / 2) a -= Math.PI;
      if (a < -Math.PI / 2) a += Math.PI;
      const off = o.off ?? 12;
      this.text('graphiteNote', String(label).toUpperCase(), (x1 + x2) / 2 + nx * off, (y1 + y2) / 2 + ny * off, (o.size ?? 13) * 1.15, { font: 'cond', weight: 600, rot: a, lod, track: 1 });
    }
    // A note: a red square, a short rule, and the words in capitals.
    note(x, y, str, o = {}) {
      const size = (o.size ?? 15) * 0.98, al = o.align || 'left', lod = o.lod ?? 1;
      const s = size * 0.55;
      const bx = al === 'right' ? x + s * 1.2 : al === 'center' ? x - s * 0.5 : x - s * 1.6;
      const by = y - s * 0.5;
      this.layers.push({ kind: 'mark', role: 'graphiteNote', lod, x: bx, y: by, s, M: this.M });
      this.text('graphiteNote', String(str).toUpperCase(), x, y, size, { font: 'cond', weight: 600, align: al, rot: o.rot || 0, lod, track: 0.8 });
    }
    // A shaded surface, posterised. tone: 0 = black, 1 = white (number or fn(x, y)). The face is filled
    // with the step its middle falls in; where the light across it crosses into another step, that part
    // is cut as its own flat shape.
    face(poly, tone, o = {}) {
      const T = typeof tone === 'function' ? tone : () => tone;
      const c = centroid(poly);
      const t0 = T(c[0], c[1]);
      const base = Math.max(0.2, o.base ?? 0.9);
      let role = o.dark ? o.fill || 'ink' : o.fill ?? null;
      if (role && Plate.remap && Plate.remap[role]) role = Plate.remap[role];
      // a surface with no colour of its own is a neutral metal or plastic as light as its material:
      // white plastic, silver, space grey
      if (role == null || role === 'light') {
        const v = Math.round(255 * Math.pow(clamp(base, 0.2, 1), 1.4));
        role = '#' + [v, v, Math.min(255, v + 3)].map((x) => x.toString(16).padStart(2, '0')).join('');
      }
      const lv = levels(role);
      const step = (t) => { const r = t / base; return r > 0.97 ? 4 : r > 0.86 ? 3 : r > 0.68 ? 2 : r > 0.5 ? 1 : 0; };
      const s0 = step(t0);
      this.fill(lv[s0], poly, o.lod ?? 0);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const q of poly) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      const size = Math.max(x1 - x0, y1 - y0);
      if (o.hatch !== false && size > 24 && typeof tone === 'function') {
        // the direction the light changes fastest, by a least-squares plane through samples of it
        let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, st = 0, sxt = 0, syt = 0, n = 0;
        for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
          const x = x0 + ((x1 - x0) * i) / 4, y = y0 + ((y1 - y0) * j) / 4;
          if (!inside(poly, x, y)) continue;
          const t = T(x, y), X = x - c[0], Y = y - c[1];
          sx += X; sy += Y; sxx += X * X; syy += Y * Y; sxy += X * Y; st += t; sxt += X * t; syt += Y * t; n++;
        }
        let gx = 0, gy = 0;
        if (n >= 4) {
          const det = sxx * syy - sxy * sxy;
          if (Math.abs(det) > 1e-6) { gx = (sxt * syy - syt * sxy) / det; gy = (syt * sxx - sxt * sxy) / det; }
        }
        const gl = Math.hypot(gx, gy);
        if (gl * size > 0.05) {
          const ax = gx / gl, ay = gy / gl;
          let lo = Infinity, hi = -Infinity;
          for (const q of poly) { const v = (q[0] - c[0]) * ax + (q[1] - c[1]) * ay; lo = Math.min(lo, v); hi = Math.max(hi, v); }
          // levels in bins across the face, merged into runs
          const N = 36, dv = (hi - lo) / N, cut = [];
          for (let k = 0; k < N; k++) {
            const v = lo + (k + 0.5) * dv;
            const s = step(T(c[0] + ax * v, c[1] + ay * v));
            const last = cut[cut.length - 1];
            if (last && last[2] === s) last[1] = lo + (k + 1) * dv;
            else cut.push([lo + k * dv, lo + (k + 1) * dv, s]);
          }
          const off = c[0] * ax + c[1] * ay;
          for (const [a, b, s] of cut) {
            if (s === s0 || lv[s] === lv[s0]) continue;
            const part = clipSlab(poly, ax, ay, off + a, off + b);
            if (part.length >= 3) this.fill(lv[s], part, o.lod ?? 0);
          }
        }
      }
      if (o.edge) this.ring(o.edgeRole ?? 'ink', poly, o.edge * 0.9, o.edgeLod ?? 0);
      return lv[s0];
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
      if (!str) return;
      this.layers.push({ kind: 'text', role, lod: o.lod ?? 0.5, str, x, y, size, font: o.font || 'mono', align: o.align || 'center', rot: o.rot || 0, weight: o.weight || 500, italic: !!o.italic, track: o.track || 0, M: this.M, base: o.base || 'middle' });
    }
  }

  // A role's five tonal steps. A light surface has no lights above its own colour, a black one
  // lifts into greys; the steps are resolved to colours when the role is drawn (shade()).
  const BASE_OF = { null: 'paper', light: 'paper', graphite: 'K1', graphite2: 'K5', umber: 'ink' };
  function levels(role) {
    const r = role == null ? 'paper' : BASE_OF[role] || role;
    return [0, 1, 2, 3, 4].map((k) => `${r}@${k}`);
  }
  // step k of a colour's ramp: shadows lean cool and dark, lights toward white
  const SHADOW = [28, 30, 40], LIGHT = [255, 255, 255];
  function shade(c, k) {
    if (k === 2) return c;
    const l = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
    if (k < 2) return mix(c, SHADOW, (2 - k) * (0.16 + 0.1 * l));
    // a dark colour lifts in bigger steps, a pale one in small ones, so both read
    return mix(c, LIGHT, (k - 2) * (0.1 + 0.16 * (1 - l)));
  }

  Plate.notes = true;
  Plate.sketchy = false;
  Plate.style = 'poster';

  const FONTS = {
    mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    serif: '"Oswald", "Arial Narrow", sans-serif',
    cond: '"Oswald", "Arial Narrow", sans-serif',
    display: '"Anton", "Oswald", Impact, sans-serif',
  };

  function fontStr(L) {
    return `${L.italic && L.font !== 'serif' && L.font !== 'cond' ? 'italic ' : ''}${L.weight} ${L.size}px ${FONTS[L.font] || L.font}`;
  }

  // halo: a knock-out in the paper colour, so a note never sits on top of the drawing
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
      ctx.strokeStyle = halo;
      ctx.lineWidth = L.size * 0.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(L.str, 0, 0);
      ctx.restore();
    }
    ctx.fillText(L.str, 0, 0);
    ctx.restore();
  }

  // Fine layers come in as a device grows on screen.
  function lodAlpha(lod, detail) {
    if (!lod) return 1;
    return smooth(lod * 0.16, lod * 0.42, detail);
  }

  const rampCache = new WeakMap();
  function roleColor(pal, role) {
    if (pal[role]) return pal[role];
    const at = role.indexOf('@');
    if (at > 0) {
      let cache = rampCache.get(pal);
      if (!cache) rampCache.set(pal, (cache = {}));
      if (cache[role]) return cache[role];
      const base = role.slice(0, at), k = +role.slice(at + 1);
      const c = base[0] === '#' ? (pal.mapRgb ? pal.mapRgb(hex(base)) : hex(base)) : rgbOf(pal, base);
      return (cache[role] = css(shade(c, k)));
    }
    const a = ALIAS[role];
    if (a && pal[a]) return pal[a];
    if (role[0] === '#') return pal.mapHex ? pal.mapHex(role) : role;
    return pal.K1 || pal.ink;
  }

  function rgbOf(pal, role) {
    if (pal.rgb && pal.rgb[role]) return pal.rgb[role];
    const a = ALIAS[role];
    if (a && pal.rgb && pal.rgb[a]) return pal.rgb[a];
    const s = roleColor(pal, role);
    const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(s);
    return m ? [+m[1], +m[2], +m[3]] : s[0] === '#' ? hex(s) : [32, 28, 27];
  }

  // ink: how far a part has come in; a part arrives and leaves as a plain fade.
  function drawPlate(ctx, plate, pal, alpha, detail, pencil = alpha) {
    for (const L of plate.layers) {
      const graphite = L.role.startsWith('graphite') && L.role !== 'graphiteNote';
      let a = (graphite ? pencil : alpha) * lodAlpha(L.lod, detail) * (L.alpha ?? 1);
      const note = L.role === 'graphiteNote' || L.kind === 'mark';
      if (note && !Plate.notes) continue;
      if (a < 0.004) continue;
      ctx.globalAlpha = Math.min(1, a);
      if (L.kind === 'mark') {
        // the red square that marks a note
        ctx.save();
        if (L.M) ctx.transform(L.M[0], L.M[1], L.M[2], L.M[3], L.M[4], L.M[5]);
        ctx.fillStyle = pal.R1 || pal.ink;
        ctx.fillRect(L.x, L.y, L.s, L.s);
        ctx.restore();
        continue;
      }
      ctx.fillStyle = roleColor(pal, L.role);
      if (L.kind === 'path') ctx.fill(L.path);
      else drawText(ctx, L, note ? pal.sheet || pal.paper : null);
    }
    ctx.globalAlpha = 1;
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
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
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
  // The palette a poster is printed with: every recipe's colour, and the old role names as aliases.
  function inkPal(inks) {
    const rgb = {};
    for (const k in RECIPES) rgb[k] = recipeRgb(inks, RECIPES[k]);
    for (const k in ALIAS) rgb[k] = rgb[ALIAS[k]];
    return makePal(rgb);
  }

  global.Ink = { rng, clamp, smooth, area, centroid, inside, catmull, resampleOpen, gougePoly, clipSlab, Plate, drawPlate, fillPoly, lodAlpha, hex, mix, css, makePal, mixPal, FONTS, RECIPES, PLATES, SOLID, recipeRgb, inkPal, LEVELS, levels, shade, roleColor };
})(window);
