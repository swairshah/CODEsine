// late.js: MacBook Air (M1), Apple M1, iMac 24-inch, MacBook Pro 14-inch, Mac mini. Units are centimetres.
'use strict';

(function () {
  const { add, screen, keyboard, slots, Icons, rr2, ell2 } = Kit;

  const shadowOp = (m, pts, dx = 6, dy = 8) =>
    m.op((p, P) => {
      const c = pts.map(P);
      p.fill('ink', c.map(([x, y]) => [x + dx * 0.5, y + dy * 0.5]));
    }, pts, false);
  const tableLine = (m, a, b) => m.op((p, P) => p.pencil([P(a), P(b)], { role: 'graphite2', w: 0.7, over: 0, lod: 1 }), [a, b], false);
  const note = (m, at, str, align = 'left') => m.op((p, P) => p.note(...P(at), str, { align }), [at], false);

  // macOS since Big Sur: soft bands of colour, a menu bar, a Dock
  function modernDesktop(p, W, H, o = {}) {
    for (let i = 0; i < 7; i++) {
      const pts = [];
      for (let k = 0; k <= 12; k++) pts.push([-20 + k * (W + 40) / 12, H * (0.25 + i * 0.1) + H * 0.08 * Math.sin(k * 0.6 + i * 0.7)]);
      p.gouge(i % 2 ? 'tint' : 'tint2', pts, H * 0.08 - i * H * 0.006, { taper: 0.1, lod: 0.5 });
    }
    const mb = H * 0.035;
    p.fill('light', [[0, 0], [W, 0], [W, mb], [0, mb]], 0.5);
    p.text('ink', o.menu || 'Finder   File   Edit   View   Go   Window   Help', mb * 2.4, mb * 0.55, mb * 0.62, { align: 'left', lod: 1 });
    if (o.notch) p.fill('ink', rr2(W / 2 - W * 0.04, -2, W * 0.08, mb + 3, mb * 0.4), 0.5);
    if (o.dock !== false) {
      const dw = W * 0.5, dh = H * 0.075, dx = (W - dw) / 2, dy = H - dh - H * 0.015;
      p.fill('paper', rr2(dx, dy, dw, dh, dh * 0.3), 0.5);
      for (let i = 0; i < 10; i++) p.fill(['tint', 'tint2', 'earth', 'umber'][i % 4], rr2(dx + dh * 0.15 + i * (dw - dh * 0.3) / 10, dy + dh * 0.12, dh * 0.76, dh * 0.76, dh * 0.2), 0.5);
    }
  }

  // ---------- MacBook Air (M1), 2020 ----------
  // The same wedge as 2008, and inside it the first Apple silicon Mac chip, with no fan at all.
  // Zooming in lifts the lid and the keyboard away and drops you onto the M1.
  const silver = { base: 0.96, gap: 7, w: 1.3, sheen: 0.16 };
  const W1 = 30.41, D1 = 21.24, H1 = 1.61, F1 = 0.41;
  add({
    name: 'MacBook Air (M1)',
    year: '2020',
    kind: 'Notebook',
    line: 'The same tapered wedge, now with no fan. Inside, the first Apple silicon chip in a Mac.',
    verb: 'Go inside to the chip',
    tint: '#9c9c96',
    tint2: '#33473d',
    view: { yaw: 26, pitch: 27 },
    fit: [800, 690],
    next: { type: 'inside', align: true, bg: 'light' },
    make(m) {
      const x0 = -W1 / 2, z0 = -D1 / 2;
      const topY = (z) => H1 + ((F1 - H1) * (z - z0)) / D1;
      m.part('case');
      shadowOp(m, [[x0, 0, z0], [-x0, 0, z0], [-x0, 0, -z0], [x0, 0, -z0]], 8, 4);
      tableLine(m, [-26, 0, 14], [26, 0, 14]);
      m.box(x0, 0, z0, W1, H1, D1, silver, { hf: F1, r: 1.3, skip: ['top'] });
      // inside: the board near the hinge, the M1, speakers at the sides, six battery cells
      m.part('inside');
      m.flat([[x0 + 0.3, 0.12, z0 + 0.3], [-x0 - 0.3, 0.12, z0 + 0.3], [-x0 - 0.3, 0.12, -z0 - 0.3], [x0 + 0.3, 0.12, -z0 - 0.3]], { base: 0.4, dark: true, fill: 'ink', gap: 5, w: 1 }, { n: [0, 1, 0] });
      m.box(x0 + 6, 0.12, z0 + 1.4, 18.4, 0.12, 7.2, { base: 0.92, fill: 'tint2', gap: 5, w: 1.1, shade: false }, {
        faces: {
          top(F) {
            F.draw((p) => {
              for (let i = 0; i < 9; i++) p.fill('warm', rr2(1 + i * 1.8, 6.2, 0.6, 0.3, 0.05), 1);
              p.text('light', 'APPLE M1', 3.4, 1.0, 0.36, { lod: 2 });
            });
          },
        },
      });
      for (const [x, z] of [[x0 + 8, z0 + 2.4], [x0 + 19.6, z0 + 2.4], [x0 + 20.2, z0 + 5.6]]) m.box(x, 0.24, z, 1.6, 0.14, 1.2, { base: 0.3, dark: true, fill: 'ink', gap: 3, w: 1 });
      m.box(-1.7, 0.24, z0 + 2.4, 3.4, 0.16, 2.64, { base: 0.95, gap: 4, w: 1 }, {
        faces: { top(F) { F.model.mark('chip', F, 0, 0, F.w, F.h); F.draw((p) => p.text('ink', 'M1', 1.7, 1.32, 0.7, { weight: 600, lod: 1 })); } },
      });
      for (const x of [x0 + 0.9, -x0 - 4.1]) m.box(x, 0.12, z0 + 1.4, 3.2, 0.5, 7.4, { base: 0.4, dark: true, fill: 'ink', gap: 3, w: 1 }, { faces: { top(F) { F.draw((p) => p.dots('earth', rr2(0.3, 0.3, 2.6, 6.8, 0.2), 0.45, 0.1)); } } });
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        m.box(x0 + 2 + c * 9.0, 0.12, z0 + 9.6 + r * 5.2, 8.4, 0.28, 4.8, { base: 0.97, fill: 'warm', gap: 6, w: 1.1 }, {
          faces: { top(F) { F.draw((p) => p.text('earth', 'Li-ion polymer', 4.2, 2.4, 0.42, { lod: 2 })); } },
        });
      }
      // the keyboard deck, which lifts off
      m.part('deck', { peel: [0.08, 0.34], lift: [0, -260] });
      const plan = rr2(x0, z0, W1, D1, 1.3, 5);
      const L = Math.hypot(D1, F1 - H1);
      m.flat(plan.map(([px, pz]) => [px, topY(pz), pz]), silver, {
        n: V3.norm([0, D1, -(F1 - H1)]),
        frame: { o: [x0, H1, z0], U: [1, 0, 0], V: [0, (F1 - H1) / L, D1 / L], w: W1, h: L },
        edge: 1.1,
        deco(F) {
          F.draw((p) => p.fill('ink', rr2(2.5, 1.2, W1 - 5, 10.6, 0.4)));
          keyboard(F, 2.8, 1.4, W1 - 5.6, 10.2, [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
            [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75],
            [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
            [1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
          ], { cap: 'ink', hi: 'earth', shadow: false });
          F.draw((p) => {
            p.ring('earth', rr2(W1 - 3.85, 1.6, 1.0, 0.7, 0.1), F.px(1), 1);
            p.fill('light', rr2(8.6, 12.7, 13.2, 8.2, 0.5));
            p.ring('ink', rr2(8.6, 12.7, 13.2, 8.2, 0.5), F.px(1.2), 0.5);
          });
        },
      });
      // the lid, which swings away first
      m.part('lid', { peel: [0.0, 0.24], lift: [0, -420] });
      m.box(-10, H1 - 0.1, z0 - 0.3, 20, 0.5, 0.6, { base: 0.25, dark: true, fill: 'ink', gap: 3, w: 1 });
      m.rotX(-24, [0, H1, z0 + 0.2], () => {
        m.slab(rr2(x0, H1, W1, 20.2, 1.1), z0 - 0.15, z0 + 0.32, silver, {
          faces: {
            front(F) {
              F.draw((p) => {
                p.fill('ink', rr2(0.4, 0.4, W1 - 0.8, 19.4, 0.8));
                p.fill('earth', ell2(W1 / 2, 0.75, 0.1, 0.1, 10), 1);
                p.text('earth', 'MacBook Air', W1 / 2, 19.35, 0.36, { lod: 1 });
              });
              screen(F, [1.0, 1.1, W1 - 2.0, 17.6], { ui: [320, 197], bg: 'tint2', draw: (p, W, H) => modernDesktop(p, W, H) });
            },
          },
        });
      });
      note(m, [-22, 0, 16], 'no fan: the M1 runs cool enough');
    },
  });

  // ---------- Apple M1, 2020 ----------
  // The package: a silver lid over the processor, two memory packages beside it, a dark green
  // substrate dotted with capacitors. Zoom into the lid and an iMac, which used the same chip,
  // assembles around it.
  add({
    name: 'Apple M1',
    year: '2020',
    kind: 'System on a chip',
    line: '16 billion transistors on a 5 nm die, with the memory sitting beside it on the same package.',
    verb: 'Zoom into the chip',
    tint: '#2f4a3c',
    tint2: '#2b2a28',
    view: { yaw: 16, pitch: 58 },
    fit: [780, 640],
    next: { type: 'assemble' },
    make(m) {
      shadowOp(m, [[-2.2, 0, -1.7], [2.2, 0, -1.7], [2.2, 0, 1.7], [-2.2, 0, 1.7]], 8, 10);
      m.box(-2.2, 0, -1.7, 4.4, 0.12, 3.4, { base: 0.9, fill: 'tint', gap: 6, w: 1.1, shade: false }, {
        faces: {
          top(F) {
            F.model.mark('self', F, 0, 0, F.w, F.h);
            F.draw((p) => {
              for (let i = 0; i < 22; i++) {
                p.fill('warm', rr2(0.25 + i * 0.18, 0.06, 0.08, 0.12, 0.02), 0.5);
                p.fill('warm', rr2(0.25 + i * 0.18, 3.22, 0.08, 0.12, 0.02), 0.5);
              }
              for (let i = 0; i < 16; i++) p.fill('warm', rr2(0.06, 0.25 + i * 0.18, 0.12, 0.08, 0.02), 0.5);
              p.ring('warm', ell2(4.25, 0.16, 0.06, 0.06, 10), F.px(0.8), 1);
            });
          },
        },
      });
      for (const z of [-1.5, 0.08]) {
        m.box(0.78, 0.12, z, 1.24, 0.15, 1.42, { base: 0.32, dark: true, fill: 'tint2', gap: 3, w: 1 }, {
          faces: { top(F) { F.draw((p) => p.dots('earth', rr2(0.05, 0.05, 1.14, 1.32, 0.05), 0.06, 0.012)); } },
        });
      }
      m.part('focus');
      m.box(-2.0, 0.12, -1.5, 2.55, 0.16, 3.0, { base: 0.97, gap: 3, w: 0.9, edge: 1.3 }, {
        faces: {
          top(F) {
            F.model.mark('focus', F, 0, 0, F.w, F.h);
            F.draw((p) => {
              const k = F.px(1);
              p.ring('earth', rr2(0.12, 0.12, 2.31, 2.76, 0.12), 0.8 * k, 1);
              p.fill('earth', ell2(2.1, 0.4, 0.08, 0.08, 10), 0.5);
              p.text('earth', 'M1', 1.27, 1.2, 0.62, { weight: 600, lod: 0.5 });
              p.text('earth', 'APL1102  339S00818', 1.27, 2.2, 0.15, { lod: 1 });
              p.text('earth', 'U016B8Z11L  2043', 1.27, 2.0, 0.15, { lod: 1 });
            });
          },
        },
      });
      m.op((p, P) => {
        p.dim(...P([-2.2, 0, 2.2]), ...P([2.2, 0, 2.2]), 'the whole package, about 4 cm', { off: 14 });
        p.note(...P([2.6, 0.2, -1.2]), 'memory', { align: 'left' });
      }, [[-2.2, 0, 2.2], [2.2, 0, 2.2]]);
    },
  });

  // ---------- iMac 24-inch, 2021 ----------
  // A thin colour panel on a bent stand. Put together around its M1, which lives in the chin.
  const W2 = 54.7, Y0 = 10, H2 = 36.1;
  add({
    name: 'iMac 24″',
    year: '2021',
    kind: 'All-in-one',
    line: 'Eleven and a half millimetres thin, seven colours, and the same M1 inside, tucked into the chin.',
    verb: 'Answer the FaceTime call',
    tint: '#7d9cc2',
    tint2: '#c48a7c',
    // the seven colours run past while it is put together, and it settles on blue
    colors: ['#8fb39a', '#e2c56f', '#e39c6a', '#d98884', '#a597c6', '#b8b8b2', '#7d9cc2'],
    view: { yaw: 24, pitch: 7 },
    fit: [800, 690],
    next: { type: 'screen', bg: 'light', eggBg: 'warm' },
    make(m) {
      const x0 = -W2 / 2;
      // In an exploded view along the depth axis: the coloured back and the stand behind, the board,
      // then the glass front, keyboard and mouse. They collapse together as you arrive.
      m.part('back', { fly: { d3: [0, 2, -52], at: [0.46, 0.76] } });
      shadowOp(m, [[-7.4, 0, -14], [7.4, 0, -14], [7.4, 0, 1], [-7.4, 0, 1]], 6, 3);
      tableLine(m, [-36, 0, 6], [36, 0, 6]);
      m.slab(rr2(x0, Y0, W2, H2, 1.3), -0.62, -0.05, { base: 0.92, fill: 'tint', gap: 6, w: 1.3 }, { skip: ['front'] });
      m.part('stand', { fly: { d3: [0, -2, -92], at: [0.5, 0.82] } });
      m.box(-7.35, 0.3, -2.4, 14.7, Y0 + 6, 0.6, { base: 0.9, fill: 'tint', gap: 6, w: 1.3 });
      m.box(-7.35, 0, -14.2, 14.7, 0.32, 13.2, { base: 0.85, fill: 'tint', gap: 6, w: 1.3 });
      // the logic board in the chin, with the M1 facing you
      m.part('board');
      m.box(-12, Y0 + 0.8, -0.55, 24, 4.4, 0.2, { base: 0.9, fill: 'tint2', gap: 5, w: 1, shade: false, pencil: false }, {
        mats: { front: { base: 0.6, dark: true, fill: 'ink', gap: 4, w: 1 } },
        faces: {
          front(F) {
            F.draw((p) => {
              for (const cx of [4, 20]) { p.ring('paper', ell2(cx, 2.2, 1.8, 1.8, 28), F.px(1.2), 0.5); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; p.gouge('paper', [[cx, 2.2], [cx + 1.6 * Math.cos(a), 2.2 + 1.6 * Math.sin(a)]], F.px(0.8), { smooth: false, lod: 1 }); } }
            });
          },
        },
      });
      m.box(-1.28, Y0 + 1.1, -0.35, 2.55, 3.0, 0.16, { base: 0.97, gap: 3, w: 0.9, edge: 1.3 }, {
        faces: { front(F) { F.model.mark('anchor', F, 0, 0, F.w, F.h); F.draw((p) => p.text('earth', 'M1', 1.27, 1.2, 0.6, { weight: 600, lod: 1 })); } },
      });
      m.part('display', { fly: { d3: [0, 2, 58], at: [0.52, 0.82] } });
      m.slab(rr2(x0, Y0, W2, H2, 1.3), -0.05, 0.53, { base: 1.0, gap: 8, w: 1.2 }, {
        mats: { side: { base: 0.92, fill: 'tint', gap: 4, w: 1 } },
        faces: {
          front(F) {
            F.draw((p) => {
              p.fill('tint', rr2(0, 30.3, W2, H2 - 30.3, 1.3));
              p.hatch('ink', rr2(0, 30.3, W2, H2 - 30.3, 1.3), { gap: 0.5, w: F.px(1.2), tone: () => 0.35, lod: 1 });
              p.ring('ink', rr2(1.35, 1.35, W2 - 2.7, 28.2, 0.3), F.px(1.8), 0.5);
              p.fill('ink', ell2(W2 / 2, 0.68, 0.12, 0.12, 10), 0.5);
            });
            screen(F, [1.6, 1.6, W2 - 3.2, 27.7], {
              ui: [480, 270],
              bg: 'paper',
              // a FaceTime call, and on the other end, the MacBook Pro
              portal: [105, -9, 270],
              clip: [90, 30, 300, 194],
              draw(p, W, H) {
                modernDesktop(p, W, H);
                p.fill('ink', rr2(84, 22, 312, 232, 9), 0.5);
                p.fill('warm', [[90, 30], [390, 30], [390, 224], [90, 224]], 0.5);
                // the caller, and the call controls
                p.text('light', 'MacBook Pro', 98, 234, 7, { align: 'left', weight: 600, lod: 0.5 });
                p.text('graphite2', 'FaceTime Video  ·  00:42', 98, 245, 5.5, { align: 'left', lod: 1 });
                const btn = (x, c) => p.fill(c, ell2(x, 239, 7, 7, 20), 0.5);
                btn(318, 'umber'); btn(337, 'umber');
                p.fill('#c45a48', rr2(350, 232, 32, 14, 7), 0.5);
                p.gouge('light', [[359, 240], [366, 237], [373, 240]], 1.6, { lod: 0.5 });
                p.fill('light', rr2(314, 236, 8, 6, 1), 1);
                p.fill('light', rr2(333, 234, 8, 10, 4), 1);
              },
            });
          },
        },
      });
      m.part('keyboard', { fly: { d3: [-18, 0, 50], at: [0.6, 0.88] } });
      m.box(-31, 0, 4, 28, 0.9, 11.5, { base: 0.98, gap: 7, w: 1.2 }, {
        hf: 0.45,
        r: 0.8,
        mats: { front: { base: 0.85, fill: 'tint', gap: 4, w: 1 } },
        faces: {
          top(F) {
            keyboard(F, 0.8, 0.8, 26.4, 9.8, [
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
              [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75],
              [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
              [1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
            ], { cap: 'light', shadowRole: 'earth' });
          },
        },
      });
      m.part('mouse', { fly: { d3: [18, 0, 62], at: [0.62, 0.9] } });
      m.box(4, 0, 6.5, 5.7, 0.4, 11.4, { base: 0.88, fill: 'tint', gap: 4, w: 1 }, { r: 2.6 });
      m.box(4.15, 0.4, 6.65, 5.4, 0.55, 11.1, { base: 1.0, gap: 6, w: 1.1 }, { r: 2.5 });
      note(m, [31, 0, 14], '11.5 mm thin', 'right');
    },
    extras(ctx, s) {
      // as it is switched on, it says hello
      if (!s.hello) return;
      ctx.globalAlpha = s.hello;
      ctx.fillStyle = s.pal.light;
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, s.W * (0.22 + 0.62 * s.write), s.H);
      ctx.clip();
      ctx.fillStyle = s.pal.tint;
      ctx.font = `italic 400 96px ${Ink.FONTS.serif}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('hello', s.W / 2, s.H / 2);
      ctx.restore();
    },
  });

  // ---------- MacBook Pro 14-inch, 2021 ----------
  const spaceGrey = { base: 0.66, gap: 6, w: 1.6, sheen: 0.12 };
  const W3 = 31.26, D3 = 22.12;
  add({
    name: 'MacBook Pro 14″',
    year: '2021',
    kind: 'Notebook',
    line: 'MagSafe, HDMI and the SD card slot came back. The camera moved into a notch at the top of the screen.',
    verb: 'Find the Mac mini in AirDrop',
    tint: '#6f6d6a',
    tint2: '#8a7fa8',
    view: { yaw: -30, pitch: 24 },
    fit: [800, 690],
    next: { type: 'screen', bg: 'light' },
    make(m) {
      const x0 = -W3 / 2, z0 = -D3 / 2;
      shadowOp(m, [[x0, 0, z0], [-x0, 0, z0], [-x0, 0, -z0], [x0, 0, -z0]], -6, 5);
      tableLine(m, [-30, 0, 15], [26, 0, 15]);
      for (const [x, z] of [[x0 + 2.2, z0 + 2.2], [-x0 - 2.2, z0 + 2.2], [x0 + 2.2, -z0 - 2.2], [-x0 - 2.2, -z0 - 2.2]]) m.cyl([x, 0, z], 0.7, 0.32, 'y', { base: 0.25, dark: true, fill: 'ink', gap: 3, w: 1 });
      m.box(x0, 0.32, z0, W3, 1.23, D3, spaceGrey, {
        r: 1.3,
        faces: {
          top(F) {
            F.draw((p) => {
              p.fill('ink', rr2(2.4, 1.1, W3 - 4.8, 10.6, 0.4));
              p.dots('ink', rr2(0.7, 1.2, 1.4, 10.4, 0.2), 0.42, 0.09);
              p.dots('ink', rr2(W3 - 2.1, 1.2, 1.4, 10.4, 0.2), 0.42, 0.09);
              p.fill('paper', rr2(8.1, 12.9, 15.1, 8.4, 0.6));
              p.ring('ink', rr2(8.1, 12.9, 15.1, 8.4, 0.6), F.px(1.2), 0.5);
            });
            keyboard(F, 2.7, 1.35, W3 - 5.4, 10.1, [
              [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
              [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75],
              [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
              [1, 1, 1.25, 5.5, 1.25, 1, 1, 1, 1],
            ], { cap: 'umber', hi: 'earth', shadow: false });
            F.draw((p) => p.ring('light', rr2(W3 - 4.6, 1.5, 1.6, 1.2, 0.2), F.px(1), 1));
          },
          front(F) { F.draw((p) => p.fill('ink', rr2(W3 / 2 - 2.6, 0, 5.2, 0.35, 0.15))); },
          left(F) {
            F.draw((p) => {
              p.fill('ink', rr2(3.2, 0.3, 1.5, 0.55, 0.25));
              p.fill('tint2', ell2(3.0, 0.57, 0.06, 0.06, 8), 1);
              p.fill('ink', rr2(5.4, 0.36, 0.9, 0.42, 0.2));
              p.fill('ink', rr2(6.8, 0.36, 0.9, 0.42, 0.2));
              p.fill('ink', ell2(9.4, 0.57, 0.18, 0.18, 10));
            });
          },
        },
      });
      m.cable([[x0 - 0.1, 0.9, z0 + 4], [x0 - 2.4, 0.8, z0 + 4.4], [x0 - 4.4, 0.2, z0 + 8], [x0 - 3.6, 0, z0 + 14], [x0 - 7, 0, z0 + 20]], 3.6, { core: 'earth' });
      m.rotX(-18, [0, 1.55, z0 + 0.2], () => {
        m.slab(rr2(x0, 1.55, W3, 21.3, 1.1), z0 - 0.05, z0 + 0.45, spaceGrey, {
          faces: {
            front(F) {
              F.draw((p) => p.fill('ink', rr2(0.25, 0.25, W3 - 0.5, 20.8, 0.9)));
              screen(F, [0.6, 0.6, W3 - 1.2, 20.0], {
                ui: [462, 299],
                bg: 'tint2',
                // the Mac mini, in its AirDrop circle
                portal: [252, 116, 92],
                round: true,
                draw(p, W, H) {
                  modernDesktop(p, W, H, { notch: true });
                  // Finder, AirDrop: people and devices nearby, each in a circle
                  p.fill('light', rr2(80, 50, 300, 200, 9), 0.5);
                  p.ring('ink', rr2(80, 50, 300, 200, 9), 0.8, 0.5);
                  p.fill('paper', [[80, 59], [150, 59], [150, 241], [80, 241]], 0.5);
                  ['Favourites', 'AirDrop', 'Recents', 'Applications', 'Desktop', 'Documents'].forEach((t, i) => p.text('ink', t, 92, 78 + i * 15, 7, { align: 'left', lod: 1, weight: i === 1 ? 600 : 400 }));
                  for (const [i, c] of [['tint2', 0], ['tint', 1], ['earth', 2]]) p.fill(i, ell2(92 + c * 9, 62, 3, 3, 10), 0.5);
                  p.text('ink', 'AirDrop', 265, 64, 8, { weight: 600, lod: 0.5 });
                  for (const r of [40, 70, 100]) p.ring('graphite2', ell2(265, 250, r, r, 40), 0.7, 1);
                  p.fill('tint', ell2(205, 177, 22, 22, 30), 0.5);
                  p.text('ink', 'iPhone', 205, 210, 7, { lod: 1 });
                  // the easter egg: a ring round the Mac mini's circle, which the app draws into
                  p.ring('tint', ell2(298, 162, 48.5, 48.5, 64), 2.4, 0.5);
                  p.text('ink', 'Mac mini', 298, 222, 7, { weight: 600, lod: 0.5 });
                  p.text('ink', 'AirDrop lets you share instantly with people nearby.', 265, 236, 5.5, { lod: 1 });
                },
              });
            },
          },
        });
      });
      note(m, [-34, 0, 18], 'MagSafe is back', 'left');
    },
  });

  // ---------- Mac mini, 2024 ----------
  // Five inches square. Zooming in lifts the top away; inside is the M4, and etched into its
  // silicon, where the story started.
  const W4 = 12.7, H4 = 5.0;
  add({
    name: 'Mac mini',
    year: '2024',
    kind: 'Desktop',
    line: 'Five inches square, with the power button tucked underneath. Inside, the M4.',
    verb: 'Go inside to the M4',
    tint: '#b9b9b3',
    tint2: '#30443a',
    view: { yaw: 28, pitch: 28 },
    fit: [660, 600],
    next: { type: 'die', bg: '#2b2723', fg: '#d8ceb6' },
    make(m) {
      const x0 = -W4 / 2;
      m.part('inside');
      m.op((p, P) => {
        const foot = [];
        for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; foot.push(P([4.6 * Math.cos(a), 0, 4.6 * Math.sin(a)])); }
        p.fill('ink', foot.map(([x, y]) => [x + 10, y + 6]));
        p.fill('ink', foot);
      }, [[-4.6, 0, -4.6], [4.6, 0, 4.6]]);
      tableLine(m, [-13, 0, 9], [13, 0, 9]);
      // inside, from the back: the ports, the blower and its heatsink fins, the storage, the M4
      const B = x0 + 0.4; // board corner in world units; u runs right, v runs toward you
      const at = (u, v, y = 0.9) => [B + u, y, B + v];
      const dark = { base: 0.3, dark: true, fill: 'ink', gap: 3, w: 1 };
      const metal = { base: 0.86, gap: 3.5, w: 1, sheen: 0.18 };
      const rndB = Ink.rng(404);
      m.flat([at(0, 0), at(11.9, 0), at(11.9, 11.9), at(0, 11.9)], { base: 0.9, fill: 'tint2', gap: 6, w: 0.9, shade: false }, {
        n: [0, 1, 0],
        frame: { o: at(0, 0), U: [1, 0, 0], V: [0, 0, 1], w: 11.9, h: 11.9 },
        deco(F) {
          F.draw((p) => {
            const k = F.px(1);
            // traces, routed in right angles with a 45° jog, and their vias
            for (let i = 0; i < 46; i++) {
              const u0 = rndB() * 11.4 + 0.2, v0 = rndB() * 11.4 + 0.2, du = (rndB() - 0.5) * 4, dv = (rndB() - 0.5) * 4;
              const pts = [[u0, v0], [u0 + du * 0.6, v0], [u0 + du * 0.6 + Math.sign(dv) * 0.3, v0 + Math.sign(dv) * 0.3], [u0 + du * 0.6 + Math.sign(dv) * 0.3, v0 + dv]];
              p.gouge(i % 3 ? 'ink' : 'earth', pts, 0.55 * k, { smooth: false, taper: 0.7, lod: 1 });
              p.fill('warm', ell2(pts[3][0], pts[3][1], 0.06, 0.06, 6), 2);
            }
            for (let u = 0.4; u < 11.6; u += 0.45) for (let v = 9.9; v < 11.0; v += 0.45) p.fill('warm', ell2(u, v, 0.05, 0.05, 6), 2);
            // silkscreen
            [['U1000', 6.1, 5.5], ['J3100', 0.6, 1.6], ['U6100', 0.7, 7.7], ['L5300', 10.0, 4.3], ['C2110', 5.4, 9.3], ['820-03185', 4.6, 11.4]].forEach(([t, u, v]) => p.text('light', t, u, v, 0.26, { align: 'left', lod: 2 }));
            // screw holes
            for (const [u, v] of [[0.45, 0.45], [11.45, 0.45], [0.45, 11.45], [11.45, 11.45]]) {
              p.fill('warm', ell2(u, v, 0.32, 0.32, 14));
              p.fill('ink', ell2(u, v, 0.14, 0.14, 10));
            }
          });
        },
      });
      // ports along the back: Ethernet, HDMI, three Thunderbolt
      m.box(...at(0.5, 0.05), 1.6, 1.25, 1.0, metal, { faces: { back(F) { F.draw((p) => p.fill('ink', rr2(0.2, 0.25, 1.2, 0.8, 0.1))); } } });
      m.box(...at(2.4, 0.05), 1.5, 0.62, 0.9, metal);
      for (const u of [4.3, 5.4, 6.5]) m.box(...at(u, 0.05), 0.85, 0.42, 0.9, metal);
      // the blower: a shroud over an impeller of curved blades, ducted back to a stack of fins
      for (let i = 0; i < 11; i++) m.box(...at(7.9 + i * 0.34, 0.35), 0.12, 1.05, 2.3, i % 2 ? metal : { ...metal, base: 0.7 });
      m.box(...at(5.6, 1.1), 2.3, 1.0, 1.5, metal);
      m.cyl(at(3.4, 4.6), 2.6, 1.1, 'y', metal, {
        cap(F) {
          F.draw((p) => {
            const k = F.px(1);
            p.fill('ink', ell2(0, 0, 1.95, 1.95, 40));
            for (let i = 0; i < 24; i++) {
              const a = (i / 24) * Math.PI * 2;
              const pts = [0.72, 1.1, 1.5, 1.88].map((r, j) => [r * Math.cos(a + j * 0.16), r * Math.sin(a + j * 0.16)]);
              p.gouge('paper', pts, 1.2 * k, { taper: 0.2, lod: 0.5 });
            }
            p.fill('umber', ell2(0, 0, 0.62, 0.62, 24));
            p.ring('paper', ell2(0, 0, 0.62, 0.62, 24), 0.8 * k, 0.5);
            p.fill('earth', ell2(0, 0, 0.16, 0.16, 10));
            p.ring('ink', ell2(0, 0, 1.95, 1.95, 40), 1.2 * k);
            for (const a of [0.6, 2.7, 4.8]) {
              p.fill('paper', ell2(2.32 * Math.cos(a), 2.32 * Math.sin(a), 0.16, 0.16, 10));
              p.gouge('ink', [[2.32 * Math.cos(a) - 0.1, 2.32 * Math.sin(a)], [2.32 * Math.cos(a) + 0.1, 2.32 * Math.sin(a)]], 0.6 * k, { smooth: false });
            }
          });
        },
      });
      // storage: two flash packages
      for (const v of [8.1, 9.95]) m.box(...at(0.7, v), 1.9, 0.16, 1.6, dark, { faces: { top(F) { F.draw((p) => p.text('light', 'NAND', 0.95, 0.8, 0.28, { lod: 2 })); } } });
      // power: a column of inductors beside the chip, and small capacitors round it
      for (let i = 0; i < 5; i++) m.box(...at(10.1, 4.6 + i * 1.02), 1.2, 0.48, 0.86, { base: 0.78, gap: 3, w: 0.9 }, { faces: { top(F) { F.draw((p) => p.text('ink', 'R47', 0.6, 0.43, 0.22, { lod: 2 })); } } });
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        m.box(...at(7.75 + 2.2 * Math.cos(a), 7.3 + 1.9 * Math.sin(a)), 0.3, 0.12, 0.16, i % 3 ? { base: 0.7, fill: 'warm', gap: 2, w: 0.6 } : dark);
      }
      // front receptacles behind the two USB-C ports and the headphone socket
      for (const u of [2.3, 3.5]) m.box(...at(u, 11.0), 0.36, 0.95, 0.85, metal);
      m.cyl(at(8.6, 11.0, 1.6), 0.32, 0.9, 'z', metal);
      // antenna leads climbing to the corner
      m.cable([at(10.8, 3.6, 1.0), at(11.3, 3.4, 1.4), at(11.6, 2.6, 2.6), at(11.7, 1.6, 3.8)], 2.2, { core: 'light', taper: 0.3 });
      m.cable([at(10.4, 3.9, 1.0), at(10.9, 4.2, 1.6), at(11.5, 5.2, 2.8)], 2.2, { core: 'earth', taper: 0.3 });
      // the M4: substrate, then the lid you zoom into
      m.box(...at(5.95, 5.75), 3.6, 0.08, 3.1, { base: 0.85, fill: 'tint2', gap: 3, w: 0.8, shade: false });
      m.box(0.4, 0.98, 0.2, 2.8, 0.2, 2.3, { base: 0.97, gap: 3, w: 0.9, edge: 1.3 }, {
        faces: {
          top(F) {
            F.model.mark('clip', F, 0, 0, F.w, F.h);
            F.model.mark('portal', F, (F.w - 2.5) / 2, (F.h - 2.5) / 2, 2.5, 2.5);
            F.draw((p) => {
              p.ring('earth', rr2(0.12, 0.12, 2.56, 2.06, 0.1), F.px(0.8), 1);
              p.text('earth', 'M4', 1.4, 1.0, 0.6, { weight: 600, lod: 1 });
              p.text('earth', 'APL1206', 1.4, 1.65, 0.2, { lod: 2 });
            });
          },
        },
      });
      // the walls fade as you go in
      m.part('walls', { peel: [0.12, 0.42] });
      m.box(x0, 0.4, x0, W4, H4 - 0.4, W4, { base: 0.97, gap: 7, w: 1.3 }, {
        r: 2.2,
        skip: ['top'],
        faces: {
          front(F) {
            F.draw((p) => {
              for (const u of [3.9, 5.1]) p.fill('ink', rr2(u, 1.7, 0.34, 0.95, 0.17));
              p.fill('ink', ell2(10.2, 2.2, 0.17, 0.17, 12));
              p.fill('light', ell2(9.3, 2.2, 0.07, 0.07, 8), 0.5);
            });
          },
        },
      });
      // the top, which lifts away
      m.part('top', { peel: [0.02, 0.3], lift: [0, -340] });
      const plan = rr2(x0, x0, W4, W4, 2.2, 5);
      m.flat(plan.map(([px, pz]) => [px, H4, pz]), { base: 0.97, gap: 9, w: 1.2 }, {
        n: [0, 1, 0],
        frame: { o: [x0, H4, x0], U: [1, 0, 0], V: [0, 0, 1], w: W4, h: W4 },
        edge: 1.4,
      });
      m.op((p, P) => {
        p.dim(...P([x0, H4, x0 - 1]), ...P([-x0, H4, x0 - 1]), '5 in', { off: -12 });
        p.note(...P([x0 - 4, 0, -x0 + 3]), 'power button: underneath', { align: 'left' });
      }, [[x0, H4, x0 - 1]]);
    },
  });
})();
