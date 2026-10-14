// ipod.js: iPod, 2001.
//
// The machine: 102 × 61.8 × 19.9 mm. A front of white polycarbonate under a clear layer, so it is
// glossy and deep, sits on a mirror-polished stainless-steel back that wraps the sides and rounds off
// like a pebble behind. Below the screen, the scroll wheel that really turned, ringed by four buttons
// (MENU, back, forward, play/pause) with a select button in the middle. On top: the hold switch, the
// FireWire port and the headphone socket, with the white earbuds plugged in and laid out beside it.
//
// The screen: a 2-inch, 160 × 128 greyscale LCD with a white backlight, set in Chicago. Now Playing:
// the song from the 2003 silhouette advert. Its album cover is the portal, and on it the iPhone is a
// silhouette, as the adverts drew everything.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;

  const PW = 61.8, PH = 102, PD = 19.9, R = 6.2;
  const ZS = 2.4; // the seam between the steel back and the white front
  const WHEEL_Y = 30.5;

  // ---------- Chicago, as the iPod set it ----------
  // QuickDraw made bold by drawing a face twice, a pixel apart; Chicago looks like that. Geneva
  // thresholded to single-pixel strokes, then smeared one pixel right, comes out very close.
  const scratch = document.createElement('canvas');
  const sg = scratch.getContext('2d', { willReadFrequently: true });
  function chicago(g, str, x, y, o = {}) {
    const size = o.size || 11, bold = o.bold ?? true;
    const font = `${o.weight || 400} ${size}px Geneva, "Lucida Grande", "Helvetica Neue", Arial, sans-serif`;
    sg.font = font;
    const w = Math.ceil(sg.measureText(str).width) + (bold ? 6 : 4) + (o.track || 0) * str.length, h = Math.ceil(size * 1.7) + 4;
    scratch.width = w;
    scratch.height = h;
    sg.font = font;
    sg.fillStyle = '#fff';
    const asc = Math.round(size * 1.1) + 2;
    if (o.track) { let cx = 2; for (const ch of str) { sg.fillText(ch, cx, asc); cx += sg.measureText(ch).width + o.track; } }
    else sg.fillText(str, 2, asc);
    const im = sg.getImageData(0, 0, w, h);
    const d = im.data;
    const on = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) on[i] = d[i * 4 + 3] > (o.thr ?? 0.45) * 255 ? 1 : 0;
    const c = Pix.hexRgb(o.color || '#000');
    let x0 = w, x1 = 0;
    for (let j = 0; j < h; j++) for (let i = w - 1; i >= 0; i--) {
      const v = on[j * w + i] || (bold && i > 0 && on[j * w + i - 1]);
      const k = (j * w + i) * 4;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = v ? 255 : 0;
      if (v) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); }
    }
    sg.putImageData(im, 0, 0);
    const tw = x1 >= x0 ? x1 - x0 + 1 : 0;
    let X = x - x0;
    if (o.align === 'center') X = x - x0 - Math.floor(tw / 2);
    else if (o.align === 'right') X = x - x0 - tw;
    g.drawImage(scratch, Math.round(X), Math.round(y - asc));
    return tw;
  }


  // ---------- Now Playing, 160 × 128 ----------
  const INK = '#000';
  function nowPlaying(g, s) {
    const W = s.W, H = s.H;
    Pix.rect(g, 0, 0, W, H, '#fff');
    // the title bar: the play glyph, the title, the battery
    Pix.bitmap(g, ['X....', 'XX...', 'XXX..', 'XXXX.', 'XXX..', 'XX...', 'X....'], 5, 5, { X: INK });
    chicago(g, 'Now Playing', W / 2, 13, { size: 11, align: 'center' });
    Pix.frame(g, 136, 5, 17, 8, INK);
    Pix.rect(g, 153, 7, 2, 4, INK);
    Pix.rect(g, 138, 7, 10, 4, INK);
    Pix.rect(g, 0, 17, W, 1, INK);
    chicago(g, '1 of 12', 5, 29, { size: 9, bold: false, thr: 0.38 });
    // the album: a frame round the cover; the cover itself is the portal
    Pix.frame(g, 4, 33, 56, 56, INK);
    // the song, beside it
    chicago(g, 'Are You Gonna', 65, 46, { size: 10 });
    chicago(g, 'Be My Girl', 65, 58, { size: 10 });
    chicago(g, 'Jet', 65, 73, { size: 10, bold: false, thr: 0.38 });
    chicago(g, 'Get Born', 65, 85, { size: 10, bold: false, thr: 0.38 });
    // the progress bar and the times, ticking on
    const total = 213, el = Math.floor(84 + (s.time || 0)) % total;
    Pix.frame(g, 5, 97, 150, 8, INK);
    Pix.rect(g, 6, 98, Math.round(148 * (el / total)), 6, INK);
    Pix.fillPat(g, 6 + Math.round(148 * (el / total)), 98, 148 - Math.round(148 * (el / total)), 6, 'ltGray', INK, '#fff');
    const mmss = (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
    chicago(g, mmss(el), 5, 120, { size: 10, bold: false, thr: 0.38 });
    chicago(g, '-' + mmss(total - el), 155, 120, { size: 10, bold: false, thr: 0.38, align: 'right' });
    g.clearRect(5, 34, 54, 54);
  }

  Real.add({
    name: 'iPod',
    era: 'ipod',
    year: '2001',
    kind: 'Music player',
    line: 'A 5 GB hard drive and a scroll wheel that really turned. A thousand songs in your pocket.',
    verb: 'Look closer at the album art',
    view: { yaw: 21, pitch: 10, lens: 105, fill: 0.86 },
    set: { paper: '#dcdbd7', keyDir: [-0.5, 0.82, 0.55] },
    next: { type: 'screen', look: { kind: 'silhouette', fg: '#0d0d0d', bg: '#c9518b' } },
    make(M) {
      // mirror-polished stainless, reflecting the paper it stands on
      const steel = new T.MeshPhysicalMaterial({ color: new T.Color('#dcdde0'), roughness: 0.05, metalness: 1, envMap: Real.sweepEnv(), envMapIntensity: 0.36 });
      const white = new T.MeshPhysicalMaterial({ color: new T.Color('#fcfcfa'), roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.4, sheenRoughness: 0.4, sheenColor: new T.Color('#ffffff') });
      const wheelMat = Mat.plastic('#f0f0ed', { rough: 0.42 });
      const btnMat = new T.MeshPhysicalMaterial({ color: new T.Color('#f6f6f3'), roughness: 0.3, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15 });
      const ip = M.group({ name: 'ipod' });

      // ---- the steel back: a pebble behind, straight sides up to the seam ----
      // built as rounded-rectangle sections stacked from the back (z = -PD/2) forward
      const rb = 6.5, secs = [];
      for (let i = 0; i <= 9; i++) {
        const a = (i / 9) * (Math.PI / 2), k = 1 - Math.sin(a);
        secs.push({ w: PW - 2 * rb * k, d: PH - 2 * rb * k, r: Math.max(0.5, R - rb * k * 0.6), y: rb * (1 - Math.cos(a)) });
      }
      secs.push({ w: PW, d: PH, r: R, y: PD / 2 + ZS - 0.15 });
      const back = G.loftRR(secs, { seg: 8 });
      back.rotateX(Math.PI / 2);
      back.translate(0, PH / 2, -PD / 2);
      M.mesh(back, steel, { to: ip });
      // ---- the white front: a thick moulding, its front edge rounded over ----
      const re = 2.4, fs = [];
      fs.push({ w: PW - 0.25, d: PH - 0.25, r: R - 0.1, y: 0 });
      fs.push({ w: PW, d: PH, r: R, y: 0.25 });
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2);
        fs.push({ w: PW - 2 * re * (1 - Math.cos(a)), d: PH - 2 * re * (1 - Math.cos(a)), r: R - re * (1 - Math.cos(a)), y: PD / 2 - ZS - re + re * Math.sin(a) });
      }
      const front = G.loftRR(fs, { seg: 8 });
      front.rotateX(Math.PI / 2);
      front.translate(0, PH / 2, ZS);
      M.mesh(front, white, { to: ip });
      // the seam: a fine dark line where the two meet
      const seam = G.loftRR([{ w: PW - 0.3, d: PH - 0.3, r: R - 0.15, y: 0 }, { w: PW + 0.02, d: PH + 0.02, r: R + 0.01, y: 0.35 }], { seg: 8, capStart: false, capEnd: false });
      seam.rotateX(Math.PI / 2);
      seam.translate(0, PH / 2, ZS - 0.12);
      M.mesh(seam, Mat.hole('#3a3a38'), { to: ip, cast: false });

      const FZ = PD / 2 + 0.02; // the front face
      // ---- the screen, under the clear front, in its dark mask ----
      const SY = 76.6;
      M.mesh(G.plate(43.4, 35.3, 0.12, 1.2, 0.03), Mat.plastic('#2d2f2c', { rough: 0.25, clearcoat: 1 }), { to: ip, pos: [0, SY, FZ + 0.04], cast: false });
      const disp = M.screen({
        to: ip, pos: [0, SY, FZ + 0.2], w: 39.6, h: 31.7, glass: [41.6, 33.6], tech: 'lcd-gray', ui: [160, 128],
        rough: 0.12, bright: 1.25,
        portal: { rect: [5, 34, 54, 54] },
        animate: 2,
        draw: nowPlaying,
      });
      M.state.display = disp;

      // ---- the wheel: four buttons in a fixed ring, the turning wheel, the select button ----
      const W0 = 8.1, W1 = 18.4, W2 = 18.9, W3 = 23.1;
      // the fixed ring, with gaps between its four buttons
      const ringGeos = [];
      for (let q = 0; q < 4; q++) {
        const a0 = (q * Math.PI) / 2 - Math.PI / 4 + 0.035, a1 = a0 + Math.PI / 2 - 0.07;
        const sh = new T.Shape();
        const N = 24;
        for (let i = 0; i <= N; i++) { const a = a0 + ((a1 - a0) * i) / N; sh[i ? 'lineTo' : 'moveTo'](W3 * Math.cos(a), W3 * Math.sin(a)); }
        for (let i = N; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / N; sh.lineTo(W2 * Math.cos(a), W2 * Math.sin(a)); }
        ringGeos.push(G.extrude(sh, 0.9, 0.3, { curveSeg: 4, bevelSeg: 3 }));
      }
      M.mesh(G.merge(ringGeos), btnMat, { to: ip, pos: [0, WHEEL_Y, FZ - 0.75] });
      // the dark gaps the ring and the wheel turn in
      const gap = new T.Shape(G.circlePts(W3 + 0.35, 0, 0, 96));
      gap.holes.push(G.circleHole(W0 - 0.1, 0, 0, 64));
      M.mesh(G.extrude(gap, 0.4, 0.05), Mat.hole('#4a4a47'), { to: ip, pos: [0, WHEEL_Y, FZ - 0.45], cast: false });
      // the wheel: a disc a hair below the face, with a fine radial grain from being turned
      const wheel = new T.Shape(G.circlePts(W1, 0, 0, 128));
      wheel.holes.push(G.circleHole(W0 + 0.35, 0, 0, 64));
      M.mesh(G.extrude(wheel, 0.9, 0.35, { curveSeg: 16, bevelSeg: 4 }), Mat.micro(new T.MeshPhysicalMaterial({ color: new T.Color('#efefeb'), roughness: 0.4, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3 }), { size: 0.06, bump: 0.06, rough: 0.2 }), { to: ip, pos: [0, WHEEL_Y, FZ - 0.85] });
      // the select button, domed a little
      const sel = G.lathe([[0, 0.55], [3, 0.5], [6, 0.38], [W0 - 0.5, 0.15], [W0 - 0.1, -0.2], [W0 - 0.1, -1]], 64);
      sel.rotateX(Math.PI / 2);
      M.mesh(sel, btnMat, { to: ip, pos: [0, WHEEL_Y, FZ - 0.6] });
      // the legends on the four buttons
      const lg = D.decal(2 * W3, 2 * W3, (g, w, h) => {
        const cx = w / 2, cy = h / 2, rr = (W2 + W3) / 2;
        g.fillStyle = '#8f9196';
        g.font = '700 2.15px "Helvetica Neue", Helvetica, Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        if ('letterSpacing' in g) g.letterSpacing = '0.25px';
        g.fillText('MENU', cx, cy - rr + 0.05);
        const tri = (x, y, d, s = 1.1) => { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + d * s * 1.5, y); g.lineTo(x, y + s); g.closePath(); g.fill(); };
        const bar = (x, y, s = 1.1) => g.fillRect(x - 0.22, y - s, 0.44, 2 * s);
        // back: a bar and two triangles pointing left
        bar(cx - rr - 1.85, cy); tri(cx - rr + 0.1, cy, -1); tri(cx - rr + 1.75, cy, -1);
        // forward
        tri(cx + rr - 1.75, cy, 1); tri(cx + rr - 0.1, cy, 1); bar(cx + rr + 1.85, cy);
        // play / pause
        tri(cx - 1.9, cy + rr, 1); bar(cx + 0.85, cy + rr); bar(cx + 1.75, cy + rr);
      }, { ppm: 60, rough: 0.3, clearcoat: 0.6 });
      lg.position.set(0, WHEEL_Y, FZ + 0.17);
      M.add(lg, ip);

      // ---- the top: the hold switch, the FireWire port, the headphone socket ----
      const top = M.group({ to: ip, pos: [0, PH, 0], rot: [-90, 0, 0] });
      // (in top's frame: x across, y toward the back, z up out of the top)
      const tz = 0.02;
      // hold switch: a slot with the slider pushed across (orange shows when on; off here)
      M.mesh(G.plate(9.4, 3.4, 1, 1.6, 0.2), Mat.hole('#1a1a1a'), { to: top, pos: [-17.5, 1.2, tz - 0.45], cast: false });
      M.mesh(G.plate(4.4, 2.6, 1.4, 1.2, 0.35), Mat.plastic('#e9e9e6', { rough: 0.35 }), { to: top, pos: [-15.3, 1.2, tz - 0.2] });
      // FireWire: the six-pin socket with its metal shell and the tongue inside
      const fw = G.rrect(11.6, 5, 1.2);
      fw.holes.push(G.rrectHole(10.6, 4, 0.9));
      M.mesh(G.extrude(fw, 0.6, 0.12), Mat.chrome({ rough: 0.18 }), { to: top, pos: [4.5, 0.6, tz - 0.55] });
      M.mesh(G.plate(10.6, 4, 2, 0.9, 0.1), Mat.hole('#0e0e0e'), { to: top, pos: [4.5, 0.6, tz - 1.2], cast: false });
      M.mesh(G.plate(7.2, 1.2, 0.8, 0.3, 0.1), Mat.plastic('#2a2a2a', { rough: 0.5 }), { to: top, pos: [4.5, 0.4, tz - 0.95], cast: false });
      // the headphone socket, ringed in chrome, with the plug in it
      M.mesh(G.cyl(3.1, 0.5, 0.2, 40), Mat.chrome({ rough: 0.1 }), { to: top, pos: [20, 0.6, tz - 0.4], rot: [90, 0, 0] });

      // ---- the earbuds: the plug, the cable, the Y, and the two buds lying on the table ----
      const cord = Mat.plastic('#f2f2ef', { rough: 0.32, clearcoat: 0.5 });
      M.part('earbuds');
      const jack = [20, PH, 0.6];
      // the plug's white sleeve and strain relief, standing in the socket
      M.mesh(G.lathe([[0, 0], [2.6, 0], [2.7, 0.4], [2.7, 11], [2.1, 12.5], [1.5, 14], [1.3, 17], [0, 17.5]], 32), cord, { pos: jack });
      const path = [[20, PH + 16, 0.6], [20.6, PH + 21, 1.2], [24, PH + 25.5, 2.6], [30, PH + 23.5, 5], [34, PH + 12, 7.5], [36.5, 80, 9.5], [39, 50, 11.5], [44, 22, 14.5], [50, 7, 18], [56, 1.4, 20.5]];
      M.mesh(G.tube(path, 1.0, { seg: 220, radial: 10 }), cord, {});
      // the Y, a little moulded splitter, and two leads on to the buds
      const Y = path[path.length - 1];
      M.mesh(G.cyl(1.9, 2.4, 0.6, 24), cord, { pos: [Y[0], 0, Y[2]] });
      // a bud: a rounded pod lying on its back, its grille up, its stem off to one side and the
      // lead out of the stem's end. Returns where the lead joins it.
      const bud = (p, yaw) => {
        const b = M.group({ pos: p, rot: [0, yaw, 0] });
        M.mesh(G.lathe([[0, 0], [4.5, 0.05], [6.9, 0.7], [8.0, 2.2], [8.25, 4.0], [8.05, 5.9], [7.6, 6.9], [6.9, 7.35], [0, 7.4]], 56), cord, { to: b });
        const grille = D.decal(13.2, 13.2, (g, w, h) => {
          g.fillStyle = '#b9bab7';
          g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#5d5e5b';
          for (let x = 0.15; x < w; x += 0.36) for (let y = 0.15; y < h; y += 0.36) if (Math.hypot(x - w / 2, y - h / 2) < w / 2 - 0.35) g.fillRect(x, y, 0.17, 0.17);
          g.strokeStyle = '#e9e9e6'; g.lineWidth = 0.45; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 0.25, 0, Math.PI * 2); g.stroke();
        }, { ppm: 90, rough: 0.5, metal: 0.7 });
        grille.rotation.x = -Math.PI / 2;
        grille.position.set(0, 7.42, 0);
        b.add(grille);
        // the stem: a capsule leaving the pod's rim, then a short strain relief
        const stem = M.group({ to: b, pos: [0, 2.7, 6.6], rot: [90, 0, 0] });
        M.mesh(G.lathe([[0, -1], [2.35, -1], [2.45, 2], [2.35, 9], [2.0, 11], [1.5, 12.2], [1.15, 14.5], [0, 14.7]], 28), cord, { to: stem });
        const end = new T.Vector3(0, 2.7, 6.6 + 14.4).applyAxisAngle(new T.Vector3(0, 1, 0), (yaw * Math.PI) / 180).add(new T.Vector3(...p));
        return end.toArray();
      };
      const e1 = bud([96, 0, 0], -60);
      const e2 = bud([74, 0, 48], -18);
      M.mesh(G.tube([Y, [62, 1.0, 21], [72, 0.95, 18], e1[0] > 80 ? [e1[0] - 6, 1.0, e1[2] + 6] : e1, e1], 0.9, { seg: 120 }), cord, {});
      M.mesh(G.tube([Y, [59, 1.0, 26], [63, 1.0, 33], [e2[0] - 3, 1.0, e2[2] - 6], e2], 0.9, { seg: 120 }), cord, {});

      // ---- the back: the engraved logo and the fine print (seen when the camera comes round) ----
      const bk = M.group({ to: ip, pos: [0, PH / 2, -PD / 2 - 0.01], rot: [0, 180, 0] });
      const logo = D.appleLogo(20, 0.05, Mat.steel({ rough: 0.3, color: '#cfcdc8' }), 0.02);
      logo.position.set(0, 18, 0);
      bk.add(logo);
      const nm = D.label('iPod', 5.2, { color: '#8a8985', weight: 400, rough: 0.3, metal: 1 });
      nm.position.set(0, -6, 0.01);
      bk.add(nm);
      const fine = D.label('5 GB   Designed by Apple in California   Assembled in Taiwan   Model No: M8541', 0.95, { color: '#8a8985', weight: 400, rough: 0.3, metal: 1 });
      fine.position.set(0, -36, 0.01);
      bk.add(fine);
    },
  });
})();
