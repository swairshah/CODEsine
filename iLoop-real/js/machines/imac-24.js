// imac-24.js: iMac 24″, 2021. Finished.
//
// The machine: 547 wide, 461 tall on its stand, and the display only 11.5 mm thick. The back and
// sides are anodised aluminium in a saturated colour (blue here), the chin a paler shade of it, and a
// single sheet of glass covers the front with the display set in white borders, the camera at the
// top. The stand is one bent blade of the same aluminium, slanting down from the back to a flat
// foot. In front: the colour-matched Magic Keyboard with Touch ID and the Magic Mouse.
//
// It is put together round its M1 (the same package the Apple M1 machine shows, cloned from it):
// the logic board lies as the M1 lay, then rises into the chin while the stand, the back and the
// front fly in; the seven colours run through the aluminium, and the screen says hello.
//
// The screen: 4.5K, drawn at 2240 × 1260 points: Big Sur's menu bar, Safari on apple.com at the
// MacBook Pro's page, and the Dock. The MacBook Pro in the page's hero image is the portal.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D } = Real;
  const { smooth, clamp } = Real.U;
  const OS = Real.MacOS;

  // the seven colours: [back and stand, chin and accessories], settling on blue
  const PAIRS = [
    ['#4f8a6b', '#c2d9ca'], // green
    ['#e3b74c', '#f3dfa4'], // yellow
    ['#e2733c', '#f2c3a3'], // orange
    ['#d47e7e', '#f1cac5'], // pink
    ['#8a76b8', '#d2c9e5'], // purple
    ['#c4c6c9', '#e4e5e7'], // silver
    ['#4a76a8', '#c3d5ea'], // blue
  ];
  const COLORS = PAIRS.map((p) => p[0]);
  const BLUE = PAIRS[6];

  const W = 547, CH = 82.6, GH = 318.8, BH = CH + GH, Y0 = 461 - BH, DEPTH = 11.5, R = 10;
  const SW = 521.6, SH = 293.4, BZ = (W - SW) / 2;
  const UIW = 2240, UIH = 1260;

  // ---------- the screen ----------
  const WIN = { x: 120, y: 62, w: 2000, h: 1082 };
  const HERO_Y = WIN.y + 52 + 44 + 52;
  const PH = 600, PW = PH * 1.75;
  const PORTAL = [WIN.x + WIN.w / 2 - PW / 2, HERO_Y + 236, PW, PH];

  let wall = null, still = null, mask = null, maskKey = '', helloBg = null;
  function paintDesktop(g) {
    if (!wall) {
      wall = document.createElement('canvas');
      wall.width = UIW;
      wall.height = UIH;
      OS.imacPetals(wall.getContext('2d'), UIW, UIH, ['#0b3a74', '#2f7fd2', '#a8d6ff']);
    }
    g.drawImage(wall, 0, 0);
    const { x, y, w, h } = WIN;
    OS.windowFrame(g, x, y, w, h);
    g.save();
    OS.rr(g, x, y, w, h, 10);
    g.clip();
    // Safari's toolbar
    g.fillStyle = '#f2f1f1';
    g.fillRect(x, y, w, 52);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(x, y + 52, w, 1);
    OS.lights(g, x + 22, y + 26);
    OS.symbol(g, 'sidebar', x + 96, y + 26, 18, '#6e6e73', 1.5);
    OS.symbol(g, 'chevL', x + 146, y + 26, 16, '#6e6e73', 1.8);
    OS.symbol(g, 'chevR', x + 178, y + 26, 16, '#c0c0c4', 1.8);
    OS.symbol(g, 'shield', x + 226, y + 26, 16, '#6e6e73', 1.4);
    const aw = 640;
    g.fillStyle = 'rgba(0,0,0,0.055)';
    OS.rr(g, x + w / 2 - aw / 2, y + 10, aw, 32, 8);
    g.fill();
    OS.symbol(g, 'lock', x + w / 2 - 44, y + 26, 12, '#3a3a3c', 1.4);
    OS.text(g, 'apple.com', x + w / 2 + 8, y + 26, 14, { align: 'center', color: '#1d1d1f' });
    OS.symbol(g, 'share', x + w - 130, y + 25, 17, '#6e6e73', 1.5);
    OS.symbol(g, 'plus', x + w - 86, y + 26, 15, '#6e6e73', 1.6);
    OS.symbol(g, 'tabs', x + w - 42, y + 26, 16, '#6e6e73', 1.5);
    // apple.com: the global navigation
    let yy = y + 53;
    g.fillStyle = '#1d1d1f';
    g.fillRect(x, yy, w, 44);
    const nav = ['', 'Store', 'Mac', 'iPad', 'iPhone', 'Watch', 'AirPods', 'TV & Home', 'Only on Apple', 'Accessories', 'Support', '⌕', '◻︎'];
    const nx0 = x + w / 2 - 490, step = 980 / (nav.length - 1);
    nav.forEach((t, i) => {
      const cx = nx0 + i * step;
      if (i === 0) OS.apple(g, cx, yy + 21, 17, 'rgba(255,255,255,0.86)');
      else if (t === '⌕') OS.symbol(g, 'search', cx, yy + 22, 14, 'rgba(255,255,255,0.86)', 1.4);
      else if (t === '◻︎') OS.symbol(g, 'bag', cx, yy + 22, 15, 'rgba(255,255,255,0.86)', 1.4);
      else OS.text(g, t, cx, yy + 22, 12, { align: 'center', color: 'rgba(255,255,255,0.86)' });
    });
    // the MacBook Pro's local navigation
    yy += 44;
    g.fillStyle = 'rgba(251,251,253,0.97)';
    g.fillRect(x, yy, w, 52);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(x, yy + 51, w, 1);
    OS.text(g, 'MacBook Pro', x + w / 2 - 490, yy + 26, 21, { weight: 600, font: OS.SFD });
    let rx = x + w / 2 + 490;
    g.fillStyle = '#0071e3';
    OS.rr(g, rx - 46, yy + 15, 46, 24, 12);
    g.fill();
    OS.text(g, 'Buy', rx - 23, yy + 27, 12, { align: 'center', color: '#fff', weight: 500 });
    rx -= 72;
    for (const t of ['Tech Specs', 'Why Mac', 'Overview']) {
      rx -= OS.text(g, t, rx, yy + 27, 12, { align: 'right', color: t === 'Overview' ? '#86868b' : '#1d1d1f' }) + 28;
    }
    // the hero: the same soft grey as the studio the MacBook Pro was photographed in
    yy += 52;
    g.fillStyle = OS.lin(g, 0, yy, 0, y + h, [[0, '#dcd9d4'], [0.3, '#e4e2dd'], [1, '#e6e4df']]);
    g.fillRect(x, yy, w, y + h - yy);
    OS.text(g, 'MacBook Pro', x + w / 2, yy + 62, 30, { align: 'center', weight: 600, font: OS.SFD });
    g.save();
    g.font = `700 76px ${OS.SFD}`;
    const hw = g.measureText('Supercharged for pros.').width;
    g.fillStyle = OS.lin(g, x + w / 2 - hw / 2, 0, x + w / 2 + hw / 2, 0, [[0, '#9b4ad6'], [0.55, '#5a5ce0'], [1, '#2a7be4']]);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Supercharged for pros.', x + w / 2, yy + 136);
    g.restore();
    OS.text(g, 'Learn more ›', x + w / 2 - 70, yy + 202, 21, { align: 'center', color: '#0066cc' });
    OS.text(g, 'Buy ›', x + w / 2 + 70, yy + 202, 21, { align: 'center', color: '#0066cc' });
    g.restore();
    // the Dock and the menu bar
    OS.dock(g, UIW, UIH, { size: 64, running: ['Finder', 'Safari', 'Messages', 'Music'], month: 'OCT', day: '26' });
    OS.menuBar(g, UIW, UIH, { app: 'Safari', menus: ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Window', 'Help'], clock: 'Tue 26 Oct  9:41 AM', right: ['siri', 'control', 'search', 'wifi'], height: 24 });
  }
  function desktop(g, s) {
    if (!still) {
      still = document.createElement('canvas');
      still.width = UIW;
      still.height = UIH;
      paintDesktop(still.getContext('2d'));
    }
    g.drawImage(still, 0, 0);
    // the hero image is the MacBook Pro itself: cut through, feathered into the page round the edge
    // of its picture
    const f = (s.display && s.display.state.frame) || [PORTAL[0] - 40, PORTAL[1] - 100, PW + 80, PH + 200];
    const key = f.map((v) => v.toFixed(1)).join(',');
    if (key !== maskKey) {
      mask = mask || document.createElement('canvas');
      mask.width = UIW;
      mask.height = UIH;
      const m = mask.getContext('2d');
      m.clearRect(0, 0, UIW, UIH);
      const x0 = Math.max(f[0], WIN.x + 1), x1 = Math.min(f[0] + f[2], WIN.x + WIN.w - 1);
      const y0 = Math.max(f[1], HERO_Y + 226), y1 = Math.min(f[1] + f[3], WIN.y + WIN.h - 1);
      const fe = 26;
      m.filter = `blur(${fe}px)`;
      m.fillStyle = '#000';
      m.fillRect(x0 + fe * 1.5, y0 + fe * 1.5, x1 - x0 - fe * 3, y1 - y0 - fe * 3);
      maskKey = key;
    }
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(mask, 0, 0);
    g.restore();
  }
  function screen(g, s) {
    const off = s.off ?? 0, hello = s.hello ?? 0, write = s.write ?? 0;
    if (hello <= 0 && off <= 0) return desktop(g, s);
    // off: dark glass; then hello, written in white on the iMac's own blue; then the desktop
    if (!helloBg) {
      helloBg = document.createElement('canvas');
      helloBg.width = UIW;
      helloBg.height = UIH;
      const h = helloBg.getContext('2d');
      h.fillStyle = OS.rad(h, UIW * 0.5, UIH * 0.45, 40, UIW * 0.7, [[0, '#4f95e6'], [0.55, '#2d6cc4'], [1, '#143f86']]);
      h.fillRect(0, 0, UIW, UIH);
    }
    // the screen as a mix of what it showed and the desktop arriving: hello × (1 − desk) plus the
    // desktop (with its hole) × desk, added, so the hole opens exactly as the desktop comes in
    const desk = s.desk ?? 0;
    const layer = screen.layer || (screen.layer = document.createElement('canvas'));
    layer.width = UIW;
    layer.height = UIH;
    const lg = layer.getContext('2d');
    lg.fillStyle = '#000';
    lg.fillRect(0, 0, UIW, UIH);
    if (hello > 0) {
      lg.globalAlpha = hello;
      lg.drawImage(helloBg, 0, 0);
      OS.hello(lg, UIW / 2, UIH / 2, 980, write, '#ffffff', 24);
      lg.globalAlpha = 1;
    }
    g.globalAlpha = 1 - desk;
    g.drawImage(layer, 0, 0);
    if (desk > 0) {
      lg.clearRect(0, 0, UIW, UIH);
      desktop(lg, s);
      g.globalAlpha = desk;
      g.globalCompositeOperation = 'lighter';
      g.drawImage(layer, 0, 0);
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  }

  // ---------- shapes ----------
  // a rectangle with its own radius at each corner [tl, tr, br, bl], centred on (cx, cy)
  function rect4(w, h, rs, cx = 0, cy = 0, seg = 10) {
    const [tl, tr, br, bl] = rs;
    const pts = [];
    const arc = (x, y, r, a0) => {
      if (r <= 0) { pts.push(new T.Vector2(x, y)); return; }
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        pts.push(new T.Vector2(x + r * Math.cos(a), y + r * Math.sin(a)));
      }
    };
    arc(cx + w / 2 - br, cy - h / 2 + br, br, -Math.PI / 2);
    arc(cx + w / 2 - tr, cy + h / 2 - tr, tr, 0);
    arc(cx - w / 2 + tl, cy + h / 2 - tl, tl, Math.PI / 2);
    arc(cx - w / 2 + bl, cy - h / 2 + bl, bl, Math.PI);
    return new T.Shape(pts);
  }
  // our own aluminium (not from the shared cache: its colour runs through the seven during assembly)
  // Anodising dyes the oxide, so a pale finish reads more like a satin paint than a mirror: less
  // metal in the pale shade than in the deep one.
  function ownAlu(color, rough, metal = 1) {
    return Mat.micro(new T.MeshPhysicalMaterial({ color: new T.Color(color), roughness: rough, metalness: metal }), { size: 0.05, bump: 0.12, rough: 0.2 });
  }
  // The M1, as the Apple M1 machine builds it: its whole package, cloned, with the focus mark found
  // again in the clone. Lying in its own frame: flat, facing up, the mark's y pointing away.
  function m1Package() {
    const spec = Real.list.find((s) => s.slug === 'apple-m1');
    if (!spec) return null;
    spec.build();
    const src = spec.M.root, mk = spec.M.marks.focus;
    if (!mk) return null;
    src.updateMatrixWorld(true);
    const path = [];
    for (let o = mk.object; o && o !== src; o = o.parent) path.unshift(o.parent.children.indexOf(o));
    const clone = src.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);
    let obj = clone;
    for (const i of path) obj = obj.children[i];
    const c = mk.object.localToWorld(mk.center.clone());
    clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { clone, obj, mark: mk, center: c };
  }

  Real.add({
    name: 'iMac 24″',
    era: 'bigsur',
    year: '2021',
    kind: 'All-in-one',
    line: 'Eleven and a half millimetres thin, seven colours, and the same M1 inside, tucked into the chin.',
    verb: 'Open the MacBook Pro on apple.com',
    view: { yaw: 22, pitch: 8, lens: 85, fill: 0.9 },
    set: { paper: '#dcdbd8', keyDir: [-0.45, 0.8, 0.65], keyI: 1.8, env: 1.2 },
    colors: COLORS,
    assembleBack: 0.5,
    next: { type: 'screen' },
    make(M) {
      const back = ownAlu(BLUE[0], 0.42, 0.85);
      const pale = ownAlu(BLUE[1], 0.52, 0.22);
      const logoMat = new T.MeshPhysicalMaterial({ color: new T.Color(BLUE[0]), roughness: 0.12, metalness: 1 });
      M.state.mats = { back, pale, logoMat };

      // ---------- the logic board, with the M1: it lies as the M1 lay, then rises into the chin ----------
      const boardY = Y0 + CH / 2 + 2, boardZ = -7.4;
      const bp = M.part('board', { fly: { from: [0, 0, 0], rot: [-90, 0, 0], at: [0.55, 0.8], show: true } });
      bp.position.set(0, boardY, boardZ);
      M.mesh(G.plate(300, 62, 1.2, 4, 0.3), Mat.plastic('#17201b', { rough: 0.5 }), { pos: [0, 0, -0.6] });
      // the board's printing and parts round the M1
      const pcb = Mat.printed((g, w, h) => {
        g.fillStyle = '#17211b';
        g.fillRect(0, 0, w, h);
        const k = w / 300;
        g.strokeStyle = 'rgba(70,96,80,0.55)';
        g.lineWidth = 0.25 * k;
        for (let i = 0; i < 90; i++) {
          const yy = (4 + ((i * 37) % 54)) * k, x0 = ((i * 53) % 280) * k;
          g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + (20 + (i % 7) * 9) * k, yy); g.lineTo(x0 + (24 + (i % 7) * 9) * k, yy + 4 * k); g.stroke();
        }
        g.fillStyle = 'rgba(230,230,224,0.8)';
        g.font = `500 ${1.6 * k}px "Helvetica Neue", Arial`;
        g.fillText('820-02095-A', 230 * k, 56 * k);
        g.fillText('U1000', 128 * k, 10 * k);
      }, { w: 2048, h: 424, rough: 0.5, clearcoat: 0.2 });
      M.mesh(new T.PlaneGeometry(299, 61), pcb, { pos: [0, 0, 0.01], cast: false });
      const caps = [];
      for (let i = 0; i < 90; i++) {
        const gm = G.rbox(1.6, 0.8, 0.7, 0.12, 1);
        const a = i * 2.39996, rr = 26 + (i % 9) * 6;
        let x = Math.cos(a) * rr * 2.4, y = Math.sin(a) * rr * 0.55;
        if (Math.abs(x) > 140) x = Math.sign(x) * (100 + (i % 5) * 8);
        gm.translate(x, clamp(y, -28, 28), 0.35);
        caps.push(gm);
      }
      M.mesh(G.merge(caps), Mat.ceramic('#9a8160'), { cast: false });
      // two fans, one at each end of the board
      for (const sx of [-1, 1]) {
        const fan = M.group({ pos: [sx * 190, 0, -1] });
        M.mesh(G.cyl(30, 1.2, 0.4, 48), Mat.plastic('#1c1c1e', { rough: 0.5 }), { to: fan, rot: [90, 0, 0] });
        const bl = [];
        for (let i = 0; i < 31; i++) { const gm = G.rbox(0.5, 4.6, 9, 0.15, 1); gm.rotateY(0.5); gm.translate(0, 0, 18); gm.rotateY((i / 31) * Math.PI * 2); bl.push(gm); }
        const blades = G.merge(bl);
        blades.rotateX(Math.PI / 2);
        M.mesh(blades, Mat.plastic('#2c2c2f', { rough: 0.45 }), { to: fan, pos: [0, 0, 3.6] });
        M.mesh(G.cyl(9, 6.4, 0.8, 32), Mat.plastic('#141416', { rough: 0.4 }), { to: fan, rot: [90, 0, 0] });
      }
      // the M1 itself: the Apple M1 machine's package, stood up on the board
      const pk = m1Package();
      if (pk) {
        const holder = M.group({ rot: [90, 0, 0] });
        pk.clone.position.set(-pk.center.x, 0, -pk.center.z);
        holder.add(pk.clone);
        M.mark('anchor', pk.obj, { center: pk.mark.center.toArray(), x: pk.mark.x.toArray(), y: pk.mark.y.toArray(), w: pk.mark.w, h: pk.mark.h });
      } else {
        const lid = M.mesh(G.slab(22, 22, 1.3, 1.2, 0.3), Mat.alu('#c8c9cb', { rough: 0.3 }), { rot: [90, 0, 0] });
        M.mark('anchor', lid, { center: [0, 1.3, 0], x: [1, 0, 0], y: [0, 0, -1], w: 22, h: 22 });
      }

      // ---------- the back: a shell of coloured aluminium, and its logo ----------
      M.part('back', { fly: { from: [0, 40, -620], at: [0.58, 0.86] } });
      const cy = Y0 + BH / 2;
      M.mesh(G.extrude(G.rrect(W, BH, R, 0, 0, 12), DEPTH - 1.7, 2.2, { bevelSeg: 6, curveSeg: 12 }), back, { pos: [0, cy, -DEPTH] });
      const logo = D.appleLogo(74, 0.25, logoMat, 0.08);
      logo.rotation.y = Math.PI;
      logo.position.set(0, cy + 40, -DEPTH - 0.1);
      M.add(logo);
      // the power connector's port, low on the back
      M.mesh(G.cyl(9, 1.4, 0.6, 32), Mat.alu('#d6d7d9', { rough: 0.3 }), { pos: [-60, Y0 + 70, -DEPTH - 0.6], rot: [90, 0, 0] });
      for (const x of [140, 155, 170, 185]) M.mesh(G.rbox(8.6, 3.2, 2, 1.5, 3), Mat.hole('#0b0b0b'), { pos: [x, Y0 + 40, -DEPTH + 0.4] });

      // ---------- the stand: one blade, bent into a foot ----------
      M.part('stand', { fly: { from: [0, -60, -900], at: [0.56, 0.86] } });
      {
        const th = 2.6, Rb = 16, ang = (66 * Math.PI) / 180, topY = 252, topZ = -DEPTH - th;
        const py = 2.6 + Rb + Rb * Math.cos(ang);
        const ze = topZ - (topY - py) / Math.tan(ang) + Rb * Math.sin(ang);
        const C = [ze, 2.6 + Rb];
        const line = [];
        for (let z = ze + 147 - 16; z > ze; z -= 12) line.push([z, 2.6, Math.PI]);
        for (let i = 0; i <= 14; i++) {
          const th0 = Math.PI + (ang - Math.PI) * (i / 14);
          line.push([C[0] + Rb * -Math.sin(th0), C[1] + Rb * Math.cos(th0), th0]);
        }
        const last = line[line.length - 1];
        const L = (topY - last[1]) / Math.sin(ang);
        for (let i = 1; i <= 6; i++) line.push([last[0] + Math.cos(ang) * L * (i / 6), last[1] + Math.sin(ang) * L * (i / 6), ang]);
        // offset either side of the centre line by half the sheet's thickness
        const A = [], B = [];
        for (const [z, y, h] of line) {
          const nz = -Math.sin(h), ny = Math.cos(h);
          A.push([z + nz * th, y + ny * th]);
          B.push([z - nz * th, y - ny * th]);
        }
        let poly = A.concat(B.reverse());
        let area = 0;
        for (let i = 0; i < poly.length; i++) { const [a, b] = poly[i], [c, d] = poly[(i + 1) % poly.length]; area += a * d - c * b; }
        if (area < 0) poly = poly.reverse();
        M.mesh(G.profile(poly, 148, 1.2, { bevelSeg: 4, curveSeg: 4 }), back);
        M.state.footFront = ze + 147 - 16;
      }

      // ---------- the front: the glass with its white borders, the display, the chin ----------
      M.part('front', { fly: { from: [0, 520, 70], rot: [-12, 0, 0], at: [0.62, 0.9] } });
      const gy = Y0 + CH + GH / 2;
      const glassShape = rect4(W, GH, [R, R, 0, 0], 0, 0);
      glassShape.holes.push(G.rrectHole(SW, SH, 1.2, 0, 0, 4));
      const white = new T.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.38, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 });
      M.mesh(G.extrude(glassShape, 1.7, 0.45, { bevelSeg: 3, curveSeg: 10 }), white, { pos: [0, gy, -1.7] });
      const chinShape = rect4(W, CH, [0, 0, R, R], 0, 0);
      M.mesh(G.extrude(chinShape, 1.7, 0.6, { bevelSeg: 3, curveSeg: 10 }), pale, { pos: [0, Y0 + CH / 2, -1.7] });
      // the seam where the glass meets the chin
      M.mesh(G.rbox(W - 4, 0.5, 0.6, 0.2, 2), Mat.hole('#3a3d42'), { pos: [0, Y0 + CH, -0.15], cast: false });
      const disp = M.screen({
        pos: [0, gy, -0.06], w: SW, h: SH, corner: 0.6,
        tech: 'retina', ui: [UIW, UIH], scale: 1, panel: [4480, 2520],
        portal: { rect: PORTAL },
        draw: screen,
      });
      M.state.display = disp;
      // the FaceTime camera at the top of the border
      M.mesh(G.cyl(1.3, 0.05, 0.02, 24), new T.MeshPhysicalMaterial({ color: '#0d0f18', roughness: 0.05, clearcoat: 1, iridescence: 0.5, iridescenceThicknessRange: [200, 500] }), { pos: [0, gy + GH / 2 - BZ / 2, 0.06], rot: [90, 0, 0], cast: false });
      M.mesh(G.cyl(2.4, 0.04, 0.02, 24), Mat.hole('#c9c9c7'), { pos: [0, gy + GH / 2 - BZ / 2, 0.04], rot: [90, 0, 0], cast: false });

      // ---------- the Magic Keyboard with Touch ID ----------
      M.part('keyboard', { fly: { from: [-260, 30, 380], rot: [0, 25, 0], at: [0.3, 0.74] } });
      const kb = M.group({ pos: [-95, 0, 215], rot: [0, 4, 0] });
      const KW = 278.9, KD = 114.9;
      M.mesh(G.profile([[KD / 2, 0], [KD / 2, 4.1], [-KD / 2, 10.9], [-KD / 2, 0]], KW, 1.6, { bevelSeg: 5 }), pale, { to: kb });
      const tilt = Math.atan2(6.8, KD);
      const keysG = M.group({ to: kb, pos: [0, 7.5, 0], rot: [(tilt * 180) / Math.PI, 0, 0] });
      const KP = 18.6, F = (l) => [1, l, { size: 2.4, align: 'c' }];
      const kopt = { pitch: KP, rowPitch: 18.2, gap: 2.6, flat: true, color: '#f7f7f5', ink: '#3a3a3c', size: 2.1, weight: 400, font: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif', align: 'c', cap: { h: 1.4, inset: 0.35, r: 1.6, topR: 1.4, fillet: 0.35 }, rough: 0.45 };
      const main = D.keyboard([
        [[1, '`', { l2: '~' }], [1, '1', { l2: '!' }], [1, '2', { l2: '@' }], [1, '3', { l2: '#' }], [1, '4', { l2: '$' }], [1, '5', { l2: '%' }], [1, '6', { l2: '^' }], [1, '7', { l2: '&' }], [1, '8', { l2: '*' }], [1, '9', { l2: '(' }], [1, '0', { l2: ')' }], [1, '-', { l2: '_' }], [1, '=', { l2: '+' }], [1.5, 'delete', { align: 'bl' }]],
        [[1.5, 'tab', { align: 'bl' }], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', [1, '[', { l2: '{' }], [1, ']', { l2: '}' }], [1, '\\', { l2: '|' }]],
        [[1.8, 'caps lock', { align: 'bl' }], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', [1, ';', { l2: ':' }], [1, "'", { l2: '"' }], [1.7, 'return', { align: 'bl' }]],
        [[2.3, 'shift', { align: 'bl' }], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', [1, ',', { l2: '<' }], [1, '.', { l2: '>' }], [1, '/', { l2: '?' }], [2.2, 'shift', { align: 'bl' }]],
        [[1, 'fn', { align: 'bl' }], [1, 'control', { align: 'bl', size: 1.7 }], [1, 'option', { align: 'bl', size: 1.7 }], [1.25, 'command', { align: 'bl', size: 1.7 }], [5, ''], [1.25, 'command', { align: 'bl', size: 1.7 }], [1, 'option', { align: 'bl', size: 1.7 }], [1, '◀', { size: 2.2 }], { gap: KP }, [1, '▶', { size: 2.2 }]],
      ], kopt);
      main.position.set(0, 0, 9.5);
      keysG.add(main);
      const fnRow = D.keyboard([[[1.5, 'esc', { align: 'bl' }], F('☼'), F('☀'), F('⊞'), F('⌕'), F('◉'), F('☾'), F('◁◁'), F('▷‖'), F('▷▷'), F('◁'), F('◁)'), F('◁))'), [1, '']]], { ...kopt, rowPitch: 10.2 });
      fnRow.position.set(0, 0, 9.5 - main.userData.d / 2 - 5.6);
      keysG.add(fnRow);
      for (const [l, dz] of [['▲', -0.25], ['▼', 0.25]]) {
        const ak = D.keyboard([[{ w: 1, h: 0.5, l, size: 1.8, align: 'c' }]], kopt);
        ak.position.set(main.userData.w / 2 - 1.5 * KP, 0, 9.5 + main.userData.d / 2 - 9.1 + (dz + 0.25) * 18.2);
        keysG.add(ak);
      }
      // Touch ID: a ring round the last key of the top row
      const tid = M.group({ to: keysG, pos: [fnRow.userData.w / 2 - KP / 2, 1.42, fnRow.position.z] });
      M.mesh(new T.RingGeometry(3.4, 3.75, 48), new T.MeshPhysicalMaterial({ color: '#c9c9cc', roughness: 0.25, metalness: 1 }), { to: tid, rot: [-90, 0, 0], cast: false });

      // ---------- the Magic Mouse ----------
      M.part('mouse', { fly: { from: [260, 30, 420], rot: [0, -30, 0], at: [0.35, 0.78] } });
      const ms = M.group({ pos: [150, 0, 230], rot: [0, -6, 0] });
      const ML = 113.5, MWd = 57.1;
      // its footprint is a superellipse, between an ellipse and the rounded rectangle it looks like
      const NS = 2.7, hw = MWd / 2, hl = ML / 2, HT = 19;
      const sup = (a, rho) => {
        const c = Math.cos(a), sn = Math.sin(a);
        return [hw * rho * Math.sign(c) * Math.pow(Math.abs(c), 2 / NS), hl * rho * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / NS)];
      };
      const outline = [];
      for (let i = 0; i < 96; i++) { const [x, z] = sup((i / 96) * Math.PI * 2, 1); outline.push(new T.Vector2(x, z)); }
      let foot = G.extrude(new T.Shape(outline), 2.8, 0.9, { bevelSeg: 4, curveSeg: 4 });
      foot.rotateX(Math.PI / 2);
      foot.translate(0, 2.8, 0);
      foot = G.smoothNormals(foot, 0.01);
      M.mesh(foot, pale, { to: ms });
      // the top shell: one smooth low dome over the same footprint, highest toward the palm
      const NA = 96, NR = 40, pos = [], idx = [];
      for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
        const rho = j / NR, a = (i / NA) * Math.PI * 2;
        const [x, z] = sup(a, rho * 0.985);
        const zd = z / hl, xd = x / hw;
        const y = 2.75 + HT * Math.pow(Math.max(0, 1 - rho * rho), 0.36) * (0.86 + 0.14 * zd) * (1 - 0.06 * xd * xd);
        pos.push(x, y, z);
      }
      for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) {
        const q = j * (NA + 1) + i, r = q + 1, c = q + NA + 1, d = c + 1;
        idx.push(q, r, c, r, d, c);
      }
      const sg = new T.BufferGeometry();
      sg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      sg.setIndex(idx);
      sg.computeVertexNormals();
      M.mesh(sg, new T.MeshPhysicalMaterial({ color: '#f6f6f4', roughness: 0.3, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.12, side: T.DoubleSide }), { to: ms });
    },
    // during the assembly the colours run through the aluminium, the screen comes on and says hello
    assemble(M, u) {
      const k = smooth(0.18, 0.84, u) * (PAIRS.length - 1);
      const i = Math.min(PAIRS.length - 2, Math.floor(k)), f = k - i;
      const { back, pale, logoMat } = M.state.mats;
      back.color.set(PAIRS[i][0]).lerp(new T.Color(PAIRS[i + 1][0]), f);
      pale.color.set(PAIRS[i][1]).lerp(new T.Color(PAIRS[i + 1][1]), f);
      logoMat.color.copy(back.color);
      const d = M.main;
      if (u >= 1) {
        // at rest: the desktop, with nothing left over from the assembly
        if (d.state.drawState && d.state.drawState.off !== undefined) { d.state.drawState = {}; d.redraw(); }
        return;
      }
      const st = { off: 1, hello: smooth(0.84, 0.88, u), write: smooth(0.86, 0.95, u), desk: smooth(0.955, 0.995, u) };
      const prev = d.state.drawState || {};
      if (['off', 'hello', 'write', 'desk'].some((key) => prev[key] !== st[key])) {
        d.state.drawState = st;
        d.redraw();
      }
    },
  });
})();
