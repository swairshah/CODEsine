// details.js: the small things that make a machine read as real: printed labels and decals, the
// Apple logo, keyboards with sculpted keycaps and their legends, screws, rubber feet, vent slots.
// Real.D holds them. Shared by every machine. Machine files must not edit this file.
'use strict';

(function (global) {
  const T = global.THREE;
  const Real = global.Real;
  const { G, Mat } = Real;

  // The logo's outline from the standard vector drawing of it (814 × 1000, y down).
  const APPLE_PATH = 'M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z';
  const RAINBOW = ['#61bb46', '#fdb827', '#f5821f', '#e03a3e', '#963d97', '#009ddc'];

  // Draw the logo into a 2D context, height h, centred on (x, y). o.color or o.rainbow.
  function drawApple(ctx, x, y, h, o = {}) {
    const k = h / 1000;
    ctx.save();
    ctx.translate(x - 407 * k, y - 500 * k);
    ctx.scale(k, k);
    const p = new Path2D(APPLE_PATH);
    if (o.rainbow) {
      ctx.save();
      ctx.clip(p);
      // the six bands of the 1977 logo, top to bottom, with the leaf in the green
      const band = 755 / 6;
      RAINBOW.forEach((c, i) => {
        ctx.fillStyle = c;
        const y0 = i === 0 ? -20 : 245 + i * band, y1 = i === 5 ? 1020 : 245 + (i + 1) * band;
        ctx.fillRect(-20, y0, 860, y1 - y0 + 0.8);
      });
      ctx.restore();
    } else {
      ctx.fillStyle = o.color || '#000';
      ctx.fill(p);
    }
    ctx.restore();
  }

  // The logo as 3D shapes (body and leaf) of height h, centred, y up, for extruding.
  let appleShapes = null;
  function appleShape(h) {
    if (!appleShapes) {
      const svg = new T.SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${APPLE_PATH}"/></svg>`);
      appleShapes = [];
      for (const p of svg.paths) appleShapes.push(...p.toShapes(true));
    }
    const k = h / 1000;
    return appleShapes.map((s) => {
      const pts = s.getPoints(24).map((p) => new T.Vector2((p.x - 407) * k, -(p.y - 500) * k));
      return new T.Shape(pts);
    });
  }
  // a raised (or inlaid) logo: extruded depth d, bevel b, facing +z, centred at the origin
  function appleLogo(h, d, mat, b = 0.1) {
    const geos = appleShape(h).map((s) => G.extrude(s, d, b, { curveSeg: 4, bevelSeg: 2 }));
    return G.mesh(G.merge(geos), mat, { cast: false });
  }

  // A decal: a printed plane w × h mm facing +z, drawn by draw(ctx, W, H) at ppm pixels per mm.
  // It sits a hair in front of the surface it is laid on. o.rough/o.metal/o.clearcoat as printed.
  function decal(w, h, draw, o = {}) {
    const ppm = o.ppm ?? 14;
    const W = Math.min(2048, Math.max(16, Math.round(w * ppm))), H = Math.min(2048, Math.max(16, Math.round(h * ppm)));
    const mat = Mat.printed((g) => {
      g.save();
      g.scale(W / w, H / h);
      draw(g, w, h);
      g.restore();
    }, { w: W, h: H, alpha: true, decal: true, rough: o.rough ?? 0.45, metal: o.metal ?? 0, clearcoat: o.clearcoat ?? 0 });
    const m = G.mesh(new T.PlaneGeometry(w, h), mat, { cast: false, ...o });
    m.renderOrder = 1;
    return m;
  }
  // a line of printed text, size = cap height in mm; returns a decal sized to the text
  function label(text, size, o = {}) {
    const font = o.font || '"Helvetica Neue", Helvetica, Arial, sans-serif';
    const weight = o.weight || 500;
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = `${weight} 100px ${font}`;
    if (o.track) meas.letterSpacing = `${o.track * 100}px`;
    const w = (meas.measureText(text).width / 100) * size * 1.38 + size * 0.4;
    const h = size * 1.9;
    const m = decal(w, h, (g) => {
      g.font = `${o.italic ? 'italic ' : ''}${weight} ${size * 1.38}px ${font}`;
      if (o.track && 'letterSpacing' in g) g.letterSpacing = `${o.track * size * 1.38}px`;
      g.fillStyle = o.color || '#222';
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      g.fillText(text, w / 2, h / 2 + size * 0.05);
    }, o);
    m.userData.w = w;
    return m;
  }

  // ---------- keyboards ----------
  // rows: arrays of keys; a key is 'Q', [w, 'Tab'], or { w, l, l2, color, ink, align }.
  // o.pitch: key pitch (19.05 mm); o.cap: { h, top, r, lip }; o.color, o.ink: cap and legend colours;
  // o.font, o.size: legend font and cap height in mm; o.align: 'tl' | 'c' | 'bl' | 'tc'.
  // o.flat: chiclet keys (a modern laptop) rather than sculpted ones.
  // Returns a Group centred on x and z, keys standing on y = 0; .w and .d are its size.
  const capCache = new Map();
  function capGeometry(wmm, dmm, o) {
    const key = `${wmm.toFixed(2)}x${dmm.toFixed(2)}:${JSON.stringify(o)}`;
    if (capCache.has(key)) return capCache.get(key);
    const h = o.h, ins = o.inset ?? 2.6, e = Math.min(o.fillet ?? 1.4, h * 0.4);
    const wt = wmm - 2 * ins, dt = dmm - 2 * ins;
    const secs = [{ w: wmm, d: dmm, r: o.r ?? 1.2, y: 0 }];
    if (!o.flat) secs.push({ w: wmm - ins * 0.55, d: dmm - ins * 0.55, r: (o.r ?? 1.2) + 0.4, y: h * 0.45 });
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * (Math.PI / 2);
      secs.push({ w: wt - 2 * e + 2 * e * Math.cos(a), d: dt - 2 * e + 2 * e * Math.cos(a), r: Math.max(0.3, (o.topR ?? 2.2) - e + e * Math.cos(a)), y: h - e + e * Math.sin(a) });
    }
    const g = G.loftRR(secs, { seg: 4, capStart: false });
    g.computeVertexNormals();
    capCache.set(key, g);
    return g;
  }
  function keyboard(rows, o = {}) {
    const P = o.pitch ?? 19.05, RP = o.rowPitch ?? P, gap = o.gap ?? 0.9;
    const cap = Object.assign({ h: 8, inset: 2.6, r: 1.2, topR: 2.2, fillet: 1.4 }, o.cap || {});
    const keys = [];
    rows.forEach((row, ri) => {
      let x = (o.indent && o.indent[ri]) || 0;
      for (const k0 of row) {
        const k = typeof k0 === 'string' ? { w: 1, l: k0 } : Array.isArray(k0) ? { w: k0[0], l: k0[1], ...(k0[2] || {}) } : k0;
        if (k.gap) { x += k.gap; continue; }
        keys.push({ ...k, x: x + (k.w * P) / 2, z: ri * RP + RP / 2, row: ri, h: k.h ?? 1 });
        x += k.w * P;
      }
    });
    const wTot = Math.max(...keys.map((k) => k.x + (k.w * P) / 2)), dTot = rows.length * RP;
    // the legend atlas: one cell per key, the cap colour all over, the legend printed in the middle
    // (2048 square for a full keyboard: about 15 texels per mm of keycap, so legends stay crisp in
    // a close-up and their mipmaps keep their contrast from the rest view)
    const cells = Math.ceil(Math.sqrt(keys.length));
    const AT = keys.length > 30 ? 2048 : 1024;
    const CS = AT / cells;
    const font = o.font || '"Helvetica Neue", Helvetica, Arial, sans-serif';
    const tex = Mat.canvasTexture((g) => {
      keys.forEach((k, i) => {
        const cx = (i % cells) * CS, cy = Math.floor(i / cells) * CS;
        const wmm = k.w * P - gap, dmm = k.h * RP - gap;
        g.fillStyle = k.color || o.color || '#d8d0bb';
        g.fillRect(cx, cy, CS, CS);
        if (!k.l && !k.l2) return;
        g.save();
        g.beginPath();
        g.rect(cx, cy, CS, CS);
        g.clip();
        // the cell is stretched over the key: draw in millimetres
        g.translate(cx, cy);
        g.scale(CS / wmm, CS / dmm);
        const ins = cap.inset + (o.legendInset ?? 1.2);
        const sz = k.size || o.size || 2.2;
        g.fillStyle = k.ink || o.ink || '#3d372e';
        g.font = `${k.weight || o.weight || 500} ${sz * 1.38}px ${k.font || font}`;
        const al = k.align || o.align || 'tl';
        g.textBaseline = 'alphabetic';
        if (al === 'c') { g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k.l, wmm / 2, dmm / 2 + sz * 0.08); }
        else if (al === 'tc') { g.textAlign = 'center'; if (k.l2) g.fillText(k.l2, wmm / 2, ins + sz); g.fillText(k.l, wmm / 2, k.l2 ? dmm - ins - sz * 0.2 : ins + sz); }
        else if (al === 'bl') { g.textAlign = 'left'; g.fillText(k.l, ins, dmm - ins - sz * 0.15); }
        else if (al === 'br') { g.textAlign = 'right'; g.fillText(k.l, wmm - ins, dmm - ins - sz * 0.15); }
        else if (al === 'tr') { g.textAlign = 'right'; g.fillText(k.l, wmm - ins, ins + sz); }
        else {
          g.textAlign = 'left';
          if (k.l2) { g.fillText(k.l2, ins, ins + sz); g.fillText(k.l, ins, dmm - ins - sz * 0.1); }
          else g.fillText(k.l, ins, ins + sz);
        }
        g.restore();
      });
    }, AT, AT);
    tex.anisotropy = Math.min(16, Real.renderer ? Real.renderer.capabilities.getMaxAnisotropy() : 8);
    const geos = keys.map((k, i) => {
      const wmm = k.w * P - gap, dmm = k.h * RP - gap;
      const g = capGeometry(wmm, dmm, cap).clone();
      // planar uvs from above into this key's cell
      const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
      const cx = (i % cells) / cells, cy = Math.floor(i / cells) / cells;
      for (let v = 0; v < pos.count; v++) {
        const u = Math.min(0.995, Math.max(0.005, 0.5 + pos.getX(v) / wmm)), w = Math.min(0.995, Math.max(0.005, 0.5 + pos.getZ(v) / dmm));
        uv[v * 2] = cx + u / cells;
        uv[v * 2 + 1] = 1 - (cy + w / cells);
      }
      g.setAttribute('uv', new T.BufferAttribute(uv, 2));
      const lift = o.rowLift ? o.rowLift[k.row] || 0 : 0, tilt = o.rowTilt ? o.rowTilt[k.row] || 0 : 0;
      if (tilt) g.rotateX((tilt * Math.PI) / 180);
      g.translate(k.x - wTot / 2, lift, k.z - dTot / 2 + (k.h - 1) * RP * 0.5);
      return g;
    });
    const mat = Mat.micro(new T.MeshPhysicalMaterial({ map: tex, roughness: o.rough ?? 0.5, metalness: 0, sheen: 0.2, sheenRoughness: 0.5 }), { size: 0.2, bump: o.flat ? 0.08 : 0.3, rough: 0.2 });
    const grp = new T.Group();
    grp.add(G.mesh(G.merge(geos), mat));
    grp.userData.w = wTot;
    grp.userData.d = dTot;
    grp.userData.keys = keys.map((k) => ({ ...k, x: k.x - wTot / 2, z: k.z - dTot / 2 }));
    return grp;
  }

  // a cross-head screw, head radius r, facing +z
  function screw(r, mat) {
    const g = G.lathe([[0, 0], [r, 0], [r, r * 0.12], [r * 0.85, r * 0.35], [r * 0.4, r * 0.48], [0, r * 0.5]], 20);
    g.rotateX(Math.PI / 2);
    const grp = new T.Group();
    grp.add(G.mesh(g, mat || Mat.steel({ rough: 0.35 }), { cast: false }));
    for (const a of [0, 90]) grp.add(G.mesh(G.rbox(r * 1.3, r * 0.22, r * 0.4, r * 0.08, 2), Mat.hole('#202020'), { pos: [0, 0, r * 0.42], rot: [0, 0, a], cast: false }));
    return grp;
  }
  // a rubber foot standing on y = 0
  function foot(r, h, color = '#2a2826') {
    return G.mesh(G.cyl(r, h, Math.min(r, h) * 0.45, 28), Mat.rubber(color));
  }
  // dark slots in a row (vents), as thin dark recess plates you lay over a face: n slots of
  // w × h mm, spaced by pitch along x. Facing +z.
  function slots(n, w, h, pitch, o = {}) {
    const geos = [];
    for (let i = 0; i < n; i++) {
      const g = G.plate(w, h, o.depth ?? 0.4, Math.min(w, h) / 2, 0.05);
      g.translate((i - (n - 1) / 2) * pitch, 0, 0);
      geos.push(g);
    }
    return G.mesh(G.merge(geos), Mat.hole(o.color || '#0b0b0b'), { cast: false });
  }

  // A dual in-line chip package lying on y = 0 with its pins along x: n pins (even), body colour
  // ('epoxy' black plastic, or 'ceramic' white with a gold lid), and its markings, line by line.
  // Pin pitch 2.54 mm, rows 15.24 mm apart for 28 pins and more, 7.62 mm below. Returns a Group
  // whose .userData.top is the y of its top face and .userData.w/.d its size; the body's long side
  // runs along x.
  function dip(n, o = {}) {
    const per = n / 2, wide = n >= 28;
    const L = per * 2.54 + 1.0, Wd = wide ? 13.9 : 6.4, h = o.ceramic ? 2.6 : 3.4, lift = 0.8;
    const grp = new T.Group();
    const body = o.ceramic ? Mat.ceramic(o.color || '#efede6') : Mat.epoxy(o.color || '#1c1c1d');
    grp.add(G.mesh(G.rbox(L, h, Wd, o.ceramic ? 0.35 : 0.6, 3), body, { pos: [0, lift + h / 2, 0] }));
    // the pins: a shoulder out of the body, then down through the board
    const pin = [];
    for (let i = 0; i < per; i++) for (const s of [-1, 1]) {
      const x = (i - (per - 1) / 2) * 2.54;
      const a = G.rbox(0.5, 0.25, 1.5, 0.08, 1);
      a.translate(x, lift + 0.9, s * (Wd / 2 + 0.6));
      const b = G.rbox(0.45, lift + 1.0, 0.25, 0.08, 1);
      b.translate(x, (lift + 1.0) / 2, s * (Wd / 2 + 1.25));
      pin.push(a, b);
    }
    grp.add(G.mesh(G.merge(pin), Mat.tin(), { cast: false }));
    const top = lift + h;
    if (o.ceramic) {
      // the gold lid over the die, and the dimple at pin 1
      grp.add(G.mesh(G.rbox(L * 0.28, 0.25, Wd * 0.6, 0.1, 2), Mat.gold(), { pos: [0, top + 0.1, 0], cast: false }));
    }
    const notch = G.mesh(G.cyl(0.9, 0.3, 0.1, 20), Mat.hole('#141414'), { pos: [-L / 2 + 1.4, top - 0.25, 0], cast: false });
    if (!o.ceramic) grp.add(notch);
    if (o.lines) {
      const lab = decal(o.ceramic ? L * 0.34 : L * 0.62, Wd * 0.8, (g, w, hh) => {
        g.fillStyle = o.ink || (o.ceramic ? '#2b2a28' : '#d8d6cf');
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        const lines = o.lines;
        const fs = Math.min(hh / (lines.length + 0.8), 2.1);
        lines.forEach((ln, i) => {
          g.font = `${i === 0 ? 600 : 500} ${fs}px "Helvetica Neue", Arial, sans-serif`;
          g.fillText(ln, 0.2, hh / 2 + (i - (lines.length - 1) / 2) * fs * 1.15);
        });
      }, { ppm: 40, rough: 0.6 });
      lab.rotation.x = -Math.PI / 2;
      lab.position.set(o.ceramic ? L * 0.31 : L * 0.08, top + 0.02, 0);
      grp.add(lab);
    }
    grp.userData = { top, w: L, d: Wd };
    return grp;
  }

  Real.D = { APPLE_PATH, RAINBOW, drawApple, appleShape, appleLogo, decal, label, keyboard, screw, foot, slots, dip };
})(window);
