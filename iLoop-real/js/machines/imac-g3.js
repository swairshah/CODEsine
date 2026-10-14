// imac-g3.js: iMac G3, 1998, in Bondi Blue. 381 wide, 397 tall, 440 deep. A frosted 'ice' front
// round the 15-inch CRT, with the CD tray and the Apple logo below it, speakers in the bottom
// corners and the round power button at the right. Behind it the translucent Bondi Blue shell swells
// out and tapers away to the back like an egg, with an ice band round its foot and the handle set
// into its top; through it you see the machine inside: the tube's glass funnel and neck, the copper
// yoke, the steel cage over the logic board, the analog board, the cables. In front of it, the USB
// keyboard in the same plastics, and the round 'hockey puck' mouse.
//
// The screen: Mac OS 9 at 1024 × 768 with iTunes open, the iPod selected in its source list, and the
// iPod itself in the pane beside it, in colour: the portal.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;

  const BONDI = '#0d8fae';

  // ---------- Mac OS 9 and iTunes ----------
  const CHARCOAL = 'Charcoal, "Chicago", ChicagoFLF, Geneva, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const GENEVA = 'Geneva, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const txt = (g, s, x, y, o = {}) => Pix.bitText(g, s, x, y, { size: o.size || 12, font: o.font || CHARCOAL, weight: o.weight ?? 700, color: o.color || '#000', align: o.align, thr: o.thr ?? 0.45 });
  // a Platinum bevel: light top-left, shade bottom-right
  function bevel(g, x, y, w, h, fill = '#dddddd', lt = '#ffffff', dk = '#999999') {
    Pix.rect(g, x, y, w, h, fill);
    Pix.rect(g, x, y, w, 1, lt); Pix.rect(g, x, y, 1, h, lt);
    Pix.rect(g, x, y + h - 1, w, 1, dk); Pix.rect(g, x + w - 1, y, 1, h, dk);
  }
  // the desktop picture: Mac OS 9's blue-violet, a soft woven texture
  let deskTile = null;
  function desk() {
    if (deskTile) return deskTile;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = Real.U.rng(9);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = (Math.sin(x * 0.39) + Math.sin(y * 0.39)) * 6 + (r() - 0.5) * 10;
      g.fillStyle = `rgb(${92 + v},${100 + v},${168 + v * 0.8})`;
      g.fillRect(x, y, 1, 1);
    }
    deskTile = c;
    return c;
  }
  function hdIcon(g, x, y) {
    // a 32 × 32 colour hard disk icon, seen from the front-top
    g.fillStyle = '#bdbdbd'; g.fillRect(x + 2, y + 12, 28, 12);
    g.fillStyle = '#e8e8e8'; g.fillRect(x + 2, y + 10, 28, 3);
    g.fillStyle = '#7a7a7a'; g.fillRect(x + 2, y + 24, 28, 2);
    Pix.frame(g, x + 1, y + 9, 30, 18, '#000');
    g.fillStyle = '#29a83b'; g.fillRect(x + 25, y + 19, 2, 2);
  }
  function trashIcon(g, x, y) {
    g.fillStyle = '#9a9a9a'; g.fillRect(x + 6, y + 6, 20, 3);
    g.fillStyle = '#c9c9c9'; g.fillRect(x + 7, y + 9, 18, 21);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#8a8a8a'; g.fillRect(x + 10 + i * 4, y + 11, 1, 17); }
    Pix.frame(g, x + 6, y + 9, 20, 22, '#000');
    Pix.frame(g, x + 5, y + 5, 22, 4, '#000');
    Pix.rect(g, x + 12, y + 3, 8, 2, '#000');
  }
  function label(g, s, cx, y) {
    const w = Pix.textWidth(s, { size: 10, font: GENEVA, weight: 400 }) + 6;
    Pix.rect(g, cx - w / 2, y - 9, w, 12, '#ffffff');
    txt(g, s, cx, y, { size: 10, font: GENEVA, weight: 400, align: 'center', thr: 0.5 });
  }
  // the iPod's own source-list icon, 16 × 16
  function ipodIcon(g, x, y) {
    g.fillStyle = '#f4f4f4'; Pix.rrect(g, x + 3, y, 10, 16, 2); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#9fb3a0'; g.fillRect(x + 5, y + 2, 6, 5);
    g.strokeStyle = '#888'; g.beginPath(); g.arc(x + 8, y + 11, 2.6, 0, Math.PI * 2); g.stroke();
  }
  function itunes(g, s) {
    const W = s.W, H = s.H;
    g.fillStyle = g.createPattern(desk(), 'repeat');
    g.fillRect(0, 0, W, H);
    // the menu bar: Platinum, with the rainbow Apple and iTunes's menus
    const mb = g.createLinearGradient(0, 0, 0, 20);
    mb.addColorStop(0, '#f0f0f0'); mb.addColorStop(1, '#d4d4d4');
    g.fillStyle = mb; g.fillRect(0, 0, W, 20);
    Pix.rect(g, 0, 20, W, 1, '#6e6e6e');
    Pix.apple(g, 22, 10, 15, { rainbow: true });
    let x = 46;
    for (const m of ['File', 'Edit', 'Controls', 'Visuals', 'Advanced', 'Window', 'Help']) x += txt(g, m, x, 15) + 18;
    // the clock and the application menu at the right
    txt(g, '9:41 AM', W - 128, 15, { align: 'right' });
    Pix.rect(g, W - 116, 2, 1, 17, '#9a9a9a');
    g.fillStyle = '#6b7fd0'; g.beginPath(); g.arc(W - 98, 10.5, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e6ecfb'; g.beginPath(); g.arc(W - 98, 10.5, 2, 0, Math.PI * 2); g.fill();
    txt(g, 'iTunes', W - 86, 15);
    // desktop icons down the right, the Trash at the foot
    hdIcon(g, W - 56, 32); label(g, 'Macintosh HD', W - 40, 76);
    g.fillStyle = '#7a9ae8'; g.fillRect(W - 54, 96, 30, 22); g.fillStyle = '#a8bdf2'; g.fillRect(W - 54, 92, 13, 5); Pix.frame(g, W - 54, 96, 30, 22, '#2e3f86');
    label(g, 'Applications', W - 40, 132);
    trashIcon(g, W - 56, H - 74); label(g, 'Trash', W - 40, H - 30);
    // the Control Strip, tucked into the bottom-left corner
    bevel(g, 0, H - 22, 196, 22, '#cfcfcf');
    ['#d9a441', '#6f8fd8', '#4bbf4b', '#c45a48', '#8e8e8e', '#6f72a8', '#c9a0d8', '#7ac1c9'].forEach((c, i) => { bevel(g, 8 + i * 22, H - 19, 18, 16, '#e2e2e2'); g.fillStyle = c; g.fillRect(12 + i * 22, H - 15, 10, 8); });
    bevel(g, 186, H - 22, 10, 22, '#bdbdbd');

    // ---- the iTunes window ----
    const wx = 92, wy = 50, ww = 836, wh = 640;
    // its frame: brushed silver, rounded at the top
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(wx + 3, wy + 4, ww, wh);
    const fr = g.createLinearGradient(0, wy, 0, wy + wh);
    fr.addColorStop(0, '#e6e6e6'); fr.addColorStop(0.12, '#cdcdcd'); fr.addColorStop(1, '#b9b9b9');
    g.fillStyle = fr; Pix.rrect(g, wx, wy, ww, wh, 7); g.fill();
    g.strokeStyle = '#555'; g.lineWidth = 1; Pix.rrect(g, wx + 0.5, wy + 0.5, ww - 1, wh - 1, 7); g.stroke();
    // the title bar: close, zoom and collapse boxes
    txt(g, 'iTunes', wx + ww / 2, wy + 15, { align: 'center' });
    for (const bx of [wx + 10, wx + ww - 42, wx + ww - 24]) { bevel(g, bx, wy + 5, 13, 13, '#d8d8d8', '#fff', '#7d7d7d'); Pix.frame(g, bx, wy + 5, 13, 13, '#444'); }
    // the transport: back, play, forward as big round grey buttons, the volume slider
    const btn = (cx, cy, r, glyph) => {
      const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 1, cx, cy, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#d5d5d5'); gr.addColorStop(1, '#8f8f8f');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#555'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#303030';
      g.beginPath();
      if (glyph === 'play') { g.moveTo(cx - r * 0.3, cy - r * 0.45); g.lineTo(cx + r * 0.45, cy); g.lineTo(cx - r * 0.3, cy + r * 0.45); }
      else {
        const d = glyph === 'next' ? 1 : -1;
        for (const o of [-0.38, 0.12]) { g.moveTo(cx + d * (o) * r, cy - r * 0.32); g.lineTo(cx + d * (o + 0.42) * r, cy); g.lineTo(cx + d * o * r, cy + r * 0.32); }
      }
      g.fill();
    };
    btn(wx + 34, wy + 52, 15, 'prev');
    btn(wx + 72, wy + 50, 19, 'play');
    btn(wx + 110, wy + 52, 15, 'next');
    Pix.rect(g, wx + 140, wy + 52, 78, 3, '#6d6d6d');
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.arc(wx + 196, wy + 53, 6, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#555'; g.stroke();
    // the status display: a pale LCD panel with the Apple and the line about the iPod
    const lx = wx + 268, ly = wy + 28, lw = 300, lh = 48;
    const lcd = g.createLinearGradient(0, ly, 0, ly + lh);
    lcd.addColorStop(0, '#e9eedd'); lcd.addColorStop(1, '#cfd8c0');
    g.fillStyle = lcd; Pix.rrect(g, lx, ly, lw, lh, 10); g.fill();
    g.strokeStyle = '#6a6f62'; g.stroke();
    Pix.apple(g, lx + lw / 2, ly + 17, 15, { color: '#3d4436' });
    txt(g, 'iPod connected. Do not disconnect.', lx + lw / 2, ly + 40, { size: 10, font: GENEVA, weight: 400, align: 'center', color: '#2b3125' });
    // search and browse, top right
    Pix.rect(g, wx + ww - 196, wy + 40, 116, 20, '#ffffff');
    Pix.frame(g, wx + ww - 196, wy + 40, 116, 20, '#6d6d6d');
    txt(g, 'Search', wx + ww - 138, wy + 74, { size: 10, font: GENEVA, weight: 400, align: 'center' });
    btn(wx + ww - 46, wy + 50, 15, 'play');
    txt(g, 'Browse', wx + ww - 46, wy + 80, { size: 10, font: GENEVA, weight: 400, align: 'center' });
    // the source list
    const sx = wx + 12, sy = wy + 92, sw = 168, sh = wh - 146;
    Pix.rect(g, sx, sy, sw, sh, '#ffffff');
    Pix.frame(g, sx - 1, sy - 1, sw + 2, sh + 2, '#6d6d6d');
    bevel(g, sx, sy, sw, 18, '#e3e3e3');
    txt(g, 'Source', sx + 8, sy + 13, { size: 10, font: GENEVA, weight: 400 });
    const rows = [['Library', '#7a6ad0'], ['Radio Tuner', '#5ba1d6'], ['iPod', null], ['My Top Rated', '#d0b44a'], ['Recently Played', '#d0b44a'], ['90’s Music', '#d0b44a']];
    rows.forEach(([n, c], i) => {
      const ry = sy + 22 + i * 20;
      if (n === 'iPod') { Pix.rect(g, sx, ry - 2, sw, 20, '#3f69c9'); }
      if (c) { g.fillStyle = c; g.fillRect(sx + 8, ry + 1, 14, 14); Pix.frame(g, sx + 8, ry + 1, 14, 14, '#333'); }
      else ipodIcon(g, sx + 7, ry);
      txt(g, n, sx + 30, ry + 13, { size: 11, font: GENEVA, weight: 400, color: n === 'iPod' ? '#ffffff' : '#000000' });
    });
    // the pane: the iPod, its name and capacity
    const px = sx + sw + 10, py = sy, pw = wx + ww - 12 - px, ph = sh;
    Pix.rect(g, px, py, pw, ph, '#ffffff');
    Pix.frame(g, px - 1, py - 1, pw + 2, ph + 2, '#6d6d6d');
    bevel(g, px, py, pw, 18, '#e3e3e3');
    txt(g, 'iPod', px + 8, py + 13, { size: 10, font: GENEVA, weight: 400 });
    // the picture: transparent, so the iPod itself shows through, in colour
    g.clearRect(PIC[0], PIC[1], PIC[2], PIC[3]);
    // the capacity bar under it
    const cy = PIC[1] + PIC[3] + 14;
    txt(g, 'iPod  ·  5 GB  ·  1,000 songs', px + pw / 2, cy + 6, { size: 12, align: 'center' });
    const bx0 = px + 70, bw = pw - 140;
    Pix.rect(g, bx0, cy + 16, bw, 12, '#e6e6e6');
    Pix.rect(g, bx0, cy + 16, bw * 0.38, 12, '#6f8fd8');
    Pix.frame(g, bx0, cy + 16, bw, 12, '#777');
    // the foot of the window: add playlist, shuffle, repeat, the song count, equaliser, visual, eject
    const fy = wy + wh - 34;
    for (const [i, gl] of [[0, '+'], [1, '⇄'], [2, '↻']]) { bevel(g, wx + 14 + i * 30, fy, 26, 22, '#e2e2e2'); txt(g, gl, wx + 27 + i * 30, fy + 16, { size: 13, align: 'center' }); }
    txt(g, '1,000 songs, 2.9 days, 4.2 GB', wx + ww / 2, fy + 15, { size: 10, font: GENEVA, weight: 400, align: 'center' });
    for (let i = 0; i < 3; i++) bevel(g, wx + ww - 100 + i * 30, fy, 26, 22, '#e2e2e2');
    // the pointer, near the iPod in the source list
    const t = s.time || 0;
    Pix.arrow(g, sx + 120 + Math.round(8 * Math.sin(t * 0.8)), sy + 66 + Math.round(5 * Math.cos(t * 1.1)));
  }
  // where the picture sits on the screen: the pane, at the page's proportions (see the README)
  const PIC = [299, 164, 600, 422];

  // ---------- a loft along z through rounded rectangles: the shell ----------
  // rings: [{ z, w, h, r, cy }], front to back. Interpolated smoothly to n sections.
  function loftZ(rings, n = 40, seg = 10) {
    const keys = ['w', 'h', 'r', 'cy'];
    const at = (u) => {
      const f = u * (rings.length - 1), i = Math.min(rings.length - 2, Math.floor(f)), k = f - i;
      const p = (j) => rings[Math.max(0, Math.min(rings.length - 1, j))];
      const o = {};
      for (const key of ['z', ...keys]) {
        const p0 = p(i - 1)[key], p1 = p(i)[key], p2 = p(i + 1)[key], p3 = p(i + 2)[key];
        o[key] = 0.5 * (2 * p1 + (-p0 + p2) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k * k + (-p0 + 3 * p1 - 3 * p2 + p3) * k * k * k);
      }
      return o;
    };
    const secs = [];
    for (let i = 0; i <= n; i++) {
      const s = at(i / n);
      secs.push(G.rrectPts(s.w, s.h, Math.min(s.r, s.w / 2 - 0.1, s.h / 2 - 0.1), 0, s.cy, seg).map((p) => new T.Vector3(p.x, p.y, s.z)).reverse());
    }
    const g = new T.BufferGeometry().copy(new T.LoftGeometry(secs, { closed: true, capStart: false, capEnd: true }));
    return G.smoothNormals(g, 0.05);
  }

  Real.add({
    name: 'iMac G3',
    era: 'platinum',
    year: '1998',
    kind: 'All-in-one',
    line: 'Translucent Bondi Blue plastic, a handle on top, and no floppy drive at all.',
    verb: 'Find the iPod in iTunes',
    view: { yaw: 26, pitch: 11, lens: 85, fill: 0.92 },
    set: { paper: '#dcdbd7', keyDir: [-0.5, 0.8, 0.5] },
    // full colour; where the picture's frame stops short of the pane, the pane shows studio grey
    next: { type: 'screen', look: { kind: 'none', bg: '#d6d4cf' } },
    make(M) {
      // the plastics
      const bondi = new T.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.07, metalness: 0, transmission: 0.94, thickness: 3, ior: 1.585, attenuationColor: new T.Color(BONDI), attenuationDistance: 14, clearcoat: 0.8, clearcoatRoughness: 0.08, specularIntensity: 1 });
      Mat.micro(bondi, { size: 0.6, bump: 0.18, rough: 0.2, stretch: [1, 0.03, 1] });
      const ice = new T.MeshPhysicalMaterial({ color: '#f7f9fa', roughness: 0.3, metalness: 0, transmission: 0.22, thickness: 6, ior: 1.585, attenuationColor: new T.Color('#e3ecef'), attenuationDistance: 30, clearcoat: 0.6, clearcoatRoughness: 0.15, sheen: 0.3, sheenColor: new T.Color('#ffffff'), sheenRoughness: 0.5 });
      Mat.micro(ice, { size: 0.4, bump: 0.12, rough: 0.15 });
      const iceSolid = Mat.plastic('#eef0f1', { rough: 0.36, clearcoat: 0.3 });
      M.state.bondi = bondi;

      // ---- the shell ----
      M.part('shell');
      const FZ = 135, FW = 381, FH = 376, FY = 22;
      const shell = loftZ([
        { z: FZ + 36, w: 377, h: 373, r: 34, cy: FY + 188 },
        { z: 112, w: 376, h: 371, r: 46, cy: 209 },
        { z: 60, w: 372, h: 366, r: 70, cy: 207 },
        { z: -20, w: 346, h: 338, r: 100, cy: 197 },
        { z: -100, w: 294, h: 288, r: 112, cy: 180 },
        { z: -165, w: 224, h: 220, r: 96, cy: 158 },
        { z: -210, w: 146, h: 142, r: 66, cy: 134 },
        { z: -234, w: 70, h: 70, r: 34, cy: 118 },
      ]);
      // the band round the foot is ice, the rest Bondi Blue: one surface, its two materials cut by
      // clipping planes so the line between them is straight (the renderer has local clipping on)
      const bondiShell = Mat.micro(bondi.clone(), { size: 0.6, bump: 0.18, rough: 0.2, stretch: [1, 0.03, 1] });
      bondiShell.clippingPlanes = [new T.Plane(new T.Vector3(0, 1, 0), -64)];
      const iceShell = Mat.micro(ice.clone(), { size: 0.4, bump: 0.12, rough: 0.15 });
      iceShell.clippingPlanes = [new T.Plane(new T.Vector3(0, -1, 0), 64)];
      const shellMesh = M.mesh(shell, bondiShell);
      M.mesh(shell, iceShell);
      // the seam between them
      M.state.seam = 64;
      shellMesh.updateMatrixWorld(true);
      // a point on the shell's surface, found by casting a ray at it, and the surface's normal there
      const ray = new T.Raycaster();
      const onShell = (from, dir) => {
        ray.set(new T.Vector3(...from), new T.Vector3(...dir).normalize());
        const h = ray.intersectObject(shellMesh, false)[0];
        return h ? { p: h.point, n: h.face.normal.clone() } : null;
      };
      // the port door on the right side, its notch, and the vents in the top
      const hit = onShell([400, 172, -30], [-1, 0, 0]);
      if (hit) {
        const dg = M.group({ pos: hit.p.toArray() });
        dg.lookAt(hit.p.clone().add(hit.n));
        M.mesh(G.extrude(G.rrect(78, 58, 26), 1.6, 0.6), bondi, { to: dg, pos: [0, 0, -0.6] });
        M.mesh(G.extrude((() => { const sh = G.rrect(81, 61, 27.5); sh.holes.push(G.rrectHole(78, 58, 26)); return sh; })(), 0.8, 0.2), Mat.hole('#0f3742'), { to: dg, pos: [0, 0, -0.5] });
        M.mesh(G.rbox(12, 3, 1.6, 1.2), Mat.hole('#0f3742'), { to: dg, pos: [-36, 0, 0.6] });
      }
      // the handle: a recess across the top behind the face that your fingers go into
      const top = onShell([0, 900, 128], [0, -1, 0]);
      if (top) {
        const hg = M.group({ pos: top.p.toArray() });
        hg.lookAt(top.p.clone().add(top.n));
        M.mesh(G.rbox(128, 30, 14, 7, 3), Mat.hole('#0f3742'), { to: hg, pos: [0, 0, -5] });
        M.mesh(G.rbox(132, 4, 3, 1.5, 2), bondi, { to: hg, pos: [0, -16, -1.5] });
      }
      // vent slots across the top further back
      const vtop = onShell([0, 900, 10], [0, -1, 0]);
      if (vtop) {
        const vg = M.group({ pos: vtop.p.toArray() });
        vg.lookAt(vtop.p.clone().add(vtop.n));
        const vents = [];
        for (let i = 0; i < 15; i++) { const g = G.rbox(3.4, 60, 6, 1.7, 2); g.translate(-50 + i * 7.1, 0, -2.4); vents.push(g); }
        M.mesh(G.merge(vents), Mat.hole('#0f3742'), { to: vg, cast: false });
      }

      // ---- the front: one ice moulding round the screen ----
      M.part('front');
      const face = G.rrect(FW, FH, 34, 0, FY + FH / 2);
      const SY = 252;
      face.holes.push(G.rrectHole(310, 238, 18, 0, SY));
      M.mesh(G.extrude(face, 36, 10, { bevelSeg: 8, curveSeg: 16 }), ice, { pos: [0, 0, FZ + 34] });
      // the screen surround: grey, sloping in to the tube
      const ring = [];
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        ring.push(G.rrectPts(310 - k * 18, 238 - k * 16, 18 - k * 8, 0, SY, 8).map((p) => new T.Vector3(p.x, p.y, FZ + 70 - 1 - k * 20)));
      }
      const funnel = new T.BufferGeometry().copy(new T.LoftGeometry(ring, { closed: true }));
      funnel.computeVertexNormals();
      const sur = Mat.plastic('#55595d', { rough: 0.55 }).clone();
      sur.side = T.DoubleSide;
      M.mesh(funnel, sur);
      M.mesh(G.rbox(296, 226, 4, 10), Mat.hole('#0c0d0d'), { pos: [0, SY, FZ + 46] });
      M.screen({
        pos: [0, SY, FZ + 49.5],
        w: 276, h: 207, glass: [292, 222], corner: 9, bulge: 5,
        tech: 'crt-color', ui: [1024, 768],
        portal: { rect: [322, 224, 554, 317] },
        animate: 6,
        draw: itunes,
      });
      // the Apple logo below the screen, inlaid in Bondi Blue
      const logo = D.appleLogo(24, 1.2, Mat.plastic('#1f8fb0', { rough: 0.2, clearcoat: 1 }));
      logo.position.set(0, 110, FZ + 70.1);
      M.add(logo);
      // the CD-ROM tray: its drawer front, the slot round it, the eject button
      M.mesh(G.rbox(150, 17, 3, 8.5, 3), Mat.hole('#4f6d76'), { pos: [0, 76, FZ + 69.4] });
      M.mesh(G.rbox(146, 13.5, 3, 6.7, 3), iceSolid, { pos: [0, 76, FZ + 70.6] });
      M.mesh(G.rbox(12, 5, 1.6, 2.4, 2), Mat.plastic(BONDI, { rough: 0.3 }), { pos: [56, 76, FZ + 72.3] });
      // the speakers: round clusters of holes in the bottom corners
      const holes = [];
      for (const sx of [-142, 142]) {
        for (let ring = 0; ring < 5; ring++) {
          const n = ring ? ring * 7 : 1;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2, r = ring * 4.3;
            const h = G.cyl(1.3, 1, 0.3, 10);
            h.rotateX(Math.PI / 2);
            h.translate(sx + r * Math.cos(a), 74 + r * Math.sin(a), 0);
            holes.push(h);
          }
        }
      }
      M.mesh(G.merge(holes), Mat.hole('#203238'), { pos: [0, 0, FZ + 69.7], cast: false });
      // the power button at the right, the infrared window at the left, the parting line above the foot
      M.mesh(G.cyl(9, 4, 1.6, 40), Mat.translucent(BONDI, { depth: 3 }), { pos: [118, 44, FZ + 68.5], rot: [90, 0, 0] });
      const pwr = D.decal(9, 9, (g, w, h) => {
        g.strokeStyle = '#e8f4f8'; g.lineWidth = 0.9; g.lineCap = 'round';
        g.beginPath(); g.arc(w / 2, h / 2 + 0.3, 2.6, -Math.PI / 2 + 0.6, -Math.PI / 2 - 0.6 + Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(w / 2, h / 2 - 3); g.lineTo(w / 2, h / 2); g.stroke();
      }, { ppm: 40 });
      pwr.position.set(118, 44, FZ + 72.6);
      M.add(pwr);
      M.mesh(G.rbox(18, 9, 2, 4, 2), Mat.plastic('#3a1f22', { rough: 0.15, clearcoat: 1 }), { pos: [-118, 44, FZ + 69.6] });
      for (const x of [134, 146]) M.mesh(G.cyl(2.2, 3, 0.5, 16), Mat.hole('#0a0a0a'), { pos: [x, 30, FZ + 68.8], rot: [90, 0, 0] });

      // ---- inside: what you see through the shell ----
      M.part('inside');
      // the tube: a black glass funnel from the face back to the neck, the copper yoke round it
      const tube = loftZ([
        { z: FZ - 2, w: 324, h: 252, r: 30, cy: SY },
        { z: 70, w: 300, h: 236, r: 70, cy: SY - 4 },
        { z: 0, w: 190, h: 160, r: 70, cy: SY - 12 },
        { z: -70, w: 70, h: 70, r: 35, cy: SY - 22 },
        { z: -110, w: 46, h: 46, r: 23, cy: SY - 24 },
      ], 24, 8);
      M.mesh(tube, new T.MeshPhysicalMaterial({ color: '#191b1c', roughness: 0.25, metalness: 0.2, clearcoat: 0.6 }));
      const yoke = G.lathe([[34, 0], [52, 6], [56, 22], [50, 40], [30, 46]], 40);
      yoke.rotateX(-Math.PI / 2);
      M.mesh(yoke, new T.MeshPhysicalMaterial({ color: '#b46a3a', roughness: 0.35, metalness: 1 }), { pos: [0, SY - 20, -30] });
      M.mesh(G.cyl(16, 96, 3, 32), new T.MeshPhysicalMaterial({ color: '#2a3a3c', roughness: 0.1, metalness: 0, transmission: 0.5, thickness: 2 }), { pos: [0, SY - 24, -40], rot: [-90, 0, 0] });
      // the steel cage over the logic board along the floor
      const cage = new T.MeshPhysicalMaterial({ color: '#c9ccce', roughness: 0.3, metalness: 1 });
      M.mesh(G.rbox(230, 56, 190, 4, 3), cage, { pos: [0, 66, 30] });
      const perf = [];
      for (let i = 0; i < 17; i++) for (let j = 0; j < 4; j++) { const h = G.cyl(2.4, 1, 0.3, 12); h.translate(-96 + i * 12, 93.5, -30 + j * 14 + (i % 2) * 7); perf.push(h); }
      M.mesh(G.merge(perf), Mat.hole('#2b2d2e'), { cast: false });
      // the analog board standing up the left side, the hard disk, a bundle of cables
      M.mesh(G.rbox(4, 150, 170, 2, 2), Mat.plastic('#2c5f3f', { rough: 0.5 }), { pos: [-135, 190, -10] });
      for (let i = 0; i < 6; i++) M.mesh(G.cyl(5 + (i % 3) * 2, 18, 1.5, 20), Mat.plastic(['#1e2a6a', '#111', '#5a2a1a'][i % 3], { rough: 0.4 }), { pos: [-125, 150 + i * 20, -40 + (i % 2) * 40], rot: [0, 0, -90] });
      M.mesh(G.rbox(102, 26, 148, 2, 2), Mat.alu('#c2c5c7', { rough: 0.35 }), { pos: [60, 110, -30] });
      M.mesh(G.tube([[-120, 110, 60], [-60, 150, 20], [0, 200, -60], [40, 230, -120]], 5), Mat.plastic('#141414', { rough: 0.5 }));
      M.mesh(G.tube([[120, 110, 60], [80, 180, 0], [40, 222, -80]], 4), Mat.plastic('#1a1a1a', { rough: 0.5 }));
      // the feet: two at the front, one at the back
      for (const [fx, fz] of [[-130, 120], [130, 120]]) M.mesh(G.rbox(40, 12, 22, 5, 3), iceSolid, { pos: [fx, 8, fz] });
      M.mesh(G.loftRR([{ w: 90, d: 40, r: 14, y: 0 }, { w: 84, d: 36, r: 12, y: 3 }, { w: 64, d: 26, r: 10, y: 46 }], { seg: 6 }), iceSolid, { pos: [0, 0, -138] });

      // ---- the keyboard ----
      M.part('keyboard');
      const kb = M.group({ pos: [-34, 0, 330], rot: [0, 2, 0] });
      const KW = 382, KD = 150;
      const kcase = G.loftRR([
        { w: KW - 6, d: KD - 6, r: 14, y: 0 }, { w: KW, d: KD, r: 16, y: 4 }, { w: KW, d: KD, r: 16, y: 14 }, { w: KW - 3, d: KD - 3, r: 15, y: 19 }, { w: KW - 10, d: KD - 10, r: 12, y: 21 },
      ], { seg: 8 });
      // the case tilts: higher at the back
      const pos = kcase.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * (1 + (-pos.getZ(i) / KD) * 0.55));
      kcase.computeVertexNormals();
      M.mesh(G.splitGroups(kcase, (c) => (c.y < 6 ? 1 : 0)), [bondi, ice], { to: kb });
      M.mesh(G.rbox(KW - 26, 3, KD - 26, 8), Mat.plastic('#2a3438', { rough: 0.7 }), { to: kb, pos: [0, 14, 0] });
      const keyRows = [
        [[1, 'esc', { size: 1.3 }], { gap: 5 }, 'F1', 'F2', 'F3', 'F4', { gap: 5 }, 'F5', 'F6', 'F7', 'F8', { gap: 5 }, 'F9', 'F10', 'F11', 'F12', { gap: 23 }, [1, '⏏', { size: 2.2 }]],
        [[1, '`', { l2: '~' }], [1, '1', { l2: '!' }], [1, '2', { l2: '@' }], [1, '3', { l2: '#' }], [1, '4', { l2: '$' }], [1, '5', { l2: '%' }], [1, '6', { l2: '^' }], [1, '7', { l2: '&' }], [1, '8', { l2: '*' }], [1, '9', { l2: '(' }], [1, '0', { l2: ')' }], [1, '-', { l2: '_' }], [1, '=', { l2: '+' }], [1.5, 'delete', { size: 1.3 }], { gap: 5 }, 'clear', '=', '/', '*'],
        [[1.5, 'tab', { size: 1.3 }], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', [1, '[', { l2: '{' }], [1, ']', { l2: '}' }], [1, '\\', { l2: '|' }], { gap: 5 }, '7', '8', '9', '-'],
        [[1.75, 'caps lock', { size: 1.3 }], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', [1, ';', { l2: ':' }], [1, "'", { l2: '"' }], [1.75, 'return', { size: 1.3 }], { gap: 5 }, '4', '5', '6', '+'],
        [[2.25, 'shift', { size: 1.3 }], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', [1, ',', { l2: '<' }], [1, '.', { l2: '>' }], [1, '/', { l2: '?' }], [1.25, 'shift', { size: 1.3 }], [1, '↑'], { gap: 5 }, '1', '2', '3', 'enter'],
        [[1.25, 'control', { size: 1.1 }], [1.25, 'option', { size: 1.1 }], [1.25, '⌘', { size: 2.2 }], [5.75, ''], [1.25, '⌘', { size: 2.2 }], [1, '←'], [1, '↓'], [1, '→'], { gap: 5 }, [2, '0'], '.', ''],
      ];
      const keys = D.keyboard(keyRows, { color: '#e9edef', ink: '#30373c', size: 2.1, pitch: 17.6, align: 'tl', cap: { h: 6.5, inset: 1.8, fillet: 1.2, topR: 2, r: 1.6 }, rough: 0.42 });
      keys.position.set(0, 15.5, 2);
      keys.rotation.x = Math.atan2(21 * 0.55, KD);
      kb.add(keys);
      M.mesh(G.tube([[0, 8, -KD / 2], [6, 6, -KD / 2 - 40], [60, 2, -KD / 2 - 90], [150, 2, -KD / 2 - 120], [200, 30, -KD / 2 - 170]], 2.2, { seg: 60 }), Mat.plastic('#e8ecee', { rough: 0.4 }), { to: kb }).userData.noFit = true;

      // ---- the round mouse ----
      M.part('mouse');
      const ms = M.group({ pos: [224, 0, 330] });
      M.mesh(G.lathe([[0, 0], [29, 0], [31, 2], [31.5, 8], [30.8, 13], [29, 15], [0, 15]], 64), bondi, { to: ms });
      M.mesh(G.lathe([[0, 15], [28.6, 15], [29.4, 15.8], [29, 19.5], [26, 23.5], [18, 26.4], [0, 27.2]], 64), ice, { to: ms });
      M.mesh(G.lathe([[0, 0], [29.2, 0], [29.2, 0.6], [0, 0.6]], 64), Mat.plastic('#1e3d47', { rough: 0.7 }), { to: ms, pos: [0, 15.1, 0] });
      // the dimple that tells you which way is up
      M.mesh(G.cyl(4, 0.6, 0.3, 24), Mat.translucent(BONDI, { depth: 4 }), { to: ms, pos: [0, 25.2, -19], rot: [-28, 0, 0] });
      M.mesh(G.tube([[0, 8, -31], [0, 6, -50], [-20, 2, -90], [-60, 2, -120], [-120, 6, -150]], 1.6, { seg: 40 }), Mat.plastic('#e8ecee', { rough: 0.4 }), { to: ms }).userData.noFit = true;
    },
  });
})();
