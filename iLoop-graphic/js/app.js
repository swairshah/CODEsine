// app.js: an endless zoom through the machines, printed as a series of screenprinted posters.
// Level L is continuous: floor(L) is the machine in front of you and frac(L) is how far you have
// travelled toward the next one. Each machine says how it leads on:
//   screen  the next machine hides in the screen as a small easter egg; you zoom into it
//   inside  the shell peels away, you zoom into the chip, and the chip becomes the next machine
//   die     as inside, but the next machine is etched into the silicon
//   assemble  you zoom into a chip, and the next machine's parts fly in and close around it
'use strict';

(function () {
  const { smooth, clamp, hex, mix, css, makePal, mixPal, drawPlate, inkPal } = Ink;
  const DEV = window.Machines.list;
  const N = DEV.length;
  const mod = (a, n) => ((a % n) + n) % n;
  const ease = (x) => x * x * (3 - 2 * x);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // The scene is drawn into an offscreen canvas in recipe colours, then printed onto the stage.
  const cv = document.getElementById('stage');
  const src = document.createElement('canvas');
  const ctx = src.getContext('2d');
  const press = window.Print ? Print.create(cv) : null;
  const plain = press ? null : cv.getContext('2d');
  const params = new URLSearchParams(location.search);
  let W = 0, H = 0, DPR = 1;

  // ---------- cameras: affine maps from a machine's 1000 × 1000 frame to the screen ----------
  function stage() {
    const top = W < 640 ? 150 : 132, bottom = W < 640 ? 96 : 92;
    const size = Math.max(160, Math.min(W - 32, H - top - bottom));
    return { cx: W / 2, cy: top + (H - top - bottom) / 2, s: size / 940, size };
  }
  function rest() {
    const st = stage();
    return [st.s, 0, 0, st.s, st.cx - 500 * st.s, st.cy - 500 * st.s];
  }
  function setM(m) {
    ctx.setTransform(DPR * m[0], DPR * m[1], DPR * m[2], DPR * m[3], DPR * m[4], DPR * m[5]);
  }
  const screenT = () => ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // child frame → this machine's frame
  const portalMap = (dev) => Af.mul(dev.marks.portal, Af.S(1 / 1000));
  // the chip, unsheared and centred, at the size you see it when you have zoomed in
  function hero(dev) {
    const F = dev.marks.focus;
    const a = Math.hypot(F[0], F[1]) / Math.hypot(F[2], F[3]);
    let w = 620, h = w / a;
    if (h > 460) { h = 460; w = h * a; }
    return [w, 0, 0, h, 500 - w / 2, 500 - h / 2];
  }
  function levelLn(k) {
    const dev = DEV[mod(k, N)].build();
    // an assembly has a lot to show, so it takes a long scroll
    if (dev.next.type === 'assemble') return dev.colors || DEV[mod(k + 1, N)].build().colors ? 6.5 : 4.2;
    return -Math.log(Af.scaleOf(portalMap(dev)));
  }

  // ---------- inks ----------
  // Every poster in the series is pulled on the same cream stock with the same black and signal red.
  // Two spot inks change from machine to machine: S, the machine's own colour, and A, an accent for the
  // poster's geometry. comp names the composition behind the machine.
  const PAPER = hex('#eee5cf'), BLACK = hex('#201c1b'), RED = hex('#d23a22');
  const POSTER = {
    'Apple I': { S: '#2e6b4c', A: '#2a53a0', comp: 'grid' },
    'Apple II': { S: '#c9b68a', A: '#efb12f', comp: 'circle' },
    'Macintosh 128K': { S: '#cdbf9d', A: '#2a53a0', comp: 'diagonal', remap: { tint2: 'tint2b' } },
    'PowerBook 100': { S: '#55534f', A: '#efb12f', comp: 'blocks' },
    'iMac G3': { S: '#16889a', A: '#ef8526', comp: 'sun' },
    'iPod': { S: '#b8bdbe', A: '#d4447c', comp: 'rings' },
    'iPhone': { S: '#8e8b86', A: '#2b67c0', comp: 'circle' },
    'MacBook Air': { S: '#cfa45c', A: '#2a53a0', comp: 'diagonal' },
    'Apple Watch': { S: '#e09d88', A: '#9bcf2a', comp: 'rings' },
    'Apple M1': { S: '#2c5a46', A: '#efb12f', comp: 'grid' },
    'iMac 24″': { S: '#5a8fd0', A: '#e98a74', comp: 'sun' },
    'MacBook Pro 14″': { S: '#6a6866', A: '#7b5fc8', comp: 'blocks' },
    'Mac mini': { S: '#b2b2ac', A: '#2d5e48', comp: 'circle' },
  };
  // a machine whose second colour is a shade of its first prints it as a darker screen of S
  for (const d of DEV) if (POSTER[d.name] && POSTER[d.name].remap) d.remap = POSTER[d.name].remap;
  const posterOf = (dev) => POSTER[dev.name] || { S: dev.tint, A: dev.tint2 || dev.tint, comp: 'circle' };
  // a pastel made into something an ink would print: the same hue, fuller
  function fuller(c, k = 1.45) {
    const l = (c[0] + c[1] + c[2]) / 3;
    return c.map((v) => clamp(l + (v - l) * k - 8, 0, 255));
  }
  let INKS = null, RECIPES = null;
  // The inks of level L: a machine's own, changing to the next machine's as you arrive at it. An iMac
  // assembling runs its seven colours through the S screen.
  function inksAt(L) {
    const K = Math.floor(L), t = L - K;
    const dev = DEV[mod(K, N)], nxt = DEV[mod(K + 1, N)];
    const a = posterOf(dev), b = posterOf(nxt);
    const k = smooth(0.55, 0.97, t);
    let S = mix(hex(a.S), hex(b.S), k), A = mix(hex(a.A), hex(b.A), k);
    if (dev.next.type === 'assemble' && nxt.colors && t > SPLIT) {
      const u = (t - SPLIT) / (1 - SPLIT), c = nxt.colors;
      const q = smooth(0.22, 0.86, u) * (c.length - 1), i = Math.min(c.length - 2, Math.floor(q));
      const run = fuller(mix(hex(c[i]), hex(c[i + 1]), q - i));
      const into = smooth(0.9, 1, u);
      S = mix(mix(S, run, smooth(0, 0.18, u)), hex(b.S), into);
    }
    return { paper: PAPER, K: BLACK, R: RED, S, A };
  }
  function setInks(L) {
    INKS = inksAt(L);
    BASE = inkPal(INKS);
    RECIPES = Object.entries(Ink.RECIPES).map(([name, r]) => ({ name, rgb: BASE.rgb[name], cov: Ink.PLATES.map((k) => r[k] || 0), solid: Ink.SOLID(r) }));
  }

  // ---------- palettes ----------
  let BASE = null;
  // A machine is printed in the poster's inks, whatever its colour in life; its own colour is the S ink.
  function withTint(pal) { return pal; }
  function withRoles(pal, map) {
    const p = Object.create(pal);
    p.rgb = Object.assign({}, pal.rgb);
    for (const k in map) { p[k] = pal[map[k]]; p.rgb[k] = pal.rgb[map[k]]; }
    return p;
  }
  const lum = (c) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
  // Etched into a die, the next machine is printed in reverse: paper lines on a solid of black.
  function invertPal(pal, dev, amt) {
    if (amt <= 0) return pal;
    const P = pal.rgb.paper, K = pal.rgb.K1, lp = lum(P);
    const rgb = {};
    for (const k in pal.rgb) rgb[k] = mix(P, K, clamp(lum(pal.rgb[k]) / lp, 0, 1));
    return mixPal(pal, makePal(rgb), amt);
  }
  // How a screen shows the next machine: each era draws it in its own way, and the colours settle
  // into the print as you zoom in. Each look maps a colour to a colour.
  const LOOKS = {
    // the Apple II's monitor: the picture glows out of the black tube in one phosphor colour
    phosphor: (c) => mix(BASE.rgb.ink, [214, 236, 196], Math.pow(clamp((lum(c) - 0.06) / 0.86, 0, 1), 0.8)),
    // MacPaint: black, white and one grey pattern
    mono: (c) => { const l = lum(c); return l > 0.62 ? BASE.rgb.light : l > 0.32 ? [140, 136, 128] : [24, 21, 18]; },
    // the PowerBook's passive-matrix LCD
    lcd: (c) => mix([44, 49, 40], [196, 201, 181], clamp(lum(c) * 1.05, 0, 1)),
    // the iPod silhouette posters: black figure, white highlights, on a bright ground
    silhouette: (c) => (lum(c) > 0.8 ? [247, 244, 236] : [22, 19, 17]),
  };
  function lookPal(pal, f, amt) {
    if (!f || amt <= 0) return pal;
    const rgb = {};
    for (const k in pal.rgb) rgb[k] = f(pal.rgb[k]);
    const out = mixPal(pal, makePal(rgb), amt);
    out.tintFn = f;
    out.tintAmt = amt;
    out.mapHex = (h) => css(mix(hex(h), f(hex(h)), amt));
    return out;
  }
  function roleRgb(c) { return c[0] === '#' ? hex(c) : BASE.rgb[c]; }

  function portalBg(dev, pal) {
    const b = dev.next.bg;
    if (b && b[0] === '#') return hex(b);
    return pal.rgb[b || 'paper'];
  }

  // ---------- state ----------
  const S = {
    L: 0, Lt: 0, anim: null, lastInput: -1e9, playing: false, playNext: 0, playArrived: 0,
    vel: 0, time: 0, idx: -1, touched: false, dir: 0, reg: 0, regV: 0, frozen: false,
  };
  const pointers = new Map();

  // ---------- drawing ----------
  const detailOf = (cam) => Af.scaleOf(cam) / 0.7;

  // Draw a machine's parts. fn(part) may return { ink, pencil, T } to fade or move a part.
  function drawParts(dev, cam, pal, fn, only) {
    const detail = detailOf(cam);
    for (const part of dev.parts) {
      if (part.name === 'glass') continue;
      if (only && !only(part)) continue;
      const r = fn ? fn(part) : null;
      const ink = r ? r.ink ?? 1 : 1, pencil = r ? r.pencil ?? ink : ink;
      if (ink < 0.003 && pencil < 0.003) continue;
      const m = r && r.T ? Af.mul(cam, r.T) : cam;
      setM(m);
      drawPlate(ctx, part.plate, pal, ink, detailOf(m), pencil);
    }
    return detail;
  }
  function drawGlass(dev, cam, pal, a) {
    const g = dev.parts.find((p) => p.name === 'glass');
    if (!g || a < 0.003) return;
    setM(cam);
    drawPlate(ctx, g.plate, pal, a, detailOf(cam));
  }
  function drawExtras(dev, cam, pal, a, more) {
    if (!dev.extras || !dev.screen || a < 0.01) return;
    setM(Af.mul(cam, dev.screen.M));
    ctx.save();
    dev.extras(ctx, { a, time: S.time, pal, W: dev.screen.w, H: dev.screen.h, ...more });
    ctx.restore();
    ctx.globalAlpha = 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  // A machine standing still, with whatever its screen shows.
  function drawAtRest(dev, cam, pal0, ink = 1, pencil = ink, pres = 1) {
    const pal = withTint(pal0, dev);
    if (pres > 0.001) drawBackdrop(dev, cam, pres, ink, pal);
    drawParts(dev, cam, pal, () => ({ ink, pencil }));
    drawExtras(dev, cam, pal, ink);
    drawGlass(dev, cam, pal, ink);
  }

  const CIRCLE = Array.from({ length: 48 }, (_, i) => [0.5 + 0.5 * Math.cos((i / 48) * 2 * Math.PI), 0.5 + 0.5 * Math.sin((i / 48) * 2 * Math.PI)]);
  function clipTo(M, round) {
    const q = (round ? CIRCLE : [[0, 0], [1, 0], [1, 1], [0, 1]]).map((p) => Af.apply(M, p));
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath();
  }

  // The next machine, drawn in the portal (a screen's easter egg, or a chip once you can see it).
  // On a screen it is there from the start, as a tiny version of the real drawing, so zooming in
  // only ever enlarges it; nothing is swapped. depth stops machines nesting forever.
  function drawPortalChild(dev, cam, t, pal0, ink, pencil, depth) {
    const nxt = DEV[mod(dev.index + 1, N)].build();
    const Mp = portalMap(dev);
    const childCam = Af.mul(cam, Mp);
    if (Af.scaleOf(childCam) * 1000 < 8) return;
    const onScreen = dev.next.type === 'screen';
    if (onScreen && EGGS[dev.next.egg]) return EGGS[dev.next.egg](dev, nxt, cam, childCam, t, ink, pencil, depth);
    const a = onScreen ? 1 : smooth(0.12, 0.34, t);
    if (a < 0.003) return;
    // The next poster's geometry is printed over the old sheet as you arrive: a circle opens, bars
    // run in. It is drawn outside the screen here and again inside it, over the screen's own ground.
    const pres = depth ? 0 : smooth(0.5, 0.97, t);
    if (pres > 0.001) drawBackdrop(nxt, childCam, pres, ink, BASE);
    setM(cam);
    ctx.save();
    const clipM = dev.marks.clip || dev.marks.portal, round = dev.marks.clipShape === 'circle';
    clipTo(clipM, round);
    ctx.clip();
    // On a screen the next machine is there from the start, drawn the way that screen would draw it,
    // so zooming only enlarges it while its colours settle into the print. A chip is reached by going
    // inside: there the machine is revealed, drawn in pencil and then inked.
    const look = onScreen && LOOKS[dev.next.look];
    const amt = 1 - smooth(0.7, 1, t);
    let bg;
    if (onScreen) {
      const own = dev.next.eggBg ? roleRgb(dev.next.eggBg) : look ? look(BASE.rgb.paper) : BASE.rgb.paper;
      bg = mix(BASE.rgb.paper, own, amt);
    } else bg = mix(portalBg(dev, withTint(pal0, dev)), BASE.rgb.paper, ease(t));
    ctx.globalAlpha = onScreen ? ink : a * ink;
    ctx.fillStyle = css(bg);
    clipTo(clipM, round);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (onScreen) drawMachine(nxt, childCam, lookPal(pal0, look, amt), ink, pencil, depth + 1, pres);
    else drawAtRest(nxt, childCam, dev.next.fg ? invertPal(pal0, dev, 1 - ease(t)) : pal0, ink * smooth(0.22, 0.62, t), pencil * smooth(0.03, 0.3, t), pres);
    ctx.restore();
  }
  // ---------- easter eggs that are events, not pictures ----------
  // Each is drawn in place of a plain portal and is driven by t, so scrolling scrubs it both ways.
  // It must end, at t = 1, on the next machine exactly as it stands at rest.
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  function pathOf(pts) {
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
  }
  function rrPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // a convex polygon cut to an axis-aligned box (Sutherland–Hodgman)
  function clipBox(poly, x0, y0, x1, y1) {
    let out = poly;
    const edges = [[(q) => q[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
      [(q) => q[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
      [(q) => q[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
      [(q) => q[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]]];
    for (const [inside, cut] of edges) {
      const src = out;
      out = [];
      for (let i = 0; i < src.length; i++) {
        const A = src[i], B = src[(i + 1) % src.length];
        if (inside(B)) { if (!inside(A)) out.push(cut(A, B)); out.push(B); }
        else if (inside(A)) out.push(cut(A, B));
      }
      if (!out.length) break;
    }
    return out;
  }

  // The sledgehammer from the advert, modelled and printed like the machines: a steel head with a
  // bevelled striking face, an ash handle and a dark grip. Built once, in centimetres.
  let HAMMER = null;
  function hammerModel() {
    if (HAMMER) return HAMMER;
    const m = new Model({ yaw: 28, pitch: 18 }, { fit: [420, 920], center: [500, 500] });
    const steel = { base: 0.88, gap: 3, w: 0.9, sheen: 0.3 }, ash = { base: 0.92, fill: 'tint', gap: 3, w: 0.8 }, grip = { base: 0.3, dark: true, fill: 'ink', gap: 2, w: 0.6 };
    m.cyl([0, -26, 0], 0.8, 25, 'y', ash, { n: 14 });
    m.cyl([0, -26.2, 0], 0.92, 8, 'y', grip, { n: 14 });
    m.box(-4.4, 0, -1.6, 8.8, 3.2, 3.2, steel, { r: 0.35 });
    for (const x of [-4.9, 4.4]) m.box(x, 0.25, -1.35, 0.5, 2.7, 2.7, { base: 0.97, gap: 2, w: 0.6, sheen: 0.4 }, { r: 0.3 });
    m.render(4242);
    HAMMER = { parts: m.parts, head: m.P([0, 1.6, 0]), len: Math.abs(m.P([0, -26, 0])[1] - m.P([0, 3.2, 0])[1]) };
    return HAMMER;
  }
  // the hammer is printed red, the colour of the runner's shorts
  const HAMMER_PAL = () => withRoles(BASE, { tint: 'R1', tint2: 'K1' });
  function drawHammer(ui, pos, rot, sc, a) {
    const h = hammerModel();
    const k = (130 / h.len) * sc;
    const M = Af.chain(ui, Af.T(pos[0], pos[1]), Af.R(rot), Af.S(k), Af.T(-h.head[0], -h.head[1]));
    for (const part of h.parts) {
      setM(M);
      drawPlate(ctx, part.plate, HAMMER_PAL(), a, detailOf(M), a);
    }
  }

  const EGGS = {
    // Apple II → Macintosh: the 1984 advert. A sledgehammer spins in and shatters Big Brother's
    // telescreen; the glass flies out in a flash of light, and the Macintosh is drawn in the light.
    '1984'(dev, nxt, cam, childCam, t, ink, pencil, depth) {
      const W = dev.screen.w, H = dev.screen.h, R = 21, I = [150, 140], hit = 0.3;
      const ui = Af.mul(cam, dev.screen.M);
      const k = Af.scaleOf(ui);
      if (!dev.shards) {
        // radial cracks from the point of impact, two rings of them, cut to the tube
        let r = 11;
        const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
        const n = 17, angles = Array.from({ length: n }, (_, i) => ((i + 0.2 + rnd() * 0.6) / n) * 2 * Math.PI);
        const rings = [0, 22 + rnd() * 8, 52 + rnd() * 12, 100 + rnd() * 20, 400];
        dev.shards = [];
        for (let i = 0; i < n; i++) for (let j = 0; j < rings.length - 1; j++) {
          const a0 = angles[i], a1 = angles[(i + 1) % n] + (i === n - 1 ? 2 * Math.PI : 0);
          const p = (a, rr) => [I[0] + rr * Math.cos(a), I[1] + rr * Math.sin(a)];
          const poly = clipBox(j === 0 ? [I, p(a0, rings[1]), p(a1, rings[1])] : [p(a0, rings[j]), p(a0, rings[j + 1]), p(a1, rings[j + 1]), p(a1, rings[j])], 0, 0, W, H);
          if (poly.length < 3) continue;
          const c = poly.reduce((m, q) => [m[0] + q[0] / poly.length, m[1] + q[1] / poly.length], [0, 0]);
          const d = Math.hypot(c[0] - I[0], c[1] - I[1]) || 1;
          dev.shards.push({ poly, c, dir: [(c[0] - I[0]) / d, (c[1] - I[1]) / d], dist: d, spin: (rnd() - 0.5) * 5, lift: 0.6 + rnd() * 1.4 });
        }
      }
      const after = clamp((t - hit) / (1 - hit), 0, 1);
      if (t > hit) {
        // behind the glass: white light, settling to paper
        setM(ui);
        ctx.save();
        rrPath(0, 0, W, H, R);
        ctx.clip();
        ctx.globalAlpha = ink;
        ctx.fillStyle = css(mix(BASE.rgb.light, BASE.rgb.paper, smooth(0.15, 0.7, after)));
        ctx.fillRect(-W, -H, 3 * W, 3 * H);
        ctx.restore();
        // the Macintosh, printed into the light, and its poster opening out of the broken screen
        const pres = depth ? 0 : smooth(0.35, 0.95, after);
        if (pres > 0.001) drawBackdrop(nxt, childCam, pres, ink, BASE);
        drawMachine(nxt, childCam, BASE, ink * smooth(0.12, 0.45, after), pencil * smooth(0.02, 0.2, after), depth + 1, pres);
        // the line that closed the advert
        const say = smooth(0.18, 0.32, after) * (1 - smooth(0.62, 0.8, after));
        if (say > 0.01) {
          setM(ui);
          ctx.globalAlpha = say * ink;
          ctx.fillStyle = BASE.ink;
          ctx.font = `italic 400 11px ${Ink.FONTS.serif}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('…and you’ll see why 1984 won’t be like “1984.”', W / 2, 36);
        }
        // the glass flies out at you, turning, and is gone
        setM(ui);
        for (const sh of dev.shards) {
          const e = 1 - Math.pow(1 - after, 2.2);
          const a = ink * (1 - smooth(0.25, 0.75, after));
          if (a < 0.01) break;
          const go = (40 + sh.dist * 1.6) * e;
          const sc = 1 + sh.lift * e;
          ctx.save();
          ctx.translate(sh.c[0] + sh.dir[0] * go, sh.c[1] + sh.dir[1] * go - 30 * e * sh.lift);
          ctx.rotate(sh.spin * e);
          ctx.scale(sc, sc);
          ctx.translate(-sh.c[0], -sh.c[1]);
          // clear glass: a faint tint of the tube, bright broken edges, and a glint across each piece
          ctx.globalAlpha = a * 0.28;
          pathOf(sh.poly);
          ctx.fillStyle = '#26302a';
          ctx.fill();
          ctx.globalAlpha = a;
          ctx.lineWidth = 0.7;
          ctx.strokeStyle = '#fbf8f0';
          ctx.stroke();
          ctx.globalAlpha = a * 0.5;
          ctx.lineWidth = 0.45;
          ctx.strokeStyle = BASE.ink;
          ctx.beginPath();
          ctx.moveTo(sh.poly[0][0], sh.poly[0][1]);
          ctx.lineTo(sh.poly[1][0], sh.poly[1][1]);
          ctx.stroke();
          ctx.globalAlpha = a * 0.9;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.6;
          const q = sh.poly, m1 = lerp2(q[0], q[1 % q.length], 0.3), m2 = lerp2(q[2 % q.length], q[0], 0.6);
          ctx.beginPath();
          ctx.moveTo(m1[0], m1[1]);
          ctx.lineTo(lerp2(m1, m2, 0.5)[0], lerp2(m1, m2, 0.5)[1]);
          ctx.stroke();
          ctx.restore();
        }
        // the flash at the moment of impact
        const flash = 1 - smooth(0, 0.16, after);
        if (flash > 0.01) {
          ctx.save();
          rrPath(-20, -20, W + 40, H + 40, R);
          ctx.globalAlpha = flash * ink;
          ctx.fillStyle = '#fffdf6';
          ctx.fill();
          ctx.restore();
        }
      } else if (t > 0.02) {
        // the hammer, thrown from below and turning end over end toward the screen, with a blur behind it
        const at = (h) => ({ pos: lerp2([-90, H + 140], I, h), rot: -3.4 * Math.PI * (1 - h) - 0.5, sc: lerp(2.6, 0.9, h) });
        const h = smooth(0.02, hit, t);
        for (let g = 5; g >= 0; g--) {
          const s = at(Math.max(0, h - g * 0.018));
          drawHammer(ui, s.pos, s.rot, s.sc, ink * smooth(0.02, 0.06, t) * (g ? 0.12 * (1 - g / 6) : 1));
        }        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },

    // iPhone → MacBook Air: the Mail icon's envelope opens, turns into the interoffice envelope from
    // Macworld 2008, and the MacBook Air is pulled out of it and laid down on top.
    mail(dev, nxt, cam, childCam, t, ink, pencil, depth) {
      // paced by how large the tile is on screen, not by scroll: it plays out once you can see it
      const grown = Af.scaleOf(childCam) / Af.scaleOf(rest());
      const u = clamp(1 + Math.log(grown) / Math.log(5), 0, 1);
      const flap = smooth(0.02, 0.2, u), out = smooth(0.16, 0.5, u), lay = smooth(0.5, 0.9, u);
      const k = Af.scaleOf(childCam), npal = withTint(BASE, nxt);
      const lw = (px) => px / k;
      // the tile
      setM(cam);
      ctx.save();
      clipTo(dev.marks.portal);
      ctx.globalAlpha = ink;
      ctx.fillStyle = css(mix(hex(dev.next.eggBg), BASE.rgb.paper, smooth(0.25, 0.75, u)));
      ctx.fill();
      ctx.restore();
      const pres = depth ? 0 : smooth(0.5, 1, u);
      if (pres > 0.001) drawBackdrop(nxt, childCam, pres, ink, BASE);
      // the envelope: a white Mail envelope, front on, that becomes the manila one lying on the table
      const E0 = [[170, 330], [830, 330], [830, 730], [170, 730]];
      const E1 = nxt.model.envelope.map((q) => nxt.model.P(q));
      const E = E0.map((q, i) => lerp2(q, E1[i], lay));
      const white = [244, 241, 232], manila = hex(nxt.tint);
      const paperCol = css(mix(white, manila, smooth(0.1, 0.6, out + lay * 0.5)));
      const real = smooth(0.82, 1, u);
      const flapTip = [500, lerp(560, 120, flap)];
      const flapPts = [E[0], E[1], lerp2(flapTip, [(E[0][0] + E[1][0]) / 2, (E[0][1] + E[1][1]) / 2], lay)];
      const drawFlap = () => {
        if (lay > 0.98) return;
        setM(childCam);
        ctx.globalAlpha = ink * (1 - lay);
        pathOf(flapPts);
        ctx.fillStyle = css(mix(mix(white, manila, smooth(0.1, 0.6, out)), [0, 0, 0], flap > 0.5 ? 0.1 : 0));
        ctx.fill();
        ctx.lineWidth = lw(1.3);
        ctx.strokeStyle = BASE.ink;
        ctx.stroke();
      };
      const drawFront = () => {
        setM(childCam);
        ctx.globalAlpha = ink * (1 - real);
        pathOf(E);
        ctx.fillStyle = paperCol;
        ctx.fill();
        ctx.lineWidth = lw(1.4);
        ctx.strokeStyle = BASE.ink;
        ctx.stroke();
        // the folds of a Mail envelope, from its bottom corners to the middle
        ctx.globalAlpha = ink * (1 - real) * (1 - lay) * 0.6;
        ctx.beginPath();
        const mid = lerp2(E[0], E[2], 0.55);
        ctx.moveTo(E[3][0], E[3][1]); ctx.lineTo(mid[0], mid[1]); ctx.lineTo(E[2][0], E[2][1]);
        ctx.stroke();
        if (real > 0.003) drawParts(nxt, childCam, npal, () => ({ ink: ink * real, pencil: pencil * real }), (p) => p.name === 'envelope');
      };
      // the laptop: small and hidden in the envelope, drawn up out of its mouth, then laid down at rest
      const sc = lerp(lerp(0.6, 0.66, out), 1, lay);
      const cy = lerp(lerp(640, 150, out), 500, lay);
      const T = Af.chain(Af.T(500, cy), Af.S(sc), Af.T(-500, -500));
      const camL = Af.mul(childCam, T);
      const laptop = () => {
        drawParts(nxt, camL, npal, () => ({ ink, pencil }), (p) => p.name !== 'envelope' && p.name !== 'body');
        if (depth < 2 && nxt.next.type === 'screen') drawPortalChild(nxt, camL, 0, BASE, ink, pencil, depth + 1);
        drawGlass(nxt, camL, npal, ink);
      };
      const inside = out < 0.97 && lay < 0.01;
      if (flap > 0.5) drawFlap();
      if (inside) {
        // while it is inside, only what has cleared the envelope's mouth shows
        setM(childCam);
        ctx.save();
        ctx.beginPath();
        ctx.rect(-4000, -4000, 9000, 4000 + 330);
        ctx.clip();
        if (out > 0.01) laptop();
        ctx.restore();
        drawFront();
      } else {
        drawFront();
        laptop();
      }
      if (flap <= 0.5) drawFlap();
      ctx.globalAlpha = 1;
    },

    // MacBook Air → Apple Watch: Time Machine's clock in the Dock runs forward from 2008 to 2015,
    // its face rounds into the watch's display, the case and band close round it, and the Activity
    // rings sweep shut.
    clock(dev, nxt, cam, childCam, t, ink, pencil, depth) {
      const grown = Af.scaleOf(childCam) / Af.scaleOf(rest());
      const u = clamp(1 + Math.log(grown) / Math.log(6), 0, 1);
      const spin = smooth(0, 0.45, u), morph = smooth(0.3, 0.7, u), build = smooth(0.42, 0.85, u), real = smooth(0.86, 1, u);
      const md = nxt.marks.display, k = Af.scaleOf(childCam), npal = withTint(BASE, nxt);
      // a ripple of paper spreads from the clock as you go forward in time
      if (u > 0.25) {
        setM(childCam);
        ctx.globalAlpha = ink;
        ctx.fillStyle = BASE.paper;
        ctx.beginPath();
        ctx.arc(500, 500, lerp(0, 820, smooth(0.28, 0.85, u)), 0, 2 * Math.PI);
        ctx.fill();
      }
      const pres = depth ? 0 : smooth(0.45, 1, u);
      if (pres > 0.001) drawBackdrop(nxt, childCam, pres, ink, BASE);
      // the band slides in from both ends, the case closes round the face
      if (build > 0.003) {
        drawParts(nxt, childCam, npal, (part) => {
          if (part.name === 'inside' || part.name === 'display') return null;
          const r = { ink: ink * build, pencil: pencil * smooth(0.36, 0.6, u) };
          if (part.fly && part.fly.d3) { const o = nxt.model.PL(part.fly.d3); r.T = Af.T(o[0] * (1 - build), o[1] * (1 - build)); }
          return r;
        });
        setM(childCam);
        ctx.globalAlpha = ink * build * (1 - real);
        pathOf(nxt.model.watchTop.map((q) => nxt.model.P(q)));
        ctx.fillStyle = BASE.light;
        ctx.fill();
        ctx.lineWidth = 1.2 / k;
        ctx.strokeStyle = BASE.ink;
        ctx.stroke();
      }
      // the face: a circle in unit coordinates, becoming the display's rounded rectangle
      const F0 = [380, 0, 0, 380, 500, 500], F1 = Af.mul(md, [0.5, 0, 0, 0.5, 0.5, 0.5]);
      const Fm = F0.map((v, i) => lerp(v, F1[i], morph));
      const shape = Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * 2 * Math.PI, c = Math.cos(a), sn = Math.sin(a);
        const q = [Math.sign(c) * Math.pow(Math.abs(c), 0.4), Math.sign(sn) * Math.pow(Math.abs(sn), 0.4)];
        return lerp2(Af.apply(F0, [c, sn]), Af.apply(F1, q), morph);
      });
      const fa = ink * (1 - real);
      if (fa > 0.003) {
        setM(childCam);
        ctx.save();
        pathOf(shape);
        ctx.globalAlpha = fa;
        ctx.fillStyle = css(mix([31, 91, 79], [8, 8, 9], morph));
        ctx.fill();
        if (morph < 1) {
          ctx.globalAlpha = fa * (1 - morph);
          ctx.lineWidth = 60 * (1 - morph) + 1 / k;
          ctx.strokeStyle = '#cfccc4';
          ctx.stroke();
          ctx.globalAlpha = fa;
        }
        ctx.clip();
        // in the display's own pixels, 312 × 390, the same as the watch face it becomes
        setM(Af.chain(childCam, Fm, [2 / 312, 0, 0, 2 / 390, -1, -1]));
        const cx = 156, cy = 195;
        const tick = fa * (1 - morph);
        if (tick > 0.003) {
          ctx.globalAlpha = tick;
          ctx.strokeStyle = '#f4f1e8';
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * 2 * Math.PI;
            ctx.lineWidth = i % 3 ? 5 : 10;
            ctx.beginPath();
            ctx.moveTo(cx + 120 * Math.cos(a), cy + 150 * Math.sin(a));
            ctx.lineTo(cx + 140 * Math.cos(a), cy + 175 * Math.sin(a));
            ctx.stroke();
          }
        }
        // the hands, sweeping forward through seven years and coming to rest at 10:09
        const hands = fa * (1 - smooth(0.45, 0.66, u));
        if (hands > 0.003) {
          const mA = (2 * Math.PI * 9) / 60 - 2 * Math.PI * 7 * 12 * (1 - spin) - Math.PI / 2;
          const hA = (2 * Math.PI * (10 + 9 / 60)) / 12 - 2 * Math.PI * 7 * (1 - spin) - Math.PI / 2;
          ctx.globalAlpha = hands;
          ctx.strokeStyle = '#f4f1e8';
          ctx.lineCap = 'round';
          for (const [a, len, w] of [[hA, 80, 14], [mA, 128, 9]]) {
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + len * Math.cos(a), cy + len * 1.25 * Math.sin(a));
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
          ctx.fillStyle = '#fa114f';
          ctx.beginPath();
          ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
          ctx.fill();
        }
        // the years go by
        const yr = fa * smooth(0.02, 0.08, u) * (1 - smooth(0.4, 0.55, u));
        if (yr > 0.003) {
          ctx.globalAlpha = yr;
          ctx.fillStyle = '#f4f1e8';
          ctx.font = `600 54px ${Ink.FONTS.mono}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(2008 + Math.round(8 * spin)), cx, cy + 92);
        }
        // the Activity rings close
        const ringsA = fa * smooth(0.5, 0.72, u), close = smooth(0.55, 0.92, u);
        if (ringsA > 0.003) {
          ctx.lineWidth = 22;
          for (const [on, off, r, f] of nxt.rings) {
            ctx.globalAlpha = ringsA;
            ctx.strokeStyle = off;
            ctx.beginPath();
            ctx.arc(cx, 214, r, 0, 2 * Math.PI);
            ctx.stroke();
            if (close > 0.003) {
              ctx.strokeStyle = on;
              ctx.beginPath();
              ctx.arc(cx, 214, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * f * close);
              ctx.stroke();
            }
          }
          ctx.globalAlpha = fa * smooth(0.72, 0.9, u);
          ctx.textBaseline = 'middle';
          ctx.font = `500 32px ${Ink.FONTS.mono}`;
          ctx.textAlign = 'right';
          ctx.fillStyle = '#f4f1e8';
          ctx.fillText('10:09', 312 - 22, 34);
          ctx.font = `600 20px ${Ink.FONTS.mono}`;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#a6ff00';
          ctx.fillText('FRI 16', 22, 34);
        }
        ctx.restore();
      }
      // and it is the watch
      if (real > 0.003) {
        drawParts(nxt, childCam, npal, () => ({ ink: ink * real, pencil: pencil * real }), (p) => p.name === 'display');
        drawGlass(nxt, childCam, npal, ink * real);
      }
      ctx.globalAlpha = 1;
    },
  };

  // ---------- keeping the poster clear of the type ----------
  // The page's own type (caption, buttons, hint, the rail) and the colour bar are
  // measured, in css px, whenever the window or the fonts change. The poster's shapes are cut away
  // from the caption with a margin, and each year is set where it touches none of it.
  const LAY = { caps: [], tools: null, foot: null, view: [0, 0, 0, 0], key: '' };
  const grow = (r, m) => [r[0] - m, r[1] - m, r[2] + m, r[3] + m];
  const rectOf = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
  const meets = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  function measure() {
    const cap = ui.cap, prevT = cap.style.transform;
    cap.style.transform = 'none';
    LAY.caps = DEV.map((d, i) => {
      setCaption(i);
      let r = null;
      for (const el of cap.children) {
        const b = rectOf(el);
        if (b[2] - b[0] < 1) continue;
        r = r ? [Math.min(r[0], b[0]), Math.min(r[1], b[1]), Math.max(r[2], b[2]), Math.max(r[3], b[3])] : b;
      }
      return r || [0, 0, 0, 0];
    });
    cap.style.transform = prevT;
    S.idx = -1;
    LAY.tools = rectOf(document.querySelector('.tools'));
    // the rail runs along the bottom, or on a phone along the top with the buttons at the bottom
    const rail = rectOf(document.querySelector('.rail')), atTop = rail[1] < H / 2;
    LAY.view = [28, atTop ? rail[3] + 10 : 20, W - 28, (atTop ? LAY.tools[1] : rail[1]) - 10];
    // the hint sits in the band above the rail (or the buttons), centred
    const hint = document.createRange();
    hint.selectNodeContents(ui.hint);
    const hb = hint.getBoundingClientRect();
    const half = Math.min(W / 2 - 16, Math.max(380, hb.width / 2 + 40));
    LAY.foot = [W / 2 - half, H - 150, W / 2 + half, LAY.view[3] + 10];
    LAY.key = `${W}x${H}:${Date.now()}`;
    for (const d of DEV) d.spots = null;
  }
  // The caption's knock-out follows the caption as it fades: it closes into its corner.
  function knockout() {
    const i = mod(Math.round(S.L), N), r = LAY.caps[i];
    const k = document.body.classList.contains('notes-off') ? 0 : clamp(1 - Math.abs(S.L - Math.round(S.L)) * 5, 0, 1);
    screenT();
    ctx.beginPath();
    ctx.rect(-10, -10, W + 20, H + 20);
    if (r && k > 0.01) {
      const g = grow(r, 18);
      ctx.rect(g[0], g[1], (g[2] - g[0]) * k, (g[3] - g[1]) * k);
    }
    ctx.clip('evenodd');
  }
  // Where the machine itself is, as a coarse grid over its frame, so a year is not hidden behind it.
  function occupancy(dev) {
    if (dev.occ) return dev.occ;
    const n = 50, cell = 1400 / n, o = -200, grid = new Uint8Array(n * n);
    const m = dev.model;
    for (const part of dev.parts) for (const op of part.ops) {
      if (op.kind !== 'face' || !op.pts || op.pts.length < 3) continue;
      if (m.cam(op.n)[2] <= 0.02 && !op.twoSided) continue;
      const P = op.pts.map(m.P);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const q of P) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      for (let gy = Math.max(0, Math.floor((y0 - o) / cell)); gy <= Math.min(n - 1, Math.floor((y1 - o) / cell)); gy++)
        for (let gx = Math.max(0, Math.floor((x0 - o) / cell)); gx <= Math.min(n - 1, Math.floor((x1 - o) / cell)); gx++) {
          if (grid[gy * n + gx]) continue;
          if (Ink.inside(P, o + (gx + 0.5) * cell, o + (gy + 0.5) * cell)) grid[gy * n + gx] = 1;
        }
    }
    dev.occ = { grid, n, cell, o };
    return dev.occ;
  }
  function covered(dev, b) {
    const { grid, n, cell, o } = occupancy(dev);
    let hit = 0, tot = 0;
    for (let y = b[1] + cell / 2; y < b[3]; y += cell) for (let x = b[0] + cell / 2; x < b[2]; x += cell) {
      tot++;
      const gx = Math.floor((x - o) / cell), gy = Math.floor((y - o) / cell);
      if (gx >= 0 && gy >= 0 && gx < n && gy < n && grid[gy * n + gx]) hit++;
    }
    return tot ? hit / tot : 0;
  }
  // Places a year may go, in each composition's order of preference: in the corners of the frame,
  // or out in the margins beside it when the window is wide.
  const SPOT_ORDER = {
    circle: ['BR', 'OR', 'TR', 'ORT', 'BL', 'OL'],
    diagonal: ['BL', 'OL', 'BR', 'OR', 'TR', 'ORT'],
    sun: ['BR', 'OR', 'ORT', 'TR', 'BL', 'OL'],
    grid: ['BL', 'OL', 'BR', 'OR', 'TR', 'ORT'],
    rings: ['TR', 'ORT', 'BR', 'OR', 'BL', 'OL'],
    blocks: ['BR', 'OR', 'TR', 'ORT', 'BL', 'OL'],
  };
  function anchor(key, size) {
    const top = 40 + size * 0.86, bot = 985;
    return {
      BR: [962, bot, 'right'], BL: [38, bot, 'left'], TR: [962, top, 'right'], TL: [38, top, 'left'],
      OR: [1030, bot, 'left'], ORT: [1030, top, 'left'], OL: [-30, bot, 'right'],
    }[key];
  }
  function yearSpot(dev, comp, base) {
    dev.spots = dev.spots || {};
    if (dev.spots[LAY.key]) return dev.spots[LAY.key];
    // the year is measured in its own face; until that has loaded, place it but do not remember it
    const ready = !document.fonts || document.fonts.check(`400 100px ${Ink.FONTS.display}`);
    const R = rest(), str = String(dev.year);
    const toScreen = (b) => {
      const p = Af.apply(R, [b[0], b[1]]), q = Af.apply(R, [b[2], b[3]]);
      return [p[0], p[1], q[0], q[1]];
    };
    const avoid = [grow(LAY.caps[dev.index] || [0, 0, 0, 0], 22), grow(LAY.tools, 12), LAY.foot];
    const view = LAY.view;
    let best = null;
    for (const f of [1, 0.82, 0.66, 0.52]) {
      const size = base * f;
      ctx.font = `400 ${size}px ${Ink.FONTS.display}`;
      const w = ctx.measureText(str).width + size * 0.04;
      for (const key of SPOT_ORDER[comp] || SPOT_ORDER.circle) {
        const [x, y, align] = anchor(key, size);
        const x0 = align === 'right' ? x - w : x;
        const b = [x0, y - size * 0.86, x0 + w, y + size * 0.02];
        const sb = toScreen(b);
        if (sb[0] < view[0] || sb[1] < view[1] || sb[2] > view[2] || sb[3] > view[3]) continue;
        if (avoid.some((r) => r && meets(sb, r))) continue;
        // the constructivist banner is type too
        if (comp === 'diagonal' && meets(b, [600, 180, 1070, 460])) continue;
        const cov = covered(dev, b);
        const spot = { x, y, size, align, cov };
        if (cov < 0.12) { if (ready) dev.spots[LAY.key] = spot; return spot; }
        if (!best || cov < best.cov - 0.05) best = spot;
      }
    }
    // nothing clear of the machine: the least hidden place that is clear of the type, or a small year
    // in the top corner as a last resort
    const spot = best || { x: 962, y: 40 + 90 * 0.86, size: 90, align: 'right' };
    if (ready) dev.spots[LAY.key] = spot;
    return spot;
  }

  // ---------- the poster behind each machine ----------
  // Big flat shapes of ink in the machine's own 1000 × 1000 frame, so they zoom with it, and the year
  // set huge in a condensed grotesque. pres runs from 0 to 1 as a poster arrives, and the plates print
  // in a printer's order: the accent first, then the red, then the black key, and the year last.
  const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
  function drawBackdrop(dev, cam, pres, a, pal) {
    if (a < 0.003 || pres <= 0.001) return;
    const comp = posterOf(dev).comp;
    const pA = easeOut(smooth(0, 0.5, pres)), pR = easeOut(smooth(0.18, 0.7, pres)), pK = easeOut(smooth(0.4, 0.86, pres)), pY = smooth(0.5, 1, pres);
    ctx.save();
    // the caption is knocked out of the poster's shapes
    knockout();
    setM(cam);
    ctx.globalAlpha = Math.min(1, a);
    const disc = (role, x, y, r) => {
      if (r <= 0.5) return;
      ctx.fillStyle = pal[role];
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
    };
    // a bar from p to q, w wide, that runs in from p; k is how far it has run
    const bar = (role, p, q, w, k) => {
      if (k <= 0.001) return;
      const e = lerp2(p, q, k), d = sub2(q, p), l = Math.hypot(d[0], d[1]), nx = (-d[1] / l) * w * 0.5, ny = (d[0] / l) * w * 0.5;
      ctx.fillStyle = pal[role];
      pathOf([[p[0] + nx, p[1] + ny], [e[0] + nx, e[1] + ny], [e[0] - nx, e[1] - ny], [p[0] - nx, p[1] - ny]]);
      ctx.fill();
    };
    // a block that grows out of one of its sides ('l', 'r', 'u' or 'd')
    const block = (role, x, y, w, h, k, from) => {
      if (k <= 0.001) return;
      ctx.fillStyle = pal[role];
      if (from === 'l') ctx.fillRect(x, y, w * k, h);
      else if (from === 'r') ctx.fillRect(x + w * (1 - k), y, w * k, h);
      else if (from === 'u') ctx.fillRect(x, y, w, h * k);
      else ctx.fillRect(x, y + h * (1 - k), w, h * k);
    };
    // the year, each figure rising into place out of a slot, one after another
    const year = (base, role) => {
      if (pY <= 0.001) return;
      const { x, y, size, align } = yearSpot(dev, comp, base);
      const str = String(dev.year);
      ctx.font = `400 ${size}px ${Ink.FONTS.display}`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.01}px`;
      const ws = [...str].map((ch) => ctx.measureText(ch).width);
      const tot = ws.reduce((m, v) => m + v, 0);
      let cx = align === 'right' ? x - tot : align === 'center' ? x - tot / 2 : x;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 4, y - size * 0.86, tot + 8, size * 0.9);
      ctx.clip();
      ctx.fillStyle = pal[role];
      [...str].forEach((ch, i) => {
        const k = easeOut(smooth(i * 0.13, i * 0.13 + 0.55, pY));
        // a paper keyline round each figure keeps it clear of the shapes it is printed over
        ctx.strokeStyle = pal.paper;
        ctx.lineWidth = size * 0.05;
        ctx.lineJoin = 'miter';
        ctx.strokeText(ch, cx, y + (1 - k) * size * 0.95);
        ctx.fillText(ch, cx, y + (1 - k) * size * 0.95);
        cx += ws[i];
      });
      ctx.restore();
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    };
    switch (comp) {
      case 'circle':
        // Bauhaus: a red sun behind, a square of the accent, and a black bar across
        disc('R1', 335, 395, 300 * pR);
        block('A1', 60, 575, 285, 285, pA, 'd');
        bar('K1', [-140, 90], [600, 720], 62, pK);
        year(205, 'K1');
        break;
      case 'diagonal': {
        // constructivist: a red band and a black bar running up the sheet, and a slogan banner
        bar('A1', [-320, 1330], [1320, 300], 24, pA);
        bar('R1', [-320, 1160], [1320, 130], 300, pR);
        bar('K1', [-320, 860], [1320, -170], 54, pK);
        year(215, 'K1');
        if (pY > 0.001) {
          const ang = Math.atan2(130 - 1160, 1320 + 320), k = easeOut(smooth(0.1, 0.8, pY));
          ctx.save();
          ctx.translate(835, 318);
          ctx.rotate(ang);
          const name = dev.name.toUpperCase();
          ctx.font = `400 40px ${Ink.FONTS.display}`;
          const tw = ctx.measureText(name).width + 44;
          ctx.beginPath();
          ctx.rect(-tw / 2 - 40, -40, (tw + 40) * k, 80);
          ctx.clip();
          ctx.fillStyle = pal.K1;
          ctx.fillRect(-tw / 2, -32, tw, 64);
          ctx.fillStyle = pal.paper;
          ctx.fillRect(-tw / 2 + 5, -27, tw - 10, 54);
          ctx.fillStyle = pal.K1;
          ctx.fillRect(-tw / 2 + 9, -23, tw - 18, 46);
          ctx.fillStyle = pal.paper;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(name, 0, 3);
          ctx.fillStyle = pal.R1;
          ctx.fillRect(-tw / 2 - 26, -23, 15, 46);
          ctx.restore();
        }
        break;
      }
      case 'sun': {
        // a sunset poster: a red sun cut by paper stripes, sinking into a field of the accent
        const hz = 770;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-600, -600, 2200, 600 + hz);
        ctx.clip();
        disc('R1', 500, hz - 40, 420 * pR);
        ctx.fillStyle = pal.paper;
        for (let i = 0, y = hz - 230; i < 7; i++) {
          const th = 6 + i * 4.5;
          if (pR > 0.02) ctx.fillRect(-600, y, 2200, th);
          y += th + 26 - i * 1.5;
        }
        ctx.restore();
        block('A1', -600, hz, 2200, 900, pA, 'u');
        bar('K1', [-600, hz], [1600, hz], 9, pK);
        year(190, 'K1');
        break;
      }
      case 'grid':
        // Swiss: a red field to the right of a ruled grid, an accent square, and the year in the corner
        block('R1', 430, -600, 1300, 2200, pR, 'l');
        block('A1', 820, 40, 140, 140, pA, 'd');
        bar('K1', [430, -600], [430, 1600], 6, pK);
        bar('K1', [-600, 178], [1600, 178], 4, pK);
        bar('K1', [1600, 852], [-600, 852], 4, pK);
        year(250, 'K1');
        break;
      case 'rings':
        // a target: a disc of the accent, a paper ring, a red disc, and a black rule beneath
        disc('A1', 500, 500, 450 * pA);
        disc('paper', 500, 500, 395 * pR);
        disc('R1', 500, 500, 372 * pR);
        block('K1', -600, 920, 2200, 34, pK, 'l');
        year(175, 'K1');
        break;
      case 'blocks':
      default:
        // stacked blocks: a black column, an accent square, a red square, and the year in red
        block('K1', 70, -600, 92, 2200, pK, 'u');
        block('A1', 610, 50, 350, 350, pA, 'r');
        block('R1', 190, 610, 330, 330, pR, 'd');
        year(210, 'R1');
        break;
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawMachine(dev, cam, pal0, ink = 1, pencil = ink, depth = 0, pres = 0) {
    drawAtRest(dev, cam, pal0, ink, pencil, pres);
    if (depth < 2 && dev.next.type === 'screen') drawPortalChild(dev, cam, 0, pal0, ink, pencil, depth);
  }

  // screen, inside, die: zoom into a marked rectangle with the next machine in it.
  function renderPortal(dev, nxt, t) {
    const Mp = portalMap(dev);
    const cam = Af.mul(rest(), Af.pow(Af.inv(Mp), t));
    const pal = withTint(BASE, dev);
    const bodyA = 1 - smooth(0.8, 1, t);
    const peeled = (part) => {
      let a = bodyA;
      let T = null;
      if (part.peel) {
        const k = smooth(part.peel[0], part.peel[1], t);
        a *= 1 - k;
        if (part.lift) T = Af.T(part.lift[0] * k, part.lift[1] * k);
      }
      return { ink: a, pencil: a, T };
    };
    if (dev.next.swipe) {
      // Go inside to the chip and look at it; then the whole view is swiped away like a card and the
      // next machine slides in on its own card behind it.
      const sw = easeInOut(smooth(0.55, 0.92, t));
      const off = sw * W * 1.04;
      const camS = Af.mul(Af.T(-off, 0), cam);
      drawBackdrop(dev, camS, 1, 1, pal);
      drawParts(dev, camS, pal, (part) => ({ ...peeled(part), ink: peeled(part).ink / Math.max(bodyA, 1e-6) }));
      drawExtras(dev, camS, pal, 1 - smooth(0.25, 0.8, t));
      if (sw > 0.001) {
        const x = W * 1.04 - off;
        screenT();
        ctx.globalAlpha = 1;
        // the next sheet, pulled across like a fresh print laid on the stack, with a black edge
        ctx.fillStyle = BASE.paper;
        ctx.fillRect(x, 0, W * 1.1, H);
        ctx.fillStyle = BASE.K1;
        ctx.fillRect(x - 5, 0, 5, H);
        drawMachine(nxt, Af.mul(Af.T(x, 0), rest()), BASE, 1, 1, 0, 1);
      }
      return;
    }
    drawBackdrop(dev, cam, 1, bodyA, pal);
    drawParts(dev, cam, pal, peeled);
    drawExtras(dev, cam, pal, bodyA * (1 - smooth(0.25, 0.8, t)));
    drawPortalChild(dev, cam, t, BASE, 1, 1, 0);
    drawGlass(dev, cam, pal, bodyA * (1 - smooth(0.35, 0.9, t)));
  }

  // assemble: zoom into the focus chip, then the next machine's parts fly in and close around it.
  const SPLIT = 0.38;
  function renderAssemble(dev, nxt, t) {
    const H = hero(dev);
    const Mf = dev.marks.focus, Ma = nxt.marks.anchor;
    const pal = withTint(BASE, dev);
    let npal = withTint(BASE, nxt);
    if (t <= SPLIT) {
      const cam = Af.mul(rest(), Af.pow(Af.mul(H, Af.inv(Mf)), t / SPLIT));
      drawBackdrop(dev, cam, 1, 1 - 0.55 * smooth(0.5, 1, t / SPLIT), pal);
      drawParts(dev, cam, pal, (part) => (part.name === 'focus' ? null : { ink: 1 - 0.55 * smooth(0.5, 1, t / SPLIT) }));
      return;
    }
    const u = (t - SPLIT) / (1 - SPLIT);
    // (an iMac runs through its colours in the S ink itself: see inksAt)
    // An exploded assembly pulls back quickly, and further than usual, so the whole diagram fits.
    const exploded = nxt.parts.some((p) => p.fly && p.fly.d3);
    const cu = exploded ? 1 - Math.pow(1 - u, 2.6) : u;
    const back = exploded ? 1 - 0.46 * Math.pow(Math.sin(Math.PI * clamp(u / 0.97, 0, 1)), 1.3) : 1;
    const Z = Af.chain(Af.T(500, 500), Af.S(back), Af.T(-500, -500));
    const camC = Af.chain(rest(), Z, Af.pow(Af.mul(H, Af.inv(Ma)), 1 - cu));
    const camP = Af.chain(camC, Ma, Af.inv(Mf));
    drawBackdrop(dev, camP, 1, 0.45 * (1 - smooth(0, 0.18, u)), pal);
    drawParts(dev, camP, pal, () => ({ ink: 0.45 * (1 - smooth(0, 0.18, u)) }), (p) => p.name !== 'focus');
    drawBackdrop(nxt, camC, smooth(0.4, 0.95, u), 1, npal);
    const flight = (part) => {
      if (!part.fly) return { ink: smooth(0, 0.35, u), pencil: smooth(0, 0.2, u) };
      const f = part.fly;
      const q = easeInOut(clamp((u - f.at[0]) / (f.at[1] - f.at[0]), 0, 1));
      const k = 1 - q;
      if (f.d3) {
        // an exploded view: the part waits along a 3D line, sketched, then slides home
        const o = nxt.model.PL(f.d3);
        return { ink: smooth(0.2, 0.55, u), pencil: smooth(0.02, 0.3, u), T: Af.T(o[0] * k, o[1] * k) };
      }
      const c = part.c;
      const T = Af.chain(Af.T(c[0] + k * f.d[0], c[1] + k * f.d[1]), Af.R(k * (f.r || 0)), Af.S(1 + k * ((f.s || 1) - 1)), Af.T(-c[0], -c[1]));
      return { ink: smooth(0.3, 0.85, q), pencil: smooth(0, 0.3, q), T };
    };
    // the next machine's parts in their own order; the old chip sits on top of the parts that stay put
    const lastCore = nxt.parts.reduce((k, p, i) => (!p.fly && p.name !== 'glass' ? i : k), -1);
    nxt.parts.forEach((part, i) => {
      if (part.name === 'glass') return;
      drawParts(nxt, camC, npal, flight, (p) => p === part);
      if (i === lastCore) drawParts(dev, camP, pal, () => ({ ink: 1 - smooth(0.12, 0.45, u) }), (p) => p.name === 'focus');
    });
    const settled = smooth(0.9, 1, u);
    const hello = nxt.colors ? smooth(0.78, 0.84, u) * (1 - smooth(0.94, 1, u)) : 0;
    if (hello > 0.01) drawExtras(nxt, camC, npal, 1, { hello, write: smooth(0.8, 0.93, u) });
    else drawExtras(nxt, camC, npal, settled);
    const shown = settled * (1 - hello);
    if (nxt.next.type === 'screen' && shown > 0.003) drawPortalChild(nxt, camC, 0, BASE, shown, shown, 1);
    drawGlass(nxt, camC, npal, settled);
  }

  // The sheet: crop marks at its corners, printed with the poster.
  function drawSheet() {
    screenT();
    ctx.globalAlpha = 1;
    ctx.fillStyle = BASE.K1;
    const m = 11, l = 18, g = 6, lw = 0.9;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      ctx.fillRect(sx > 0 ? x + g : x - g - l, y - lw / 2, l, lw);
      ctx.fillRect(x - lw / 2, sy > 0 ? y + g : y - g - l, lw, l);
    }
  }
  // Each plate sits a little off register, differently on every pull. While you travel the plates
  // slide apart; when you arrive they spring back into register.
  const REG_BASE = [[0, 0], [1.1, -0.7], [-0.8, 0.9], [0.6, 1.2]];
  const REG_SWING = [[-1, -1.5], [5.5, -2.5], [-4.5, 3.5], [2.5, 5]];
  function registration() {
    const i = mod(Math.round(S.L), N), r = Ink.rng(900 + i * 31);
    return REG_BASE.map((b, k) => [b[0] + (r() - 0.5) * 1.2 + REG_SWING[k][0] * S.reg, b[1] + (r() - 0.5) * 1.2 + REG_SWING[k][1] * S.reg]);
  }

  function render() {
    const K = Math.floor(S.L);
    const t = S.L - K;
    setInks(S.L);
    screenT();
    ctx.globalAlpha = 1;
    ctx.fillStyle = BASE.paper;
    ctx.fillRect(0, 0, W, H);
    const dev = DEV[mod(K, N)].build(), nxt = DEV[mod(K + 1, N)].build();
    if (t <= 0 && dev.next.type === 'assemble') drawAtRest(dev, rest(), BASE, 1, 1, 1);
    else if (t <= 0) renderPortal(dev, nxt, 0);
    else if (dev.next.type === 'assemble') renderAssemble(dev, nxt, t);
    else renderPortal(dev, nxt, t);
    drawSheet();
    if (press) {
      press.frame(src, { inks: INKS, recipes: RECIPES, offsets: registration(), marks: [], dpr: DPR, pitch: 5.6 });
    } else {
      plain.setTransform(1, 0, 0, 1, 0, 0);
      plain.drawImage(src, 0, 0);
    }
  }

  // ---------- input ----------
  function nudge(dln) {
    S.anim = null;
    S.playing = false;
    syncPlay();
    S.Lt += dln / levelLn(Math.floor(S.Lt));
    S.dir = Math.sign(dln);
    S.lastInput = performance.now();
    touched();
  }
  function go(delta) {
    const from = S.L;
    const base = S.anim ? S.anim.to : Math.round(S.Lt);
    const to = base + delta;
    const dist = Math.abs(to - from);
    const slow = dist <= 1.01 && DEV[mod(Math.floor(Math.min(from, to)), N)].build().next.type === 'assemble';
    S.anim = { from, to, t0: performance.now(), dur: dist <= 1.01 ? (slow ? 4200 : 1500) : 900 + 520 * dist };
    S.lastInput = performance.now();
    touched();
  }
  function goTo(i) {
    let d = i - mod(Math.round(S.L), N);
    if (d > N / 2) d -= N;
    if (d < -N / 2) d += N;
    if (d) go(d);
  }

  // Travel is a scroll, up and down, and nothing else: pinches and browser zoom are swallowed.
  addEventListener('wheel', (e) => {
    if (e.target.closest && e.target.closest('.rail')) return;
    e.preventDefault();
    if (e.ctrlKey) return;
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 18;
    else if (e.deltaMode === 2) d *= 400;
    nudge(d * 0.0028);
  }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) addEventListener(ev, (e) => e.preventDefault());

  // On a touch screen, one finger swiping up and down is the same scroll.
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { y: e.clientY });
    S.lastInput = performance.now();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p || pointers.size > 1) return;
    const dy = e.clientY - p.y;
    p.y = e.clientY;
    nudge(-dy * 0.0075);
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    S.lastInput = performance.now();
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp' || k === '+' || k === '=' || k === ' ') { e.preventDefault(); go(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowDown' || k === '-' || k === '_') { e.preventDefault(); go(-1); }
    else if (k === 'p') togglePlay();
  });

  // ---------- UI ----------
  const $ = (id) => document.getElementById(id);
  const ui = { cap: $('cap'), year: $('m-year'), idx: $('m-idx'), kind: $('m-kind'), title: $('title'), line: $('line'), verb: $('verb'), next: $('next'), rail: $('ticks'), cursor: $('cursor'), hint: $('hint'), play: $('b-play') };
  ui.total = $('m-total');
  ui.total.textContent = String(N).padStart(2, '0');
  ui.rail.style.gridTemplateColumns = `repeat(${N}, minmax(0, 1fr))`;
  ui.cursor.parentElement.style.left = ui.cursor.parentElement.style.right = `calc(50% / ${N})`;
  DEV.forEach((d, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    for (const [cls, txt] of [['y', d.year], ['n', d.name]]) {
      const sp = document.createElement('span');
      sp.className = cls;
      sp.textContent = txt;
      b.appendChild(sp);
    }
    b.setAttribute('aria-label', `${d.name}, ${d.year}`);
    b.addEventListener('click', () => { S.playing = false; syncPlay(); goTo(i); });
    li.appendChild(b);
    ui.rail.appendChild(li);
  });
  const tickBtns = [...ui.rail.querySelectorAll('button')];
  $('b-in').addEventListener('click', () => go(1));
  $('b-out').addEventListener('click', () => go(-1));
  ui.play.addEventListener('click', togglePlay);
  // the notes beside each machine can be put away
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const notesBtn = $('b-notes');
  const setNotes = (onOff, save) => {
    document.body.classList.toggle('notes-off', !onOff);
    Ink.Plate.notes = onOff;
    notesBtn.setAttribute('aria-pressed', onOff ? 'true' : 'false');
    if (save) store.set('iloop-notes', onOff ? '1' : '0');
  };
  // the notes start hidden; turning them on is remembered
  setNotes(store.get('iloop-notes') === '1');
  notesBtn.addEventListener('click', () => setNotes(document.body.classList.contains('notes-off'), true));
  const mark = (btn, name, on) => {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', `${name} ${on ? 'on' : 'off'}`);
  };
  const soundSwitch = (btn, name, set, key) => btn.addEventListener('click', () => {
    const on = window.Sound ? set(btn.getAttribute('aria-pressed') !== 'true') : false;
    mark(btn, name, on);
    if (key) store.set(key, on ? '1' : '0');
    touched();
  });
  // music and the voice clips are switched separately
  const musicBtn = $('b-music'), bitesBtn = $('b-bites');
  soundSwitch(musicBtn, 'Music', (on) => Sound.setMusic(on), 'iloop-music');
  soundSwitch(bitesBtn, 'Voice clips', (on) => Sound.setBites(on), 'iloop-bites');
  // Music and voice clips are on unless you have turned them off. A browser lets a page make sound
  // only after the first click, tap or key (scrolling does not count), so they start then.
  const want = { music: store.get('iloop-music') !== '0', bites: store.get('iloop-bites') !== '0' };
  if (window.Sound && (want.music || want.bites)) {
    mark(musicBtn, 'Music', want.music);
    mark(bitesBtn, 'Voice clips', want.bites);
    const WAKE = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
    const wake = () => {
      for (const e of WAKE) removeEventListener(e, wake, true);
      const m = musicBtn.getAttribute('aria-pressed') === 'true', b = bitesBtn.getAttribute('aria-pressed') === 'true';
      if ((m && !Sound.music) || (b && !Sound.bites)) Sound.set(m || Sound.music, b || Sound.bites);
    };
    for (const e of WAKE) addEventListener(e, wake, true);
  }

  // A tick under the finger when a button is pressed: a short vibration where the browser has one,
  // and on an iPhone, which gives pages none, a hidden native switch, whose toggle iOS answers with a tap.
  if (matchMedia('(pointer: coarse)').matches) {
    let tick = null;
    if (navigator.vibrate) tick = () => { try { navigator.vibrate(8); } catch (e) {} };
    else {
      const label = document.createElement('label'), box = document.createElement('input');
      box.type = 'checkbox';
      box.setAttribute('switch', '');
      box.tabIndex = -1;
      label.append(box);
      label.setAttribute('aria-hidden', 'true');
      label.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      document.body.append(label);
      tick = () => label.click();
    }
    document.addEventListener('click', (e) => { if (e.isTrusted && e.target.closest && e.target.closest('.tools button, .rail button')) tick(); }, true);
  }

  function togglePlay() {
    S.playing = !S.playing;
    S.playNext = performance.now() + 300;
    S.playArrived = performance.now();
    syncPlay();
    touched();
  }
  function syncPlay() {
    ui.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    ui.play.setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
  }
  function touched() {
    if (S.touched) return;
    S.touched = true;
    ui.hint.classList.add('gone');
  }

  function setCaption(i) {
    const d = DEV[i], nx = DEV[mod(i + 1, N)];
    ui.year.textContent = d.year;
    ui.idx.textContent = String(i + 1).padStart(2, '0');
    ui.kind.textContent = d.kind;
    ui.title.textContent = d.name;
    ui.line.textContent = d.line;
    ui.verb.textContent = d.verb;
    ui.next.textContent = `${nx.name}, ${nx.year}`;
  }
  function updateUI() {
    const r = Math.round(S.L);
    const i = mod(r, N);
    if (i !== S.idx) {
      S.idx = i;
      setCaption(i);
      const d = DEV[i];
      // the buttons take on the interface of the machine you are looking at
      document.body.dataset.era = d.era || 'print';
      tickBtns.forEach((b, k) => b.classList.toggle('on', k === i));
    }
    const off = Math.abs(S.L - r);
    ui.cap.style.opacity = String(clamp(1 - off * 5, 0, 1));
    ui.cap.style.transform = `translateY(${(S.L - r) * -14}px)`;
    const pos = mod(S.L, N);
    const x = pos <= N - 1 ? pos / (N - 1) : 1 - (pos - (N - 1));
    ui.cursor.style.left = `${x * 100}%`;
    // the page's type and buttons are set in the same spot inks as the poster
    const sp = css(INKS.S), ac = css(INKS.A);
    if (sp !== S.spotCss || ac !== S.accCss) {
      S.spotCss = sp; S.accCss = ac;
      document.documentElement.style.setProperty('--spot', sp);
      document.documentElement.style.setProperty('--accent', ac);
    }
  }

  // ---------- loop ----------
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    src.width = Math.round(W * DPR);
    src.height = Math.round(H * DPR);
    if (!press) { cv.width = src.width; cv.height = src.height; }
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
  }
  addEventListener('resize', () => { resize(); measure(); });

  let last = performance.now();
  let prevL = S.L;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    S.time += dt;
    if (S.playing && !S.anim && now > S.playNext) {
      // with sound on, stay until the machine's bite has finished, then a breath of its music
      if (window.Sound && Sound.busy() && now - S.playArrived < 30000) S.playNext = now + 1200;
      else {
        go(1);
        S.playNext = now + 1500 + 2200;
        S.playArrived = now + 1500;
      }
    }
    if (S.frozen) {
      // ?at= holds the level still, for looking at one moment of a transition
    } else if (S.anim) {
      const a = S.anim;
      const u = clamp((now - a.t0) / a.dur, 0, 1);
      S.L = a.from + (a.to - a.from) * easeInOut(u);
      S.Lt = S.L;
      if (u >= 1) { S.anim = null; S.L = S.Lt = a.to; }
    } else {
      const idle = now - S.lastInput > 1100 && pointers.size === 0;
      // Settle on a machine, leaning the way you were travelling.
      if (idle) {
        const k = Math.floor(S.Lt), f = S.Lt - k;
        S.Lt = k + (S.dir > 0 ? (f > 0.08 ? 1 : 0) : S.dir < 0 ? (f > 0.92 ? 1 : 0) : Math.round(f));
      }
      const tau = idle ? 0.3 : 0.07;
      S.L += (S.Lt - S.L) * (1 - Math.exp(-dt / tau));
      if (Math.abs(S.Lt - S.L) < 1e-4) S.L = S.Lt;
    }
    // the plates' drift off register: up while travelling, sprung back on arrival
    const tf = S.L - Math.floor(S.L);
    const target = reduceMotion.matches ? 0 : Math.pow(Math.sin(Math.PI * tf), 0.8);
    S.regV += (170 * (target - S.reg) - 11 * S.regV) * dt;
    S.reg += S.regV * dt;
    const v = (S.L - prevL) / dt;
    S.vel += (v - S.vel) * (1 - Math.exp(-dt / 0.12));
    prevL = S.L;
    render();
    updateUI();
    if (window.Sound) {
      const r = Math.round(S.L);
      Sound.update(S.L, !S.anim && Math.abs(S.L - r) < 0.04 ? mod(r, N) : null, now);
    }
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    measure();
    const h = location.hash.slice(1);
    const found = DEV.findIndex((d) => d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') === h);
    if (found >= 0) S.L = S.Lt = found;
    const at = parseFloat(params.get('at'));
    if (Number.isFinite(at)) { S.L = S.Lt = at; S.frozen = true; }
    S.reg = Math.pow(Math.sin(Math.PI * (S.L - Math.floor(S.L))), 0.8);
    prevL = S.L;
    DEV[mod(Math.floor(S.L), N)].build();
    DEV[mod(Math.floor(S.L) + 1, N)].build();
    requestAnimationFrame(frame);
    // Engrave the rest of the plates while the page is idle.
    let k = 0;
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 30));
    const step = () => {
      if (k < N) { DEV[k++].build(); idle(step); }
    };
    idle(step);
  }
  window.machines = { state: S, go, goTo };
  // the poster type is used only on the canvas, so it is asked for by name before the first pull
  if (document.fonts && document.fonts.load) {
    Promise.all(['400 100px Anton', '600 20px Oswald', '500 20px Oswald', '500 12px "IBM Plex Mono"'].map((f) => document.fonts.load(f).catch(() => null)))
      .then(() => document.fonts.ready).then(start, start);
  } else start();
})();
