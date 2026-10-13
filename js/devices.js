// devices.js: the machines, each drawn in a 1000×1000 local frame (centre 500,500).
// `portal` is where the next machine lives: a screen, a silkscreen, a die or a sticker.
'use strict';

(function (global) {
  const { Plate, clamp } = Ink;
  const PI = Math.PI;

  // ---------- geometry helpers ----------
  function rr(x, y, w, h, r, n = 6) {
    r = Math.max(0.01, Math.min(r, w / 2, h / 2));
    const pts = [];
    const cs = [[x + w - r, y + r, -PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, PI / 2], [x + r, y + r, PI]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }
  function ell(cx, cy, rx, ry = rx, n = 44) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return pts;
  }
  function rot(pts, cx, cy, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
  }
  const rotPt = (x, y, cx, cy, a) => rot([[x, y]], cx, cy, a)[0];
  const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
  // Keep the part of a polygon where nx*x + ny*y >= d.
  function clipHalf(pts, nx, ny, d) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const da = nx * a[0] + ny * a[1] - d, db = nx * b[0] + ny * b[1] - d;
      if (da >= 0) out.push(a);
      if (da * db < 0) {
        const t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return out;
  }
  // Bilinear point inside a quad given as [backLeft, backRight, frontRight, frontLeft].
  function qpt(q, u, v) {
    const [a, b, c, d] = q;
    const tx = a[0] + (b[0] - a[0]) * u, ty = a[1] + (b[1] - a[1]) * u;
    const bx = d[0] + (c[0] - d[0]) * u, by = d[1] + (c[1] - d[1]) * u;
    return [tx + (bx - tx) * v, ty + (by - ty) * v];
  }
  const qrect = (q, u0, v0, u1, v1) => [qpt(q, u0, v0), qpt(q, u1, v0), qpt(q, u1, v1), qpt(q, u0, v1)];
  // Tone that brightens toward (x0,y0): light falls from the top-left.
  const grad = (x0, y0, x1, y1, a, b) => (x, y) => {
    const dx = x1 - x0, dy = y1 - y0;
    const t = clamp(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy), 0, 1);
    return a + (b - a) * t;
  };

  // ---------- shared marks ----------
  function groundShadow(p, cx, cy, rx, ry) {
    p.fill('ink', ell(cx, cy, rx, ry, 64));
    for (let i = 0; i < 22; i++) {
      const y = cy - ry * 0.5 + p.rand() * ry * 1.4;
      const x = cx + rx * p.rand(0.35, 0.85);
      const len = p.rand(50, 130);
      p.gouge('ink', [[x, y], [x + len * 0.5, y + 1.5], [x + len, y + 2.5]], p.rand(1.2, 2.6), { lod: 1, skew: 0.22, taper: 0.02 });
    }
    for (let i = 0; i < 16; i++) {
      const y = cy - ry * 0.35 + p.rand() * ry * 0.9;
      const x = cx - rx * p.rand(0.1, 0.8);
      const len = p.rand(40, 110);
      p.gouge('paper', [[x, y], [x + len * 0.5, y + 1], [x + len, y + 1.5]], p.rand(0.8, 1.8), { lod: 1, taper: 0.02 });
    }
  }

  function keys(p, q, rows, cols, u0, v0, u1, v1, o = {}) {
    const du = (u1 - u0) / cols, dv = (v1 - v0) / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * du * 0.35;
      const n = r === rows - 1 && o.space ? 0 : cols;
      for (let c = 0; c < n; c++) {
        const ua = u0 + c * du + off, ub = ua + du * 0.8;
        if (ub > u1 + 0.001) continue;
        const k = qrect(q, ua, v0 + r * dv, ub, v0 + r * dv + dv * 0.72);
        p.fill(o.role || 'light', k, o.lod ?? 0.5);
        if (o.shadow !== false) p.gouge(o.shadowRole || 'ink', [k[3], qpt(q, (ua + ub) / 2, v0 + r * dv + dv * 0.78), k[2]], o.sw ?? 2.2, { lod: 1, taper: 0.2 });
        if (o.hi) p.gouge(o.hi, [k[0], k[1]], 1.1, { lod: 1, smooth: false, taper: 0.2 });
      }
      if (n === 0) {
        const k = qrect(q, u0 + du * 2.5, v0 + r * dv, u1 - du * 2.5, v0 + r * dv + dv * 0.72);
        p.fill(o.role || 'light', k, o.lod ?? 0.5);
        if (o.shadow !== false) p.gouge(o.shadowRole || 'ink', [k[3], k[2]], o.sw ?? 2.2, { lod: 1, smooth: false, taper: 0.2 });
        if (o.hi) p.gouge(o.hi, [k[0], k[1]], 1.1, { lod: 1, smooth: false, taper: 0.2 });
      }
    }
  }

  // Diagonal glare across a screen; it fades as you pass through the glass.
  function glare(p, P, role = 'light') {
    const x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2;
    const L = Math.min(P.w, P.h);
    for (let i = 0; i < 3; i++) {
      const o = 0.12 + i * 0.07;
      p.gouge(role, [[x0 + P.w * o, y0 + 4], [x0 + P.w * o - L * 0.12, y0 + L * 0.2], [x0 + 6, y0 + P.h * (o + 0.06) + L * 0.12]], [9, 4, 2.5][i] * L / 300, { lod: 0.5, taper: 0.02 });
    }
  }

  function portalShape(P) {
    return rot(rr(P.cx - P.w / 2, P.cy - P.h / 2, P.w, P.h, P.r || 0.01, 8), P.cx, P.cy, P.rot || 0);
  }

  // ---------- the machines ----------
  const D = [];

  // 0 — Apple I, 1976: a bare board. The next machine is printed in its silkscreen.
  {
    const th = -0.06, R = (pts) => rot(pts, 500, 500, th);
    const pc = rotPt(725, 445, 500, 500, th);
    D.push({
      name: 'Apple I',
      year: '1976',
      kind: 'Circuit board',
      line: 'Hand-built in Los Altos and sold as a bare board. You supplied the case, the keyboard and the television.',
      verb: 'Zoom into the silkscreen',
      tint: '#56745c',
      board: '#56745c',
      silk: '#f1e9d6',
      portal: { cx: pc[0], cy: pc[1], w: 250, h: 230, r: 4, rot: th, type: 'pcb', m: 0.88 },
      heat: [{ x: 430, y: 600, w: 120 }],
      draw(p) {
        p.fill('ink', R(rr(128, 300, 762, 432, 12)).map(([x, y]) => [x + 8, y + 10]));
        groundShadow(p, 540, 735, 390, 22);
        p.fill('ink', R(rr(120, 296, 760, 430, 10)));
        const board = R(rr(120, 285, 760, 430, 10));
        p.face(board, grad(150, 300, 860, 700, 0.85, 0.55), { fill: 'tint', angle: th - 0.75, gap: 10, w: 1.5 });
        for (const [x, y] of [[138, 303], [862, 303], [138, 697], [862, 697]]) {
          const [cx, cy] = rotPt(x, y, 500, 500, th);
          p.fill('paper', ell(cx, cy, 8));
          p.ring('ink', ell(cx, cy, 8, 8, 20), 2, 0.5);
        }
        // traces
        for (const v of [360, 415, 470, 525, 580]) {
          const a = rotPt(150, v, 500, 500, th), b = rotPt(585, v, 500, 500, th);
          p.gouge('ink', [a, b], 1.2, { smooth: false, taper: 0.5, lod: 1 });
        }
        for (const u of [150, 590]) {
          const a = rotPt(u, 320, 500, 500, th), b = rotPt(u, 690, 500, 500, th);
          p.gouge('ink', [a, b], 1.2, { smooth: false, taper: 0.5, lod: 1 });
        }
        // DIP chips
        const rowsV = [330, 385, 440, 495, 550];
        rowsV.forEach((v, r) => {
          const cols = r === 4 ? 3 : 5;
          for (let c = 0; c < cols; c++) {
            const u = 165 + c * 82;
            p.fill('ink', R(rr(u, v, 62, 24, 3)));
            p.gouge('paper', R([[u + 8, v + 5], [u + 54, v + 5]]), 1.8, { lod: 1, smooth: false });
            p.fill('paper', R(ell(u + 5, v + 12, 3.5, 3.5, 10)), 1);
            for (let i = 0; i < 7; i++) {
              p.fill('light', R(rr(u + 6 + i * 8.2, v - 4, 3, 4, 0.5)), 1);
              p.fill('light', R(rr(u + 6 + i * 8.2, v + 24, 3, 4, 0.5)), 1);
            }
          }
          const t = rotPt(150, v + 12, 500, 500, th);
          p.text('light', 'ABCDE'[r], t[0], t[1], 11, { rot: th, lod: 1 });
        });
        // the 6502
        p.fill('ink', R(rr(165, 600, 170, 40, 4)));
        p.gouge('paper', R([[175, 607], [325, 607]]), 2, { lod: 1, smooth: false });
        for (let i = 0; i < 20; i++) {
          p.fill('light', R(rr(170 + i * 8.2, 595, 3, 5, 0.5)), 1);
          p.fill('light', R(rr(170 + i * 8.2, 640, 3, 5, 0.5)), 1);
        }
        const c6 = rotPt(250, 622, 500, 500, th);
        p.text('light', 'MOS 6502', c6[0], c6[1], 12, { rot: th, lod: 1 });
        // heatsink
        for (let i = 0; i < 9; i++) {
          p.fill('ink', R(rr(365 + i * 15, 600, 10, 92, 2)));
          p.gouge('paper', R([[367 + i * 15, 606], [367 + i * 15, 686]]), 1.6, { lod: 1, smooth: false });
        }
        // capacitors
        for (const [x, y, r] of [[575, 640, 32], [655, 652, 27], [735, 640, 31], [812, 658, 22]]) {
          const [cx, cy] = rotPt(x, y, 500, 500, th);
          p.face(ell(cx, cy, r, r), grad(cx - r, cy - r, cx + r, cy + r, 0.92, 0.42), { gap: 6, w: 1.8, angle: 0.6 });
          p.ring('ink', ell(cx, cy, r, r, 36), 2.6);
          p.line('ink', cx - r * 0.5, cy, cx + r * 0.5, cy, 1.8, { lod: 0.5 });
          p.line('ink', cx, cy - r * 0.5, cx, cy + r * 0.5, 1.8, { lod: 0.5 });
        }
        // silkscreen around the window and on the board edge
        p.ring('light', R(rr(590, 320, 270, 250, 7)), 2, 0.5);
        for (const [x, y, sx, sy] of [[590, 320, 1, 1], [860, 320, -1, 1], [590, 570, 1, -1], [860, 570, -1, -1]]) {
          p.gouge('light', R([[x, y + sy * 18], [x, y], [x + sx * 18, y]]), 3, { lod: 0.5, smooth: false, taper: 0.4 });
        }
        const lab = rotPt(725, 306, 500, 500, th);
        p.text('light', 'FIG. 2  →  APPLE ][', lab[0], lab[1], 11, { rot: th, lod: 1, track: 1 });
        const sig = rotPt(140, 703, 500, 500, th);
        p.text('light', 'APPLE COMPUTER 1   PALO ALTO, CA.   COPYRIGHT 1976', sig[0], sig[1], 11.5, { rot: th, align: 'left', lod: 1, track: 0.5 });
      },
    });
  }

  // 1 — Apple II, 1977
  D.push({
    name: 'Apple II',
    year: '1977',
    kind: 'Personal computer',
    line: 'Colour graphics, sound and eight expansion slots in a moulded plastic case. It sold for sixteen years.',
    verb: 'Zoom into the screen',
    tint: '#cdb48c',
    crt: true,
    portal: { cx: 500, cy: 345, w: 310, h: 270, r: 34, type: 'screen', bg: 'light', m: 0.86 },
    heat: [{ x: 520, y: 120, w: 300 }],
    draw(p) {
      groundShadow(p, 530, 752, 380, 22);
      const top = [[215, 515], [785, 515], [835, 665], [165, 665]];
      p.face([[835, 665], [785, 515], [812, 500], [866, 650], [866, 728], [835, 745]], 0.22, { angle: PI / 2, gap: 9 });
      p.face(top, grad(215, 515, 835, 665, 0.9, 0.7), { fill: 'tint', gap: 7, w: 1.8 });
      p.face([[165, 665], [835, 665], [835, 745], [165, 745]], grad(165, 665, 835, 745, 0.72, 0.5), { fill: 'tint', gap: 7, w: 2 });
      p.gouge('ink', [[165, 666], [835, 666]], 2.6, { smooth: false, taper: 0.3 });
      p.fill('ink', rr(196, 690, 74, 22, 3));
      p.text('light', 'apple ][', 233, 701, 12, { font: 'serif', italic: true, lod: 0.5 });
      keys(p, top, 4, 13, 0.06, 0.5, 0.94, 0.97, { role: 'umber', shadowRole: 'ink', hi: 'paper', sw: 1.4 });
      // monitor
      p.fill('ink', [[300, 562], [722, 562], [740, 582], [305, 582]]);
      p.face([[715, 150], [750, 126], [750, 545], [715, 565]], 0.25, { angle: PI / 2, gap: 9 });
      p.face([[285, 150], [715, 150], [750, 126], [320, 126]], 0.88, { gap: 6, w: 1.5 });
      p.face(rr(285, 150, 430, 415, 10), grad(285, 150, 715, 565, 0.86, 0.6), { gap: 7, w: 2 });
      p.fill('ink', rr(326, 192, 348, 306, 40));
      p.ring('paper', rr(334, 200, 332, 290, 36), 1.6, 1);
      p.fill('ink', rr(310, 524, 70, 16, 3));
      for (const x of [622, 652]) {
        p.fill('ink', ell(x, 532, 9));
        p.line('paper', x - 4, 528, x + 1, 532, 1.6, { lod: 1 });
      }
    },
    glass(p) { glare(p, this.portal); },
  });

  // 2 — Macintosh 128K, 1984
  D.push({
    name: 'Macintosh 128K',
    year: '1984',
    kind: 'All-in-one',
    line: 'A 9-inch screen, a mouse and 128 KB of memory in one upright box. The team’s signatures are moulded inside the case.',
    verb: 'Zoom into the screen',
    tint: '#d6c6a3',
    crt: true,
    portal: { cx: 500, cy: 297, w: 268, h: 218, r: 18, type: 'screen', bg: 'light', m: 0.86 },
    heat: [{ x: 520, y: 112, w: 220 }],
    draw(p) {
      groundShadow(p, 525, 668, 235, 16);
      groundShadow(p, 470, 792, 215, 10);
      p.face([[682, 140], [722, 112], [722, 627], [682, 655]], grad(682, 140, 722, 655, 0.38, 0.18), { angle: PI / 2, gap: 9 });
      p.face([[318, 140], [682, 140], [722, 112], [358, 112]], 0.9, { fill: 'tint', gap: 6, w: 1.4 });
      p.fill('ink', [[430, 124], [610, 124], [622, 118], [442, 118]]);
      const front = rr(318, 140, 364, 515, 12);
      p.face(front, grad(318, 140, 682, 655, 0.86, 0.58), { fill: 'tint', gap: 7, w: 2 });
      p.fill('ink', rr(345, 168, 310, 260, 16));
      p.ring('paper', rr(356, 178, 288, 240, 20), 1.5, 1);
      p.fill('ink', rr(520, 500, 120, 10, 4));
      p.fill('ink', ell(652, 505, 3));
      p.gouge('ink', [[322, 592], [678, 592]], 2.4, { smooth: false, taper: 0.3, lod: 0.5 });
      for (let i = 0; i < 5; i++) p.gouge('ink', [[330, 610 + i * 9], [670, 610 + i * 9]], 1.3, { smooth: false, taper: 0.1, lod: 1 });
      // keyboard and mouse
      const kb = [[300, 700], [640, 700], [662, 770], [272, 770]];
      p.face(kb, 0.85, { fill: 'tint', gap: 7, w: 1.6 });
      p.fill('ink', [[272, 770], [662, 770], [662, 782], [272, 782]]);
      keys(p, kb, 4, 12, 0.04, 0.12, 0.96, 0.92, { role: 'light', sw: 1.6 });
      p.gouge('ink', [[730, 700], [748, 672], [735, 652], [700, 645]], 3.5, { taper: 0.4 });
      groundShadow(p, 742, 795, 42, 8);
      const mouse = rr(705, 700, 62, 88, 22);
      p.face(mouse, grad(705, 700, 767, 788, 0.92, 0.6), { fill: 'tint', gap: 6, w: 1.6, edge: 2 });
      p.gouge('ink', [[712, 728], [760, 728]], 2, { smooth: false, taper: 0.2 });
    },
    glass(p) { glare(p, this.portal); },
    extras(ctx, s) {
      // It said hello.
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.pal.ink;
      ctx.font = `400 30px ${Ink.FONTS.serif}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
      ctx.fillText('hello', 376, 214);
      ctx.globalAlpha = 1;
    },
  });

  // 3 — PowerBook 100, 1991
  D.push({
    name: 'PowerBook 100',
    year: '1991',
    kind: 'Notebook',
    line: 'The keyboard moved back and the trackball moved to the centre, which set the shape of laptops for decades.',
    verb: 'Zoom into the screen',
    tint: '#b5b7a0',
    portal: { cx: 500, cy: 309, w: 420, h: 290, r: 3, type: 'screen', bg: 'tint', m: 0.86 },
    draw(p) {
      groundShadow(p, 520, 790, 385, 16);
      const deck = [[235, 518], [765, 518], [850, 760], [150, 760]];
      p.face(deck, grad(235, 518, 850, 760, 0.62, 0.46), { gap: 7, w: 2, edge: 1.8 });
      p.fill('ink', [[150, 760], [850, 760], [850, 784], [150, 784]]);
      keys(p, deck, 5, 13, 0.07, 0.05, 0.93, 0.5, { role: 'ink', hi: 'paper', shadow: false });
      const tb = ell(500, 676, 44, 30);
      p.fill('ink', ell(500, 676, 54, 38));
      p.face(tb, grad(460, 650, 540, 705, 0.75, 0.25), { gap: 5, w: 1.8, angle: 0.5 });
      p.gouge('light', [[472, 664], [488, 654], [506, 652]], 3, { lod: 0.5 });
      p.fill('ink', [[436, 722], [564, 722], [576, 748], [424, 748]]);
      p.gouge('paper', [[500, 724], [500, 746]], 1.4, { smooth: false, lod: 1 });
      p.fill('ink', rr(300, 500, 400, 18, 6));
      p.gouge('paper', [[310, 504], [690, 504]], 1.4, { smooth: false, lod: 1 });
      p.face(rr(240, 120, 520, 380, 14), grad(240, 120, 760, 500, 0.44, 0.3), { gap: 8, w: 2 });
      p.fill('ink', rr(272, 148, 456, 324, 8));
      p.text('paper', 'PowerBook 100', 500, 486, 11, { lod: 1, weight: 500 });
    },
    glass(p) { glare(p, this.portal); },
  });

  // 4 — iMac G3, 1998
  {
    const body = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * PI * 2, c = Math.cos(a), s = Math.sin(a);
      const x = Math.sign(c) * Math.pow(Math.abs(c), 0.55), y = Math.sign(s) * Math.pow(Math.abs(s), 0.7);
      body.push([500 + 285 * x * (1 - 0.16 * ((y + 1) / 2)), 430 + 330 * y]);
    }
    D.push({
      name: 'iMac G3',
      year: '1998',
      kind: 'All-in-one',
      line: 'Translucent Bondi Blue plastic, a handle on top, and no floppy drive at all.',
      verb: 'Zoom into the screen',
      tint: '#3f8c92',
      crt: true,
      portal: { cx: 500, cy: 297, w: 316, h: 244, r: 30, type: 'screen', bg: 'light', m: 0.86 },
      heat: [{ x: 500, y: 112, w: 220 }],
      draw(p) {
        groundShadow(p, 520, 772, 250, 14);
        const back = shift(body, 26, -10);
        p.face(back, 0.45, { fill: 'tint', angle: PI / 2 - 0.2, gap: 10, w: 2 });
        p.face(body, (x, y) => clamp(1.05 - Math.hypot(x - 380, y - 230) / 650, 0.2, 1), { hatch: false });
        p.rings('ink', 380, 260, 330, 380, { n: 16, from: 0.55, to: 1.45, w: 2.4, clip: body, tone: (x, y) => clamp((Math.hypot(x - 380, y - 230) - 260) / 330, 0, 1) });
        const chin = clipHalf(body, 0, 1, 520);
        p.face(chin, grad(300, 520, 700, 760, 0.9, 0.6), { fill: 'tint', gap: 9, w: 1.8 });
        for (let x = 262; x < 750; x += 16) p.gouge('light', [[x, 524], [x - 4, 748]], 1.3, { lod: 1, taper: 0.1 });
        for (const cx of [352, 648]) {
          p.fill('ink', ell(cx, 586, 42, 12));
          p.dots('paper', ell(cx, 586, 38, 9), 6, 1.3);
        }
        p.fill('ink', rr(445, 650, 110, 6, 3));
        p.fill('umber', rr(318, 152, 364, 290, 46));
        p.ring('paper', rr(330, 164, 340, 266, 40), 1.4, 1);
        p.ring('ink', body, 2.6);
      },
      glass(p) { glare(p, this.portal); },
    });
  }

  // 5 — iPod, 2001
  D.push({
    name: 'iPod',
    year: '2001',
    kind: 'Music player',
    line: 'A 5 GB hard drive and a scroll wheel that really turned. A thousand songs in your pocket.',
    verb: 'Zoom into the screen',
    tint: '#bcbcaa',
    portal: { cx: 500, cy: 299, w: 250, h: 188, r: 5, type: 'screen', bg: 'tint', m: 0.88 },
    draw(p) {
      groundShadow(p, 520, 736, 190, 12);
      p.face(rr(348, 150, 340, 567, 46), 0.3, { angle: PI / 2, gap: 9, w: 2.6 });
      p.face(rr(330, 160, 340, 567, 44), grad(330, 160, 670, 727, 0.98, 0.8), { gap: 7, w: 1.6, edge: 1.8 });
      p.ring('ink', rr(370, 201, 260, 196, 8), 2.2);
      const wheel = ell(500, 565, 112, 112, 64);
      p.face(wheel, grad(400, 460, 610, 670, 0.96, 0.72), { hatch: false });
      p.rings('ink', 500, 565, 112, 112, { n: 7, from: 0.45, to: 0.95, w: 1.8, tone: (x, y) => clamp(((x - 500) + (y - 565)) / 140, 0, 1) });
      p.ring('ink', ell(500, 565, 112, 112, 64), 2);
      p.face(ell(500, 565, 40, 40), 0.96, { hatch: false, edge: 1.6 });
      p.text('earth', 'MENU', 500, 476, 13, { lod: 0.5, weight: 600, track: 1 });
      const tri = (x, y, d) => p.fill('earth', [[x, y - 7], [x + 10 * d, y], [x, y + 7]], 0.5);
      tri(404, 565, -1); tri(414, 565, -1); p.fill('earth', rr(395, 558, 3, 14, 0.5), 0.5);
      tri(586, 565, 1); tri(596, 565, 1); p.fill('earth', rr(602, 558, 3, 14, 0.5), 0.5);
      tri(486, 652, 1); p.fill('earth', rr(502, 645, 3.5, 14, 0.5), 0.5); p.fill('earth', rr(509, 645, 3.5, 14, 0.5), 0.5);
      p.fill('ink', rr(372, 152, 44, 9, 3));
      p.fill('ink', ell(622, 155, 7));
      // earbuds
      const cable = [[622, 152], [640, 108], [700, 86], [760, 116], [778, 190], [770, 262]];
      p.gouge('ink', cable, 8, { taper: 0.6 });
      p.gouge('light', cable, 4.2, { taper: 0.5 });
      for (const end of [[818, 338], [728, 350]]) {
        const br = [[770, 262], [(770 + end[0]) / 2 + (end[0] > 770 ? 14 : -10), (262 + end[1]) / 2], end];
        p.gouge('ink', br, 7, { taper: 0.6 });
        p.gouge('light', br, 3.6, { taper: 0.5 });
        p.face(ell(end[0], end[1] + 14, 20, 20), grad(end[0] - 20, end[1], end[0] + 20, end[1] + 30, 0.97, 0.7), { gap: 5, w: 1.4, edge: 1.8 });
        p.dots('ink', ell(end[0], end[1] + 14, 11, 11), 5, 1.1);
      }
    },
    glass(p) { glare(p, this.portal); },
    extras(ctx, s) {
      const P = this.portal, x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.pal.ink;
      ctx.font = `600 11px ${Ink.FONTS.mono}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('iPod', P.cx, y0 + 11);
      ctx.fillRect(x0 + 4, y0 + 20, P.w - 8, 1.4);
      ctx.fillRect(x0 + P.w - 26, y0 + 7, 16, 8);
      ctx.fillRect(x0 + P.w - 10, y0 + 9, 2, 4);
      ctx.globalAlpha = 1;
    },
  });

  // 6 — iPhone, 2007
  D.push({
    name: 'iPhone',
    year: '2007',
    kind: 'Phone',
    line: 'A widescreen iPod, a phone and an internet communicator in one. The clocks in every ad read 9:41.',
    verb: 'Zoom into the screen',
    tint: '#a7a299',
    portal: { cx: 500, cy: 498, w: 264, h: 396, r: 2, type: 'screen', bg: 'light', m: 0.86 },
    draw(p) {
      groundShadow(p, 520, 800, 175, 12);
      p.face(rr(359, 199, 310, 586, 46), 0.55, { fill: 'tint', angle: PI / 2, gap: 8, w: 1.8 });
      p.face(rr(345, 207, 310, 586, 46), 0.95, { hatch: false });
      p.ring('ink', rr(345, 207, 310, 586, 46), 1.6);
      p.fill('ink', rr(352, 214, 296, 572, 40));
      p.hatch('earth', rr(352, 214, 296, 572, 40), { angle: -0.9, gap: 16, w: 1.4, lod: 1 });
      p.fill('earth', rr(468, 252, 64, 8, 4), 0.5);
      p.ring('earth', ell(500, 745, 25, 25, 36), 2.4, 0.5);
      p.ring('earth', rr(491, 736, 18, 18, 4), 1.2, 1);
    },
    glass(p) {
      const P = this.portal;
      p.gouge('light', [[P.cx + 40, P.cy - P.h / 2 + 2], [P.cx - 60, P.cy - 40], [P.cx - P.w / 2 + 2, P.cy + 30]], 16, { lod: 0.5, taper: 0.02 });
      p.gouge('light', [[P.cx + 84, P.cy - P.h / 2 + 2], [P.cx - 10, P.cy - 30], [P.cx - P.w / 2 + 2, P.cy + 86]], 4, { lod: 0.5, taper: 0.02 });
    },
    extras(ctx, s) {
      const P = this.portal, x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.pal.ink;
      ctx.fillRect(x0, y0, P.w, 20);
      ctx.fillStyle = s.pal.light;
      ctx.font = `600 11px ${Ink.FONTS.mono}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('9:41 AM', P.cx, y0 + 10.5);
      for (let i = 0; i < 5; i++) ctx.fillRect(x0 + 6 + i * 4, y0 + 14 - i * 2, 2.6, 2 + i * 2);
      ctx.fillRect(x0 + P.w - 26, y0 + 6, 18, 9);
      // slide to unlock, with its travelling shine
      const by = y0 + P.h - 52;
      ctx.fillStyle = s.pal.ink;
      ctx.fillRect(x0, by, P.w, 52);
      ctx.fillStyle = s.pal.light;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x0 + 10, by + 10, 52, 32, 6) : ctx.rect(x0 + 10, by + 10, 52, 32);
      ctx.fill();
      ctx.fillStyle = s.pal.ink;
      ctx.beginPath();
      ctx.moveTo(x0 + 28, by + 19); ctx.lineTo(x0 + 44, by + 26); ctx.lineTo(x0 + 28, by + 33); ctx.closePath();
      ctx.fill();
      ctx.font = `400 13px ${Ink.FONTS.mono}`;
      ctx.fillStyle = s.pal.earth;
      ctx.fillText('slide to unlock', x0 + 160, by + 27);
      const sx = x0 + 90 + ((s.time * 70) % 180);
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - 16, by, 32, 52);
      ctx.clip();
      ctx.fillStyle = s.pal.light;
      ctx.fillText('slide to unlock', x0 + 160, by + 27);
      ctx.restore();
      ctx.globalAlpha = 1;
    },
  });

  // 7 — MacBook Air, 2008
  D.push({
    name: 'MacBook Air',
    year: '2008',
    kind: 'Notebook',
    line: 'Pulled out of an interoffice envelope on stage. 0.76 inches at its thickest point.',
    verb: 'Zoom into the screen',
    tint: '#c9a66c',
    portal: { cx: 500, cy: 336, w: 504, h: 318, r: 2, type: 'screen', bg: 'light', m: 0.86 },
    draw(p) {
      // the envelope behind it
      const env = rot(rr(130, 430, 760, 400, 6), 510, 630, -0.07);
      p.fill('ink', shift(env, 8, 10));
      p.face(env, grad(130, 430, 890, 830, 0.82, 0.6), { fill: 'tint', angle: -0.07, gap: 9, w: 1.4 });
      p.ring('ink', env, 1.8);
      for (let r = 0; r < 6; r++) {
        const a = rotPt(150, 470 + r * 26, 510, 630, -0.07), b = rotPt(870, 470 + r * 26, 510, 630, -0.07);
        p.gouge('earth', [a, b], 1.4, { smooth: false, taper: 0.4, lod: 1 });
      }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
        const [x, y] = rotPt(170 + c * 660, 560 + r * 70, 510, 630, -0.07);
        p.fill('paper', ell(x, y, 9));
        p.ring('ink', ell(x, y, 9, 9, 20), 1.4, 0.5);
      }
      const [bx, by] = rotPt(820, 790, 510, 630, -0.07);
      p.fill('paper', ell(bx, by, 13)); p.ring('ink', ell(bx, by, 13, 13, 24), 2);
      p.gouge('ink', [[bx, by], [bx + 30, by - 18], [bx + 46, by + 6], [bx + 20, by + 22], [bx + 2, by + 4]], 2.2, { taper: 0.3 });
      // the laptop
      groundShadow(p, 510, 668, 395, 12);
      const deck = [[205, 528], [795, 528], [880, 650], [120, 650]];
      p.face(deck, grad(205, 528, 880, 650, 0.88, 0.7), { gap: 7, w: 1.6, edge: 1.6 });
      p.face([[120, 650], [880, 650], [876, 660], [124, 660]], 0.45, { hatch: false });
      keys(p, deck, 5, 13, 0.12, 0.07, 0.88, 0.55, { role: 'ink', hi: 'paper', shadow: false });
      const tp = qrect(deck, 0.37, 0.64, 0.63, 0.94);
      p.face(tp, 0.9, { hatch: false });
      p.ring('ink', tp, 1.3, 0.5);
      p.fill('ink', rr(260, 520, 480, 9, 3));
      p.face(rr(220, 150, 560, 372, 14), grad(220, 150, 780, 522, 0.9, 0.7), { gap: 7, w: 1.5 });
      p.fill('ink', rr(236, 166, 528, 342, 8));
      p.text('earth', 'MacBook Air', 500, 502, 9, { lod: 1 });
      p.fill('earth', ell(500, 172, 2.4), 1);
    },
    glass(p) { glare(p, this.portal); },
  });

  // 8 — MacBook Pro with Retina display, 2012
  D.push({
    name: 'MacBook Pro Retina',
    year: '2012',
    kind: 'Notebook',
    line: '2880 by 1800 pixels on a 15-inch screen. Get close enough and you will still find them.',
    verb: 'Zoom into the screen',
    tint: '#78a35f',
    retina: true,
    portal: { cx: 500, cy: 338, w: 556, h: 340, r: 2, type: 'screen', bg: 'light', m: 0.86 },
    draw(p) {
      groundShadow(p, 510, 736, 420, 14);
      const deck = [[185, 552], [815, 552], [900, 712], [100, 712]];
      p.face(deck, grad(185, 552, 900, 712, 0.84, 0.64), { gap: 7, w: 1.7, edge: 1.6 });
      p.face([[100, 712], [900, 712], [898, 728], [102, 728]], 0.5, { hatch: false });
      p.fill('ink', [[470, 712], [530, 712], [524, 720], [476, 720]]);
      keys(p, deck, 6, 14, 0.13, 0.06, 0.87, 0.5, { role: 'ink', hi: 'paper', shadow: false });
      for (const [u0, u1] of [[0.035, 0.105], [0.895, 0.965]]) {
        const g = qrect(deck, u0, 0.06, u1, 0.5);
        p.dots('ink', g, 6, 1.2);
      }
      const tp = qrect(deck, 0.33, 0.58, 0.67, 0.94);
      p.face(tp, 0.9, { hatch: false });
      p.ring('ink', tp, 1.3, 0.5);
      p.fill('ink', rr(225, 544, 550, 9, 3));
      p.face(rr(195, 138, 610, 404, 16), grad(195, 138, 805, 542, 0.86, 0.68), { gap: 7, w: 1.6 });
      p.fill('ink', rr(203, 146, 594, 388, 11));
      p.text('earth', 'MacBook Pro', 500, 522, 10, { lod: 1 });
      p.fill('earth', ell(500, 157, 2.6), 1);
      // MagSafe 2 with its green light
      p.gouge('ink', [[112, 704], [78, 708], [58, 740], [72, 795], [126, 826]], 6, { taper: 0.5 });
      p.fill('ink', rr(98, 696, 22, 14, 3));
      p.fill('tint', ell(104, 703, 3.6));
    },
    glass(p) { glare(p, this.portal); },
  });

  // 9 — Apple M1, 2020: a package seen from above. The die is etched with the next machine.
  D.push({
    name: 'Apple M1',
    year: '2020',
    kind: 'System on a chip',
    line: '16 billion transistors on a 5 nm die, with the memory sitting beside it on the same package.',
    verb: 'Zoom into the die',
    tint: '#42604d',
    dieBg: '#1d1a17',
    silk: '#d9c9a2',
    portal: { cx: 420, cy: 500, w: 330, h: 410, r: 4, type: 'die', m: 0.86 },
    heat: [{ x: 420, y: 300, w: 280 }],
    draw(p) {
      p.fill('ink', shift(rr(200, 215, 600, 570, 16), 14, 18));
      groundShadow(p, 530, 808, 330, 16);
      p.fill('ink', rr(200, 226, 600, 570, 16));
      const sub = rr(200, 215, 600, 570, 16);
      p.face(sub, grad(200, 215, 800, 785, 0.78, 0.5), { fill: 'tint', angle: -0.8, gap: 9, w: 1.3 });
      // small capacitors scattered around the die
      for (let i = 0; i < 9; i++) {
        for (const [x, y] of [[218, 300 + i * 46], [598, 300 + i * 46]]) {
          p.fill('warm', rr(x, y, 10, 18, 1.5));
          p.fill('ink', rr(x, y, 10, 3.5, 0.5), 1);
          p.fill('ink', rr(x, y + 14.5, 10, 3.5, 0.5), 1);
        }
      }
      for (let i = 0; i < 16; i++) {
        const x = 252 + i * 32;
        p.fill('warm', rr(x, 238, 18, 10, 1.5));
        p.fill('warm', rr(x, 724, 18, 10, 1.5));
      }
      p.fill('earth', rr(247, 287, 346, 426, 8));
      for (const y of [300, 512]) {
        p.face(rr(618, y, 150, 190, 6), 0.24, { gap: 8, w: 2 });
        p.text('paper', 'LPDDR4X', 693, y + 95, 11, { lod: 1, track: 1 });
      }
      p.text('light', 'APPLE M1  ·  5 NM  ·  16,000,000,000 TRANSISTORS', 500, 760, 11, { lod: 1, track: 1 });
    },
    glass(p) {
      const P = this.portal;
      p.line('warm', P.cx - 40, P.cy - 203, P.cx - 163, P.cy - 60, 4, { lod: 0.5, taper: 0.02 });
      p.line('warm', P.cx - 8, P.cy - 203, P.cx - 163, P.cy - 22, 1.6, { lod: 0.5, taper: 0.02 });
    },
    extras(ctx, s) {
      // the floorplan: CPU and GPU blocks, faintly etched
      const P = this.portal, x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2;
      ctx.globalAlpha = s.a * 0.5;
      ctx.strokeStyle = s.pal.ink;
      ctx.lineWidth = 1.2;
      const blocks = [[0.05, 0.04, 0.42, 0.22], [0.5, 0.04, 0.45, 0.22], [0.05, 0.3, 0.9, 0.1], [0.05, 0.44, 0.28, 0.5], [0.67, 0.44, 0.28, 0.5]];
      for (const [a, b, c, d] of blocks) ctx.strokeRect(x0 + a * P.w, y0 + b * P.h, c * P.w, d * P.h);
      ctx.globalAlpha = 1;
    },
  });

  // 10 — MacBook Pro 14-inch, 2021
  D.push({
    name: 'MacBook Pro 14″',
    year: '2021',
    kind: 'Notebook',
    line: 'MagSafe, HDMI and the SD card slot came back. The camera moved into a notch at the top of the screen.',
    verb: 'Zoom into the screen',
    tint: '#c98a3b',
    portal: { cx: 500, cy: 342, w: 560, h: 362, r: 10, type: 'screen', bg: 'light', m: 0.86 },
    draw(p) {
      groundShadow(p, 510, 750, 420, 14);
      const deck = [[190, 548], [810, 548], [892, 722], [108, 722]];
      p.face(deck, grad(190, 548, 892, 722, 0.7, 0.52), { gap: 7, w: 1.8, edge: 1.6 });
      p.face([[108, 722], [892, 722], [890, 742], [110, 742]], 0.32, { angle: 0, gap: 6, w: 1.4 });
      const well = qrect(deck, 0.11, 0.04, 0.89, 0.52);
      p.fill('ink', well);
      keys(p, deck, 6, 14, 0.12, 0.05, 0.88, 0.51, { role: 'umber', hi: 'earth', shadow: false });
      const tid = qrect(deck, 0.835, 0.05, 0.875, 0.11);
      p.ring('earth', tid, 1.2, 1);
      for (const [u0, u1] of [[0.025, 0.095], [0.905, 0.975]]) p.dots('ink', qrect(deck, u0, 0.04, u1, 0.52), 6, 1.2);
      const tp = qrect(deck, 0.3, 0.58, 0.7, 0.95);
      p.face(tp, 0.78, { gap: 6, w: 1.2 });
      p.ring('ink', tp, 1.3, 0.5);
      p.fill('ink', rr(225, 540, 550, 10, 3));
      p.face(rr(205, 140, 590, 398, 18), 0.5, { gap: 7, w: 1.6 });
      p.fill('ink', rr(211, 146, 578, 386, 14));
      // MagSafe 3: braided cable, amber light
      const cab = [[120, 712], [84, 716], [62, 752], [78, 806], [134, 838]];
      p.gouge('ink', cab, 7, { taper: 0.5 });
      for (let i = 1; i < 14; i++) {
        const t = i / 14, q = Ink.catmull(cab, 4)[Math.floor(t * 16)];
        p.line('earth', q[0] - 2.5, q[1] - 2.5, q[0] + 2.5, q[1] + 2.5, 1.1, { lod: 1 });
      }
      p.fill('ink', rr(102, 704, 22, 16, 3));
      p.fill('tint', ell(108, 712, 3.6));
    },
    glass(p) {
      const P = this.portal, y0 = P.cy - P.h / 2;
      p.fill('ink', rr(470, y0 - 6, 60, 26, 6));
      p.fill('umber', ell(500, y0 + 9, 3), 0.5);
    },
  });

  // 11 — iMac 24-inch, 2021
  {
    const body = rr(170, 110, 660, 530, 18);
    D.push({
      name: 'iMac 24″',
      year: '2021',
      kind: 'All-in-one',
      line: 'Eleven and a half millimetres thin, seven colours, and hello on the screen again.',
      verb: 'Zoom into the screen',
      tint: '#6f8fb6',
      portal: { cx: 500, cy: 335, w: 612, h: 410, r: 3, type: 'screen', bg: 'light', m: 0.86 },
      draw(p) {
        groundShadow(p, 505, 860, 190, 10);
        p.face([[440, 640], [560, 640], [572, 832], [428, 832]], grad(440, 640, 572, 832, 0.72, 0.5), { fill: 'tint', angle: PI / 2, gap: 8, w: 1.6 });
        p.face([[392, 830], [608, 830], [624, 852], [376, 852]], 0.42, { fill: 'tint', gap: 6, w: 1.6 });
        p.face(shift(body, 9, -6), 0.4, { fill: 'tint', angle: PI / 2, gap: 9, w: 1.6 });
        p.face(body, 0.97, { hatch: false });
        p.ring('ink', body, 1.6);
        const chin = clipHalf(body, 0, 1, 556);
        p.face(chin, grad(170, 556, 830, 640, 0.82, 0.6), { fill: 'tint', gap: 7, w: 1.8 });
        p.ring('ink', rr(192, 128, 616, 414, 4), 2.2, 0.5);
      },
      glass(p) { glare(p, this.portal); },
      extras(ctx, s) {
        const P = this.portal, x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2;
        ctx.globalAlpha = s.a;
        ctx.fillStyle = s.pal.tint;
        for (let k = 0; k < 3; k++) {
          const pts = [];
          for (let i = 0; i <= 24; i++) {
            const x = x0 + (P.w * i) / 24;
            pts.push([x, y0 + P.h - 60 + k * 18 + 10 * Math.sin(i * 0.5 + k + s.time * 0.8)]);
          }
          Ink.fillPoly(ctx, Ink.gougePoly(pts, 7 - k * 2, { seg: 2, taper: 0.1 }));
        }
        ctx.fillStyle = s.pal.ink;
        ctx.font = `400 34px ${Ink.FONTS.serif}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1px';
        ctx.fillText('hello', x0 + 20, y0 + 32);
        ctx.globalAlpha = 1;
      },
    });
  }

  // 12 — Mac mini, 2024: five inches square. Somebody left a sticker on top.
  {
    const P = { cx: 515, cy: 445, w: 250, h: 220, r: 10, rot: -0.13, type: 'sticker', bg: 'light', m: 0.88 };
    const sl = (pts) => rot(pts, P.cx, P.cy, P.rot);
    const sx = P.cx - P.w / 2, sy = P.cy - P.h / 2;
    D.push({
      name: 'Mac mini',
      year: '2024',
      kind: 'Desktop',
      line: 'Five inches square, with the power button tucked underneath. Somebody left a sticker on top.',
      verb: 'Zoom into the sticker',
      tint: '#b48e5e',
      portal: P,
      heat: [{ x: 500, y: 250, w: 300 }],
      draw(p) {
        groundShadow(p, 530, 760, 300, 30);
        const top = rr(250, 255, 500, 400, 64, 10);
        const lower = top.filter(([, y]) => y >= 455);
        lower.sort((a, b) => b[0] - a[0]);
        const band = lower.concat(shift(lower, 0, 90).reverse());
        p.face(band, grad(250, 600, 750, 700, 0.62, 0.3), { angle: PI / 2, gap: 7, w: 2 });
        p.ring('ink', band, 1.4);
        p.fill('ink', rr(430, 702, 34, 11, 5));
        p.fill('ink', rr(478, 702, 34, 11, 5));
        p.fill('ink', ell(560, 707, 6));
        p.fill('light', ell(330, 700, 2.6), 0.5);
        p.face(top, grad(250, 255, 750, 655, 0.94, 0.72), { gap: 9, w: 1.3, edge: 1.6 });
        // the sticker: shadow, margin, printed caption
        p.fill('earth', shift(sl(rr(sx - 9, sy - 9, P.w + 18, P.h + 40, 12)), 4, 6));
        p.fill('light', sl(rr(sx - 9, sy - 9, P.w + 18, P.h + 40, 12)));
        p.ring('ink', sl(rr(sx - 9, sy - 9, P.w + 18, P.h + 40, 12)), 1.4, 0.5);
        const t = rotPt(P.cx, sy + P.h + 16, P.cx, P.cy, P.rot);
        p.text('earth', 'FIG. 1  ·  1976', t[0], t[1], 11, { rot: P.rot, lod: 1, track: 1 });
      },
      over(p) {
        // a peeled corner
        const cx = sx + P.w + 9, cy = sy + P.h + 31;
        const A = [cx - 58, cy], B = [cx, cy - 46];
        const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        const C = [2 * mx - cx + 6, 2 * my - cy + 4];
        p.fill('paper', sl([A, [cx + 1, cy + 1], B]));
        p.fill('warm', sl([A, B, C]));
        p.ring('ink', sl([A, B, C]), 1.4, 0.5);
        p.hatch('earth', sl([A, B, C]), { angle: P.rot + 0.7, gap: 5, w: 1, lod: 1 });
      },
    });
  }

  // Build plates once per machine.
  D.forEach((d, i) => {
    d.index = i;
    d.plates = null;
    d.build = function () {
      if (this.plates) return this.plates;
      const body = new Plate(1000 + i * 77);
      this.draw(body);
      const glass = new Plate(5000 + i * 77);
      if (this.glass) this.glass(glass);
      const over = new Plate(9000 + i * 77);
      if (this.over) this.over(over);
      const pp = new Path2D();
      const shape = portalShape(this.portal);
      pp.moveTo(shape[0][0], shape[0][1]);
      for (let k = 1; k < shape.length; k++) pp.lineTo(shape[k][0], shape[k][1]);
      pp.closePath();
      this.plates = { body, glass, over, portal: pp, shape };
      return this.plates;
    };
  });

  global.DEVICES = D;
  global.DeviceGeom = { rr, ell, rot, portalShape };
})(window);
