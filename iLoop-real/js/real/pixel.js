// pixel.js: drawing period interfaces into a Display's canvas at the screen's own resolution.
// Real.Pix: 1-bit text (anti-aliased type thresholded to whole pixels, the way a bitmap font sits on
// a 1984 screen), MacPaint patterns, bitmaps from strings, Bresenham lines, and the Apple logo.
// Shared by every machine. Machine files must not edit this file.
'use strict';

(function (global) {
  const Real = global.Real;

  const scratch = document.createElement('canvas');
  const sg = scratch.getContext('2d', { willReadFrequently: true });

  // Text set in whole pixels: drawn anti-aliased at the size given, then every pixel is either ink
  // or not. o: { size, font, weight, color, align: left|center|right, base: alphabetic|middle|top,
  // thr (0…1), track (px), italic }. Returns the width in pixels.
  function bitText(g, str, x, y, o = {}) {
    const size = o.size || 12;
    const font = `${o.italic ? 'italic ' : ''}${o.weight || 700} ${size}px ${o.font || 'Geneva, "Helvetica Neue", Helvetica, Arial, sans-serif'}`;
    sg.font = font;
    if ('letterSpacing' in sg) sg.letterSpacing = `${o.track || 0}px`;
    const w = Math.ceil(sg.measureText(str).width) + 4;
    const h = Math.ceil(size * 1.6) + 4;
    scratch.width = w;
    scratch.height = h;
    sg.font = font;
    if ('letterSpacing' in sg) sg.letterSpacing = `${o.track || 0}px`;
    sg.textBaseline = 'alphabetic';
    sg.fillStyle = '#fff';
    const asc = Math.round(size * 1.05) + 2;
    sg.fillText(str, 2, asc);
    const im = sg.getImageData(0, 0, w, h);
    const d = im.data;
    const c = hexRgb(o.color || '#000');
    const thr = (o.thr ?? 0.5) * 255;
    for (let i = 0; i < d.length; i += 4) {
      const on = d[i + 3] > thr;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = on ? 255 : 0;
    }
    sg.putImageData(im, 0, 0);
    const tw = w - 4;
    let X = x;
    if (o.align === 'center') X = x - tw / 2;
    else if (o.align === 'right') X = x - tw;
    let Y = y - asc;
    if (o.base === 'middle') Y = y - asc + Math.round(size * 0.36);
    else if (o.base === 'top') Y = y - asc + Math.round(size * 0.78);
    const was = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(scratch, Math.round(X) - 2, Math.round(Y));
    g.imageSmoothingEnabled = was;
    return tw;
  }
  function textWidth(str, o = {}) {
    sg.font = `${o.italic ? 'italic ' : ''}${o.weight || 700} ${o.size || 12}px ${o.font || 'Geneva, "Helvetica Neue", Helvetica, Arial, sans-serif'}`;
    if ('letterSpacing' in sg) sg.letterSpacing = `${o.track || 0}px`;
    return sg.measureText(str).width;
  }
  function hexRgb(h) {
    if (Array.isArray(h)) return h;
    const s = h.replace('#', '');
    const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // 8 × 8 patterns as rows of bits, MSB first, as QuickDraw stores them
  const PAT = {
    black: [255, 255, 255, 255, 255, 255, 255, 255],
    white: [0, 0, 0, 0, 0, 0, 0, 0],
    gray: [0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55],
    ltGray: [0x88, 0x22, 0x88, 0x22, 0x88, 0x22, 0x88, 0x22],
    dkGray: [0x77, 0xdd, 0x77, 0xdd, 0x77, 0xdd, 0x77, 0xdd],
    desk: [0x88, 0x00, 0x22, 0x00, 0x88, 0x00, 0x22, 0x00],
    diag: [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80],
    diag2: [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01],
    hlines: [0xff, 0, 0, 0, 0xff, 0, 0, 0],
    vlines: [0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88, 0x88],
    brick: [0xff, 0x80, 0x80, 0x80, 0xff, 0x08, 0x08, 0x08],
    weave: [0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81],
    dots: [0x80, 0, 0x08, 0, 0x80, 0, 0x08, 0],
    scales: [0x80, 0x80, 0x41, 0x3e, 0x08, 0x08, 0x14, 0xe3],
    grid: [0xff, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80],
    waves: [0x0c, 0x12, 0x21, 0xc0, 0x0c, 0x12, 0x21, 0xc0],
    checker: [0xf0, 0xf0, 0xf0, 0xf0, 0x0f, 0x0f, 0x0f, 0x0f],
    shingle: [0x40, 0xa0, 0x00, 0x00, 0x04, 0x0a, 0x00, 0x00],
  };
  const patCache = new Map();
  function pattern(g, bits, fg = '#000', bg = '#fff') {
    const key = `${bits.join(',')}${fg}${bg}`;
    let c = patCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = 8;
      const x = c.getContext('2d');
      x.fillStyle = bg;
      x.fillRect(0, 0, 8, 8);
      x.fillStyle = fg;
      for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) if (bits[r] & (0x80 >> k)) x.fillRect(k, r, 1, 1);
      patCache.set(key, c);
    }
    return g.createPattern(c, 'repeat');
  }
  function fillPat(g, x, y, w, h, bits, fg, bg) {
    g.fillStyle = pattern(g, typeof bits === 'string' ? PAT[bits] : bits, fg, bg);
    g.fillRect(x, y, w, h);
  }
  // a bitmap from strings: each character is a pixel; colors maps characters to colours
  function bitmap(g, rows, x, y, colors = { X: '#000', o: '#fff' }) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = colors[row[i]];
        if (c) { g.fillStyle = c; g.fillRect(x + i, y + j, 1, 1); }
      }
    });
  }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function frame(g, x, y, w, h, c, lw = 1) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    g.fillStyle = c;
    g.fillRect(x, y, w, lw); g.fillRect(x, y + h - lw, w, lw); g.fillRect(x, y, lw, h); g.fillRect(x + w - lw, y, lw, h);
  }
  function line(g, x0, y0, x1, y1, c, pen = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    g.fillStyle = c;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      g.fillRect(x0, y0, pen, pen);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  // make a region strictly 1-bit: each pixel black or white by luminance (alpha kept)
  function threshold(g, x, y, w, h, thr = 0.5, on = [0, 0, 0], off = [255, 255, 255]) {
    const im = g.getImageData(x, y, w, h);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
      const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      const c = l < thr ? on : off;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(im, x, y);
  }
  function rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // the classic arrow pointer, 11 × 16: black with a white rim
  const ARROW = [
    'X..........', 'XX.........', 'XoX........', 'XooX.......', 'XoooX......', 'XooooX.....', 'XoooooX....', 'XooooooX...',
    'XoooooooX..', 'XooooooooX.', 'XoooooXXXXX', 'XooXooX....', 'XoX.XooX...', 'XX..XooX...', 'X....XooX..', '.....XooX..', '......XX...',
  ];
  function arrow(g, x, y) { bitmap(g, ARROW, Math.round(x), Math.round(y), { X: '#fff', o: '#000' }); }

  Real.Pix = { bitText, textWidth, hexRgb, PAT, pattern, fillPat, bitmap, rect, frame, line, threshold, rrect, arrow, apple: (g, x, y, h, o) => Real.D.drawApple(g, x, y, h, o) };
})(window);
