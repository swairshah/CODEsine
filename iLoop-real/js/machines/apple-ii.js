// apple-ii.js: Apple II, 1977, as it was photographed for the brochures: the moulded beige case
// (380 wide, 445 deep, 110 tall at the back) with its sloped front and built-in keyboard, two Disk II
// drives side by side on the lid, and the monitor on top of them in green phosphor.
//
// The case: a flat lid over the back, a slope down to the front lip with the keyboard set into it,
// the raised 'apple ][' badge above the keys, vent slots in both sides, and the dark steel base pan.
// The keyboard: 52 dark brown keys with their white legends (shifted characters above), REPT, RESET
// and the POWER lamp. Under the case, for the assembly: the motherboard with its eight slots, rows of
// RAM, the ROMs, the switching power supply and the speaker, and the 6502 at the front.
//
// The screen is the monitor's 280 × 192, in mixed mode: Big Brother's broadcast in high-resolution
// graphics over four lines of text, ']LOAD 1984' and ']RUN', in the Apple II's own 5 × 7 characters.
// Its egg is the 1984 advert: a sledgehammer thrown from behind the camera spins in and smashes the
// telescreen; the glass flies out in a flash of light, and the Macintosh is there in the light.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;
  const { smooth, clamp, lerp, rng } = Real.U;

  const BEIGE = '#d7caa6';
  const KEYCAP = '#3c342d';

  // ---------- the Apple II's characters: 5 × 7 dots in a 7 × 8 cell ----------
  const GLYPH = {
    A: '00100 01010 10001 10001 11111 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
    C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
    E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
    G: '01111 10000 10000 10011 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
    I: '01110 00100 00100 00100 00100 00100 01110', J: '00001 00001 00001 00001 00001 10001 01110',
    K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
    M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
    O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
    Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
    S: '01110 10001 10000 01110 00001 10001 01110', T: '11111 00100 00100 00100 00100 00100 00100',
    U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
    W: '10001 10001 10001 10101 10101 11011 10001', X: '10001 10001 01010 00100 01010 10001 10001',
    Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
    0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
    2: '01110 10001 00001 00110 01000 10000 11111', 3: '11111 00001 00010 00110 00001 10001 01110',
    4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
    6: '00111 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
    8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 11100',
    ']': '11110 00010 00010 00010 00010 00010 11110', '.': '00000 00000 00000 00000 00000 00000 00100',
    ',': '00000 00000 00000 00000 00100 00100 01000', ':': '00000 00000 00100 00000 00100 00000 00000',
    '-': '00000 00000 00000 11111 00000 00000 00000', '"': '01010 01010 01010 00000 00000 00000 00000',
    "'": '00100 00100 00100 00000 00000 00000 00000', '!': '00100 00100 00100 00100 00100 00000 00100',
    '?': '01110 10001 00010 00100 00100 00000 00100', '/': '00000 00001 00010 00100 01000 10000 00000',
    '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000',
    ' ': '00000 00000 00000 00000 00000 00000 00000',
  };
  const GL = {};
  for (const [c, s] of Object.entries(GLYPH)) GL[c] = s.split(' ').map((r) => r.split('').map(Number));
  // text at a cell position (col, row) on the 40 × 24 screen, or at pixel (x, y) scaled by k
  function chars(g, str, x, y, k = 1, color = '#fff') {
    g.fillStyle = color;
    for (let i = 0; i < str.length; i++) {
      const gl = GL[str[i]] || GL[' '];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (gl[r][c]) g.fillRect(x + (i * 7 + 1 + c) * k, y + r * k, k, k);
    }
  }
  const text = (g, str, col, row) => chars(g, str, col * 7, row * 8);

  // ---------- Big Brother, in high-resolution graphics ----------
  // Big Brother as a pixel-art face, put on the screen in one bit through an ordered dither, as an HGR
  // picture would have been. 280 × 160: the four text lines are below it.
  let hgr = null;
  function bigBrother() {
    if (hgr) return hgr;
    const W = 280, H = 160;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    // a stern face in pixel-art outline: the hair a solid mass, the rest one-block lines
    const FACE = [
      '.......##########.......',
      '.....##############.....',
      '....################....',
      '...##################...',
      '...##################...',
      '..####################..',
      '..###..............###..',
      '..##................##..',
      '..#..................#..',
      '..#..................#..',
      '..#..####......####..#..',
      '.##......##..##......##.',
      '#.#..................#.#',
      '#.#...###......###...#.#',
      '#.#........#.........#.#',
      '.##........#.........##.',
      '..#........#.........#..',
      '..#........###.......#..',
      '..#..................#..',
      '..#.....########.....#..',
      '...#................#...',
      '....#..............#....',
      '.....#............#.....',
      '......#..........#......',
      '.......##########.......',
    ];
    g.fillStyle = '#fff';
    FACE.forEach((row, r) => [...row].forEach((ch, col) => { if (ch === '#') g.fillRect(28 + col * 4, 12 + r * 4, 4, 4); }));
    // dither to one bit, 4 × 4 ordered
    const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const im = g.getImageData(0, 0, W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const v = d[i] / 255 > (B4[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    // the broadcast, beside the face and across the foot of the picture
    chars(g, 'ONE PEOPLE.', 150, 18);
    chars(g, 'ONE WILL.', 150, 32);
    chars(g, 'ONE RESOLVE.', 150, 50);
    chars(g, 'ONE CAUSE.', 150, 64);
    hgr = c;
    return c;
  }

  function telescreen(g, s) {
    const W = s.W, H = s.H;
    if (s.broken) return; // nothing left on the tube: the Macintosh shows through
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.drawImage(bigBrother(), 0, 0);
    // WE SHALL PREVAIL. in double-size characters across the foot of the picture
    g.fillStyle = '#000';
    g.fillRect(0, 128, W, 32);
    chars(g, 'WE SHALL PREVAIL.', 21, 131, 2);
    // the four lines of text below the graphics
    text(g, ']LOAD 1984', 0, 21);
    text(g, ']RUN', 0, 22);
    text(g, ']', 0, 23);
    if (Math.floor((s.time || 0) * 2.1) % 2 === 0) { g.fillStyle = '#fff'; g.fillRect(7, 23 * 8, 7, 8); }
  }

  // ---------- the motherboard, printed ----------
  const MB = { w: 350, d: 300, x: 0, z: -60 };
  const SLOT_Z = -190, CPU_POS = [-40, 34];
  function drawMother(g, W, H) {
    const k = W / MB.w;
    g.save();
    g.scale(k, k);
    g.translate(MB.w / 2, MB.d / 2);
    g.fillStyle = '#21503a';
    g.fillRect(-MB.w / 2, -MB.d / 2, MB.w, MB.d);
    const r = rng(77);
    g.strokeStyle = '#336b48';
    g.lineCap = 'round';
    for (let i = 0; i < 110; i++) {
      g.lineWidth = r() < 0.15 ? 1.6 : 0.5;
      const y = -MB.d / 2 + 8 + r() * (MB.d - 16), x0 = -MB.w / 2 + 6 + r() * 200;
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 30 + r() * 120, y); g.lineTo(x0 + 34 + r() * 120, y + (r() - 0.5) * 12); g.stroke();
    }
    g.fillStyle = '#ecebe2';
    g.font = '700 7px "Helvetica Neue", Arial, sans-serif';
    g.fillText('APPLE II', 60, 128);
    g.font = '500 3.6px "Helvetica Neue", Arial, sans-serif';
    g.fillText('APPLE COMPUTER INC.  COPYRIGHT 1977', 60, 136);
    for (let i = 0; i < 8; i++) g.fillText(String(i), -63 + i * 24, SLOT_Z - MB.z + 32);
    g.restore();
  }

  // ---------- a Disk II ----------
  function diskII(M, x, name, fly) {
    M.part(name, { fly });
    const grp = M.group({ pos: [x, 110, -126] });
    const DW = 176, DH = 86, DD = 212;
    const abs = Mat.abs(BEIGE, { rough: 0.6 });
    // the cover: a rounded box, its top a separate pressing with a seam round it
    M.mesh(G.rbox(DW, DH, DD, 5, 4), abs, { to: grp, pos: [0, DH / 2, 0] });
    M.mesh(G.rbox(DW - 2, 0.8, DD - 22, 0.3), Mat.hole('#5b5344'), { to: grp, pos: [0, DH + 0.05, -8] });
    // the front: a dark brown bezel, set in, with the slot and the door
    const FZ = DD / 2;
    M.mesh(G.rbox(DW - 10, DH - 10, 6, 3, 3), Mat.abs('#2c2520', { rough: 0.5 }), { to: grp, pos: [0, DH / 2, FZ - 2] });
    M.mesh(G.rbox(124, 5.5, 8, 2, 2), Mat.hole('#060505'), { to: grp, pos: [6, 50, FZ + 0.4] });
    // the door: a lever that closes down over the middle of the slot
    M.mesh(G.rbox(24, 38, 7, 2.5, 3), Mat.abs('#3a312a', { rough: 0.45 }), { to: grp, pos: [6, 33, FZ + 3.6] });
    M.mesh(G.rbox(20, 1.2, 2, 0.4), Mat.hole('#151210'), { to: grp, pos: [6, 50.5, FZ + 7.1] });
    for (let i = 0; i < 5; i++) M.mesh(G.rbox(16, 0.8, 1, 0.3), Mat.hole('#1c1814'), { to: grp, pos: [6, 22 + i * 3.2, FZ + 7.15], cast: false });
    // the badge and the IN USE lamp
    const badge = D.decal(52, 16, (g, w, h) => {
      D.drawApple(g, 6, h / 2, h * 0.78, { rainbow: true });
      g.fillStyle = '#f1ece0';
      g.font = `italic 600 ${h * 0.62}px Georgia, "Times New Roman", serif`;
      g.textBaseline = 'middle';
      g.fillText('disk II', 13, h * 0.54);
    }, { ppm: 30, rough: 0.35 });
    badge.position.set(-50, 68, FZ + 1.05);
    grp.add(badge);
    const lab = D.label('IN USE', 2.1, { color: '#e9e3d4', weight: 600, track: 0.08 });
    lab.position.set(-64, 26, FZ + 1.05);
    grp.add(lab);
    M.mesh(G.cyl(2.6, 2, 0.6, 20), Mat.plastic('#7a1e17', { rough: 0.2, clearcoat: 1 }), { to: grp, pos: [-48, 26, FZ + 0.9], rot: [90, 0, 0] });
    // rubber feet
    for (const [fx, fz] of [[-70, 90], [70, 90], [-70, -90], [70, -90]]) M.mesh(G.cyl(6, 3, 1, 16), Mat.rubber('#26231f'), { to: grp, pos: [fx, -2.6, fz] });
    return grp;
  }

  Real.add({
    name: 'Apple II',
    era: 'apple2',
    year: '1977',
    kind: 'Personal computer',
    line: 'Colour graphics, sound and eight expansion slots in a moulded plastic case. It sold for sixteen years.',
    verb: 'Zoom into the telescreen',
    view: { yaw: 28, pitch: 15, lens: 85, fill: 0.92 },
    set: { paper: '#d8d4cb', keyDir: [-0.5, 0.82, 0.45] },
    next: { type: 'screen', egg: '1984', look: { kind: 'mono' } },
    pose(M) { warm(M); },
    make(M) {
      // ---- the base pan and the motherboard: there before anything flies in ----
      M.part('base');
      M.mesh(G.slab(376, 442, 12.5, 6, 1.2), Mat.alu('#2b2926', { rough: 0.55 }), { pos: [0, 0, -7] });
      const mbTex = Mat.canvasTexture(drawMother, MB.w * 6, MB.d * 6);
      M.mesh(G.slab(MB.w, MB.d, 1.6, 2, 0.3), Mat.plastic('#9da07c', { rough: 0.6 }), { pos: [MB.x, 14, MB.z] });
      M.mesh(new T.PlaneGeometry(MB.w - 0.8, MB.d - 0.8), new T.MeshPhysicalMaterial({ map: mbTex, bumpMap: mbTex, bumpScale: 0.5, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 }), { pos: [MB.x, 15.62, MB.z], rot: [-90, 0, 0], cast: false });
      const BT = 15.6;
      // the 6502, white ceramic with a satin gold lid (the same chip as the Apple I's)
      const cpu = D.dip(40, { ceramic: true, lines: ['MOS', 'MCS6502', '1477'] });
      const gold = Mat.gold();
      cpu.traverse((o) => { if (o.isMesh && o.material === gold) o.material = new T.MeshPhysicalMaterial({ color: '#e4b85c', roughness: 0.3, metalness: 1 }); });
      cpu.position.set(CPU_POS[0], BT, CPU_POS[1]);
      M.add(cpu);
      M.mark('anchor', cpu, { center: [0, cpu.userData.top, 0], x: [1, 0, 0], y: [0, 0, -1], w: cpu.userData.w, h: cpu.userData.d });
      // three rows of eight 4116 RAMs, the ROMs, rows of logic
      const rams = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
        const ch = D.dip(16, { lines: ['MK4116N', '7745'] });
        ch.position.set(-20 + c * 24, BT, -62 + r * 24);
        M.add(ch);
      }
      for (let c = 0; c < 6; c++) {
        const ch = D.dip(24, { lines: ['9316B', '341-000' + c] });
        ch.position.set(-30 + c * 36, BT, 6);
        M.add(ch);
      }
      for (let c = 0; c < 5; c++) {
        const ch = D.dip(14, { lines: ['74LS' + (138 + c * 12), '7738'] });
        ch.position.set(30 + c * 26, BT, 36);
        M.add(ch);
      }
      // the expansion slots along the back, a Disk II controller card in slot 6
      for (let i = 0; i < 8; i++) {
        M.mesh(G.rbox(5.5, 11, 88, 1), Mat.plastic('#1c1c1c', { rough: 0.5 }), { pos: [-84 + i * 24, BT + 5.5, SLOT_Z + 24] });
        M.mesh(G.rbox(1.6, 2, 82, 0.4), Mat.hole('#050505'), { pos: [-84 + i * 24, BT + 11.1, SLOT_Z + 24], cast: false });
      }
      M.mesh(G.rbox(1.6, 78, 90, 0.6), Mat.plastic('#2f6b45', { rough: 0.45 }), { pos: [-84 + 6 * 24, BT + 49, SLOT_Z + 24] });
      for (const z of [-12, 12]) M.mesh(G.rbox(9, 18, 20, 1), Mat.plastic('#e9e6dc', { rough: 0.5 }), { pos: [-84 + 6 * 24 + 5.2, BT + 64, SLOT_Z + 24 + z] });
      // the switching power supply: a tall box down the left side, and the speaker at the front
      M.mesh(G.rbox(64, 70, 260, 3, 3), Mat.alu('#b9b5aa', { rough: 0.45 }), { pos: [-148, 12.5 + 35, -70] });
      const psl = D.label('APPLE II POWER SUPPLY', 3.2, { color: '#2a2a2a', weight: 700 });
      psl.position.set(-115.9, 52, -70);
      psl.rotation.y = Math.PI / 2;
      M.add(psl);
      M.mesh(G.lathe([[0, 0], [38, 0], [38, 2], [34, 3], [12, 9], [6, 9], [0, 9]], 48), Mat.plastic('#1f1d1b', { rough: 0.7 }), { pos: [-140, 12.5, 150] });

      // ---- the case ----
      M.part('case', { fly: { from: [0, 430, -60], rot: [8, 0, 0], at: [0.08, 0.5] } });
      const abs = Mat.abs(BEIGE, { rough: 0.6, bump: 0.4 });
      const ZB = -229, ZT = -40, ZS = 196, ZF = 216;
      const prof = [[ZB, 12.5], [ZF, 12.5], [ZF, 49], [ZS, 60], [ZT, 110], [ZB, 110]];
      M.mesh(G.profile(prof.map(([z, y]) => [z, y]).reverse(), 380, 5, { bevelSeg: 5 }), abs);
      // the lid's seam at the top of the slope and down the sides
      M.mesh(G.rbox(372, 1.2, 1.4, 0.5), Mat.hole('#4e4637'), { pos: [0, 110.2, ZT - 6] });
      for (const s of [-1, 1]) M.mesh(G.rbox(1.4, 1.2, ZT - 6 - ZB - 6, 0.5), Mat.hole('#4e4637'), { pos: [s * 186, 110.2, (ZT - 6 + ZB + 6) / 2] });
      // vents in each side, toward the back
      for (const s of [-1, 1]) {
        const v = [];
        for (let i = 0; i < 13; i++) {
          const g = G.rbox(1.6, 46, 4.2, 0.8, 2);
          g.rotateX(-0.18);
          g.translate(0, 0, i * 9.5);
          v.push(g);
        }
        M.mesh(G.merge(v), Mat.hole('#141210'), { pos: [s * 189.6, 56, -200], cast: false });
      }
      // the back: openings for cables from the slots, the power switch and socket, the jacks
      for (let i = 0; i < 6; i++) M.mesh(G.rbox(16, 22, 3, 2), Mat.hole('#100e0c'), { pos: [-70 + i * 30, 60, ZB - 0.8] });
      M.mesh(G.rbox(14, 22, 6, 2), Mat.plastic('#222', { rough: 0.4 }), { pos: [-160, 64, ZB - 1.5] });
      M.mesh(G.rbox(30, 20, 3, 2), Mat.hole('#0e0c0b'), { pos: [-130, 32, ZB - 0.8] });
      for (let i = 0; i < 3; i++) M.mesh(G.cyl(3.5, 6, 0.8, 16), Mat.steel({ color: '#d9c58a', rough: 0.3 }), { pos: [110 + i * 18, 34, ZB - 4], rot: [90, 0, 0] });
      // the keyboard set into the slope: a dark well, the keys standing in it
      const ang = Math.atan2(110 - 60, ZS - ZT);
      const along = (s, up = 0) => [ZT + Math.cos(ang) * s - Math.sin(ang) * up, 110 - Math.sin(ang) * s - Math.cos(ang) * up];
      const kbS = 140;
      const [kz, ky] = along(kbS);
      const kb = M.group({ pos: [0, ky, kz], rot: [(ang * 180) / Math.PI, 0, 0] });
      M.mesh(G.rbox(266, 10, 108, 3, 3), Mat.hole('#1b1814'), { to: kb, pos: [0, -4.4, 0] });
      const keys = D.keyboard([
        [[1, '1', { l2: '!' }], [1, '2', { l2: '"' }], [1, '3', { l2: '#' }], [1, '4', { l2: '$' }], [1, '5', { l2: '%' }], [1, '6', { l2: '&' }], [1, '7', { l2: "'" }], [1, '8', { l2: '(' }], [1, '9', { l2: ')' }], [1, '0'], [1, ':', { l2: '*' }], [1, '-', { l2: '=' }], [1, 'RESET', { size: 1.7 }]],
        [[1, 'ESC', { size: 1.8 }], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', [1, 'P', { l2: '@' }], [1, 'REPT', { size: 1.7 }], [1.5, 'RETURN', { size: 1.7 }]],
        [[1, 'CTRL', { size: 1.8 }], 'A', 'S', 'D', 'F', [1, 'G', { l2: 'BELL', size: 2.2 }], 'H', 'J', 'K', 'L', [1, ';', { l2: '+' }], [1, '←'], [1, '→']],
        [[1.75, 'SHIFT', { size: 1.8 }], 'Z', 'X', 'C', 'V', 'B', [1, 'N', { l2: '^' }], [1, 'M', { l2: ']' }], [1, ',', { l2: '<' }], [1, '.', { l2: '>' }], [1, '/', { l2: '?' }], [1.75, 'SHIFT', { size: 1.8 }]],
        [{ gap: 3.75 * 19.05 }, [9, '']],
      ], { color: KEYCAP, ink: '#ece6d6', align: 'tc', size: 2.6, weight: 600, indent: [9.5, 0, 4.8, 0, 0], cap: { h: 11, inset: 2.6, fillet: 1.6, topR: 2.4 }, rowTilt: [-5, -2.5, 0, 2.5, 4], rowLift: [1.2, 0.3, 0, 0.3, 1] });
      keys.position.set(-4, -2, 0);
      kb.add(keys);
      // the POWER lamp: a key-shaped window, lit
      M.mesh(G.rbox(15, 7, 15, 2.4, 3), Mat.plastic('#e8e2cf', { rough: 0.25, clearcoat: 0.6 }), { to: kb, pos: [-112, 1.5, 38] });
      const pw = D.label('POWER', 1.8, { color: '#2e2a25', weight: 700 });
      pw.position.set(-112, 5.05, 38);
      pw.rotation.x = -Math.PI / 2;
      kb.add(pw);
      M.state.kb = kb;
      // the badge above the keys: a raised dark plate with the rainbow Apple and 'apple ]['
      const [bz, by] = along(36);
      const bg = M.group({ pos: [0, by, bz], rot: [(ang * 180) / Math.PI - 90, 0, 0] });
      M.mesh(G.extrude(G.rrect(88, 26, 3), 2.2, 0.6), Mat.plastic('#211d1a', { rough: 0.35, clearcoat: 0.4 }), { to: bg });
      const bd = D.decal(84, 22, (g, w, h) => {
        D.drawApple(g, 13, h / 2, h * 0.82, { rainbow: true });
        g.fillStyle = '#f3efe4';
        g.textBaseline = 'middle';
        g.font = `700 ${h * 0.62}px "Cooper Black", "Bookman Old Style", Georgia, serif`;
        g.fillText('apple ][', 25, h * 0.52);
      }, { ppm: 30, rough: 0.3, clearcoat: 0.6 });
      bd.position.set(0, 0, 2.25);
      bg.add(bd);

      // ---- two Disk II drives on the lid, drive 2 on the left ----
      diskII(M, -94, 'drive2', { from: [-420, 380, 40], rot: [0, 25, -12], at: [0.34, 0.72] });
      diskII(M, 94, 'drive1', { from: [420, 400, 40], rot: [0, -25, 12], at: [0.4, 0.78] });

      // ---- the monitor ----
      M.part('monitor', { fly: { from: [0, 700, -80], rot: [-14, 0, 0], at: [0.52, 0.96] } });
      const mon = M.group({ pos: [0, 196, 0] });
      const mabs = Mat.abs('#dacdab', { rough: 0.6 });
      const MW = 322, MH = 262, MF = 18;
      // the cabinet: a side profile, deep and tapering at the back over the tube's neck
      M.mesh(G.profile([[MF - 62, 0], [MF - 62, MH], [-120, MH], [-262, 140], [-262, 0]].reverse(), MW, 7, { bevelSeg: 5 }), mabs, { to: mon });
      // the front: one moulding with the tunnel round the tube, and the control strip on the right
      const TX = -26, TY = 140, TW = 232, TH = 200;
      const front = G.rrect(MW, MH, 8, 0, MH / 2);
      front.holes.push(G.rrectHole(TW, TH, 7, TX, TY));
      M.mesh(G.extrude(front, 64, 6, { bevelSeg: 5 }), mabs, { to: mon, pos: [0, 0, MF - 64] });
      // the tunnel: tapering in toward the tube, dark at its far end
      const N = 6, secs = [];
      for (let i = 0; i <= N; i++) {
        const k = i / N;
        secs.push(G.rrectPts(TW - k * 30, TH - k * 30, 7 - k * 3, TX, TY, 6).map((p) => new T.Vector3(p.x, p.y, MF - 2 - k * 44)));
      }
      const tun = new T.BufferGeometry().copy(new T.LoftGeometry(secs, { closed: true }));
      tun.computeVertexNormals();
      const tmat = Mat.abs('#cbbd99', { rough: 0.7 }).clone();
      tmat.side = T.DoubleSide;
      M.mesh(tun, tmat, { to: mon });
      M.mesh(G.rbox(TW - 26, TH - 26, 6, 9), Mat.hole('#0b0c0b'), { to: mon, pos: [TX, TY, MF - 54] });
      const disp = M.screen({
        to: mon, pos: [TX, TY, MF - 47.5],
        w: 180, h: 136, glass: [196, 156], corner: 10, bulge: 8,
        tech: 'crt-green', ui: [280, 192],
        portal: { rect: [16, 30, 248, 132] },
        animate: 4,
        draw: telescreen,
      });
      M.state.display = disp;
      // the control strip: brightness and contrast knobs, the power switch, the badge
      const CX = TX + TW / 2 + 22;
      for (const [y, lab] of [[220, 'CONTRAST'], [180, 'BRIGHTNESS']]) {
        M.mesh(G.lathe([[0, 0], [8.5, 0], [8.5, 6], [7.4, 9], [0, 9.4]], 32), Mat.plastic('#2b2622', { rough: 0.45 }), { to: mon, pos: [CX, y, MF], rot: [90, 0, 0] });
        const l = D.label(lab, 1.9, { color: '#5b5141', weight: 600, track: 0.06 });
        l.position.set(CX, y - 15, MF + 0.08);
        mon.add(l);
      }
      M.mesh(G.rbox(12, 22, 6, 2), Mat.plastic('#2b2622', { rough: 0.4 }), { to: mon, pos: [CX, 126, MF + 2] });
      const ml = D.decal(34, 12, (g, w, h) => {
        g.fillStyle = '#211d1a'; Pix.rrect(g, 0, 0, w, h, 1.6); g.fill();
        D.drawApple(g, 5.5, h / 2, h * 0.66, { rainbow: true });
        g.fillStyle = '#efe9da'; g.font = `600 ${h * 0.3}px "Helvetica Neue", Arial`; g.textBaseline = 'middle';
        g.fillText('monitor', 10.5, h * 0.36); g.fillText('III', 10.5, h * 0.72);
      }, { ppm: 30, rough: 0.35 });
      ml.position.set(CX, 64, MF + 0.08);
      mon.add(ml);
      // the groove along the foot of the front
      M.mesh(G.rbox(MW - 8, 1.2, 1.2, 0.4), Mat.hole('#5b5344'), { to: mon, pos: [0, 22, MF + 0.1] });
      for (const [fx, fz] of [[-130, -10], [130, -10], [-130, -230], [130, -230]]) M.mesh(G.cyl(7, 3, 1, 16), Mat.rubber('#26231f'), { to: mon, pos: [fx, -2.6, fz] });
    },
  });

  // ---------- the 1984 egg ----------
  // t = 0.05 … 0.32: a sledgehammer, thrown from behind the camera, spins in end over end.
  // t = 0.32: it hits the telescreen. A flash; the glass bursts out toward you in shards, turning and
  // catching the studio's lights; behind it, the tube is gone and the Macintosh stands in the light.
  const HIT = 0.32;
  let hammer = null, shards = null, shardGroup = null;
  function makeHammer() {
    const g = new T.Group();
    // the head: a forged steel block with chamfered faces, painted black, the striking faces bright
    const head = new T.Group();
    const L = 150, S = 52;
    head.add(G.mesh(G.rbox(S, L - 14, S, 3.5, 3), Mat.alu('#232427', { rough: 0.6 }), { cast: true }));
    // the eye the handle goes through, and the two striking faces, ground bright with a chamfer
    for (const s of [-1, 1]) head.add(G.mesh(G.loftRR([{ w: S - 0.5, d: S - 0.5, r: 3.2, y: 0 }, { w: S - 2, d: S - 2, r: 4, y: 5 }, { w: S - 9, d: S - 9, r: 5, y: 8 }], { seg: 4 }), Mat.steel({ rough: 0.22, color: '#c9cbcc' }), { pos: [0, s * (L / 2 - 7), 0], rot: [s > 0 ? 0 : 180, 0, 0] }));
    head.rotation.z = Math.PI / 2;
    g.add(head);
    // the handle: hickory, tapering, with a rubber grip
    const handle = G.lathe([[0, 0], [15, 0], [16, 30], [13.5, 160], [12, 420], [14, 560], [15.5, 640], [15.5, 680], [0, 690]], 32);
    handle.translate(0, -700, 0);
    g.add(G.mesh(handle, Mat.plastic('#b9894f', { rough: 0.55 }), { cast: true }));
    g.add(G.mesh(G.cyl(17.5, 170, 4, 32), Mat.rubber('#1c1b1a'), { pos: [0, -700, 0] }));
    return g;
  }
  // the glass, broken from the point of impact: rings of radial pieces, cut to the tube
  function makeShards(d) {
    const W = d.ui[0], H = d.ui[1];
    const I = [140, 82];
    const r = rng(1984);
    const n = 19;
    const angles = Array.from({ length: n }, (_, i) => ((i + 0.15 + r() * 0.7) / n) * Math.PI * 2);
    const rings = [0, 18 + r() * 8, 44 + r() * 12, 86 + r() * 16, 150 + r() * 20, 400];
    // Sutherland–Hodgman against the screen's rectangle: each edge is an axis (0: x, 1: y), a bound,
    // and which side is kept
    const clip = (poly) => {
      let out = poly;
      for (const [ax, lim, lo] of [[0, 0, true], [0, W, false], [1, 0, true], [1, H, false]]) {
        const keep = (p) => (lo ? p[ax] >= lim : p[ax] <= lim);
        const cut = (a, b) => {
          const k = (lim - a[ax]) / (b[ax] - a[ax]);
          return [a[0] + k * (b[0] - a[0]), a[1] + k * (b[1] - a[1])];
        };
        const inp = out;
        out = [];
        for (let i = 0; i < inp.length; i++) {
          const a = inp[i], b = inp[(i + 1) % inp.length];
          if (keep(a) && keep(b)) out.push(b);
          else if (keep(a)) out.push(cut(a, b));
          else if (keep(b)) out.push(cut(a, b), b);
        }
        if (!out.length) return out;
      }
      return out;
    };
    const list = [];
    const glass = new T.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, metalness: 0, transmission: 1, thickness: 2.5, ior: 1.52, attenuationColor: new T.Color('#d6e6dc'), attenuationDistance: 60, specularIntensity: 1, envMapIntensity: 3, clearcoat: 1, clearcoatRoughness: 0.02, side: T.DoubleSide });
    for (let i = 0; i < n; i++) for (let j = 0; j < rings.length - 1; j++) {
      const a0 = angles[i], a1 = angles[(i + 1) % n] + (i === n - 1 ? Math.PI * 2 : 0);
      const P = (a, rr) => [I[0] + rr * Math.cos(a) * 1.25, I[1] + rr * Math.sin(a)];
      // a little jitter along the cracks, so no edge is a straight ray
      const am = (a0 + a1) / 2 + (r() - 0.5) * 0.1;
      const poly = clip(j === 0 ? [I, P(a0, rings[1]), P(am, rings[1] * 1.04), P(a1, rings[1])] : [P(a0, rings[j]), P(a0 + (r() - 0.5) * 0.05, (rings[j] + rings[j + 1]) / 2), P(a0, rings[j + 1]), P(am, rings[j + 1] * (0.96 + r() * 0.08)), P(a1, rings[j + 1]), P(a1, rings[j]), P(am, rings[j] * (0.97 + r() * 0.06))]);
      if (poly.length < 3) continue;
      const pts = poly.map(([x, y]) => d.uiToLocal(x, y));
      const c = pts.reduce((m, p) => m.add(p), new T.Vector3()).multiplyScalar(1 / pts.length);
      const shape = new T.Shape(pts.map((p) => new T.Vector2(p.x - c.x, p.y - c.y)));
      const geo = new T.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelOffset: -0.5, bevelSegments: 1 });
      geo.translate(0, 0, -1.3);
      const m = new T.Mesh(geo, glass);
      m.castShadow = false;
      m.receiveShadow = false;
      const ui = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
      const dist = Math.hypot(ui[0] - I[0], ui[1] - I[1]);
      list.push({ m, c, dist, ring: j, dir: new T.Vector2(c.x - d.uiToLocal(...I).x, c.y - d.uiToLocal(...I).y).normalize(), spin: new T.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), turns: 0.6 + r() * 2.2, out: 0.5 + r() * 1.3, lift: r() });
    }
    return list;
  }
  function props(d, scene) {
    if (!hammer) hammer = makeHammer();
    if (hammer.parent !== scene) scene.add(hammer);
    if (!shards) {
      shards = makeShards(d);
      shardGroup = new T.Group();
      for (const s of shards) shardGroup.add(s.m);
    }
    if (shardGroup.parent !== scene) scene.add(shardGroup);
  }
  // The hammer and the glass are drawn for the first few frames the Apple II is on screen, hidden
  // inside the monitor's cabinet, so their shaders (and the glass's transmission pass) are compiled
  // before the throw rather than at it.
  const warm = (M) => {
    if ((M.state.warm || 0) > 3 || !M.main) return;
    props(M.main, M.scene);
    M.state.warm = (M.state.warm || 0) + 1;
    const inside = M.main.uiToWorld(140, 96).add(new T.Vector3(0, 0, -120));
    const on = M.state.warm <= 3;
    hammer.visible = shardGroup.visible = on;
    hammer.position.copy(inside);
    hammer.scale.setScalar(on ? 0.05 : 1);
    shardGroup.position.copy(inside);
    shardGroup.scale.setScalar(on ? 0.05 : 1);
    if (!on) { shardGroup.position.set(0, 0, 0); shardGroup.scale.setScalar(1); hammer.scale.setScalar(1); }
  };
  Real.egg('1984', (api) => {
    const { t, display: d, scene, camera } = api;
    props(d, scene);
    hammer.scale.setScalar(1);
    shardGroup.position.set(0, 0, 0);
    shardGroup.scale.setScalar(1);
    d.mesh.updateWorldMatrix(true, false);
    const mw = d.mesh.matrixWorld;
    const nrm = new T.Vector3(0, 0, 1).transformDirection(mw);
    const impact = d.uiToWorld(140, 82);

    // the throw
    const fly = smooth(0.05, HIT, t);
    hammer.visible = t > 0.05 && t < HIT;
    if (hammer.visible) {
      camera.updateMatrixWorld(true);
      const cp = camera.position.clone();
      const D0 = cp.distanceTo(impact);
      const right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up = new T.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), fwd = new T.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const start = cp.clone().addScaledVector(right, -0.12 * D0).addScaledVector(up, -0.2 * D0).addScaledVector(fwd, -0.04 * D0);
      const k = 1 - Math.pow(1 - fly, 1.6);
      // the path ends with the striking face on the glass: the head's centre half a head short of it
      const dir = impact.clone().sub(start).normalize();
      const end = impact.clone().addScaledVector(dir, -76);
      const pos = start.clone().lerp(end, k).addScaledVector(up, Math.sin(Math.PI * k) * 0.08 * D0);
      // at impact the head's axis lies along the flight, face first, and the handle trails upward;
      // before that the whole hammer turns over end over end about the axis across the flight
      const X = dir.clone();
      const Y = up.clone().addScaledVector(X, -up.dot(X)).normalize().negate();
      const Z = X.clone().cross(Y);
      const qi = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X, Y, Z));
      const spin = new T.Quaternion().setFromAxisAngle(Z, (1 - k) * Math.PI * 2 * 1.25);
      hammer.quaternion.copy(spin.multiply(qi));
      hammer.position.copy(pos);
    }

    // the break
    const broken = t >= HIT;
    const after = clamp((t - HIT) / (1 - HIT), 0, 1);
    const prev = d.state.drawState || {};
    if (!!prev.broken !== broken) d.redraw();
    d.state.drawState = { broken };
    // the tube is gone: no phosphor, no glass, just light, and the Macintosh in it
    d.uniforms.uTech.value = broken ? 9 : 1;
    if (broken) {
      d.state.glass = 0;
      d.state.struct = 0;
      d.state.brightMul = (d.state.brightMul ?? 1) * (1 + 7 * Math.pow(1 - smooth(0, 0.16, after), 2));
    }
    // the shards: out from the point of impact, toward the camera, turning, falling
    const e = 1 - Math.pow(1 - smooth(0, 0.55, after), 2.2);
    shardGroup.visible = broken && after < 0.55;
    if (shardGroup.visible) {
      const q = new T.Quaternion();
      const wq = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().extractRotation(mw));
      const ex = new T.Vector3(1, 0, 0).transformDirection(mw), ey = new T.Vector3(0, 1, 0).transformDirection(mw);
      for (const s of shards) {
        const delay = Math.min(0.5, s.dist / 400);
        const ee = clamp((e - delay * 0.25) / (1 - delay * 0.25), 0, 1);
        const p = s.c.clone().applyMatrix4(mw);
        p.addScaledVector(ex, s.dir.x * (12 + s.dist * 0.9) * s.out * ee).addScaledVector(ey, s.dir.y * (12 + s.dist * 0.9) * s.out * ee);
        p.addScaledVector(nrm, (90 + 260 * s.out) * ee);
        p.y -= 140 * ee * ee * (0.4 + s.lift);
        s.m.position.copy(p);
        q.setFromAxisAngle(s.spin, s.turns * Math.PI * ee);
        s.m.quaternion.copy(q.multiply(wq));
      }
    }
  });
})();
