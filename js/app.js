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

  const cv = document.getElementById('stage');
  const ctx = cv.getContext('2d');
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
    if (dev.next.type === 'assemble') return 2.6;
    return -Math.log(Af.scaleOf(portalMap(dev)));
  }

  // ---------- palettes ----------
  let BASE = null;
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n) => hex(cs.getPropertyValue(n).trim() || '#000000');
    BASE = makePal({ paper: g('--paper'), warm: g('--warm'), light: g('--light'), ink: g('--ink'), umber: g('--umber'), earth: g('--earth'), tint: g('--earth'), tint2: g('--earth'), graphite: g('--graphite'), graphite2: g('--graphite2') });
    grain = makeGrain();
  }
  function withTint(pal, dev, over) {
    let t = over || hex(dev.tint), t2 = hex(dev.tint2 || dev.tint);
    if (pal.tintTo) { t = mix(t, pal.tintTo, pal.tintAmt); t2 = mix(t2, pal.tintTo, pal.tintAmt); }
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
    const target = makePal({ paper: bg, warm: mix(bg, fg, 0.08), light: mix(bg, fg, 0.16), ink: fg, umber: mix(fg, bg, 0.12), earth: mix(fg, bg, 0.3), tint: fg, tint2: fg, graphite: mix(fg, bg, 0.35), graphite2: mix(fg, bg, 0.55) });
    const out = mixPal(pal, target, amt);
    out.tintTo = fg;
    out.tintAmt = amt;
    return out;
  }
  function portalBg(dev, pal) {
    const b = dev.next.bg;
    if (b && b[0] === '#') return hex(b);
    return pal.rgb[b || 'paper'];
  }

  // Paper tooth: a fixed scatter of faint graphite fibres laid over everything, like the sheet itself.
  let grain = null;
  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    const g = c.getContext('2d');
    const r = Ink.rng(77);
    g.fillStyle = css(BASE.rgb.graphite);
    for (let i = 0; i < 1300; i++) {
      const x = r() * 320, y = r() * 320, a = r() * Math.PI, l = 1 + r() * 5;
      g.globalAlpha = 0.04 + r() * 0.1;
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
  function drawAtRest(dev, cam, pal0, ink = 1, pencil = ink) {
    const pal = withTint(pal0, dev);
    drawParts(dev, cam, pal, () => ({ ink, pencil }));
    drawExtras(dev, cam, pal, ink);
    drawGlass(dev, cam, pal, ink);
  }

  function clipTo(M) {
    const q = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => Af.apply(M, p));
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
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
    const a = onScreen ? 1 : smooth(0.12, 0.34, t);
    if (a < 0.003) return;
    setM(cam);
    ctx.save();
    const clipM = dev.marks.clip || dev.marks.portal;
    clipTo(clipM);
    ctx.clip();
    // On a screen the egg is a small print of the next machine, on the same paper it will rest on,
    // so the card simply grows to fill the view. A chip is reached by going inside: there the
    // machine is revealed, drawn in pencil and then inked.
    ctx.globalAlpha = onScreen ? ink : a * ink;
    ctx.fillStyle = onScreen ? BASE.paper : css(mix(portalBg(dev, withTint(pal0, dev)), BASE.rgb.paper, ease(t)));
    clipTo(clipM);
    ctx.fill();
    ctx.globalAlpha = 1;
    const childPal = dev.next.fg ? invertPal(pal0, dev, 1 - ease(t)) : pal0;
    if (onScreen) drawMachine(nxt, childCam, childPal, ink, pencil, depth + 1);
    else drawAtRest(nxt, childCam, childPal, ink * smooth(0.22, 0.62, t), pencil * smooth(0.03, 0.3, t));
    ctx.restore();
    if (onScreen) {
      // the card's edge, which is the edge of the view by the time you arrive
      ctx.save();
      clipTo(clipM);
      ctx.globalAlpha = ink * (1 - smooth(0.2, 0.7, t));
      ctx.strokeStyle = BASE.ink;
      ctx.lineWidth = 1.4 / Af.scaleOf(cam);
      ctx.stroke();
      ctx.restore();
    }
  }
  function drawMachine(dev, cam, pal0, ink = 1, pencil = ink, depth = 0) {
    drawAtRest(dev, cam, pal0, ink, pencil);
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
    drawParts(dev, camP, pal, () => ({ ink: 0.45 * (1 - smooth(0, 0.18, u)) }), (p) => p.name !== 'focus');
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
    if (nxt.next.type === 'screen' && settled > 0.003) drawPortalChild(nxt, camC, 0, BASE, settled, settled, 1);
    drawGlass(nxt, camC, npal, settled);
  }

  function render() {
    const K = Math.floor(S.L);
    const t = S.L - K;
    screenT();
    ctx.globalAlpha = 1;
    ctx.fillStyle = BASE.paper;
    ctx.fillRect(0, 0, W, H);
    const dev = DEV[mod(K, N)].build(), nxt = DEV[mod(K + 1, N)].build();
    if (t <= 0 && dev.next.type === 'assemble') drawAtRest(dev, rest(), BASE);
    else if (t <= 0) renderPortal(dev, nxt, 0);
    else if (dev.next.type === 'assemble') renderAssemble(dev, nxt, t);
    else renderPortal(dev, nxt, t);
    screenT();
    ctx.globalAlpha = 0.85;
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
  const notesBtn = $('b-notes'), soundBtn = $('b-sound');
  const setNotes = (onOff) => {
    document.body.classList.toggle('notes-off', !onOff);
    notesBtn.setAttribute('aria-pressed', onOff ? 'true' : 'false');
    store.set('em-notes', onOff ? '1' : '0');
  };
  setNotes(store.get('em-notes') !== '0');
  notesBtn.addEventListener('click', () => setNotes(document.body.classList.contains('notes-off')));
  soundBtn.addEventListener('click', () => {
    const onOff = window.Sound ? Sound.toggle() : false;
    soundBtn.setAttribute('aria-pressed', onOff ? 'true' : 'false');
    soundBtn.querySelector('span').textContent = onOff ? 'Sound on' : 'Sound off';
    touched();
  });

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
