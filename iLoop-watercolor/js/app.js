// app.js: an endless zoom through the machines.
// Level L is continuous: floor(L) is the machine in front of you and frac(L) is how far you have
// travelled toward the next one. Each machine says how it leads on:
//   screen  the next machine hides in the screen as a small easter egg; you zoom into it
//   inside  the shell peels away, you zoom into the chip, and the chip becomes the next machine
//   die     as inside, but the next machine is etched into the silicon
//   assemble  you zoom into a chip, and the next machine's parts fly in and close around it
'use strict';

(function () {
  const { smooth, clamp, hex, mix, css, makePal, mixPal, drawPlate } = Ink;
  const DEV = window.Machines.list;
  const N = DEV.length;
  const mod = (a, n) => ((a % n) + n) % n;
  const ease = (x) => x * x * (3 - 2 * x);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Two sheets drawn in step: the washes and the pen. paper.js lays them onto watercolour paper.
  const cv = document.getElementById('stage');
  const washCv = document.createElement('canvas'), inkCv = document.createElement('canvas');
  const ctx = new Ink.Sheets(washCv.getContext('2d'), inkCv.getContext('2d'));
  const paper = window.Paper ? Paper.create(cv) : null;
  const flat = paper ? null : cv.getContext('2d');
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

  // ---------- palettes ----------
  let BASE = null;
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => hex(cs.getPropertyValue(n).trim() || '#000000');
    BASE = makePal({ paper: g('--paper'), warm: g('--warm'), light: g('--light'), ink: g('--ink'), pen: g('--pen'), umber: g('--umber'), earth: g('--earth'), tint: g('--earth'), tint2: g('--earth'), graphite: g('--graphite'), graphite2: g('--graphite2') });
  }
  function withTint(pal, dev, over) {
    let t = over || hex(dev.tint), t2 = hex(dev.tint2 || dev.tint);
    if (pal.tintTo) { t = mix(t, pal.tintTo, pal.tintAmt); t2 = mix(t2, pal.tintTo, pal.tintAmt); }
    if (pal.tintFn) { t = mix(t, pal.tintFn(t), pal.tintAmt); t2 = mix(t2, pal.tintFn(t2), pal.tintAmt); }
    const p = Object.create(pal);
    p.tint = css(t);
    p.tint2 = css(t2);
    p.rgb = Object.assign({}, pal.rgb, { tint: t, tint2: t2 });
    return p;
  }
  // Etched into a die, the next machine is printed in reverse: light lines on dark silicon.
  function invertPal(pal, dev, amt) {
    if (amt <= 0) return pal;
    const bg = hex(dev.next.inkBg || dev.next.bg), fg = hex(dev.next.fg);
    const target = makePal({ paper: bg, warm: mix(bg, fg, 0.08), light: mix(bg, fg, 0.16), ink: fg, pen: fg, umber: mix(fg, bg, 0.12), earth: mix(fg, bg, 0.3), tint: fg, tint2: fg, graphite: mix(fg, bg, 0.35), graphite2: mix(fg, bg, 0.55) });
    const out = mixPal(pal, target, amt);
    out.tintTo = fg;
    out.tintAmt = amt;
    return out;
  }
  // How a screen shows the next machine: each era draws it in its own way, and the colours settle
  // into the print as you zoom in. Each look maps a colour to a colour.
  const lum = (c) => (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
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
    out.mapRgb = (c) => mix(c, f(c), amt);
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
    vel: 0, time: 0, idx: -1, touched: false, dir: 0,
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
      // a wash arriving spreads out from a wet centre instead of fading in
      let fl = null;
      if (r && r.flood != null && r.flood < 0.999) fl = { amt: r.flood, c: r.at || part.c, r: r.at ? r.reach : part.rad || 300, seed: 17 + dev.index };
      drawPlate(ctx, part.plate, pal, ink, detailOf(m), pencil, fl);
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
  // Background washes fade in as a machine grows to its full size on the page.
  function drawBg(dev, cam, pal, a, flood) {
    a *= smooth(0.3, 0.85, Af.scaleOf(cam) / Af.scaleOf(rest()));
    if (a < 0.01) return;
    if (flood != null && flood <= 0.001) return;
    setM(cam);
    Washes.draw(ctx.w, dev, BASE, a, flood != null && flood < 0.999 ? Ink.floodPath({ amt: flood, c: [500, 520], r: 760, seed: 5 }) : null);
  }
  // A machine standing still, with whatever its screen shows. o.flood lets its washes in through a
  // spreading wet front; o.bg (0–1) is how strongly the loose background washes show.
  function drawAtRest(dev, cam, pal0, ink = 1, pencil = ink, o = {}) {
    const pal = withTint(pal0, dev);
    drawBg(dev, cam, pal, (o.bg ?? 1) * smooth(0, 0.6, ink), o.flood);
    drawParts(dev, cam, pal, () => ({ ink, pencil, flood: o.flood, at: o.flood != null ? [500, 520] : null, reach: 760 }));
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
    if (onScreen) drawMachine(nxt, childCam, lookPal(pal0, look, amt), ink, pencil, depth + 1);
    // going inside: the next machine is drawn in pen first, then its colour floods in from the middle
    else drawAtRest(nxt, childCam, dev.next.fg ? invertPal(pal0, dev, 1 - ease(t)) : pal0, ink * smooth(0.18, 0.3, t), pencil * smooth(0.03, 0.3, t), { flood: smooth(0.24, 0.8, t) });
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
  const HAMMER_PAL = () => withTint(BASE, { tint: '#b08657', tint2: '#3b2a1d' });
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
        // the Macintosh, sketched in the light and then inked
        drawMachine(nxt, childCam, BASE, ink * smooth(0.06, 0.16, after), pencil * smooth(0.02, 0.2, after), depth + 1, { flood: smooth(0.12, 0.6, after) });
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

  function drawMachine(dev, cam, pal0, ink = 1, pencil = ink, depth = 0, o = {}) {
    drawAtRest(dev, cam, pal0, ink, pencil, o);
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
      drawBg(dev, camS, pal, 1);
      drawParts(dev, camS, pal, (part) => ({ ...peeled(part), ink: peeled(part).ink / Math.max(bodyA, 1e-6) }));
      drawExtras(dev, camS, pal, 1 - smooth(0.25, 0.8, t));
      if (sw > 0.001) {
        const x = W * 1.04 - off;
        screenT();
        ctx.globalAlpha = 1;
        ctx.fillStyle = BASE.paper;
        ctx.fillRect(x, 0, W * 1.1, H);
        ctx.fillStyle = 'rgba(22,17,13,0.18)';
        ctx.fillRect(x - 6, 0, 6, H);
        drawMachine(nxt, Af.mul(Af.T(x, 0), rest()), BASE, 1, 1, 0);
      }
      return;
    }
    drawBg(dev, cam, pal, bodyA);
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
      drawBg(dev, cam, pal, 1 - smooth(0.3, 1, t / SPLIT));
      drawParts(dev, cam, pal, (part) => (part.name === 'focus' ? null : { ink: 1 - 0.55 * smooth(0.5, 1, t / SPLIT) }));
      return;
    }
    const u = (t - SPLIT) / (1 - SPLIT);
    if (nxt.colors) {
      // run through the machine's colours while it comes together, ending on its own
      const c = nxt.colors, k = smooth(0.22, 0.86, u) * (c.length - 1), i = Math.min(c.length - 2, Math.floor(k));
      npal = withTint(BASE, nxt, mix(hex(c[i]), hex(c[i + 1]), k - i));
    }
    // An exploded assembly pulls back quickly, and further than usual, so the whole diagram fits.
    const exploded = nxt.parts.some((p) => p.fly && p.fly.d3);
    const cu = exploded ? 1 - Math.pow(1 - u, 2.6) : u;
    const back = exploded ? 1 - 0.46 * Math.pow(Math.sin(Math.PI * clamp(u / 0.97, 0, 1)), 1.3) : 1;
    const Z = Af.chain(Af.T(500, 500), Af.S(back), Af.T(-500, -500));
    const camC = Af.chain(rest(), Z, Af.pow(Af.mul(H, Af.inv(Ma)), 1 - cu));
    const camP = Af.chain(camC, Ma, Af.inv(Mf));
    drawBg(nxt, camC, npal, 1, smooth(0.05, 0.7, u));
    drawParts(dev, camP, pal, () => ({ ink: 0.45 * (1 - smooth(0, 0.18, u)) }), (p) => p.name !== 'focus');
    const flight = (part) => {
      if (!part.fly) return { ink: smooth(0, 0.12, u), pencil: smooth(0, 0.2, u), flood: smooth(0.02, 0.45, u) };
      const f = part.fly;
      const q = easeInOut(clamp((u - f.at[0]) / (f.at[1] - f.at[0]), 0, 1));
      const k = 1 - q;
      if (f.d3) {
        // an exploded view: the part waits along a 3D line, sketched, then slides home
        const o = nxt.model.PL(f.d3);
        return { ink: smooth(0.1, 0.25, u), pencil: smooth(0.02, 0.3, u), flood: smooth(0.15, 0.62, u), T: Af.T(o[0] * k, o[1] * k) };
      }
      const c = part.c;
      const T = Af.chain(Af.T(c[0] + k * f.d[0], c[1] + k * f.d[1]), Af.R(k * (f.r || 0)), Af.S(1 + k * ((f.s || 1) - 1)), Af.T(-c[0], -c[1]));
      return { ink: smooth(0.15, 0.4, q), pencil: smooth(0, 0.3, q), flood: smooth(0.25, 0.95, q), T };
    };
    if (nxt.colors) {
      // the colours run behind it wet into wet: each one dropped onto damp paper, bleeding into the last
      const c = nxt.colors, k = smooth(0.22, 0.86, u) * (c.length - 1), fade = smooth(0.05, 0.2, u) * (1 - smooth(0.86, 1, u));
      if (fade > 0.01) {
        setM(camC);
        const g = ctx.w, paper = BASE.rgb.paper;
        g.save();
        g.globalCompositeOperation = 'multiply';
        for (let i = 0; i < c.length; i++) {
          const near = 1 - Math.min(1, Math.abs(k - i) / 1.6);
          if (near <= 0) continue;
          const col = hex(c[i]).map((v, j) => Math.min(255, Math.round((v / paper[j]) * 255)));
          const a = (i * 2.399) % (2 * Math.PI), r = 300 + 40 * Math.sin(i * 1.7);
          const x = 500 + Math.cos(a) * 170, y = 430 + Math.sin(a) * 110;
          const grd = g.createRadialGradient(x, y, 0, x, y, r);
          grd.addColorStop(0, `rgba(${col},${0.5 * near * fade})`);
          grd.addColorStop(0.55, `rgba(${col},${0.28 * near * fade})`);
          grd.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = grd;
          g.fillRect(x - r, y - r, 2 * r, 2 * r);
        }
        g.restore();
      }
    }
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

  function render() {
    const K = Math.floor(S.L);
    const t = S.L - K;
    screenT();
    ctx.globalAlpha = 1;
    ctx.fillStyle = BASE.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.k.clearRect(0, 0, W, H);
    const dev = DEV[mod(K, N)].build(), nxt = DEV[mod(K + 1, N)].build();
    if (t <= 0 && dev.next.type === 'assemble') drawAtRest(dev, rest(), BASE);
    else if (t <= 0) renderPortal(dev, nxt, 0);
    else if (dev.next.type === 'assemble') renderAssemble(dev, nxt, t);
    else renderPortal(dev, nxt, t);
    screenT();
    ctx.globalAlpha = 1;
    // lay the two sheets on the paper
    if (paper) paper.draw(washCv, inkCv, { dpr: DPR, paper: BASE.rgb.paper, pool: POOL });
    else {
      flat.setTransform(1, 0, 0, 1, 0, 0);
      flat.globalCompositeOperation = 'source-over';
      flat.drawImage(washCv, 0, 0);
      flat.globalCompositeOperation = 'multiply';
      flat.drawImage(inkCv, 0, 0);
      flat.globalCompositeOperation = 'source-over';
    }
  }
  const POOL = +(new URLSearchParams(location.search).get('pool') || 1.2);

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
  // home: back to the front page, where every version of the loop starts
  $('b-home').addEventListener('click', () => { location.href = '../index.html'; });
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

  function updateUI() {
    const r = Math.round(S.L);
    const i = mod(r, N);
    if (i !== S.idx) {
      S.idx = i;
      const d = DEV[i], nx = DEV[mod(i + 1, N)];
      ui.year.textContent = d.year;
      ui.idx.textContent = String(i + 1).padStart(2, '0');
      ui.kind.textContent = d.kind;
      ui.title.textContent = d.name;
      // the buttons take on the interface of the machine you are looking at
      document.body.dataset.era = d.era || 'print';
      // the swatches on the tools take a pale wash of the machine's own colour
      document.body.style.setProperty('--tint', d.tint || '#7c9cb0');
      ui.line.textContent = d.line;
      ui.verb.textContent = d.verb;
      ui.next.textContent = `${nx.name}, ${nx.year}`;
      tickBtns.forEach((b, k) => b.classList.toggle('on', k === i));
    }
    const off = Math.abs(S.L - r);
    ui.cap.style.opacity = String(clamp(1 - off * 5, 0, 1));
    ui.cap.style.transform = `translateY(${(S.L - r) * -14}px)`;
    const pos = mod(S.L, N);
    const x = pos <= N - 1 ? pos / (N - 1) : 1 - (pos - (N - 1));
    ui.cursor.style.left = `${x * 100}%`;
  }

  // ---------- loop ----------
  function resize() {
    DPR = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    cv.width = washCv.width = inkCv.width = Math.round(W * DPR);
    cv.height = washCv.height = inkCv.height = Math.round(H * DPR);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
  }
  addEventListener('resize', resize);

  let last = performance.now();
  let prevL = S.L;
  // ?perf logs how long frames take
  const PERF = new URLSearchParams(location.search).has('perf') ? { n: 0, ms: 0, t0: performance.now() } : null;
  // ?at=6.5 holds the journey at that level, for looking at a transition still
  const AT = new URLSearchParams(location.search).get('at');
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    S.time += dt;
    if (AT != null) { S.L = S.Lt = +AT; S.anim = null; S.lastInput = now; }
    if (S.playing && !S.anim && now > S.playNext) {
      // with sound on, stay until the machine's bite has finished, then a breath of its music
      if (window.Sound && Sound.busy() && now - S.playArrived < 30000) S.playNext = now + 1200;
      else {
        go(1);
        S.playNext = now + 1500 + 2200;
        S.playArrived = now + 1500;
      }
    }
    if (S.anim) {
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
    const v = (S.L - prevL) / dt;
    S.vel += (v - S.vel) * (1 - Math.exp(-dt / 0.12));
    prevL = S.L;
    const r0 = performance.now();
    render();
    if (PERF) {
      PERF.n++; PERF.ms += performance.now() - r0;
      if (PERF.n === 120) { console.log(`perf: ${(PERF.ms / 120).toFixed(1)} ms render, ${((now - PERF.t0) / 120).toFixed(1)} ms/frame`); PERF.n = 0; PERF.ms = 0; PERF.t0 = now; }
    }
    updateUI();
    if (window.Sound) {
      const r = Math.round(S.L);
      Sound.update(S.L, !S.anim && Math.abs(S.L - r) < 0.04 ? mod(r, N) : null, now);
    }
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    readPalette();
    const h = location.hash.slice(1);
    const found = DEV.findIndex((d) => d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') === h);
    if (found >= 0) S.L = S.Lt = found;
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
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
  else start();
})();
