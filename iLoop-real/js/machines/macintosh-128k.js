// macintosh-128k.js: Macintosh 128K, 1984. EXEMPLAR: finished to final fidelity, and the model for
// how a machine file is written (see the README's contract).
//
// The machine: an upright beige box, 246 wide, 344 tall, 277 deep, in textured ABS. The front bezel
// is a separate moulding, so a fine seam runs round the sides and top about 40 mm back. The 9-inch
// CRT sits in a recess in the upper front; the chin below holds the floppy slot and the rainbow logo.
// The base is stepped in at the front, the carrying handle is a recess in the top at the back, and
// the back slopes down over the tube's neck, with vent slots. In front: the M0110 keyboard (no arrow
// or function keys) on its coiled cord, and the M0100 mouse with its one wide button.
//
// The screen: MacPaint at 512 × 342 in one bit, the PowerBook 100 in its drawing window, dithered
// as MacPaint would show a picture. The portal is the drawing window.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;

  const BEIGE = '#d9d0b6';
  const KEYCAP = '#d9d0b8';

  // ---------- MacPaint, in one bit ----------
  const B = '#000', Wt = '#fff';
  const CHICAGO = 'Chicago, ChicagoFLF, "Geneva", "Helvetica Neue", Helvetica, Arial, sans-serif';
  // the tools, two columns of ten
  const TOOLS = ['select', 'lasso', 'grabber', 'text', 'bucket', 'spray', 'brush', 'pencil', 'line', 'eraser', 'rect', 'rectF', 'rrect', 'rrectF', 'oval', 'ovalF', 'free', 'freeF', 'poly', 'polyF'];
  function toolIcon(g, name, x, y, on) {
    const ink = on ? Wt : B;
    const L = (a, b, c, d) => Pix.line(g, x + a, y + b, x + c, y + d, ink);
    const R = (a, b, w, h) => Pix.frame(g, x + a, y + b, w, h, ink);
    const F = (a, b, w, h) => Pix.rect(g, x + a, y + b, w, h, ink);
    switch (name) {
      case 'select': for (let i = 0; i < 14; i += 2) { F(5 + i, 4, 1, 1); F(5 + i, 13, 1, 1); } for (let i = 0; i < 10; i += 2) { F(5, 4 + i, 1, 1); F(19, 4 + i, 1, 1); } break;
      case 'lasso': g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); g.ellipse(x + 12.5, y + 8, 7, 4.5, 0, 0, Math.PI * 2); g.stroke(); L(9, 12, 7, 15); Pix.threshold(g, x, y, 25, 19, 0.5, on ? [255, 255, 255] : [0, 0, 0], on ? [0, 0, 0] : [255, 255, 255]); break;
      case 'grabber': R(9, 5, 8, 10); for (const c of [10, 12, 14]) L(c, 3, c, 7); break;
      case 'text': Pix.bitText(g, 'A', x + 12.5, y + 14, { size: 14, color: ink, font: 'Times, "Times New Roman", serif', align: 'center' }); break;
      case 'bucket': R(8, 6, 8, 9); L(16, 7, 19, 11); F(19, 11, 1, 3); break;
      case 'spray': R(10, 7, 5, 9); F(11, 4, 3, 3); for (const [a, b] of [[17, 3], [19, 5], [18, 7], [20, 2], [21, 6]]) F(a, b, 1, 1); break;
      case 'brush': L(8, 15, 14, 8); L(9, 15, 15, 8); F(14, 4, 4, 5); break;
      case 'pencil': L(7, 15, 16, 5); L(8, 15, 17, 5); L(7, 14, 16, 4); F(6, 15, 2, 1); break;
      case 'line': L(6, 15, 19, 3); break;
      case 'eraser': R(7, 5, 11, 9); L(7, 8, 18, 8); break;
      case 'rect': R(5, 4, 15, 11); break;
      case 'rectF': F(5, 4, 15, 11); break;
      case 'rrect': case 'rrectF': case 'oval': case 'ovalF': case 'free': case 'freeF': case 'poly': case 'polyF': {
        g.save();
        g.translate(x, y);
        g.beginPath();
        if (name.startsWith('rrect')) Pix.rrect(g, 5.5, 4.5, 14, 10, 4);
        else if (name.startsWith('oval')) g.ellipse(12.5, 9.5, 7.5, 5.5, 0, 0, Math.PI * 2);
        else if (name.startsWith('free')) { g.moveTo(6, 12); g.bezierCurveTo(6, 2, 14, 16, 19, 5); g.bezierCurveTo(22, 12, 12, 17, 6, 12); }
        else { g.moveTo(6, 14); g.lineTo(9, 4); g.lineTo(19, 6); g.lineTo(16, 15); g.closePath(); }
        if (name.endsWith('F')) { g.fillStyle = ink; g.fill(); } else { g.strokeStyle = ink; g.lineWidth = 1; g.stroke(); }
        g.restore();
        Pix.threshold(g, x + 1, y + 1, 23, 17, 0.5, on ? [255, 255, 255] : [0, 0, 0], on ? [0, 0, 0] : [255, 255, 255]);
        break;
      }
    }
  }
  // MacPaint's patterns along the foot
  const PATTERNS = ['black', 'dkGray', 'gray', 'ltGray', 'white', 'desk', 'diag', 'diag2', 'hlines', 'vlines', 'brick', 'weave', 'dots', 'scales', 'grid', 'waves', 'checker', 'shingle', 'dkGray',
    'ltGray', 'hlines', 'brick', 'dots', 'weave', 'gray', 'diag2', 'checker', 'grid', 'scales', 'vlines', 'waves', 'desk', 'diag', 'shingle', 'black', 'white', 'gray', 'dots'];
  function macPaint(g, s) {
    const W = s.W, H = s.H;
    Pix.rect(g, 0, 0, W, H, Wt);
    // the menu bar, with the black Apple menu
    Pix.rect(g, 0, 19, W, 1, B);
    Pix.apple(g, 17, 9.5, 13, { color: B });
    Pix.threshold(g, 9, 2, 16, 16);
    let x = 34;
    for (const m of ['File', 'Edit', 'Goodies', 'Font', 'FontSize', 'Style']) {
      x += Pix.bitText(g, m, x, 14, { size: 12, font: CHICAGO, weight: 700, thr: 0.42 }) + 13;
    }
    // the tool palette
    TOOLS.forEach((t, i) => {
      const tx = 8 + (i % 2) * 25, ty = 24 + Math.floor(i / 2) * 19;
      const on = t === 'pencil';
      Pix.rect(g, tx, ty, 26, 20, on ? B : Wt);
      Pix.frame(g, tx, ty, 26, 20, B);
      toolIcon(g, t, tx + 1, ty + 1, on);
    });
    // line widths, the current one checked
    Pix.frame(g, 8, 220, 51, 64, B);
    [1, 2, 3, 4, 6].forEach((w, i) => {
      Pix.rect(g, 22, 228 + i * 11, 30, w, B);
      if (i === 1) { Pix.line(g, 12, 229 + i * 11, 14, 231 + i * 11, B); Pix.line(g, 14, 231 + i * 11, 18, 226 + i * 11, B); }
    });
    // the current pattern, and the patterns
    Pix.frame(g, 8, 293, 51, 44, B);
    Pix.rect(g, 9, 294, 49, 42, Wt);
    Pix.fillPat(g, 13, 298, 41, 34, 'gray', B, Wt);
    PATTERNS.forEach((p, i) => {
      const px = 66 + (i % 19) * 23, py = 293 + Math.floor(i / 19) * 22;
      Pix.frame(g, px, py, 24, 23, B);
      Pix.fillPat(g, px + 1, py + 1, 22, 21, p, B, Wt);
    });
    // the document window: striped title bar, the close box, the title
    const wx = 66, wy = 24, ww = 440, wh = 265;
    Pix.frame(g, wx, wy, ww, wh, B);
    Pix.rect(g, wx + 1, wy + 1, ww - 2, 17, Wt);
    for (let r = 0; r < 6; r++) Pix.rect(g, wx + 2, wy + 4 + r * 2, ww - 4, 1, B);
    Pix.rect(g, wx + 9, wy + 3, 13, 13, Wt);
    Pix.frame(g, wx + 10, wy + 4, 11, 11, B);
    const title = 'PowerBook';
    const tw = Pix.textWidth(title, { size: 12, font: CHICAGO, weight: 700 });
    Pix.rect(g, wx + ww / 2 - tw / 2 - 8, wy + 2, tw + 16, 15, Wt);
    Pix.bitText(g, title, wx + ww / 2, wy + 14, { size: 12, font: CHICAGO, weight: 700, align: 'center', thr: 0.42 });
    Pix.rect(g, wx, wy + 18, ww, 1, B);
    // the drawing: transparent, so the PowerBook shows through, dithered in one bit
    g.clearRect(wx + 1, wy + 19, ww - 2, wh - 20);
    // the pointer, drifting near the drawing as if someone were about to draw on it
    const t = s.time || 0;
    Pix.arrow(g, 410 + Math.round(7 * Math.sin(t * 0.9)), 210 + Math.round(5 * Math.cos(t * 1.2)));
  }

  Real.add({
    name: 'Macintosh 128K',
    era: 'system1',
    year: '1984',
    kind: 'All-in-one',
    line: 'A 9-inch screen, a mouse and 128 KB of memory in one upright box. The team’s signatures are moulded inside the case.',
    verb: 'Zoom into the drawing in MacPaint',
    view: { yaw: 27, pitch: 15, lens: 90, fill: 0.92 },
    set: { paper: '#d8d5cf', keyDir: [-0.5, 0.8, 0.5] },
    next: { type: 'screen', look: { kind: 'mono' } },
    make(M) {
      const abs = Mat.abs(BEIGE, { rough: 0.6, grain: 0.2, bump: 0.45 });
      const absDark = Mat.abs('#cdc3a8', { rough: 0.62 });
      const ZF = 141, ZS = 101; // the front face, and the seam

      // ---- the rear case: the side profile, carried round the top and down the slope ----
      M.part('case');
      const r = (cz, cy, rad, a0, a1, n = 6) => Array.from({ length: n + 1 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / n;
        return [cz + rad * Math.cos(a), cy + rad * Math.sin(a)];
      });
      const rear = [
        [-130, 0], [128, 0], [130, 2], [130, 34], [128, 36], [ZS - 1, 36],
        [ZS - 1, 330],
        ...r(ZS - 15, 330, 14, 0, Math.PI / 2, 4).slice(1),
        [-46, 344],
        ...r(-46, 316, 28, Math.PI / 2, Math.PI / 2 + 0.82, 5).slice(1),
        [-126, 238],
        ...r(-126, 226, 12, 1.6, Math.PI, 4).slice(1),
        [-138, 8], [-130, 0],
      ];
      M.mesh(G.profile(rear, 246, 7, { bevelSeg: 6, curveSeg: 8 }), abs);
      // the carrying handle: a deep recess across the top at the back
      M.mesh(G.rbox(150, 26, 30, 9, 4), Mat.hole('#2a261f'), { pos: [0, 344 - 12, -55] });
      // vents down the slope at the back
      const vent = D.slots(18, 3.2, 26, 7.4, { depth: 2 });
      vent.position.set(0, 287.1, -96.3);
      vent.lookAt(new T.Vector3(0, 287.1 + 0.523, -96.3 - 0.852));
      M.add(vent);
      // the back: ports along the foot, the power switch, the label
      for (const [x, w] of [[-80, 22], [-45, 30], [-8, 22], [26, 22], [58, 14], [84, 10]]) M.mesh(G.rbox(w, 10, 3, 1.5), Mat.hole('#1b1916'), { pos: [x, 24, -138.6] });

      // ---- the front bezel: one moulding with the screen recess and the floppy slot cut through ----
      M.part('bezel');
      const face = G.rrect(246, 344 - 36, 9, 0, (344 + 36) / 2);
      face.holes.push(G.rrectHole(206, 166, 13, 0, 234));
      face.holes.push(G.rrectHole(100, 15, 4, 46, 108));
      M.mesh(G.extrude(face, ZF - ZS, 7, { bevelSeg: 6, curveSeg: 10 }), abs, { pos: [0, 0, ZS] });
      // inside the recess: a sloped surround, then the tube's opening
      const SC = [0, 234];
      const ring = [];
      const N = 8;
      for (let i = 0; i <= N; i++) {
        const k = i / N;
        // it starts a little outside the bezel's hole, inside the moulding below the hole's rounded
        // edge, and comes out through the hole's straight wall at an angle, and ends behind the lip, crossing its edge the same way: where
        // two surfaces run together on one outline they fight for the same depth, which the AO pass
        // draws as a dashed line round the recess
        const w = 208 - k * 16, h = 168 - k * 20, z = ZF - 8 - k * 13;
        ring.push({ w, h, r: 13.6 - k * 2.6, z });
      }
      const secs = ring.map((s) => G.rrectPts(s.w, s.h, s.r, SC[0], SC[1], 6).map((p) => new T.Vector3(p.x, p.y, s.z)));
      const funnel = new T.BufferGeometry().copy(new T.LoftGeometry(secs, { closed: true }));
      funnel.computeVertexNormals();
      const absIn = abs.clone();
      absIn.side = T.DoubleSide;
      M.mesh(funnel, absIn);
      // the flat lip round the glass
      const lip = G.rrect(196, 152, 12, 0, 0);
      lip.holes.push(G.rrectHole(190, 136, 14, 0, 0));
      M.mesh(G.extrude(lip, 4, 0.8), absDark, { pos: [SC[0], SC[1], ZF - 20] });
      // the CRT's black surround and glass
      M.mesh(G.rbox(200, 146, 6, 10), Mat.hole('#121312'), { pos: [SC[0], SC[1], ZF - 30] });
      M.screen({
        pos: [SC[0], SC[1] + 1, ZF - 24.5],
        w: 180.6, h: 120.6, glass: [192, 138], corner: 7, bulge: 5.5,
        tech: 'crt-white', ui: [512, 342],
        portal: { rect: [80, 50, 412, 232] },
        animate: 8,
        draw: macPaint,
      });
      // the floppy drive: a dark mouth in the slot, the shutter, and the eject hole beside it
      const well = G.rrect(100, 15, 4, 0, 0);
      well.holes.push(G.rrectHole(88, 3.4, 1.5, -1, 0.4));
      M.mesh(G.extrude(well, 3, 0.4), abs, { pos: [46, 108, ZF - 7.5] });
      M.mesh(G.rbox(92, 9, 20, 2), Mat.hole('#0d0c0a'), { pos: [46, 108, ZF - 18] });
      M.mesh(G.cyl(1.1, 3, 0.2, 16), Mat.hole('#0a0a0a'), { pos: [100, 108, ZF - 2.2], rot: [90, 0, 0] });
      // the rainbow logo, an inlaid badge on the chin
      const logo = D.decal(17, 21, (g, w, h) => D.drawApple(g, w / 2, h / 2, h * 0.98, { rainbow: true }), { ppm: 40, rough: 0.25, clearcoat: 0.8 });
      logo.position.set(-88, 70, ZF + 0.05);
      M.add(logo);
      // the keyboard jack, low on the front at the right
      M.mesh(G.rbox(10, 7, 3, 1.2), Mat.hole('#141210'), { pos: [100, 20, 129.4] });

      // ---- the M0110 keyboard ----
      M.part('keyboard');
      const kb = M.group({ pos: [-6, 0, 262], rot: [0, -3, 0] });
      const KW = 330, KD = 146;
      M.mesh(G.profile([[KD / 2, 0], [KD / 2, 17], [KD / 2 - 6, 21], [-KD / 2 + 4, 31], [-KD / 2, 28], [-KD / 2, 0]], KW, 4, { bevelSeg: 5 }), abs, { to: kb });
      const keys = D.keyboard([
        [[1, '`', { l2: '~' }], [1, '1', { l2: '!' }], [1, '2', { l2: '@' }], [1, '3', { l2: '#' }], [1, '4', { l2: '$' }], [1, '5', { l2: '%' }], [1, '6', { l2: '^' }], [1, '7', { l2: '&' }], [1, '8', { l2: '*' }], [1, '9', { l2: '(' }], [1, '0', { l2: ')' }], [1, '-', { l2: '_' }], [1, '=', { l2: '+' }], [2, 'Backspace']],
        [[1.5, 'Tab'], 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', [1, '[', { l2: '{' }], [1, ']', { l2: '}' }], [1.5, '\\', { l2: '|' }]],
        [[1.75, 'Caps Lock'], 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', [1, ';', { l2: ':' }], [1, "'", { l2: '"' }], [2.25, 'Return']],
        [[2.25, 'Shift'], 'Z', 'X', 'C', 'V', 'B', 'N', 'M', [1, ',', { l2: '<' }], [1, '.', { l2: '>' }], [1, '/', { l2: '?' }], [2.75, 'Shift']],
        [[1.5, 'Option'], [1.5, '⌘', { size: 3 }], [9, ''], [1.5, 'Enter'], [1.5, 'Option']],
      ], { color: KEYCAP, ink: '#2b2722', size: 2.4, weight: 500, cap: { h: 8.5, inset: 2.4, fillet: 1.3, topR: 2.2 }, rowTilt: [-4, -2, 0, 2, 4], rowLift: [0.9, 0.2, 0, 0.2, 0.9] });
      keys.position.set(0, 25, 4);
      keys.rotation.x = Math.atan2(10, KD - 10);
      kb.add(keys);
      M.state.keyboard = kb;
      // the coiled cord, from the keyboard's back to the jack on the front of the Mac
      M.mesh(G.coil([104, 6, 190], [100, 8, 140], 10, 4.2, 1.5), Mat.plastic('#c9bfa3', { rough: 0.45 }), {});
      M.mesh(G.tube([[96, 20, 190], [104, 9, 186], [104, 6, 182]], 1.6), Mat.plastic('#c9bfa3', { rough: 0.45 }), {});
      M.mesh(G.tube([[100, 8, 140], [100, 14, 134], [100, 19, 131]], 1.6), Mat.plastic('#c9bfa3', { rough: 0.45 }), {});

      // ---- the M0100 mouse ----
      M.part('mouse');
      const ms = M.group({ pos: [222, 0, 262], rot: [0, -8, 0] });
      const ML = 108, MW = 64;
      M.mesh(G.loftRR([
        { w: MW, d: ML, r: 9, y: 0 }, { w: MW, d: ML, r: 10, y: 2 }, { w: MW - 0.6, d: ML - 0.6, r: 10.5, y: 18 },
        { w: MW - 4, d: ML - 4, r: 11, y: 28 }, { w: MW - 9, d: ML - 9, r: 11, y: 32.5 }, { w: MW - 16, d: ML - 16, r: 10, y: 34 },
      ], { seg: 6 }), abs, { to: ms });
      // the button: a square-cut plate across the end the cable leaves from
      M.mesh(G.loftRR([{ w: MW - 10, d: 44, r: 3, y: 0 }, { w: MW - 10.4, d: 43.6, r: 3.2, y: 1.6 }, { w: MW - 12.5, d: 41.5, r: 3.6, y: 2.4 }], { seg: 4 }), Mat.abs('#cfc5a9', { rough: 0.5 }), { to: ms, pos: [0, 31.2, -ML / 2 + 26], rot: [-4, 0, 0] });
      M.mesh(G.rbox(MW - 9, 1.2, 1.2, 0.5), Mat.hole('#3a342b'), { to: ms, pos: [0, 32.6, -ML / 2 + 49] });
      // the mouse's cable: out of the button end, across the table and round to the back
      M.mesh(G.tube([[219, 4, 207], [217, 2.2, 190], [200, 1.9, 160], [158, 1.9, 120], [140, 1.9, 40], [136, 2.2, -60], [104, 5, -132], [70, 20, -141]], 1.7, { seg: 160 }), Mat.plastic('#c9bfa3', { rough: 0.45 }), {});
    },
  });
})();
