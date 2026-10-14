// macbook-air.js: MacBook Air, 2008.
//
// The machine: 325 × 227 mm, 19.4 mm at the back and 4 mm at the front, closed. The base is a wedge:
// a flat aluminium deck tilted toward you, over a tub whose underside curves away so steeply that
// the edges look like a knife. Black keys in a sieve of aluminium, the big multi-touch trackpad with
// its one wide button, a hinge barrel across the back, and on the right the little door that flips
// down to show the USB port, the micro-DVI port and the headphone socket. The lid has a silver bezel
// round a glossy 13.3-inch LED screen, the iSight above it and its name below.
//
// It lies on the interoffice envelope it came out of on stage. The iPhone's Mail egg calls
// pose({ emerge }): 0 is the closed laptop inside the envelope, 1 is out, set down on it and open.
//
// The screen: Mac OS X Leopard at 1280 × 800, the Aurora wallpaper, the translucent menu bar, a
// Finder window and the glass Dock. The egg 'clock' is Time Machine, run forwards: the desktop
// drops away into space, the stack of windows comes toward you a year at a time while the timeline
// counts up from 2008 to 2016, and the last window holds the Apple Watch.
'use strict';

(function () {
  const T = THREE;
  const { G, Mat, D, Pix } = Real;
  const { smooth, clamp, lerp, easeInOut } = Real.U;

  const LUCIDA = '"Lucida Grande", "Lucida Sans Unicode", Geneva, Helvetica, Arial, sans-serif';
  const SW = 1280, SH = 800;

  // ---------- small drawing helpers ----------
  function lin(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  function rad(g, x, y, r, stops) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  }
  function rr(g, x, y, w, h, r) { Pix.rrect(g, x, y, w, h, r); }
  function offscreen(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  }
  const rng = Real.U.rng;

  // ---------- Aurora, Leopard's wallpaper ----------
  function aurora(g, W, H) {
    g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#0d1033'], [0.45, '#241656'], [1, '#09102b']]);
    g.fillRect(0, 0, W, H);
    const R = rng(7);
    // faint stars
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.5})`;
      const s = R() < 0.08 ? 1.6 : 0.8;
      g.fillRect(R() * W, R() * H, s, s);
    }
    // the aurora: broad soft curtains of magenta, violet and blue sweeping across the upper middle
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.filter = 'blur(26px)';
    const band = (y0, amp, col, w, ph) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      for (let x = -100; x <= W + 100; x += 20) {
        const y = y0 + amp * Math.sin(x / 260 + ph) + amp * 0.4 * Math.sin(x / 97 + ph * 2);
        x === -100 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    };
    band(H * 0.38, 70, 'rgba(160,60,200,0.55)', 120, 0.4);
    band(H * 0.46, 55, 'rgba(230,80,190,0.45)', 60, 1.3);
    band(H * 0.3, 80, 'rgba(70,90,230,0.5)', 140, 2.2);
    band(H * 0.55, 40, 'rgba(120,70,220,0.4)', 90, 3.1);
    g.filter = 'blur(6px)';
    band(H * 0.44, 58, 'rgba(255,170,240,0.35)', 10, 1.32);
    band(H * 0.36, 66, 'rgba(200,170,255,0.3)', 6, 0.42);
    g.restore();
    // light rays falling from the curtains
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.filter = 'blur(10px)';
    for (let i = 0; i < 70; i++) {
      const x = R() * W, y = H * 0.32 + 60 * Math.sin(x / 260 + 0.4);
      g.fillStyle = `rgba(${150 + R() * 100},${80 + R() * 60},255,${0.05 + R() * 0.08})`;
      g.fillRect(x, y - 120 - R() * 80, 3 + R() * 6, 200 + R() * 120);
    }
    g.restore();
    g.fillStyle = lin(g, 0, H * 0.6, 0, H, [[0, 'rgba(5,8,25,0)'], [1, 'rgba(5,8,25,0.55)']]);
    g.fillRect(0, H * 0.6, W, H * 0.4);
  }

  // ---------- Leopard's icons, each drawn in an s × s square ----------
  function folderIcon(g, x, y, s, o = {}) {
    g.save();
    g.translate(x, y);
    g.scale(s / 64, s / 64);
    g.fillStyle = lin(g, 0, 8, 0, 56, [[0, '#8fb6e8'], [1, '#5d8fd0']]);
    g.beginPath(); g.moveTo(4, 14); g.lineTo(24, 14); g.lineTo(28, 9); g.lineTo(58, 9); g.lineTo(60, 12); g.lineTo(60, 52); g.lineTo(4, 52); g.closePath(); g.fill();
    g.fillStyle = lin(g, 0, 18, 0, 56, [[0, '#cfe2f8'], [0.15, '#a9c8ee'], [1, '#7aa4dc']]);
    rr(g, 3, 18, 58, 38, 2.5); g.fill();
    g.strokeStyle = 'rgba(60,100,160,0.55)'; g.lineWidth = 1; rr(g, 3.5, 18.5, 57, 37, 2.5); g.stroke();
    if (o.glyph) { g.fillStyle = 'rgba(70,110,170,0.75)'; o.glyph(g); }
    g.restore();
  }
  const ICONS = {
    Finder(g) {
      g.fillStyle = lin(g, 0, 4, 0, 60, [[0, '#7fc0f5'], [1, '#2f7fd9']]); rr(g, 6, 6, 52, 52, 7); g.fill();
      g.save(); rr(g, 6, 6, 52, 52, 7); g.clip();
      g.fillStyle = lin(g, 0, 4, 0, 60, [[0, '#e8f3fd'], [1, '#bcd9f4']]);
      g.beginPath(); g.moveTo(6, 6); g.lineTo(35, 6); g.lineTo(27, 32); g.lineTo(32, 32); g.lineTo(30, 58); g.lineTo(6, 58); g.closePath(); g.fill();
      g.restore();
      g.fillStyle = '#183a66'; g.fillRect(19, 20, 3, 8); g.fillRect(41, 20, 3, 8);
      g.strokeStyle = '#183a66'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(17, 41); g.quadraticCurveTo(32, 50, 47, 41); g.stroke();
    },
    Dashboard(g) {
      g.fillStyle = rad(g, 32, 28, 30, [[0, '#4a4a4c'], [1, '#0e0e10']]); g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#c9c9cc'; g.lineWidth = 2; g.beginPath(); g.arc(32, 34, 18, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
      for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.8 + (i / 8) * Math.PI * 1.4; g.fillStyle = '#fff'; g.fillRect(32 + 14 * Math.cos(a) - 1, 34 + 14 * Math.sin(a) - 1, 2, 2); }
      g.strokeStyle = '#ff5a36'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(32, 34); g.lineTo(43, 24); g.stroke();
      g.fillStyle = '#ddd'; g.beginPath(); g.arc(32, 34, 3, 0, Math.PI * 2); g.fill();
    },
    Mail(g) {
      g.fillStyle = lin(g, 0, 14, 0, 52, [[0, '#f7f7f7'], [1, '#c9cdd3']]); rr(g, 6, 16, 52, 34, 2); g.fill();
      g.strokeStyle = 'rgba(90,100,115,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(7, 17); g.lineTo(32, 36); g.lineTo(57, 17); g.stroke();
      // the stamp: an eagle in blue
      g.fillStyle = '#fff'; g.fillRect(39, 9, 18, 22); g.fillStyle = lin(g, 0, 10, 0, 30, [[0, '#5f9ad9'], [1, '#2a5fae']]); g.fillRect(41, 11, 14, 18);
      g.fillStyle = '#e9edf3'; g.beginPath(); g.moveTo(42, 22); g.quadraticCurveTo(48, 14, 54, 22); g.quadraticCurveTo(48, 19, 42, 22); g.fill();
    },
    Safari(g) {
      g.fillStyle = rad(g, 28, 26, 30, [[0, '#d9ecfd'], [0.55, '#4f9af0'], [1, '#14509f']]); g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1;
      for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, r0 = i % 4 ? 22 : 19; g.beginPath(); g.moveTo(32 + r0 * Math.cos(a), 32 + r0 * Math.sin(a)); g.lineTo(32 + 24 * Math.cos(a), 32 + 24 * Math.sin(a)); g.stroke(); }
      g.fillStyle = '#e8352b'; g.beginPath(); g.moveTo(32, 32); g.lineTo(46, 17); g.lineTo(35, 35); g.fill();
      g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(32, 32); g.lineTo(18, 47); g.lineTo(29, 29); g.fill();
    },
    iChat(g) {
      g.fillStyle = rad(g, 26, 22, 30, [[0, '#a8d4fb'], [1, '#2e7ad8']]);
      g.beginPath(); g.ellipse(32, 28, 26, 21, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(16, 42); g.lineTo(10, 56); g.lineTo(28, 46); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(28, 18, 16, 7, -0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1d4f92'; rr(g, 22, 24, 16, 11, 2); g.fill(); g.beginPath(); g.moveTo(38, 29.5); g.lineTo(45, 25); g.lineTo(45, 34); g.fill();
    },
    'Address Book'(g) {
      g.fillStyle = lin(g, 0, 6, 0, 58, [[0, '#9a6a3d'], [1, '#6a4322']]); rr(g, 10, 6, 44, 52, 3); g.fill();
      g.fillStyle = '#e8dcc4'; g.fillRect(14, 8, 38, 48);
      g.fillStyle = lin(g, 0, 6, 0, 58, [[0, '#8a5a30'], [1, '#5a3618']]); rr(g, 10, 6, 10, 52, 3); g.fill();
      g.fillStyle = '#7a5a3a'; g.font = '700 26px Helvetica, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('@', 35, 33);
    },
    iCal(g) {
      g.fillStyle = '#fff'; rr(g, 8, 6, 48, 52, 3); g.fill();
      g.fillStyle = lin(g, 0, 6, 0, 20, [[0, '#f26b5e'], [1, '#c4231a']]); g.fillRect(8, 6, 48, 15);
      g.fillStyle = '#fff'; g.font = '700 10px Helvetica, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('JUL', 32, 14);
      g.fillStyle = '#222'; g.font = '700 28px Helvetica, Arial'; g.fillText('17', 32, 41);
    },
    Preview(g) {
      g.save(); g.translate(30, 30); g.rotate(-0.12);
      g.fillStyle = '#fff'; g.fillRect(-20, -18, 40, 34); g.fillStyle = lin(g, 0, -15, 0, 12, [[0, '#7cb1e3'], [1, '#d7e8f6']]); g.fillRect(-17, -15, 34, 26);
      g.fillStyle = '#5c8c3a'; g.beginPath(); g.moveTo(-17, 11); g.lineTo(-6, -2); g.lineTo(4, 6); g.lineTo(10, 0); g.lineTo(17, 11); g.fill();
      g.restore();
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 3.5; g.beginPath(); g.arc(40, 38, 10, 0, Math.PI * 2); g.stroke();
      g.fillStyle = 'rgba(200,225,250,0.5)'; g.beginPath(); g.arc(40, 38, 8.5, 0, Math.PI * 2); g.fill();
      g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(47, 45); g.lineTo(56, 55); g.stroke();
    },
    iTunes(g) {
      g.fillStyle = rad(g, 26, 24, 32, [[0, '#ffffff'], [0.6, '#dfe6ee'], [1, '#9fb0c4']]); g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(160,190,230,0.35)'; g.beginPath(); g.arc(32, 32, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c3ccd6'; g.beginPath(); g.arc(32, 32, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = lin(g, 0, 14, 0, 50, [[0, '#4f8fe8'], [1, '#1a4fa8']]);
      g.beginPath(); g.ellipse(25, 44, 6, 4.6, -0.4, 0, Math.PI * 2); g.ellipse(40, 41, 6, 4.6, -0.4, 0, Math.PI * 2); g.fill();
      g.fillRect(29, 18, 3, 26); g.fillRect(44, 15, 3, 26);
      g.beginPath(); g.moveTo(29, 18); g.lineTo(47, 14); g.lineTo(47, 20); g.lineTo(29, 24); g.fill();
    },
    iPhoto(g) {
      g.save(); g.translate(26, 28); g.rotate(-0.2);
      g.fillStyle = '#fff'; g.fillRect(-18, -14, 36, 28); g.fillStyle = lin(g, 0, -12, 0, 10, [[0, '#f4b45a'], [1, '#e86a2c']]); g.fillRect(-15, -11, 30, 20);
      g.fillStyle = '#3f6a2a'; g.beginPath(); g.moveTo(-15, 9); g.lineTo(-4, -2); g.lineTo(15, 9); g.fill();
      g.restore();
      g.fillStyle = lin(g, 0, 30, 0, 58, [[0, '#5a5a5e'], [1, '#222225']]); rr(g, 26, 32, 32, 24, 4); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(42, 44, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = rad(g, 40, 42, 8, [[0, '#7f9cc6'], [1, '#1b2a44']]); g.beginPath(); g.arc(42, 44, 6, 0, Math.PI * 2); g.fill();
    },
    'Time Machine'(g, o = {}) {
      // the green ring with its arrow running backwards round the clock
      g.fillStyle = rad(g, 30, 28, 30, [[0, '#5fd08a'], [0.7, '#1f8a4c'], [1, '#0d5a2e']]);
      g.beginPath(); g.arc(32, 32, 27, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e9f6ee';
      g.beginPath(); g.moveTo(9, 22); g.lineTo(2, 33); g.lineTo(16, 32); g.closePath(); g.fill();
      // the face
      g.fillStyle = rad(g, 28, 26, 22, [[0, '#ffffff'], [1, '#d7dbdf']]);
      g.beginPath(); g.arc(32, 32, 19, 0, Math.PI * 2); g.fill();
      if (o.hole) return;
      g.fillStyle = '#333';
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillRect(32 + 16 * Math.cos(a) - 0.9, 32 + 16 * Math.sin(a) - 0.9, 1.8, 1.8); }
      const sp = o.spin || 0;
      g.strokeStyle = '#1b1b1b'; g.lineCap = 'round';
      g.lineWidth = 2.4; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + 9 * Math.sin(2.1 + sp / 12), 32 - 9 * Math.cos(2.1 + sp / 12)); g.stroke();
      g.lineWidth = 1.8; g.beginPath(); g.moveTo(32, 32); g.lineTo(32 + 13 * Math.sin(-0.5 + sp), 32 - 13 * Math.cos(-0.5 + sp)); g.stroke();
    },
    'System Preferences'(g) {
      g.fillStyle = lin(g, 0, 6, 0, 58, [[0, '#d6d8db'], [1, '#8c9095']]); rr(g, 6, 6, 52, 52, 8); g.fill();
      const gear = (x, y, r, n) => {
        g.fillStyle = lin(g, 0, y - r, 0, y + r, [[0, '#f1f2f3'], [1, '#6f7378']]);
        g.beginPath();
        for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, q = i % 2 ? r * 0.78 : r; g.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); }
        g.closePath(); g.fill();
        g.fillStyle = '#7d8187'; g.beginPath(); g.arc(x, y, r * 0.35, 0, Math.PI * 2); g.fill();
      };
      gear(28, 36, 16, 12); gear(44, 20, 9, 10);
    },
    Downloads(g) { folderIcon(g, 0, 0, 64, { glyph(c) { c.beginPath(); c.moveTo(27, 26); c.lineTo(37, 26); c.lineTo(37, 36); c.lineTo(43, 36); c.lineTo(32, 48); c.lineTo(21, 36); c.lineTo(27, 36); c.closePath(); c.fill(); } }); },
    Documents(g) { folderIcon(g, 0, 0, 64, { glyph(c) { c.fillRect(25, 26, 14, 18); } }); },
    Trash(g) {
      g.strokeStyle = 'rgba(200,210,220,0.95)'; g.fillStyle = 'rgba(210,220,230,0.35)';
      g.beginPath(); g.moveTo(14, 12); g.lineTo(50, 12); g.lineTo(46, 58); g.lineTo(18, 58); g.closePath(); g.fill();
      g.lineWidth = 0.8;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(15 + i * 4.3, 13); g.lineTo(19 + i * 3.3, 57); g.stroke(); }
      for (let j = 0; j < 10; j++) { const y = 15 + j * 4.4, k = (y - 12) / 46; g.beginPath(); g.moveTo(14 + 4 * k, y); g.lineTo(50 - 4 * k, y); g.stroke(); }
      g.lineWidth = 2.2; g.beginPath(); g.ellipse(32, 12, 18, 3, 0, 0, Math.PI * 2); g.stroke();
    },
  };
  function icon(g, name, x, y, s, o) {
    g.save();
    g.translate(x, y);
    g.scale(s / 64, s / 64);
    ICONS[name](g, o);
    g.restore();
  }

  // ---------- Leopard's furniture ----------
  function menubar(g, W, o = {}) {
    g.fillStyle = lin(g, 0, 0, 0, 22, [[0, 'rgba(250,250,250,0.86)'], [1, 'rgba(214,214,214,0.86)']]);
    g.fillRect(0, 0, W, 22);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 22, W, 1);
    D.drawApple(g, 22, 10.5, 16, { color: '#253b6e' });
    g.font = `700 14px ${LUCIDA}`; g.fillStyle = '#000'; g.textBaseline = 'middle'; g.textAlign = 'left';
    let x = 44;
    g.fillText(o.app || 'Finder', x, 11.5);
    x += g.measureText(o.app || 'Finder').width + 20;
    g.font = `400 14px ${LUCIDA}`;
    for (const m of o.items || ['File', 'Edit', 'View', 'Go', 'Window', 'Help']) { g.fillText(m, x, 11.5); x += g.measureText(m).width + 20; }
    // the right: Time Machine, Bluetooth, AirPort, volume, battery, the clock, Spotlight
    g.textAlign = 'right';
    let r = W - 10;
    g.fillStyle = lin(g, 0, 0, 0, 22, [[0, '#4f8fe8'], [1, '#1d58c4']]); g.fillRect(r - 22, 0, 22, 22);
    g.strokeStyle = '#fff'; g.lineWidth = 1.8; g.beginPath(); g.arc(r - 12.5, 9.5, 4.2, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(r - 9.5, 12.5); g.lineTo(r - 5.5, 16.5); g.stroke();
    r -= 32;
    g.fillStyle = '#000'; g.fillText('Thu 9:41 AM', r, 11.5);
    r -= g.measureText('Thu 9:41 AM').width + 14;
    g.strokeStyle = '#111'; g.lineWidth = 1; g.strokeRect(r - 26.5, 6.5, 22, 10); g.fillStyle = '#111'; g.fillRect(r - 4, 9, 2, 5); g.fillRect(r - 24.5, 8.5, 15, 6);
    r -= 40;
    g.beginPath(); g.moveTo(r - 14, 9); g.lineTo(r - 10, 9); g.lineTo(r - 5, 4.5); g.lineTo(r - 5, 18.5); g.lineTo(r - 10, 14); g.lineTo(r - 14, 14); g.closePath(); g.fill();
    g.lineWidth = 1.2; g.beginPath(); g.arc(r - 4, 11.5, 4, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(r - 4, 11.5, 7, -0.9, 0.9); g.stroke();
    r -= 32;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(r - 9, 17, 3 + i * 3.2, -Math.PI * 0.78, -Math.PI * 0.22); g.lineWidth = 1.6; g.stroke(); }
    r -= 28;
    g.lineWidth = 1.3; g.beginPath(); g.moveTo(r - 13, 7); g.lineTo(r - 5, 15); g.lineTo(r - 9, 19); g.lineTo(r - 9, 3); g.lineTo(r - 5, 7); g.lineTo(r - 13, 15); g.stroke();
    r -= 30;
    // Time Machine in the menu bar
    g.lineWidth = 1.4; g.beginPath(); g.arc(r - 10, 11.5, 6.5, -2.4, 2.9); g.stroke();
    g.beginPath(); g.moveTo(r - 17.5, 6.5); g.lineTo(r - 16.5, 11); g.lineTo(r - 12.5, 9); g.fill();
    g.beginPath(); g.moveTo(r - 10, 11.5); g.lineTo(r - 10, 7.5); g.moveTo(r - 10, 11.5); g.lineTo(r - 7, 13); g.stroke();
  }
  const DOCK = ['Finder', 'Dashboard', 'Mail', 'Safari', 'iChat', 'Address Book', 'iCal', 'Preview', 'iTunes', 'iPhoto', 'Time Machine', 'System Preferences', '|', 'Downloads', 'Documents', 'Trash'];
  const RUNNING = { Finder: 1, Safari: 1, Mail: 1, iTunes: 1 };
  const DOCK_S = 52, DOCK_GAP = 6;
  function dockLayout(W, H) {
    const n = DOCK.length;
    let w = 0;
    DOCK.forEach((d) => (w += d === '|' ? 18 : DOCK_S + DOCK_GAP));
    const x0 = (W - w) / 2, y0 = H - 16 - DOCK_S;
    const pos = {};
    let x = x0;
    DOCK.forEach((d) => {
      if (d === '|') { pos[d] = x + 9; x += 18; return; }
      pos[d] = x + DOCK_GAP / 2;
      x += DOCK_S + DOCK_GAP;
    });
    return { x0, x1: x0 + w, y0, pos, n };
  }
  function dock(g, W, H, o = {}) {
    const L = dockLayout(W, H);
    // the glass shelf, seen from above in perspective
    const fy = H - 4, by = H - 34, inset = 30;
    g.fillStyle = lin(g, 0, by, 0, fy, [[0, 'rgba(225,230,240,0.32)'], [0.5, 'rgba(160,170,190,0.38)'], [1, 'rgba(90,100,120,0.55)']]);
    g.beginPath(); g.moveTo(L.x0 - 18 + inset, by); g.lineTo(L.x1 + 18 - inset, by); g.lineTo(L.x1 + 18, fy); g.lineTo(L.x0 - 18, fy); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L.x0 - 18 + inset, by + 0.5); g.lineTo(L.x1 + 18 - inset, by + 0.5); g.stroke();
    g.fillStyle = lin(g, 0, fy, 0, H, [[0, 'rgba(240,244,250,0.95)'], [1, 'rgba(150,160,180,0.9)']]);
    g.fillRect(L.x0 - 18, fy, L.x1 - L.x0 + 36, H - fy);
    // reflections of the icons in the shelf
    for (const d of DOCK) {
      if (d === '|') continue;
      g.save();
      g.globalAlpha = 0.22;
      g.translate(L.pos[d], L.y0 + 2 * DOCK_S + 2);
      g.scale(1, -0.45);
      icon(g, d, 0, 0, DOCK_S, d === 'Time Machine' ? o.tm : undefined);
      g.restore();
    }
    for (const d of DOCK) {
      if (d === '|') {
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(L.pos[d], by + 3); g.lineTo(L.pos[d] - 4, fy - 1); g.stroke();
        continue;
      }
      const bounce = d === 'Time Machine' ? (o.bounce || 0) : 0;
      icon(g, d, L.pos[d], L.y0 - bounce, DOCK_S, d === 'Time Machine' ? o.tm : undefined);
      if (d === 'Time Machine' && o.press) { g.fillStyle = `rgba(0,0,0,${0.35 * o.press})`; g.beginPath(); g.arc(L.pos[d] + DOCK_S / 2, L.y0 + DOCK_S / 2, DOCK_S * 0.42, 0, Math.PI * 2); g.fill(); }
      // the light under a running application
      if (RUNNING[d] || (d === 'Time Machine' && o.running)) {
        g.fillStyle = rad(g, L.pos[d] + DOCK_S / 2, fy - 3, 7, [[0, 'rgba(220,240,255,1)'], [0.4, 'rgba(120,190,255,0.8)'], [1, 'rgba(80,160,255,0)']]);
        g.fillRect(L.pos[d] + DOCK_S / 2 - 8, fy - 9, 16, 12);
      }
    }
  }
  // a Leopard Finder window, at full size (w × h), drawn at x, y
  const SIDEBAR = [['DEVICES', ['Macintosh HD', 'Remote Disc']], ['PLACES', ['Desktop', 'swair', 'Applications', 'Documents']], ['SEARCH FOR', ['Today', 'Yesterday', 'Past Week']]];
  function finderWindow(g, x, y, w, h, o = {}) {
    g.save();
    g.translate(x, y);
    // the drop shadow
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
    g.fillStyle = '#fff'; rr(g, 0, 0, w, h, 5); g.fill();
    g.shadowColor = 'transparent';
    g.save(); rr(g, 0, 0, w, h, 5); g.clip();
    // the unified title bar and toolbar
    g.fillStyle = lin(g, 0, 0, 0, 58, [[0, '#e6e6e6'], [1, '#a6a6a6']]); g.fillRect(0, 0, w, 58);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, 0, w, 1);
    g.fillStyle = 'rgba(60,60,60,0.6)'; g.fillRect(0, 57, w, 1);
    // the traffic lights
    [['#ff5f57', '#c9302c'], ['#ffbd2e', '#d48f12'], ['#28c840', '#1a8d2b']].forEach(([a, b], i) => {
      g.fillStyle = rad(g, 13 + i * 21, 9, 8, [[0, a], [1, b]]); g.beginPath(); g.arc(14 + i * 21, 11, 6.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(14 + i * 21, 8.5, 3.6, 2.2, 0, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = '#222'; g.font = `400 13px ${LUCIDA}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(o.title || 'Macintosh HD', w / 2 + 8, 11.5);
    g.fillStyle = '#b8bcc2'; rr(g, w / 2 - g.measureText(o.title || 'Macintosh HD').width / 2 - 14, 5, 14, 13, 2); g.fill();
    // back/forward, the view buttons, the action menu, Spotlight
    const btn = (bx, bw) => { g.fillStyle = lin(g, 0, 26, 0, 49, [[0, '#fbfbfb'], [1, '#cfcfcf']]); rr(g, bx, 27, bw, 22, 4); g.fill(); g.strokeStyle = '#7c7c7c'; g.lineWidth = 1; rr(g, bx + 0.5, 27.5, bw - 1, 21, 4); g.stroke(); };
    btn(10, 52); g.fillStyle = '#444'; g.beginPath(); g.moveTo(20, 38); g.lineTo(28, 33); g.lineTo(28, 43); g.fill(); g.beginPath(); g.moveTo(52, 38); g.lineTo(44, 33); g.lineTo(44, 43); g.fill();
    g.fillStyle = '#7c7c7c'; g.fillRect(36, 28, 1, 20);
    btn(72, 96);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#555'; if (i) g.fillRect(72 + i * 24, 28, 1, 20); }
    g.fillStyle = '#555'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillRect(79 + i * 6, 32 + j * 6, 4, 4);
    for (let j = 0; j < 4; j++) g.fillRect(103, 32 + j * 3.5, 11, 1.5);
    for (let j = 0; j < 3; j++) g.fillRect(127 + j * 5, 33, 3, 10);
    g.fillRect(150, 32, 12, 7); g.fillRect(150, 41, 12, 3);
    btn(178, 38);
    g.fillStyle = '#666'; g.beginPath(); g.arc(192, 38, 5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(203, 36); g.lineTo(209, 36); g.lineTo(206, 40); g.fill();
    g.fillStyle = '#fff'; rr(g, w - 170, 28, 158, 21, 10.5); g.fill(); g.strokeStyle = '#8a8a8a'; rr(g, w - 169.5, 28.5, 157, 20, 10); g.stroke();
    g.strokeStyle = '#777'; g.lineWidth = 1.4; g.beginPath(); g.arc(w - 155, 37.5, 4, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(w - 152, 40.5); g.lineTo(w - 148, 44.5); g.stroke();
    // the sidebar
    const sb = 160;
    g.fillStyle = '#d6dde5'; g.fillRect(0, 58, sb, h - 58);
    g.fillStyle = '#9aa5b1'; g.fillRect(sb, 58, 1, h - 58);
    let sy = 76;
    for (const [head, items] of SIDEBAR) {
      g.fillStyle = '#6e7b8b'; g.font = `700 11px ${LUCIDA}`; g.textAlign = 'left'; g.fillText(head, 10, sy); sy += 20;
      for (const it of items) {
        if (it === 'Macintosh HD') { g.fillStyle = lin(g, 0, sy - 10, 0, sy + 10, [[0, '#6f98d5'], [1, '#3a6cb8']]); g.fillRect(0, sy - 10, sb, 20); }
        g.fillStyle = it === 'Macintosh HD' ? '#fff' : '#111'; g.font = `${it === 'Macintosh HD' ? 700 : 400} 12px ${LUCIDA}`;
        if (/Today|Yesterday|Week/.test(it)) { g.strokeStyle = '#6e7b8b'; g.lineWidth = 1; g.beginPath(); g.arc(26, sy, 5, 0, Math.PI * 2); g.stroke(); }
        else folderIcon(g, 18, sy - 9, 18);
        g.fillText(it, 42, sy + 1); sy += 20;
      }
      sy += 8;
    }
    // the content: folders on white
    const cx0 = sb + 1, cw = w - sb - 1;
    g.fillStyle = '#fff'; g.fillRect(cx0, 58, cw, h - 58 - 22);
    if (!o.hole) {
      const names = o.items || ['Applications', 'Developer', 'Library', 'System', 'Users', 'Documents'];
      names.forEach((n, i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const ix = cx0 + 30 + col * ((cw - 60) / 4), iy = 76 + row * 108;
        folderIcon(g, ix + 8, iy, 64);
        g.fillStyle = '#111'; g.font = `400 12px ${LUCIDA}`; g.textAlign = 'center'; g.fillText(n, ix + 40, iy + 80);
      });
    }
    // the status bar
    g.fillStyle = lin(g, 0, h - 22, 0, h, [[0, '#d2d2d2'], [1, '#aaaaaa']]); g.fillRect(0, h - 22, w, 22);
    g.fillStyle = '#333'; g.font = `400 11px ${LUCIDA}`; g.textAlign = 'center'; g.fillText(o.status || '6 items, 52.3 GB available', w / 2 + sb / 2, h - 10.5);
    g.restore();
    g.restore();
    return { content: [x + cx0, y + 58, cw, h - 58 - 22] };
  }

  // ---------- the desktop at rest, painted once ----------
  let deskCache = null;
  function desktop() {
    if (deskCache) return deskCache;
    deskCache = offscreen(SW, SH, (g, W, H) => {
      aurora(g, W, H);
      // the hard disk on the desktop, top right
      g.fillStyle = lin(g, 0, 40, 0, 74, [[0, '#e9eaec'], [1, '#9ea2a8']]); rr(g, W - 84, 44, 56, 30, 4); g.fill();
      g.fillStyle = '#5c6066'; g.fillRect(W - 76, 64, 26, 3);
      g.fillStyle = '#7cf07c'; g.beginPath(); g.arc(W - 38, 65.5, 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = `700 12px ${LUCIDA}`; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 3;
      g.fillText('Macintosh HD', W - 56, 92);
      g.shadowColor = 'transparent';
      finderWindow(g, 120, 86, 640, 420, {});
      menubar(g, W);
    });
    return deskCache;
  }
  function desktopScreen(g, s) {
    const tm = s.tm || {};
    if (!(tm.open > 0)) {
      g.drawImage(desktop(), 0, 0);
      dock(g, s.W, s.H, { tm: { spin: 0 }, bounce: tm.bounce || 0, press: tm.press || 0, running: tm.press > 0 });
      return;
    }
    timeMachine(g, s, tm);
  }

  // ---------- Time Machine, run forwards ----------
  // the front window's place; its content is the portal
  const FW = { x: 300, y: 150, w: 680, h: 460 };
  const VP = [640, 132]; // where the stack recedes to
  const YEARS = [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016];
  const DATES = ['Today (Now)', 'September 2009', 'October 2010', 'October 2011', 'October 2012', 'October 2013', 'October 2014', 'October 2015', 'September 16, 2016'];
  let spaceCache = null, winCache = null;
  function space() {
    if (spaceCache) return spaceCache;
    spaceCache = offscreen(SW, SH, (g, W, H) => {
      g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#060814'], [0.5, '#0b0c22'], [1, '#03040a']]);
      g.fillRect(0, 0, W, H);
      // the galaxy behind the stack: a bright core, a tilted disc and dust lanes
      g.save();
      g.translate(VP[0], VP[1] + 20);
      g.rotate(-0.18);
      g.scale(1, 0.32);
      g.globalCompositeOperation = 'lighter';
      g.filter = 'blur(18px)';
      g.fillStyle = rad(g, 0, 0, 520, [[0, 'rgba(255,240,220,0.85)'], [0.08, 'rgba(250,200,230,0.6)'], [0.3, 'rgba(160,110,220,0.32)'], [0.65, 'rgba(70,80,200,0.16)'], [1, 'rgba(20,20,60,0)']]);
      g.beginPath(); g.arc(0, 0, 520, 0, Math.PI * 2); g.fill();
      g.filter = 'blur(4px)';
      const R = rng(11);
      for (let i = 0; i < 900; i++) {
        const a = R() * Math.PI * 2, r = Math.pow(R(), 0.7) * 480;
        const sp = a + r / 140;
        g.fillStyle = `rgba(${200 + R() * 55},${170 + R() * 70},255,${0.08 + R() * 0.2})`;
        g.fillRect(r * Math.cos(sp), r * Math.sin(sp), 3, 3);
      }
      g.filter = 'blur(10px)';
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgba(20,10,30,0.45)'; g.lineWidth = 26;
      g.beginPath(); g.ellipse(0, 18, 300, 60, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      g.restore();
      // the ground: the dark floor the stack stands on, fading up
      g.fillStyle = lin(g, 0, H * 0.62, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.8)']]);
      g.fillRect(0, H * 0.62, W, H * 0.38);
    });
    return spaceCache;
  }
  function windowImage() {
    if (winCache) return winCache;
    winCache = offscreen(FW.w + 60, FW.h + 60, (g) => finderWindow(g, 30, 20, FW.w, FW.h, { title: 'Documents', items: ['Letters', 'Keynote', 'Photos', 'Projects', 'Receipts', 'Music', 'Travel', 'Archive'], status: '8 items, 41.7 GB available' }));
    return winCache;
  }
  const STARS = (() => { const R = rng(23); return Array.from({ length: 360 }, () => ({ a: R() * Math.PI * 2, r: 20 + R() * 900, b: 0.3 + R() * 0.7 })); })();
  function timeMachine(g, s, tm) {
    const W = s.W, H = s.H;
    const p = tm.p || 0; // how far forward, in windows
    g.drawImage(space(), 0, 0);
    // the stars rush out from the vanishing point as you go forward
    const speed = tm.speed || 0;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const st of STARS) {
      const rr0 = ((st.r + p * 240 * (0.5 + st.b)) % 900) + 10;
      const x = VP[0] + rr0 * Math.cos(st.a), y = VP[1] + rr0 * Math.sin(st.a) * 0.75;
      const len = Math.min(60, speed * rr0 * 0.09);
      g.strokeStyle = `rgba(220,230,255,${st.b * 0.8})`;
      g.lineWidth = rr0 > 400 ? 1.6 : 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * Math.cos(st.a), y + len * Math.sin(st.a) * 0.75); g.stroke();
      if (len < 1) { g.fillStyle = `rgba(230,235,255,${st.b * 0.7})`; g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }
    }
    g.restore();
    // the stack of windows: window k stands k − p back; nearer ones are drawn last
    const img = windowImage();
    const place = (d) => {
      const sc = 1 / (1 + 0.42 * d);
      const cx = VP[0] + (FW.x + FW.w / 2 - VP[0]) * sc, cy = VP[1] + (FW.y + FW.h / 2 - VP[1]) * sc;
      return { sc, cx, cy };
    };
    for (let k = YEARS.length - 1; k >= 0; k--) {
      const d = k - p;
      if (d > 9 || d < -1.2) continue;
      const { sc, cx, cy } = place(d);
      const a = d < 0 ? clamp(1 + d * 1.6, 0, 1) : clamp(1.15 - d * 0.1, 0.25, 1);
      if (a <= 0) continue;
      g.save();
      g.globalAlpha = a;
      const w = (FW.w + 60) * sc, h = (FW.h + 60) * sc;
      g.drawImage(img, cx - (FW.w / 2 + 30) * sc, cy - (FW.h / 2 + 20) * sc, w, h);
      // the haze over windows further back
      if (d > 0.05) { g.fillStyle = `rgba(30,35,70,${clamp(d * 0.07, 0, 0.5)})`; rr(g, cx - FW.w / 2 * sc, cy - FW.h / 2 * sc, FW.w * sc, FW.h * sc, 5 * sc); g.fill(); }
      g.restore();
      if (k === YEARS.length - 1) {
        // the last window holds the Apple Watch: its content is the portal
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.globalAlpha = a;
        g.fillRect(cx - (FW.w / 2 - 161) * sc, cy - (FW.h / 2 - 58) * sc, (FW.w - 161) * sc, (FW.h - 80) * sc);
        g.restore();
      }
    }
    // the timeline down the right
    const tlx = W - 54;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(tlx - 30, 40, 74, H - 160);
    for (let i = 0; i < 46; i++) { const y = 60 + i * ((H - 210) / 45); g.fillStyle = 'rgba(200,210,235,0.5)'; g.fillRect(tlx - 6, y, i % 5 ? 12 : 20, 1.4); }
    g.font = `700 12px ${LUCIDA}`; g.textAlign = 'right'; g.textBaseline = 'middle';
    YEARS.forEach((yr, k) => {
      const y = H - 150 - k * ((H - 210) / (YEARS.length - 1));
      const on = Math.abs(k - p) < 0.5;
      g.fillStyle = on ? '#ffffff' : 'rgba(190,200,225,0.75)';
      if (on) { g.fillStyle = 'rgba(80,130,230,0.9)'; rr(g, tlx - 26, y - 9, 62, 18, 9); g.fill(); g.fillStyle = '#fff'; }
      g.fillText(k === 0 ? 'Today' : String(yr), tlx + 30, y);
    });
    // the bar along the foot: Cancel, the date of the front window, Restore
    g.fillStyle = lin(g, 0, H - 64, 0, H, [[0, 'rgba(40,42,52,0.92)'], [1, 'rgba(10,10,14,0.98)']]);
    g.fillRect(0, H - 64, W, 64);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, H - 64, W, 1);
    const pill = (x, w, label) => {
      g.fillStyle = lin(g, 0, H - 46, 0, H - 18, [[0, '#6b6f7a'], [1, '#2a2c33']]); rr(g, x, H - 46, w, 28, 14); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; rr(g, x + 0.5, H - 45.5, w - 1, 27, 13.5); g.stroke();
      g.fillStyle = '#fff'; g.font = `400 13px ${LUCIDA}`; g.textAlign = 'center'; g.fillText(label, x + w / 2, H - 31.5);
    };
    pill(40, 110, 'Cancel');
    pill(W - 150, 110, 'Restore');
    const k = clamp(Math.round(p), 0, DATES.length - 1);
    g.fillStyle = '#fff'; g.font = `400 14px ${LUCIDA}`; g.textAlign = 'center';
    g.fillText(DATES[k], W / 2, H - 31.5);
    // the arrows beside the stack: back in time (up) and forward (down), forward lit
    for (const [dy, on] of [[-1, 0], [1, 1]]) {
      const ax = FW.x + FW.w + 46, ay = FW.y + FW.h - 70 + dy * 34;
      g.fillStyle = on ? rad(g, ax, ay, 26, [[0, '#9fc2ff'], [1, '#2a5fc8']]) : 'rgba(120,130,160,0.55)';
      g.beginPath(); g.arc(ax, ay, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(ax - 10, ay - dy * 5); g.lineTo(ax + 10, ay - dy * 5); g.lineTo(ax, ay + dy * 8); g.closePath(); g.fill();
    }
    // the desktop dropping away as Time Machine opens
    if (tm.open < 1) {
      g.save();
      const k2 = easeInOut(tm.open);
      g.globalAlpha = 1 - smooth(0.6, 1, tm.open);
      g.translate(W / 2, H * 0.3);
      g.scale(1 - 0.35 * k2, 1 - 0.35 * k2);
      g.translate(-W / 2, -H * 0.3 + k2 * H * 0.9);
      g.drawImage(desktop(), 0, 0);
      dock(g, W, H, { running: 1 });
      g.restore();
    }
    // at the end, everything clears outward from the window until the picture is all there is
    if (tm.clear > 0 && tm.frame) {
      const [fx, fy, fw, fh] = tm.frame;
      const c0 = [FW.x + 161, FW.y + 58, FW.w - 161, FW.h - 80];
      const kc = tm.clear;
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.fillRect(lerp(c0[0], fx, kc), lerp(c0[1], fy, kc), lerp(c0[2], fw, kc), lerp(c0[3], fh, kc));
      g.restore();
    }
  }

  // ---------- the interoffice envelope's printing ----------
  const ENV_W = 384, ENV_D = 286; // 15 × 11¼ inches
  function envelopePrint(g, w, h, o = {}) {
    // kraft paper: a warm brown with fibres and a little mottling
    g.fillStyle = '#c69c62';
    g.fillRect(0, 0, w, h);
    const R = rng(5);
    for (let i = 0; i < 2200; i++) {
      g.strokeStyle = `rgba(${R() < 0.5 ? '90,60,25' : '235,210,170'},${0.05 + R() * 0.08})`;
      g.lineWidth = 0.6 + R();
      const x = R() * w, y = R() * h, a = R() * Math.PI, l = 4 + R() * 14;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke();
    }
    if (!o.front) return;
    // the printed form: INTEROFFICE MAIL across the top, then a ruled table of names
    const ink = '#3d2a17';
    g.fillStyle = ink;
    g.font = `700 ${h * 0.035}px "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('INTEROFFICE MAIL', w / 2, h * 0.05);
    g.font = `400 ${h * 0.017}px "Helvetica Neue", Arial, sans-serif`;
    g.fillText('DO NOT SEAL — CROSS OUT PREVIOUS NAME — USE NEXT SPACE', w / 2, h * 0.085);
    const x0 = w * 0.06, x1 = w * 0.94, xm = w * 0.62, top = h * 0.11, rows = 18, rh = (h * 0.86) / rows;
    g.strokeStyle = ink; g.lineWidth = Math.max(1, w * 0.002);
    g.strokeRect(x0, top, x1 - x0, rows * rh);
    g.beginPath(); g.moveTo(xm, top); g.lineTo(xm, top + rows * rh); g.stroke();
    g.font = `700 ${rh * 0.38}px "Helvetica Neue", Arial, sans-serif`;
    g.fillText('NAME', (x0 + xm) / 2, top + rh * 0.5);
    g.fillText('DEPARTMENT', (xm + x1) / 2, top + rh * 0.5);
    for (let r = 1; r <= rows; r++) { g.beginPath(); g.moveTo(x0, top + r * rh); g.lineTo(x1, top + r * rh); g.stroke(); }
    // names written in, each crossed out but the last
    const names = [['T. Mueller', 'Engineering'], ['J. Ive', 'Industrial Design'], ['B. Tribble', 'Software'], ['K. Ruiz', 'Product Mktg'], ['G. Joswiak', 'Product Mktg'], ['S. Forstall', 'Mac OS X'], ['P. Schiller', 'Marketing'], ['Steve', 'Keynote — Moscone West']];
    g.textAlign = 'left';
    names.forEach(([n, d], i) => {
      const y = top + (i + 1.55) * rh;
      g.fillStyle = i % 3 === 0 ? '#1d2b6b' : '#222';
      g.font = `400 ${rh * 0.55}px "Bradley Hand", "Noteworthy", "Marker Felt", cursive`;
      g.save(); g.translate(x0 + 14 + (i % 3) * 6, y); g.rotate(-0.02 + (i % 4) * 0.012); g.fillText(n, 0, 0); g.restore();
      g.save(); g.translate(xm + 12, y); g.rotate(0.01 - (i % 3) * 0.01); g.fillText(d, 0, 0); g.restore();
      if (i < names.length - 1) {
        g.strokeStyle = g.fillStyle; g.lineWidth = rh * 0.06;
        g.beginPath(); g.moveTo(x0 + 8, y + 2); g.lineTo(x1 - 14 - (i % 2) * 40, y - 4); g.stroke();
      }
    });
  }

  // the laptop's lid angle at rest, from the deck
  const REST_ANGLE = 108;

  Real.add({
    name: 'MacBook Air',
    era: 'aqua',
    year: '2008',
    kind: 'Notebook',
    line: 'Pulled out of an interoffice envelope on stage. 0.76 inches at its thickest point.',
    verb: 'Open Time Machine, and go forward',
    view: { yaw: 27, pitch: 22, lens: 85, fill: 0.92 },
    set: { paper: '#dcdbd7', keyDir: [-0.45, 0.85, 0.5] },
    next: { type: 'screen', egg: 'clock' },
    make(M) {
      const alu = Mat.alu('#d3d5d8', { rough: 0.3 });
      const aluDark = Mat.alu('#c4c6c9', { rough: 0.36 });
      const BW = 325, BD = 227, HF = 2.8, HB = 13.8;
      const slope = Math.atan((HB - HF) / BD);
      const H = (z) => HF + (HB - HF) * (BD / 2 - z) / BD;

      // ---- the envelope: two sheets of kraft paper, the front one printed and punched ----
      M.part('envelope');
      const env = M.group({ pos: [-34, 0, -26], rot: [0, -7, 0] });
      M.state.env = env;
      const holes = [];
      for (const hx of [-0.36, 0.36]) for (const hz of [-0.34, -0.11, 0.12, 0.35]) holes.push([hx * ENV_W, hz * ENV_D]);
      const holeR = 11;
      const sheetTex = (front) => Mat.canvasTexture((g, w, h) => {
        envelopePrint(g, w, h, { front });
        // punched holes: transparent
        g.globalCompositeOperation = 'destination-out';
        for (const [hx, hz] of holes) { g.beginPath(); g.arc((hx / ENV_W + 0.5) * w, (hz / ENV_D + 0.5) * h, (holeR / ENV_W) * w, 0, Math.PI * 2); g.fill(); }
        g.globalCompositeOperation = 'source-over';
      }, 1536, Math.round(1536 * ENV_D / ENV_W));
      const paperMat = (tex) => Mat.micro(new T.MeshPhysicalMaterial({ map: tex, roughness: 0.88, metalness: 0, alphaTest: 0.5, side: T.DoubleSide, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new T.Color('#fff2dc') }), { size: 0.6, bump: 0.25, rough: 0.1 });
      // the back sheet, flat on the table (the same paper, unprinted)
      const backG = new T.PlaneGeometry(ENV_W, ENV_D, 1, 1);
      backG.rotateX(-Math.PI / 2);
      M.mesh(backG, paperMat(sheetTex(false)), { to: env, pos: [0, 0.25, 0], cast: false });
      // the front sheet: a fine grid, so it can swell over the laptop while the laptop is inside
      const frontG = new T.PlaneGeometry(ENV_W, ENV_D, 64, 48);
      frontG.rotateX(-Math.PI / 2);
      frontG.userData.flat = Float32Array.from(frontG.attributes.position.array);
      const frontMesh = M.mesh(frontG, paperMat(sheetTex(true)), { to: env, pos: [0, 0.75, 0] });
      M.state.envFront = frontMesh;
      // the edges: a folded hem down the long sides and the closed end
      const hem = Mat.micro(new T.MeshPhysicalMaterial({ color: new T.Color('#b88d55'), roughness: 0.9 }), { size: 0.6, bump: 0.2, rough: 0.1 });
      M.mesh(G.rbox(ENV_W, 0.9, 2.2, 0.4, 2), hem, { to: env, pos: [0, 0.5, -ENV_D / 2 + 1.1] });
      M.mesh(G.rbox(ENV_W, 0.9, 2.2, 0.4, 2), hem, { to: env, pos: [0, 0.5, ENV_D / 2 - 1.1] });
      M.mesh(G.rbox(2.2, 0.9, ENV_D, 0.4, 2), hem, { to: env, pos: [-ENV_W / 2 + 1.1, 0.5, 0] });
      // the flap at the open end, folded back and lying flat, with the string-and-button closure
      const flapShape = new T.Shape();
      flapShape.moveTo(0, -ENV_D / 2 + 4); flapShape.lineTo(52, -ENV_D / 2 + 16); flapShape.lineTo(58, -ENV_D / 2 + 30); flapShape.lineTo(58, ENV_D / 2 - 30); flapShape.lineTo(52, ENV_D / 2 - 16); flapShape.lineTo(0, ENV_D / 2 - 4); flapShape.closePath();
      const flapG = new T.ShapeGeometry(flapShape, 4);
      flapG.rotateX(Math.PI / 2);
      const flapTex = Mat.canvasTexture((g, w, h) => envelopePrint(g, w, h, {}), 256, 512);
      M.mesh(flapG, Mat.micro(new T.MeshPhysicalMaterial({ map: flapTex, roughness: 0.9, side: T.DoubleSide }), { size: 0.6, bump: 0.25, rough: 0.1 }), { to: env, pos: [ENV_W / 2, 0.3, 0], cast: false });
      const disc = (x, z) => {
        M.mesh(G.cyl(9, 0.9, 0.3, 32), Mat.plastic('#8a2f22', { rough: 0.75 }), { to: env, pos: [x, 0.4, z] });
        M.mesh(G.cyl(1.6, 1.5, 0.3, 12), Mat.plastic('#6a221a', { rough: 0.6 }), { to: env, pos: [x, 0.9, z] });
      };
      disc(ENV_W / 2 + 30, -20);
      disc(ENV_W / 2 - 22, -20);
      // the red string: wound round the flap's button, then trailing loose across the paper
      const str = Mat.rubber('#8f2a1f');
      const wind = [];
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 4; wind.push([ENV_W / 2 + 30 + 7.2 * Math.cos(a), 1.8 + i * 0.012, -20 + 7.2 * Math.sin(a)]); }
      M.mesh(G.tube(wind, 0.55, { seg: 160, radial: 6 }), str, { to: env });
      M.mesh(G.tube([[ENV_W / 2 + 37, 1.9, -20], [ENV_W / 2 + 46, 1.0, -2], [ENV_W / 2 + 52, 0.6, 26], [ENV_W / 2 + 40, 0.6, 58], [ENV_W / 2 + 18, 0.6, 72]], 0.55, { seg: 120, radial: 6 }), str, { to: env });
      M.state.envHoles = holes;

      // ---- the laptop ----
      M.part('laptop');
      const lap = M.group({ pos: [0, 1.1, 0] });
      M.state.laptop = lap;
      M.state.lapHome = { pos: new T.Vector3(18, 1.9, 22), yaw: 4 };
      lap.position.copy(M.state.lapHome.pos);
      lap.rotation.y = (M.state.lapHome.yaw * Math.PI) / 180;
      // the base: a tub, rounded under so steeply the edges read as a blade, wedged front to back.
      // Lofted in unit height, then each vertex lifted to the wedge's height where it stands.
      const secs = [];
      const IB = 15, RP = 12;
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * (Math.PI / 2);
        const ins = IB * (1 - Math.sin(a));
        secs.push({ w: BW - 2 * ins, d: BD - 2 * ins, r: Math.max(2, RP - ins * 0.55), y: 0.86 * (1 - Math.cos(a)) });
      }
      for (let i = 1; i <= 4; i++) {
        const a = (i / 4) * (Math.PI / 2);
        const ins = 0.9 * (1 - Math.cos(a));
        secs.push({ w: BW - 2 * ins, d: BD - 2 * ins, r: RP - ins, y: 0.86 + 0.14 * Math.sin(a) });
      }
      const base = G.loftRR(secs, { seg: 10, capEnd: false });
      {
        const p = base.attributes.position;
        for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * H(p.getZ(i)));
        base.computeVertexNormals();
      }
      M.mesh(base, alu, { to: lap });
      // the deck: the top case, a plate in the tilted plane, cut through for every key
      const deck = M.group({ to: lap, pos: [0, H(0), 0], rot: [(slope * 180) / Math.PI, 0, 0] });
      const DW = BW - 1.8, DD = BD / Math.cos(slope) - 1.8;
      const KP = 18.6, KG = 2.9;
      const ROWS = [
        [[1, 'esc'], 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', [1, '⏏']],
        [[1, '§'], [1, '1', { l2: '!' }], [1, '2', { l2: '@' }], [1, '3', { l2: '#' }], [1, '4', { l2: '$' }], [1, '5', { l2: '%' }], [1, '6', { l2: '^' }], [1, '7', { l2: '&' }], [1, '8', { l2: '*' }], [1, '9', { l2: '(' }], [1, '0', { l2: ')' }], [1, '-', { l2: '_' }], [1, '=', { l2: '+' }], [1.5, 'delete', { align: 'br' }]],
        [[1.5, 'tab', { align: 'bl' }], 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', [1, '[', { l2: '{' }], [1, ']', { l2: '}' }], [1, '\\', { l2: '|' }]],
        [[1.75, 'caps lock', { align: 'bl' }], 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', [1, ';', { l2: ':' }], [1, "'", { l2: '"' }], [1.75, 'return', { align: 'br' }]],
        [[2.25, 'shift', { align: 'bl' }], 'z', 'x', 'c', 'v', 'b', 'n', 'm', [1, ',', { l2: '<' }], [1, '.', { l2: '>' }], [1, '/', { l2: '?' }], [2.25, 'shift', { align: 'br' }]],
        [[1, 'fn', { align: 'bl' }], [1, 'control', { align: 'bl', size: 1.25 }], [1, 'option', { align: 'bl', size: 1.25, l2: 'alt' }], [1.25, 'command', { align: 'bl', size: 1.25, l2: '⌘' }], [5, ''], [1.25, 'command', { align: 'bl', size: 1.25, l2: '⌘' }], [1, 'option', { align: 'bl', size: 1.25, l2: 'alt' }], [1, '◀'], [1, '▲▼', { size: 1.4 }], [1, '▶']],
      ];
      // normalise the legends: letters centred; two-legend keys stacked; words at the outer corner (on
      // the right-hand keys, delete, return and shift, at the bottom right as on the real keyboard)
      const rows = ROWS.map((row) => row.map((k) => {
        if (typeof k === 'string') return { w: 1, l: k, align: 'c', size: k.length > 1 ? 1.8 : 3.3 };
        const [w, l, o = {}] = k;
        return { w, l, ...o, align: o.l2 ? 'tc' : o.align || 'c', size: o.size ? o.size * 1.25 : (l.length > 2 ? 1.75 : 2.5) };
      }));
      const kb = D.keyboard(rows, {
        color: '#121213', ink: '#f2f2f4', pitch: KP, gap: KG, font: '"Arial Rounded MT Bold", "VAG Rounded", "Helvetica Neue", sans-serif', weight: 400,
        cap: { h: 1.25, inset: 0.35, r: 1.6, topR: 1.7, fillet: 0.4 }, flat: true, rough: 0.48, legendInset: 0.9,
      });
      const KW = kb.userData.w, KD = kb.userData.d;
      const kbz = -DD / 2 + 12 + KD / 2;
      kb.position.set(0, -0.35, kbz);
      M.add(kb, deck);
      // the trackpad and its button, set a hair below the deck in fine dark gaps
      const TPW = 104, TPD = 58, TBD = 13;
      const tpz = DD / 2 - 21 - TBD - 2 - TPD / 2;
      const padZ = tpz + (TBD + 2) / 2, padD = TPD + TBD + 2;
      // the deck plate, with a hole for each key and one for the trackpad
      const deckShape = G.rrect(DW, DD, RP - 0.9);
      for (const k of kb.userData.keys) {
        const w = k.w * KP - KG + 0.7, d = KP - KG + 0.7;
        deckShape.holes.push(G.rrectHole(w, d, 2, k.x, -(k.z + kbz)));
      }
      deckShape.holes.push(G.rrectHole(TPW + 1.0, padD + 1.0, 3.5, 0, -padZ));
      const deckG = G.extrude(deckShape, 0.6, 0.12, { curveSeg: 4, bevelSeg: 2 });
      deckG.rotateX(-Math.PI / 2);
      M.mesh(deckG, alu, { to: deck, pos: [0, -0.6, 0] });
      // under the keys: the black keyboard tray
      M.mesh(G.plate(KW + 2, KD + 2, 0.4, 2, 0.1), Mat.plastic('#0b0b0c', { rough: 0.7 }), { to: deck, pos: [0, -1.2, kbz], rot: [-90, 0, 0], cast: false });
      M.mesh(G.plate(TPW + 1.2, padD + 1.2, 0.4, 3.6, 0.1), Mat.hole('#2b2c2e'), { to: deck, pos: [0, -1.1, padZ], rot: [-90, 0, 0], cast: false });
      M.mesh(G.plate(TPW, TPD, 0.8, 3, 0.25), Mat.alu('#d6d8db', { rough: 0.26 }), { to: deck, pos: [0, -0.48, tpz], rot: [-90, 0, 0] });
      M.mesh(G.plate(TPW, TBD, 0.8, 2.6, 0.25), Mat.alu('#d0d2d5', { rough: 0.3 }), { to: deck, pos: [0, -0.48, tpz + TPD / 2 + 2 + TBD / 2], rot: [-90, 0, 0] });
      // the sleep light on the front edge, and the microphone hole by the escape key
      M.mesh(G.cyl(0.5, 0.2, 0.05, 12), Mat.hole('#202020'), { to: deck, pos: [-BW / 2 + 22, 0.02, kbz - KD / 2 - 4.5] });

      // ---- the right side: the port door, flipped down, and the three ports behind it ----
      // the opening follows the curve of the side, so it is a dark skin laid just outside it
      const PZ = -52, PL = 56, HZ = H(PZ);
      const side = [];
      for (let i = 1; i <= 7; i++) {
        const a = 0.25 + (i / 7) * (Math.PI / 2 - 0.35);
        side.push([-IB * (1 - Math.sin(a)) + 0.12, 0.86 * (1 - Math.cos(a)) * HZ]);
      }
      const skin = [...side, ...side.slice().reverse().map(([u, y]) => [u - 0.6, y])];
      const skinG = G.profile(skin.map(([u, y]) => [u, y]), PL, 0.05);
      skinG.rotateY(Math.PI / 2);
      M.mesh(skinG, Mat.hole('#101011'), { to: lap, pos: [BW / 2, 0, PZ], cast: false });
      // in it: the headphone socket, the USB port and the micro-DVI port, facing out and down a little
      const PY = 0.86 * (1 - Math.cos(1.2)) * HZ;
      const portFace = M.group({ to: lap, pos: [BW / 2 - IB * (1 - Math.sin(1.2)) + 0.2, PY, PZ], rot: [0, 90, -24] });
      M.mesh(G.cyl(1.9, 0.4, 0.1, 24), Mat.chrome({ rough: 0.25 }), { to: portFace, pos: [17, 0, 0], rot: [90, 0, 0] });
      M.mesh(G.cyl(1.25, 0.5, 0.1, 24), Mat.hole('#050505'), { to: portFace, pos: [17, 0, 0.05], rot: [90, 0, 0] });
      const usb = G.rrect(12.4, 4.9, 0.4);
      usb.holes.push(G.rrectHole(11.6, 4.1, 0.3));
      M.mesh(G.extrude(usb, 0.4, 0.08), Mat.chrome({ rough: 0.2 }), { to: portFace, pos: [0, 0, 0] });
      M.mesh(G.plate(10.6, 1.7, 0.3, 0.2, 0.05), Mat.plastic('#e8e8e8', { rough: 0.4 }), { to: portFace, pos: [0, 0.8, 0.1] });
      const dvi = G.rrect(7.6, 3.4, 0.6);
      dvi.holes.push(G.rrectHole(6.8, 2.6, 0.4));
      M.mesh(G.extrude(dvi, 0.4, 0.08), Mat.chrome({ rough: 0.2 }), { to: portFace, pos: [-15, 0, 0] });
      // the door: the same curved strip of the side, hinged along its foot and turned down and out
      const doorG = G.profile(side.map(([u, y]) => [u, y]).concat(side.slice().reverse().map(([u, y]) => [u - 0.7, y])), PL - 1, 0.2);
      doorG.rotateY(Math.PI / 2);
      const y0 = side[0][1];
      doorG.translate(0, -y0, 0);
      const doorGrp = M.group({ to: lap, pos: [BW / 2 + side[0][0], y0, PZ], rot: [0, 0, -100] });
      M.mesh(doorG, aluDark, { to: doorGrp, pos: [-side[0][0], 0, 0] });
      // ---- the hinge barrel and the lid ----
      const pivot = M.group({ to: deck, pos: [0, 0.6, -DD / 2 + 6.5] });
      const lid = M.group({ to: pivot });
      M.state.lid = lid;
      lid.rotation.x = ((90 - REST_ANGLE) * Math.PI) / 180;
      // the clutch: an aluminium barrel with dark end caps
      M.mesh(G.cyl(3.6, 252, 0.6, 40), aluDark, { to: lid, pos: [-126, 2.2, -2.6], rot: [0, 0, -90] });
      for (const sx of [-1, 1]) M.mesh(G.cyl(3.65, 6, 0.8, 32), Mat.plastic('#1a1a1b', { rough: 0.45 }), { to: lid, pos: [sx > 0 ? 126 : -132, 2.2, -2.6], rot: [0, 0, -90] });
      const LW = 325, LH = 223, LT = 4.8;
      // the lid: flat bezel in front, rounded over behind like the base
      const ls = [];
      const rl = 3.6;
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2), k = 1 - Math.sin(a);
        ls.push({ w: LW - 2 * rl * k, d: LH - 6 - 2 * rl * k, r: RP - rl * k * 0.6, y: rl * (1 - Math.cos(a)) });
      }
      ls.push({ w: LW, d: LH - 6, r: RP, y: LT - 0.5 });
      ls.push({ w: LW - 0.6, d: LH - 6.6, r: RP - 0.3, y: LT });
      const lidG = G.loftRR(ls, { seg: 10 });
      lidG.rotateX(Math.PI / 2);
      // (sections were stacked along y: now along z, from the back (−LT) to the bezel (0))
      lidG.translate(0, 6 + (LH - 6) / 2, -LT);
      // (the bezel's face: the same aluminium, blasted a little finer, so it catches the studio's front)
      const lidSplit = G.splitGroups(lidG, (c) => (c.z > -0.2 ? 1 : 0));
      M.mesh(lidSplit, [alu, Mat.alu('#e4e6e9', { rough: 0.5 })], { to: lid });
      // the bezel: the screen, its black border, the iSight, the name
      const SCY = LH - 18 - 179 / 2;
      M.mesh(G.plate(292.6, 185.2, 0.3, 1.2, 0.05), Mat.plastic('#0a0a0b', { rough: 0.3, clearcoat: 1 }), { to: lid, pos: [0, SCY - 0.4, 0.12], cast: false });
      const disp = M.screen({
        to: lid, pos: [0, SCY, 0.3], w: 286.5, h: 179.0, glass: [290.4, 182.8], tech: 'lcd', ui: [SW, SH],
        portal: { rect: [FW.x + 161, FW.y + 58, FW.w - 161, FW.h - 80] },
        draw: desktopScreen,
      });
      M.state.display = disp;
      // Time Machine's space and its window are painted once, when the browser is idle, so the egg
      // never waits for them
      const warm = () => { space(); windowImage(); };
      if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 1500);
      M.mesh(G.cyl(1.6, 0.3, 0.05, 32), Mat.plastic('#0b0b0c', { rough: 0.2, clearcoat: 1 }), { to: lid, pos: [0, LH - 9, 0.02], rot: [90, 0, 0], cast: false });
      M.mesh(G.cyl(0.7, 0.32, 0.05, 24), Mat.glass({ color: '#141a2a', rough: 0.02 }), { to: lid, pos: [0, LH - 9, 0.04], rot: [90, 0, 0], cast: false });
      M.mesh(G.cyl(0.45, 0.3, 0.05, 16), Mat.plastic('#121212', { rough: 0.3 }), { to: lid, pos: [-7, LH - 9, 0.02], rot: [90, 0, 0], cast: false });
      const nm = D.label('MacBook Air', 3.1, { color: '#77797d', weight: 400, font: '"Myriad Pro", "Myriad Set Pro", "Helvetica Neue", Helvetica, Arial, sans-serif', rough: 0.35, metal: 0.6 });
      nm.position.set(0, 12.6, 0.02);
      lid.add(nm);
      // the lid's back: the Apple logo, lit from inside
      const logo = D.appleLogo(36, 0.05, new T.MeshStandardMaterial({ color: '#ffffff', emissive: new T.Color('#ffffff'), emissiveIntensity: 1.4, roughness: 0.3 }), 0.01);
      logo.rotation.y = Math.PI;
      logo.position.set(0, 6 + (LH - 6) / 2 + 4, -LT - 0.04);
      lid.add(logo);
      // rubber feet under the base (for the shadow line)
      for (const [fx, fz] of [[-130, -86], [130, -86], [-130, 86], [130, 86]]) M.mesh(G.cyl(4.5, 1.2, 0.5, 24), Mat.rubber('#2a2a2b'), { to: lap, pos: [fx, -1.1, fz] });
    },
    // the iPhone's Mail egg pulls the laptop out of the envelope: emerge 0 = inside, 1 = at rest
    pose(M, st) {
      const e = st.emerge ?? 1;
      const lap = M.state.laptop, lid = M.state.lid;
      if (!lap) return;
      const env = M.state.env;
      const EM = new T.Matrix4().compose(env.position, env.quaternion, new T.Vector3(1, 1, 1));
      // inside the envelope the laptop lies closed; it slides out of the open end, is lifted clear,
      // and is set down on the envelope, then opened
      const slide = easeInOut(smooth(0.0, 0.42, e));
      const swing = easeInOut(smooth(0.34, 0.72, e));
      const ox = lerp(-29, 205, slide);
      const p = new T.Vector3(ox, 0.75, 0).applyMatrix4(EM);
      p.lerp(M.state.lapHome.pos, swing);
      p.y += Math.sin(Math.PI * swing) * 34;
      lap.position.copy(p);
      const envYaw = env.rotation.y, homeYaw = (M.state.lapHome.yaw * Math.PI) / 180;
      lap.rotation.set(-0.06 * Math.sin(Math.PI * swing), lerp(envYaw, homeYaw, swing), 0.05 * Math.sin(Math.PI * swing));
      // the lid opens once it is down
      const open = easeInOut(smooth(0.7, 1, e));
      lid.rotation.x = ((90 - lerp(0, REST_ANGLE, open)) * Math.PI) / 180;
      // the envelope's front sheet swells over the part of the laptop still inside it
      const fm = M.state.envFront, g = fm.geometry, pos = g.attributes.position, flat = g.userData.flat;
      const inner = 1 - swing;
      const key = Math.round(inner * 500) + ':' + Math.round(ox * 4);
      if (g.userData.key !== key) {
        g.userData.key = key;
        for (let i = 0; i < pos.count; i++) {
          const x = flat[i * 3], z = flat[i * 3 + 2];
          const fx = smooth(-178, -150, x - ox) * (1 - smooth(150, 178, x - ox));
          const fz = smooth(-128, -104, z) * (1 - smooth(104, 128, z));
          const edges = smooth(-ENV_W / 2, -ENV_W / 2 + 26, x) * (1 - 0.85 * smooth(ENV_D / 2 - 20, ENV_D / 2, Math.abs(z)));
          pos.setY(i, flat[i * 3 + 1] + 18.6 * fx * fz * edges * inner);
        }
        pos.needsUpdate = true;
        g.computeVertexNormals();
      }
      if (M.set && M.state.lastE !== e) { M.set.key.shadow.needsUpdate = true; M.state.lastE = e; }
    },
  });

  // ---------- the clock egg: Time Machine, run forwards ----------
  Real.egg('clock', (api) => {
    const { t, display: d } = api;
    const press = smooth(0.02, 0.06, t) * (1 - smooth(0.08, 0.12, t));
    const bounce = Math.abs(Math.sin(smooth(0.06, 0.16, t) * Math.PI * 2)) * 18 * (1 - smooth(0.12, 0.17, t));
    const open = smooth(0.14, 0.3, t);
    const p = (YEARS.length - 1) * easeInOut(smooth(0.3, 0.8, t));
    const speed = smooth(0.3, 0.42, t) * (1 - smooth(0.7, 0.8, t)) * 1.6;
    const clear = smooth(0.82, 0.93, t);
    const tm = { press, bounce, open, p, speed, clear, frame: d.state.frame };
    const old = d.state.drawState && d.state.drawState.tm;
    if (!old || ['press', 'bounce', 'open', 'p', 'clear'].some((k) => old[k] !== tm[k])) {
      d.state.drawState = t > 0 ? { tm } : {};
      d.redraw();
    }
  });
})();
