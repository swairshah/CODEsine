// macos.js: macOS Big Sur and Monterey, drawn into a screen's canvas in points, for the machines
// whose screens run them (the iMac 24″ and the MacBook Pro 14″). Real.MacOS holds: wallpapers, the
// menu bar, window chrome, the Dock and its icons, the Finder sidebar's symbols, and the monoline
// "hello". It loads with the engine, before the machine files, which read Real.MacOS when they load.
'use strict';

(function () {
  const Real = window.Real;
  const SF = 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const SFD = 'system-ui, -apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const TAU = Math.PI * 2;

  // ---------- small drawing helpers ----------
  function lin(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([k, c]) => gr.addColorStop(k, c));
    return gr;
  }
  function rad(g, x, y, r0, r1, stops) {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([k, c]) => gr.addColorStop(k, c));
    return gr;
  }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // Big Sur's icon shape: a squircle (a superellipse, n = 5), inset in its 1024 grid
  function squircle(g, x, y, s) {
    const n = 5, a = s / 2, cx = x + a, cy = y + a;
    g.beginPath();
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * TAU, c = Math.cos(t), sn = Math.sin(t);
      const px = cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
      const py = cy + a * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
  }
  function text(g, str, x, y, size, o = {}) {
    g.font = `${o.weight || 400} ${size}px ${o.font || SF}`;
    g.fillStyle = o.color || '#1d1d1f';
    g.textAlign = o.align || 'left';
    g.textBaseline = o.base || 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${o.track || 0}px`;
    g.fillText(str, x, y);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    return g.measureText(str).width;
  }
  function blob(g, pts, fill) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i + 2 < pts.length + 1; i += 3) g.bezierCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i + 2][0], pts[i + 2][1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }

  // ---------- wallpapers ----------
  // Monterey: soft folded ribbons of violet, magenta and blue over deep indigo.
  function monterey(g, W, H) {
    g.save();
    g.fillStyle = lin(g, 0, 0, W * 0.3, H, [[0, '#2a2f86'], [0.5, '#4b2c93'], [1, '#1a1446']]);
    g.fillRect(0, 0, W, H);
    g.filter = `blur(${Math.round(W * 0.012)}px)`;
    const k = W / 1000, j = H / 650;
    const P = (pts) => pts.map(([x, y]) => [x * k, y * j]);
    blob(g, P([[-60, 120], [180, 40], [420, 240], [620, 160], [820, 90], [980, 260], [1080, 180], [1100, 420], [700, 420], [400, 520], [-80, 470]]), lin(g, 0, 0, W, H, [[0, '#7b5cf0'], [0.45, '#c05bd8'], [1, '#5a3fc8']]));
    blob(g, P([[-60, 330], [200, 260], [380, 420], [560, 380], [760, 330], [900, 470], [1080, 420], [1100, 700], [600, 700], [300, 700], [-80, 700]]), lin(g, 0, H * 0.4, W, H, [[0, '#3d4fd8'], [0.5, '#6d3ad0'], [1, '#2b2a9a']]));
    blob(g, P([[-60, 470], [150, 420], [300, 560], [520, 540], [700, 520], [860, 600], [1080, 580], [1100, 720], [500, 720], [200, 720], [-80, 720]]), lin(g, 0, H * 0.6, W, H, [[0, '#e46fd3'], [0.6, '#9346e0'], [1, '#4a2bbf']]));
    g.globalAlpha = 0.55;
    blob(g, P([[260, -40], [380, 90], [540, 120], [700, 60], [820, 20], [900, -40], [960, -60], [900, -80], [500, -80], [300, -80], [260, -40]]), lin(g, 0, 0, W, H * 0.2, [[0, '#9b8cff'], [1, '#5b48d8']]));
    g.restore();
    // fine sheen along the folds
    g.save();
    g.globalCompositeOperation = 'screen';
    g.fillStyle = rad(g, W * 0.62, H * 0.42, 0, W * 0.5, [[0, 'rgba(255,170,240,0.22)'], [1, 'rgba(255,170,240,0)']]);
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  // The iMac's own wallpaper, in its colour: petals of light swirling out from the lower left.
  function imacPetals(g, W, H, hue) {
    const base = hue || ['#0d3f7a', '#2f7fd0', '#9fd2ff'];
    g.save();
    g.fillStyle = lin(g, 0, 0, W, H, [[0, base[0]], [1, base[0]]]);
    g.fillRect(0, 0, W, H);
    g.filter = `blur(${Math.round(W * 0.006)}px)`;
    const cx = W * 0.18, cy = H * 1.05;
    for (let i = 0; i < 9; i++) {
      const a = -1.45 + i * 0.17, r0 = W * (0.32 + i * 0.07);
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      g.fillStyle = lin(g, 0, -r0, r0 * 0.4, 0, [[0, base[2]], [0.45, base[1]], [1, base[0]]]);
      g.globalAlpha = 0.62;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(r0 * 0.35, -r0 * 0.3, r0 * 0.5, -r0 * 0.85, r0 * 0.1, -r0 * 1.02);
      g.bezierCurveTo(-r0 * 0.12, -r0 * 0.7, -r0 * 0.1, -r0 * 0.3, 0, 0);
      g.fill();
      g.restore();
    }
    g.restore();
    g.save();
    g.fillStyle = rad(g, W * 0.8, H * 0.15, 0, W * 0.6, [[0, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]);
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  // ---------- symbols ----------
  function apple(g, x, y, h, color) { Real.D.drawApple(g, x, y, h, { color }); }
  // a few SF Symbols, drawn as strokes, in a box of size s centred on (x, y)
  function symbol(g, name, x, y, s, color, w = 1.5) {
    g.save();
    g.translate(x, y);
    g.scale(s / 20, s / 20);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = (w * 20) / s;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const P = (pts, close) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); if (close) g.closePath(); g.stroke(); };
    switch (name) {
      case 'airdrop':
        for (const r of [3, 6.2, 9.4]) { g.beginPath(); g.arc(0, 2, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
        g.beginPath(); g.arc(0, 2, 1.2, 0, TAU); g.fill();
        break;
      case 'clock': g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.stroke(); P([[0, -4.5], [0, 0], [3.5, 2]]); break;
      case 'apps': g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.stroke(); P([[-4, 4], [0, -5], [4, 4]]); P([[-2.6, 1], [2.6, 1]]); break;
      case 'desktop': g.beginPath(); rr(g, -8.5, -6, 17, 11, 1.6); g.stroke(); P([[-3, 8.5], [3, 8.5]]); break;
      case 'doc': P([[-5.5, -8.5], [2, -8.5], [6, -4.5], [6, 8.5], [-5.5, 8.5]], true); P([[2, -8.5], [2, -4.5], [6, -4.5]]); break;
      case 'download': g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.stroke(); P([[0, -4.5], [0, 4]]); P([[-3.5, 0.8], [0, 4.3], [3.5, 0.8]]); break;
      case 'cloud':
        g.beginPath(); g.moveTo(-6, 5); g.arc(-5.2, 1.2, 3.8, Math.PI * 0.6, Math.PI * 1.45); g.arc(0.5, -1.2, 5.2, Math.PI * 1.1, Math.PI * 1.95); g.arc(5.6, 2, 3, Math.PI * 1.55, Math.PI * 0.45); g.closePath(); g.stroke();
        break;
      case 'disk': g.beginPath(); rr(g, -8.5, -4.5, 17, 9, 2); g.stroke(); g.beginPath(); g.arc(5, 0, 0.9, 0, TAU); g.fill(); break;
      case 'network': g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(0, 0, 3.5, 8.5, 0, 0, TAU); g.stroke(); P([[-8.5, 0], [8.5, 0]]); break;
      case 'chevL': P([[3, -7], [-3, 0], [3, 7]]); break;
      case 'chevR': P([[-3, -7], [3, 0], [-3, 7]]); break;
      case 'chevD': P([[-4, -2], [0, 2], [4, -2]]); break;
      case 'search': g.beginPath(); g.arc(-1.5, -1.5, 6, 0, TAU); g.stroke(); P([[3, 3], [8, 8]]); break;
      case 'sidebar': g.beginPath(); rr(g, -9, -7, 18, 14, 2.5); g.stroke(); P([[-3, -7], [-3, 7]]); break;
      case 'share': P([[0, -9], [0, 3]]); P([[-3.5, -5.5], [0, -9], [3.5, -5.5]]); P([[-3, -2], [-7, -2], [-7, 9], [7, 9], [7, -2], [3, -2]]); break;
      case 'plus': P([[0, -7], [0, 7]]); P([[-7, 0], [7, 0]]); break;
      case 'tabs': g.beginPath(); rr(g, -7, -4, 13, 11, 1.8); g.stroke(); P([[-4, -7], [9, -7], [9, 4]]); break;
      case 'shield': P([[0, -9], [7, -6], [7, 0], [0, 9], [-7, 0], [-7, -6]], true); break;
      case 'lock': g.beginPath(); rr(g, -5, -1, 10, 8, 1.5); g.fill(); g.beginPath(); g.arc(0, -2, 3.5, Math.PI, 0); g.stroke(); break;
      case 'bag': g.beginPath(); rr(g, -6.5, -4, 13, 13, 2); g.stroke(); g.beginPath(); g.arc(0, -4, 3.5, Math.PI, 0); g.stroke(); break;
      case 'wifi':
        for (const r of [4, 8, 12]) { g.beginPath(); g.arc(0, 7, r, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); }
        g.beginPath(); g.arc(0, 7, 1.4, 0, TAU); g.fill();
        break;
      case 'control':
        g.beginPath(); rr(g, -9, -8, 18, 6.5, 3.25); g.stroke(); g.beginPath(); g.arc(-5.75, -4.75, 2, 0, TAU); g.fill();
        g.beginPath(); rr(g, -9, 1.5, 18, 6.5, 3.25); g.stroke(); g.beginPath(); g.arc(5.75, 4.75, 2, 0, TAU); g.fill();
        break;
      case 'battery':
        g.beginPath(); rr(g, -11, -5.5, 20, 11, 3); g.stroke(); g.beginPath(); rr(g, -9, -3.5, 16, 7, 1.6); g.fill(); g.beginPath(); rr(g, 10, -2, 2, 4, 0.8); g.fill();
        break;
      case 'siri': {
        g.lineWidth = 0;
        const gr = lin(g, -9, -9, 9, 9, [[0, '#2ad0ff'], [0.5, '#a24bff'], [1, '#ff4bb0']]);
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 8.5, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(0, 0, 6, 2.5, 0.4, 0, TAU); g.fill();
        break;
      }
      default: break;
    }
    g.restore();
  }

  // ---------- the menu bar ----------
  // o: { app, menus, right: ['control', 'battery'...], clock, notch: [w] (points), dark }
  function menuBar(g, W, H, o) {
    const h = o.height || 24;
    // translucent: the wallpaper shows through, lightened and blurred
    g.save();
    g.fillStyle = o.dark ? 'rgba(20,20,30,0.42)' : 'rgba(246,246,250,0.62)';
    g.fillRect(0, 0, W, h);
    g.restore();
    const ink = o.dark ? '#ffffff' : '#111114';
    apple(g, 22, h / 2 - 0.5, 15, ink);
    let x = 46;
    x += text(g, o.app, x, h / 2, 13, { weight: 700, color: ink }) + 20;
    for (const m of o.menus) x += text(g, m, x, h / 2, 13, { color: ink }) + 20;
    // the right: status icons, then the clock
    let r = W - 14;
    r -= text(g, o.clock, r, h / 2, 13, { color: ink, align: 'right' }) + 16;
    for (const s of (o.right || ['siri', 'control', 'search', 'wifi'])) {
      const sw = s === 'battery' ? 26 : 18;
      symbol(g, s, r - sw / 2, h / 2, s === 'battery' ? 22 : 15, ink, 1.4);
      r -= sw + 14;
    }
    if (o.notch) {
      g.fillStyle = '#000';
      const nw = o.notch, nh = h + 8;
      g.beginPath();
      g.moveTo(W / 2 - nw / 2 - 6, 0);
      g.arcTo(W / 2 - nw / 2, 0, W / 2 - nw / 2, 6, 6);
      g.lineTo(W / 2 - nw / 2, nh - 9);
      g.arcTo(W / 2 - nw / 2, nh, W / 2 - nw / 2 + 9, nh, 9);
      g.lineTo(W / 2 + nw / 2 - 9, nh);
      g.arcTo(W / 2 + nw / 2, nh, W / 2 + nw / 2, nh - 9, 9);
      g.lineTo(W / 2 + nw / 2, 6);
      g.arcTo(W / 2 + nw / 2, 0, W / 2 + nw / 2 + 6, 0, 6);
      g.closePath();
      g.fill();
    }
  }

  // ---------- windows ----------
  // A window's body: shadow, rounded corners, the three buttons. Returns nothing; the caller clips.
  function windowFrame(g, x, y, w, h, o = {}) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.42)';
    g.shadowBlur = 60;
    g.shadowOffsetY = 22;
    rr(g, x, y, w, h, 10);
    g.fillStyle = o.bg || '#ffffff';
    g.fill();
    g.restore();
    g.save();
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 1;
    rr(g, x + 0.5, y + 0.5, w - 1, h - 1, 10);
    g.stroke();
    g.restore();
  }
  function lights(g, x, y) {
    [['#ff5f57', '#e0443e'], ['#febc2e', '#dea123'], ['#28c840', '#1aab29']].forEach(([c, e], i) => {
      g.beginPath();
      g.arc(x + i * 20, y, 6, 0, TAU);
      g.fillStyle = c;
      g.fill();
      g.strokeStyle = e;
      g.lineWidth = 0.6;
      g.stroke();
    });
  }

  // ---------- the Dock ----------
  const DOCK = ['Finder', 'Launchpad', 'Safari', 'Messages', 'Mail', 'Maps', 'Photos', 'FaceTime', 'Calendar', 'Contacts', 'Reminders', 'Notes', 'TV', 'Music', 'Podcasts', 'App Store', 'System Preferences', '|', 'Downloads', 'Trash'];
  function dock(g, W, H, o = {}) {
    const s = o.size || 54, pad = 5, gap = 3.5;
    const items = o.items || DOCK;
    const n = items.filter((i) => i !== '|').length;
    const sep = items.includes('|') ? 14 : 0;
    const w = n * s + (n - 1) * gap + 2 * pad + sep;
    const h = s + 2 * pad + 4;
    const x0 = W / 2 - w / 2, y0 = H - h - 4;
    g.save();
    rr(g, x0, y0, w, h, 18);
    g.fillStyle = o.dark ? 'rgba(40,40,46,0.42)' : 'rgba(250,250,252,0.38)';
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 1;
    g.stroke();
    g.restore();
    let x = x0 + pad;
    for (const it of items) {
      if (it === '|') {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(x + sep / 2 - 0.5, y0 + 10, 1, h - 20);
        x += sep;
        continue;
      }
      icon(g, it, x, y0 + pad + 1, s, o);
      if (o.running && o.running.includes(it)) {
        g.fillStyle = o.dark ? '#e6e6e6' : '#2a2a2c';
        g.beginPath(); g.arc(x + s / 2, y0 + h - 3.5, 1.6, 0, TAU); g.fill();
      }
      x += s + gap;
    }
    return { x: x0, y: y0, w, h };
  }

  // ---------- icons: Big Sur, in a box of size s at (x, y) ----------
  function icon(g, name, x, y, s, o = {}) {
    g.save();
    g.translate(x, y);
    g.scale(s / 100, s / 100);
    // the shadow under the tile
    const tile = (fill) => {
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.3)';
      g.shadowBlur = 5;
      g.shadowOffsetY = 2;
      squircle(g, 6, 6, 88);
      g.fillStyle = fill;
      g.fill();
      g.restore();
      squircle(g, 6, 6, 88);
      g.clip();
    };
    const W = '#ffffff';
    switch (name) {
      case 'Finder': {
        tile('#1e8ef2');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#6ec8fb'], [1, '#1a75e8']]);
        g.fillRect(0, 0, 100, 100);
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#f4f9fe'], [1, '#d4e6f7']]);
        g.beginPath(); g.moveTo(55, 0); g.bezierCurveTo(47, 24, 44, 40, 45, 58); g.lineTo(56, 58); g.bezierCurveTo(54, 74, 56, 86, 58, 100); g.lineTo(100, 100); g.lineTo(100, 0); g.fill();
        g.strokeStyle = '#1b2b3d'; g.lineWidth = 3.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(32, 30); g.lineTo(32, 42); g.moveTo(70, 30); g.lineTo(70, 42); g.stroke();
        g.beginPath(); g.moveTo(24, 66); g.quadraticCurveTo(50, 80, 78, 66); g.stroke();
        break;
      }
      case 'Launchpad': {
        tile('#e7e7ea');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#f6f6f8'], [1, '#d3d3d8']]); g.fillRect(0, 0, 100, 100);
        const C = ['#ff5a54', '#ffbd2e', '#28c840', '#5ac8fa', '#007aff', '#af52de', '#ff2d55', '#ff9500', '#34c759'];
        C.forEach((c, i) => { g.fillStyle = c; rr(g, 23 + (i % 3) * 19, 23 + Math.floor(i / 3) * 19, 14, 14, 4); g.fill(); });
        break;
      }
      case 'Safari': {
        tile('#ffffff');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#ffffff'], [1, '#e3e3e6']]); g.fillRect(0, 0, 100, 100);
        g.fillStyle = rad(g, 46, 42, 4, 40, [[0, '#30c6ff'], [1, '#1360e0']]);
        g.beginPath(); g.arc(50, 50, 36, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 0.9;
        for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU, r0 = i % 4 ? 31 : 27; g.beginPath(); g.moveTo(50 + r0 * Math.cos(a), 50 + r0 * Math.sin(a)); g.lineTo(50 + 34 * Math.cos(a), 50 + 34 * Math.sin(a)); g.stroke(); }
        g.save(); g.translate(50, 50); g.rotate(0.78);
        g.fillStyle = '#ff3b30'; g.beginPath(); g.moveTo(-5, 0); g.lineTo(0, -30); g.lineTo(5, 0); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-5, 0); g.lineTo(0, 30); g.lineTo(5, 0); g.fill();
        g.restore();
        break;
      }
      case 'Messages': {
        tile('#34c759');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#6cf37f'], [1, '#0cba30']]); g.fillRect(0, 0, 100, 100);
        g.fillStyle = W; g.beginPath(); g.ellipse(50, 47, 33, 27, 0, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(26, 62); g.quadraticCurveTo(26, 76, 17, 81); g.quadraticCurveTo(33, 80, 40, 70); g.fill();
        break;
      }
      case 'Mail': {
        tile('#1a8cff');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#5ac8fa'], [1, '#0a6cf0']]); g.fillRect(0, 0, 100, 100);
        g.fillStyle = W; rr(g, 17, 29, 66, 44, 4); g.fill();
        g.strokeStyle = '#a9c9ef'; g.lineWidth = 2.4; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(19, 31); g.lineTo(50, 55); g.lineTo(81, 31); g.stroke();
        break;
      }
      case 'Maps': {
        tile('#e8eedf');
        g.fillStyle = '#e9efe0'; g.fillRect(0, 0, 100, 100);
        g.fillStyle = '#a7d98a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(46, 0); g.lineTo(30, 44); g.lineTo(0, 56); g.fill();
        g.fillStyle = '#7fc6f5'; g.beginPath(); g.moveTo(60, 100); g.quadraticCurveTo(72, 64, 100, 58); g.lineTo(100, 100); g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 74); g.lineTo(100, 30); g.stroke();
        g.strokeStyle = '#f5c242'; g.lineWidth = 5; g.beginPath(); g.moveTo(22, 100); g.lineTo(52, 0); g.stroke();
        g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(64, 40, 9, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 40, 3.5, 0, TAU); g.fill();
        break;
      }
      case 'Photos': {
        tile('#ffffff');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 100, 100);
        const C = ['#fdb827', '#f5d63d', '#a5d63f', '#4cbf6a', '#3fb8d6', '#5577e6', '#a05ad8', '#ef4e8a'];
        g.globalCompositeOperation = 'multiply';
        C.forEach((c, i) => {
          g.save(); g.translate(50, 50); g.rotate((i / 8) * TAU);
          g.fillStyle = c; g.globalAlpha = 0.86; rr(g, -9, -36, 18, 32, 9); g.fill();
          g.restore();
        });
        g.globalCompositeOperation = 'source-over';
        break;
      }
      case 'FaceTime': {
        tile('#34c759');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#6cf37f'], [1, '#0cba30']]); g.fillRect(0, 0, 100, 100);
        g.fillStyle = W; rr(g, 18, 34, 44, 32, 7); g.fill();
        g.beginPath(); g.moveTo(64, 46); g.lineTo(82, 34); g.lineTo(82, 66); g.lineTo(64, 54); g.fill();
        break;
      }
      case 'Calendar': {
        tile('#ffffff');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 100, 100);
        text(g, o.month || 'OCT', 50, 26, 13, { color: '#ff3b30', align: 'center', weight: 600, font: SFD });
        text(g, o.day || '26', 50, 60, 44, { color: '#1d1d1f', align: 'center', weight: 300, font: SFD });
        break;
      }
      case 'Contacts': {
        tile('#c9a27a');
        g.fillStyle = lin(g, 0, 0, 0, 100, [[0, '#d8b48c'], [1, '#a77e57']]); g.fillRect(0, 0, 100, 100);
        g.fillStyle = '#f3efe9'; g.fillRect(24, 0, 76, 100);
        g.fillStyle = '#8f8f94'; g.beginPath(); g.arc(62, 40, 12, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(62, 76, 22, 15, 0, Math.PI, 0); g.fill();
        break;
      }
      case 'Reminders': {
        tile('#ffffff');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 100, 100);
        ['#007aff', '#ff3b30', '#ff9500'].forEach((c, i) => {
          g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(26, 30 + i * 20, 6, 0, TAU); g.stroke();
          g.fillStyle = c; g.beginPath(); g.arc(26, 30 + i * 20, 3, 0, TAU); g.fill();
          g.fillStyle = '#d6d6da'; g.fillRect(38, 28.5 + i * 20, 42, 3);
        });
        break;
      }
      case 'Notes': {
        tile('#ffffff');
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 100, 100);
        g.fillStyle = lin(g, 0, 0, 0, 28, [[0, '#ffd84f'], [1, '#f7c61f']]); g.fillRect(0, 0, 100, 27);
        g.fillStyle = '#dedee2'; for (let i = 0; i < 5; i++) g.fillRect(14, 40 + i * 11, 72, 1.6);
        break;
      }
      case 'TV': {
        tile('#111');
        g.fillStyle = lin(g, 0, 0, 0, 100, [[0, '#2c2c2e'], [1, '#000']]); g.fillRect(0, 0, 100, 100);
        apple(g, 38, 49, 24, '#ffffff');
        text(g, 'tv', 62, 53, 30, { color: '#fff', align: 'center', weight: 600, font: SFD });
        break;
      }
      case 'Music': {
        tile('#fa233b');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#fb5c74'], [1, '#fa233b']]); g.fillRect(0, 0, 100, 100);
        g.fillStyle = W;
        g.beginPath(); g.ellipse(36, 68, 10, 8, -0.3, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(66, 62, 10, 8, -0.3, 0, TAU); g.fill();
        g.fillRect(43, 26, 5, 42); g.fillRect(73, 20, 5, 42);
        g.beginPath(); g.moveTo(43, 26); g.lineTo(78, 18); g.lineTo(78, 28); g.lineTo(43, 36); g.fill();
        break;
      }
      case 'Podcasts': {
        tile('#9b3ee8');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#d56efc'], [1, '#832bc1']]); g.fillRect(0, 0, 100, 100);
        g.strokeStyle = W; g.lineWidth = 5; g.lineCap = 'round';
        for (const r of [28, 18]) { g.beginPath(); g.arc(50, 46, r, Math.PI * 0.78, Math.PI * 2.22); g.stroke(); }
        g.fillStyle = W; g.beginPath(); g.arc(50, 44, 8, 0, TAU); g.fill();
        rr(g, 45, 55, 10, 26, 5); g.fill();
        break;
      }
      case 'App Store': {
        tile('#1a8cff');
        g.fillStyle = lin(g, 0, 6, 0, 94, [[0, '#17c9fb'], [1, '#1a74e8']]); g.fillRect(0, 0, 100, 100);
        g.strokeStyle = W; g.lineWidth = 7; g.lineCap = 'round';
        g.beginPath(); g.moveTo(36, 76); g.lineTo(58, 26); g.moveTo(64, 76); g.lineTo(52, 50); g.moveTo(27, 64); g.lineTo(73, 64); g.stroke();
        break;
      }
      case 'System Preferences': {
        tile('#8e8e93');
        g.fillStyle = lin(g, 0, 0, 0, 100, [[0, '#9a9aa0'], [1, '#5d5d63']]); g.fillRect(0, 0, 100, 100);
        g.fillStyle = lin(g, 0, 20, 0, 80, [[0, '#f2f2f4'], [1, '#a4a4aa']]);
        g.beginPath();
        for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU, r = i % 4 < 2 ? 34 : 28; g.lineTo(50 + r * Math.cos(a), 50 + r * Math.sin(a)); }
        g.closePath(); g.fill();
        g.fillStyle = '#6a6a70'; g.beginPath(); g.arc(50, 50, 20, 0, TAU); g.fill();
        g.fillStyle = '#d6d6da'; g.beginPath(); g.arc(50, 50, 9, 0, TAU); g.fill();
        break;
      }
      case 'Downloads': {
        g.fillStyle = lin(g, 0, 10, 0, 90, [[0, '#7dbdf5'], [1, '#3f8de0']]);
        rr(g, 12, 22, 76, 62, 8); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, 12, 22, 76, 16, 8); g.fill();
        symbol(g, 'download', 50, 57, 32, '#ffffff', 2.4);
        break;
      }
      case 'Trash': {
        g.fillStyle = lin(g, 0, 10, 0, 90, [[0, 'rgba(240,240,244,0.95)'], [1, 'rgba(200,200,206,0.95)']]);
        g.beginPath(); g.moveTo(22, 20); g.lineTo(78, 20); g.lineTo(72, 92); g.lineTo(28, 92); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120,120,128,0.55)'; g.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) { const xx = 30 + i * 8; g.beginPath(); g.moveTo(xx, 26); g.lineTo(xx + 1 - i * 0.4, 88); g.stroke(); }
        g.fillStyle = 'rgba(150,150,156,0.9)'; rr(g, 18, 15, 64, 7, 3); g.fill();
        break;
      }
      default:
        tile('#888');
    }
    g.restore();
  }

  // ---------- hello ----------
  // The monoline "hello" the iMac writes when you first switch it on, as one stroke. The points are
  // in a 1000 × 400 box; draw(g, k) strokes the first k (0…1) of it.
  const HELLO = [
    [20, 320], [70, 300], [130, 230], [185, 130], [210, 60], [196, 30], [170, 44], [156, 110], [147, 220], [140, 330],
    [148, 280], [172, 215], [214, 180], [250, 192], [262, 240], [262, 300], [278, 330], [312, 318],
    [342, 290], [395, 256], [420, 216], [404, 186], [370, 190], [346, 238], [350, 298], [386, 330], [440, 316], [482, 270],
    [522, 200], [560, 112], [574, 56], [560, 32], [536, 50], [522, 130], [516, 240], [526, 314], [560, 330], [600, 300],
    [640, 200], [678, 112], [692, 56], [678, 32], [654, 50], [640, 130], [634, 240], [644, 314], [678, 330], [722, 300],
    [752, 240], [776, 196], [812, 180], [846, 202], [856, 252], [836, 310], [796, 330], [766, 304], [770, 250], [800, 202], [846, 190], [892, 200], [940, 192],
  ];
  let helloPts = null;
  function helloPath() {
    if (helloPts) return helloPts;
    // Catmull-Rom through the points, sampled finely, with the running length
    const P = HELLO, out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let s = 0; s < 12; s++) {
        const t = s / 12, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(P[P.length - 1]);
    let L = 0;
    const acc = [0];
    for (let i = 1; i < out.length; i++) { L += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); acc.push(L); }
    helloPts = { pts: out, acc, L };
    return helloPts;
  }
  function hello(g, cx, cy, width, k, color, lw = 26) {
    const { pts, acc, L } = helloPath();
    const s = width / 1000;
    g.save();
    g.translate(cx - 500 * s, cy - 200 * s);
    g.scale(s, s);
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    const stop = k * L;
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (acc[i] > stop) {
        const f = (stop - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
        g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
        break;
      }
      g.lineTo(pts[i][0], pts[i][1]);
    }
    if (k > 0) g.stroke();
    g.restore();
  }

  Real.MacOS = { SF, SFD, lin, rad, rr, squircle, text, monterey, imacPetals, symbol, menuBar, windowFrame, lights, dock, icon, hello, apple };
})();
