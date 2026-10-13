// ink.js: linocut mark-making for Canvas2D.
// Every mark is a filled polygon (a swelling, tapering gouge), recorded once in
// device-local units into "plates" and replayed at any zoom as merged Path2D layers.
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

  // A tapered gouge along a path: thin at both ends, swelling toward `skew`.
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
      const hw = 0.5 * w * prof;
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

  class Plate {
    constructor(seed) {
      this.layers = [];
      this.r = rng(seed);
      this.lod = 0;
    }
    rand(a = 0, b = 1) {
      return a + (b - a) * this.r();
    }
    layer(role, lod) {
      let L = this.layers[this.layers.length - 1];
      if (!L || L.kind !== 'path' || L.role !== role || L.lod !== lod) {
        L = { kind: 'path', role, lod, path: new Path2D() };
        this.layers.push(L);
      }
      return L;
    }
    fill(role, pts, lod = this.lod) {
      if (pts && pts.length >= 3) addPoly(this.layer(role, lod).path, pts, 1);
    }
    ring(role, pts, w, lod = this.lod) {
      const [A, B] = offsetRing(area(pts) < 0 ? pts.slice().reverse() : pts, w);
      const L = this.layer(role, lod);
      addPoly(L.path, A, 1);
      addPoly(L.path, B, -1);
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
    // Parallel gouges clipped to a polygon, broken into scoops whose width follows o.tone(x, y).
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
            const x = p[0] + (q[0] - p[0]) * k, y = p[1] + (q[1] - p[1]) * k;
            us.push(x * ca + y * sa);
          }
        }
        us.sort((a, b) => a - b);
        for (let i = 0; i + 1 < us.length; i += 2) {
          const u0 = us[i] + inset, u1 = us[i + 1] - inset;
          if (u1 - u0 < 4) continue;
          let u = u0 + this.rand(0, 3);
          while (u < u1 - 3) {
            let ue = Math.min(u1, u + this.rand(sc[0], sc[1]));
            if (u1 - ue < sc[0] * 0.45) ue = u1;
            const um = (u + ue) / 2;
            const mx = um * ca - v * sa, my = um * sa + v * ca;
            const ww = w * (o.tone ? o.tone(mx, my) : 1);
            if (ww > (o.minW ?? 0.3)) {
              const bow = this.rand(-1, 1) * (o.bow ?? 0.7);
              this.gouge(
                role,
                [[u * ca - v * sa, u * sa + v * ca], [mx - sa * bow, my + ca * bow], [ue * ca - v * sa, ue * sa + v * ca]],
                Math.min(ww, w * 1.15),
                { lod, taper: o.taper ?? 0.08, seg: 3 }
              );
            }
            u = ue + this.rand(1.5, 4);
          }
        }
      }
    }
    // Concentric elliptical scoops, kept inside `clip` when given.
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
            if (ww > 0.3) this.gouge(role, pts, ww, { lod, taper: 0.08 });
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
      const amp = o.wob ?? 0.6, p1 = this.rand(0, 6), p2 = this.rand(0, 6), f1 = this.rand(0.05, 0.09), f2 = this.rand(0.18, 0.3);
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
    // Outline a shape the way a draughtsman finds it: broken runs, two passes, overshooting corners.
    sketch(poly, o = {}) {
      const n = poly.length;
      if (n < 2) return;
      const closed = o.closed ?? true;
      const turn = (i) => {
        const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
        const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
        return Math.abs(Math.atan2(Math.sin(t2 - t1), Math.cos(t2 - t1)));
      };
      let start = 0;
      if (closed) for (let i = 0; i < n; i++) if (turn(i) > 0.6) { start = i; break; }
      const seq = [];
      for (let k = 0; k <= (closed ? n : n - 1); k++) seq.push(k === n ? start : (start + k) % n);
      const passes = o.passes ?? 2;
      for (let pass = 0; pass < passes; pass++) {
        const jx = pass ? this.rand(-1.4, 1.4) : 0, jy = pass ? this.rand(-1.4, 1.4) : 0;
        let run = [], len = 0, maxLen = this.rand(110, 210);
        const flush = () => {
          if (run.length >= 2) this.pencil(run.map(([x, y]) => [x + jx, y + jy]), { role: pass ? 'graphite2' : 'graphite', w: pass ? 0.8 : o.w ?? 1.1, over: pass ? 7 : o.over ?? 4, lod: o.lod ?? 0.5, wob: o.wob });
        };
        for (let k = 0; k < seq.length; k++) {
          const i = seq[k], p = poly[i];
          if (run.length) len += Math.hypot(p[0] - run[run.length - 1][0], p[1] - run[run.length - 1][1]);
          run.push(p);
          const corner = closed && k > 0 && k < seq.length - 1 && turn(i) > 0.6;
          if (corner || len > maxLen) {
            flush();
            run = [p];
            len = 0;
            maxLen = this.rand(110, 210);
          }
        }
        flush();
      }
    }
    // A pencilled dimension: a line with end ticks and a small italic label.
    dim(x1, y1, x2, y2, label, o = {}) {
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, t = o.tick ?? 6;
      const lod = o.lod ?? 1;
      this.pencil([[x1, y1], [x2, y2]], { role: 'graphite', w: 0.7, over: 3, lod });
      for (const [x, y] of [[x1, y1], [x2, y2]]) this.pencil([[x - nx * t, y - ny * t], [x + nx * t, y + ny * t]], { role: 'graphite', w: 0.7, over: 1, lod });
      let a = Math.atan2(dy, dx);
      if (a > Math.PI / 2) a -= Math.PI;
      if (a < -Math.PI / 2) a += Math.PI;
      const off = o.off ?? 11;
      this.text('graphite', label, (x1 + x2) / 2 + nx * off, (y1 + y2) / 2 + ny * off, o.size ?? 13, { font: 'serif', italic: true, weight: 400, rot: a, lod });
    }
    note(x, y, str, o = {}) {
      this.text('graphite', str, x, y, o.size ?? 15, { font: 'serif', italic: true, weight: 400, align: o.align || 'left', rot: o.rot || 0, lod: o.lod ?? 1 });
    }
    // A shaded surface: solid block, carved hatching whose weight follows tone, then pencil over it.
    // tone: 0 = black, 1 = white (number or fn(x, y)).
    face(poly, tone, o = {}) {
      const T = typeof tone === 'function' ? tone : () => tone;
      const c = centroid(poly);
      const t0 = T(c[0], c[1]);
      const base = o.fill ?? (t0 < 0.45 ? 'ink' : t0 > 0.9 ? 'light' : 'paper');
      this.fill(base, poly, o.lod ?? 0);
      const h = { angle: o.angle ?? 0, gap: o.gap ?? 8, w: o.w ?? 2.3, scoop: o.scoop, bow: o.bow, lod: o.hlod ?? 1 };
      if (base === 'ink') {
        this.hatch(o.cut ?? 'paper', poly, { ...h, tone: (x, y) => clamp(T(x, y) / 0.45, 0, 1.15) });
      } else {
        if (o.hatch !== false) this.hatch(o.line ?? 'ink', poly, { ...h, tone: (x, y) => Math.pow(clamp((1 - T(x, y)) / 0.6, 0, 1.15), 1.25) });
        if (o.shade !== false) {
          this.hatch('graphite2', poly, { angle: (o.angle ?? 0) + 0.85, gap: o.pgap ?? 4.4, w: 0.85, scoop: [50, 110], bow: 0.5, taper: 0.2, minW: 0.18, lod: 1, inset: 1, tone: (x, y) => clamp((0.95 - T(x, y)) / 0.45, 0, 1) });
        }
      }
      if (o.edge) this.ring(o.edgeRole ?? 'ink', poly, o.edge, o.edgeLod ?? 0);
      if (o.pencil !== false) this.sketch(poly, { lod: 0.5 });
    }
    dots(role, poly, gap, r, lod = 1) {
      let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
      for (const p of poly) {
        xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]);
        ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]);
      }
      const L = this.layer(role, lod);
      let row = 0;
      for (let y = ymin + gap / 2; y < ymax; y += gap, row++) {
        for (let x = xmin + gap / 2 + (row % 2) * gap * 0.5; x < xmax; x += gap) {
          if (!inside(poly, x, y)) continue;
          L.path.moveTo(x + r, y);
          L.path.arc(x, y, r, 0, Math.PI * 2);
        }
      }
    }
    text(role, str, x, y, size, o = {}) {
      this.layers.push({ kind: 'text', role, lod: o.lod ?? 0.5, str, x, y, size, font: o.font || 'mono', align: o.align || 'center', rot: o.rot || 0, weight: o.weight || 500, italic: !!o.italic, track: o.track || 0 });
    }
  }

  const FONTS = {
    mono: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
    serif: '"IM Fell English", "Iowan Old Style", Georgia, serif',
  };

  function fontStr(L) {
    return `${L.italic ? 'italic ' : ''}${L.weight} ${L.size}px ${FONTS[L.font] || L.font}`;
  }

  function drawText(ctx, L) {
    ctx.save();
    ctx.translate(L.x, L.y);
    if (L.rot) ctx.rotate(L.rot);
    ctx.font = fontStr(L);
    ctx.textAlign = L.align;
    ctx.textBaseline = 'middle';
    if (L.track && 'letterSpacing' in ctx) ctx.letterSpacing = `${L.track}px`;
    ctx.fillText(L.str, 0, 0);
    ctx.restore();
  }

  // Fine layers fade in as a device grows on screen: a block print first, then the carving.
  function lodAlpha(lod, detail) {
    if (!lod) return 1;
    return smooth(lod * 0.16, lod * 0.42, detail);
  }

  // Graphite layers carry their own alpha so a machine can arrive as a pencil sketch before it is inked.
  function drawPlate(ctx, plate, pal, alpha, detail, pencil = alpha) {
    for (const L of plate.layers) {
      const a = (L.role.startsWith('graphite') ? pencil : alpha) * lodAlpha(L.lod, detail);
      if (a < 0.004) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = pal[L.role] || pal.ink;
      if (L.kind === 'path') ctx.fill(L.path);
      else drawText(ctx, L);
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
  const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
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

  global.Ink = { rng, clamp, smooth, area, centroid, inside, catmull, resampleOpen, gougePoly, Plate, drawPlate, fillPoly, lodAlpha, hex, mix, css, makePal, mixPal, FONTS };
})(window);
