// geo.js: affine maps, and a small 3D modeller that draws through the ink plates.
// Machines are built from boxes, extrusions, lofts and cylinders in centimetres, seen in a fixed
// three-quarter view. The projection is orthographic, so every flat face maps to the page by an
// exact affine transform: details on a face (keys, screens, labels) are drawn in that face's own units.
'use strict';

(function (global) {
  const { Plate, clamp } = Ink;
  const { sin, cos, sqrt, atan2, PI } = Math;

  // ---------- affine maps: [a, b, c, d, e, f] ↦ x' = a x + c y + e, y' = b x + d y + f ----------
  const Af = {
    I: () => [1, 0, 0, 1, 0, 0],
    T: (x, y) => [1, 0, 0, 1, x, y],
    S: (sx, sy = sx) => [sx, 0, 0, sy, 0, 0],
    R: (a) => [cos(a), sin(a), -sin(a), cos(a), 0, 0],
    mul(m, n) {
      return [
        m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
        m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
        m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
      ];
    },
    chain(...ms) {
      return ms.reduce((acc, m) => Af.mul(acc, m));
    },
    inv(m) {
      const det = m[0] * m[3] - m[1] * m[2];
      const a = m[3] / det, b = -m[1] / det, c = -m[2] / det, d = m[0] / det;
      return [a, b, c, d, -(a * m[4] + c * m[5]), -(b * m[4] + d * m[5])];
    },
    apply(m, p) {
      return [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    },
    det: (m) => m[0] * m[3] - m[1] * m[2],
    // The one-parameter path from the identity to m: a zoom (with shear and turn) about m's fixed point.
    pow(m, t) {
      if (t <= 0) return Af.I();
      if (t >= 1) return m.slice();
      const a = m[0], b = m[1], c = m[2], d = m[3];
      const tr = a + d, det = a * d - b * c;
      const disc = (tr * tr) / 4 - det;
      let L;
      if (disc > 1e-9) {
        const s = sqrt(disc), l1 = tr / 2 + s, l2 = tr / 2 - s;
        if (l1 <= 0 || l2 <= 0) return Af.lerp(m, t);
        const p1 = Math.pow(l1, t), p2 = Math.pow(l2, t), k = l1 - l2;
        // (p1 (M - l2 I) - p2 (M - l1 I)) / (l1 - l2)
        L = [(p1 * (a - l2) - p2 * (a - l1)) / k, (p1 - p2) * b / k, (p1 - p2) * c / k, (p1 * (d - l2) - p2 * (d - l1)) / k];
      } else if (disc < -1e-9) {
        const r = sqrt(det), th = atan2(sqrt(-disc), tr / 2);
        const rt = Math.pow(r, t), ct = cos(t * th), st = sin(t * th) / sin(th);
        L = [rt * (ct + st * (a / r - cos(th))), rt * st * (b / r), rt * st * (c / r), rt * (ct + st * (d / r - cos(th)))];
      } else {
        const l = tr / 2;
        if (l <= 0) return Af.lerp(m, t);
        const lt = Math.pow(l, t);
        L = [lt * (1 + t * (a / l - 1)), lt * t * (b / l), lt * t * (c / l), lt * (1 + t * (d / l - 1))];
      }
      // translation from the fixed point F = (I - M)^-1 b
      const ia = 1 - a, ib = -b, ic = -c, id = 1 - d, idet = ia * id - ib * ic;
      if (Math.abs(idet) < 1e-9) return [...L, m[4] * t, m[5] * t];
      const Fx = (id * m[4] - ic * m[5]) / idet, Fy = (-ib * m[4] + ia * m[5]) / idet;
      return [...L, Fx - (L[0] * Fx + L[2] * Fy), Fy - (L[1] * Fx + L[3] * Fy)];
    },
    lerp(m, t) {
      const I = Af.I();
      return m.map((v, i) => I[i] + (v - I[i]) * t);
    },
    // Unit square → parallelogram given by origin and two edge vectors.
    frame(o, u, v) {
      return [u[0], u[1], v[0], v[1], o[0], o[1]];
    },
    scaleOf: (m) => sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])),
  };

  // ---------- vectors ----------
  const v3 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
    norm(a) {
      const l = v3.len(a) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
  };
  const LIGHT = v3.norm([-0.5, 0.8, 0.55]);
  const mulR = (R, p) => [R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2], R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2], R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2]];
  const matR = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));

  function rr2(x, y, w, h, r, n = 5) {
    r = Math.max(0.001, Math.min(r, w / 2, h / 2));
    const pts = [];
    const cs = [[x + w - r, y + r, -PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, PI / 2], [x + r, y + r, PI]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (PI / 2);
      pts.push([cx + r * cos(a), cy + r * sin(a)]);
    }
    return pts;
  }
  function ell2(cx, cy, rx, ry = rx, n = 36) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      pts.push([cx + rx * cos(a), cy + ry * sin(a)]);
    }
    return pts;
  }

  // ---------- the modeller ----------
  // Faces are recorded with their 3D corners, a local frame (origin o, unit axes U and V, extents w × h)
  // and an optional decorator that draws on the face in its own units once the view is known.
  class Model {
    constructor(view, opts = {}) {
      this.view = view;
      this.parts = [];
      this.marks = {};
      this.fitBox = opts.fit || [820, 720];
      this.fitCenter = opts.center || [500, 505];
      this.tf = null;
      this.part('body');
    }
    // Place what fn draws by a rotation about the x axis through `pivot`, then a shift: for opened lids.
    rotX(deg, pivot, fn, shift = [0, 0, 0]) {
      const a = (deg * PI) / 180, c = cos(a), s = sin(a);
      const R = [[1, 0, 0], [0, c, -s], [0, s, c]];
      const t = v3.add(v3.sub(pivot, mulR(R, pivot)), shift);
      const prev = this.tf;
      this.tf = prev ? { R: matR(prev.R, R), t: v3.add(mulR(prev.R, t), prev.t) } : { R, t };
      try { fn(); } finally { this.tf = prev; }
      return this;
    }
    xp(p) { return this.tf ? v3.add(mulR(this.tf.R, p), this.tf.t) : p; }
    xv(v) { return this.tf ? mulR(this.tf.R, v) : v; }
    part(name, o = {}) {
      this.cur = { name, ...o, ops: [] };
      this.parts.push(this.cur);
      return this;
    }
    // world → camera space
    cam(p) {
      const yw = (this.view.yaw * PI) / 180, pt = (this.view.pitch * PI) / 180;
      const x1 = p[0] * cos(yw) - p[2] * sin(yw), z1 = p[0] * sin(yw) + p[2] * cos(yw);
      const y2 = p[1] * cos(pt) - z1 * sin(pt), z2 = p[1] * sin(pt) + z1 * cos(pt);
      return [x1, -y2, z2];
    }
    face(pts, n, frame, mat, o = {}) {
      if (this.tf) {
        pts = pts.map((q) => this.xp(q));
        n = this.xv(n);
        if (frame) frame = { ...frame, o: this.xp(frame.o), U: this.xv(frame.U), V: this.xv(frame.V) };
        if (o.axis) o = { ...o, axis: this.xv(o.axis) };
      }
      this.cur.ops.push({ kind: 'face', pts, n, frame, mat, ...o });
      return this;
    }
    // A free drawing step. Its points count toward framing the model unless fit is false.
    op(fn, pts = [], fit = true) {
      this.cur.ops.push({ kind: 'op', fn, pts, fit });
      return this;
    }

    // Box from corner (x, y, z) with size w × h × d. y is up, z is toward the viewer.
    // o.faces: { front, back, left, right, top, bottom } decorators; o.r rounds the vertical edges.
    box(x, y, z, w, h, d, mat, o = {}) {
      if (o.hf != null) return this.wedge(x, y, z, w, h, o.hf, d, mat, o);
      const X0 = x, X1 = x + w, Y0 = y, Y1 = y + h, Z0 = z, Z1 = z + d;
      const F = o.faces || {};
      const skip = new Set(o.skip || []);
      const r = Math.min(o.r || 0, w / 2, d / 2);
      const add = (key, pts, n, fo, U, V, fw, fh) => {
        if (skip.has(key)) return;
        this.face(pts, n, { o: fo, U, V, w: fw, h: fh }, o.mats?.[key] || mat, { deco: F[key], key, edge: o.edge, hatch: o.hatch?.[key] });
      };
      if (r <= 0.001) {
        add('back', [[X1, Y1, Z0], [X0, Y1, Z0], [X0, Y0, Z0], [X1, Y0, Z0]], [0, 0, -1], [X1, Y1, Z0], [-1, 0, 0], [0, -1, 0], w, h);
        add('left', [[X0, Y1, Z0], [X0, Y1, Z1], [X0, Y0, Z1], [X0, Y0, Z0]], [-1, 0, 0], [X0, Y1, Z0], [0, 0, 1], [0, -1, 0], d, h);
        add('right', [[X1, Y1, Z1], [X1, Y1, Z0], [X1, Y0, Z0], [X1, Y0, Z1]], [1, 0, 0], [X1, Y1, Z1], [0, 0, -1], [0, -1, 0], d, h);
        add('front', [[X0, Y1, Z1], [X1, Y1, Z1], [X1, Y0, Z1], [X0, Y0, Z1]], [0, 0, 1], [X0, Y1, Z1], [1, 0, 0], [0, -1, 0], w, h);
        add('bottom', [[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y0, Z0], [X0, Y0, Z0]], [0, -1, 0], [X0, Y0, Z1], [1, 0, 0], [0, 0, -1], w, d);
        add('top', [[X0, Y1, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [X0, Y1, Z1]], [0, 1, 0], [X0, Y1, Z0], [1, 0, 0], [0, 0, 1], w, d);
        return this;
      }
      // rounded vertical edges: a band of narrow faces around a rounded-rectangle plan
      const plan = rr2(X0, Z0, w, d, r, o.seg || 5); // in (x, z)
      const n = plan.length;
      const band = [];
      for (let i = 0; i < n; i++) {
        const a = plan[i], b = plan[(i + 1) % n];
        const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
        if (L < 1e-6) continue;
        const nn = [ez / L, 0, -ex / L];
        band.push({ a, b, nn, L });
      }
      // sides first: back-facing ones are culled when drawn
      for (const s of band) {
        const key = Math.abs(s.nn[2]) > 0.99 ? (s.nn[2] > 0 ? 'front' : 'back') : Math.abs(s.nn[0]) > 0.99 ? (s.nn[0] > 0 ? 'right' : 'left') : 'corner';
        if (skip.has(key)) continue;
        const pts = [[s.a[0], Y1, s.a[1]], [s.b[0], Y1, s.b[1]], [s.b[0], Y0, s.b[1]], [s.a[0], Y0, s.a[1]]];
        const U = [(s.b[0] - s.a[0]) / s.L, 0, (s.b[1] - s.a[1]) / s.L];
        let fo = [s.a[0], Y1, s.a[1]], fw = s.L, FU = U;
        if (key === 'front') { fo = [X0, Y1, Z1]; fw = w; FU = [1, 0, 0]; }
        if (key === 'right') { fo = [X1, Y1, Z1]; fw = d; FU = [0, 0, -1]; }
        if (key === 'left') { fo = [X0, Y1, Z0]; fw = d; FU = [0, 0, 1]; }
        if (key === 'back') { fo = [X1, Y1, Z0]; fw = w; FU = [-1, 0, 0]; }
        this.face(pts, s.nn, { o: fo, U: FU, V: [0, -1, 0], w: fw, h }, o.mats?.[key] || mat, { deco: key === 'corner' ? null : F[key], key, edge: key === 'corner' ? 0 : o.edge, seam: key === 'corner', hatch: 'v' });
      }
      if (!skip.has('top')) this.face(plan.map(([px, pz]) => [px, Y1, pz]), [0, 1, 0], { o: [X0, Y1, Z0], U: [1, 0, 0], V: [0, 0, 1], w, h: d }, o.mats?.top || mat, { deco: F.top, key: 'top', edge: o.edge });
      if (!skip.has('bottom')) this.face(plan.map(([px, pz]) => [px, Y0, pz]).reverse(), [0, -1, 0], { o: [X0, Y0, Z1], U: [1, 0, 0], V: [0, 0, -1], w, h: d }, o.mats?.bottom || mat, { deco: F.bottom, key: 'bottom', edge: o.edge });
      return this;
    }

    // A slab with a rounded-rectangle plan whose top slopes from height h at the back to hf at the front.
    wedge(x, y, z, w, h, hf, d, mat, o = {}) {
      const F = o.faces || {};
      const r = Math.min(o.r || 0.01, w / 2, d / 2);
      const top = (pz) => y + h + ((hf - h) * (pz - z)) / d;
      const plan = rr2(x, z, w, d, r, o.seg || 5);
      const n = plan.length;
      for (let i = 0; i < n; i++) {
        const a = plan[i], b = plan[(i + 1) % n];
        const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
        if (L < 1e-6) continue;
        const nn = [ez / L, 0, -ex / L];
        const front = nn[2] > 0.99;
        const pts = [[a[0], top(a[1]), a[1]], [b[0], top(b[1]), b[1]], [b[0], y, b[1]], [a[0], y, a[1]]];
        this.face(pts, nn, front ? { o: [x, y + hf, z + d], U: [1, 0, 0], V: [0, -1, 0], w, h: hf } : null, mat, { deco: front ? F.front : null, seam: !front && !(Math.abs(nn[0]) > 0.99), edge: front || Math.abs(nn[0]) > 0.99 ? o.edge : 0, hatch: 'v', key: front ? 'front' : 'side' });
      }
      const L = Math.hypot(d, hf - h);
      if ((o.skip || []).includes('top')) return this;
      this.face(plan.map(([px, pz]) => [px, top(pz), pz]), v3.norm([0, d, -(hf - h)]), { o: [x, y + h, z], U: [1, 0, 0], V: [0, (hf - h) / L, d / L], w, h: L }, o.mats?.top || mat, { deco: F.top, key: 'top', edge: o.edge });
      return this;
    }

    // A slab: a profile in the x-y plane (a phone's outline, a screen's) extruded from z0 to z1.
    slab(profile, z0, z1, mat, o = {}) {
      const F = o.faces || {};
      let cx = 0, cy = 0, x0 = Infinity, y1 = -Infinity;
      for (const [px, py] of profile) { cx += px; cy += py; x0 = Math.min(x0, px); y1 = Math.max(y1, py); }
      cx /= profile.length; cy /= profile.length;
      const n = profile.length;
      for (let i = 0; i < n; i++) {
        const a = profile[i], b = profile[(i + 1) % n];
        const ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey);
        if (L < 1e-6) continue;
        let nn = [ey / L, -ex / L, 0];
        if (((a[0] + b[0]) / 2 - cx) * nn[0] + ((a[1] + b[1]) / 2 - cy) * nn[1] < 0) nn = [-nn[0], -nn[1], 0];
        this.face([[a[0], a[1], z1], [b[0], b[1], z1], [b[0], b[1], z0], [a[0], a[1], z0]], nn, null, o.mats?.side || mat, { seam: true, edge: 0, hatch: 'axis', axis: [0, 0, 1] });
      }
      const skip = new Set(o.skip || []);
      if (!skip.has('front')) this.face(profile.map(([px, py]) => [px, py, z1]), [0, 0, 1], { o: [x0, y1, z1], U: [1, 0, 0], V: [0, -1, 0], w: 0, h: 0 }, o.mats?.front || mat, { deco: F.front, key: 'front', edge: o.edge });
      if (!skip.has('back')) this.face(profile.map(([px, py]) => [px, py, z0]).reverse(), [0, 0, -1], { o: [x0, y1, z0], U: [-1, 0, 0], V: [0, -1, 0], w: 0, h: 0 }, o.mats?.back || mat, { deco: F.back, key: 'back', edge: o.edge });
      return this;
    }

    // Extrude a side profile [[z, y], ...] (counter-clockwise seen from +x) from x0 to x1.
    // o.faces: { left, right, e0, e1, ... } where eN is the face swept by profile edge N.
    extrude(profile, x0, x1, mat, o = {}) {
      const F = o.faces || {};
      const n = profile.length;
      const skip = new Set(o.skip || []);
      for (let i = 0; i < n; i++) {
        const [za, ya] = profile[i], [zb, yb] = profile[(i + 1) % n];
        const L = Math.hypot(zb - za, yb - ya);
        if (L < 1e-6) continue;
        // outward normal of a CCW profile in the (z, y) plane, seen from +x
        const nn = v3.norm([0, (zb - za) / L, -(yb - ya) / L]);
        const key = 'e' + i;
        if (skip.has(key)) continue;
        const pts = [[x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb]];
        this.face(pts, [0, nn[1], nn[2]], { o: [x0, ya, za], U: [1, 0, 0], V: [0, (yb - ya) / L, (zb - za) / L], w: x1 - x0, h: L }, o.mats?.[key] || mat, { deco: F[key], key, edge: o.edge, hatch: o.hatch?.[key] });
      }
      // caps: profile drawn in (−z, −y) on the right so u runs front→back and v runs down
      let zmax = -Infinity, ymax = -Infinity;
      for (const [z, y] of profile) { zmax = Math.max(zmax, z); ymax = Math.max(ymax, y); }
      if (!skip.has('right')) this.face(profile.map(([z, y]) => [x1, y, z]), [1, 0, 0], { o: [x1, ymax, zmax], U: [0, 0, -1], V: [0, -1, 0], w: 0, h: 0 }, o.mats?.right || mat, { deco: F.right, key: 'right', edge: o.edge, hatch: o.hatch?.right || 'u' });
      if (!skip.has('left')) this.face(profile.map(([z, y]) => [x0, y, z]).reverse(), [-1, 0, 0], { o: [x0, ymax, 0], U: [0, 0, 1], V: [0, -1, 0], w: 0, h: 0 }, o.mats?.left || mat, { deco: F.left, key: 'left', edge: o.edge, hatch: o.hatch?.left || 'u' });
      return this;
    }

    // Loft between rounded-rectangle sections [{ z, cx, cy, w, h, r }] lying in x-y planes.
    loft(rings, mat, o = {}) {
      const seg = o.seg || 8;
      const R = rings.map((s) => rr2(s.cx - s.w / 2, s.cy - s.h / 2, s.w, s.h, s.r, seg).map(([x, y]) => [x, -y + 2 * s.cy, s.z]));
      const n = R[0].length;
      this.op((p, P, M) => M.drawLoft(p, R, mat, o), R.flat());
      return this;
    }

    // Cylinder between two centres with radius r; axis is 'x', 'y' or 'z'.
    cyl(c, r, len, axis, mat, o = {}) {
      const n = o.n || 18;
      const ring = (t) => {
        const pts = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * PI * 2;
          const u = r * cos(a), v = r * sin(a);
          if (axis === 'y') pts.push([c[0] + u, c[1] + t, c[2] + v]);
          else if (axis === 'x') pts.push([c[0] + t, c[1] + u, c[2] + v]);
          else pts.push([c[0] + u, c[1] + v, c[2] + t]);
        }
        return pts;
      };
      const A = ring(0), B = ring(len);
      const ax = axis === 'y' ? [0, 1, 0] : axis === 'x' ? [1, 0, 0] : [0, 0, 1];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const mid = v3.mul(v3.add(v3.sub(A[i], c), v3.sub(A[j], c)), 0.5);
        const nn = v3.norm(v3.sub(mid, v3.mul(ax, v3.dot(mid, ax))));
        this.face([A[i], A[j], B[j], B[i]], nn, null, mat, { edge: 0, seam: true, hatch: 'axis', axis: ax });
      }
      // the end cap's own axes are centred, so decorations are drawn about (0, 0)
      const capU = axis === 'x' ? [0, 0, -1] : [1, 0, 0], capV = axis === 'y' ? [0, 0, 1] : [0, -1, 0];
      this.face(B.slice(), ax, { o: v3.add(c, v3.mul(ax, len)), U: capU, V: capV, w: 0, h: 0 }, o.capMat || mat, { deco: o.cap, edge: o.edge ?? 1 });
      this.face(A.slice().reverse(), v3.mul(ax, -1), null, o.capMat || mat, { edge: o.edge ?? 1 });
      return this;
    }

    // A flat polygon (two-sided) given in 3D.
    flat(pts, mat, o = {}) {
      const a = v3.sub(pts[1], pts[0]), b = v3.sub(pts[pts.length - 1], pts[0]);
      let nn = o.n || v3.norm(v3.cross(b, a));
      this.face(pts, nn, o.frame || { o: pts[0], U: v3.norm(a), V: v3.norm(b), w: v3.len(a), h: v3.len(b) }, mat, { deco: o.deco, twoSided: !o.n, edge: o.edge });
      return this;
    }

    // A tube along a 3D path, drawn as an ink gouge (cables, cords).
    cable(pts3, w, o = {}) {
      pts3 = pts3.map((q) => this.xp(q));
      this.op((p, P) => {
        const pts = pts3.map(P);
        p.gouge('ink', pts, w * (o.k || 1), { taper: o.taper ?? 0.5, seg: 4 });
        if (o.core) p.gouge(o.core, pts, w * 0.5 * (o.k || 1), { taper: o.taper ?? 0.5, seg: 4 });
      }, pts3);
      return this;
    }

    // Name a rectangle on a face (in that face's units) for transitions: a portal, a chip to focus on.
    mark(name, F, u, v, w, h) {
      this.marks[name] = Af.mul(F.M, [w, 0, 0, h, u, v]);
    }

    // ---------- rendering ----------
    // Fit the projected model into the 1000 × 1000 frame and engrave each part into its own plate.
    render(seed) {
      const pts = [];
      for (const part of this.parts) for (const op of part.ops) if (op.fit !== false) for (const q of op.pts) pts.push(this.cam(q));
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const s = Math.min(this.fitBox[0] / (x1 - x0), this.fitBox[1] / (y1 - y0));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      this.s = s;
      const [fx, fy] = this.fitCenter;
      const P = (q) => {
        const c = this.cam(q);
        return [fx + (c[0] - cx) * s, fy + (c[1] - cy) * s];
      };
      const PL = (vec) => {
        const c = this.cam(vec);
        return [c[0] * s, c[1] * s];
      };
      this.P = P;
      this.PL = PL;
      this.depthOf = (q) => this.cam(q)[2];
      let k = 0;
      for (const part of this.parts) {
        const p = new Plate(seed + 97 * k++);
        part.plate = p;
        for (const op of part.ops) {
          if (op.kind === 'op') op.fn(p, P, this);
          else this.drawFace(p, op);
        }
        if (p.finish) p.finish();
        // centroid of the part on the page, for assembly flights
        const pp = part.ops.flatMap((op) => op.pts).map(P);
        if (pp.length) part.c = [pp.reduce((a, q) => a + q[0], 0) / pp.length, pp.reduce((a, q) => a + q[1], 0) / pp.length];
        else part.c = [500, 500];
      }
    }

    tone(n, mat) {
      const ndl = Math.max(0, v3.dot(n, LIGHT));
      // wide range of light, so turned-away faces go properly dark, as in a print
      return clamp((mat.base ?? 0.9) * (0.47 + 0.53 * ndl) + (mat.lift || 0), 0, 1);
    }

    drawFace(p, f) {
      const cn = this.cam(f.n);
      // cam() flips y, so a face toward the viewer has positive z
      if (cn[2] <= 0.02 && !f.twoSided) return;
      const pts = f.pts.map(this.P);
      const mat = f.mat || {};
      const t0 = this.tone(f.n, mat);
      let dir;
      if (f.hatch === 'axis' && f.axis) dir = this.PL(f.axis);
      else if (f.frame) dir = this.PL(f.hatch === 'v' ? f.frame.V : f.frame.U);
      else dir = [1, 0];
      if (typeof f.hatch === 'number') dir = [cos(f.hatch), sin(f.hatch)];
      const angle = atan2(dir[1], dir[0]);
      let cx = 0, cy = 0;
      for (const q of pts) { cx += q[0]; cy += q[1]; }
      cx /= pts.length; cy /= pts.length;
      let ext = 30;
      for (const q of pts) ext = Math.max(ext, Math.hypot(q[0] - cx, q[1] - cy));
      // light across the page, and up, as screen directions
      const l3 = this.cam(LIGHT), up3 = this.cam([0, 1, 0]);
      const ll = Math.hypot(l3[0], l3[1]) || 1, ul = Math.hypot(up3[0], up3[1]) || 1;
      const Lx = l3[0] / ll, Ly = l3[1] / ll, Ux = up3[0] / ul, Uy = up3[1] / ul;
      const vertical = Math.abs(f.n[1]) < 0.35;
      // Each face brightens toward the light, darkens toward its foot (light trapped where it meets
      // what it stands on), and polished metal carries a soft band of reflection.
      const tone = (x, y) => {
        const dx = (x - cx) / ext, dy = (y - cy) / ext;
        let t = t0 + 0.2 * (dx * Lx + dy * Ly);
        if (vertical) t -= 0.16 * Math.pow(clamp((1 - (dx * Ux + dy * Uy)) / 2, 0, 1), 1.6);
        if (mat.sheen) {
          const s = dx * -Ly + dy * Lx;
          t += mat.sheen * Math.exp(-Math.pow((s + 0.2) / 0.28, 2));
        }
        return clamp(t, 0, 1);
      };
      if (!mat.none) {
        p.face(pts, tone, {
          fill: mat.fill,
          dark: mat.dark,
          angle,
          gap: mat.gap ?? 7,
          w: mat.w ?? 1.9,
          hatch: mat.hatch,
          shade: mat.shade,
          pencil: f.seam ? false : mat.pencil,
          edge: f.edge === 0 || f.seam ? 0 : f.edge ?? mat.edge ?? 1.1,
        });
      }
      // edges: a fine bright line where an edge turns toward the light, a dark one where it turns away
      if (!f.seam && f.edge !== 0 && !mat.none && pts.length >= 3) {
        const l3 = this.cam(LIGHT), ll = Math.hypot(l3[0], l3[1]) || 1;
        const Lx = l3[0] / ll, Ly = l3[1] / ll;
        const dark = t0 < 0.45 || mat.dark;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          const ex = b[0] - a[0], ey = b[1] - a[1], len = Math.hypot(ex, ey);
          if (len < 10) continue;
          let nx = ey / len, ny = -ex / len;
          const mx = (a[0] + b[0]) / 2 - cx, my = (a[1] + b[1]) / 2 - cy;
          if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
          const lit = nx * Lx + ny * Ly;
          const ux = ex / len, uy = ey / len, trim = Math.min(4, len * 0.15), inset = 1.8;
          const A = [a[0] + ux * trim - nx * inset, a[1] + uy * trim - ny * inset];
          const B = [b[0] - ux * trim - nx * inset, b[1] - uy * trim - ny * inset];
          if (lit > 0.25) p.gouge(dark ? 'paper' : 'light', [A, B], (dark ? 1.6 : 2.2) * lit, { smooth: false, taper: 0.12, lod: 0.5 });
          else if (lit < -0.3 && !dark) p.gouge('ink', [A, B], 1.3 * -lit, { smooth: false, taper: 0.12, lod: 0.5 });
        }
      }
      if (f.deco && f.frame) {
        const { o, U, V } = f.frame;
        const po = this.P(o), pu = this.PL(U), pv = this.PL(V);
        const F = { M: [pu[0], pu[1], pv[0], pv[1], po[0], po[1]], w: f.frame.w, h: f.frame.h, tone: t0, k: this.s, model: this, p };
        F.draw = (fn) => p.withM(F.M, () => fn(p, F));
        F.px = (n) => n / this.s;
        f.deco(F);
      }
    }

    // A lofted surface: quads shaded flat, with contour gouges along the sections like an engraver's cuts.
    drawLoft(p, R, mat, o) {
      const n = R[0].length;
      const quads = [];
      for (let k = 0; k < R.length - 1; k++) for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const q = [R[k][i], R[k][j], R[k + 1][j], R[k + 1][i]];
        let nn = v3.norm(v3.cross(v3.sub(q[2], q[0]), v3.sub(q[1], q[3])));
        // point outward, away from the section's centre
        const mid = v3.mul(v3.add(v3.add(q[0], q[1]), v3.add(q[2], q[3])), 0.25);
        const ctr = R[k].reduce((a, b) => v3.add(a, b), [0, 0, 0]).map((x) => x / n);
        const out = v3.sub(mid, ctr);
        out[2] = 0;
        if (v3.dot(nn, out) < 0) nn = v3.mul(nn, -1);
        quads.push({ q, nn, k, i });
      }
      const m0 = this.P(R[0][0]), m1 = this.P(R[R.length - 1][0]);
      const loftAngle = atan2(m1[1] - m0[1], m1[0] - m0[0]);
      // far quads first
      const vis = quads.filter((Q) => this.cam(Q.nn)[2] > -0.05);
      vis.sort((A, B) => this.depthOf(A.q[0]) - this.depthOf(B.q[0]));
      for (const Q of vis) {
        const pts = Q.q.map(this.P);
        const c = v3.mul(v3.add(v3.add(Q.q[0], Q.q[1]), v3.add(Q.q[2], Q.q[3])), 0.25);
        const qm = (o.matAt && o.matAt(c)) || mat;
        const t = this.tone(Q.nn, qm);
        Q.t = t;
        Q.m = qm;
        // each quad is crayoned with the strokes running down the loft, so they carry on from quad to quad
        p.face(pts, t, { fill: qm.fill, dark: qm.dark, angle: loftAngle, edge: 0, pencil: false });
      }
      // contour lines: along each section and each meridian, weighted by darkness
      for (const Q of vis) {
        const qm = Q.m;
        const lineRole = qm.dark ? 'paper' : 'ink';
        const a = this.P(Q.q[0]), b = this.P(Q.q[1]), d = this.P(Q.q[3]);
        const w = (qm.w ?? 2) * (qm.dark ? clamp(Q.t / 0.45, 0, 1) : Math.pow(clamp((1 - Q.t) / 0.6, 0, 1), 1.2));
        if (w > 0.3 && Q.k % (o.every || 1) === 0) p.gouge(lineRole, [a, b], w, { smooth: false, taper: 0.25, lod: 1 });
        if (o.meridians && w > 0.3 && Q.i % o.meridians === 0) p.gouge(lineRole, [a, d], w * 0.7, { smooth: false, taper: 0.25, lod: 1 });
      }
      if (o.pencil !== false) {
        // silhouette in pencil: the outline of the visible sections
        for (const k of [0, R.length - 1]) p.sketch(R[k].map(this.P), { lod: 0.5 });
      }
    }
  }

  global.Af = Af;
  global.V3 = v3;
  global.Model = Model;
  global.Shapes = { rr2, ell2 };
})(window);
