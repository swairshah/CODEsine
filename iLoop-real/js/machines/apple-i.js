// apple-i.js: Apple I, 1976. A bare board, as it was sold: 381 × 241 mm of glossy green solder mask
// over copper, standing on four nylon spacers. Four rows of TTL and memory chips (A to D, numbered
// 1 to 10 across), the white ceramic MOS 6502 and Motorola's MC6820 interface adapter in the front
// row, the 14.318 MHz crystal and the Signetics shift registers of the video section, and the power
// supply down the right: three big blue Sprague capacitors lying on their sides, a finned black
// heatsink with the regulators, and the rectifier diodes. Resistors with their colour bands, ceramic
// disc and dipped tantalum capacitors between the rows. Along the left edge, the gold edge connector
// the Apple Cassette Interface plugged into; along the back, the keyboard socket and the video jack.
//
// The 6502 is the 'focus' mark: zoom into it and the Apple II, built round the same chip, assembles.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D } = Real;

  const BW = 381, BD = 241, BT = 1.6, LIFT = 9.5;
  const TOP = LIFT + BT;
  const PPM = 10; // canvas pixels per millimetre of board

  // ---------- the layout ----------
  // Chips lie with their long side along x, in four rows; the 6502 and the 6820 are in row D.
  const ROWS = { A: -86, B: -44, C: -2, D: 40 };
  const COL0 = -168, PITCH = 24.5;
  const chips = [];
  const TTL = [
    ['74157', 16], ['7400', 14], ['74175', 16], ['74166', 16], ['7404', 14], ['74161', 16], ['7408', 14], ['74154', 24], ['7432', 14], ['7427', 14],
  ];
  const DATE = ['7604', '7611', '7547', '7609', '7614', '7552', '7602', '7618'];
  const ri = Real.U.rng(1976);
  // rows A and B: the 4K dynamic RAM and its drivers
  for (let c = 0; c < 10; c++) chips.push({ n: 16, x: COL0 + c * PITCH, z: ROWS.A, lines: [c < 8 ? 'MK4096N-11' : '8T97', DATE[c % 8]], row: 'A', col: c + 1 });
  for (let c = 0; c < 10; c++) chips.push({ n: 16, x: COL0 + c * PITCH, z: ROWS.B, lines: [c < 8 ? 'MK4096N-11' : 'DM8T28N', DATE[(c + 3) % 8]], row: 'B', col: c + 1 });
  // row C: the video section (shift registers, character generator) and glue
  const ROWC = [['2504V', 8], ['2504V', 8], ['2519B', 16], ['2513', 24], ['74174', 16], ['74160', 16], ['74160', 16], ['74161', 16], ['7400', 14], ['74LS157', 16]];
  let cx = COL0 - 4;
  ROWC.forEach(([p, n], c) => {
    const len = (n / 2) * 2.54 + 1;
    chips.push({ n, x: cx + len / 2, z: ROWS.C, lines: [(p.startsWith('25') ? 'S' : 'DM') + p + 'N', DATE[(c + 5) % 8]], row: 'C', col: c + 1 });
    cx += len + (n >= 24 ? 6.5 : 5.2);
  });
  // row D: the 6502 and the 6820, then logic
  const CPU = { n: 40, x: -136, z: ROWS.D, ceramic: true, lines: ['MOS', 'MCS6502', '2876'], row: 'D', col: 1 };
  const PIA = { n: 40, x: -74, z: ROWS.D, lines: ['MC6820P', 'Z 7622', 'MOTOROLA'], row: 'D', col: 4 };
  chips.push(CPU, PIA);
  for (let c = 0; c < 5; c++) chips.push({ n: TTL[(c * 3) % 10][1] === 24 ? 16 : TTL[(c * 3) % 10][1], x: -28 + c * PITCH, z: ROWS.D, lines: ['DM' + TTL[(c * 3) % 10][0] + 'N', DATE[c % 8]], row: 'D', col: 7 + c });
  // pins of a chip, for the pads printed under it
  const pinsOf = (ch) => {
    const per = ch.n / 2, wide = ch.n >= 28, Wd = wide ? 13.9 : 6.4, out = [];
    for (let i = 0; i < per; i++) for (const s of [-1, 1]) out.push([ch.x + (i - (per - 1) / 2) * 2.54, ch.z + s * (Wd / 2 + 1.25)]);
    return out;
  };
  // discrete parts between the rows: resistors (x0, z, len) and disc capacitors
  const resistors = [], discs = [], tants = [];
  for (const [zr, kind] of [[ROWS.A + 21, 'r'], [ROWS.B + 21, 'm'], [ROWS.C + 21, 'r'], [ROWS.D + 24, 'm']]) {
    for (let x = -176; x < 64; x += 13 + ri() * 9) {
      const u = ri();
      if (u < 0.55) resistors.push({ x, z: zr + (ri() - 0.5) * 3, len: 10.2, band: Math.floor(ri() * 5) });
      else if (u < 0.85 || kind === 'r') discs.push({ x, z: zr + (ri() - 0.5) * 2, r: 2.6 + ri() * 1.4, tint: Math.floor(ri() * 3) });
      else tants.push({ x, z: zr, tint: Math.floor(ri() * 2) });
    }
  }
  // the power supply on the right
  const CAPS = [
    { x: 128, z: 74, r: 17, len: 76, lines: ['SPRAGUE', '36D', '6300 µF', '15 VDC'] },
    { x: 140, z: 30, r: 12.5, len: 60, lines: ['SPRAGUE', '36D', '2100 µF', '25 VDC'] },
    { x: 140, z: 2, r: 12.5, len: 60, lines: ['SPRAGUE', '36D', '2100 µF', '25 VDC'] },
  ];
  const HS = { x: 142, z: -78, w: 74, d: 52, h: 34 };
  const XTAL = { x: 4, z: ROWS.C + 21 };
  const EDGE = { x: -BW / 2, z: -10, n: 22 };

  // ---------- the board, printed ----------
  function drawBoard(g, W, H) {
    const k = W / BW;
    g.save();
    g.scale(k, k);
    g.translate(BW / 2, BD / 2);
    // the laminate under the mask: copper-coloured where the traces are, green glass elsewhere
    g.fillStyle = '#1f4a30';
    g.fillRect(-BW / 2, -BD / 2, BW, BD);
    // a soft mottle in the mask's thickness
    const rr = Real.U.rng(7);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${rr() < 0.5 ? '40,90,58' : '22,60,38'},${0.05 + rr() * 0.07})`;
      const x = -BW / 2 + rr() * BW, y = -BD / 2 + rr() * BD, r = 3 + rr() * 16;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // traces: copper under the mask reads as a lighter, warmer green
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const trace = (pts, w = 0.55) => {
      g.strokeStyle = '#37693f';
      g.lineWidth = w;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
    // buses along the rows, with 45° jogs onto the pins
    for (const z of Object.values(ROWS)) {
      for (let j = 0; j < 7; j++) {
        const y = z + 11 + j * 1.3;
        trace([[-180, y], [70, y]], 0.42);
      }
      for (let j = 0; j < 4; j++) {
        const y = z - 11.5 - j * 1.3;
        trace([[-182, y], [64, y]], 0.42);
      }
    }
    // short runs from pins down to the buses
    for (const ch of chips) {
      const ps = pinsOf(ch);
      ps.forEach(([x, y], i) => {
        if (rr() < 0.55) return;
        const dir = y > ch.z ? 1 : -1, len = 3 + Math.floor(rr() * 5) * 1.3;
        trace([[x, y], [x, y + dir * 2], [x + (rr() - 0.5) * 2.6, y + dir * (2 + 1.3)], [x + (rr() - 0.5) * 2.6, y + dir * len]], 0.4);
      });
    }
    // power: wide traces from the supply round the board
    trace([[100, -110], [-184, -110], [-184, 106], [96, 106]], 1.8);
    trace([[100, -110], [100, 106]], 2);
    for (const z of Object.values(ROWS)) trace([[-184, z - 18], [74, z - 18]], 1.4);
    // pads: tinned rings round every pin, with the hole through them
    const pad = (x, y, r = 0.85) => {
      g.fillStyle = '#c9c7c0';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#4e4b45';
      g.beginPath(); g.arc(x, y, r * 0.42, 0, Math.PI * 2); g.fill();
    };
    for (const ch of chips) for (const [x, y] of pinsOf(ch)) pad(x, y);
    for (const r of resistors) { pad(r.x - 2, r.z); pad(r.x + r.len + 2, r.z); }
    for (const d of discs) { pad(d.x - 1.3, d.z, 0.7); pad(d.x + 1.3, d.z, 0.7); }
    for (const t of tants) { pad(t.x - 1.3, t.z, 0.7); pad(t.x + 1.3, t.z, 0.7); }
    // vias scattered along the traces
    for (let i = 0; i < 160; i++) {
      const z = Object.values(ROWS)[i % 4] + (rr() < 0.5 ? 14 : -14) + (rr() - 0.5) * 6;
      pad(-178 + rr() * 248, z, 0.6);
    }
    // the silkscreen: white ink, slightly soft at its edges
    g.fillStyle = '#eceae0';
    g.strokeStyle = '#eceae0';
    g.lineWidth = 0.35;
    // outlines of the chip sites, with the notch at pin 1
    for (const ch of chips) {
      const len = (ch.n / 2) * 2.54 + 1, wd = ch.n >= 28 ? 15.2 : 7.6;
      g.strokeRect(ch.x - len / 2 - 0.8, ch.z - wd / 2 - 0.4, len + 1.6, wd + 0.8);
      g.beginPath(); g.arc(ch.x - len / 2 - 0.8, ch.z, 1.1, -Math.PI / 2, Math.PI / 2); g.stroke();
    }
    // row letters at the left, column numbers along the top
    g.font = '600 4.2px "Helvetica Neue", Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const [r, z] of Object.entries(ROWS)) g.fillText(r, -182, z);
    for (let c = 0; c < 10; c++) g.fillText(String(c + 1), COL0 + c * PITCH, ROWS.A - 16);
    // designators by the discretes
    g.font = '500 1.7px "Helvetica Neue", Helvetica, Arial, sans-serif';
    resistors.forEach((r, i) => g.fillText(`R${i + 1}`, r.x + r.len / 2, r.z - 3.4));
    discs.forEach((d, i) => g.fillText(`C${i + 9}`, d.x, d.z + 4.4));
    // the maker's mark, along the front edge
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = '700 6.4px "Helvetica Neue", Helvetica, Arial, sans-serif';
    g.fillText('Apple Computer 1', -176, 98);
    g.font = '500 4.4px "Helvetica Neue", Helvetica, Arial, sans-serif';
    g.fillText('Palo Alto, Ca.   Copyright 1976', -112, 97.6);
    // the supply's parts and the connectors
    g.font = '600 3px "Helvetica Neue", Helvetica, Arial, sans-serif';
    g.fillText('+5V', 92, -102);
    g.fillText('-12V', 92, -60);
    g.fillText('+12V', 92, -40);
    g.fillText('VIDEO', 54, -104);
    g.fillText('KEYBOARD', -84, -104);
    g.fillText('XTAL', XTAL.x - 6, XTAL.z + 7);
    CAPS.forEach((c, i) => {
      g.strokeRect(c.x - c.len / 2 - 2, c.z - c.r - 1, c.len + 4, 2 * c.r + 2);
      g.fillText(`C${i + 1}`, c.x - c.len / 2 - 9, c.z + 1);
    });
    g.strokeRect(HS.x - HS.w / 2 - 2, HS.z - HS.d / 2 - 2, HS.w + 4, HS.d + 4);
    // the edge connector's fingers, gold-flashed copper, out of the mask
    for (let i = 0; i < EDGE.n; i++) {
      const y = EDGE.z - (EDGE.n * 3.96) / 2 + i * 3.96;
      g.fillStyle = '#d6b25a';
      g.fillRect(-BW / 2, y + 0.5, 8.5, 2.6);
      trace([[-BW / 2 + 8.5, y + 1.8], [-BW / 2 + 12 + (i % 3), y + 1.8], [-BW / 2 + 14 + (i % 3), y + 3.5 + (i % 4)]], 0.5);
    }
    // mounting holes: tinned rings
    for (const [x, y] of [[-182, -112], [182, -112], [-182, 112], [182, 112]]) {
      g.fillStyle = '#cfcdc6';
      g.beginPath(); g.arc(x, y, 4.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1b1b1a';
      g.beginPath(); g.arc(x, y, 1.9, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // ---------- components ----------
  // a resistor: a dog-bone body with colour bands, lying on the board, leads bent down into it
  function resistorGeo(len) {
    const r = 1.25, l = len / 2;
    const pts = [[0, -l], [r * 0.7, -l], [r, -l + 0.6], [r, -l + 2.2], [r * 0.82, -l + 3], [r * 0.82, l - 3], [r, l - 2.2], [r, l - 0.6], [r * 0.7, l], [0, l]];
    const g = G.lathe(pts, 18);
    g.rotateZ(Math.PI / 2);
    return g;
  }
  const BANDS = [
    ['#a52a22', '#1d1d1d', '#a0522d', '#c9a43c'],
    ['#e8c039', '#7d36a0', '#c4262a', '#c9a43c'],
    ['#a0522d', '#1d1d1d', '#e07b24', '#c9a43c'],
    ['#2c62b8', '#7d7d7d', '#a52a22', '#c9a43c'],
    ['#e07b24', '#e07b24', '#a0522d', '#c9a43c'],
  ];
  function resistorMat(i) {
    return Mat.printed((g, w, h) => {
      g.fillStyle = '#c9b48d';
      g.fillRect(0, 0, w, h);
      // bands along the body: v runs along the lathe profile
      const at = [0.28, 0.38, 0.48, 0.7];
      BANDS[i].forEach((c, j) => {
        g.fillStyle = c;
        g.fillRect(0, h * (1 - at[j]) - h * 0.045, w, h * 0.09);
      });
    }, { w: 16, h: 128, rough: 0.55, clearcoat: 0.3 });
  }

  // a big electrolytic capacitor lying on its side along x: sleeve, printing, aluminium ends
  function bigCap(M, c) {
    const grp = M.group({ pos: [c.x, TOP + c.r + 0.3, c.z] });
    const sleeve = Mat.printed((g, w, h) => {
      g.fillStyle = '#3a72b8';
      g.fillRect(0, 0, w, h);
      // the sleeve's print runs along the can, twice round it
      g.fillStyle = '#eef2f6';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (const off of [0.08, 0.58]) {
        g.save();
        g.translate(w * off, h / 2);
        g.rotate(Math.PI / 2);
        g.font = `700 ${w * 0.05}px "Helvetica Neue", Arial, sans-serif`;
        g.fillText(c.lines.join('   '), 0, 0);
        g.restore();
      }
      // a polarity stripe of minus signs
      g.font = `700 ${w * 0.04}px Arial`;
      for (let y = 0.06; y < 1; y += 0.1) g.fillText('−', w * 0.33, h * y);
    }, { w: 1024, h: 512, rough: 0.36, clearcoat: 0.5 });
    const body = new T.CylinderGeometry(c.r, c.r, c.len - 3, 64, 1, true);
    body.rotateZ(Math.PI / 2);
    M.mesh(body, sleeve, { to: grp });
    // rolled aluminium ends with the sleeve wrapped over their edge
    for (const s of [-1, 1]) {
      const e = G.lathe([[0, 0], [c.r * 0.86, 0], [c.r * 0.95, -0.3], [c.r, -0.9], [c.r, -1.6]], 64);
      e.rotateZ(s > 0 ? -Math.PI / 2 : Math.PI / 2);
      M.mesh(e, Mat.brushed('#d9dbdd', { axis: 'z', rough: 0.3 }), { to: grp, pos: [s * (c.len / 2), 0, 0] });
      // the screw terminal
      M.mesh(G.cyl(c.r * 0.22, 3, 0.5, 20), Mat.tin(), { to: grp, pos: [s * (c.len / 2 + 0.5), c.r * 0.35, 0], rot: [0, 0, s > 0 ? -90 : 90] });
    }
    // the strap that holds it down
    const strap = G.lathe([[c.r + 0.3, -3], [c.r + 0.8, -3], [c.r + 0.8, 3], [c.r + 0.3, 3]], 48);
    strap.rotateZ(Math.PI / 2);
    M.mesh(strap, Mat.brushed('#bdbfc2', { axis: 'x' }), { to: grp, pos: [c.len * 0.22, 0, 0] });
    return grp;
  }

  Real.add({
    name: 'Apple I',
    era: 'apple2',
    year: '1976',
    kind: 'Circuit board',
    line: 'Hand-built in Los Altos and sold as a bare board. You supplied the case, the keyboard and the television.',
    verb: 'Zoom into the white 6502 processor',
    view: { yaw: 12, pitch: 46, lens: 90, fill: 0.95 },
    set: { paper: '#d6d3cc', keyDir: [-0.45, 0.85, 0.35], shadowSoft: 10 },
    next: { type: 'assemble' },
    make(M) {
      M.part('board');
      // the board: FR-4, its edge pale with glass fibre
      M.mesh(G.slab(BW, BD, BT, 2.5, 0.4), Mat.plastic('#a6a782', { rough: 0.6 }), { pos: [0, LIFT, 0] });
      const tex = Mat.canvasTexture(drawBoard, BW * PPM, BD * PPM);
      tex.anisotropy = 16;
      const pcb = new T.MeshPhysicalMaterial({ map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 0.3, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.18 });
      M.mesh(new T.PlaneGeometry(BW - 0.9, BD - 0.9), pcb, { pos: [0, TOP + 0.02, 0], rot: [-90, 0, 0], cast: false });
      // nylon spacers and their screw heads
      for (const [x, z] of [[-182, -112], [182, -112], [-182, 112], [182, 112]]) {
        M.mesh(G.cyl(3.6, LIFT, 0.5, 6), Mat.plastic('#e9e4d6', { rough: 0.5 }), { pos: [x, 0, z] });
        const s = D.screw(2.6);
        s.position.set(x, TOP, z);
        s.rotation.x = -Math.PI / 2;
        M.add(s);
      }

      // the chips
      for (const ch of chips) {
        const o = { lines: ch.lines };
        if (ch.ceramic) o.ceramic = true;
        const c = D.dip(ch.n, o);
        c.position.set(ch.x, TOP, ch.z);
        M.add(c);
        if (ch === CPU) {
          // the 6502's lid: gold plate, satin rather than mirror (the Apple II's 6502 is the same)
          const gold = Mat.gold();
          c.traverse((o) => { if (o.isMesh && o.material === gold) o.material = new T.MeshPhysicalMaterial({ color: '#e4b85c', roughness: 0.3, metalness: 1 }); });
          M.state.cpu = c;
        }
      }
      const cpu = M.state.cpu;
      M.mark('focus', cpu, { center: [0, cpu.userData.top, 0], x: [1, 0, 0], y: [0, 0, -1], w: cpu.userData.w, h: cpu.userData.d });

      // resistors, by band colours, merged
      const rgeo = BANDS.map(() => []);
      const leads = [];
      for (const r of resistors) {
        const g = resistorGeo(r.len).clone();
        g.translate(r.x + r.len / 2, TOP + 1.5, r.z);
        rgeo[r.band].push(g);
        for (const s of [-1, 1]) {
          const ex = r.x + r.len / 2 + s * (r.len / 2 + 2);
          leads.push(G.tube([[r.x + r.len / 2 + s * (r.len / 2 - 0.2), TOP + 1.5, r.z], [ex - s * 0.6, TOP + 1.45, r.z], [ex, TOP + 0.8, r.z], [ex, TOP - 0.6, r.z]], 0.28, { seg: 10, radial: 6 }));
        }
      }
      rgeo.forEach((list, i) => { if (list.length) M.mesh(G.merge(list), resistorMat(i)); });
      // ceramic disc capacitors standing up, and dipped tantalums
      const discCol = ['#d9862a', '#c99a3a', '#b6552a'];
      const dgeo = discCol.map(() => []);
      for (const d of discs) {
        const g = G.lathe([[0, -0.9], [d.r * 0.8, -0.9], [d.r, -0.4], [d.r, 0.4], [d.r * 0.8, 0.9], [0, 0.9]], 28);
        g.rotateX(Math.PI / 2);
        g.translate(d.x, TOP + d.r + 2.2, d.z);
        dgeo[d.tint].push(g);
        for (const s of [-1, 1]) leads.push(G.tube([[d.x + s * d.r * 0.4, TOP + 2.4, d.z], [d.x + s * 1.3, TOP + 1.2, d.z], [d.x + s * 1.3, TOP - 0.6, d.z]], 0.25, { seg: 6, radial: 6 }));
      }
      dgeo.forEach((list, i) => { if (list.length) M.mesh(G.merge(list), Mat.plastic(discCol[i], { rough: 0.5 })); });
      const tgeo = [[], []];
      for (const t of tants) {
        const g = new T.SphereGeometry(2.6, 20, 14);
        g.scale(1, 1.25, 0.75);
        g.translate(t.x, TOP + 5.2, t.z);
        tgeo[t.tint].push(g);
        for (const s of [-1, 1]) leads.push(G.tube([[t.x + s * 1.2, TOP + 3, t.z], [t.x + s * 1.3, TOP - 0.6, t.z]], 0.25, { seg: 4, radial: 6 }));
      }
      tgeo.forEach((list, i) => { if (list.length) M.mesh(G.merge(list), Mat.plastic(['#2d5fa8', '#d8a42c'][i], { rough: 0.25, clearcoat: 0.6 })); });
      M.mesh(G.merge(leads), Mat.tin(), { cast: false });

      // the crystal: a silver HC-18 can
      M.mesh(G.rbox(11, 13, 4.6, 1.6, 3), Mat.brushed('#e2e3e4', { axis: 'y', rough: 0.22 }), { pos: [XTAL.x, TOP + 6.9, XTAL.z] });
      M.mesh(G.rbox(11.8, 0.8, 5.2, 0.3, 2), Mat.steel({ rough: 0.3 }), { pos: [XTAL.x, TOP + 0.6, XTAL.z] });
      const xl = D.decal(9, 7, (g, w, h) => {
        g.fillStyle = '#2b2b2b';
        g.font = '600 1.6px "Helvetica Neue", Arial';
        g.textAlign = 'center';
        g.fillText('14.31818', w / 2, h * 0.42);
        g.fillText('MHZ', w / 2, h * 0.68);
      }, { ppm: 60 });
      xl.position.set(XTAL.x, TOP + 7.4, XTAL.z + 2.32);
      M.add(xl);
      // trimmer potentiometers in the video section
      for (const x of [26, 44]) {
        M.mesh(G.rbox(9.5, 4.5, 9.5, 0.8), Mat.plastic('#e9e3cf', { rough: 0.5 }), { pos: [x, TOP + 2.25, ROWS.C + 22] });
        M.mesh(G.cyl(2.8, 1, 0.3, 20), Mat.plastic('#d4cdb4', { rough: 0.4 }), { pos: [x, TOP + 4.4, ROWS.C + 22] });
        M.mesh(G.rbox(4, 0.6, 0.7, 0.2), Mat.hole('#4a4436'), { pos: [x, TOP + 5.35, ROWS.C + 22], rot: [0, 35, 0] });
      }

      // the power supply: three blue Sprague capacitors, the heatsink with its regulators, diodes
      for (const c of CAPS) bigCap(M, c);
      const hs = M.group({ pos: [HS.x, TOP, HS.z] });
      const fins = [];
      const nF = 15;
      for (let i = 0; i < nF; i++) {
        const g = G.rbox(2.1, HS.h, HS.d, 0.8, 2);
        g.translate(-HS.w / 2 + 3 + (i * (HS.w - 6)) / (nF - 1), HS.h / 2 + 3, 0);
        fins.push(g);
      }
      const base = G.rbox(HS.w, 5, HS.d, 1, 2);
      base.translate(0, 3.5, 0);
      fins.push(base);
      M.mesh(G.merge(fins), Mat.alu('#1c1c1e', { rough: 0.5 }), { to: hs });
      // a TO-3 regulator on top of the heatsink, and two TO-220s on its front face
      const to3 = G.lathe([[0, 0], [11, 0], [11, 1.2], [9, 1.4], [8.5, 7], [7.5, 8], [0, 8]], 40);
      M.mesh(to3, Mat.steel({ rough: 0.25, color: '#cfd0cd' }), { to: hs, pos: [0, HS.h + 3, 0], scale: [1, 0.9, 1] });
      M.mesh(G.rbox(38, 1, 22, 6, 2), Mat.steel({ rough: 0.3, color: '#c9cac6' }), { to: hs, pos: [0, HS.h + 3.2, 0] });
      for (const x of [-22, 22]) M.mesh(G.cyl(2.2, 2.4, 0.4, 16), Mat.steel(), { to: hs, pos: [x * 0.78, HS.h + 3.6, 0] });
      for (const x of [-18, 18]) {
        M.mesh(G.rbox(10, 15, 4.5, 0.6), Mat.epoxy('#161616'), { to: hs, pos: [x, 15, HS.d / 2 + 2.5] });
        M.mesh(G.rbox(10, 7, 1.3, 0.3), Mat.tin(), { to: hs, pos: [x, 25, HS.d / 2 + 1] });
        const l = D.decal(8, 4, (g, w, h) => { g.fillStyle = '#cfcfcf'; g.font = '600 1.3px Arial'; g.textAlign = 'center'; g.fillText(x < 0 ? 'LM340T-5' : 'LM320T-5', w / 2, h * 0.45); g.fillText('7609', w / 2, h * 0.8); }, { ppm: 60 });
        l.position.set(x, 14, HS.d / 2 + 4.8);
        hs.add(l);
      }
      // rectifier diodes, black with a silver band, standing in a row
      const dio = [];
      for (let i = 0; i < 6; i++) {
        const g = G.lathe([[0, 0], [1.7, 0], [1.7, 7], [0, 7]], 16);
        g.rotateZ(Math.PI / 2);
        g.translate(100 + i * 0, TOP + 2, -46 + i * 7);
        dio.push(g);
      }
      M.mesh(G.merge(dio), Mat.epoxy('#121212'));
      for (let i = 0; i < 6; i++) M.mesh(G.lathe([[1.75, 0], [1.75, 1.1]], 16), Mat.tin(), { pos: [101.2, TOP + 2, -46 + i * 7], rot: [0, 0, 90] });

      // the connectors: the keyboard socket and the video jack at the back
      const sock = M.group({ pos: [-48, TOP, -103] });
      M.mesh(G.rbox(21.5, 4, 9.6, 0.6), Mat.plastic('#202020', { rough: 0.45 }), { to: sock, pos: [0, 2, 0] });
      const holes = [];
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { const h = G.rbox(1.1, 0.3, 1.1, 0.2, 1); h.translate((i - 3.5) * 2.54, 4.05, s * 3.81); holes.push(h); }
      M.mesh(G.merge(holes), Mat.hole('#050505'), { to: sock, cast: false });
      const rca = M.group({ pos: [44, TOP, -112] });
      M.mesh(G.rbox(12, 11, 13, 1.2), Mat.plastic('#141414', { rough: 0.5 }), { to: rca, pos: [0, 5.5, 0] });
      const jack = G.lathe([[3.1, 0], [4.1, 0], [4.1, 8], [3.1, 8]], 32);
      jack.rotateX(-Math.PI / 2);
      M.mesh(jack, Mat.steel({ color: '#e7d27a', rough: 0.2 }), { to: rca, pos: [0, 6, -6] });
      M.mesh(G.cyl(1.1, 7, 0.2, 16), Mat.hole('#050505'), { to: rca, pos: [0, 6, -6.2], rot: [90, 0, 0] });
      // the edge connector's slot fingers stand proud along the left edge (printed), and a
      // power connector at the back right
      M.mesh(G.rbox(24, 9, 10, 1), Mat.plastic('#efeee8', { rough: 0.5 }), { pos: [138, TOP + 4.5, -112] });
      for (let i = 0; i < 4; i++) M.mesh(G.rbox(2, 2, 6, 0.4), Mat.hole('#202020'), { pos: [129 + i * 6, TOP + 9, -112], cast: false });
    },
  });
})();
