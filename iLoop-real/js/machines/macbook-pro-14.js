// macbook-pro-14.js: MacBook Pro 14″, 2021. Finished.
//
// The machine: 312.6 × 221.2 mm, 15.5 mm closed, in space grey. The base is a slab with flat sides,
// a rounded underside and a crisp top edge, on four rubber feet. The keyboard sits in a black well
// between the two speaker grilles, with a full-height function row ending in Touch ID and an
// inverted-T of arrows; below it, the wide Force Touch trackpad. On the left: MagSafe 3 (with its
// braided cable plugged in and its light on), two Thunderbolt 4 ports and the headphone jack; on the
// right: the SDXC slot, Thunderbolt 4 and HDMI. The lid is a sheet of black glass edge to edge, the
// Liquid Retina XDR display under it, with the camera in a notch at the top.
//
// The screen: macOS Monterey at 1512 × 982 points (3024 × 1964 pixels), the menu bar round the
// notch, Finder open on AirDrop, and the Dock. The Mac mini is in its AirDrop circle; that is the
// portal. The egg: as you close in, the circle opens out to fill the screen.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D } = Real;
  const { smooth } = Real.U;
  const OS = Real.MacOS;

  const BW = 312.6, BD = 221.2, BT = 9.3, FT = 1.4, LT = 5.6, LH = 214;
  const GREY = '#8c8d91';
  const UIW = 1512, UIH = 982;
  // the AirDrop window and the Mac mini's circle
  const WIN = { x: 286, y: 118, w: 940, h: 590 };
  const SB = 210;
  const MINI = { x: WIN.x + SB + 400, y: WIN.y + 250, r: 74 };
  const PW = MINI.r * 2 * 0.9, PH = PW / 1.75;
  const PORTAL = [MINI.x - PW / 2, MINI.y - PH / 2, PW, PH];

  // ---------- the screen ----------
  let wall = null;
  function paintStatic(g, W, H) {
    if (!wall) {
      wall = document.createElement('canvas');
      wall.width = W;
      wall.height = H;
      OS.monterey(wall.getContext('2d'), W, H);
    }
    g.drawImage(wall, 0, 0);
    // ---- Finder, on AirDrop ----
    const { x, y, w, h } = WIN;
    OS.windowFrame(g, x, y, w, h);
    g.save();
    OS.rr(g, x, y, w, h, 10);
    g.clip();
    // the sidebar: translucent, the wallpaper faintly through it
    g.save();
    g.globalAlpha = 0.18;
    g.drawImage(wall, x, y, SB, h, x, y, SB, h);
    g.restore();
    g.fillStyle = 'rgba(232,230,236,0.86)';
    g.fillRect(x, y, SB, h);
    OS.lights(g, x + 20, y + 26);
    const side = [
      ['Favourites'], ['airdrop', 'AirDrop', true], ['clock', 'Recents'], ['apps', 'Applications'], ['desktop', 'Desktop'], ['doc', 'Documents'], ['download', 'Downloads'],
      ['iCloud'], ['cloud', 'iCloud Drive'],
      ['Locations'], ['disk', 'Macintosh HD'], ['network', 'Network'],
      ['Tags'],
    ];
    let yy = y + 66;
    for (const it of side) {
      if (it.length === 1) {
        yy += 8;
        OS.text(g, it[0], x + 14, yy, 11, { weight: 600, color: 'rgba(60,60,67,0.55)' });
        yy += 22;
        continue;
      }
      if (it[2]) { g.fillStyle = 'rgba(0,0,0,0.09)'; OS.rr(g, x + 8, yy - 12, SB - 16, 24, 6); g.fill(); }
      OS.symbol(g, it[0], x + 26, yy, 15, '#1f7af0', 1.5);
      OS.text(g, it[1], x + 42, yy, 13, { color: '#1d1d1f' });
      yy += 26;
    }
    ['#ff453a', '#ff9f0a', '#ffd60a', '#32d74b', '#0a84ff', '#bf5af2'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath(); g.arc(x + 26, yy + i * 24, 5.5, 0, Math.PI * 2); g.fill();
      OS.text(g, ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'][i], x + 42, yy + i * 24, 13);
    });
    // the main area
    g.fillStyle = '#ffffff';
    g.fillRect(x + SB, y, w - SB, h);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(x + SB, y, 1, h);
    // the toolbar
    g.fillStyle = '#f6f6f6';
    g.fillRect(x + SB + 1, y, w - SB - 1, 52);
    g.fillStyle = 'rgba(0,0,0,0.1)';
    g.fillRect(x + SB + 1, y + 52, w - SB - 1, 1);
    OS.symbol(g, 'chevL', x + SB + 26, y + 26, 15, '#5a5a5e', 1.8);
    OS.symbol(g, 'chevR', x + SB + 54, y + 26, 15, '#b9b9bd', 1.8);
    OS.text(g, 'AirDrop', x + SB + 76, y + 26, 15, { weight: 700 });
    OS.symbol(g, 'share', w + x - 92, y + 26, 16, '#5a5a5e', 1.5);
    OS.symbol(g, 'search', w + x - 40, y + 26, 15, '#5a5a5e', 1.6);
    // the radar: rings out from the foot of the window
    const cx = x + SB + (w - SB) / 2, cy = y + h + 150;
    g.strokeStyle = 'rgba(0,122,255,0.10)';
    g.lineWidth = 1.2;
    for (const rr of [170, 270, 370, 470, 570]) { g.beginPath(); g.arc(cx, cy, rr, Math.PI, 0); g.stroke(); }
    // the AirDrop symbol and the words
    g.fillStyle = OS.lin(g, 0, y + h - 190, 0, y + h - 110, [[0, '#5ac8fa'], [1, '#0a7bf0']]);
    g.beginPath(); g.arc(cx, y + h - 150, 38, 0, Math.PI * 2); g.fill();
    OS.symbol(g, 'airdrop', cx, y + h - 152, 44, '#ffffff', 2.4);
    OS.text(g, 'AirDrop lets you share instantly with people nearby.', cx, y + h - 86, 13, { align: 'center', color: '#3c3c43' });
    const t1 = 'Allow me to be discovered by: ';
    g.font = `400 13px ${OS.SF}`;
    const w1 = g.measureText(t1).width, w2 = g.measureText('Contacts Only').width;
    OS.text(g, t1, cx - (w1 + w2 + 14) / 2, y + h - 58, 13, { color: '#3c3c43' });
    OS.text(g, 'Contacts Only', cx - (w1 + w2 + 14) / 2 + w1, y + h - 58, 13, { color: '#0a6ff0' });
    OS.symbol(g, 'chevD', cx + (w1 + w2 + 14) / 2 - 5, y + h - 57, 9, '#0a6ff0', 1.6);
    // the people and devices nearby, each in a circle
    const person = (px, py, r, initials, name, sub, col) => {
      g.fillStyle = OS.lin(g, 0, py - r, 0, py + r, [[0, col[0]], [1, col[1]]]);
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
      OS.text(g, initials, px, py + 2, r * 0.78, { align: 'center', color: '#fff', weight: 500, font: OS.SFD });
      OS.text(g, name, px, py + r + 24, 13, { align: 'center', weight: 500 });
      OS.text(g, sub, px, py + r + 42, 12, { align: 'center', color: '#8e8e93' });
    };
    person(x + SB + 150, MINI.y, 56, 'JA', 'Jony', 'iPhone', ['#a7acb6', '#7c818c']);
    // the Mac mini's circle: a soft grey, as AirDrop shows a device, with the Mac mini in it
    g.fillStyle = OS.rad(g, MINI.x, MINI.y - 20, 4, MINI.r * 1.2, [[0, '#ececea'], [1, '#d2d2d0']]);
    g.beginPath(); g.arc(MINI.x, MINI.y, MINI.r, 0, Math.PI * 2); g.fill();
    OS.text(g, 'Mac mini', MINI.x, MINI.y + MINI.r + 24, 13, { align: 'center', weight: 500 });
    person(x + SB + 640, MINI.y, 56, 'SM', 'Steve', 'iPad', ['#f0a57c', '#d9725a']);
    g.restore();

    // ---- the Dock and the menu bar ----
    OS.dock(g, W, H, { size: 50, running: ['Finder', 'Safari', 'Mail', 'Music'], month: 'OCT', day: '26' });
    OS.menuBar(g, W, H, { app: 'Finder', menus: ['File', 'Edit', 'View', 'Go', 'Window', 'Help'], clock: 'Tue 26 Oct  9:41 AM', right: ['siri', 'control', 'search', 'wifi', 'battery'], notch: 186, height: 37, dark: false });

  }
  // The screen: the desktop (painted once), and the Mac mini's circle cut through it. The hole is
  // the circle, feathered where it meets the edge of the Mac mini's picture (outside that there is
  // no picture); as you close in it opens out to the whole picture.
  let still = null, mask = null, maskKey = '';
  function desktop(g, s) {
    const W = s.W, H = s.H;
    if (!still) {
      still = document.createElement('canvas');
      still.width = W;
      still.height = H;
      paintStatic(still.getContext('2d'), W, H);
    }
    g.drawImage(still, 0, 0);
    const open = s.open || 0, ring = s.ring || 0;
    if (ring > 0) {
      g.strokeStyle = `rgba(10,122,255,${ring})`;
      g.lineWidth = 4;
      g.beginPath(); g.arc(MINI.x, MINI.y, MINI.r + 5, 0, Math.PI * 2); g.stroke();
    }
    const f = (s.display && s.display.state.frame) || [MINI.x - 72, MINI.y - 50, 144, 101];
    const key = f.map((v) => v.toFixed(1)).join(',');
    if (key !== maskKey) {
      mask = mask || document.createElement('canvas');
      mask.width = W;
      mask.height = H;
      const m = mask.getContext('2d');
      const fe = Math.max(2, Math.min(f[2], f[3]) * 0.06);
      m.filter = `blur(${fe.toFixed(1)}px)`;
      m.fillStyle = '#000';
      m.fillRect(f[0] + fe * 1.6, f[1] + fe * 1.6, f[2] - fe * 3.2, f[3] - fe * 3.2);
      maskKey = key;
    }
    g.save();
    g.beginPath();
    g.arc(MINI.x, MINI.y, MINI.r + open * Math.hypot(W, H), 0, Math.PI * 2);
    g.clip();
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(mask, 0, 0);
    g.restore();
  }

  // keyboard: US layout, black keys, white legends
  const SYM = { size: 3.4, align: 'c' };
  function rows() {
    const F = (l) => [1, l, SYM];
    return [
      [[1.5, 'esc', { align: 'bl' }], F('☼'), F('☀'), F('⊞'), F('⌕'), F('◉'), F('☾'), F('◁◁'), F('▷‖'), F('▷▷'), F('◁'), F('◁)'), F('◁))'), [1, '', { color: '#141416' }]],
      [[1, '`', { l2: '~' }], [1, '1', { l2: '!' }], [1, '2', { l2: '@' }], [1, '3', { l2: '#' }], [1, '4', { l2: '$' }], [1, '5', { l2: '%' }], [1, '6', { l2: '^' }], [1, '7', { l2: '&' }], [1, '8', { l2: '*' }], [1, '9', { l2: '(' }], [1, '0', { l2: ')' }], [1, '-', { l2: '_' }], [1, '=', { l2: '+' }], [1.5, 'delete', { align: 'bl' }]],
      [[1.5, 'tab', { align: 'bl' }], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', [1, '[', { l2: '{' }], [1, ']', { l2: '}' }], [1, '\\', { l2: '|' }]],
      [[1.8, 'caps lock', { align: 'bl' }], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', [1, ';', { l2: ':' }], [1, "'", { l2: '"' }], [1.7, 'return', { align: 'bl' }]],
      [[2.3, 'shift', { align: 'bl' }], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', [1, ',', { l2: '<' }], [1, '.', { l2: '>' }], [1, '/', { l2: '?' }], [2.2, 'shift', { align: 'bl' }]],
      [[1, 'fn', { align: 'bl' }], [1, 'control', { align: 'bl', size: 1.7 }], [1, 'option', { align: 'bl', size: 1.7 }], [1.25, 'command', { align: 'bl', size: 1.7 }], [5, ''], [1.25, 'command', { align: 'bl', size: 1.7 }], [1, 'option', { align: 'bl', size: 1.7 }], [1, '◀', { size: 2.2, align: 'c' }], { gap: 18.6 }, [1, '▶', { size: 2.2, align: 'c' }]],
    ];
  }

  Real.add({
    name: 'MacBook Pro 14″',
    era: 'bigsur',
    year: '2021',
    kind: 'Notebook',
    line: 'MagSafe, HDMI and the SD card slot came back. The camera moved into a notch at the top of the screen.',
    verb: 'Find the Mac mini in AirDrop',
    view: { yaw: -31, pitch: 21, lens: 85, fill: 0.9 },
    set: { paper: '#dadad8', keyDir: [-0.55, 0.8, 0.35] },
    next: { type: 'screen', egg: 'airdrop' },
    make(M) {
      const grey = Mat.alu(GREY, { rough: 0.46 });
      const black = Mat.plastic('#0d0d0f', { rough: 0.58 });

      // ---------- the base ----------
      M.part('base');
      const Y0 = FT;
      // a loft through the outline: rounded underside, flat sides, a crisp top edge
      const secs = [];
      const R = 10;
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2), e = 3.2;
        const inset = e - e * Math.sin(a);
        secs.push({ w: BW - 2 * inset, d: BD - 2 * inset, r: R - inset, y: Y0 + e - e * Math.cos(a) });
      }
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * (Math.PI / 2), e = 0.7;
        const inset = e - e * Math.cos(a);
        secs.push({ w: BW - 2 * inset, d: BD - 2 * inset, r: R - inset, y: Y0 + BT - e + e * Math.sin(a) });
      }
      const body = G.loftRR(secs, { seg: 10 });
      body.computeVertexNormals();
      M.mesh(body, grey);
      const TOP = Y0 + BT;
      // the keyboard well, and the keys in it
      const KP = 18.6, KR = 17.9;
      const KZ = -BD / 2 + 7 + 55;
      M.mesh(G.slab(275, 110, 0.4, 3, 0.1), black, { pos: [0, TOP - 0.35, KZ], cast: false });
      const kb = D.keyboard(rows(), {
        pitch: KP, rowPitch: KR, gap: 2.5, flat: true, color: '#1d1d1f', ink: '#e9e9ec', size: 2.1, weight: 400,
        font: 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif', align: 'c',
        cap: { h: 0.9, inset: 0.35, r: 1.6, topR: 1.4, fillet: 0.3 }, rough: 0.6,
      });
      kb.position.set(0, TOP - 0.15, KZ);
      M.add(kb);
      // the arrows' up and down keys share the gap between left and right
      const kd = kb.userData.d;
      for (const [l, dz] of [['▲', -KR * 0.25], ['▼', KR * 0.25]]) {
        const ak = D.keyboard([[{ w: 1, h: 0.5, l, size: 1.8, align: 'c' }]], {
          pitch: KP, rowPitch: KR, gap: 2.5, flat: true, color: '#1d1d1f', ink: '#e9e9ec', font: 'system-ui, Arial', cap: { h: 0.9, inset: 0.3, r: 1.2, topR: 1.0, fillet: 0.3 }, rough: 0.6,
        });
        ak.position.set(kb.userData.w / 2 - 1.5 * KP, TOP - 0.15, KZ + kd / 2 - KR / 2 + dz + KR * 0.25);
        M.add(ak);
      }
      // speaker grilles either side of the keyboard
      for (const sx of [-1, 1]) {
        const grille = D.decal(13, 104, (g, w, h) => {
          g.fillStyle = 'rgba(10,10,12,0.92)';
          for (let yy = 0.6; yy < h - 0.4; yy += 0.82) for (let xx = 0.55 + ((Math.round(yy / 0.82) % 2) * 0.41); xx < w - 0.4; xx += 0.82) {
            g.beginPath(); g.arc(xx, yy, 0.22, 0, Math.PI * 2); g.fill();
          }
        }, { ppm: 19, rough: 0.5 });
        grille.rotation.x = -Math.PI / 2;
        grille.position.set(sx * 147.6, TOP + 0.02, KZ);
        M.add(grille);
      }
      // the trackpad: a pane of glass in an outline of shadow
      const TZ = BD / 2 - 7 - 45;
      M.mesh(G.slab(151, 91, 0.3, 7.5, 0.05), Mat.hole('#2a2a2c'), { pos: [0, TOP - 0.29, TZ], cast: false });
      M.mesh(G.slab(150, 90, 0.5, 7, 0.2), Mat.plastic('#808185', { rough: 0.4, clearcoat: 0.25 }), { pos: [0, TOP - 0.47, TZ], cast: false });
      // the thumb scoop at the front edge, where you lift the lid
      M.mesh(G.rbox(36, 1.4, 2.4, 0.7, 3), Mat.alu('#7b7c80', { rough: 0.4 }), { pos: [0, TOP - 0.3, BD / 2 - 0.6] });
      // feet
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.add(G.mesh(G.cyl(6.4, FT + 0.6, 0.6, 32), Mat.rubber('#1f1f21'), { pos: [x * (BW / 2 - 22), 0, z * (BD / 2 - 20)] }));
      // the ports
      const PY = Y0 + BT / 2 - 0.2;
      const slot = (x, z, w, h, r, rotY, inner) => {
        const grp = M.group({ pos: [x, PY, z], rot: [0, rotY, 0] });
        M.mesh(G.rbox(w, h, 3, r, 3), Mat.hole('#090909'), { to: grp, pos: [0, 0, -1.3] });
        if (inner) M.mesh(G.rbox(w * 0.74, Math.min(0.7, h * 0.25), 1.4, 0.25, 2), Mat.plastic('#2a2a2c', { rough: 0.4 }), { to: grp, pos: [0, 0, -1.6] });
        return grp;
      };
      const LX = -BW / 2, RX = BW / 2;
      // left: MagSafe 3, Thunderbolt, Thunderbolt, headphones
      slot(LX + 0.2, -78, 17.8, 4.0, 2.0, -90, false);
      M.mesh(G.rbox(16.6, 3.1, 1, 1.5, 3), Mat.alu('#55565a', { rough: 0.3 }), { pos: [LX + 1.2, PY, -78], rot: [0, -90, 0] });
      slot(LX + 0.2, -58, 8.9, 3.3, 1.6, -90, true);
      slot(LX + 0.2, -44, 8.9, 3.3, 1.6, -90, true);
      M.mesh(G.cyl(2.0, 3, 0.3, 24), Mat.hole('#080808'), { pos: [LX + 3, PY, 12], rot: [0, 0, 90] });
      // right: SDXC, Thunderbolt, HDMI
      slot(RX - 0.2, 6, 25, 2.6, 0.6, 90, false);
      slot(RX - 0.2, -48, 8.9, 3.3, 1.6, 90, true);
      slot(RX - 0.2, -74, 15.4, 5.6, 1.0, 90, true);
      // the MagSafe 3 cable: the connector in its port, its light on, the braid across the desk
      const ms = M.group({ pos: [LX - 9.4, PY, -78], rot: [0, -90, 0] });
      M.mesh(G.rbox(17.4, 4.4, 18.5, 2.1, 4), Mat.alu('#7d7e82', { rough: 0.35 }), { to: ms });
      M.mesh(G.rbox(8.6, 4.6, 6.5, 2.0, 4), Mat.alu('#6b6c70', { rough: 0.38 }), { to: ms, pos: [0, 0, 12] });
      M.mesh(G.cyl(0.55, 0.3, 0.1, 16), new T.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a1f', emissiveIntensity: 3.2 }), { to: ms, pos: [0, 2.15, -5], cast: false });
      const braid = Mat.micro(new T.MeshPhysicalMaterial({ color: '#58595d', roughness: 0.62, metalness: 0, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new T.Color('#d0d0d4') }), { size: 0.35, bump: 0.9, rough: 0.3, stretch: [0.6, 0.6, 2.4] });
      const cab = M.mesh(G.tube([[LX - 24, PY, -78], [LX - 40, PY - 2, -80], [LX - 70, 2.6, -70], [LX - 95, 2.4, -20], [LX - 105, 2.4, 60], [LX - 140, 2.4, 140], [LX - 220, 2.4, 190]], 2.2, { seg: 220, radial: 14 }), braid);
      cab.userData.noFit = true;

      // ---------- the lid ----------
      M.part('lid');
      const hingeZ = -BD / 2 + 6.2;
      const lid = M.group({ pos: [0, TOP + 0.4, hingeZ], rot: [-21, 0, 0] });
      // the hinge barrel between base and lid
      M.mesh(G.cyl(3.2, 236, 1.2, 32), Mat.alu('#3c3d40', { rough: 0.4 }), { pos: [118, TOP + 0.4, hingeZ - 0.6], rot: [0, 0, 90] });
      const lsecs = [];
      for (let i = 0; i <= 5; i++) {
        const a = (i / 5) * (Math.PI / 2), e = 2.2;
        const inset = e - e * Math.sin(a);
        lsecs.push({ w: BW - 2 * inset, d: LH - 2 * inset, r: R - inset, y: e - e * Math.cos(a) });
      }
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * (Math.PI / 2), e = 0.7;
        const inset = e - e * Math.cos(a);
        lsecs.push({ w: BW - 2 * inset, d: LH - 2 * inset, r: R - inset, y: LT - e + e * Math.sin(a) });
      }
      const shell = G.loftRR(lsecs, { seg: 10 });
      shell.computeVertexNormals();
      // lofted along y as a slab: turn it so its thickness runs along z, the back at z = -LT
      shell.rotateX(Math.PI / 2);
      shell.translate(0, LH / 2, -LT);
      M.mesh(shell, grey, { to: lid });
      // the polished logo on the back
      const logo = D.appleLogo(46, 0.1, Mat.chrome({ rough: 0.08, color: '#c8c9cc' }), 0.03);
      logo.rotation.y = Math.PI;
      logo.position.set(0, LH / 2 + 4, -LT - 0.05);
      lid.add(logo);
      // the display: black glass edge to edge, the picture under it
      const disp = M.screen({
        to: lid, pos: [0, LH / 2, 0.06],
        w: 302.4, h: 196.4, glass: [BW - 1.6, LH - 1.6], offset: [0, (LH - 1.6) / 2 - 4.1 - 196.4 / 2], corner: 2.2,
        tech: 'retina', ui: [UIW, UIH], scale: 1, panel: [3024, 1964],
        portal: { rect: PORTAL },
        draw: desktop,
      });
      M.state.display = disp;
      // the camera in the notch
      M.mesh(G.cyl(1.4, 0.05, 0.02, 24), new T.MeshPhysicalMaterial({ color: '#0b0d18', roughness: 0.05, metalness: 0, clearcoat: 1, iridescence: 0.6, iridescenceThicknessRange: [200, 500] }), { to: lid, pos: [0, LH / 2 + (LH - 1.6) / 2 - 4.1 - 3.6, 0.12], rot: [90, 0, 0], cast: false });
      M.state.lid = lid;
    },
  });

  // ---------- the egg: the Mac mini's circle opens out ----------
  Real.egg('airdrop', (api) => {
    const d = api.display;
    const ring = smooth(0.12, 0.3, api.t) * (1 - smooth(0.5, 0.6, api.t));
    const open = smooth(0.55, 0.9, api.t);
    const st = d.state.drawState;
    if (!st || st.ring !== ring || st.open !== open) {
      d.state.drawState = { ring, open };
      d.redraw();
    }
  });
})();
