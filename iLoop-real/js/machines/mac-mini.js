// mac-mini.js: Mac mini, 2024 (M4). Finished.
//
// The machine: 127 × 127 × 50 mm. One piece of bead-blasted aluminium makes the top and the four
// sides, with generous corners; it sits on a black base set in from the edges, so a dark band runs
// round the foot where the air comes in, and the power button is underneath at the back left.
// On the front: two USB-C ports, the headphone jack and the status light. On the back: the power
// inlet, Ethernet, HDMI and three Thunderbolt ports. On the top: the polished Apple logo.
//
// Inside (as you go in): the shell lifts away, then the blower and its heatsink, and you come down
// onto the logic board and the M4: its substrate, two memory packages, and the bare die. The die is
// drawn as a die shot under a microscope: functional blocks in the colours that the oxide and
// nitride layers give silicon by thin-film interference, iridescent as the camera moves. The Apple I
// is etched into the middle of it, and the camera arrives there.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D } = Real;
  const { smooth, rng } = Real.U;

  const W = 127, R = 21, H = 50, BASE = 3.2;
  const SILVER = '#e2e3e5';
  const DIE = 12.6;
  const UI = 1536;
  // where the Apple I lands on the die: a band across the middle, at the stage's aspect
  const PORTAL = [96, 412, 1344, 768];

  // ---------- the die shot ----------
  // A tile of standard-cell logic: rows of cells of random widths, each a slightly different shade.
  function logicTile(seed, size, col, o = {}) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = rng(seed);
    g.fillStyle = col;
    g.fillRect(0, 0, size, size);
    const row = o.row || 3;
    for (let y = 0; y < size; y += row) {
      let x = 0;
      while (x < size) {
        const w = 1 + Math.floor(r() * (o.cell || 9));
        const v = r();
        g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.05 + v * 0.3})` : `rgba(255,255,255,${(v - 0.5) * 0.28})`;
        g.fillRect(x, y, w, row - (r() < 0.3 ? 1 : 0));
        x += w;
      }
    }
    // a few routing tracks across the cells
    g.strokeStyle = o.wire || 'rgba(255,236,200,0.18)';
    g.lineWidth = 1;
    for (let i = 0; i < size / 14; i++) {
      const y = Math.floor(r() * size) + 0.5;
      g.beginPath(); g.moveTo(0, y); g.lineTo(size, y); g.stroke();
    }
    return c;
  }
  // A tile of SRAM: a fine regular grid of bit cells.
  function sramTile(col, size = 64) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = col;
    g.fillRect(0, 0, size, size);
    g.fillStyle = 'rgba(0,0,0,0.32)';
    for (let y = 0; y < size; y += 2) g.fillRect(0, y, size, 1);
    g.fillStyle = 'rgba(255,255,255,0.10)';
    for (let x = 0; x < size; x += 3) g.fillRect(x, 0, 1, size);
    return c;
  }
  function M4Die() {
    const c = document.createElement('canvas');
    c.width = c.height = UI;
    const g = c.getContext('2d');
    const r = rng(2024);
    // bare silicon, and the seal ring round the edge
    g.fillStyle = '#2b2a33';
    g.fillRect(0, 0, UI, UI);
    const pat = (tile) => g.createPattern(tile, 'repeat');
    // thin-film colours: what a few hundred nanometres of oxide over silicon look like
    const FILM = {
      violet: '#5a3f86', indigo: '#33407e', blue: '#2d5f93', teal: '#2b7071', green: '#4f7d44',
      olive: '#7a7a3a', gold: '#a8883d', bronze: '#8a5a36', magenta: '#8b3c6d', rose: '#a2566d',
    };
    const T_LOGIC = {};
    for (const [k, v] of Object.entries(FILM)) T_LOGIC[k] = logicTile(7 + k.length * 13, 256, v);
    const T_SRAM = {};
    for (const [k, v] of Object.entries(FILM)) T_SRAM[k] = sramTile(v);
    const NAMES = Object.keys(FILM);
    const block = (x, y, w, h, kind, col, o = {}) => {
      g.save();
      g.fillStyle = pat(kind === 'sram' ? T_SRAM[col] : T_LOGIC[col]);
      g.translate(x, y);
      g.fillRect(0, 0, w, h);
      if (kind !== 'sram' && w > 40 && h > 40) {
        // a logic block is a patchwork of smaller placed regions and a few small memories
        const cut = (x0, y0, w0, h0, d) => {
          if (d > 3 || w0 < 26 || h0 < 26 || r() < 0.18 * d) {
            g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.09})`;
            g.fillRect(x0 + 1, y0 + 1, w0 - 2, h0 - 2);
            if (r() < 0.22 && w0 > 18 && h0 > 14) {
              const mw = w0 * (0.3 + r() * 0.4), mh = h0 * (0.3 + r() * 0.4);
              g.fillStyle = pat(T_SRAM[NAMES[Math.floor(r() * NAMES.length)]]);
              g.fillRect(x0 + 3, y0 + 3, mw, mh);
              g.fillStyle = pat(T_LOGIC[col]);
            }
            g.strokeStyle = 'rgba(12,10,18,0.35)';
            g.lineWidth = 1;
            g.strokeRect(x0 + 0.5, y0 + 0.5, w0 - 1, h0 - 1);
            return;
          }
          if (w0 > h0) { const k = w0 * (0.3 + r() * 0.4); cut(x0, y0, k, h0, d + 1); cut(x0 + k, y0, w0 - k, h0, d + 1); }
          else { const k = h0 * (0.3 + r() * 0.4); cut(x0, y0, w0, k, d + 1); cut(x0, y0 + k, w0, h0 - k, d + 1); }
        };
        cut(0, 0, w, h, 0);
      }
      // a hint of the film's thickness changing across the block
      g.fillStyle = `rgba(${o.warm ? '255,200,120' : '140,200,255'},${0.05 + r() * 0.08})`;
      g.fillRect(0, 0, w * (0.3 + r() * 0.7), h);
      // the block's edge: a routing channel round it
      g.strokeStyle = 'rgba(10,8,14,0.85)';
      g.lineWidth = 3;
      g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.restore();
    };
    // seal ring and the pad frame
    g.fillStyle = '#8f8a86';
    g.fillRect(0, 0, UI, 18); g.fillRect(0, UI - 18, UI, 18); g.fillRect(0, 0, 18, UI); g.fillRect(UI - 18, 0, 18, UI);
    g.fillStyle = '#3a3640';
    g.fillRect(18, 18, UI - 36, UI - 36);
    for (let i = 0; i < 70; i++) {
      const p = 30 + i * 21.4;
      for (const [x, y] of [[p, 26], [p, UI - 40], [26, p], [UI - 40, p]]) {
        g.fillStyle = i % 5 ? '#a7a29a' : '#c9b37a';
        g.fillRect(x, y, 13, 13);
      }
    }
    // the top band: four performance cores, their L2, six efficiency cores, the Neural Engine
    const pc = (x, y) => {
      block(x, y, 150, 140, 'logic', 'green');
      block(x + 8, y + 8, 60, 50, 'sram', 'violet');
      block(x + 78, y + 8, 64, 34, 'sram', 'indigo');
      block(x + 8, y + 66, 134, 66, 'logic', 'olive', { warm: true });
    };
    for (let i = 0; i < 4; i++) pc(62 + (i % 2) * 158, 62 + Math.floor(i / 2) * 150);
    block(386, 62, 210, 290, 'sram', 'blue');
    for (let i = 0; i < 6; i++) {
      const x = 610 + (i % 3) * 92, y = 62 + Math.floor(i / 3) * 112;
      block(x, y, 86, 104, 'logic', 'teal');
      block(x + 6, y + 6, 40, 36, 'sram', 'magenta');
    }
    block(610, 290, 270, 62, 'sram', 'violet');
    for (let i = 0; i < 16; i++) block(900 + (i % 4) * 140, 62 + Math.floor(i / 4) * 72, 134, 66, 'logic', i % 2 ? 'bronze' : 'gold', { warm: true });
    // the middle band, under the Apple I: the GPU's ten cores and the system-level cache
    for (let i = 0; i < 10; i++) {
      const x = 62 + (i % 5) * 176, y = 372 + Math.floor(i / 5) * 290;
      block(x, y, 168, 282, 'logic', 'gold', { warm: true });
      block(x + 10, y + 12, 148, 70, 'sram', 'rose');
      block(x + 10, y + 96, 70, 174, 'logic', 'olive', { warm: true });
      block(x + 88, y + 96, 70, 174, 'logic', 'bronze', { warm: true });
    }
    for (let i = 0; i < 8; i++) block(950 + (i % 2) * 262, 372 + Math.floor(i / 2) * 145, 254, 137, 'sram', i % 3 ? 'indigo' : 'blue');
    // the bottom band: media and display engines, Thunderbolt, and the memory interfaces
    block(62, 960, 300, 200, 'logic', 'magenta');
    block(370, 960, 260, 200, 'logic', 'teal');
    block(638, 960, 300, 200, 'logic', 'green');
    block(946, 960, 528, 200, 'sram', 'violet');
    for (let i = 0; i < 4; i++) {
      const x = 62 + i * 356;
      block(x, 1172, 348, 300, 'logic', 'bronze', { warm: true });
      // the PHY: long stripes of drivers along the edge
      g.save();
      for (let j = 0; j < 58; j++) {
        g.fillStyle = j % 2 ? 'rgba(212,190,140,0.55)' : 'rgba(60,50,70,0.5)';
        g.fillRect(x + 6 + j * 5.9, 1360, 3.4, 106);
      }
      g.restore();
    }
    // the block the Apple I is etched into: dark, with a routing channel round it
    g.fillStyle = '#1e1c29';
    g.fillRect(PORTAL[0], PORTAL[1], PORTAL[2], PORTAL[3]);
    g.strokeStyle = 'rgba(205,190,150,0.55)';
    g.lineWidth = 4;
    g.strokeRect(PORTAL[0] - 8, PORTAL[1] - 8, PORTAL[2] + 16, PORTAL[3] + 16);
    // power straps: wide metal lines running over everything, the top layers of copper
    g.save();
    g.globalCompositeOperation = 'screen';
    g.fillStyle = 'rgba(190,170,150,0.10)';
    for (let x = 40; x < UI; x += 96) g.fillRect(x, 20, 7, UI - 40);
    for (let y = 40; y < UI; y += 128) g.fillRect(20, y, UI - 40, 5);
    g.restore();
    // the die's name, small, in the corner, as Apple's engineers leave it
    g.save();
    g.fillStyle = 'rgba(220,214,200,0.75)';
    g.font = '600 15px "Helvetica Neue", Arial, sans-serif';
    g.fillText('APL1206 © 2024', 1290, 1490);
    g.restore();
    return c;
  }
  let dieArt = null;

  Real.add({
    name: 'Mac mini',
    era: 'bigsur',
    year: '2024',
    kind: 'Desktop',
    line: 'Five inches square, with the power button tucked underneath. Inside, the M4.',
    verb: 'Go inside to the M4',
    view: { yaw: 28, pitch: 24, lens: 100, fill: 0.82 },
    set: { paper: '#dadad8', keyDir: [-0.5, 0.85, 0.42] },
    next: { type: 'die', bg: '#1e1c29', fg: '#efe2c2', egg: 'm4' },
    make(M) {
      const alu = Mat.alu(SILVER, { rough: 0.56 });
      const aluIn = Mat.alu('#b9babd', { rough: 0.5 });
      const black = Mat.plastic('#1a1a1c', { rough: 0.62 });

      // ---------- inside: the base, the board, the M4 (this part stays) ----------
      M.part('body');
      M.mesh(G.slab(W - 9, W - 9, BASE, R - 4.5, 0.9), black, { pos: [0, 0, 0] });
      // the inner tub that holds the power supply
      M.mesh(G.slab(W - 7, W - 7, 12, R - 3.5, 0.6), Mat.plastic('#151517', { rough: 0.7 }), { pos: [0, BASE, 0] });
      const BY = 16.4;
      // the logic board: black solder mask with its traces and silkscreen printed on
      const BW = 116;
      M.mesh(G.slab(BW, BW, 1.6, 14, 0.3), Mat.plastic('#141619', { rough: 0.55 }), { pos: [0, BY - 1.6, 0] });
      const pcb = Mat.printed((g, w, h) => {
        const k = w / BW;
        g.fillStyle = '#16191d';
        g.fillRect(0, 0, w, h);
        const rr = rng(4040);
        // traces under the mask: slightly raised, so a little lighter; buses of parallel tracks
        // routed at right angles with 45° corners
        g.strokeStyle = 'rgba(58,68,80,0.5)';
        g.lineCap = 'round';
        g.lineJoin = 'round';
        for (let i = 0; i < 70; i++) {
          const n = 2 + Math.floor(rr() * 7), pitch = (0.35 + rr() * 0.3) * k;
          let x = rr() * w, y = rr() * h;
          const horiz = rr() < 0.5;
          const l1 = (6 + rr() * 30) * k, l2 = (4 + rr() * 26) * k, sgn = rr() < 0.5 ? -1 : 1;
          g.lineWidth = (0.12 + rr() * 0.12) * k;
          for (let j = 0; j < n; j++) {
            const o = j * pitch;
            g.beginPath();
            if (horiz) {
              g.moveTo(x, y + o); g.lineTo(x + l1 + o * sgn, y + o); g.lineTo(x + l1 + o * sgn + 3 * k, y + o + 3 * k * sgn); g.lineTo(x + l1 + o * sgn + 3 * k, y + o + 3 * k * sgn + l2 * sgn);
            } else {
              g.moveTo(x + o, y); g.lineTo(x + o, y + l1 + o * sgn); g.lineTo(x + o + 3 * k * sgn, y + l1 + o * sgn + 3 * k); g.lineTo(x + o + 3 * k * sgn + l2 * sgn, y + l1 + o * sgn + 3 * k);
            }
            g.stroke();
          }
        }
        // copper pours, faintly visible as broad lighter areas
        g.fillStyle = 'rgba(60,70,82,0.18)';
        for (let i = 0; i < 14; i++) g.fillRect(rr() * w, rr() * h, (8 + rr() * 26) * k, (6 + rr() * 20) * k);
        // vias
        g.fillStyle = 'rgba(150,140,110,0.6)';
        for (let i = 0; i < 1600; i++) { g.beginPath(); g.arc(rr() * w, rr() * h, 0.22 * k, 0, Math.PI * 2); g.fill(); }
        // silkscreen: reference designators and the board number
        g.fillStyle = 'rgba(232,232,226,0.85)';
        g.font = `500 ${1.3 * k}px "Helvetica Neue", Arial`;
        for (const [t, x, y] of [['U1000', 52, 40], ['J3100', 10, 8], ['U6100', 12, 74], ['L5300', 86, 30], ['C2110', 54, 88], ['U2900', 20, 96], ['J6000', 92, 104], ['R5210', 74, 66], ['C8100', 100, 54], ['U3700', 34, 20]]) g.fillText(t, x * k, y * k);
        g.font = `600 ${1.8 * k}px "Helvetica Neue", Arial`;
        g.fillText('820-03174-A', 58 * k, 112 * k);
        g.fillText('MLB', 6 * k, 112 * k);
        // mounting holes: gold rings
        for (const [x, y] of [[6, 6], [BW - 6, 6], [6, BW - 6], [BW - 6, BW - 6], [60, 22]]) {
          g.fillStyle = '#c9a85c';
          g.beginPath(); g.arc(x * k, y * k, 2.8 * k, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#090909';
          g.beginPath(); g.arc(x * k, y * k, 1.5 * k, 0, Math.PI * 2); g.fill();
        }
      }, { w: 2048, h: 2048, rough: 0.5, clearcoat: 0.25 });
      M.mesh(new T.PlaneGeometry(BW - 1, BW - 1), pcb, { pos: [0, BY + 0.01, 0], rot: [-90, 0, 0], cast: false });
      for (const [x, z] of [[-52, -52], [52, -52], [-52, 52], [52, 52]]) M.add(G.mesh(G.cyl(2.2, 1.4, 0.3, 20), Mat.steel({ rough: 0.3 }), { pos: [x, BY, z] }));

      // components: inductors, capacitors, flash, shield cans and the port receptacles
      const r = rng(77);
      const ind = [], caps = [], capsDark = [];
      for (let i = 0; i < 7; i++) { const gm = G.rbox(5.4, 3.2, 5.4, 0.5, 2); gm.translate(30 + (i % 2) * 6.4, BY + 1.6, -26 + Math.floor(i / 2) * 6.4); ind.push(gm); }
      for (let i = 0; i < 5; i++) { const gm = G.rbox(5.4, 3.2, 5.4, 0.5, 2); gm.translate(-34 + i * 6.4, BY + 1.6, 26); ind.push(gm); }
      M.mesh(G.merge(ind), Mat.plastic('#3a3b3e', { rough: 0.7 }));
      for (let i = 0; i < 150; i++) {
        const big = r() < 0.25;
        const gm = G.rbox(big ? 2 : 1.0, big ? 1.1 : 0.55, big ? 1.25 : 0.5, 0.12, 1);
        let x, z;
        do { x = (r() - 0.5) * 104; z = (r() - 0.5) * 104; } while (Math.abs(x + 2) < 21 && Math.abs(z) < 19);
        gm.rotateY(r() < 0.5 ? 0 : Math.PI / 2);
        gm.translate(x, BY + (big ? 0.55 : 0.28), z);
        (r() < 0.75 ? caps : capsDark).push(gm);
      }
      M.mesh(G.merge(caps), Mat.ceramic('#a58a63'), { cast: false });
      M.mesh(G.merge(capsDark), Mat.epoxy('#2a2a2c'), { cast: false });
      // the capacitors round the package, in a ring
      const ringCaps = [];
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2;
        const gm = G.rbox(1.0, 0.55, 0.5, 0.1, 1);
        gm.rotateY(-a);
        gm.translate(-2 + Math.cos(a) * 22, BY + 0.28, Math.sin(a) * 20);
        ringCaps.push(gm);
      }
      M.mesh(G.merge(ringCaps), Mat.ceramic('#9a7f5a'), { cast: false });
      // the flash storage: two packages beside the SoC
      for (const z of [-9, 9]) {
        M.mesh(G.rbox(14, 1.2, 16, 0.3, 2), Mat.epoxy('#161617'), { pos: [-40, BY + 0.6, z] });
        const lab = D.decal(12, 14, (g, w, h) => {
          g.fillStyle = '#c9c6bd';
          g.font = '600 1.5px "Helvetica Neue", Arial';
          g.fillText('NAND', 1, 3);
          g.font = '500 1.1px "Helvetica Neue", Arial';
          g.fillText('K9DUGB8', 1, 5);
          g.fillText('APL0478', 1, 6.6);
          g.beginPath(); g.arc(1.4, 12.4, 0.5, 0, Math.PI * 2); g.fill();
        }, { ppm: 40, rough: 0.6 });
        lab.rotation.x = -Math.PI / 2;
        lab.position.set(-40, BY + 1.22, z);
        M.add(lab);
      }
      // shield cans: the Wi-Fi radio and the power controller
      M.mesh(G.rbox(22, 1.8, 14, 0.6, 2), Mat.tin(), { pos: [34, BY + 0.9, 26] });
      M.mesh(G.rbox(14, 1.6, 12, 0.5, 2), Mat.tin(), { pos: [-30, BY + 0.8, -38] });
      // receptacles: the rear ports along the back edge, the front ports at the front
      const shell = Mat.steel({ rough: 0.25, color: '#c8c8c6' });
      for (const [x, w, h] of [[-44, 12, 9], [-26, 16, 13], [-6, 15, 6], [10, 9, 3.4], [22, 9, 3.4], [34, 9, 3.4]]) M.mesh(G.rbox(w, h, 9, 0.6, 2), shell, { pos: [-x, BY + h / 2, -54] });
      for (const x of [-19, -7]) M.mesh(G.rbox(9, 3.4, 8, 0.6, 2), shell, { pos: [x, 22, 55] });
      M.mesh(G.cyl(3.2, 9, 0.4, 20), shell, { pos: [12, 22, 51], rot: [90, 0, 0] });

      // ---------- the M4 ----------
      const pkg = M.group({ pos: [-2, BY, 0] });
      M.mesh(G.slab(34, 30, 1.0, 1.2, 0.15), Mat.plastic('#223228', { rough: 0.48 }), { to: pkg });
      // fiducials and the land of tiny capacitors on the substrate
      const sub = [];
      for (let i = 0; i < 26; i++) { const gm = G.rbox(0.6, 0.35, 0.3, 0.08, 1); gm.translate(-15 + i * 1.2, 1.17, 13.6); sub.push(gm); const g2 = gm.clone(); g2.translate(0, 0, -27.2); sub.push(g2); }
      M.mesh(G.merge(sub), Mat.ceramic('#8c7550'), { to: pkg, cast: false });
      // the two memory packages, on the package beside the die
      for (const z of [-7.2, 7.2]) {
        M.mesh(G.rbox(10, 1.0, 12.6, 0.25, 2), Mat.epoxy('#121214'), { to: pkg, pos: [9.5, 1.5, z] });
        const lab = D.decal(9, 11, (g) => {
          g.fillStyle = '#b9b5ad';
          g.font = '600 1.15px "Helvetica Neue", Arial';
          g.fillText('LPDDR5X', 0.8, 2.4);
          g.font = '500 0.9px "Helvetica Neue", Arial';
          g.fillText('8GB  2432', 0.8, 3.8);
          g.fillText('APL7509', 0.8, 5.1);
        }, { ppm: 60, rough: 0.6 });
        lab.rotation.x = -Math.PI / 2;
        lab.position.set(9.5, 2.02, z);
        pkg.add(lab);
      }
      // the die, on its bumps, with the amber underfill round its edge
      const DX = -6.5;
      M.mesh(G.rbox(DIE + 1.3, 0.5, DIE + 1.3, 0.25, 2), Mat.plastic('#5a3a17', { rough: 0.35, clearcoat: 0.6 }), { to: pkg, pos: [DX, 1.2, 0] });
      M.mesh(G.rbox(DIE, 0.72, DIE, 0.04, 1), Mat.alu('#45464d', { rough: 0.25 }), { to: pkg, pos: [DX, 1.5, 0] });
      if (!dieArt) dieArt = M4Die();
      const die = M.screen({
        to: pkg, pos: [DX, 1.87, 0], rot: [-90, 0, 0],
        w: DIE, h: DIE, tech: 'silicon', ui: [UI, UI], pixelArt: false, main: false, bright: 1.25,
        portal: { rect: PORTAL },
        draw(g, s) {
          const fade = s.fade || 0, clear = s.clear || 0;
          g.drawImage(dieArt, 0, 0);
          // the Apple I shows through the middle band, etched into the circuits
          g.save();
          g.globalCompositeOperation = 'destination-out';
          g.fillStyle = `rgba(0,0,0,${0.72 + 0.28 * fade})`;
          g.fillRect(...PORTAL);
          if (clear > 0) { g.fillStyle = `rgba(0,0,0,${clear})`; g.fillRect(0, 0, UI, UI); }
          g.restore();
        },
      });
      // silicon under a microscope: the picture is the light coming back off the films; the surface
      // itself is a thin, iridescent mirror rather than a studio reflector
      const dm = die.material;
      dm.iridescence = 0.3;
      dm.iridescenceIOR = 1.9;
      dm.iridescenceThicknessRange = [320, 520];
      die.mesh.onBeforeRender = () => {
        const k = die.state.glass ?? 1;
        dm.envMapIntensity = 0.1 * k;
        dm.specularIntensity = 0.25 * k;
        dm.clearcoat = 0;
        dm.roughness = 0.14;
        dm.color.set('#15131a');
      };
      M.state.die = die;
      M.mark('chip', die.mesh, { center: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], w: DIE, h: DIE, display: die });

      // ---------- the cooler: blower and heatsink, which lift away second ----------
      M.part('cooler', { peel: { at: [0.2, 0.46], move: [150, 150, -170], rot: [0, 0, -18], hide: true } });
      const CY = BY + 4;
      // the heatsink over the SoC: a copper plate and a stack of aluminium fins
      M.mesh(G.slab(38, 34, 2.2, 2, 0.4), Mat.brushed('#c98b5a', { rough: 0.3 }), { pos: [-2, BY + 1.95, 0] });
      const fins = [];
      for (let i = 0; i < 26; i++) { const gm = G.rbox(0.5, 14, 34, 0.15, 1); gm.translate(-26 + i * 1.6, CY + 9, -26); fins.push(gm); }
      M.mesh(G.merge(fins), Mat.alu('#c4c5c7', { rough: 0.3 }));
      M.mesh(G.rbox(46, 1.2, 36, 1, 2), aluIn, { pos: [-6, CY + 0.2, -6] });
      // the heat pipes from the plate to the fins
      for (const x of [-8, 4]) M.mesh(G.tube([[x, BY + 3.6, 6], [x, BY + 4.5, -10], [x, CY + 4, -22], [x, CY + 6, -30]], 1.4), Mat.brushed('#c98b5a', { rough: 0.3 }));
      // the blower: a black shroud, the impeller inside, its hub
      const fan = M.group({ pos: [28, CY, 6] });
      const shroudS = G.rrect(54, 54, 20);
      shroudS.holes.push(G.circleHole(16, 0, 0, 48));
      M.mesh(G.extrude(shroudS, 1.2, 0.4), Mat.plastic('#1b1b1d', { rough: 0.5 }), { to: fan, pos: [0, 12, 0], rot: [-90, 0, 0] });
      M.mesh(G.cyl(25, 11, 0.6, 64), Mat.plastic('#202022', { rough: 0.55 }), { to: fan });
      const blades = [];
      for (let i = 0; i < 41; i++) {
        const gm = G.rbox(0.5, 9, 7, 0.15, 1);
        gm.rotateY(0.5);
        gm.translate(0, 0, 13);
        gm.rotateY((i / 41) * Math.PI * 2);
        gm.translate(0, 6.5, 0);
        blades.push(gm);
      }
      M.mesh(G.merge(blades), Mat.plastic('#2a2a2d', { rough: 0.45 }), { to: fan });
      M.mesh(G.cyl(8, 12.6, 1.2, 40), Mat.plastic('#18181a', { rough: 0.4 }), { to: fan });
      const fl = D.label('DELTA  BRB0610', 1.4, { color: '#8a8a8c', weight: 500 });
      fl.rotation.x = -Math.PI / 2;
      fl.position.set(0, 12.65, 0);
      fan.add(fl);

      // ---------- the shell: top and sides, which lift away first ----------
      M.part('shell', { peel: { at: [0.02, 0.34], move: [30, 300, -330], rot: [-40, 10, 0], hide: true } });
      {
        // the shell: a smooth extrusion (fine corners, normals smoothed across the facets, so the
        // studio's lights run round the corners as they do on the real thing)
        const hh = H - BASE + 0.4;
        let g = G.extrude(G.rrect(W, W, R, 0, 0, 40), hh, 2.6, { bevelSeg: 8, curveSeg: 40 });
        g.translate(0, 0, -hh / 2);
        g.rotateX(-Math.PI / 2);
        g.translate(0, hh / 2, 0);
        g = G.smoothNormals(g, 0.01);
        M.mesh(g, alu, { pos: [0, BASE - 0.4, 0] });
      }
      // the dark band round the foot where the shell meets the base: the air intake
      M.mesh(G.slab(W - 1.4, W - 1.4, 1.6, R - 0.7, 0.5), Mat.hole('#0b0b0c'), { pos: [0, BASE - 1.2, 0] });
      // the logo on top: polished, inlaid flush
      const logo = D.appleLogo(24, 0.14, Mat.chrome({ rough: 0.16, color: '#d4d5d8' }), 0.04);
      logo.rotation.x = -Math.PI / 2;
      logo.position.set(0, H - 0.08, 2);
      M.add(logo);
      // the front: two USB-C ports, the headphone jack, the status light
      const FZ = W / 2;
      const usbc = (x, y, z, ry = 0) => {
        const grp = M.group({ pos: [x, y, z], rot: [0, ry, 0] });
        M.mesh(G.rbox(8.9, 3.3, 2.4, 1.6, 3), Mat.hole('#0a0a0a'), { to: grp, pos: [0, 0, -0.9] });
        M.mesh(G.rbox(6.6, 0.7, 1.2, 0.3, 2), Mat.plastic('#2c2c2e', { rough: 0.4 }), { to: grp, pos: [0, 0, -1.3] });
        return grp;
      };
      usbc(-21, 21, FZ);
      usbc(-9, 21, FZ);
      M.mesh(G.cyl(2.15, 2.4, 0.3, 28), Mat.hole('#090909'), { pos: [6.5, 21, FZ - 2.2], rot: [90, 0, 0] });
      M.mesh(G.cyl(0.55, 1.2, 0.1, 16), new T.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2.2, roughness: 0.3 }), { pos: [46, 21, FZ - 1.05], rot: [90, 0, 0], cast: false });
      // the back: power, Ethernet, HDMI, three Thunderbolt
      const BZ = -W / 2;
      M.mesh(G.rbox(11, 7.5, 2.4, 3.2, 3), Mat.hole('#0b0b0b'), { pos: [44, 22, BZ + 0.9] });
      M.mesh(G.rbox(16, 13.5, 2.4, 0.8, 3), Mat.hole('#0b0b0b'), { pos: [26, 22, BZ + 0.9] });
      M.mesh(G.rbox(15.4, 5.8, 2.4, 1.2, 3), Mat.hole('#0b0b0b'), { pos: [6, 22, BZ + 0.9] });
      for (const x of [-10, -22, -34]) usbc(x, 22, BZ, 180);
      // the fine print on the back
      const fine = D.label('Mac mini   Designed by Apple in California   Model A3238', 1.2, { color: '#8d8e91', weight: 500 });
      fine.rotation.y = Math.PI;
      fine.position.set(0, 9, BZ - 0.02);
      M.add(fine);
    },
  });

  // ---------- going in: the die's circuits give way to the Apple I ----------
  Real.egg('m4', (api) => {
    const die = api.A.M.state.die;
    if (!die) return;
    const fade = smooth(0.5, 0.82, api.t), clear = smooth(0.84, 0.96, api.t);
    const st = die.state.drawState;
    if (!st || st.fade !== fade || st.clear !== clear) {
      die.state.drawState = { fade, clear };
      die.redraw();
    }
  });
})();
