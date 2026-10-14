// powerbook-100.js: PowerBook 100, 1991. Built by Sony: 279 × 216 mm, 46 mm thick closed, in Apple's
// dark grey with a fine stipple. The keyboard is pushed back to the hinge; in front of it a palm rest
// with the trackball in the middle, between two curved buttons above and below it. The lid opens on
// three hinge barrels; its bezel holds the 9-inch passive-matrix screen, two thumbwheels for
// brightness and contrast, and 'Macintosh PowerBook 100' beside the rainbow Apple.
//
// The screen: System 7 at 640 × 400 in one bit, on a pale supertwist panel. MoviePlayer is open with a
// QuickTime movie, and the movie is the iMac G3, dithered as QuickTime would show it on this screen.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;

  const GREY = '#3c3c3f';
  const B = '#000', Wt = '#fff';
  const CHICAGO = 'Chicago, ChicagoFLF, Geneva, "Helvetica Neue", Helvetica, Arial, sans-serif';

  // ---------- System 7 and MoviePlayer, in one bit ----------
  // icons as bitmaps, 32 × 32 (X ink, o white)
  const HD = [
    '................................', '................................', '................................', '................................',
    '................................', '................................', '................................', '................................',
    '................................', '................................', '................................', '..XXXXXXXXXXXXXXXXXXXXXXXXXXXX..',
    '..XooooooooooooooooooooooooooX..', '..XooooooooooooooooooooooooooX..', '..XooooooooooooooooooooooooooX..', '..XooooooooooooooooooooooooooX..',
    '..XooXXooooooooooooooooooooooX..', '..XooXXooooooooooooooooooooooX..', '..XooooooooooooooooooooooooooX..', '..XooooooooooooooooooooooooooX..',
    '..XXXXXXXXXXXXXXXXXXXXXXXXXXXX..', '..X.X......................X.X..', '..XXXXXXXXXXXXXXXXXXXXXXXXXXXX..',
  ];
  const TRASH = [
    '..........XXXXXXXXX..........', '.........X.........X.........', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'X...........................X', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    '.X.........................X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.',
    '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.',
    '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.', '.X..X....X....X....X....X..X.',
    '.X.........................X.', '..XXXXXXXXXXXXXXXXXXXXXXXXX..',
  ];
  function icon(g, rows, x, y, label) {
    // white behind the icon's body so the desktop does not show through it
    rows.forEach((row, j) => {
      const a = row.indexOf('X'), b = row.lastIndexOf('X');
      if (a >= 0) Pix.rect(g, x + a, y + j, b - a + 1, 1, Wt);
    });
    Pix.bitmap(g, rows, x, y, { X: B, o: Wt });
    const w = Pix.textWidth(label, { size: 10, font: CHICAGO, weight: 400 }) + 4;
    const cx = x + rows[0].length / 2;
    Pix.rect(g, cx - w / 2, y + rows.length + 2, w, 12, Wt);
    Pix.bitText(g, label, cx, y + rows.length + 12, { size: 10, font: CHICAGO, weight: 400, align: 'center', thr: 0.45 });
  }
  function system7(g, s) {
    const W = s.W, H = s.H;
    // the desktop: the 50% grey that System 7 shipped with on a black-and-white screen
    Pix.fillPat(g, 0, 0, W, H, 'gray', B, Wt);
    // the menu bar, its rounded top corners, MoviePlayer's menus
    Pix.rect(g, 0, 0, W, 19, Wt);
    Pix.rect(g, 0, 19, W, 1, B);
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [W - 1, 0], [W - 2, 0], [W - 1, 1]]) Pix.rect(g, x, y, 1, 1, B);
    Pix.apple(g, 21, 9.5, 14, { color: B });
    Pix.threshold(g, 12, 1, 18, 17);
    let x = 42;
    for (const m of ['File', 'Edit', 'Movie']) x += Pix.bitText(g, m, x, 14, { size: 12, font: CHICAGO, weight: 700, thr: 0.42 }) + 16;
    // balloon help and the application menu at the right
    g.strokeStyle = B; g.lineWidth = 1;
    g.beginPath(); g.ellipse(W - 52.5, 8.5, 7, 5.5, 0, 0, Math.PI * 2); g.stroke();
    Pix.line(g, W - 56, 13, W - 58, 17, B);
    Pix.threshold(g, W - 62, 1, 20, 18);
    Pix.frame(g, W - 28, 3, 15, 13, B);
    Pix.rect(g, W - 25, 6, 9, 7, B);
    // the desktop icons
    icon(g, HD, W - 52, 26, 'Macintosh HD');
    icon(g, TRASH, W - 50, H - 58, 'Trash');
    // the movie window: striped title bar, close and zoom boxes, the title
    const wx = 124, wy = 46, ww = 392, wh = 318;
    Pix.rect(g, wx + 2, wy + 2, ww, wh, B); // its drop shadow
    Pix.rect(g, wx, wy, ww, wh, Wt);
    Pix.frame(g, wx, wy, ww, wh, B);
    for (let r = 0; r < 6; r++) Pix.rect(g, wx + 2, wy + 4 + r * 2, ww - 4, 1, B);
    for (const bx of [wx + 9, wx + ww - 22]) { Pix.rect(g, bx, wy + 3, 13, 13, Wt); Pix.frame(g, bx + 1, wy + 4, 11, 11, B); }
    Pix.frame(g, wx + ww - 21 + 2, wy + 6, 5, 4, B);
    const title = 'iMac.mov';
    const tw = Pix.textWidth(title, { size: 12, font: CHICAGO, weight: 700 });
    Pix.rect(g, wx + ww / 2 - tw / 2 - 7, wy + 2, tw + 14, 15, Wt);
    Pix.bitText(g, title, wx + ww / 2, wy + 14, { size: 12, font: CHICAGO, weight: 700, align: 'center', thr: 0.42 });
    Pix.rect(g, wx, wy + 18, ww, 1, B);
    // the movie: transparent, so the iMac shows through, dithered in one bit
    const MX = wx + 6, MY = wy + 24, MW = 380, MH = 268;
    Pix.frame(g, MX - 1, MY - 1, MW + 2, MH + 2, B);
    g.clearRect(MX, MY, MW, MH);
    // the movie controller under it: speaker, play, the time slider with its thumb, step buttons
    const cy = wy + wh - 16, cx0 = wx + 1;
    Pix.rect(g, cx0, cy - 9, ww - 2, 1, B);
    // the speaker
    Pix.bitmap(g, ['....X', '...XX', 'XXXoX', 'XoooX', 'XoooX', 'XXXoX', '...XX', '....X'], cx0 + 8, cy - 3, { X: B, o: Wt });
    Pix.rect(g, cx0 + 22, cy - 8, 1, 17, B);
    // play: a black triangle in its button
    for (let i = 0; i < 6; i++) Pix.rect(g, cx0 + 31 + i, cy - 5 + i, 1, 11 - 2 * i, B);
    Pix.rect(g, cx0 + 46, cy - 8, 1, 17, B);
    // the slider: a grey track, the played part filled, the thumb
    Pix.frame(g, cx0 + 54, cy - 4, 266, 9, B);
    Pix.fillPat(g, cx0 + 55, cy - 3, 264, 7, 'ltGray', B, Wt);
    Pix.rect(g, cx0 + 55, cy - 3, 92, 7, B);
    Pix.bitmap(g, ['XXXXXXX', 'XoooooX', 'XoooooX', 'XoooooX', 'XoooooX', 'XoooooX', 'XoooooX', '.XoooX.', '..XoX..', '...X...'], cx0 + 144, cy - 7, { X: B, o: Wt });
    // step back and forward
    for (const [bx, dir] of [[cx0 + 330, -1], [cx0 + 352, 1]]) {
      Pix.rect(g, bx - 3, cy - 8, 1, 17, B);
      for (let i = 0; i < 4; i++) Pix.rect(g, bx + 6 + dir * (i - 1.5) * 1, cy - i, 1, 2 * i + 1, B);
      Pix.rect(g, bx + (dir > 0 ? 11 : 1), cy - 3, 1, 7, B);
    }
    // the size box
    Pix.frame(g, wx + ww - 15, wy + wh - 15, 14, 14, B);
    Pix.frame(g, wx + ww - 12, wy + wh - 12, 7, 7, B);
    Pix.frame(g, wx + ww - 15, wy + wh - 15, 9, 9, B);
    // the pointer, drifting toward the play button
    const t = s.time || 0;
    Pix.arrow(g, cx0 + 40 + Math.round(9 * Math.sin(t * 0.8)), cy + 5 + Math.round(4 * Math.cos(t * 1.1)));
  }

  Real.add({
    name: 'PowerBook 100',
    era: 'system7',
    year: '1991',
    kind: 'Notebook',
    line: 'The keyboard moved back and the trackball moved to the centre, which set the shape of laptops for decades.',
    verb: 'Zoom into the QuickTime movie',
    view: { yaw: -24, pitch: 24, lens: 85, fill: 0.9 },
    set: { paper: '#d7d5d0', keyDir: [-0.35, 0.85, 0.5] },
    next: { type: 'screen', look: { kind: 'mono' } },
    make(M) {
      const abs = Mat.abs(GREY, { rough: 0.62, grain: 0.18, bump: 0.5, sheen: 0.25 });
      const absDark = Mat.abs('#2e2e31', { rough: 0.6 });
      const W = 279, Dd = 216, Hb = 30, R = 9;
      const Z0 = -Dd / 2;

      // ---- the base: a slab with softly rounded edges, the top a little in from the bottom ----
      M.part('base');
      M.mesh(G.loftRR([
        { w: W - 3, d: Dd - 3, r: R - 1.5, y: 0 }, { w: W - 0.4, d: Dd - 0.4, r: R - 0.2, y: 1.6 }, { w: W, d: Dd, r: R, y: 4 },
        { w: W, d: Dd, r: R, y: Hb - 4 }, { w: W - 1, d: Dd - 1, r: R - 0.5, y: Hb - 1.4 }, { w: W - 3.2, d: Dd - 3.2, r: R - 1.6, y: Hb },
      ], { seg: 6 }), abs);
      // the parting line round the sides between the top and bottom shells
      M.mesh(G.loftRR([{ w: W + 0.2, d: Dd + 0.2, r: R + 0.1, y: 10.6 }, { w: W + 0.2, d: Dd + 0.2, r: R + 0.1, y: 11.2 }], { seg: 6, capStart: false, capEnd: false }), Mat.hole('#151517'), { cast: false });
      // the keyboard well and the keys, pushed back against the hinge
      const KZ = Z0 + 18 + 48;
      M.mesh(G.rbox(262, 6, 100, 2.5, 3), Mat.hole('#141416'), { pos: [0, Hb - 2.6, KZ] });
      const keys = D.keyboard([
        [[1, 'esc', { size: 1.5 }], [1, '1', { l2: '!' }], [1, '2', { l2: '@' }], [1, '3', { l2: '#' }], [1, '4', { l2: '$' }], [1, '5', { l2: '%' }], [1, '6', { l2: '^' }], [1, '7', { l2: '&' }], [1, '8', { l2: '*' }], [1, '9', { l2: '(' }], [1, '0', { l2: ')' }], [1, '-', { l2: '_' }], [1, '=', { l2: '+' }], [1.5, 'delete', { size: 1.5 }]],
        [[1.5, 'tab', { size: 1.5 }], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', [1, '[', { l2: '{' }], [1, ']', { l2: '}' }], [1, '\\', { l2: '|' }]],
        [[1.75, 'caps lock', { size: 1.5 }], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', [1, ';', { l2: ':' }], [1, "'", { l2: '"' }], [1.75, 'return', { size: 1.5 }]],
        [[2.25, 'shift', { size: 1.5 }], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', [1, ',', { l2: '<' }], [1, '.', { l2: '>' }], [1, '/', { l2: '?' }], [2.25, 'shift', { size: 1.5 }]],
        [[1, 'control', { size: 1.25 }], [1, 'option', { size: 1.3 }], [1, '⌘', { size: 2.6 }], [1, '`', { l2: '~' }], [5.5, ''], [1, '←'], [1, '→'], [1, '↓'], [1, '↑']],
      ], { color: '#333336', ink: '#efefeb', size: 2.6, weight: 600, pitch: 18.3, align: 'tl', cap: { h: 5.5, inset: 1.6, fillet: 1.1, topR: 1.6, r: 1.2 }, rough: 0.55 });
      keys.position.set(0, Hb - 4.6, KZ);
      M.add(keys);
      // the trackball: a well, the ball, the two buttons curving round it
      const TBZ = Z0 + 168, TBR = 15.5;
      M.mesh(G.cyl(TBR + 3.4, 2, 0.6, 48), Mat.hole('#101012'), { pos: [0, Hb - 1.6, TBZ] });
      const ball = M.mesh(new T.SphereGeometry(TBR, 64, 40), Mat.plastic('#2a2a2d', { rough: 0.3, clearcoat: 0.4, bump: 0.12 }), { pos: [0, Hb - 7.5, TBZ] });
      ball.userData.noFit = true;
      // each button is a wide bar whose inner edge follows the ball's well
      for (const s of [-1, 1]) {
        const Ri = TBR + 5.2, BW2 = 37, yo = TBR + 17, yf = 7, rc = 4;
        const pts = [];
        const inner = (x) => Math.max(yf, Math.sqrt(Math.max(0, Ri * Ri - x * x)));
        for (let i = 0; i <= 40; i++) { const x = -BW2 + rc + ((2 * BW2 - 2 * rc) * i) / 40; pts.push([x, inner(x)]); }
        // the outer edge: straight across, its corners rounded
        const corner = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push([cx + rc * Math.cos(a), cy + rc * Math.sin(a)]); } };
        corner(BW2 - rc, yo - rc, 0);
        corner(-BW2 + rc, yo - rc, Math.PI / 2);
        const geo = G.extrude(new T.Shape((s < 0 ? pts.slice().reverse() : pts).map(([x, y]) => new T.Vector2(x, s * y))), 3, 1, { curveSeg: 4 });
        geo.rotateX(-Math.PI / 2);
        M.mesh(geo, Mat.abs('#46464a', { rough: 0.5 }), { pos: [0, Hb - 2.2, TBZ] });
        const gap = geo.clone();
        gap.scale(1.03, 1, 1.06);
        M.mesh(gap, Mat.hole('#121214'), { pos: [0, Hb - 2.7, TBZ], cast: false });
      }
      // a fine groove marks the palm rest off from the keyboard
      M.mesh(G.rbox(W - 22, 0.5, 0.8, 0.2), Mat.hole('#1c1c1f'), { pos: [0, Hb + 0.02, Z0 + 122], cast: false });
      // vents along the left side, the latch slot at the front, rubber feet
      const v = D.slots(9, 1.6, 7, 4.2, { depth: 0.6 });
      v.position.set(-W / 2 - 0.1, 15, -40);
      v.rotation.y = -Math.PI / 2;
      M.add(v);
      M.mesh(G.rbox(26, 3.2, 2, 1), Mat.hole('#0e0e10'), { pos: [0, Hb - 3, Dd / 2 + 0.2] });
      for (const [fx, fz] of [[-120, 92], [120, 92], [-120, -92], [120, -92]]) M.mesh(G.cyl(5, 1.4, 0.6, 20), Mat.rubber('#1a1a1a'), { pos: [fx, -1.2, fz] });

      // ---- the hinge: three barrels across the back ----
      const HY = Hb + 5.5, HZ = Z0 + 6;
      for (const [x0, x1, r] of [[-128, -86, 7.4], [-84, 84, 6.4], [86, 128, 7.4]]) {
        const g = G.cyl(r, x1 - x0, 1.6, 40);
        g.rotateZ(-Math.PI / 2);
        M.mesh(g, r > 7 ? abs : absDark, { pos: [x0, HY, HZ] });
      }

      // ---- the lid, open past upright ----
      M.part('lid');
      const lid = M.group({ pos: [0, HY, HZ], rot: [-17, 0, 0] });
      const LH = 206, LT = 13;
      // a shell with a slightly domed back, its front the bezel
      M.mesh(G.loftRR([
        { w: W - 2, d: LT - 5, r: 3.5, y: 0 }, { w: W, d: LT - 3, r: 4.5, y: 3 }, { w: W, d: LT - 3, r: 4.5, y: LH - 6 }, { w: W - 2.5, d: LT - 5, r: 3.5, y: LH - 1 }, { w: W - 7, d: LT - 8, r: 1.5, y: LH },
      ], { seg: 6 }), abs, { to: lid, pos: [0, 0, -3 - (LT - 3) / 2] });
      // the bezel: a separate moulding, its inner edge chamfered down to the screen
      const SY = 118, SW = 196, SH = 126;
      const bez = G.rrect(W - 6, LH - 10, 5, 0, LH / 2);
      bez.holes.push(G.rrectHole(SW + 10, SH + 10, 2.5, 0, SY));
      M.mesh(G.extrude(bez, 3, 0.9), abs, { to: lid, pos: [0, 0, -3] });
      const ch = [];
      for (let i = 0; i <= 3; i++) {
        const k = i / 3;
        ch.push(G.rrectPts(SW + 10 - k * 8, SH + 10 - k * 8, 2.5 - k * 1.5, 0, SY, 4).map((p) => new T.Vector3(p.x, p.y, -0.4 - k * 2.4)));
      }
      const chamf = new T.BufferGeometry().copy(new T.LoftGeometry(ch, { closed: true }));
      chamf.computeVertexNormals();
      const absIn = absDark.clone();
      absIn.side = T.DoubleSide;
      M.mesh(chamf, absIn, { to: lid });
      M.mesh(G.rbox(SW + 2, SH + 2, 1, 0.4), Mat.hole('#3f4440'), { to: lid, pos: [0, SY, -3.1] });
      M.screen({
        to: lid, pos: [0, SY, -2.5],
        w: 192, h: 120, glass: [SW, SH], tech: 'lcd-stn', ui: [640, 400],
        portal: { rect: [144, 104, 351, 200] },
        animate: 6,
        draw: system7,
      });
      // brightness and contrast thumbwheels, below the screen at the right
      for (const x of [104, 118]) {
        M.mesh(G.cyl(5.2, 2, 0.6, 32), Mat.hole('#151517'), { to: lid, pos: [x, 26, -1.8], rot: [90, 0, 0] });
        const wh = G.cyl(4.4, 3.4, 0.8, 24);
        M.mesh(wh, Mat.abs('#4a4a4e', { rough: 0.4 }), { to: lid, pos: [x, 26, -2.4], rot: [90, 0, 0] });
        M.mesh(G.rbox(0.8, 2.4, 0.6, 0.2), Mat.hole('#1b1b1d'), { to: lid, pos: [x + 2.4, 26, 1.1], cast: false });
      }
      for (const [x, s] of [[104, '☼'], [118, '◐']]) {
        const l = D.label(s, 2.4, { color: '#bdbdbd', weight: 400 });
        l.position.set(x, 18, 0.05);
        lid.add(l);
      }
      // 'Macintosh PowerBook 100' and the rainbow Apple, lower left
      const name = D.decal(78, 9, (g, w, h) => {
        D.drawApple(g, 4.2, h / 2, h * 0.86, { rainbow: true });
        g.fillStyle = '#d6d5d1';
        g.textBaseline = 'middle';
        g.font = `400 ${h * 0.52}px "Apple Garamond", Garamond, "EB Garamond", Georgia, serif`;
        g.fillText('Macintosh PowerBook 100', 10, h * 0.55);
      }, { ppm: 28, rough: 0.5 });
      name.position.set(-W / 2 + 54, 25, 0.05);
      lid.add(name);
      // the latch tab at the lid's front edge, the two bumpers on the bezel
      M.mesh(G.rbox(24, 3, 3.5, 1), absDark, { to: lid, pos: [0, LH - 4, -0.5] });
      for (const x of [-110, 110]) M.mesh(G.cyl(2.2, 1.2, 0.5, 16), Mat.rubber('#222'), { to: lid, pos: [x, LH - 8, -0.2], rot: [90, 0, 0] });
      M.state.lid = lid;
    },
  });
})();
