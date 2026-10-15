// late.js: Apple Watch, Apple M1, iMac 24-inch, MacBook Pro 14-inch, Mac mini. Units are centimetres.
'use strict';

(function () {
  const { add, screen, keyboard, slots, Icons, rr2, ell2 } = Kit;

  // The machine's shadow on the table, a dark marker swipe: its footprint, nudged by (dx, dy) on the
  // page and, for a machine h cm tall, stretched away from the light as a real shadow is.
  const shadowOp = (m, pts, dx = 6, dy = 8, h = 0) =>
    m.op((p, P) => {
      const far = pts.map(([x, y, z]) => [x + h * 0.62, y, z - h * 0.69]);
      const c = Ink.hull([...pts, ...far].map(P));
      p.fill('shadow', c.map(([x, y]) => [x + dx * 0.5, y + dy * 0.5]));
    }, pts, false);
  const tableLine = (m, a, b) => m.op((p, P) => p.pencil([P(a), P(b)], { role: 'graphite2', w: 0.7, over: 0, lod: 1 }), [a, b], false);
  const note = (m, at, str, align = 'left') => m.op((p, P) => p.note(...P(at), str, { align }), [at], false);

  // ---------- macOS since Big Sur, drawn as it really looks ----------
  const SYS = '-apple-system, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif';
  // the Dock's app icons: rounded squares in their real colours and glyphs, in s × s
  function macIcon(p, name, x, y, s) {
    const c = (dx, dy) => [x + dx * s, y + dy * s];
    const sq = (fill) => p.fill(fill, rr2(x, y, s, s, s * 0.23), 0.5);
    const circ = (fill, cx, cy, r) => p.fill(fill, ell2(x + cx * s, y + cy * s, r * s, r * s, 24), 0.5);
    const box = (fill, x0, y0, w, h, r = 0) => p.fill(fill, rr2(x + x0 * s, y + y0 * s, w * s, h * s, r * s), 0.5);
    switch (name) {
      case 'Finder':
        sq('#2b8cf2'); p.fill('#e8f1fb', [c(0.5, 0), c(0.77, 0), c(0.77, 1), c(0.5, 1)], 0.5);
        p.fill('#e8f1fb', [c(0.23, 0), c(0.5, 0), c(0.43, 0.5), c(0.5, 0.5), c(0.5, 1), c(0.23, 1)].map((q) => q), 0.5);
        box('#173a63', 0.3, 0.3, 0.05, 0.12); box('#173a63', 0.66, 0.3, 0.05, 0.12);
        p.gouge('#173a63', [c(0.26, 0.66), c(0.5, 0.74), c(0.74, 0.66)], s * 0.04, { lod: 1 });
        break;
      case 'Launchpad':
        sq('#9aa3ad'); for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) box(['#f3654f', '#f6c54a', '#56c06a', '#4aa3f0', '#a36be3', '#f08b3c', '#3cc4c9', '#e85b9a', '#7d8cf5'][r * 3 + k], 0.18 + k * 0.23, 0.18 + r * 0.23, 0.17, 0.17, 0.04);
        break;
      case 'Safari':
        sq('#f2f4f7'); circ('#1e7cf2', 0.5, 0.5, 0.4); circ('#eaf3fe', 0.5, 0.5, 0.33);
        p.fill('#e8443a', [c(0.5, 0.5), c(0.74, 0.26), c(0.55, 0.55)], 0.5); p.fill('#c9cdd3', [c(0.5, 0.5), c(0.26, 0.74), c(0.45, 0.45)], 0.5);
        break;
      case 'Messages':
        sq('#3ac34f'); p.fill('#ffffff', ell2(x + 0.5 * s, y + 0.47 * s, 0.32 * s, 0.26 * s, 24), 0.5); p.fill('#ffffff', [c(0.3, 0.62), c(0.24, 0.78), c(0.42, 0.68)], 0.5);
        break;
      case 'Mail':
        sq('#2d8ff3'); box('#ffffff', 0.18, 0.3, 0.64, 0.42, 0.04); p.gouge('#2d8ff3', [c(0.2, 0.33), c(0.5, 0.55), c(0.8, 0.33)], s * 0.045, { smooth: false, lod: 1 });
        break;
      case 'Maps':
        sq('#e9efe4'); p.fill('#9ccf7a', [c(0, 0.55), c(0.45, 0.4), c(1, 0.62), c(1, 1), c(0, 1)], 0.5); p.gouge('#f6c443', [c(0.05, 0.85), c(0.55, 0.55), c(0.95, 0.2)], s * 0.08, { lod: 1 }); circ('#2a7ef0', 0.62, 0.42, 0.1);
        break;
      case 'Photos':
        sq('#ffffff'); ['#f3a634', '#f2cf3a', '#8fcf50', '#38b5c9', '#3d8be8', '#9065d8', '#e45a9c', '#ee5a45'].forEach((col, k) => { const a = (k / 8) * Math.PI * 2; p.fill(col, ell2(x + (0.5 + 0.18 * Math.cos(a)) * s, y + (0.5 + 0.18 * Math.sin(a)) * s, 0.16 * s, 0.16 * s, 18), 0.5); });
        break;
      case 'FaceTime':
        sq('#3ac34f'); box('#ffffff', 0.18, 0.34, 0.42, 0.32, 0.06); p.fill('#ffffff', [c(0.62, 0.45), c(0.82, 0.34), c(0.82, 0.66), c(0.62, 0.55)], 0.5);
        break;
      case 'Calendar':
        sq('#ffffff'); p.text('#e8443a', 'MON', x + 0.5 * s, y + 0.22 * s, 0.17 * s, { font: SYS, weight: 700, lod: 1 }); p.text('#1d1d1f', '18', x + 0.5 * s, y + 0.6 * s, 0.42 * s, { font: SYS, weight: 400, lod: 0.5 });
        break;
      case 'Music':
        sq('#fa3c55'); p.fill('#ffffff', ell2(x + 0.38 * s, y + 0.68 * s, 0.1 * s, 0.08 * s, 14), 0.5); p.fill('#ffffff', ell2(x + 0.66 * s, y + 0.6 * s, 0.1 * s, 0.08 * s, 14), 0.5);
        p.fill('#ffffff', [c(0.45, 0.68), c(0.48, 0.68), c(0.48, 0.3), c(0.45, 0.3)], 0.5); p.fill('#ffffff', [c(0.73, 0.6), c(0.76, 0.6), c(0.76, 0.22), c(0.73, 0.22)], 0.5); p.fill('#ffffff', [c(0.45, 0.3), c(0.76, 0.22), c(0.76, 0.3), c(0.45, 0.38)], 0.5);
        break;
      case 'App Store':
        sq('#1f8ef5'); p.gouge('#ffffff', [c(0.32, 0.72), c(0.5, 0.3)], s * 0.07, { smooth: false, lod: 1 }); p.gouge('#ffffff', [c(0.68, 0.72), c(0.5, 0.3)], s * 0.07, { smooth: false, lod: 1 }); p.gouge('#ffffff', [c(0.28, 0.6), c(0.72, 0.6)], s * 0.07, { smooth: false, lod: 1 });
        break;
      case 'Settings':
        sq('#8e9196'); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; box('#5b5e63', 0.5 + 0.3 * Math.cos(a) - 0.06, 0.5 + 0.3 * Math.sin(a) - 0.06, 0.12, 0.12, 0.02); } circ('#5b5e63', 0.5, 0.5, 0.3); circ('#c9cbce', 0.5, 0.5, 0.12);
        break;
      case 'Trash':
        p.fill('#e9ecef', [c(0.2, 0.22), c(0.8, 0.22), c(0.74, 0.95), c(0.26, 0.95)], 0.5); box('#cfd4d9', 0.15, 0.14, 0.7, 0.08, 0.02);
        for (const dx of [0.36, 0.5, 0.64]) p.fill('#b9bfc6', [c(dx - 0.012, 0.32), c(dx + 0.012, 0.32), c(dx + 0.012, 0.88), c(dx - 0.012, 0.88)], 1);
        break;
    }
  }
  function macMenuBar(p, W, h, app, items) {
    p.fill('#f3f1ee', [[0, 0], [W, 0], [W, h], [0, h]], 0.5);
    p.text('#1d1d1f', '', h * 1.0, h * 0.55, h * 0.72, { font: SYS, lod: 0.5 });
    let x = h * 2.1;
    [app, ...items].forEach((it, i) => {
      p.text('#1d1d1f', it, x, h * 0.55, h * 0.58, { font: SYS, weight: i ? 400 : 700, align: 'left', lod: 1 });
      x += it.length * h * 0.36 + h * 1.1;
    });
    p.text('#1d1d1f', 'Mon 18 Oct  9:41', W - h * 0.8, h * 0.55, h * 0.56, { font: SYS, align: 'right', lod: 1 });
  }
  const DOCK = ['Finder', 'Launchpad', 'Safari', 'Messages', 'Mail', 'Maps', 'Photos', 'FaceTime', 'Calendar', 'Music', 'App Store', 'Settings', 'Trash'];
  function macDock(p, W, H, s) {
    const n = DOCK.length, gap = s * 0.18, w = n * s + (n + 1) * gap, x0 = (W - w) / 2, y0 = H - s - gap * 2.4;
    p.fill('#e8e6e3', rr2(x0, y0 - gap, w, s + gap * 2, s * 0.32), 0.5);
    p.ring('#cfccc8', rr2(x0, y0 - gap, w, s + gap * 2, s * 0.32), 0.5, 1);
    DOCK.forEach((name, i) => macIcon(p, name, x0 + gap + i * (s + gap), y0, s));
  }
  // a Big Sur style wallpaper: soft bands of colour
  function macWallpaper(p, W, H) {
    for (let i = 0; i < 7; i++) {
      const pts = [];
      for (let k = 0; k <= 12; k++) pts.push([-20 + k * (W + 40) / 12, H * (0.25 + i * 0.1) + H * 0.08 * Math.sin(k * 0.6 + i * 0.7)]);
      p.gouge(i % 2 ? 'tint' : 'tint2', pts, H * 0.08 - i * H * 0.006, { taper: 0.1, lod: 0.5 });
    }
  }
  function modernDesktop(p, W, H, o = {}) {
    macWallpaper(p, W, H);
    const mb = H * 0.035;
    macMenuBar(p, W, mb, 'Finder', ['File', 'Edit', 'View', 'Go', 'Window', 'Help']);
    if (o.notch) p.fill('#0b0b0c', rr2(W / 2 - W * 0.04, -2, W * 0.08, mb + 3, mb * 0.4), 0.5);
    if (o.dock !== false) macDock(p, W, H, H * 0.06);
  }

  // ---------- Apple Watch, 2015 ----------
  // A 42 mm aluminium case lying face up, its sport band laid out above and below, the Activity face
  // on the display. Inside, under the display, the S1: Apple silicon on the wrist, which is where the
  // Mac's own chip comes from. Zooming in lifts the display away and drops you onto it.
  const alum = { base: 0.95, gap: 5, w: 1.0, sheen: 0.2 };
  const band = { base: 0.9, fill: 'tint', gap: 4, w: 0.9 };
  const CW = 3.64, CD = 4.25, CH = 1.14;
  // the Activity face, in the display's own pixels (312 × 390)
  const RINGS = [['#fa114f', '#3d0816', 120, 0.82], ['#a6ff00', '#2a3d06', 92, 0.64], ['#00d8ff', '#063a42', 64, 0.92]];
  function activityFace(p, W, H) {
    const cx = W / 2, cy = 214;
    for (const [on, off, r, f] of RINGS) {
      const arc = (a0, a1) => Array.from({ length: 49 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 48; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
      p.gouge(off, arc(0, Math.PI * 2), 22, { taper: 0, lod: 0.5 });
      p.gouge(on, arc(-Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f), 22, { taper: 0, lod: 0.5 });
    }
    p.text('#f4f1e8', '10:09', W - 22, 34, 32, { align: 'right', weight: 500, lod: 0.5 });
    p.text('#a6ff00', 'FRI 16', 22, 34, 20, { align: 'left', weight: 600, lod: 0.5 });
  }
  add({
    name: 'Apple Watch',
    era: 'watch',
    year: '2015',
    kind: 'Watch',
    line: 'The first Apple Watch: the Digital Crown, a Retina display, and the whole computer sealed in one package, the S1.',
    verb: 'Go inside to the chip',
    tint: '#d9b3a4',
    tint2: '#1d1d1f',
    view: { yaw: -14, pitch: 46 },
    fit: [560, 760],
    next: { type: 'inside', align: true, bg: 'light', swipe: true },
    rings: RINGS,
    make(m) {
      const x0 = -CW / 2, z0 = -CD / 2;
      m.part('bands');
      shadowOp(m, [[-1.1, 0, z0 - 5.3], [1.1, 0, z0 - 5.3], [1.1, 0, -z0 + 6.0], [-1.1, 0, -z0 + 6.0]], 1.5, 2, 0.5);
      shadowOp(m, rr2(x0, z0, CW, CD, 0.95, 4).map(([px, pz]) => [px, 0, pz]), 2.5, 3, 0.8);
      tableLine(m, [-7, 0, 6], [7, 0, 6]);
      // the sport band: the pin half above, the holed half below, each ending in a rounded tip
      m.part('bandTop', { fly: { d3: [0, 0, -10] } });
      m.box(-1.1, 0.12, z0 - 5.4, 2.2, 0.36, 5.7, band, { r: 1.0 });
      m.part('bandBottom', { fly: { d3: [0, 0, 10] } });
      m.box(-1.1, 0.12, -z0 - 0.3, 2.2, 0.36, 6.4, band, {
        r: 1.0,
        faces: { top(F) { F.draw((p) => { for (let i = 0; i < 5; i++) { p.fill('ink', ell2(1.1, 1.6 + i * 0.85, 0.13, 0.13, 10), 1); } }); } },
      });
      // the case: aluminium walls and back, the Digital Crown and the side button on the right
      m.part('case');
      m.box(x0, 0, z0, CW, CH - 0.2, CD, alum, { r: 0.95, skip: ['top'] });
      m.cyl([-x0 + 0.12, CH * 0.55, z0 + 1.15], 0.36, 0.34, 'x', { base: 0.9, gap: 2, w: 0.6, sheen: 0.2 });
      m.box(-x0 - 0.02, CH * 0.3, z0 + 2.2, 0.14, 0.42, 1.3, { base: 0.88, gap: 2, w: 0.6 }, { r: 0.12 });
      // inside: the battery, the Taptic Engine and the S1 system in package
      m.part('inside');
      m.flat([[x0 + 0.2, CH - 0.25, z0 + 0.2], [-x0 - 0.2, CH - 0.25, z0 + 0.2], [-x0 - 0.2, CH - 0.25, -z0 - 0.2], [x0 + 0.2, CH - 0.25, -z0 - 0.2]], { base: 0.35, dark: true, fill: 'ink', gap: 2, w: 0.6 }, { n: [0, 1, 0] });
      m.box(x0 + 0.4, CH - 0.25, z0 + 0.4, 2.8, 0.12, 1.4, { base: 0.97, fill: 'warm', gap: 2, w: 0.6 }, {
        faces: { top(F) { F.draw((p) => p.text('earth', 'Li-ion 334 mAh', 1.4, 0.7, 0.2, { lod: 2 })); } },
      });
      m.box(x0 + 0.5, CH - 0.25, -z0 - 1.1, 1.0, 0.1, 0.7, { base: 0.5, gap: 2, w: 0.6 });
      m.box(-0.75, CH - 0.25, -0.2, 1.5, 0.08, 1.7, { base: 0.25, dark: true, fill: 'ink', gap: 2, w: 0.5 }, {
        faces: { top(F) { F.model.mark('chip', F, 0, 0, F.w, F.h); F.draw((p) => p.text('earth', 'S1', 0.75, 0.85, 0.42, { weight: 600, lod: 1 })); } },
      });
      // the display, which lifts off: a rounded slab of glass on the case, the Activity face in it
      m.part('display', { peel: [0.0, 0.3], lift: [0, -320] });
      const plan = rr2(x0, z0, CW, CD, 0.95, 6);
      m.watchTop = plan.map(([px, pz]) => [px, CH, pz]);
      m.flat(m.watchTop, alum, {
        n: [0, 1, 0],
        frame: { o: [x0, CH, z0], U: [1, 0, 0], V: [0, 0, 1], w: CW, h: CD },
        edge: 1,
        deco(F) {
          F.draw((p) => p.fill('ink', rr2(0.12, 0.12, CW - 0.24, CD - 0.24, 0.82)));
          F.model.mark('display', F, 0.38, 0.4, CW - 0.76, CD - 0.8);
          screen(F, [0.38, 0.4, CW - 0.76, CD - 0.8], { ui: [312, 390], bg: 'ink', r: 0.5, draw: activityFace });
        },
      });
      note(m, [-6.5, 0, 5], 'splash resistant');
    },
  });

  // ---------- Apple M1, 2020 ----------
  // The package: a silver lid over the processor, two memory packages beside it, a dark green
  // substrate dotted with capacitors. Zoom into the lid and an iMac, which used the same chip,
  // assembles around it.
  add({
    name: 'Apple M1',
    era: 'bigsur',
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
      shadowOp(m, [[-2.2, 0, -1.7], [2.2, 0, -1.7], [2.2, 0, 1.7], [-2.2, 0, 1.7]], 5, 6, 0.2);
      // the substrate: a dark green board with gold pads round its edge, thick enough to show its edge
      m.box(-2.2, 0, -1.7, 4.4, 0.2, 3.4, { base: 0.9, fill: 'tint', gap: 6, w: 1.1, shade: false, edge: 1.2 }, {
        faces: {
          top(F) {
            F.model.mark('self', F, 0, 0, F.w, F.h);
            F.draw((p) => {
              for (let i = 0; i < 22; i++) {
                p.fill('warm', rr2(0.25 + i * 0.18, 0.06, 0.08, 0.12, 0.02), 0.5);
                p.fill('warm', rr2(0.25 + i * 0.18, 3.22, 0.08, 0.12, 0.02), 0.5);
              }
              for (let i = 0; i < 16; i++) p.fill('warm', rr2(0.06, 0.25 + i * 0.18, 0.12, 0.08, 0.02), 0.5);
              // a few capacitors between the lid and the memory
              for (let i = 0; i < 6; i++) p.fill('umber', rr2(2.66, 0.45 + i * 0.44, 0.08, 0.16, 0.02), 1);
              p.ring('warm', ell2(4.25, 0.16, 0.06, 0.06, 10), F.px(0.8), 1);
            });
          },
        },
      });
      // two memory packages, black, each with its part number
      for (const z of [-1.5, 0.08]) {
        m.box(0.86, 0.2, z, 1.2, 0.22, 1.4, { base: 0.36, dark: true, fill: 'tint2', gap: 3, w: 1, edge: 1.1 }, {
          faces: {
            top(F) {
              F.draw((p) => {
                p.fill('earth', ell2(0.16, 0.16, 0.05, 0.05, 10), 0.5);
                p.text('earth', 'LPDDR4X', 0.6, 0.6, 0.14, { lod: 1, weight: 600 });
                p.text('earth', '8 GB', 0.6, 0.8, 0.12, { lod: 1 });
              });
            },
          },
        });
      }
      // the heat spreader: a polished lid with the Apple logo and M1 on it
      m.part('focus');
      m.box(-2.0, 0.2, -1.5, 2.6, 0.26, 3.0, { base: 0.97, gap: 3, w: 0.9, edge: 1.4, sheen: 0.22 }, {
        r: 0.14,
        faces: {
          top(F) {
            F.model.mark('focus', F, 0, 0, F.w, F.h);
            F.draw((p) => {
              const k = F.px(1);
              // polished metal: a darker reflection across it, and two bands of light
              p.put('m1', 'cg', [[0, 1.55], [2.6, 0.75], [2.6, 1.35], [0, 2.15]], 0, 0.3, 1);
              p.sheen([[0, 0.55], [2.6, -0.25], [2.6, 0.2], [0, 1.0]], 0.22);
              p.sheen([[0, 2.45], [2.6, 1.65], [2.6, 1.8], [0, 2.6]], 0.18);
              p.pencil([[0.25, 0.85], [2.3, 0.22]], { role: 'chalk', w: 1.3 * k, over: 0, wob: 0.2 });
              p.ring('umber', rr2(0.12, 0.12, 2.36, 2.76, 0.14), 0.6 * k, 1);
              Icons.apple(p, 0.82, 1.24, 0.52, { role: 'umber' });
              p.text('umber', 'M1', 1.5, 1.27, 0.6, { weight: 600, lod: 0.5 });
              p.text('umber', 'APL1102  339S00818', 1.3, 2.2, 0.15, { lod: 1 });
              p.text('umber', 'U016B8Z11L  2043', 1.3, 2.0, 0.15, { lod: 1 });
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
    era: 'bigsur',
    year: '2021',
    kind: 'All-in-one',
    line: 'Eleven and a half millimetres thin, seven colours, and the same M1 inside, tucked into the chin.',
    verb: 'Open the MacBook Pro on apple.com',
    tint: '#7d9cc2',
    tint2: '#c48a7c',
    // the seven colours run past while it is put together, and it settles on blue
    colors: ['#8fb39a', '#e2c56f', '#e39c6a', '#d98884', '#a597c6', '#b8b8b2', '#7d9cc2'],
    view: { yaw: 24, pitch: 7 },
    fit: [800, 690],
    next: { type: 'screen', bg: 'light', eggBg: '#000000' },
    make(m) {
      const x0 = -W2 / 2;
      // In an exploded view along the depth axis: the coloured back and the stand behind, the board,
      // then the glass front, keyboard and mouse. They collapse together as you arrive.
      m.part('back', { fly: { d3: [0, 2, -52], at: [0.46, 0.76] } });
      shadowOp(m, [[-7.4, 0, -10], [7.4, 0, -10], [7.4, 0, 4.7], [-7.4, 0, 4.7]], 6, 3, 14);
      tableLine(m, [-36, 0, 6], [36, 0, 6]);
      m.slab(rr2(x0, Y0, W2, H2, 1.3), -0.62, -0.05, { base: 0.92, fill: 'tint', gap: 6, w: 1.3 }, { skip: ['front'] });
      m.part('stand', { fly: { d3: [0, -2, -92], at: [0.5, 0.82] } });
      // the stand: one bent blade, slanting down and back from behind the display, then turning
      // forward into a flat foot that sits under the display (14.7 cm square)
      m.rotX(25.8, [0, 0.3, -9.2], () => m.box(-7.35, 0.3, -9.5, 14.7, 19.6, 0.6, { base: 0.9, fill: 'tint', gap: 6, w: 1.3 }));
      m.box(-7.35, 0, -10, 14.7, 0.32, 14.7, { base: 0.85, fill: 'tint', gap: 6, w: 1.3 }, { r: 0.4 });
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
              // Safari on apple.com: the MacBook Pro page, and you zoom into its hero image
              portal: [153, 73, 174],
              clip: [100, 100, 280, 122],
              draw(p, W, H) {
                macWallpaper(p, W, H);
                macMenuBar(p, W, 9, 'Safari', ['File', 'Edit', 'View', 'History', 'Bookmarks', 'Window', 'Help']);
                // the window, filling the screen
                p.fill('#ffffff', rr2(10, 14, 460, 248, 6), 0.5);
                p.fill('#f6f5f4', rr2(10, 14, 460, 22, 6), 0.5);
                p.fill('#f6f5f4', [[10, 26], [470, 26], [470, 36], [10, 36]], 0.5);
                p.fill('#dddbd8', [[10, 36], [470, 36], [470, 36.6], [10, 36.6]], 1);
                ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => p.fill(col, ell2(20 + i * 8, 25, 2.6, 2.6, 14), 0.5));
                p.gouge('#8a8784', [[54, 22], [51, 25], [54, 28]], 1, { smooth: false, lod: 1 });
                p.gouge('#c9c6c2', [[62, 22], [65, 25], [62, 28]], 1, { smooth: false, lod: 1 });
                p.fill('#ebe9e6', rr2(160, 19, 160, 12, 4), 0.5);
                p.text('#1d1d1f', 'apple.com', 240, 25.5, 5.4, { font: SYS, lod: 1 });
                p.fill('#8a8784', rr2(214, 23.5, 3, 3.6, 0.6), 1);
                // apple.com's global navigation
                p.fill('#f5f5f7', [[10, 36.6], [470, 36.6], [470, 48], [10, 48]], 0.5);
                p.text('#1d1d1f', '', 60, 42.3, 6, { font: SYS, lod: 1 });
                ['Store', 'Mac', 'iPad', 'iPhone', 'Watch', 'AirPods', 'TV & Home', 'Only on Apple', 'Accessories', 'Support'].forEach((t, i) => p.text('#1d1d1f', t, 84 + i * 33, 42.3, 3.8, { font: SYS, align: 'left', lod: 1 }));
                // the MacBook Pro page, October 2021: its own dark navigation bar, then a black hero
                p.fill('#1d1d1f', [[10, 48], [470, 48], [470, 57], [10, 57]], 0.5);
                p.text('#f5f5f7', 'MacBook Pro', 30, 52.6, 5, { font: SYS, weight: 600, align: 'left', lod: 1 });
                ['Overview', 'Why Mac', 'Tech Specs'].forEach((t, i) => p.text('#c7c7cc', t, 340 + i * 30, 52.6, 3.6, { font: SYS, align: 'left', lod: 1 }));
                p.fill('#0071e3', rr2(434, 49.8, 18, 5.6, 2.8), 1);
                p.text('#ffffff', 'Buy', 443, 52.6, 3.4, { font: SYS, weight: 600, lod: 1 });
                p.fill('#000000', [[10, 57], [470, 57], [470, 262], [10, 262]], 0.5);
                p.text('#f5f5f7', 'MacBook Pro', 240, 66, 6, { font: SYS, weight: 600, lod: 0.5 });
                // the headline in its purple-to-blue gradient, done as two halves
                p.withClip([60, 70, 240, 86], () => p.text('#d7a7ff', 'Supercharged for pros.', 240, 79, 13, { font: SYS, weight: 700, lod: 0.5 }));
                p.withClip([240, 70, 420, 86], () => p.text('#8fb3ff', 'Supercharged for pros.', 240, 79, 13, { font: SYS, weight: 700, lod: 0.5 }));
                p.text('#2997ff', 'Learn more ›', 222, 92, 4.4, { font: SYS, lod: 1 });
                p.text('#2997ff', 'Buy ›', 262, 92, 4.4, { font: SYS, lod: 1 });
                // the two chips either side of the laptop
                const chip = (cx, name) => {
                  p.fill('#2a2a2e', rr2(cx - 22, 138, 44, 44, 5), 0.5);
                  p.ring('#55555c', rr2(cx - 22, 138, 44, 44, 5), 0.6, 0.5);
                  Icons.apple(p, cx - 9, 160, 9, { role: '#f5f5f7' });
                  p.text(name === 'M1 Pro' ? '#d7a7ff' : '#8fb3ff', name.toUpperCase(), cx + 6, 160.5, 5.4, { font: SYS, weight: 700, lod: 1 });
                };
                chip(58, 'M1 Pro');
                chip(422, 'M1 Max');
                p.text('#86868b', 'Up to 10-core CPU', 58, 190, 3.6, { font: SYS, lod: 1 });
                p.text('#86868b', 'Up to 32-core GPU', 422, 190, 3.6, { font: SYS, lod: 1 });
                // the figures across the foot of the hero
                p.fill('#424245', [[60, 228], [420, 228], [420, 228.4], [60, 228.4]], 1);
                [['Up to 21 hrs', 'battery life'], ['Up to 3.7x', 'faster CPU performance'], ['120Hz', 'ProMotion refresh rate'], ['1,000 nits', 'sustained brightness']].forEach(([big, small], i) => {
                  const x = 105 + i * 90;
                  p.text('#f5f5f7', big, x, 240, 7, { font: SYS, weight: 600, lod: 0.5 });
                  p.text('#86868b', small, x, 250, 3.6, { font: SYS, lod: 1 });
                });
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
    era: 'bigsur',
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
      shadowOp(m, [[x0, 0, z0], [-x0, 0, z0], [-x0, 0, -z0], [x0, 0, -z0]], -6, 5, 6);
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
    era: 'bigsur',
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
      // its shadow on the table, a dark marker swipe
      shadowOp(m, rr2(x0, x0, W4, W4, 2.6, 4).map(([px, pz]) => [px, 0, pz]), 10, 6, 2.6);
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
        // the Apple logo in the middle of the lid, upright to someone in front of it
        deco(F) { F.draw((p) => Icons.apple(p, W4 / 2, W4 / 2, 3.4, { role: 'ink', lod: 0 })); },
      });
      m.op((p, P) => {
        p.dim(...P([x0, H4, x0 - 1]), ...P([-x0, H4, x0 - 1]), '5 in', { off: -12 });
        p.note(...P([x0 - 4, 0, -x0 + 3]), 'power button: underneath', { align: 'left' });
      }, [[x0, H4, x0 - 1]]);
    },
  });
})();
