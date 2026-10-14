// apple-m1.js: Apple M1, 2020.
//
// The package, about 40 × 32 mm: on the left the system on a chip under its nickel-plated lid, laser-
// marked with the Apple logo and M1 and its part numbers; on the right the two LPDDR4X memory
// packages, black, one above the other; all on a dark green substrate edged with tiny ceramic
// capacitors, its corner marked for pin 1. It lies on the sweep like a chip in Apple's own pictures.
//
// The link: the camera goes down onto the lid (the 'focus' mark), and the iMac 24″, which uses the
// same chip, assembles round it. Real.parts.m1Package() builds this same package, so the iMac's
// 'anchor' can be the very same object; its lid is the mark (22 × 22 mm, x along the long side, y
// pointing away from the viewer), centred on the lid's top.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D } = Real;
  const SYS = 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

  const SUB = [40, 32, 1.05]; // the substrate: width, depth, thickness
  const LID = 22, LID_X = -6.4, LID_T = 1.25, LID_LIFT = 0.25;
  const MEM = [11.4, 13.2, 1.0], MEM_X = 11.9, MEM_Z = 7.3;

  // The package, built lying on y = 0, its long side along x. Returns { group, lid, top }:
  // lid is the lid's mesh and top the height of the lid's face; mark the lid with
  // center [0, LID_T / 2, 0] in the lid's own coordinates.
  function m1Package() {
    const grp = new T.Group();
    grp.name = 'm1';
    // the substrate: glossy solder mask over the laminate, its edge showing the layers
    const sub = G.slab(SUB[0], SUB[1], SUB[2], 1.1, 0.12);
    const subMat = Mat.micro(new T.MeshPhysicalMaterial({ color: new T.Color('#1d2b24'), roughness: 0.38, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.25 }), { size: 0.05, bump: 0.08, rough: 0.2 });
    grp.add(G.mesh(sub, subMat));
    // the edge of the laminate, lighter where it was cut
    const rim = G.loftRR([{ w: SUB[0] + 0.02, d: SUB[1] + 0.02, r: 1.11, y: 0.25 }, { w: SUB[0] + 0.02, d: SUB[1] + 0.02, r: 1.11, y: 0.75 }], { seg: 4, capStart: false, capEnd: false });
    grp.add(G.mesh(rim, Mat.plastic('#6f7562', { rough: 0.7 }), { cast: false }));
    // printed on the substrate: the pin-1 triangle, fiducials, and the lid's outline of adhesive
    const silk = D.decal(SUB[0] - 0.4, SUB[1] - 0.4, (g, w, h) => {
      g.fillStyle = '#c9a54a';
      g.beginPath(); g.moveTo(0.6, h - 0.6); g.lineTo(3.0, h - 0.6); g.lineTo(0.6, h - 3.0); g.closePath(); g.fill();
      for (const [x, y] of [[w - 1.4, 1.4], [1.4, 1.4], [w - 1.4, h - 1.4]]) { g.beginPath(); g.arc(x, y, 0.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(210,220,200,0.35)';
      g.font = `500 0.7px ${SYS}`;
      g.fillText('M1  2043', w - 7.6, h - 1.2);
    }, { ppm: 60, rough: 0.4 });
    silk.rotation.x = -Math.PI / 2;
    silk.position.y = SUB[2] + 0.005;
    grp.add(silk);

    // the lid over the SoC: nickel-plated, satin, a fine bevel round its top
    const lidY = SUB[2] + LID_LIFT;
    grp.add(G.mesh(G.slab(LID + 0.5, LID + 0.5, LID_LIFT + 0.02, 1.0, 0.08), Mat.plastic('#141414', { rough: 0.6 }), { pos: [LID_X, SUB[2] - 0.01, 0], cast: false }));
    // nickel over copper: a satin metal, its grain far finer than a brushed finish
    const lidMat = Mat.micro(new T.MeshPhysicalMaterial({ color: new T.Color('#d3d5d8'), roughness: 0.24, metalness: 1 }), { size: 0.03, bump: 0.04, rough: 0.12 });
    const lid = G.mesh(G.rbox(LID, LID_T, LID, 0.45, 4), lidMat, { pos: [LID_X, lidY + LID_T / 2, 0] });
    lid.name = 'lid';
    grp.add(lid);
    const top = lidY + LID_T;
    // laser marking: a darker, matte grey burned into the nickel
    const mark = D.decal(LID - 1.4, LID - 1.4, (g, w, h) => {
      g.fillStyle = '#4c4e52';
      D.drawApple(g, w / 2 - 3.6, h * 0.4, 5.6, { color: '#4c4e52' });
      g.font = `600 5.4px ${SYS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('M1', w / 2 - 0.4, h * 0.42);
      g.font = `500 0.95px ${SYS}`; g.textAlign = 'center';
      g.fillText('APL1102   339S00818', w / 2, h * 0.68);
      g.fillText('U016B8Z11L   2043', w / 2, h * 0.68 + 1.3);
      g.fillText('TAIWAN', w / 2, h * 0.68 + 2.6);
      g.beginPath(); g.arc(1.3, 1.3, 0.38, 0, Math.PI * 2); g.fill();
    }, { ppm: 70, rough: 0.62, metal: 0.4 });
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(LID_X, top + 0.006, 0);
    grp.add(mark);

    // the two LPDDR4X packages
    for (const z of [-MEM_Z, MEM_Z]) {
      grp.add(G.mesh(G.rbox(MEM[0], MEM[2], MEM[1], 0.18, 2), Mat.epoxy('#151516'), { pos: [MEM_X, SUB[2] + 0.1 + MEM[2] / 2, z] }));
      const lab = D.decal(MEM[0] - 1.2, MEM[1] - 1.2, (g, w, h) => {
        g.fillStyle = '#8e8f93';
        g.font = `700 1.5px ${SYS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText('SK hynix', 0.6, 2.0);
        g.font = `500 0.82px ${SYS}`;
        g.fillText('H9HCNNNCPMMLXR', 0.6, 4.2);
        g.fillText('-NEE  043A', 0.6, 5.4);
        g.fillText('KOREA', 0.6, 6.6);
        g.beginPath(); g.arc(0.8, h - 0.9, 0.35, 0, Math.PI * 2); g.fill();
      }, { ppm: 70, rough: 0.6 });
      lab.rotation.x = -Math.PI / 2;
      lab.position.set(MEM_X, SUB[2] + 0.1 + MEM[2] + 0.006, z);
      grp.add(lab);
    }

    // the capacitors: rows of tiny ceramic parts with silver ends, along the edges and between the dies
    const bodies = [], ends = [];
    const R = Real.U.rng(2020);
    const cap = (x, z, big, rot) => {
      const L = big ? 1.0 : 0.6, Wc = big ? 0.5 : 0.3, Hc = big ? 0.5 : 0.3;
      const b = G.rbox(L * 0.62, Hc, Wc, Math.min(0.05, Hc * 0.2), 1);
      const e1 = G.rbox(L * 0.2, Hc * 1.02, Wc * 1.02, 0.04, 1);
      const e2 = e1.clone();
      e1.translate(-L * 0.4, 0, 0);
      e2.translate(L * 0.4, 0, 0);
      for (const q of [b, e1, e2]) {
        if (rot) q.rotateY(Math.PI / 2);
        q.translate(x, SUB[2] + Hc / 2, z);
      }
      bodies.push(b);
      ends.push(e1, e2);
    };
    // round the lid
    for (let i = 0; i < 26; i++) {
      const k = (i + 0.5) / 26;
      cap(LID_X - LID / 2 + k * LID, -LID / 2 - 1.6 - (i % 2) * 0.9, false, false);
      cap(LID_X - LID / 2 + k * LID, LID / 2 + 1.6 + (i % 2) * 0.9, false, false);
    }
    for (let i = 0; i < 22; i++) {
      const k = (i + 0.5) / 22;
      cap(LID_X - LID / 2 - 1.6 - (i % 2) * 0.9, -LID / 2 + k * LID, false, true);
    }
    // between the lid and the memory, and down the far edge
    for (let i = 0; i < 18; i++) cap(LID_X + LID / 2 + 1.4 + (i % 2) * 0.9, -12 + i * 1.4, false, true);
    for (let i = 0; i < 14; i++) cap(SUB[0] / 2 - 1.1, -13 + i * 2.0, true, true);
    // a few larger ones near the corners
    for (let i = 0; i < 6; i++) cap(-SUB[0] / 2 + 4.6 + i * 1.5, SUB[1] / 2 - 1.1, true, false);
    for (let i = 0; i < 10; i++) cap(MEM_X - 5 + i * 1.1, 0.2 + (i % 2) * 0.7, false, false);
    grp.add(G.mesh(G.merge(bodies), Mat.ceramic('#9b8462'), { cast: false }));
    grp.add(G.mesh(G.merge(ends), Mat.tin(), { cast: false }));
    return { group: grp, lid, top, lidSize: LID, lidCenter: [LID_X, top, 0] };
  }
  Real.parts.m1Package = m1Package;

  Real.add({
    name: 'Apple M1',
    era: 'bigsur',
    year: '2020',
    kind: 'System on a chip',
    line: '16 billion transistors on a 5 nm die, with the memory sitting beside it on the same package.',
    verb: 'Zoom into the chip',
    view: { yaw: 16, pitch: 42, lens: 100, fill: 0.84, aperture: 4 },
    set: { paper: '#d9d9d7', keyDir: [-0.5, 0.85, 0.4], shadowSoft: 8 },
    next: { type: 'assemble' },
    make(M) {
      const pkg = m1Package();
      // set at a slight angle on the sweep, as a chip is photographed
      const g = M.group({ rot: [0, -8, 0] });
      g.add(pkg.group);
      M.state.pkg = pkg;
      M.mark('focus', pkg.lid, { center: [0, LID_T / 2, 0], x: [1, 0, 0], y: [0, 0, -1], w: LID, h: LID });
    },
  });
})();
