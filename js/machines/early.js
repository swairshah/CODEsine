// early.js: Apple I and Apple II. Units are centimetres; y is up, z is toward you.
'use strict';

(function () {
  const { add, screen, keyboard, slots, text, Icons, rr2, ell2 } = Kit;

  // ---------- Apple I, 1976 ----------
  // A bare board with four rows of chips (A to D), three blue capacitors lying on their sides,
  // a heatsink in the corner and a white ceramic 6502. Zoom into the 6502 and the Apple II,
  // which used the same processor, assembles around it.
  add({
    name: 'Apple I',
    era: 'apple2',
    year: '1976',
    kind: 'Circuit board',
    line: 'Hand-built in Los Altos and sold as a bare board. You supplied the case, the keyboard and the television.',
    verb: 'Zoom into the white 6502 processor',
    tint: '#4f7a5a',
    tint2: '#5b7fa6',
    view: { yaw: 12, pitch: 50 },
    fit: [860, 640],
    next: { type: 'assemble' },
    make(m) {
      const board = { base: 0.92, fill: 'tint', gap: 10, w: 1.2, shade: false };
      const chip = { base: 0.32, dark: true, fill: 'ink', gap: 3.5, w: 1.1 };
      const rnd = Ink.rng(42);
      m.part('board');
      m.op((p, P) => {
        // shadow on the table
        const c = [[-19.6, 0, -8.6], [19.6, 0, -8.6], [20.4, 0, 9.8], [-18.8, 0, 9.8]].map(P);
        p.fill('ink', c.map(([x, y]) => [x + 4, y + 7]));
        p.pencil([P([-26, 0, 9.6]), P([26, 0, 9.6])], { role: 'graphite2', w: 0.7, over: 0, lod: 1 });
      }, [[-20, 0, -9], [20, 0, 10]], false);
      m.box(-19, 0, -9, 38, 0.18, 18, board, {
        faces: {
          top(F) {
            F.draw((p) => {
              const k = F.px(1);
              // traces between the rows
              for (const z of [4.1, 12.1, 16.1]) {
                p.gouge('ink', [[1, z], [30, z]], 0.9 * k, { smooth: false, taper: 0.6, lod: 1 });
              }
              // silkscreen
              p.text('light', 'Apple Computer 1', 2.4, 8.4, 0.62, { align: 'left', lod: 1, font: 'mono', weight: 600 });
              p.text('light', 'Palo Alto, Ca.  Copyright 1976', 12.5, 8.4, 0.5, { align: 'left', lod: 1 });
              ['A', 'B', 'C', 'D'].forEach((r, i) => p.text('light', r, 0.6, 2.4 + i * 4, 0.55, { lod: 1, weight: 600 }));
              for (let c = 1; c <= 16; c++) p.text('light', String(c), 1.55 + (c - 1) * 1.85 + 0.95, 17.2, 0.4, { lod: 2 });
              // pins along every chip
              for (let r = 0; r < 4; r++) for (let c = 0; c < 16; c++) {
                const x = 1.55 + c * 1.85, z = 2.3 + r * 4;
                if (r === 3 && c < 3) continue;
                for (let i = 0; i < 7; i++) {
                  p.fill('light', [[x + 0.15 + i * 0.25, z - 0.1], [x + 0.25 + i * 0.25, z - 0.1], [x + 0.25 + i * 0.25, z + 0.06], [x + 0.15 + i * 0.25, z + 0.06]], 1);
                  p.fill('light', [[x + 0.15 + i * 0.25, z + 0.84], [x + 0.25 + i * 0.25, z + 0.84], [x + 0.25 + i * 0.25, z + 1.0], [x + 0.15 + i * 0.25, z + 1.0]], 1);
                }
              }
              // resistors and ceramic capacitors scattered between rows
              for (let i = 0; i < 46; i++) {
                const x = 1.5 + rnd() * 28, z = [1.4, 5.4, 9.4, 13.4][i % 4] + (rnd() - 0.5) * 0.6;
                if (rnd() < 0.55) {
                  p.gouge('light', [[x - 0.5, z], [x + 0.9, z]], 0.6 * k, { smooth: false, lod: 1 });
                  p.fill('warm', rr2(x - 0.2, z - 0.14, 0.6, 0.28, 0.12), 0.5);
                  for (const b of [0, 0.15, 0.3]) p.fill(['ink', 'earth', 'umber'][(b * 20) % 3], [[x - 0.1 + b, z - 0.14], [x - 0.04 + b, z - 0.14], [x - 0.04 + b, z + 0.14], [x - 0.1 + b, z + 0.14]], 1);
                } else {
                  p.fill('earth', ell2(x, z, 0.26, 0.22, 10), 0.5);
                  p.gouge('light', [[x - 0.12, z - 0.08], [x + 0.06, z - 0.12]], 0.5 * k, { lod: 1, smooth: false });
                }
              }
              // the edge connector along the right side
              for (let i = 0; i < 22; i++) p.fill('warm', [[37.2, 8.2 + i * 0.4], [37.9, 8.2 + i * 0.4], [37.9, 8.45 + i * 0.4], [37.2, 8.45 + i * 0.4]], 0.5);
              // mounting holes
              for (const [x, z] of [[0.6, 0.6], [37.4, 0.6], [0.6, 17.4], [37.4, 17.4]]) {
                p.fill('paper', ell2(x, z, 0.28, 0.28, 12));
                p.ring('ink', ell2(x, z, 0.28, 0.28, 12), 0.6 * k, 0.5);
              }
            });
          },
        },
      });
      // rows of chips
      for (let r = 0; r < 4; r++) for (let c = 0; c < 16; c++) {
        const x = -19 + 1.55 + c * 1.85, z = -9 + 2.3 + r * 4;
        if (r === 3 && c < 3) continue;
        if (r === 2 && c >= 3 && c < 6) continue;
        if (r === 0 && c >= 13) continue;
        m.box(x, 0.18, z, 1.7, 0.32, 0.86, chip, {
          faces: {
            top(F) {
              F.draw((p) => {
                p.fill('paper', ell2(0.18, 0.43, 0.08, 0.08, 8), 1);
                p.text('light', ['74LS', '2504', '8T97', '2519', '74157', 'MK4096'][(r * 7 + c) % 6], 0.85, 0.48, 0.24, { lod: 2 });
              });
            },
          },
        });
      }
      // the 6820 interface adapter, a 40-pin package in row C
      m.box(-19 + 1.55 + 3 * 1.85, 0.18, -9 + 2.3 + 8 - 0.3, 5.1, 0.36, 1.45, chip, {
        faces: { top(F) { text(F, 'MC6820P', 2.55, 0.75, 0.42, { role: 'light', lod: 1 }); } },
      });
      // heatsink and regulator
      for (let i = 0; i < 7; i++) m.box(14.2 + i * 0.6, 0.18, -8.4, 0.28, 2.4, 3.4, { base: 0.28, dark: true, fill: 'ink', gap: 3, w: 1 });
      m.cyl([16, 0.18, -3.6], 0.7, 1.2, 'y', { base: 0.6, gap: 3, w: 1 });
      // the blue filter capacitors, lying on their sides
      const blue = { base: 0.92, fill: 'tint2', gap: 4, w: 1.1 };
      const capFace = (F) => F.draw((p) => p.ring('light', ell2(0, 0, 0.5, 0.5, 18), F.px(0.8), 1));
      m.cyl([7.4, 0.95, -7.6], 0.78, 5.6, 'x', blue, { cap: capFace });
      m.cyl([12.2, 0.95, -1.0], 0.78, 5.6, 'x', blue, { cap: capFace });
      m.cyl([12.2, 0.95, 1.0], 0.78, 5.6, 'x', blue, { cap: capFace });
      m.op((p, P) => p.note(...P([19, 0, 12]), 'about 200 were made', { align: 'right' }), [[19, 0, 12]], false);

      // the processor: white ceramic with a gold lid
      m.part('focus');
      m.box(-19 + 1.55, 0.18, -9 + 2.3 + 12 - 0.3, 5.1, 0.4, 1.45, { base: 1.0, gap: 5, w: 1.1, edge: 1.3 }, {
        faces: {
          top(F) {
            F.draw((p) => {
              const k = F.px(1);
              p.fill('warm', rr2(1.9, 0.32, 1.3, 0.8, 0.06));
              p.ring('earth', rr2(1.9, 0.32, 1.3, 0.8, 0.06), 0.8 * k, 0.5);
              p.text('ink', 'MOS 6502', 0.85, 0.72, 0.28, { lod: 1, weight: 600 });
              p.fill('ink', ell2(0.25, 0.72, 0.09, 0.09, 8), 1);
              for (let i = 0; i < 20; i++) {
                p.fill('warm', [[0.15 + i * 0.25, -0.08], [0.24 + i * 0.25, -0.08], [0.24 + i * 0.25, 0.02], [0.15 + i * 0.25, 0.02]], 1);
              }
            });
            F.model.mark('focus', F, 0, 0, F.w, F.h);
          },
        },
      });
    },
  });

  // ---------- Big Brother, for the 1984 telescreen ----------
  // A head modelled as a height field over an ellipsoid (brow, eye sockets, nose, cheekbones, mouth,
  // chin), lit from the upper left, with dark hair, round spectacles and a dark suit. It is sampled
  // along the tube's scan lines; each line's width follows the brightness, as on a CRT.
  function bigBrother() {
    const G = (x, y, s) => Math.exp(-(x * x + y * y) / (2 * s * s));
    const height = (u, v) =>
      -0.13 * (G(u - 0.33, v + 0.08, 0.15) + G(u + 0.33, v + 0.08, 0.15)) +
      0.09 * (G(u - 0.3, v + 0.3, 0.17) + G(u + 0.3, v + 0.3, 0.17)) +
      0.16 * Math.exp(-((u / 0.085) ** 2)) * Math.min(1, Math.max(0, (v + 0.18) / 0.12)) * Math.min(1, Math.max(0, (0.3 - v) / 0.06)) +
      0.09 * G(u, v - 0.27, 0.09) +
      0.07 * (G(u - 0.43, v - 0.16, 0.2) + G(u + 0.43, v - 0.16, 0.2)) -
      0.07 * Math.exp(-(((v - 0.53) / 0.035) ** 2)) * Math.exp(-((u / 0.27) ** 2)) +
      0.05 * G(u, v - 0.82, 0.18);
    const L = [-0.48, -0.55, 0.68];
    const ll = Math.hypot(...L);
    const shade = (n) => Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / ll / (Math.hypot(...n) || 1));
    const cx = 150, cy = 134, rx = 50, ry = 64;
    function bright(X, Y) {
      const u = (X - cx) / rx, v = (Y - cy) / ry;
      const glow = 0.1 * G((X - cx) / 120, (Y - cy) / 120, 0.6);
      const r2 = u * u + v * v;
      if (r2 < 1) {
        const z = Math.sqrt(1 - r2), e = 0.01;
        const hu = (height(u + e, v) - height(u - e, v)) / (2 * e), hv = (height(u, v + e) - height(u, v - e)) / (2 * e);
        let b = 0.08 + 0.95 * shade([u - hu * 1.6, v - hv * 1.6, z]);
        // what is dark whatever the light: hair, eyebrows, eyes, the line of the mouth, the spectacles
        if (v < -0.52 + 0.08 * Math.cos(u * 5)) b *= 0.22 + 0.1 * Math.sin(u * 40 + v * 9);
        b *= 1 - 0.75 * (G(u - 0.3, v + 0.29, 0.06) + G(u + 0.3, v + 0.29, 0.06)) * 0.9;
        b *= 1 - 0.85 * (G(u - 0.33, v + 0.07, 0.045) + G(u + 0.33, v + 0.07, 0.045));
        b *= 1 - 0.7 * Math.exp(-(((v - 0.53) / 0.022) ** 2)) * Math.exp(-((u / 0.22) ** 2));
        for (const ex of [-0.33, 0.33]) { const d = Math.hypot(u - ex, (v + 0.07) * 1.1); if (Math.abs(d - 0.2) < 0.022) b *= 0.15; }
        if (Math.abs(v + 0.07) < 0.018 && Math.abs(u) < 0.13) b *= 0.2;
        if (Math.abs(u) > 0.92) b *= 0.5;
        return Math.min(1, b);
      }
      // the neck, the shirt collar and tie, and a dark suit across the shoulders
      if (v > 0.8 && v < 1.35 && Math.abs(u) < 0.42) return 0.12 + 0.6 * Math.max(0, 0.5 - u) * (1 - (v - 0.8));
      if (v >= 1.2) {
        const half = 0.5 + (v - 1.2) * 2.6;
        if (Math.abs(u) < half) {
          if (Math.abs(u) < 0.32 - (v - 1.2) * 0.9 && v < 1.6) return Math.abs(u) < 0.06 ? 0.12 : 0.75 - 0.3 * u;
          return 0.06 + 0.22 * Math.max(0, -u / half) + 0.05 * Math.sin(v * 30);
        }
      }
      return glow;
    }
    const runs = [];
    for (let Y = 46; Y < 232; Y += 2.6) {
      let pts = [], ws = [];
      const flush = () => {
        if (pts.length >= 2) {
          const P = pts, W = ws;
          runs.push({ pts: P, w: (x) => { let k = 0; for (let i = 1; i < P.length; i++) if (P[i][0] <= x) k = i; return W[k]; } });
        }
        pts = []; ws = [];
      };
      for (let X = 34; X < 270; X += 2) {
        const w = 2.2 * Math.pow(bright(X, Y), 0.85);
        if (w > 0.18) { pts.push([X, Y + 0.5 * Math.sin(X * 0.07 + Y)]); ws.push(w); } else flush();
      }
      flush();
    }
    return runs;
  }

  // ---------- Apple II, 1977 ----------
  // As photographed: the moulded case with its sloped keyboard, two Disk II drives and a Monitor III.
  // In pieces for assembly: the motherboard (with its 6502) stays put; the case, top, drives and
  // monitor fly in around it.
  const beige = { base: 0.98, fill: 'tint', gap: 7, w: 1.7 };
  const caseProfile = [[-23, 1.2], [-23, 11], [-4, 11], [19.5, 6], [21.6, 4.9], [21.6, 1.2]];
  const mono = 280, monoH = 232;
  add({
    name: 'Apple II',
    era: 'apple2',
    year: '1977',
    kind: 'Personal computer',
    line: 'Colour graphics, sound and eight expansion slots in a moulded plastic case. It sold for sixteen years.',
    verb: 'Zoom into Big Brother',
    tint: '#d9cfb6',
    tint2: '#55785a',
    view: { yaw: 30, pitch: 16 },
    fit: [700, 720],
    next: { type: 'screen', bg: 'ink', egg: '1984' },
    make(m) {
      // base pan and the inside of the case (seen only while it is being put together)
      m.part('base', { fly: { d: [0, 760], s: 1.25, at: [0.0, 0.45] } });
      m.op((p, P) => {
        const c = [[-19, 0, -23], [19, 0, -23], [19, 0, 21.6], [-19, 0, 21.6]].map(P);
        p.fill('ink', c.map(([x, y]) => [x + 14, y + 6]));
        p.pencil([P([-30, 0, 24]), P([30, 0, 24])], { role: 'graphite2', w: 0.7, over: 0, lod: 1 });
      }, [[-19, 0, -23], [19, 0, 22]], false);
      m.box(-18.6, 0, -22.6, 37.2, 1.25, 43.8, { base: 0.25, dark: true, fill: 'ink', gap: 5, w: 1.2 });
      m.flat(caseProfile.map(([z, y]) => [-18.7, y, z]), { base: 0.55, fill: 'tint', gap: 6, w: 1.5 });
      m.flat([[-18.7, 11, -22.7], [18.7, 11, -22.7], [18.7, 1.3, -22.7], [-18.7, 1.3, -22.7]], { base: 0.5, fill: 'tint', gap: 6, w: 1.5 });

      // the motherboard: power supply on the left, eight slots at the back, rows of RAM, the 6502 in front
      m.part('board');
      m.box(-18.5, 1.25, -22.5, 37, 0.15, 43.5, { base: 0.9, fill: 'tint2', gap: 9, w: 1.1, shade: false }, {
        faces: {
          top(F) {
            F.draw((p) => {
              for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
                p.fill('ink', rr2(10 + c * 2.8, 18 + r * 3.2, 1.9, 0.8, 0.1), 0.5);
              }
              p.text('light', 'APPLE II', 25, 40.5, 0.9, { lod: 1, weight: 600 });
            });
          },
        },
      });
      for (let i = 0; i < 8; i++) m.box(-6 + i * 3.1, 1.4, -21, 0.8, 1.2, 9, { base: 0.25, dark: true, fill: 'ink', gap: 3, w: 1 });
      m.box(-18.3, 1.4, -18, 6.2, 5.8, 26, { base: 0.82, gap: 5, w: 1.3 }, { faces: { right(F) { slots(F, 3, 1.2, 20, 2, 16); } } });
      m.cyl([-9, 1.4, 16], 2.2, 0.8, 'y', { base: 0.4, dark: true, fill: 'ink', gap: 3, w: 1 });
      m.box(-2.2, 1.4, 14.2, 5.1, 0.42, 1.45, { base: 0.3, dark: true, fill: 'ink', gap: 3, w: 1, edge: 1.3 }, {
        faces: {
          top(F) {
            text(F, 'MOS 6502', 2.55, 0.75, 0.42, { role: 'light', lod: 1 });
            F.model.mark('anchor', F, 0, 0, F.w, F.h);
          },
        },
      });

      // the outer walls of the case
      m.part('walls', { fly: { d: [0, 760], s: 1.25, at: [0.0, 0.45] } });
      m.extrude(caseProfile, -19, 19, beige, {
        skip: ['e0', 'e1', 'e2', 'e3', 'e5', 'left'],
        faces: {
          right(F) {
            // the vents near the back
            F.draw((p) => {
              for (let i = 0; i < 13; i++) p.fill('ink', [[30.6 + i * 1.1, 1.6], [31.1 + i * 1.1, 1.6], [30.7 + i * 1.1, 6.2], [30.2 + i * 1.1, 6.2]], 0.5);
            });
          },
          e4(F) { F.draw((p) => p.gouge('ink', [[0, 0.1], [38, 0.1]], F.px(1.6), { smooth: false, taper: 0.3 })); },
        },
      });

      // the top of the case: lid, keyboard slope and the rainbow badge
      m.part('shell', { fly: { d: [0, -820], s: 1.5, r: -0.12, at: [0.25, 0.7] } });
      m.extrude(caseProfile, -19, 19, beige, {
        skip: ['e0', 'e4', 'e5', 'left', 'right'],
        faces: {
          e1(F) { F.draw((p) => p.ring('earth', rr2(1.2, 0.8, 35.6, 17.4, 0.6), F.px(0.9), 1)); },
          e2(F) {
            F.draw((p) => {
              p.fill('tint', rr2(5.6, 5.9, 26.8, 15.6, 0.5));
              p.ring('earth', rr2(5.6, 5.9, 26.8, 15.6, 0.5), F.px(1), 0.5);
              p.fill('ink', rr2(14, 1.5, 10, 2.6, 0.25));
              p.text('light', 'apple ][', 19, 2.8, 1.25, { font: 'serif', italic: true, lod: 0.5 });
              p.fill('light', rr2(3.4, 17.5, 1.2, 0.9, 0.15), 0.5);
            });
            keyboard(F, 6.3, 6.6, 25.4, 14.4, [
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.4],
              [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
              [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6],
              [-2.4, 8.6, -2.4],
            ], { cap: 'umber', hi: 'earth', stagger: true });
          },
        },
      });

      // two Disk II drives: drive 2 on the left, drive 1 on the right
      const drive = (x, n, name, fly) => {
        m.part(name, { fly });
        m.box(x, 11, -23.4, 17.6, 8.6, 21.4, beige, {
          faces: {
            front(F) {
              F.draw((p) => {
                const k = F.px(1);
                p.fill('ink', rr2(0.5, 0.5, 16.6, 7.6, 0.2));
                p.gouge('paper', [[2.6, 3.4], [14.6, 3.4]], 1.4 * k, { smooth: false, taper: 0.3 });
                p.fill('umber', rr2(7.4, 1.0, 2.2, 3.6, 0.15));
                p.gouge('earth', [[7.6, 1.2], [9.4, 1.2]], k, { smooth: false });
                p.text('light', 'disk II', 1.4, 6.9, 1.2, { font: 'serif', weight: 600, align: 'left', lod: 0.5 });
                p.text('light', 'IN USE ▸', 1.4, 5.3, 0.45, { align: 'left', lod: 1 });
                p.fill('earth', ell2(4.4, 5.3, 0.22, 0.22, 10), 0.5);
                p.text('light', 'DRIVE ' + n, 15.6, 6.9, 0.55, { align: 'right', lod: 1 });
              });
            },
            top(F) { F.draw((p) => p.gouge('earth', [[0.6, 1.5], [17, 1.5]], F.px(0.8), { smooth: false, lod: 1 })); },
          },
        });
      };
      drive(-18.3, 2, 'drive2', { d: [-980, -120], s: 1.3, r: 0.1, at: [0.4, 0.82] });
      drive(0.7, 1, 'drive1', { d: [980, -60], s: 1.3, r: -0.1, at: [0.45, 0.86] });

      // the Monitor III: a deep beige box, the tube set back in a tunnel, controls down the right
      m.part('monitor', { fly: { d: [0, -1100], s: 1.6, at: [0.55, 1] } });
      const monProfile = [[-25, 19.6], [-25, 33.5], [-12, 45.5], [1.6, 45.5], [1.6, 19.6]];
      m.extrude(monProfile, -16, 16, beige, {
        faces: {
          e3(F) {
            F.draw((p) => {
              const k = F.px(1);
              // the tunnel round the tube: dark top, lit left and bottom
              const o = [1.6, 1.5, 24.6, 21.4], i = [3.8, 3.4, 22.4, 19.4];
              p.fill('ink', [[o[0], o[1]], [o[2], o[1]], [i[2], i[1]], [i[0], i[1]]]);
              p.fill('earth', [[o[0], o[1]], [i[0], i[1]], [i[0], i[3]], [o[0], o[3]]]);
              p.hatch('ink', [[o[0], o[1]], [i[0], i[1]], [i[0], i[3]], [o[0], o[3]]], { angle: Math.PI / 2, gap: 0.35, w: 0.9 * k, lod: 1 });
              p.fill('tint', [[o[0], o[3]], [i[0], i[3]], [i[2], i[3]], [o[2], o[3]]]);
              p.fill('umber', [[o[2], o[1]], [o[2], o[3]], [i[2], i[3]], [i[2], i[1]]]);
              p.ring('earth', [[o[0], o[1]], [o[2], o[1]], [o[2], o[3]], [o[0], o[3]]], 0.9 * k, 0.5);
              p.gouge('ink', [[0.4, 23.6], [31.6, 23.6]], 1.4 * k, { smooth: false, taper: 0.3 });
              // controls and badge down the right
              p.gouge('earth', [[26.2, 0.5], [26.2, 23]], 0.9 * k, { smooth: false, lod: 1 });
              for (const y of [3, 13]) {
                p.ring('ink', ell2(28.6, y, 0.7, 0.7, 14), 0.8 * k, 0.5);
                p.ring('ink', rr2(28.1, y - 0.35, 1, 0.7, 0.1), 0.6 * k, 1);
              }
              p.fill('umber', rr2(27.9, 15.8, 1.4, 4.4, 0.2));
              p.gouge('light', [[28.6, 16.6], [28.6, 19.4]], 0.8 * k, { smooth: false, lod: 1 });
              p.fill('umber', rr2(27.8, 21.2, 1.6, 1.6, 0.2));
              ['tint', 'earth', 'paper'].forEach((r, j) => p.fill(r, rr2(28, 21.4 + j * 0.42, 1.2, 0.3, 0.05), 1));
            });
            screen(F, [3.8, 3.4, 18.6, 16], {
              ui: [mono, monoH],
              bg: 'ink',
              r: 1.4,
              // 1984: Big Brother fills the tube until the hammer comes through it (drawn by the app);
              // the Macintosh steps out of the light where his face was
              portal: [64, 56, 172],
              draw(p, Wd, Ht) {
                const g = '#bfe3b0';
                p.text(g, ']LOAD 1984', 12, 18, 10, { align: 'left', lod: 0.5 });
                p.text(g, ']RUN', 12, 32, 10, { align: 'left', lod: 0.5 });
                // Big Brother on the telescreen: a lit, modelled head drawn the way a tube draws it,
                // in scan lines whose thickness is the brightness
                const lines = bigBrother();
                for (const run of lines) p.gouge(g, run.pts, run.w, { smooth: false, n: 1, taper: 0.15, pow: 0.3, lod: 0.5 });
              },
            });
          },
          right(F) { F.draw((p) => p.gouge('earth', [[2.2, 1.5], [2.2, 24]], F.px(0.9), { smooth: false, lod: 1 })); },
        },
      });
      m.op((p, P) => p.note(...P([-30, 0, 30]), '$1,298 with 4 KB of memory', { align: 'left' }), [[-19, 0, 26]], false);
    },
    extras(ctx, s) {
      // the cursor blinks after the prompt
      if (Math.floor(s.time * 2) % 2) return;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#bfe3b0';
      ctx.fillRect(40, 26, 7, 12);
    },
  });
})();
