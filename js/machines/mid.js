// mid.js: Macintosh 128K, PowerBook 100, iMac G3, iPod, iPhone, MacBook Air. Units are centimetres.
// Each screen shows its own era, and somewhere on it the next machine is hiding.
'use strict';

(function () {
  const { add, screen, keyboard, slots, text, Icons, rr2, ell2 } = Kit;

  const shadowOp = (m, pts, dx = 6, dy = 8) =>
    m.op((p, P) => {
      const c = pts.map(P);
      p.fill('ink', c.map(([x, y]) => [x + dx * 0.5, y + dy * 0.5]));
    }, pts, false);
  const tableLine = (m, a, b) => m.op((p, P) => p.pencil([P(a), P(b)], { role: 'graphite2', w: 0.7, over: 0, lod: 1 }), [a, b], false);
  const note = (m, at, str, align = 'left') => m.op((p, P) => p.note(...P(at), str, { align }), [at], false);

  // a pointer drifting near the easter egg, as if someone were about to open it
  function pointer(ctx, s, x, y, k = 1) {
    const px = x + 8 * Math.sin(s.time * 0.9), py = y + 5 * Math.cos(s.time * 1.2);
    const pts = [[0, 0], [0, 15], [4, 11], [7, 17], [9.5, 16], [6.5, 10], [11.5, 10]].map(([a, b]) => [px + a * k, py + b * k]);
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath();
    ctx.fillStyle = s.pal.paper;
    ctx.fill();
    ctx.lineWidth = 1.2 * k;
    ctx.strokeStyle = s.pal.ink;
    ctx.stroke();
  }

  // 1-bit pictograms for period desktops, drawn in screen units centred on (x, y) at size s
  const Pict = {
    folder(p, x, y, s, role = 'ink', bg = 'paper') {
      const f = [[x - s * 0.4, y + s * 0.2], [x - s * 0.1, y + s * 0.2], [x - s * 0.02, y + s * 0.3], [x + s * 0.4, y + s * 0.3], [x + s * 0.4, y + s * 0.8], [x - s * 0.4, y + s * 0.8]];
      p.fill(bg, f, 0.5);
      p.ring(role, f, s * 0.04, 0.5);
    },
    laptop(p, x, y, s, role = 'ink', bg = 'paper') {
      p.fill(bg, rr2(x - s * 0.34, y + s * 0.08, s * 0.68, s * 0.46, s * 0.04), 0.5);
      p.ring(role, rr2(x - s * 0.34, y + s * 0.08, s * 0.68, s * 0.46, s * 0.04), s * 0.04, 0.5);
      p.ring(role, rr2(x - s * 0.26, y + s * 0.15, s * 0.52, s * 0.32, 0.5), s * 0.03, 0.5);
      const b = [[x - s * 0.4, y + s * 0.58], [x + s * 0.4, y + s * 0.58], [x + s * 0.48, y + s * 0.72], [x - s * 0.48, y + s * 0.72]];
      p.fill(bg, b, 0.5);
      p.ring(role, b, s * 0.04, 0.5);
      p.fill(role, ell2(x, y + s * 0.65, s * 0.05, s * 0.03, 10), 0.5);
    },
    imac(p, x, y, s, role = 'ink', bg = 'paper') {
      const body = [];
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        const c = Math.cos(a), sn = Math.sin(a);
        body.push([x + s * 0.4 * Math.sign(c) * Math.pow(Math.abs(c), 0.6) * (1 - 0.12 * (sn + 1) / 2), y + s * 0.42 + s * 0.38 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.7)]);
      }
      p.fill(bg, body, 0.5);
      p.ring(role, body, s * 0.04, 0.5);
      p.ring(role, rr2(x - s * 0.24, y + s * 0.14, s * 0.48, s * 0.36, s * 0.06), s * 0.035, 0.5);
      p.fill(role, rr2(x - s * 0.12, y + s * 0.64, s * 0.24, s * 0.03, 0.2), 0.5);
    },
    ipod(p, x, y, s, role = 'ink', bg = 'paper') {
      p.fill(bg, rr2(x - s * 0.26, y + s * 0.04, s * 0.52, s * 0.86, s * 0.08), 0.5);
      p.ring(role, rr2(x - s * 0.26, y + s * 0.04, s * 0.52, s * 0.86, s * 0.08), s * 0.04, 0.5);
      p.ring(role, rr2(x - s * 0.18, y + s * 0.12, s * 0.36, s * 0.26, 0.4), s * 0.03, 0.5);
      p.ring(role, ell2(x, y + s * 0.62, s * 0.17, s * 0.17, 20), s * 0.03, 0.5);
      p.fill(role, ell2(x, y + s * 0.62, s * 0.05, s * 0.05, 10), 0.5);
    },
  };

  // ---------- Macintosh 128K, 1984 ----------
  const macBeige = { base: 0.98, fill: 'tint', gap: 7, w: 1.6 };
  add({
    name: 'Macintosh 128K',
    year: '1984',
    kind: 'All-in-one',
    line: 'A 9-inch screen, a mouse and 128 KB of memory in one upright box. The team’s signatures are moulded inside the case.',
    verb: 'Find the PowerBook on its desktop',
    tint: '#ddd3ba',
    tint2: '#b9ab8e',
    view: { yaw: 24, pitch: 14 },
    fit: [700, 720],
    next: { type: 'screen', bg: 'paper' },
    make(m) {
      shadowOp(m, [[-12.3, 0, -14], [12.3, 0, -14], [12.3, 0, 13], [-12.3, 0, 13]], 10, 4);
      tableLine(m, [-26, 0, 32], [30, 0, 32]);
      const prof = [[-14, 0], [-14, 23], [-7, 34.4], [13.7, 34.4], [13.7, 3.6], [12.9, 3.6], [12.9, 0]];
      m.extrude(prof, -12.3, 12.3, macBeige, {
        mats: { e5: { base: 0.62, fill: 'tint2', gap: 5, w: 1.4 } },
        faces: {
          e1(F) { F.draw((p) => { p.fill('umber', rr2(6.2, 2.2, 12.2, 3.2, 0.8)); p.gouge('ink', [[6.6, 2.5], [17.8, 2.5]], F.px(1.6), { smooth: false }); }); },
          e3(F) {
            F.draw((p) => {
              const k = F.px(1);
              // the screen sits back in a sloped recess
              p.fill('tint2', rr2(2.2, 2.4, 20.2, 16.2, 1.3));
              p.fill('earth', [[2.2, 2.4], [22.4, 2.4], [21, 3.5], [3.6, 3.5]]);
              p.fill('ink', rr2(3.5, 3.6, 17.6, 12.4, 1.6));
              p.ring('earth', rr2(2.2, 2.4, 20.2, 16.2, 1.3), 0.9 * k, 0.5);
              // the floppy slot, and the step above the base
              p.fill('tint2', rr2(12.7, 20.6, 7.6, 1.8, 0.4));
              p.fill('ink', rr2(13.3, 21.2, 6.4, 0.55, 0.2));
              p.fill('ink', ell2(19.9, 21.95, 0.12, 0.12, 8), 1);
              p.gouge('earth', [[0.6, 26.6], [24, 26.6]], 1.1 * k, { smooth: false, taper: 0.2 });
            });
            screen(F, [4.4, 4.4, 15.8, 10.6], {
              ui: [512, 342],
              bg: 'paper',
              portal: [352, 222, 56],
              draw(p, W, H) {
                Icons.dither(p, 0, 20, W, H - 20, 4);
                Icons.menubar(p, W, ['File', 'Edit', 'View', 'Special'], 20);
                Icons.window(p, 34, 42, 258, 176, 'System Disk', { bar: 16 });
                p.text('ink', '3 items     124K in disk     276K available', 163, 68, 9, { lod: 1 });
                p.fill('ink', [[34, 76], [292, 76], [292, 77], [34, 77]], 1);
                Pict.folder(p, 90, 98, 44);
                Icons.label(p, 90, 98, 44, 'System Folder');
                Icons.disk(p, 160, 98, 44);
                Icons.label(p, 160, 98, 44, 'MacPaint');
                Icons.disk(p, 230, 98, 44);
                Icons.label(p, 230, 98, 44, 'MacWrite');
                Icons.disk(p, 470, 34, 44);
                Icons.label(p, 470, 34, 44, 'System Disk');
                Icons.trash(p, 470, 276, 44);
                Icons.label(p, 470, 276, 44, 'Trash');
                // the easter egg
                Pict.laptop(p, 380, 226, 50);
                Icons.label(p, 380, 226, 48, 'PowerBook');
              },
            });
          },
          right(F) { F.draw((p) => p.gouge('earth', [[1.2, 31], [1.2, 3]], F.px(0.9), { smooth: false, lod: 1 })); },
        },
      });
      // the coiled cord from keyboard to computer
      const coil = [];
      for (let i = 0; i <= 22; i++) coil.push([-1 + 0.8 * Math.sin(i * 1.5), 1.2 + 0.7 * Math.cos(i * 1.5), 13 + (i / 22) * 3.6]);
      m.cable(coil, 2.2);
      // the mouse and its cable round to the back
      m.cable([[21.2, 1.4, 17], [21, 1.6, 14.5], [16, 1.2, 11], [12.8, 3, 2]], 2.4);
      // the keyboard: no arrow keys, no function keys
      m.extrude([[16.5, 0], [16.5, 3.0], [30.5, 1.9], [30.5, 0]], -16, 16, macBeige, {
        faces: {
          e1(F) {
            keyboard(F, 1.6, 1.4, 28.8, 11.2, [
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
              [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
              [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2],
              [2.3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.7],
              [1.5, 1, 9, 1.5, 1.5],
            ], { cap: 'tint2', hi: 'light', shadowRole: 'earth' });
          },
        },
      });
      m.box(18.2, 0, 17, 6, 3.0, 10, macBeige, {
        r: 1.4,
        faces: { top(F) { F.draw((p) => { p.fill('tint2', rr2(0.5, 0.4, 5, 3.6, 0.6)); p.gouge('earth', [[0.4, 4.2], [5.6, 4.2]], F.px(1.2), { smooth: false }); }); } },
      });
      note(m, [-20, 0, 36], 'no fan, no expansion slots');
    },
    extras(ctx, s) { pointer(ctx, s, 404, 262); },
  });

  // ---------- PowerBook 100, 1991 ----------
  // Dark grey; the keyboard pushed back; a trackball in the middle of the palm rest; two round
  // buttons for brightness and contrast beside the screen.
  const pbGrey = { base: 0.5, dark: true, fill: 'tint', gap: 6, w: 1.5 };
  add({
    name: 'PowerBook 100',
    year: '1991',
    kind: 'Notebook',
    line: 'The keyboard moved back and the trackball moved to the centre, which set the shape of laptops for decades.',
    verb: 'Find the iMac on its desktop',
    tint: '#57544f',
    tint2: '#a7ab97',
    view: { yaw: -28, pitch: 22 },
    fit: [780, 700],
    next: { type: 'screen', bg: 'tint2' },
    make(m) {
      shadowOp(m, [[-14, 0, -10.8], [14, 0, -10.8], [14, 0, 10.8], [-14, 0, 10.8]], -4, 8);
      tableLine(m, [-30, 0, 14], [24, 0, 14]);
      m.box(-14, 0, -10.8, 28, 3.0, 21.6, pbGrey, {
        r: 0.8,
        faces: {
          top(F) {
            F.draw((p) => {
              const k = F.px(1);
              p.fill('ink', rr2(1.3, 0.7, 25.4, 10.2, 0.3));
              // the trackball well, ball and crescent button
              p.fill('ink', ell2(14, 14.6, 2.2, 2.2, 32));
              p.face(ell2(14, 14.6, 1.7, 1.7, 32), (x, y) => 0.75 - ((x - 13) + (y - 13.6)) * 0.12, { fill: 'tint', dark: true, gap: 0.22, w: 0.12, angle: 0.6, pencil: false });
              p.gouge('paper', [[13, 13.7], [13.7, 13.3], [14.4, 13.25]], 2.4 * k, { lod: 0.5 });
              const cres = [];
              for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.18 + 0.64 * (i / 12)); cres.push([14 + 3.2 * Math.cos(a), 14.6 + 3.2 * Math.sin(a)]); }
              for (let i = 12; i >= 0; i--) { const a = Math.PI * (0.22 + 0.56 * (i / 12)); cres.push([14 + 2.5 * Math.cos(a), 14.6 + 2.5 * Math.sin(a)]); }
              p.fill('ink', cres);
              p.gouge('paper', [[12.4, 18.1], [15.6, 18.1]], k, { smooth: false, lod: 1 });
              p.ring('paper', rr2(0.4, 11.6, 27.2, 9.6, 0.6), 0.6 * k, 1);
            });
            keyboard(F, 1.6, 1.0, 24.8, 9.6, [
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
              [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75],
              [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
              [1, 1, 1, 5.5, 1, 1, 1, 1, 1],
            ], { cap: 'ink', hi: 'paper', shadow: false });
          },
          front(F) { slots(F, 20.5, 1.0, 3.6, 1.2, 9, { role: 'ink' }); },
          left(F) {
            F.draw((p) => {
              p.fill('ink', rr2(4, 0.9, 4.2, 1.1, 0.2));
              p.fill('ink', ell2(10, 1.5, 0.45, 0.45, 12));
              p.fill('ink', ell2(11.6, 1.5, 0.45, 0.45, 12));
              p.fill('ink', rr2(13.4, 1.1, 1.8, 0.7, 0.2));
            });
          },
        },
      });
      // the hinge barrels
      m.cyl([-13.4, 3.55, -10.1], 0.85, 4.6, 'x', pbGrey, { edge: 1 });
      m.cyl([-8.6, 3.55, -10.1], 0.75, 17.2, 'x', { ...pbGrey, base: 0.36 }, { edge: 1 });
      m.cyl([8.8, 3.55, -10.1], 0.85, 4.6, 'x', pbGrey, { edge: 1 });
      // the lid, opened past upright
      m.rotX(-16, [0, 3.55, -10.1], () => {
        m.slab(rr2(-14, 3.6, 28, 21.4, 0.8), -10.9, -9.5, pbGrey, {
          faces: {
            front(F) {
              F.draw((p) => {
                const k = F.px(1);
                p.fill('ink', rr2(1.9, 1.7, 20.6, 15, 0.5));
                for (const x of [24, 26]) {
                  p.fill('ink', ell2(x, 15.8, 0.85, 0.85, 20));
                  p.face(ell2(x, 15.8, 0.7, 0.7, 20), 0.42, { fill: 'tint', dark: true, gap: 0.2, w: 0.1, pencil: false });
                }
                p.text('light', 'Macintosh', 3.4, 18.6, 0.7, { font: 'serif', align: 'left', lod: 0.5 });
                p.text('light', 'PowerBook 100', 3.4, 19.5, 0.36, { align: 'left', lod: 1 });
                ['tint2', 'paper', 'earth'].forEach((r, j) => p.fill(r, rr2(2.3, 18.1 + j * 0.3, 0.7, 0.22, 0.05), 1));
                p.fill('ink', rr2(12.6, 0, 2.8, 0.45, 0.15));
              });
              screen(F, [2.7, 2.4, 19, 12.9], {
                ui: [640, 434],
                bg: 'tint2',
                portal: [438, 300, 64],
                draw(p, W, H) {
                  Icons.dither(p, 0, 22, W, H - 22, 5, 'earth');
                  Icons.menubar(p, W, ['File', 'Edit', 'View', 'Label', 'Special'], 22, { bg: 'tint2' });
                  Icons.window(p, 40, 56, 320, 196, 'Macintosh HD', { bar: 18, bg: 'tint2' });
                  p.text('ink', '4 items     27.1 MB in disk     12.6 MB available', 200, 86, 10, { lod: 1 });
                  p.fill('ink', [[40, 96], [360, 96], [360, 97], [40, 97]], 1);
                  Pict.folder(p, 110, 120, 50, 'ink', 'tint2');
                  Icons.label(p, 110, 120, 50, 'System Folder', 'ink', 'tint2');
                  Pict.folder(p, 200, 120, 50, 'ink', 'tint2');
                  Icons.label(p, 200, 120, 50, 'Applications', 'ink', 'tint2');
                  Pict.folder(p, 290, 120, 50, 'ink', 'tint2');
                  Icons.label(p, 290, 120, 50, 'HyperCard', 'ink', 'tint2');
                  Icons.hd(p, 590, 40, 50, 'ink', 'tint2');
                  Icons.label(p, 590, 40, 50, 'Macintosh HD', 'ink', 'tint2');
                  Icons.trash(p, 590, 360, 50, 'ink', 'tint2');
                  Icons.label(p, 590, 360, 50, 'Trash', 'ink', 'tint2');
                  // the easter egg
                  Pict.imac(p, 470, 304, 58, 'ink', 'tint2');
                  Icons.label(p, 470, 304, 54, 'iMac', 'ink', 'tint2');
                },
              });
            },
          },
        });
      });
      note(m, [-26, 0, 18], 'built by Sony, 5.1 lb');
    },
    extras(ctx, s) { pointer(ctx, s, 506, 352, 1.2); },
  });

  // ---------- iMac G3, 1998 ----------
  // A white front with the screen, the CD tray and two speakers; a translucent Bondi Blue shell
  // that swells out behind and tapers away; a white band round the bottom.
  const ice = { base: 1.0, gap: 8, w: 1.3 };
  const bondi = { base: 0.95, fill: 'tint', gap: 7, w: 1.6 };
  add({
    name: 'iMac G3',
    year: '1998',
    kind: 'All-in-one',
    line: 'Translucent Bondi Blue plastic, a handle on top, and no floppy drive at all.',
    verb: 'Find the iPod mounted on its desktop',
    tint: '#3f8a95',
    tint2: '#6f74a6',
    view: { yaw: 34, pitch: 12 },
    fit: [760, 700],
    next: { type: 'screen', bg: 'tint2' },
    make(m) {
      shadowOp(m, [[-18, 0, -22], [18, 0, -22], [19, 0, 20], [-19, 0, 20]], 8, 4);
      tableLine(m, [-30, 0, 26], [30, 0, 26]);
      // the shell, front to back
      const rings = [
        { z: 13.5, cx: 0, cy: 20.9, w: 37.6, h: 37.2, r: 3.4 },
        { z: 6, cx: 0, cy: 20.5, w: 37.2, h: 36.4, r: 7 },
        { z: -2, cx: 0, cy: 19.5, w: 34.6, h: 33.6, r: 10 },
        { z: -10, cx: 0, cy: 17.8, w: 29.4, h: 28.6, r: 11 },
        { z: -16.5, cx: 0, cy: 15.6, w: 22.4, h: 21.8, r: 9.5 },
        { z: -21, cx: 0, cy: 13.2, w: 14.6, h: 14, r: 6.6 },
        { z: -23.4, cx: 0, cy: 11.6, w: 7, h: 7, r: 3.4 },
      ];
      m.loft(rings, bondi, { seg: 7, every: 1, meridians: 3, matAt: (c) => (c[1] < 6.4 ? ice : null) });
      m.op((p, P) => {
        // the round access door on the side, and the handle at the top
        const door = [];
        for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; door.push(P([17.4, 7.6 + 1.7 * Math.sin(a), 1 + 1.7 * Math.cos(a)])); }
        p.fill('light', door);
        p.ring('ink', door, 1.3);
        p.fill('tint', [P([17.5, 7.6, 0.2]), P([17.5, 8.4, 1]), P([17.5, 7.6, 1.8]), P([17.5, 6.8, 1])]);
        const handle = [P([-5, 39.3, 9]), P([5, 39.3, 9]), P([5, 39.6, 12.6]), P([-5, 39.6, 12.6])];
        p.fill('umber', handle);
        p.ring('ink', handle, 1);
      }, [[17.4, 7.6, 1]]);
      m.slab(rr2(-19, 2.2, 38, 37.6, 3.4), 13.5, 20.5, ice, {
        mats: { side: { base: 0.98, gap: 6, w: 1.2 } },
        faces: {
          front(F) {
            F.draw((p) => {
              const k = F.px(1);
              p.fill('tint2', rr2(3.4, 2.8, 31.2, 24.2, 2.6));
              p.fill('umber', rr2(4.1, 3.4, 29.8, 23, 2.2));
              p.ring('earth', rr2(3.4, 2.8, 31.2, 24.2, 2.6), 0.8 * k, 0.5);
              p.text('earth', 'iMac', 19, 28.4, 0.75, { font: 'serif', lod: 0.5 });
              p.ring('earth', rr2(12.4, 30.2, 13.2, 1.7, 0.4), 0.9 * k, 0.5);
              p.fill('earth', rr2(23.6, 30.7, 1.2, 0.6, 0.15), 1);
              for (const x of [2.5, 35.5]) {
                p.fill('tint', ell2(x, 33.2, 1.15, 2.1, 24));
                p.ring('ink', ell2(x, 33.2, 1.15, 2.1, 24), 0.8 * k, 0.5);
                p.dots('ink', ell2(x, 33.2, 0.8, 1.7, 20), 0.36, 0.08);
              }
              for (const x of [31.6, 32.6]) p.fill('ink', ell2(x, 34.6, 0.22, 0.22, 10), 0.5);
              p.gouge('earth', [[1, 31.9], [37, 31.9]], 0.8 * k, { smooth: false, lod: 1 });
            });
            screen(F, [4.6, 3.9, 28.8, 22], {
              ui: [400, 305],
              bg: 'tint2',
              r: 1.8,
              portal: [330, 102, 52],
              draw(p, W, H) {
                Icons.menubar(p, W, ['File', 'Edit', 'View', 'Special', 'Help'], 16, { bg: 'light' });
                Icons.window(p, 24, 40, 220, 150, 'Macintosh HD', { bar: 13, bg: 'light', stripes: true });
                Pict.folder(p, 74, 78, 38, 'ink', 'light');
                Icons.label(p, 74, 78, 38, 'System Folder', 'ink', 'light');
                Pict.folder(p, 134, 78, 38, 'ink', 'light');
                Icons.label(p, 134, 78, 38, 'Applications', 'ink', 'light');
                Pict.folder(p, 194, 78, 38, 'ink', 'light');
                Icons.label(p, 194, 78, 38, 'Documents', 'ink', 'light');
                Icons.hd(p, 356, 26, 42, 'ink', 'light');
                Icons.label(p, 356, 26, 42, 'Macintosh HD', 'light', 'tint2');
                Icons.trash(p, 356, 236, 42, 'ink', 'light');
                Icons.label(p, 356, 236, 42, 'Trash', 'light', 'tint2');
                // the easter egg: an iPod, mounted as a FireWire disk
                Pict.ipod(p, 356, 104, 48, 'ink', 'light');
                Icons.label(p, 356, 104, 46, 'iPod', 'light', 'tint2');
              },
            });
          },
        },
      });
      note(m, [-30, 0, 30], 'no floppy drive, two USB ports');
    },
    extras(ctx, s) { pointer(ctx, s, 372, 150); },
  });

  // ---------- iPod, 2001 ----------
  const white = { base: 1.0, gap: 8, w: 1.2 };
  const steel = { base: 0.86, fill: 'tint', gap: 3.2, w: 1.1 };
  add({
    name: 'iPod',
    year: '2001',
    kind: 'Music player',
    line: 'A 5 GB hard drive and a scroll wheel that really turned. A thousand songs in your pocket.',
    verb: 'Look closer at the album art',
    tint: '#c4c4bb',
    tint2: '#b9bca9',
    view: { yaw: 22, pitch: 9 },
    fit: [620, 720],
    next: { type: 'screen', bg: 'paper' },
    make(m) {
      shadowOp(m, [[-3, 0, -1], [3, 0, -1], [3, 0, 1], [-3, 0, 1]], 14, 2);
      tableLine(m, [-7, 0, 3], [9, 0, 3]);
      const outline = rr2(-3.07, 0, 6.14, 10.24, 0.85);
      m.slab(outline, -1.0, 0.1, steel, { mats: { side: steel } });
      m.slab(outline, 0.1, 1.0, white, {
        mats: { side: { base: 1.0, gap: 5, w: 1 } },
        faces: {
          front(F) {
            F.draw((p) => {
              const k = F.px(1);
              p.fill('umber', rr2(0.82, 0.78, 4.5, 3.46, 0.16));
              const wheel = ell2(3.07, 6.85, 2.05, 2.05, 64);
              p.face(wheel, (x, y) => 0.98 - Math.max(0, (x - 3) + (y - 6.8)) * 0.06, { hatch: false, pencil: false });
              p.rings('ink', 3.07, 6.85, 2.05, 2.05, { n: 6, from: 0.45, to: 0.95, w: 1.4 * k, tone: (x, y) => Math.max(0, Math.min(1, ((x - 3.07) + (y - 6.85)) / 2.6)) });
              p.ring('ink', wheel, 1.3 * k, 0.5);
              p.face(ell2(3.07, 6.85, 0.78, 0.78, 40), 0.97, { hatch: false, pencil: false });
              p.ring('ink', ell2(3.07, 6.85, 0.78, 0.78, 40), 1.1 * k, 0.5);
              p.text('earth', 'MENU', 3.07, 5.2, 0.32, { lod: 0.5, weight: 600, track: 0.03 });
              const tri = (x, y, d) => p.fill('earth', [[x, y - 0.13], [x + 0.2 * d, y], [x, y + 0.13]], 0.5);
              tri(1.45, 6.85, -1); tri(1.62, 6.85, -1); p.fill('earth', rr2(1.2, 6.72, 0.05, 0.26, 0.01), 0.5);
              tri(4.69, 6.85, 1); tri(4.52, 6.85, 1); p.fill('earth', rr2(4.9, 6.72, 0.05, 0.26, 0.01), 0.5);
              tri(2.95, 8.5, 1); p.fill('earth', rr2(3.22, 8.37, 0.06, 0.26, 0.01), 0.5); p.fill('earth', rr2(3.33, 8.37, 0.06, 0.26, 0.01), 0.5);
            });
            screen(F, [1.0, 0.95, 4.14, 3.1], {
              ui: [160, 120],
              bg: 'tint2',
              portal: [8, 22, 62],
              draw(p, W, H) {
                // Now Playing: the song from the first iPod advert, with an album cover you can fall into
                p.text('ink', 'Now Playing', W / 2, 7, 8, { weight: 600, lod: 0.5 });
                p.fill('ink', [[4, 13], [W - 4, 13], [W - 4, 14], [4, 14]], 0.5);
                p.fill('ink', rr2(W - 20, 4, 12, 6, 1), 0.5);
                p.text('ink', '1 of 12', 14, 7, 6, { lod: 1, align: 'left' });
                // the album art, and on it the next machine
                p.fill('paper', [[8, 22], [70, 22], [70, 84], [8, 84]], 0.5);
                p.ring('ink', [[8, 22], [70, 22], [70, 84], [8, 84]], 1, 0.5);
                p.fill('ink', rr2(29, 29, 20, 39, 4), 0.5);
                p.fill('earth', rr2(31.5, 35, 15, 25, 0.6), 0.5);
                p.ring('paper', ell2(39, 63.5, 2.2, 2.2, 12), 0.7, 0.5);
                p.fill('paper', rr2(36.5, 31.5, 5, 0.9, 0.4), 0.5);
                p.text('ink', 'Take California', 76, 34, 8.5, { weight: 600, align: 'left', lod: 0.5 });
                p.text('ink', 'Propellerheads', 76, 47, 7.5, { align: 'left', lod: 0.5 });
                p.text('ink', 'Decksandrumsand…', 76, 59, 6.5, { align: 'left', lod: 1 });
                p.ring('ink', [[8, 96], [152, 96], [152, 102], [8, 102]], 0.9, 0.5);
              },
            });
          },
        },
      });
      // the top edge: hold switch, FireWire port and headphone socket
      m.op((p, P) => {
        const top = (x0, x1, z0, z1) => [P([x0, 10.24, z0]), P([x1, 10.24, z0]), P([x1, 10.24, z1]), P([x0, 10.24, z1])];
        p.fill('ink', top(-2.4, -1.4, -0.3, 0.3));
        p.fill('light', top(-2.3, -1.9, -0.2, 0.2));
        p.fill('ink', top(0.3, 1.5, -0.25, 0.25));
        p.fill('ink', [0, 1, 2, 3, 4, 5, 6, 7].map((i) => P([2.2 + 0.24 * Math.cos(i * 0.785), 10.24, 0.24 * Math.sin(i * 0.785)])));
      }, [[0, 10.24, 0]]);
      // the white earbuds
      m.cable([[2.2, 10.3, 0], [2.6, 12.4, 0.2], [3.9, 13.4, 0.4], [5.2, 12.6, 0.5], [5.6, 10.6, 0.6], [5.5, 9.0, 0.7]], 5.5, { core: 'light' });
      m.cable([[5.5, 9.0, 0.7], [6.3, 7.8, 0.9], [6.8, 6.6, 1.0]], 4.8, { core: 'light' });
      m.cable([[5.5, 9.0, 0.7], [5.1, 7.6, 1.2], [4.9, 6.4, 1.5]], 4.8, { core: 'light' });
      m.op((p, P) => {
        for (const c of [[6.8, 6.1, 1.0], [4.9, 5.9, 1.5]]) {
          const [x, y] = P(c);
          const r = 0.62 * m.s;
          p.face(ell2(x, y, r, r, 28), (px, py) => 1 - Math.max(0, (px - x) + (py - y)) / (r * 6), { gap: 4, w: 1.2 });
          p.ring('ink', ell2(x, y, r, r, 28), 1.6);
          p.dots('ink', ell2(x, y, r * 0.55, r * 0.55, 18), 5, 1.1);
        }
      }, [[6.8, 5.4, 1], [4.9, 5.2, 1.5]]);
      m.op((p, P) => {
        p.dim(...P([-4.4, 0, 0]), ...P([-4.4, 10.24, 0]), '4 in', { off: -12 });
        p.note(...P([7.6, 2.6, 1]), '5 GB, 1,000 songs');
      }, [[-4.4, 0, 0]]);
    },
    extras(ctx, s) {
      // the song plays on
      const f = (s.time / 60 + 0.2) % 1;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.pal.ink;
      ctx.fillRect(9, 97, 142 * f, 4);
      ctx.font = `500 6px ${Ink.FONTS.mono}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const sec = Math.floor(f * 60 * 6);
      ctx.fillText(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, 8, 110);
      ctx.beginPath();
      ctx.moveTo(146, 106); ctx.lineTo(152, 110); ctx.lineTo(146, 114); ctx.closePath();
      ctx.fill();
    },
  });

  // ---------- iPhone, 2007 ----------
  const glass = { base: 0.16, dark: true, fill: 'ink', gap: 10, w: 1.0 };
  const alu = { base: 0.88, fill: 'tint', gap: 3, w: 1.0 };
  const apps = ['Text', 'Calendar', 'Photos', 'Camera', 'YouTube', 'Stocks', 'Maps', 'Weather', 'Clock', 'Calculator', 'Notes', 'Settings'];
  add({
    name: 'iPhone',
    year: '2007',
    kind: 'Phone',
    line: 'A widescreen iPod, a phone and an internet communicator in one. The clocks in every ad read 9:41.',
    verb: 'Open Mail',
    tint: '#a9a49b',
    tint2: '#6f8fb4',
    view: { yaw: 20, pitch: 7 },
    fit: [600, 740],
    next: { type: 'screen', bg: 'tint2' },
    make(m) {
      shadowOp(m, [[-3, 0, -0.6], [3, 0, -0.6], [3, 0, 0.6], [-3, 0, 0.6]], 16, 2);
      tableLine(m, [-7, 0, 2], [9, 0, 2]);
      m.box(1.6, 11.42, -0.25, 1.0, 0.14, 0.5, alu);
      m.slab(rr2(-3.05, 0, 6.1, 11.5, 0.95), -0.58, 0.58, glass, {
        mats: { side: alu },
        faces: {
          front(F) {
            F.draw((p) => {
              const k = F.px(1);
              p.ring('light', rr2(0.03, 0.03, 6.04, 11.44, 0.93), 2.6 * k, 0);
              p.ring('ink', rr2(0.12, 0.12, 5.86, 11.26, 0.86), 0.9 * k, 0.5);
              p.fill('earth', rr2(2.45, 0.98, 1.2, 0.2, 0.1), 0.5);
              p.ring('earth', ell2(3.05, 10.45, 0.52, 0.52, 28), 1.6 * k, 0.5);
              p.ring('earth', rr2(2.86, 10.26, 0.38, 0.38, 0.08), 0.8 * k, 1);
            });
            screen(F, [0.55, 1.75, 5.0, 7.5], {
              ui: [320, 480],
              bg: 'ink',
              portal: [92, 402, 57],
              draw(p, W, H) {
                p.text('light', '9:41 AM', W / 2, 10, 11, { weight: 600, lod: 0.5 });
                for (let i = 0; i < 5; i++) p.fill('light', [[6 + i * 4, 15 - i * 2], [8.6 + i * 4, 15 - i * 2], [8.6 + i * 4, 17], [6 + i * 4, 17]], 0.5);
                p.fill('light', rr2(W - 28, 5, 20, 10, 2), 0.5);
                const icon = (x, y, i, name, role) => {
                  p.fill(role, rr2(x, y, 57, 57, 11), 0.5);
                  p.text('light', name, x + 28.5, y + 66, 9, { lod: 1 });
                };
                apps.forEach((n, i) => icon(16 + (i % 4) * 76, 30 + Math.floor(i / 4) * 88, i, n, ['tint', 'earth', 'umber', 'tint2'][i % 4]));
                // a few glyphs, so the icons read
                p.text('ink', 'Tuesday', 16 + 76 + 28.5, 30 + 12, 8, { lod: 1 });
                p.text('ink', '9', 16 + 76 + 28.5, 30 + 36, 26, { weight: 600, lod: 0.5 });
                p.ring('light', ell2(16 + 0 * 76 + 28.5, 206 + 28.5, 20, 20, 24), 2, 1);
                // the dock
                p.fill('umber', [[0, 392], [W, 392], [W, H], [0, H]], 0.5);
                ['Phone', 'Mail', 'Safari', 'iPod'].forEach((n, i) => icon(16 + i * 76, 402, i, n, ['tint', 'tint2', 'earth', 'tint'][i]));
                // the easter egg: the Mail envelope
                const ex = 92, ey = 402;
                p.fill('light', rr2(ex + 9, ey + 15, 39, 27, 2), 0.5);
                p.gouge('ink', [[ex + 10, ey + 16], [ex + 28.5, ey + 31], [ex + 47, ey + 16]], 1.6, { smooth: false, lod: 0.5 });
              },
            });
          },
        },
      });
      m.op((p, P) => {
        p.dim(...P([4.4, 0, 0.6]), ...P([4.4, 11.5, 0.6]), '4.5 in', { off: 12 });
        p.note(...P([-9, 1.6, 0]), 'one button');
      }, [[4.4, 0, 0]]);
    },
  });

  // ---------- MacBook Air, 2008 ----------
  // Aluminium, tapering from 0.76 inches to 0.16, lying on the interoffice envelope it came out of.
  const air = { base: 0.95, gap: 7, w: 1.3 };
  add({
    name: 'MacBook Air',
    year: '2008',
    kind: 'Notebook',
    line: 'Pulled out of an interoffice envelope on stage. 0.76 inches at its thickest point.',
    verb: 'Open Time Machine in the Dock',
    tint: '#c9a86e',
    tint2: '#6f6aa6',
    view: { yaw: -24, pitch: 24 },
    fit: [800, 680],
    next: { type: 'screen', bg: 'ink' },
    make(m) {
      // the envelope, on the table under the laptop
      const a = (-9 * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      const env = [[-21, -15], [19, -15], [19, 15], [-21, 15]].map(([x, z]) => [x * ca - z * sa + 2, 0.02, x * sa + z * ca + 2]);
      m.flat(env, { base: 0.98, fill: 'tint', gap: 9, w: 1.2 }, {
        edge: 1.4,
        deco(F) {
          F.draw((p) => {
            const k = F.px(1);
            for (let r = 0; r < 8; r++) p.gouge('earth', [[2, 18 + r * 1.4], [38, 18 + r * 1.4]], 0.8 * k, { smooth: false, taper: 0.4, lod: 1 });
            for (const x of [14, 26]) p.gouge('earth', [[x, 18], [x, 28]], 0.8 * k, { smooth: false, lod: 1 });
            for (let r = 0; r < 7; r++) for (const x0 of [2.6, 14.6, 26.6]) {
              const pts = [];
              const len = 4 + ((r * 37 + x0 * 3) % 6);
              for (let i = 0; i <= 8; i++) pts.push([x0 + (len * i) / 8, 18.9 + r * 1.4 + 0.18 * Math.sin(i * 2.1 + r)]);
              p.pencil(pts, { curve: true, role: 'graphite', w: 0.9 * k, over: 0, lod: 1 });
            }
            for (let r = 0; r < 4; r++) for (const x of [1.2, 38.8]) {
              p.fill('paper', ell2(x, 3 + r * 6, 0.5, 0.5, 14));
              p.ring('ink', ell2(x, 3 + r * 6, 0.5, 0.5, 14), 0.8 * k, 0.5);
            }
            p.fill('paper', ell2(36, 28.4, 0.8, 0.8, 18));
            p.ring('ink', ell2(36, 28.4, 0.8, 0.8, 18), 1.2 * k);
            p.gouge('ink', [[36, 28.4], [37.6, 27.4], [38.4, 28.8], [37, 29.6], [36.1, 28.6]], 1.4 * k, { taper: 0.3 });
          });
        },
      });
      shadowOp(m, [[-16, 0, -11], [16, 0, -11], [16, 0, 11], [-16, 0, 11]], -3, 4);
      m.box(-16.25, 0, -11.35, 32.5, 1.94, 22.7, air, {
        hf: 0.4,
        r: 1.4,
        faces: {
          top(F) {
            keyboard(F, 3.3, 1.4, 25.9, 10.4, [
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
              [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75],
              [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
              [1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
            ], { cap: 'ink', hi: 'earth', shadow: false });
            F.draw((p) => {
              p.fill('light', rr2(10.4, 13.2, 11.7, 8.0, 0.4));
              p.ring('ink', rr2(10.4, 13.2, 11.7, 8.0, 0.4), F.px(1.2), 0.5);
            });
          },
        },
      });
      m.box(-12, 1.6, -11.4, 24, 0.5, 0.5, { base: 0.25, dark: true, fill: 'ink', gap: 3, w: 1 });
      m.rotX(-22, [0, 1.9, -11.1], () => {
        m.slab(rr2(-16.25, 1.94, 32.5, 21.6, 1.2), -11.35, -10.95, air, {
          faces: {
            front(F) {
              F.draw((p) => {
                p.fill('ink', rr2(0.55, 0.55, 31.4, 20.5, 0.7));
                p.fill('earth', ell2(16.25, 0.92, 0.12, 0.12, 10), 1);
                p.text('earth', 'MacBook Air', 16.25, 20.5, 0.42, { lod: 1 });
              });
              screen(F, [1.3, 1.3, 29.9, 18.7], {
                ui: [320, 200],
                bg: 'ink',
                portal: [196, 167, 18],
                draw(p, W, H) {
                  // Leopard: the aurora, the menu bar, the reflective Dock
                  for (let i = 0; i < 9; i++) {
                    const pts = [];
                    for (let k = 0; k <= 12; k++) pts.push([-10 + k * 30, 70 + i * 9 + 26 * Math.sin(k * 0.55 + i * 0.4) - k * 2]);
                    p.gouge(i % 2 ? 'tint2' : 'tint', pts, 6 - i * 0.4, { taper: 0.1, lod: 0.5 });
                  }
                  p.fill('light', [[0, 0], [W, 0], [W, 8], [0, 8]], 0.5);
                  p.text('ink', 'Finder   File   Edit   View   Go   Window   Help', 12, 4.2, 4.6, { align: 'left', lod: 1 });
                  const shelf = [[52, 178], [268, 178], [282, 196], [38, 196]];
                  p.fill('umber', shelf, 0.5);
                  p.ring('light', shelf, 0.8, 0.5);
                  const names = ['Finder', 'Mail', 'Safari', 'iChat', 'iTunes', 'iPhoto', 'TimeMachine', 'Preferences', 'Trash'];
                  names.forEach((n, i) => {
                    const x = 62 + i * 22, y = 167;
                    if (n === 'TimeMachine') return;
                    p.fill(['tint', 'paper', 'tint2', 'light'][i % 4], rr2(x, y, 18, 18, 3), 0.5);
                  });
                  // the easter egg: Time Machine, a clock turning backwards
                  const cx = 205, cy = 176;
                  p.fill('tint', ell2(cx, cy, 9, 9, 28), 0.5);
                  p.ring('light', ell2(cx, cy, 7, 7, 28), 1, 0.5);
                  p.gouge('light', [[cx, cy], [cx, cy - 5.5]], 1.2, { smooth: false, lod: 0.5 });
                  p.gouge('light', [[cx, cy], [cx + 3.8, cy + 1.5]], 1.2, { smooth: false, lod: 0.5 });
                },
              });
            },
          },
        });
      });
      m.op((p, P) => p.note(...P([17, 0.4, 12]), '0.16 in at the front'), [[17, 0.4, 12]]);
    },
  });
})();
