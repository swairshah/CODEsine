// washes.js: the loose watercolour laid behind each machine, painted once into its own canvas.
// A ground stroke or two in warm ochre, dragged with the side of the brush so it breaks up at the end;
// a haze of the machine's own colour dropped wet into wet behind it, and a harder patch of cool grey;
// a few flicked spots. All of it is in the machine's 1000 × 1000 frame, so it travels with the machine.
'use strict';

(function (global) {
  const { rng, noise2, fbm2, hex, mix, clamp } = Ink;
  const X0 = -250, SPAN = 1500, SIZE = 1280, K = SIZE / SPAN;
  const cache = new Map();

  // a wash colour as a filter over the paper
  const glaze = (rgb, paper) => `rgb(${[0, 1, 2].map((i) => clamp(Math.round((rgb[i] / paper[i]) * 255), 0, 255)).join(',')})`;

  // An edge that wanders gently, with a little fine irregularity, closed round (cx, cy).
  function softBlob(cx, cy, rx, ry, seed, rough = 0.18) {
    const pts = [];
    const n = 120;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const k = 1 + rough * (2 * fbm2(c * 1.3 + seed, s * 1.3 - seed) - 1) * 1.6 + 0.025 * (2 * noise2(c * 9 + seed, s * 9) - 1);
      pts.push([cx + rx * k * c, cy + ry * k * s]);
    }
    return pts;
  }
  // A brushstroke laid sideways: full in the middle, thinning to the ends, its lower edge ragged.
  function stroke(xa, xb, y, th, seed) {
    const top = [], bot = [];
    for (let x = xa; x <= xb; x += 5) {
      const u = (x - xa) / (xb - xa);
      const env = Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.32);
      const t = th * env * (0.82 + 0.36 * fbm2(x * 0.012 + seed, seed));
      const yc = y + 9 * (2 * fbm2(x * 0.004 + seed * 3, 1.7) - 1);
      top.push([x, yc - t * 0.45 + 1.5 * (2 * noise2(x * 0.15, seed) - 1)]);
      bot.push([x, yc + t * 0.55 + 3.2 * (2 * noise2(x * 0.09 + 40, seed) - 1)]);
    }
    return top.concat(bot.reverse());
  }
  function path(g, pts) {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  }

  function paint(dev, pal) {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, SIZE, SIZE);
    g.setTransform(K, 0, 0, K, -X0 * K, -X0 * K);
    g.globalCompositeOperation = 'multiply';
    const paper = pal.rgb.paper;
    const R = rng(911 + dev.index * 53), seed = dev.index * 3.7 + 1;
    const [x0, y0, x1, y1] = dev.bbox || [100, 150, 900, 850];
    const w = x1 - x0, h = y1 - y0;
    const warm = pal.rgb.warm, tint = hex(dev.tint || '#7c9cb0'), cool = [150, 152, 172];
    const gy = y1 - h * (0.06 + 0.06 * R());

    // the haze behind: dropped onto wet paper, so it has no edge at all
    const side = R() < 0.5 ? -1 : 1;
    const hx = (x0 + x1) / 2 + side * w * 0.2, hy = y0 + h * 0.35;
    g.filter = `blur(${26 * K}px)`;
    g.globalAlpha = 0.2;
    g.fillStyle = glaze(mix(tint, paper, 0.25), paper);
    path(g, softBlob(hx, hy, w * 0.55, h * 0.5, seed));
    g.fill();
    g.globalAlpha = 0.16;
    g.fillStyle = glaze(mix(warm, tint, 0.5), paper);
    path(g, softBlob(hx - side * w * 0.3, hy + h * 0.15, w * 0.3, h * 0.28, seed + 4));
    g.fill();
    g.filter = 'none';
    // a harder patch of cool grey, put in once the paper had dried, overlapping the haze
    g.globalAlpha = 0.13;
    g.fillStyle = glaze(cool, paper);
    path(g, softBlob(hx + side * w * 0.12, y0 + h * 0.2, w * 0.36, h * 0.3, seed + 9, 0.24));
    g.fill();
    // the ground: two sideways strokes of ochre, the second over the first
    g.globalAlpha = 0.38;
    g.fillStyle = glaze(warm, paper);
    path(g, stroke(x0 - 150 - R() * 60, x1 + 150 + R() * 60, gy + 30, 70 + R() * 25, seed + 2));
    g.fill();
    g.globalAlpha = 0.26;
    g.fillStyle = glaze(mix(warm, [120, 90, 70], 0.35), paper);
    path(g, stroke(x0 - 40 + R() * 60, x1 + 60 + R() * 60, gy + 52, 34 + R() * 16, seed + 6));
    g.fill();
    // dry brush: where the stroke ran out of water, the paper's tops are left bare in streaks
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) {
      const left = R() < 0.5, xe = left ? x0 - 150 + R() * 120 : x1 + 30 + R() * 140;
      const yy = gy + 30 + (R() - 0.5) * 70, len = 20 + R() * 70;
      g.globalAlpha = 0.5 + R() * 0.4;
      g.beginPath();
      g.ellipse(xe, yy, len, 0.8 + R() * 1.6, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalCompositeOperation = 'multiply';
    // a few spots flicked off the brush
    for (let i = 0; i < 14; i++) {
      const sx = x0 - 60 + R() * (w + 120), sy = gy - 40 + R() * 140, r = 0.8 + Math.pow(R(), 3) * 5;
      g.globalAlpha = 0.25 + R() * 0.35;
      g.fillStyle = glaze(R() < 0.6 ? warm : tint, paper);
      g.beginPath();
      g.arc(sx, sy, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    return c;
  }

  // Draw a machine's background washes through ctx (its current transform is the machine's frame).
  // flood, when given, is a path to clip them to.
  function draw(W, dev, pal, a, floodPath) {
    let c = cache.get(dev.index);
    if (c) { cache.delete(dev.index); cache.set(dev.index, c); }
    else {
      c = paint(dev, pal);
      cache.set(dev.index, c);
      // keep only the backgrounds of the last few machines
      if (cache.size > 5) cache.delete(cache.keys().next().value);
    }
    W.save();
    if (floodPath) W.clip(floodPath);
    W.globalCompositeOperation = 'multiply';
    W.globalAlpha = a;
    W.drawImage(c, X0, X0, SPAN, SPAN);
    W.restore();
  }

  global.Washes = { draw };
})(window);
