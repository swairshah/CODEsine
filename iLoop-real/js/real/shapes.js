// shapes.js: geometry for machines. Millimetres, y up, the front of a machine faces +z.
// Real.G holds the builders. Nothing here is a raw box: edges are bevelled or rounded, because a
// sharp 90° edge is the quickest way to make a render look like a render. Shared by every machine.
// Machine files must not edit this file.
'use strict';

(function (global) {
  const T = global.THREE;
  const Real = global.Real;
  const BGU = T.BufferGeometryUtils;

  // a rounded rectangle as a closed path, centred on (cx, cy)
  function rrectPts(w, h, r, cx = 0, cy = 0, seg = 8) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const pts = [];
    const corner = (x, y, a0) => {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        pts.push(new T.Vector2(x + r * Math.cos(a), y + r * Math.sin(a)));
      }
    };
    corner(cx + w / 2 - r, cy - h / 2 + r, -Math.PI / 2);
    corner(cx + w / 2 - r, cy + h / 2 - r, 0);
    corner(cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2);
    corner(cx - w / 2 + r, cy - h / 2 + r, Math.PI);
    return pts;
  }
  const rrect = (w, h, r, cx, cy, seg) => new T.Shape(rrectPts(w, h, r, cx, cy, seg));
  const rrectHole = (w, h, r, cx, cy, seg) => new T.Path(rrectPts(w, h, r, cx, cy, seg).reverse());
  const circlePts = (r, cx = 0, cy = 0, n = 48) => Array.from({ length: n }, (_, i) => new T.Vector2(cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)));
  const circleHole = (r, cx, cy, n) => new T.Path(circlePts(r, cx, cy, n).reverse());

  // Extrude a 2D shape (in x, y) through depth d along +z, with a rounded bevel of radius b that
  // stays inside the outline, so the finished part is exactly the shape's size and d thick.
  // The result spans z = 0 … d.
  function extrude(shape, d, b = 1, o = {}) {
    b = Math.min(b, d / 2 - 0.01);
    const g = new T.ExtrudeGeometry(shape, {
      depth: Math.max(0.01, d - 2 * b),
      bevelEnabled: b > 0,
      bevelThickness: b,
      bevelSize: b,
      bevelOffset: -b,
      bevelSegments: o.bevelSeg ?? 5,
      curveSegments: o.curveSeg ?? 12,
    });
    g.translate(0, 0, b);
    return g;
  }

  // A side profile, given as [z, y] points (counter-clockwise when seen from +x), extruded across
  // the width w along x and centred on x = 0, with rounded edges of radius b all round.
  function profile(pts, w, b = 3, o = {}) {
    const s = new T.Shape(pts.map(([z, y]) => new T.Vector2(z, y)));
    (o.holes || []).forEach((h) => s.holes.push(h));
    const g = extrude(s, w, b, o);
    // shape x is the depth (z), extrusion runs along x
    g.rotateY(-Math.PI / 2);
    g.translate(w / 2, 0, 0);
    return g;
  }

  // a plate: a rounded rectangle w × h (x × y) and d thick along z, centred, edges rounded by b
  const plate = (w, h, d, r, b = 0.6, o = {}) => {
    const s = rrect(w, h, r);
    (o.holes || []).forEach((hh) => s.holes.push(hh));
    const g = extrude(s, d, b, o);
    g.translate(0, 0, -d / 2);
    return g;
  };
  // the same lying flat: w along x, d along z, h tall along y, sitting on y = 0
  const slab = (w, d, h, r, b = 0.6, o = {}) => {
    const g = plate(w, d, h, r, b, o);
    g.rotateX(-Math.PI / 2);
    g.translate(0, h / 2, 0);
    return g;
  };

  // a box with every edge rounded by r, centred
  const rbox = (w, h, d, r = 1, seg = 4) => new T.RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));

  // a lathe from [r, y] pairs, about the y axis
  const lathe = (pts, n = 48) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(Math.max(0, r), y)), n);
  // a cylinder along y, on y = 0 … h, with its top and bottom edges rounded by e
  function cyl(r, h, e = 0.3, n = 48) {
    const pts = [[0, 0]];
    const arc = (cx, cy, a0, a1) => {
      for (let i = 0; i <= 6; i++) {
        const a = a0 + ((a1 - a0) * i) / 6;
        pts.push([cx + e * Math.cos(a), cy + e * Math.sin(a)]);
      }
    };
    arc(r - e, e, -Math.PI / 2, 0);
    arc(r - e, h - e, 0, Math.PI / 2);
    pts.push([0, h]);
    return lathe(pts, n);
  }

  // A loft through rounded rectangles: sections [{ w, d, r, y, x?, z? }] stacked along y.
  // Caps the bottom and top. Good for keycaps, feet, tapering housings.
  function loftRR(sections, o = {}) {
    const seg = o.seg ?? 5;
    const secs = sections.map((s) => rrectPts(s.w, s.d, s.r, s.x || 0, s.z || 0, seg).map((p) => new T.Vector3(p.x, s.y, p.y)));
    // the loft wants counter-clockwise sections seen from the end (from +y looking down -y is
    // clockwise in x,z), so reverse
    secs.forEach((s) => s.reverse());
    const g = new T.LoftGeometry(secs, { closed: true, capStart: o.capStart ?? true, capEnd: o.capEnd ?? true });
    // as a plain geometry, so it can be cloned (a LoftGeometry cannot be rebuilt without arguments)
    return new T.BufferGeometry().copy(g);
  }

  // A tube along a smooth path through points (cables, cords).
  function tube(points, r, o = {}) {
    const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)), false, 'catmullrom', 0.5);
    return new T.TubeGeometry(curve, o.seg ?? Math.max(16, points.length * 12), r, o.radial ?? 10, false);
  }
  // A coiled cord from a to b: a helix of n turns, radius R, wire radius r.
  function coil(a, b, n, R, r) {
    const A = new T.Vector3(...a), B = new T.Vector3(...b);
    const axis = B.clone().sub(A);
    const len = axis.length();
    axis.normalize();
    const u = new T.Vector3(0, 1, 0);
    if (Math.abs(u.dot(axis)) > 0.9) u.set(1, 0, 0);
    const v1 = u.clone().cross(axis).normalize(), v2 = axis.clone().cross(v1).normalize();
    const pts = [];
    const N = Math.round(n * 16);
    for (let i = 0; i <= N; i++) {
      const t = i / N, ang = t * n * Math.PI * 2;
      const fade = Math.min(1, t * 8, (1 - t) * 8);
      pts.push(A.clone().addScaledVector(axis, t * len).addScaledVector(v1, Math.cos(ang) * R * fade).addScaledVector(v2, Math.sin(ang) * R * fade));
    }
    return new T.TubeGeometry(new T.CatmullRomCurve3(pts), N * 2, r, 8, false);
  }

  // A plane w × h (x × y), facing +z, subdivided so it can bend: bulge b mm at its centre (a CRT's
  // face). Its uv runs 0…1 left to right and bottom to top.
  function bulgePlane(w, h, b = 0, sx = 48, sy = 36) {
    const g = new T.PlaneGeometry(w, h, sx, sy);
    g.userData.flat = Float32Array.from(g.attributes.position.array);
    g.userData.w = w;
    g.userData.h = h;
    setBulge(g, b);
    return g;
  }
  function setBulge(g, b) {
    if (g.userData.bulge === b) return;
    g.userData.bulge = b;
    const p = g.attributes.position, f = g.userData.flat, hw = g.userData.w / 2, hh = g.userData.h / 2;
    for (let i = 0; i < p.count; i++) {
      const x = f[i * 3] / hw, y = f[i * 3 + 1] / hh;
      p.setZ(i, b * (1 - (x * x + y * y) / 2));
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  }

  // Give the triangles of a geometry different materials: fn(centroid) returns the material index
  // for each triangle. Use with an array of materials on the mesh.
  function splitGroups(geo, fn) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const names = Object.keys(g.attributes);
    const pos = g.attributes.position;
    const n = pos.count / 3;
    const c = new T.Vector3();
    const tris = [];
    for (let i = 0; i < n; i++) {
      c.set(0, 0, 0);
      for (let k = 0; k < 3; k++) c.x += pos.getX(i * 3 + k) / 3, c.y += pos.getY(i * 3 + k) / 3, c.z += pos.getZ(i * 3 + k) / 3;
      tris.push([fn(c), i]);
    }
    tris.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const out = new T.BufferGeometry();
    for (const nm of names) {
      const a = g.attributes[nm], sz = a.itemSize, arr = new Float32Array(a.array.length);
      tris.forEach(([, i], j) => { for (let k = 0; k < 3 * sz; k++) arr[j * 3 * sz + k] = a.array[i * 3 * sz + k]; });
      out.setAttribute(nm, new T.BufferAttribute(arr, sz));
    }
    let start = 0;
    while (start < tris.length) {
      let end = start;
      while (end < tris.length && tris[end][0] === tris[start][0]) end++;
      out.addGroup(start * 3, (end - start) * 3, tris[start][0]);
      start = end;
    }
    return out;
  }

  // Merge geometries (mixing indexed and not), keeping position, normal and uv.
  function merge(geos) {
    const list = geos.map((g) => {
      let q = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k);
      if (!q.attributes.uv) q.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2));
      return q;
    });
    return BGU.mergeGeometries(list, false);
  }
  // smooth the normals of a deformed geometry across its seams
  function smoothNormals(g, tol = 1e-3) {
    const h = g.index ? g : g;
    for (const k of Object.keys(h.attributes)) if (k !== 'position') h.deleteAttribute(k);
    const m = BGU.mergeVertices(h, tol);
    m.computeVertexNormals();
    return m;
  }

  // A mesh, casting and taking shadows, placed by o.pos ([x, y, z]), o.rot (degrees, XYZ) and o.scale.
  function mesh(geo, mat, o = {}) {
    const m = new T.Mesh(geo, mat);
    m.castShadow = o.cast ?? true;
    m.receiveShadow = o.receive ?? true;
    place(m, o);
    if (o.name) m.name = o.name;
    if (o.to) o.to.add(m);
    return m;
  }
  function place(obj, o = {}) {
    if (o.pos) obj.position.set(...o.pos);
    if (o.rot) obj.rotation.set(...o.rot.map((d) => (d * Math.PI) / 180), o.order || 'XYZ');
    if (o.scale) typeof o.scale === 'number' ? obj.scale.setScalar(o.scale) : obj.scale.set(...o.scale);
    return obj;
  }
  function group(o = {}) {
    const g = place(new T.Group(), o);
    if (o.name) g.name = o.name;
    if (o.to) o.to.add(g);
    return g;
  }

  Real.G = { splitGroups, rrectPts, rrect, rrectHole, circlePts, circleHole, extrude, profile, plate, slab, rbox, lathe, cyl, loftRR, tube, coil, bulgePlane, setBulge, merge, smoothNormals, mesh, place, group };
})(window);
