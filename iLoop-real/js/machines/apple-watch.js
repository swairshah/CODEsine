// apple-watch.js: Apple Watch, 2016.
//
// The machine: Series 2, the 42 mm case in rose gold aluminium, 42.5 × 36.4 × 11.4 mm, lying face
// up with its pink sand sport band laid out straight above and below. The case's sides curve
// continuously into the Ion-X glass, which is flat in the middle and rounds over at its edges. On
// the right, the Digital Crown with its fine knurling and the flat side button below it, with the
// microphone between them; on the left, the two speaker slots. The band: the pin half above, its
// stainless stud near the tip; the holed half below.
//
// The screen: the 312 × 390 OLED, the Activity face. Inside (the 'inside' link): the display lifts
// away to show the battery, the Taptic Engine and the S2, Apple silicon on the wrist; the camera
// goes down onto the S2 and the view is swiped to the M1.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;
  const SYS = 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

  const RINGS = [['#fa114f', '#3d0816', 120, 0.82], ['#a6ff00', '#2a3d06', 92, 0.64], ['#00d8ff', '#063a42', 64, 0.92]];
  const CW = 36.4, CD = 42.5, CR = 10.2; // the case in plan
  const BACK = 1.5, TOPC = 9.4, GLASS = 1.25; // heights: the back's dome, the case's top, the glass

  // ---------- the Activity face, 312 × 390 ----------
  function activity(g, s) {
    const W = s.W, H = s.H;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    const cx = 156, cy = 222;
    g.lineCap = 'round';
    for (const [on, off, r, f] of RINGS) {
      g.lineWidth = 25;
      g.strokeStyle = off;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
      // the ring's colour runs a little lighter toward its leading end
      const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 * f;
      const gr = g.createConicGradient ? g.createConicGradient(a0, cx, cy) : null;
      if (gr) { gr.addColorStop(0, on); gr.addColorStop(f, lighter(on)); gr.addColorStop(Math.min(1, f + 0.001), on); g.strokeStyle = gr; } else g.strokeStyle = on;
      g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
      // the arrow on each ring's start
      g.save();
      g.translate(cx, cy - r);
      g.strokeStyle = '#000'; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(-3, -5); g.lineTo(3, 0); g.lineTo(-3, 5); g.stroke();
      g.restore();
    }
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#fff';
    g.font = `400 40px ${SYS}`;
    g.textAlign = 'right';
    g.fillText('10:09', W - 18, 50);
    g.fillStyle = '#a6ff00';
    g.font = `600 22px ${SYS}`;
    g.textAlign = 'left';
    g.fillText('FRI 16', 18, 44);
  }
  function lighter(hex) {
    const c = new T.Color(hex);
    c.lerp(new T.Color('#ffffff'), 0.25);
    return '#' + c.getHexString();
  }

  // a rounded-rectangle loft for the case, in plan inset by ins, at height y
  const sec = (ins, y) => ({ w: CW - 2 * ins, d: CD - 2 * ins, r: Math.max(0.6, CR - ins * 0.9), y });

  // the knurled crown: a cylinder along +x whose edge carries fine ridges
  function crownGeometry(r, len, ridges) {
    const pts = [[0, 0], [r - 0.35, 0], [r, 0.3], [r, len - 0.4], [r - 0.3, len - 0.05], [r - 0.9, len], [0, len + 0.18]];
    const g = G.lathe(pts, ridges * 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = p.getY(i), rr = Math.hypot(x, z);
      if (rr > r - 0.05 && y > 0.4 && y < len - 0.45) {
        const a = Math.atan2(z, x);
        const k = 1 - 0.07 * (0.5 + 0.5 * Math.cos(a * ridges));
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
    }
    g.computeVertexNormals();
    g.rotateZ(-Math.PI / 2);
    return g;
  }

  // A sport band lying along +z from z = 0: w wide at the case, narrowing to wt toward its rounded
  // tip, len long and th thick, lofted through rounded cross-sections so it can bend smoothly down
  // from the lug (lift mm up at z = 0) to the table.
  function bandGeometry(w, wt, len, th, lift, bend = 0) {
    const secs = [];
    const N = 90;
    for (let i = 0; i <= N; i++) {
      // closer sections near the bend and at the tip
      const u = i / N, s = len * (u < 0.3 ? (u / 0.3) * 0.22 : 0.22 + ((u - 0.3) / 0.7) * 0.78);
      let ww = w + (wt - w) * Math.min(1, Math.pow(s / (len * 0.6), 0.8));
      const tip = len - wt / 2;
      if (s > tip) ww = wt * Math.sqrt(Math.max(0.002, 1 - Math.pow((s - tip) / (wt / 2), 2)));
      secs.push({ w: Math.max(0.3, ww), d: th, r: Math.min(th * 0.46, ww / 2 - 0.01), y: s });
    }
    const g = G.loftRR(secs, { seg: 4 });
    g.rotateX(Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      const k = Math.max(0, 1 - z / 18);
      p.setY(i, p.getY(i) + th / 2 + lift * k * k * (3 - 2 * k));
      // laid down casually: past the lug the strap curves off to one side (bend: the radius, signed)
      if (bend && z > 22) {
        const x = p.getX(i), a = (z - 22) / bend;
        p.setX(i, bend * (1 - Math.cos(a)) + x * Math.cos(a));
        p.setZ(i, 22 + bend * Math.sin(a) - x * Math.sin(a));
      }
    }
    g.computeVertexNormals();
    return g;
  }

  Real.add({
    name: 'Apple Watch',
    era: 'watch',
    year: '2016',
    kind: 'Watch',
    line: 'Series 2: swimproof to 50 metres, built-in GPS, and an Apple-designed S2 chip inside.',
    verb: 'Go inside to the chip',
    view: { yaw: 16, pitch: 50, lens: 100, fill: 0.92 },
    fitBox: [[-34, 0, -74], [72, 12, 90]],
    set: { paper: '#dcdbd7', keyDir: [-0.5, 0.86, 0.35], shadowSoft: 10 },
    rings: RINGS,
    next: { type: 'inside', swipe: true },
    make(M) {
      const rose = Mat.alu('#e9c6b4', { rough: 0.3 });
      const roseSoft = Mat.alu('#e3bead', { rough: 0.42 });
      const band = Mat.micro(new T.MeshPhysicalMaterial({ color: new T.Color('#e8c2b2'), roughness: 0.62, metalness: 0, sheen: 0.5, sheenRoughness: 0.5, sheenColor: new T.Color('#fff1ea'), clearcoat: 0.15, clearcoatRoughness: 0.5 }), { size: 0.12, bump: 0.12, rough: 0.12 });

      // ---- the sport band: the pin half above (−z), the holed half below (+z) ----
      M.part('bands');
      const LUG = 5.4;
      const top = M.group({ pos: [0, 0, -CD / 2 + 2.6], rot: [0, 180, 0] });
      M.mesh(bandGeometry(23.6, 21, 92, 3.1, LUG, -170), band, { to: top });
      // the stud near the pin half's tip: a stainless post with a flat cap
      const studA = (80 - 22) / -170, stud = [-170 * (1 - Math.cos(studA)), 22 + -170 * Math.sin(studA)];
      M.mesh(G.cyl(1.25, 3.4, 0.2, 24), Mat.steel({ rough: 0.12 }), { to: top, pos: [stud[0], 2.6, stud[1]] });
      M.mesh(G.cyl(2.05, 0.9, 0.35, 32), Mat.steel({ rough: 0.08 }), { to: top, pos: [stud[0], 5.6, stud[1]] });
      const bot = M.group({ pos: [0, 0, CD / 2 - 2.6] });
      M.mesh(bandGeometry(23.6, 21, 116, 3.1, LUG, 62), band, { to: bot });
      // its holes: through the band, so dark, each with a moulded rim
      const holes = [];
      for (const hz of [60, 68, 76, 84, 92, 100, 108]) { const a = (hz - 22) / 62, hg = G.cyl(1.05, 0.2, 0.05, 20); hg.translate(62 * (1 - Math.cos(a)), 3.02, 22 + 62 * Math.sin(a)); holes.push(hg); }
      M.mesh(G.merge(holes), Mat.hole('#2a1d18'), { to: bot, cast: false });
      // the moulded lip at the band's root where it slides into the case
      for (const [grp] of [[top], [bot]]) M.mesh(G.rbox(23.2, 4.4, 3.2, 1.2, 3), band, { to: grp, pos: [0, LUG + 1.2, 1.4] });

      // ---- the case: one curve from the back round into the glass ----
      M.part('case');
      const cs = [];
      // the back's rim, rounding up and out
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2);
        cs.push(sec(3.6 * (1 - Math.sin(a)), BACK + 3.2 * (1 - Math.cos(a))));
      }
      // the wall, a gentle bulge, then rounding in toward the glass
      cs.push(sec(-0.05, BACK + 5.0));
      for (let i = 1; i <= 5; i++) {
        const a = (i / 5) * (Math.PI / 2);
        cs.push(sec(1.05 * (1 - Math.cos(a)), BACK + 5.0 + (TOPC - BACK - 5.0) * Math.sin(a)));
      }
      const caseG = G.loftRR(cs, { seg: 12, capEnd: false });
      M.mesh(caseG, rose);
      // the wall's inside, seen when the display is lifted away
      const inner = G.loftRR([sec(2.4, 2.6), sec(2.15, TOPC - 0.05)], { seg: 12, capStart: false, capEnd: false });
      const innerMat = rose.clone();
      innerMat.side = T.BackSide;
      M.mesh(inner, innerMat, { cast: false });
      M.mesh(G.loftRR([sec(1.05, TOPC - 0.02), sec(2.15, TOPC - 0.02)], { seg: 12, capStart: false, capEnd: false }), rose, { cast: false });
      // the back: the ceramic dome with the sensors' window, and the slots for the bands
      const dome = G.lathe([[0, 0.02], [6.5, 0.0], [10.5, 0.35], [12.8, 1.0], [13.9, 1.6], [14.1, BACK + 0.2]], 64);
      M.mesh(dome, Mat.plastic('#1c1c1e', { rough: 0.2, clearcoat: 1 }), { pos: [0, 0, 0] });
      for (const sz of [-1, 1]) M.mesh(G.rbox(24.2, 2.6, 1.2, 0.5, 2), Mat.hole('#121212'), { pos: [0, LUG + 0.6, sz * (CD / 2 - 1.4)], cast: false });
      // the Digital Crown, the mic and the side button on the right; the speaker on the left
      const crown = crownGeometry(3.55, 3.2, 60);
      M.mesh(crown, roseSoft, { pos: [CW / 2 - 0.9, BACK + 4.9, -CD / 2 + 12.6] });
      M.mesh(G.cyl(3.7, 0.9, 0.2, 48), Mat.hole('#3b2f2a'), { pos: [CW / 2 - 0.95, BACK + 4.9, -CD / 2 + 12.6], rot: [0, 0, -90], cast: false });
      M.mesh(G.cyl(0.35, 0.6, 0.05, 12), Mat.hole('#121212'), { pos: [CW / 2 - 0.25, BACK + 4.9, -CD / 2 + 19.4], rot: [0, 0, -90], cast: false });
      M.mesh(G.rbox(1.6, 3.4, 12.6, 0.75, 3), roseSoft, { pos: [CW / 2 - 0.15, BACK + 4.8, CD / 2 - 15.6] });
      for (const dz of [-6, 6]) M.mesh(G.rbox(1.4, 1.3, 9.2, 0.6, 3), Mat.hole('#141414'), { pos: [-CW / 2 + 0.62, BACK + 4.6, dz], cast: false });

      // ---- inside, under the display: the battery, the Taptic Engine and the S2 ----
      M.part('inside');
      const IY = 3.0;
      M.mesh(G.slab(CW - 4.6, CD - 4.6, 0.6, CR - 2.5, 0.2), Mat.plastic('#141416', { rough: 0.55 }), { pos: [0, IY - 0.6, 0] });
      // the S2: the whole system in one package, sealed in black resin, the logo and its name
      const S2X = -4.6, S2Z = 5.4, S2W = 18, S2D = 14.6;
      const s2 = M.mesh(G.rbox(S2W, 1.3, S2D, 0.4, 2), Mat.epoxy('#121214'), { pos: [S2X, IY + 0.65, S2Z] });
      M.mark('chip', s2, { center: [-0.4, 0.66, -0.6], x: [1, 0, 0], y: [0, 0, -1], w: 12, h: 9 });
      const s2top = D.decal(S2W, S2D, (g, w, h) => {
        g.fillStyle = '#c8c8ca';
        D.drawApple(g, 4.4, 6.3, 4.4, { color: '#bdbdc0' });
        g.font = `600 4.4px ${SYS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText('S2', 7.2, 6.6);
        g.font = `500 0.95px ${SYS}`;
        g.fillText('APL0778   339S00228', 2.4, 10.2);
        g.fillText('1631  KR5E2  KOREA', 2.4, 11.5);
        g.fillStyle = '#58585c'; g.beginPath(); g.arc(1.3, 1.3, 0.42, 0, Math.PI * 2); g.fill();
      }, { ppm: 60, rough: 0.55 });
      s2top.rotation.x = -Math.PI / 2;
      s2top.position.set(S2X, IY + 1.31, S2Z);
      M.add(s2top);
      // fine passive parts along the S2's edges
      const caps = [];
      const R = Real.U.rng(31);
      for (let i = 0; i < 36; i++) {
        const c = G.rbox(0.6, 0.35, 0.3, 0.06, 1);
        if (R() < 0.3) c.rotateY(Math.PI / 2);
        const k = R(), sd = i % 3;
        const x = sd === 2 ? S2X - S2W / 2 - 0.9 : S2X - S2W / 2 + k * S2W;
        const z = sd === 0 ? S2Z - S2D / 2 - 0.8 : sd === 1 ? S2Z + S2D / 2 + 0.7 : S2Z - S2D / 2 + k * S2D;
        c.translate(x, IY + 0.18, z);
        caps.push(c);
      }
      M.mesh(G.merge(caps), Mat.ceramic('#8a7860'), { cast: false });
      // the battery: a foil pouch with its printed label, across the top of the case
      M.mesh(G.rbox(26, 3.4, 12.5, 1.2, 3), Mat.alu('#c9cacc', { rough: 0.55 }), { pos: [-0.5, IY + 1.7, -9.6] });
      const bl = D.decal(24, 10.5, (g, w, h) => {
        g.fillStyle = '#e9e7e2'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2b2b2d'; g.font = `600 1.4px ${SYS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText('Li-ion Polymer Battery', 1.2, 2.2);
        g.font = `500 1.05px ${SYS}`;
        g.fillText('3.77V   334mAh   1.28Whr', 1.2, 4.0);
        g.fillText('A1760   Made in China', 1.2, 5.6);
        g.strokeStyle = '#2b2b2d'; g.lineWidth = 0.12; g.strokeRect(17.6, 1.2, 5.2, 5.2);
        g.font = `600 1.2px ${SYS}`; g.fillText('CE', 18.8, 8.6);
      }, { ppm: 60, rough: 0.6 });
      bl.rotation.x = -Math.PI / 2;
      bl.position.set(-0.5, IY + 3.42, -9.6);
      M.add(bl);
      // the Taptic Engine: a steel can with its spring tabs, by the side button
      M.mesh(G.rbox(9.0, 3.0, 9.0, 0.8, 3), Mat.steel({ rough: 0.35, color: '#bdbcb8' }), { pos: [10.4, IY + 1.5, 8.6] });
      for (const dx of [-2.8, 2.8]) G.place(M.add(D.screw(0.7)), { pos: [10.4 + dx, IY + 3.02, 8.6], rot: [-90, 0, 0] });
      // the flex cable that ran to the display, now trailing loose
      M.mesh(G.rbox(9, 0.2, 5, 0.1, 1), Mat.plastic('#c77d2a', { rough: 0.35, clearcoat: 0.6 }), { pos: [-10.5, IY + 0.1, 15.2] });

      // ---- the display: the glass, curving over at its edges, and the OLED panel under it ----
      M.part('display', { peel: { at: [0.04, 0.4], move: [0, 70, -46], rot: [-52, 0, 0] } });
      const gs = [];
      gs.push(sec(1.05, TOPC - 0.05));
      for (let i = 1; i <= 7; i++) {
        const a = (i / 7) * (Math.PI / 2);
        gs.push(sec(1.05 + 3.0 * (1 - Math.cos(a)), TOPC - 0.05 + GLASS * Math.sin(a)));
      }
      M.mesh(G.loftRR(gs, { seg: 12 }), Mat.glass({ rough: 0.015, color: '#050506' }));
      M.mesh(G.slab(CW - 2.6, CD - 2.6, 0.5, CR - 1.6, 0.1), Mat.plastic('#0a0a0b', { rough: 0.6 }), { pos: [0, TOPC - 0.6, 0] });
      const disp = M.screen({
        pos: [0, TOPC + GLASS + 0.01, 0], rot: [-90, 0, 0], w: 24.3, h: 30.4, glass: [24.4, 30.5], corner: 3.6,
        tech: 'oled', ui: [312, 390], rough: 0.015,
        draw: activity,
      });
      M.state.display = disp;
    },
  });
})();
