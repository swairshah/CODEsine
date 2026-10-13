// app.js: an endless zoom through the machines.
// Level L is continuous: floor(L) is the machine in front of you, frac(L) is how far
// you have travelled into its portal. One level is one portal's worth of magnification.
'use strict';

(function () {
  const { smooth, clamp, hex, mix, css, makePal, mixPal, gougePoly, fillPoly, drawPlate } = Ink;
  const DEV = window.DEVICES;
  const N = DEV.length;
  const mod = (a, n) => ((a % n) + n) % n;
  const ease = (x) => x * x * (3 - 2 * x);
  const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const cv = document.getElementById('stage');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  // ---------- complex numbers: a camera is z ↦ A·z + B ----------
  const C = (re, im = 0) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im);
  const sub = (a, b) => C(a.re - b.re, a.im - b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const div = (a, b) => {
    const d = b.re * b.re + b.im * b.im;
    return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  };
  const cabs = (a) => Math.hypot(a.re, a.im);
  const clog = (a) => C(Math.log(cabs(a)), Math.atan2(a.im, a.re));
  const cexp = (a) => { const m = Math.exp(a.re); return C(m * Math.cos(a.im), m * Math.sin(a.im)); };
  const scale = (a, s) => C(a.re * s, a.im * s);
  const C0 = C(500, 500);

  function portalMap(dev) {
    const P = dev.portal;
    const c = (P.m * Math.min(P.w, P.h)) / 1000;
    const r = P.rot || 0;
    return { u: C(c * Math.cos(r), c * Math.sin(r)), P: C(P.cx, P.cy), c };
  }
  const levelLn = (k) => -Math.log(portalMap(DEV[mod(k, N)]).c);

  function stage() {
    const top = W < 640 ? 150 : 132, bottom = W < 640 ? 96 : 92;
    const size = Math.max(160, Math.min(W - 32, H - top - bottom));
    return { c: C(W / 2, top + (H - top - bottom) / 2), s: size / 940, size };
  }

  // Camera for machine k at progress t. Rest (t=0) frames the machine on the stage;
  // t=1 frames its portal's contents exactly as the next machine's rest. In between is
  // a pure zoom about the one point that both framings agree on.
  function camAt(k, t) {
    const st = stage();
    const A0 = C(st.s), B0 = sub(st.c, scale(C0, st.s));
    if (t <= 0) return { A: A0, B: B0 };
    const pm = portalMap(DEV[mod(k, N)]);
    const A1 = div(A0, pm.u);
    const B1 = sub(st.c, mul(A1, pm.P));
    const F = div(sub(B1, B0), sub(A0, A1));
    const SF = add(mul(A0, F), B0);
    const At = mul(A0, cexp(scale(clog(div(A1, A0)), t)));
    return { A: At, B: sub(SF, mul(At, F)) };
  }
  function childCam(cam, pm) {
    return { A: mul(cam.A, pm.u), B: add(mul(cam.A, sub(pm.P, mul(pm.u, C0))), cam.B) };
  }
  function setT(cam) {
    ctx.setTransform(DPR * cam.A.re, DPR * cam.A.im, -DPR * cam.A.im, DPR * cam.A.re, DPR * cam.B.re, DPR * cam.B.im);
  }
  const screenT = () => ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // ---------- palettes ----------
  let BASE = null;
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => hex(cs.getPropertyValue(n).trim() || '#000000');
    BASE = makePal({ paper: g('--paper'), warm: g('--warm'), light: g('--light'), ink: g('--ink'), umber: g('--umber'), earth: g('--earth'), tint: g('--earth'), graphite: g('--graphite'), graphite2: g('--graphite2') });
    grain = makeGrain();
  }
  function withTint(pal, dev) {
    let t = hex(dev.tint);
    if (pal.tintTo) t = mix(t, pal.tintTo, pal.tintAmt);
    const p = Object.create(pal);
    p.tint = css(t);
    p.rgb = Object.assign({}, pal.rgb, { tint: t });
    return p;
  }
  // Inside a circuit board or a die the next machine is printed in reverse: silkscreen on solder mask.
  function invertPal(pal, dev, amt) {
    if (amt <= 0) return pal;
    const bg = hex(dev.portal.type === 'pcb' ? dev.board : dev.dieBg);
    const fg = hex(dev.silk);
    const target = makePal({ paper: bg, warm: mix(bg, fg, 0.08), light: mix(bg, fg, 0.16), ink: fg, umber: mix(fg, bg, 0.12), earth: mix(fg, bg, 0.3), tint: fg, graphite: mix(fg, bg, 0.35), graphite2: mix(fg, bg, 0.55) });
    const out = mixPal(pal, target, amt);
    out.tintTo = fg;
    out.tintAmt = amt;
    return out;
  }
  function portalBg(dev, pal) {
    const P = dev.portal;
    if (P.type === 'pcb') return hex(dev.board);
    if (P.type === 'die') return hex(dev.dieBg);
    return pal.rgb[P.bg || 'light'];
  }

  // Paper tooth: a fixed scatter of faint graphite fibres laid over everything, like the sheet itself.
  let grain = null;
  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    const g = c.getContext('2d');
    const r = Ink.rng(77);
    g.fillStyle = css(BASE.rgb.graphite);
    for (let i = 0; i < 1400; i++) {
      const x = r() * 320, y = r() * 320, a = r() * Math.PI, l = 1 + r() * 5;
      g.globalAlpha = 0.05 + r() * 0.12;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillRect(-l / 2, -0.35, l, 0.7);
      g.restore();
    }
    return ctx.createPattern(c, 'repeat');
  }

  // ---------- state ----------
  const S = {
    L: 0, Lt: 0, anim: null, lastInput: -1e9, playing: false, playNext: 0,
    vel: 0, time: 0, idx: -1, touched: false, dir: 0,
  };
  const pointers = new Map();

  // ---------- drawing ----------
  function drawScanlines(dev, s) {
    const P = dev.portal, x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2;
    ctx.fillStyle = s.pal.ink;
    ctx.globalAlpha = s.a * 0.09;
    for (let y = y0 + 2; y < y0 + P.h; y += 4.5) ctx.fillRect(x0, y, P.w, 1);
    if (!reduceMotion.matches) {
      const band = y0 + ((s.time * 38) % (P.h + 40)) - 20;
      ctx.fillStyle = s.pal.paper;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = s.a * (0.5 - i * 0.14);
        fillPoly(ctx, gougePoly([[x0, band + i * 6], [P.cx, band + i * 6 + 1.5], [x0 + P.w, band + i * 6]], 3 - i * 0.6, { seg: 2, taper: 0.05 }));
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawPixels(dev, s) {
    const a = s.a * smooth(1.5, 3.2, s.detail) * 0.32;
    if (a < 0.01) return;
    const P = dev.portal, x0 = P.cx - P.w / 2, y0 = P.cy - P.h / 2;
    ctx.globalAlpha = a;
    ctx.fillStyle = s.pal.earth;
    for (let x = x0; x < x0 + P.w; x += 3) ctx.fillRect(x, y0, 0.5, P.h);
    for (let y = y0; y < y0 + P.h; y += 3) ctx.fillRect(x0, y, P.w, 0.5);
    ctx.globalAlpha = 1;
  }

  // Draw machine j and, when you are travelling into it, the machine inside its portal.
  // `ink` and `pencil` fade the two media separately: a machine arrives sketched, then inked.
  function drawLevel(j, cam, tp, pal0, depth, ink = 1, pencil = 1) {
    const dev = DEV[mod(j, N)];
    const pl = dev.build();
    const pal = withTint(pal0, dev);
    const detail = cabs(cam.A) / 0.7;
    setT(cam);
    const bodyA = 1 - smooth(0.8, 1, tp);
    if (bodyA > 0.003) drawPlate(ctx, pl.body, pal, bodyA * ink, detail, bodyA * pencil);

    const e = ease(tp);
    ctx.save();
    ctx.clip(pl.portal);
    ctx.globalAlpha = ink;
    ctx.fillStyle = css(mix(portalBg(dev, pal), pal.rgb.paper, e));
    ctx.fill(pl.portal);
    ctx.globalAlpha = 1;
    const s = { a: ink * (1 - smooth(0.25, 0.85, tp)) * Ink.lodAlpha(0.5, detail), time: S.time, pal, detail, tp };
    if (s.a > 0.01) {
      if (dev.crt) drawScanlines(dev, s);
      if (dev.retina) drawPixels(dev, s);
      if (dev.extras) dev.extras(ctx, s);
    }
    // The next machine is not there until you start to travel in: first in pencil, then in ink.
    if (depth === 0 && tp > 0) {
      const pm = portalMap(dev);
      const cc = childCam(cam, pm);
      const childPal = dev.portal.type === 'pcb' || dev.portal.type === 'die' ? invertPal(pal0, dev, 1 - e) : pal0;
      const pA = smooth(0.02, 0.32, tp), iA = smooth(0.24, 0.66, tp);
      if (pA > 0.003 && 1000 * cabs(cc.A) > 10) drawLevel(j + 1, cc, 0, childPal, depth + 1, iA, pA);
    }
    setT(cam);
    const glassA = ink * (1 - smooth(0.45, 0.95, tp));
    if (glassA > 0.003 && pl.glass.layers.length) drawPlate(ctx, pl.glass, pal, glassA, detail);
    ctx.restore();
    setT(cam);
    if (bodyA > 0.003 && pl.over.layers.length) drawPlate(ctx, pl.over, pal, ink * bodyA * (1 - smooth(0.5, 0.9, tp)), detail);
  }

  function resample(pts, step) {
    const out = [];
    const n = pts.length;
    let carry = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let s = carry;
      while (s < d) {
        out.push([a[0] + ((b[0] - a[0]) * s) / d, a[1] + ((b[1] - a[1]) * s) / d]);
        s += step;
      }
      carry = s - d;
    }
    return out;
  }

  // While you travel, faint pencil rings run out from the portal edge.
  function drawRipples(dev, cam, amt, dir) {
    if (amt < 0.02) return;
    setT(cam);
    ctx.fillStyle = BASE.graphite;
    const P = dev.portal;
    for (let r = 0; r < 3; r++) {
      let prog = (S.time * 0.9 + r / 3) % 1;
      if (dir < 0) prog = 1 - prog;
      const d = 10 + prog * 120;
      const shape = window.DeviceGeom.portalShape({ ...P, w: P.w + 2 * d, h: P.h + 2 * d, r: (P.r || 0) + d });
      const pts = resample(shape, 14);
      ctx.globalAlpha = amt * Math.sin(Math.PI * prog) * 0.45;
      const n = pts.length;
      for (let i = 0; i < n; i += 5) {
        fillPoly(ctx, gougePoly([pts[i], pts[(i + 1) % n], pts[(i + 2) % n], pts[(i + 3) % n]], 1.1, { seg: 3, taper: 0.2 }));
      }
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    const K = Math.floor(S.L);
    const t = S.L - K;
    screenT();
    ctx.globalAlpha = 1;
    ctx.fillStyle = BASE.paper;
    ctx.fillRect(0, 0, W, H);
    const cam = camAt(K, t);
    drawLevel(K, cam, t, BASE, 0);
    if (!reduceMotion.matches) {
      drawRipples(DEV[mod(K, N)], cam, smooth(0.15, 1.2, Math.abs(S.vel)) * (1 - smooth(0.55, 0.85, t)), Math.sign(S.vel));
    }
    screenT();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
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
    S.anim = { from, to, t0: performance.now(), dur: dist <= 1.01 ? 1500 : 900 + 520 * dist };
    S.lastInput = performance.now();
    touched();
  }
  function goTo(i) {
    let d = i - mod(Math.round(S.L), N);
    if (d > N / 2) d -= N;
    if (d < -N / 2) d += N;
    if (d) go(d);
  }

  addEventListener('wheel', (e) => {
    if (e.target.closest && e.target.closest('.rail')) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 18;
    else if (e.deltaMode === 2) d *= 400;
    nudge(-d * (e.ctrlKey ? 0.011 : 0.0028));
  }, { passive: false });

  let gScale = 1;
  addEventListener('gesturestart', (e) => { e.preventDefault(); gScale = 1; });
  addEventListener('gesturechange', (e) => {
    e.preventDefault();
    if (pointers.size < 2) nudge(Math.log(e.scale / gScale));
    gScale = e.scale;
  });

  let pinchD = 0, lastTap = 0, tapStart = null;
  const pinchDist = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinchD = pinchDist();
    tapStart = pointers.size === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
    S.lastInput = performance.now();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size >= 2) {
      const d = pinchDist();
      if (pinchD > 0) nudge(Math.log(d / pinchD));
      pinchD = d;
    } else if (tapStart && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 6) {
      nudge(-dy * 0.007);
    }
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    pinchD = pointers.size >= 2 ? pinchDist() : 0;
    S.lastInput = performance.now();
    if (tapStart && e.type === 'pointerup' && Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 6 && performance.now() - tapStart.t < 300) {
      const now = performance.now();
      if (now - lastTap < 320) { go(e.shiftKey ? -1 : 1); lastTap = 0; }
      else lastTap = now;
    }
    if (pointers.size === 0) tapStart = null;
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
  $('b-theme').addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    readPalette();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readPalette);

  function togglePlay() {
    S.playing = !S.playing;
    S.playNext = performance.now() + 300;
    syncPlay();
    touched();
  }
  function syncPlay() {
    ui.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    ui.play.querySelector('span').textContent = S.playing ? 'Pause' : 'Play';
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
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
  }
  addEventListener('resize', resize);

  let last = performance.now();
  let prevL = S.L;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    S.time += dt;
    if (S.playing && !S.anim && now > S.playNext) {
      go(1);
      S.playNext = now + 1500 + 2200;
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
    render();
    updateUI();
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
