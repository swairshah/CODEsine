// iphone.js: iPhone, 2007. EXEMPLAR: finished to final fidelity, and the model for how a machine
// with an event egg is written (see the README's contract).
//
// The machine: 115 × 61 × 11.6 mm. A sheet of black glass fills the front inside a polished
// stainless-steel bezel; the back is anodised aluminium, with the bottom fifth in black plastic so
// the antennas can see out. The home button is concave with a rounded square printed on it; the
// earpiece is a slot in the glass. Down the left side: the ring/silent switch and the volume rocker.
// On top: the headphone jack, the SIM tray and the sleep/wake button. On the bottom: the 30-pin dock
// connector between the speaker and microphone grilles.
//
// The screen: iPhone OS 1.0's home screen at 320 × 480, 163 pixels per inch, on a TN LCD with an
// RGB stripe. Black, no wallpaper; sixteen icons with their gloss; the clock reads 9:41 AM.
// The portal is the Mail icon in the Dock. The egg: as you come close, the envelope on the icon
// opens, and through it the MacBook Air is drawn out of its interoffice envelope.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;
  const { smooth, clamp, lerp } = Real.U;

  const HELV = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  const S = 57; // an icon, in pixels

  // ---------- the 2007 icons, each in its 57 × 57 tile ----------
  function lin(g, y0, y1, a, b) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    return gr;
  }
  function rad(g, x, y, r, a, b) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    return gr;
  }
  const ICON = {
    Text(g) {
      g.fillStyle = lin(g, 0, S, '#7ddb5a', '#2d9b22'); g.fillRect(0, 0, S, S);
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(28.5, 26, 19, 14.5, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(15, 33); g.quadraticCurveTo(14, 42, 9, 45); g.quadraticCurveTo(19, 44, 24, 38); g.fill();
    },
    Calendar(g) {
      g.fillStyle = lin(g, 0, S, '#ffffff', '#e2e2e2'); g.fillRect(0, 0, S, S);
      g.fillStyle = lin(g, 0, 15, '#e7584c', '#b8231a'); g.fillRect(0, 0, S, 15);
      g.fillStyle = '#fff'; g.font = `bold 9px ${HELV}`; g.textAlign = 'center'; g.fillText('Tuesday', 28.5, 11);
      g.fillStyle = '#1a1a1a'; g.font = `bold 34px ${HELV}`; g.fillText('9', 28.5, 49);
    },
    Photos(g) {
      g.fillStyle = lin(g, 0, S, '#9ccbf2', '#3d7fc4'); g.fillRect(0, 0, S, S);
      g.save(); g.translate(30, 29);
      for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); g.fillStyle = i % 2 ? '#f6c928' : '#f0b415'; g.beginPath(); g.ellipse(13, 0, 9, 3.6, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = rad(g, 0, 0, 9, '#3e2a10', '#6e4a1c'); g.beginPath(); g.arc(0, 0, 8.5, 0, Math.PI * 2); g.fill();
      g.restore();
      g.fillStyle = '#3f8a2c'; g.fillRect(27, 44, 3, 13);
    },
    Camera(g) {
      g.fillStyle = lin(g, 0, S, '#6b6b6b', '#1f1f1f'); g.fillRect(0, 0, S, S);
      g.fillStyle = rad(g, 25, 24, 22, '#f2f2f2', '#8e8e8e'); g.beginPath(); g.arc(28.5, 29, 18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(28.5, 29, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = rad(g, 26, 26, 10, '#5a5fd0', '#0d0d2a'); g.beginPath(); g.arc(28.5, 29, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(24.5, 25, 2.6, 0, Math.PI * 2); g.fill();
    },
    YouTube(g) {
      g.fillStyle = lin(g, 0, S, '#5a5a5a', '#262626'); g.fillRect(0, 0, S, S);
      g.fillStyle = lin(g, 8, 48, '#e8e8e8', '#9a9a9a'); Pix.rrect(g, 6, 10, 45, 36, 7); g.fill();
      g.fillStyle = '#fff'; Pix.rrect(g, 10, 15, 37, 26, 5); g.fill();
      g.fillStyle = '#111'; g.font = `bold 12px ${HELV}`; g.textAlign = 'left'; g.fillText('You', 12, 32);
      g.fillStyle = lin(g, 21, 37, '#ef3a2f', '#b3150d'); Pix.rrect(g, 32, 21, 15, 14, 3); g.fill();
      g.fillStyle = '#fff'; g.font = `bold 7.5px ${HELV}`; g.fillText('Tube', 32.6, 31);
      g.fillStyle = '#777'; g.fillRect(16, 46, 4, 5); g.fillRect(37, 46, 4, 5);
    },
    Stocks(g) {
      g.fillStyle = lin(g, 0, S, '#2b2b2b', '#000'); g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
      for (const y of [16, 26, 36, 46]) { g.beginPath(); g.moveTo(5, y + 0.5); g.lineTo(52, y + 0.5); g.stroke(); }
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineJoin = 'round';
      g.beginPath(); [[6, 44], [13, 38], [19, 41], [26, 30], [33, 33], [40, 21], [47, 24], [52, 13]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.fillStyle = '#58d14a'; g.font = `bold 8px ${HELV}`; g.textAlign = 'right'; g.fillText('+1.28', 52, 54);
    },
    Maps(g) {
      g.fillStyle = '#ece6d5'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#b6d79a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, 0); g.lineTo(18, 22); g.lineTo(0, 26); g.fill();
      g.fillStyle = '#9cc4ea'; g.beginPath(); g.moveTo(38, 57); g.quadraticCurveTo(44, 38, 57, 34); g.lineTo(57, 57); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 40); g.lineTo(57, 18); g.stroke();
      g.strokeStyle = '#f6d24a'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(14, 57); g.lineTo(30, 0); g.stroke();
      // the interstate shield, 280
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(8, 8); g.lineTo(24, 8); g.lineTo(24, 18); g.quadraticCurveTo(24, 25, 16, 28); g.quadraticCurveTo(8, 25, 8, 18); g.closePath(); g.fill();
      g.fillStyle = '#2753a5'; g.beginPath(); g.moveTo(9.2, 12); g.lineTo(22.8, 12); g.lineTo(22.8, 18); g.quadraticCurveTo(22.8, 23.6, 16, 26.4); g.quadraticCurveTo(9.2, 23.6, 9.2, 18); g.closePath(); g.fill();
      g.fillStyle = '#d3332a'; g.fillRect(9.2, 9.2, 13.6, 2.8);
      g.fillStyle = '#fff'; g.font = `bold 7px ${HELV}`; g.textAlign = 'center'; g.fillText('280', 16, 21);
      // the pin
      g.strokeStyle = '#555'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(40, 30); g.lineTo(37, 42); g.stroke();
      g.fillStyle = rad(g, 39, 22, 7, '#ff6a5c', '#b5170c'); g.beginPath(); g.arc(40.5, 25, 6, 0, Math.PI * 2); g.fill();
    },
    Weather(g) {
      g.fillStyle = lin(g, 0, S, '#3f8de0', '#9fd0f7'); g.fillRect(0, 0, S, S);
      g.fillStyle = rad(g, 21, 21, 13, '#fff7b0', '#f5c000'); g.beginPath(); g.arc(21, 21, 11.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `bold 17px ${HELV}`; g.textAlign = 'center'; g.fillText('73°', 33, 49);
    },
    Clock(g) {
      g.fillStyle = lin(g, 0, S, '#2d2d2d', '#000'); g.fillRect(0, 0, S, S);
      g.fillStyle = rad(g, 25, 24, 26, '#ffffff', '#d6d6d6'); g.beginPath(); g.arc(28.5, 28.5, 22, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#222';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillRect(28.5 + 18.5 * Math.cos(a) - 0.8, 28.5 + 18.5 * Math.sin(a) - 0.8, 1.6, 1.6); }
      g.strokeStyle = '#111'; g.lineCap = 'round';
      const hand = (a, l, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(28.5, 28.5); g.lineTo(28.5 + l * Math.sin(a), 28.5 - l * Math.cos(a)); g.stroke(); };
      hand(((10 + 9 / 60) / 12) * Math.PI * 2, 11, 2.6);
      hand((9 / 60) * Math.PI * 2, 16, 2);
      g.strokeStyle = '#d22'; hand((36 / 60) * Math.PI * 2, 17, 0.9);
      g.fillStyle = '#111'; g.beginPath(); g.arc(28.5, 28.5, 1.8, 0, Math.PI * 2); g.fill();
    },
    Calculator(g) {
      g.fillStyle = lin(g, 0, S, '#5e5e5e', '#262626'); g.fillRect(0, 0, S, S);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const op = c === 3;
        g.fillStyle = op ? lin(g, 8 + r * 11, 17 + r * 11, '#ffb04a', '#e06a00') : lin(g, 8 + r * 11, 17 + r * 11, '#9a9a9a', '#5c5c5c');
        Pix.rrect(g, 7 + c * 11.2, 7 + r * 11.2, 9.4, 9.4, 2); g.fill();
      }
      g.fillStyle = '#fff'; g.font = `bold 8px ${HELV}`; g.textAlign = 'center';
      ['÷', '×', '−', '+'].forEach((o, r) => g.fillText(o, 7 + 3 * 11.2 + 4.7, 7 + r * 11.2 + 7.6));
    },
    Notes(g) {
      g.fillStyle = '#fbef9d'; g.fillRect(0, 0, S, S);
      g.fillStyle = lin(g, 0, 12, '#8a6038', '#4e321a'); g.fillRect(0, 0, S, 12);
      g.strokeStyle = 'rgba(160,120,60,0.45)'; g.lineWidth = 1;
      for (let y = 22; y < S; y += 7) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(S, y + 0.5); g.stroke(); }
      g.strokeStyle = 'rgba(220,60,40,0.55)'; g.beginPath(); g.moveTo(9.5, 12); g.lineTo(9.5, S); g.stroke();
    },
    Settings(g) {
      g.fillStyle = lin(g, 0, S, '#b8bbbf', '#5f6267'); g.fillRect(0, 0, S, S);
      const gear = (x, y, r, n, col) => {
        g.fillStyle = col;
        g.beginPath();
        for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.78 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
        g.closePath(); g.fill();
        g.fillStyle = '#7d8086'; g.beginPath(); g.arc(x, y, r * 0.38, 0, Math.PI * 2); g.fill();
      };
      gear(24, 31, 17, 12, lin(g, 14, 48, '#e6e7e9', '#7c7f84'));
      gear(42, 16, 9, 10, lin(g, 7, 25, '#d9dadc', '#6c6f74'));
    },
    Phone(g) {
      g.fillStyle = lin(g, 0, S, '#7ddb5a', '#2d9b22'); g.fillRect(0, 0, S, S);
      // the handset: earpiece at top left, mouthpiece at bottom right, a curved grip between
      g.save(); g.translate(28.5, 28.5); g.rotate(Math.PI / 4);
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(-6, -17); g.quadraticCurveTo(-11, -17, -11, -12); g.lineTo(-11, -9); g.quadraticCurveTo(-11, -6, -7, -6);
      g.quadraticCurveTo(-4, -6, -4, -3); g.lineTo(-4, 3); g.quadraticCurveTo(-4, 6, -7, 6);
      g.quadraticCurveTo(-11, 6, -11, 9); g.lineTo(-11, 12); g.quadraticCurveTo(-11, 17, -6, 17);
      g.lineTo(-2, 17); g.quadraticCurveTo(5, 17, 5, 8); g.lineTo(5, -8); g.quadraticCurveTo(5, -17, -2, -17); g.closePath();
      g.fill();
      g.restore();
    },
    Mail(g, st) {
      g.fillStyle = lin(g, 0, S, '#2f7fe0', '#a8d6fb'); g.fillRect(0, 0, S, S);
      // a few clouds low in the sky
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.ellipse(14, 49, 12, 4, 0, 0, Math.PI * 2); g.ellipse(44, 51, 14, 4, 0, 0, Math.PI * 2); g.fill();
      envelope(g, st || {});
    },
    Safari(g) {
      g.fillStyle = lin(g, 0, S, '#e8f2fc', '#b9cfe6'); g.fillRect(0, 0, S, S);
      g.fillStyle = rad(g, 26, 24, 24, '#6fb3f5', '#1c5fbf'); g.beginPath(); g.arc(28.5, 28.5, 21, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1;
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r0 = i % 6 ? 18 : 15; g.beginPath(); g.moveTo(28.5 + r0 * Math.cos(a), 28.5 + r0 * Math.sin(a)); g.lineTo(28.5 + 20 * Math.cos(a), 28.5 + 20 * Math.sin(a)); g.stroke(); }
      g.fillStyle = '#e8302a'; g.beginPath(); g.moveTo(28.5, 28.5); g.lineTo(40, 15); g.lineTo(31, 31); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(28.5, 28.5); g.lineTo(17, 42); g.lineTo(26, 26); g.fill();
    },
    iPod(g) {
      g.fillStyle = lin(g, 0, S, '#ffb13d', '#ef6b00'); g.fillRect(0, 0, S, S);
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(21, 41, 7.5, 6, -0.4, 0, Math.PI * 2); g.fill();
      g.fillRect(26.2, 14, 3, 27);
      g.beginPath(); g.moveTo(29, 14); g.bezierCurveTo(36, 18, 41, 20, 39, 32); g.bezierCurveTo(38, 25, 34, 23, 29, 22); g.fill();
    },
  };
  // the Mail envelope: o.flap 0 shut … 1 open; o.open 0 … 1 the inside cleared so the next machine
  // shows through
  function envelope(g, o) {
    const x0 = 9, y0 = 15, w = 39, h = 27;
    const flap = o.flap || 0;
    g.fillStyle = lin(g, y0, y0 + h, '#ffffff', '#dfe3e8');
    g.fillRect(x0, y0, w, h);
    // the inside of the envelope, seen once the flap lifts
    if (flap > 0) {
      g.fillStyle = `rgba(150,160,175,${0.6 * flap})`;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w / 2, y0 + h * 0.6); g.closePath(); g.fill();
    }
    // the bottom folds
    g.strokeStyle = 'rgba(120,130,145,0.55)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, y0 + h); g.lineTo(x0 + w * 0.42, y0 + h * 0.55); g.moveTo(x0 + w, y0 + h); g.lineTo(x0 + w * 0.58, y0 + h * 0.55); g.stroke();
    // the flap, folding up and over
    const tipY = lerp(y0 + h * 0.58, y0 - h * 0.62, flap);
    g.fillStyle = flap < 0.5 ? lin(g, y0, y0 + h * 0.6, '#ffffff', '#e9edf2') : lin(g, y0 - h * 0.6, y0, '#cfd6df', '#f4f6f8');
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0 + w / 2, tipY); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(110,120,135,0.6)'; g.stroke();
    if (o.open > 0) {
      // through the mouth: the MacBook Air
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const m = 2.5 * (1 - o.open);
      g.globalAlpha = Math.min(1, o.open * 3);
      g.fillRect(x0 + m, y0 + 1 + m, w - 2 * m, h - 2 - 2 * m);
      g.restore();
    }
  }
  // the gloss every icon wore in 2007: a bright arc over the top half
  function gloss(g) {
    g.save();
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(S, 25); g.quadraticCurveTo(S / 2, 33, 0, 25); g.closePath();
    g.fillStyle = lin(g, 0, 30, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.1)');
    g.fill();
    g.restore();
  }
  function icon(g, name, x, y, st) {
    g.save();
    g.translate(x, y);
    Pix.rrect(g, 0, 0, S, S, 10);
    g.clip();
    ICON[name](g, st);
    if (!(name === 'Mail' && st && st.open > 0)) gloss(g);
    g.restore();
  }
  function label(g, name, cx, y) {
    g.font = `bold 11px ${HELV}`;
    g.textAlign = 'center';
    g.fillStyle = 'rgba(0,0,0,0.9)';
    g.fillText(name, cx, y + 1);
    g.fillStyle = '#fff';
    g.fillText(name, cx, y);
  }
  const APPS = ['Text', 'Calendar', 'Photos', 'Camera', 'YouTube', 'Stocks', 'Maps', 'Weather', 'Clock', 'Calculator', 'Notes', 'Settings'];
  const DOCK = ['Phone', 'Mail', 'Safari', 'iPod'];
  const COLX = [16, 92, 168, 244];
  function home(g, s) {
    const W = s.W, H = s.H;
    const mail = s.mail || {};
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    // the status bar: signal, carrier, the time, the battery
    g.fillStyle = lin(g, 0, 20, '#3a3a3a', '#0c0c0c');
    g.fillRect(0, 0, W, 20);
    g.fillStyle = '#e8e8e8';
    for (let i = 0; i < 5; i++) g.fillRect(5 + i * 4, 14 - i * 2, 3, 3 + i * 2);
    g.font = `bold 12px ${HELV}`;
    g.textAlign = 'left';
    g.fillText('AT&T', 27, 15);
    // Wi-Fi
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(66, 15, 3 + i * 3, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
    g.font = `bold 13px ${HELV}`;
    g.textAlign = 'center';
    g.fillText('9:41 AM', W / 2, 15);
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 1;
    g.strokeRect(289.5, 5.5, 22, 10);
    g.fillRect(312, 8, 2, 5);
    g.fillStyle = lin(g, 6, 15, '#c7f2a6', '#6ec43c');
    g.fillRect(291, 7, 19, 7);
    // twelve apps in three rows of four
    APPS.forEach((n, i) => {
      const x = COLX[i % 4], y = 27 + Math.floor(i / 4) * 88;
      icon(g, n, x, y);
      label(g, n, x + S / 2, y + S + 13);
    });
    // the Dock: a glass shelf with the icons reflected in it
    g.fillStyle = lin(g, 392, 480, '#4b4f55', '#16181b');
    g.fillRect(0, 392, W, 88);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(0, 392, W, 1);
    g.fillStyle = lin(g, 393, 430, 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)');
    g.fillRect(0, 393, W, 37);
    DOCK.forEach((n, i) => {
      const x = COLX[i], y = 400;
      // the reflection under the icon
      g.save();
      g.translate(x, y + 2 * S + 1);
      g.scale(1, -1);
      g.globalAlpha = 0.25;
      Pix.rrect(g, 0, 0, S, S, 10);
      g.clip();
      ICON[n](g, n === 'Mail' ? mail : undefined);
      g.restore();
      g.fillStyle = lin(g, y + S, y + S + 22, 'rgba(22,24,27,0.5)', 'rgba(22,24,27,1)');
      g.fillRect(x, y + S, S, 22);
      icon(g, n, x, y, n === 'Mail' ? mail : undefined);
      label(g, n, x + S / 2, y + S + 13);
    });
    // once the envelope is open, the opening grows out from it until it is the whole picture of the
    // next machine; the rest of the screen stays, and passes out of view as the camera arrives
    if (mail.clear > 0 && mail.frame) {
      const [fx, fy, fw, fh] = mail.frame;
      const e = [COLX[1] + 9, 400 + 15, 39, 27];
      const k = mail.clear;
      const x = lerp(e[0], fx, k), y = lerp(e[1], fy, k), w = lerp(e[2], fw, k), h = lerp(e[3], fh, k);
      g.save();
      g.globalCompositeOperation = 'destination-out';
      Pix.rrect(g, x, y, w, h, lerp(2, 0, k));
      g.fill();
      g.restore();
    }
  }

  Real.add({
    name: 'iPhone',
    era: 'iphone',
    year: '2007',
    kind: 'Phone',
    line: 'A widescreen iPod, a phone and an internet communicator in one. The clocks in every ad read 9:41.',
    verb: 'Open Mail',
    view: { yaw: -24, pitch: 6, lens: 105, fill: 0.86 },
    set: { paper: '#dddcd9', keyDir: [-0.45, 0.85, 0.5] },
    next: { type: 'screen', egg: 'mail' },
    make(M) {
      const PH = 115, PW = 61, PT = 11.6, R = 9.4;
      const alu = Mat.alu('#c3c5c8', { rough: 0.38 });
      const black = Mat.plastic('#141415', { rough: 0.4 });
      const steel = Mat.steel({ rough: 0.07, color: '#e2e1de' });
      // the phone stands on its bottom edge, its front facing +z; everything is built lying on its
      // back (front up, +y) and turned upright at the end
      const ph = M.group({ name: 'phone' });
      const flat = new T.Group();
      ph.add(flat);
      flat.rotation.x = Math.PI / 2;
      flat.position.set(0, PH / 2, 0);
      // in flat's frame: x across the phone, y out of the front, z down the phone (top at -PH/2)
      const fromTop = (d) => -PH / 2 + d;

      // the back shell: a pillow, flat on the back, curving round into straight sides
      const secs = [];
      const rb = 5.6;
      for (let i = 0; i <= 7; i++) {
        const a = (i / 7) * (Math.PI / 2);
        secs.push({ w: PW - 2 * rb * (1 - Math.sin(a)), d: PH - 2 * rb * (1 - Math.sin(a)), r: R - rb * (1 - Math.sin(a)) * 0.7, y: rb * (1 - Math.cos(a)) });
      }
      secs.push({ w: PW, d: PH, r: R, y: PT - 1.7 });
      const shell = G.loftRR(secs, { seg: 8, capEnd: false });
      shell.translate(0, -PT / 2, 0);
      // aluminium above, black plastic across the bottom fifth (the antenna window)
      const split = PH / 2 - 22.5;
      const shellG = G.splitGroups(shell, (c) => (c.z > split ? 1 : 0));
      flat.add(G.mesh(shellG, [alu, black], {}));
      // the stainless bezel round the glass, and the glass
      const ring = G.rrect(PW, PH, R);
      ring.holes.push(G.rrectHole(PW - 2.4, PH - 2.4, R - 1.2));
      flat.add(G.mesh(G.extrude(ring, 1.9, 0.55, { bevelSeg: 5, curveSeg: 16 }), steel, { pos: [0, 0, 0], rot: [-90, 0, 0] }));
      flat.children[flat.children.length - 1].position.y = PT / 2 - 1.9;
      flat.children[flat.children.length - 1].rotation.x = -Math.PI / 2;
      // (the ring is extruded along z, turned to stack along y)
      const glassMat = Mat.glass({ rough: 0.025 });
      // with its two openings: the home button and the earpiece
      const glass = G.mesh(G.plate(PW - 2.3, PH - 2.3, 0.7, R - 1.15, 0.12, { holes: [G.circleHole(5.75, 0, -PH / 2 + 11.2, 64), G.rrectHole(11.7, 1.8, 0.9, 0, PH / 2 - 9.6)] }), glassMat, { pos: [0, PT / 2 - 0.55, 0], rot: [-90, 0, 0] });
      flat.add(glass);
      // the front, in the glass's frame: x right, y up the phone, z out of the glass
      const front = new T.Group();
      front.position.set(0, PT / 2 - 0.18, 0);
      front.rotation.x = -Math.PI / 2;
      // (front's y runs up the phone: flat's -z)
      flat.add(front);
      // the earpiece: a slot through the glass with its mesh behind
      front.add(G.mesh(G.plate(11.6, 1.7, 0.4, 0.85, 0.1), Mat.hole('#0c0c0d'), { pos: [0, PH / 2 - 9.6, 0.02], cast: false }));
      const mesh = D.decal(11.2, 1.4, (g, w, h) => {
        g.fillStyle = '#2a2a2c';
        for (let x = 0.15; x < w; x += 0.32) for (let y = 0.15; y < h; y += 0.32) g.fillRect(x, y, 0.16, 0.16);
      }, { ppm: 60, rough: 0.6, metal: 0.6 });
      mesh.position.set(0, PH / 2 - 9.6, 0.03);
      front.add(mesh);
      // the home button: a dish of black plastic set in the glass, a rounded square printed on it
      const hb = G.lathe([[5.62, -0.6], [5.62, 0.0], [5.5, 0.08], [5.2, -0.05], [3.2, -0.25], [0, -0.35]], 64);
      hb.rotateX(Math.PI / 2);
      front.add(G.mesh(hb, Mat.plastic('#0c0c0d', { rough: 0.22, clearcoat: 0.6 }), { pos: [0, -PH / 2 + 11.2, 0.04] }));
      const sq = D.decal(4.2, 4.2, (g, w, h) => {
        g.strokeStyle = '#b4b4b7';
        g.lineWidth = 0.42;
        Pix.rrect(g, 0.35, 0.35, w - 0.7, h - 0.7, 0.95);
        g.stroke();
      }, { ppm: 80, rough: 0.5 });
      sq.position.set(0, -PH / 2 + 11.2, -0.24);
      front.add(sq);
      // the screen
      const disp = M.screen({
        to: front, pos: [0, 2.55, 0.03],
        w: 49.9, h: 74.9, glass: [57.2, 82], tech: 'lcd', ui: [320, 480],
        portal: { rect: [COLX[1], 400, S, S] },
        draw: home,
      });
      M.state.display = disp;

      // the sides: ring/silent switch and the volume rocker on the left, the jack, SIM tray and
      // sleep button on top, the dock connector and grilles on the bottom
      const side = (x, y, z) => [x, y, z];
      // the left side is x = -PW/2; buttons sit in the aluminium, a little proud of it
      flat.add(G.mesh(G.rbox(1.6, 3.4, 15, 0.75, 4), Mat.alu('#babcc0', { rough: 0.3 }), { pos: side(-PW / 2 - 0.2, PT / 2 - 4.6, fromTop(33)) }));
      flat.add(G.mesh(G.rbox(1.4, 3.2, 6, 0.6, 3), Mat.hole('#151515'), { pos: side(-PW / 2 + 0.1, PT / 2 - 4.6, fromTop(16.5)) }));
      flat.add(G.mesh(G.rbox(1.6, 1.6, 2.4, 0.5, 3), Mat.alu('#babcc0', { rough: 0.3 }), { pos: side(-PW / 2 - 0.3, PT / 2 - 4.6, fromTop(15.6)) }));
      // top: the jack (recessed, black), the SIM tray, the sleep/wake button
      flat.add(G.mesh(G.cyl(2.2, 2, 0.4, 24), Mat.hole('#0d0d0d'), { pos: side(-PW / 2 + 9.6, PT / 2 - 4.8, fromTop(1.4)), rot: [90, 0, 0] }));
      flat.add(G.mesh(G.cyl(3.05, 0.6, 0.25, 32), Mat.alu('#babcc0', { rough: 0.3 }), { pos: side(-PW / 2 + 9.6, PT / 2 - 4.8, fromTop(-0.05)), rot: [90, 0, 0] }));
      flat.add(G.mesh(G.rbox(14, 3.4, 0.6, 1.2, 3), Mat.alu('#b0b2b6', { rough: 0.3 }), { pos: side(0, PT / 2 - 5.2, fromTop(-0.05)) }));
      flat.add(G.mesh(G.rbox(10.5, 3.2, 1.5, 1.3, 3), Mat.plastic('#1c1c1d', { rough: 0.35 }), { pos: side(PW / 2 - 11.5, PT / 2 - 4.8, fromTop(-0.3)) }));
      // bottom: the 30-pin connector between two grilles of holes
      flat.add(G.mesh(G.rbox(21.5, 2.6, 2, 1.0, 3), Mat.hole('#0a0a0a'), { pos: side(0, PT / 2 - 5.2, PH / 2 - 0.4) }));
      for (const sx of [-1, 1]) {
        const holes = [];
        for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) {
          const hg = G.cyl(0.42, 1, 0.1, 10);
          hg.rotateX(Math.PI / 2);
          hg.translate(sx * (14 + i * 1.25), PT / 2 - 5.9 + j * 1.3, PH / 2 - 0.35);
          holes.push(hg);
        }
        flat.add(G.mesh(G.merge(holes), Mat.hole('#090909'), { cast: false }));
      }
      // the back: the camera, the polished logo, the name
      // in back's frame: x right and y up as you look at the back, z out of it
      const back = new T.Group();
      back.rotation.set(-Math.PI / 2, Math.PI, 0);
      back.position.set(0, -PT / 2 - 0.01, 0);
      flat.add(back);
      back.add(G.mesh(G.cyl(3.2, 0.5, 0.2, 32), Mat.chrome({ rough: 0.1 }), { pos: [-PW / 2 + 9, PH / 2 - 9, -0.2], rot: [90, 0, 0] }));
      back.add(G.mesh(G.cyl(2.5, 0.6, 0.1, 32), Mat.glass({ rough: 0.02 }), { pos: [-PW / 2 + 9, PH / 2 - 9, -0.1], rot: [90, 0, 0] }));
      const logo = D.appleLogo(16, 0.08, Mat.chrome({ rough: 0.06 }), 0.02);
      logo.position.set(0, 14, 0.02);
      back.add(logo);
      const name = D.label('iPhone', 2.6, { color: '#3c3c3e', weight: 400, rough: 0.2, metal: 0.8 });
      name.position.set(0, -6, 0.02);
      back.add(name);
      const fine = D.label('8GB   Designed by Apple in California   Assembled in China   Model No: A1203', 0.9, { color: '#505053', weight: 400 });
      fine.position.set(0, -PH / 2 + 30, 0.02);
      back.add(fine);
    },
  });

  // ---------- the Mail egg ----------
  // The camera closes on the Mail icon. The envelope's flap folds up and over, the envelope opens,
  // and through its mouth you see the MacBook Air being drawn out of its interoffice envelope (the
  // MacBook Air's pose({ emerge }) does that). Then everything on the screen clears from the icon
  // outward, and the camera arrives at the MacBook Air.
  Real.egg('mail', (api) => {
    const { t, display: d } = api;
    const flap = smooth(0.3, 0.55, t);
    const open = smooth(0.5, 0.66, t);
    const clear = smooth(0.66, 0.9, t);
    const st = d.state.drawState && d.state.drawState.mail;
    if (!st || st.flap !== flap || st.open !== open || st.clear !== clear) {
      d.state.drawState = { mail: { flap, open, clear, frame: d.state.frame } };
      d.redraw();
    }
    api.poseNext({ emerge: smooth(0.5, 0.97, t) });
  });
})();
