// sound.js: what each stage sounds like. Nothing here is a recording from an event or an advert.
// Each stage plays period sound effects made with Web Audio, then that era's best-known line read
// by a narrator, then, if you stay, an original music bed in the style of the period's adverts.
// To use your own recordings, put them in audio/custom/ and list them in CUSTOM below.
// Keys are the stage number and 'bite' (replaces the spoken line) or 'ad' (replaces the music).
'use strict';

(function (global) {
  const CUSTOM = {
    // '05-bite': 'audio/custom/05-bite.mp3',
    // '05-ad': 'audio/custom/05-ad.mp3',
  };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let ac = null, out = null, verb = null, noiseBuf = null;
  const bus = {};
  let enabled = false;

  // ---------- stages ----------
  // line: what the narrator says; source: where the line comes from; song: the music bed.
  const STAGES = [
    { voice: '00', line: 'Byte into an Apple.', source: 'Apple Computer advert, 1976', sfx: 'terminal', song: 'kit' },
    { voice: '01', line: 'Introducing Apple II. The home computer that’s ready to work, play and grow with you.', source: 'Apple II advert, 1977', sfx: 'apple2', song: 'chip' },
    { voice: '02', line: 'Hello. I’m Macintosh. It sure is great to get out of that bag.', source: 'Macintosh speaking at its launch, 1984', sfx: 'mac', song: 'synth84', tag: '02b', tagLine: 'And you’ll see why 1984 won’t be like “1984”.', tagSource: 'Macintosh advert, 1984' },
    { voice: '03', line: 'What’s on your PowerBook?', source: 'PowerBook advertising, 1992', sfx: 'chime', song: 'fm91' },
    { voice: '04', line: 'Say hello to iMac.', source: 'iMac advertising, 1998', sfx: 'imac', song: 'trip98' },
    { voice: '05', line: '1,000 songs in your pocket.', source: 'iPod launch, 2001', sfx: 'wheel', song: 'bigbeat01' },
    { voice: '06', line: 'An iPod, a phone and an internet communicator.', source: 'iPhone launch, 2007', sfx: 'unlock', song: 'indie07' },
    { voice: '07', line: 'The world’s thinnest notebook.', source: 'MacBook Air launch, 2008', sfx: 'envelope', song: 'folk08' },
    { voice: '08', line: 'One more thing.', source: 'Apple silicon Mac event, 2020', sfx: 'lid', song: 'ambient20' },
    { voice: '09', line: '16 billion transistors.', source: 'M1 introduction, 2020', sfx: 'shimmer', song: 'pulse20' },
    { voice: '10', line: 'Hello. In seven vibrant colours.', source: 'iMac introduction, 2021', sfx: 'hello', song: 'pop21' },
    { voice: '11', line: 'MagSafe is back.', source: 'MacBook Pro introduction, 2021', sfx: 'magsafe', song: 'deep21' },
    { voice: '12', line: 'Five by five inches.', source: 'Mac mini introduction, 2024', sfx: 'mini', song: 'minimal24' },
  ];

  // ---------- music beds: chords per bar, and what plays on each sixteenth ----------
  const SONGS = {
    kit: { bpm: 84, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], lead: { inst: 'square', pat: 'x...x...x...x...', oct: 12, v: 0.025 }, hum: true },
    chip: { bpm: 112, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], lead: { inst: 'square', pat: 'xxxxxxxxxxxxxxxx', oct: 12, v: 0.03 }, bass: { inst: 'square', pat: 'x...x...x...x...', v: 0.045 }, drums: { hat: '..x...x...x...x.' } },
    synth84: { bpm: 92, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], pad: { inst: 'saw', v: 0.05, lp: 900 }, lead: { inst: 'saw', pat: 'x.x.x.x.x.x.x.x.', oct: 12, v: 0.025, lp: 1400 }, drums: { kick: 'x.......x.......' } },
    fm91: { bpm: 86, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]], pad: { inst: 'fm', v: 0.07, hits: 'x.......x.......' }, bass: { inst: 'tri', pat: 'x.....x...x.....', v: 0.08 }, drums: { hat: '..x...x...x...x.', rim: '....x.......x...' } },
    trip98: { bpm: 84, chords: [[50, 53, 57, 60], [48, 52, 55, 59], [46, 50, 53, 57], [45, 48, 52, 55]], pad: { inst: 'saw', v: 0.04, lp: 700 }, bass: { inst: 'sine', pat: 'x.....x.x.......', v: 0.14 }, drums: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' } },
    bigbeat01: { bpm: 120, chords: [[45, 52, 57], [45, 52, 57], [43, 50, 55], [48, 55, 60]], bass: { inst: 'saw', pat: 'x..x..x...x.x...', v: 0.06, lp: 600 }, lead: { inst: 'square', pat: '....x.......x.x.', oct: 12, v: 0.02, lp: 2000 }, drums: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx' } },
    indie07: { bpm: 116, chords: [[48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60]], pad: { inst: 'fm', v: 0.06, hits: 'x...x...x...x...' }, lead: { inst: 'bell', pat: 'x.....x...x.....', oct: 24, v: 0.03 }, drums: { clap: '....x.......x...', kick: 'x.......x.......' } },
    folk08: { bpm: 100, chords: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]], lead: { inst: 'pluck', pat: 'x.xxx.xxx.xxx.xx', oct: 12, v: 0.12 }, drums: { kick: 'x.......x.......' }, whistle: true },
    ambient20: { bpm: 70, chords: [[52, 55, 59, 62], [48, 52, 55, 59], [55, 59, 62, 66], [50, 54, 57, 61]], pad: { inst: 'sine', v: 0.05 }, lead: { inst: 'bell', pat: 'x.......x.....x.', oct: 12, v: 0.025 } },
    pulse20: { bpm: 96, chords: [[57, 60, 64, 67], [55, 59, 62, 66], [53, 57, 60, 64], [55, 59, 62, 67]], lead: { inst: 'sine', pat: 'xxxxxxxxxxxxxxxx', oct: 12, v: 0.035 }, bass: { inst: 'sine', pat: 'x.......x.......', v: 0.12 } },
    pop21: { bpm: 108, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [53, 57, 60, 64], [55, 59, 62, 65]], lead: { inst: 'pluck', pat: 'x.x.xx.x.xx.x.x.', oct: 12, v: 0.11 }, bass: { inst: 'tri', pat: 'x..x..x.x..x..x.', v: 0.09 }, drums: { clap: '....x.......x...', kick: 'x.......x.......', hat: '..x...x...x...x.' } },
    deep21: { bpm: 100, chords: [[45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53], [40, 43, 47, 50]], pad: { inst: 'saw', v: 0.035, lp: 600 }, bass: { inst: 'sine', pat: 'x.....x...x.....', v: 0.15 }, drums: { kick: 'x.......x.......', hat: '..x...x...x...x.' } },
    minimal24: { bpm: 118, chords: [[50, 53, 57], [50, 53, 57], [48, 52, 55], [46, 50, 53]], lead: { inst: 'pluck', pat: 'x..x..x...x..x..', oct: 12, v: 0.1 }, drums: { kick: 'x...x...x...x...', hat: '..x...x...x...x.' } },
  };

  // ---------- the instrument rack ----------
  function init() {
    if (ac) return true;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 3;
    out = ac.createGain();
    out.gain.value = 0.5;
    out.connect(comp).connect(ac.destination);
    for (const k of ['music', 'sfx']) {
      bus[k] = ac.createGain();
      bus[k].gain.value = 0;
      bus[k].connect(out);
    }
    verb = ac.createConvolver();
    const len = ac.sampleRate * 1.8, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb.buffer = ir;
    const vg = ac.createGain();
    vg.gain.value = 0.25;
    verb.connect(vg).connect(out);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  function envelope(g, t, dur, o) {
    const a = o.a ?? 0.005, d = o.d ?? 0.12, s = o.s ?? 0.5, r = o.r ?? 0.25, v = o.v ?? 0.1;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.linearRampToValueAtTime(v * s, t + a + d);
    g.gain.setValueAtTime(v * s, t + Math.max(dur, a + d));
    g.gain.linearRampToValueAtTime(0, t + Math.max(dur, a + d) + r);
    return Math.max(dur, a + d) + r;
  }
  function route(g, o) {
    g.connect(o.dest || bus.music);
    if (o.wet) {
      const w = ac.createGain();
      w.gain.value = o.wet;
      g.connect(w).connect(verb);
    }
  }
  function tone(t, f, dur, o = {}) {
    const s = ac.createOscillator();
    s.type = { saw: 'sawtooth', tri: 'triangle' }[o.type] || o.type || 'sine';
    s.frequency.setValueAtTime(f, t);
    if (o.glide) s.frequency.exponentialRampToValueAtTime(o.glide, t + dur);
    if (o.detune) s.detune.value = o.detune;
    const g = ac.createGain();
    let node = s;
    if (o.lp) {
      const fl = ac.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = o.lp;
      s.connect(fl);
      node = fl;
    }
    node.connect(g);
    const end = envelope(g, t, dur, o);
    route(g, o);
    s.start(t);
    s.stop(t + end + 0.05);
  }
  function noise(t, dur, o = {}) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const fl = ac.createBiquadFilter();
    fl.type = o.type || 'bandpass';
    fl.frequency.value = o.f || 2000;
    fl.Q.value = o.q ?? 0.8;
    const g = ac.createGain();
    src.connect(fl).connect(g);
    const end = envelope(g, t, dur, { a: 0.002, d: dur * 0.5, s: 0.3, r: o.r ?? 0.05, v: o.v ?? 0.1 });
    route(g, o);
    src.start(t, Math.random() * 0.5);
    src.stop(t + end + 0.05);
  }
  function fm(t, f, dur, o = {}) {
    const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * (o.ratio || 1);
    mg.gain.setValueAtTime(f * (o.index || 2.2), t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + Math.max(0.2, dur));
    mod.connect(mg).connect(car.frequency);
    car.connect(g);
    const end = envelope(g, t, dur, { a: 0.004, d: 0.4, s: 0.35, r: 0.5, v: o.v ?? 0.06 });
    route(g, { wet: 0.4, ...o });
    car.start(t);
    mod.start(t);
    car.stop(t + end + 0.05);
    mod.stop(t + end + 0.05);
  }
  const plucks = new Map();
  function pluck(t, f, o = {}) {
    // Karplus–Strong: a burst of noise in a short delay line, softening each pass
    const key = Math.round(f);
    let buf = plucks.get(key);
    if (!buf) {
      const sr = ac.sampleRate, n = Math.round(sr * 1.2), p = Math.max(2, Math.round(sr / f));
      buf = ac.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < p; i++) d[i] = Math.random() * 2 - 1;
      for (let i = p; i < n; i++) d[i] = 0.497 * (d[i - p] + d[i - p + 1]);
      plucks.set(key, buf);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.value = o.v ?? 0.1;
    src.connect(g);
    route(g, { wet: 0.3, ...o });
    src.start(t);
  }
  const kick = (t, v = 0.35, dest) => tone(t, 120, 0.14, { glide: 42, a: 0.002, d: 0.12, s: 0.2, r: 0.12, v, dest });
  const snare = (t, v = 0.08, dest) => { noise(t, 0.12, { f: 1800, q: 0.7, v, dest }); tone(t, 190, 0.06, { v: v * 0.6, r: 0.05, dest }); };
  const hat = (t, v = 0.03, dest) => noise(t, 0.03, { type: 'highpass', f: 7000, v, r: 0.03, dest });
  const clap = (t, v = 0.06, dest) => { for (let i = 0; i < 3; i++) noise(t + i * 0.012, 0.05, { f: 1400, q: 1.2, v, wet: 0.3, dest }); };
  const rim = (t, v = 0.05, dest) => tone(t, 1700, 0.02, { type: 'square', v, r: 0.03, lp: 3000, dest });

  // ---------- period sound effects ----------
  const SFX = {
    terminal(t) { for (let i = 0; i < 14; i++) rim(t + i * 0.11 + Math.random() * 0.05, 0.03, bus.sfx); tone(t, 60, 2.2, { v: 0.03, a: 0.3, r: 0.6, dest: bus.sfx }); return 2.2; },
    apple2(t) {
      tone(t, 1000, 0.1, { type: 'square', v: 0.05, r: 0.01, dest: bus.sfx }); // the beep at power-on
      for (let i = 0; i < 24; i++) noise(t + 0.5 + i * 0.045, 0.02, { f: 600 + (i % 3) * 200, q: 3, v: 0.08, dest: bus.sfx }); // the drive seeking
      noise(t + 0.5, 1.2, { type: 'lowpass', f: 300, v: 0.03, dest: bus.sfx });
      return 1.9;
    },
    mac(t) { tone(t, 523, 0.5, { type: 'sine', v: 0.08, r: 0.6, wet: 0.4, dest: bus.sfx }); tone(t, 784, 0.5, { v: 0.05, r: 0.6, wet: 0.4, dest: bus.sfx }); return 1.1; },
    chime(t) { for (const n of [48, 55, 60, 64, 67]) tone(t, midi(n), 1.4, { type: 'tri', v: 0.035, a: 0.01, r: 1.2, wet: 0.5, dest: bus.sfx }); return 2.0; },
    imac(t) { noise(t, 0.7, { type: 'lowpass', f: 500, v: 0.03, dest: bus.sfx }); for (const n of [53, 60, 65, 69]) tone(t + 0.6, midi(n), 1.3, { type: 'tri', v: 0.035, r: 1.2, wet: 0.5, dest: bus.sfx }); return 2.3; },
    wheel(t) { let x = 0; for (let i = 0; i < 18; i++) { x += 0.12 * Math.pow(0.88, i); rim(t + x, 0.04, bus.sfx); } rim(t + x + 0.25, 0.06, bus.sfx); return x + 0.6; },
    unlock(t) { noise(t, 0.25, { f: 3000, q: 0.5, v: 0.02, dest: bus.sfx }); rim(t + 0.3, 0.07, bus.sfx); for (const [i, n] of [72, 76, 79].entries()) tone(t + 0.5 + i * 0.12, midi(n), 0.15, { v: 0.04, r: 0.3, wet: 0.3, dest: bus.sfx }); return 1.3; },
    envelope(t) { noise(t, 0.4, { f: 2500, q: 0.4, v: 0.04, dest: bus.sfx }); noise(t + 0.5, 0.7, { f: 1800, q: 0.3, v: 0.05, dest: bus.sfx }); return 1.4; },
    lid(t) { tone(t, 90, 0.15, { v: 0.1, r: 0.2, dest: bus.sfx }); noise(t, 0.05, { f: 400, v: 0.03, dest: bus.sfx }); return 1.2; },
    shimmer(t) { for (let i = 0; i < 12; i++) tone(t + i * 0.07, midi(84 + ((i * 5) % 12)), 0.2, { v: 0.015, r: 0.4, wet: 0.6, dest: bus.sfx }); return 1.6; },
    hello(t) { for (const [i, n] of [64, 67, 72].entries()) tone(t + i * 0.18, midi(n), 0.6, { type: 'sine', v: 0.04, r: 0.8, wet: 0.5, dest: bus.sfx }); return 1.6; },
    magsafe(t) { rim(t, 0.09, bus.sfx); tone(t + 0.15, midi(76), 0.25, { v: 0.035, r: 0.4, wet: 0.4, dest: bus.sfx }); tone(t + 0.35, midi(83), 0.3, { v: 0.035, r: 0.5, wet: 0.4, dest: bus.sfx }); return 1.1; },
    mini(t) { rim(t, 0.06, bus.sfx); noise(t + 0.2, 1.6, { type: 'lowpass', f: 900, v: 0.02, dest: bus.sfx }); return 1.8; },
  };

  // ---------- the music scheduler ----------
  let song = null, step = 0, nextT = 0, timer = null;
  function playStep(S, s, t) {
    const bar = Math.floor(s / 16) % S.chords.length, i = s % 16, ch = S.chords[bar];
    const spb = 60 / S.bpm, sixteenth = spb / 4;
    const on = (pat) => pat && pat[i] === 'x';
    if (S.pad && (S.pad.hits ? on(S.pad.hits) : i === 0)) {
      const dur = S.pad.hits ? sixteenth * 7 : spb * 4;
      for (const n of ch) {
        if (S.pad.inst === 'fm') fm(t, midi(n), dur * 0.5, { v: S.pad.v });
        else { tone(t, midi(n), dur, { type: S.pad.inst, v: S.pad.v, a: 0.6, d: 0.5, s: 0.8, r: 1.2, lp: S.pad.lp, wet: 0.5, detune: -6 }); tone(t, midi(n), dur, { type: S.pad.inst, v: S.pad.v * 0.6, a: 0.7, d: 0.5, s: 0.8, r: 1.2, lp: S.pad.lp, detune: 7 }); }
      }
    }
    if (S.lead && on(S.lead.pat)) {
      const n = ch[(i + bar) % ch.length] + (S.lead.oct || 0);
      const L = S.lead;
      if (L.inst === 'pluck') pluck(t, midi(n), { v: L.v });
      else if (L.inst === 'bell') fm(t, midi(n), 0.4, { ratio: 3.5, index: 1.4, v: L.v });
      else tone(t, midi(n), sixteenth * 0.8, { type: L.inst, v: L.v, r: 0.12, lp: L.lp, wet: 0.3 });
    }
    if (S.bass && on(S.bass.pat)) {
      const B = S.bass;
      tone(t, midi(ch[0] - 12), sixteenth * 1.6, { type: B.inst, v: B.v, r: 0.1, lp: B.lp || 1200 });
    }
    if (S.whistle && i === 0 && bar % 2 === 0) tone(t, midi(ch[2] + 12), spb * 1.6, { type: 'sine', v: 0.03, a: 0.08, r: 0.4, wet: 0.5 });
    if (S.hum && i === 0) tone(t, 60, spb * 4, { v: 0.015, a: 0.5, r: 0.5 });
    const D = S.drums || {};
    if (on(D.kick)) kick(t, 0.22);
    if (on(D.snare)) snare(t, 0.05);
    if (on(D.hat)) hat(t, 0.02);
    if (on(D.clap)) clap(t, 0.035);
    if (on(D.rim)) rim(t, 0.03);
  }
  function startSong(name) {
    stopSong();
    song = SONGS[name];
    if (!song) return;
    step = 0;
    nextT = ac.currentTime + 0.1;
    timer = setInterval(() => {
      while (nextT < ac.currentTime + 0.2) {
        playStep(song, step, nextT);
        const swing = song.swing && step % 2 ? song.swing : 0;
        nextT += (60 / song.bpm / 4) * (1 + swing);
        step++;
      }
    }, 30);
  }
  function stopSong() {
    if (timer) clearInterval(timer);
    timer = null;
    song = null;
  }

  // ---------- spoken lines and custom files (plain audio elements, so they also work from file://) ----------
  const clips = new Map();
  function clip(src) {
    if (!clips.has(src)) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
      a.ok = null;
      a.addEventListener('canplaythrough', () => (a.ok = true), { once: true });
      a.addEventListener('error', () => (a.ok = false), { once: true });
      clips.set(src, a);
    }
    return clips.get(src);
  }
  function fadeEl(el, to, ms) {
    const from = el.volume, t0 = performance.now();
    clearInterval(el._fade);
    el._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = from + (to - from) * k;
      if (k >= 1) {
        clearInterval(el._fade);
        if (to === 0) el.pause();
      }
    }, 30);
  }
  function say(el, vol) {
    if (!el || el.ok === false) return false;
    try {
      el.currentTime = 0;
      el.volume = vol;
      const p = el.play();
      if (p && p.catch) p.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- one visit to a stage ----------
  let visit = null;
  const ramp = (g, v, sec) => {
    const t = ac.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(v, t + sec);
  };
  const pad2 = (i) => String(i).padStart(2, '0');

  function begin(i) {
    const st = STAGES[i];
    if (!st) return;
    const v = { i, timers: [], els: [] };
    visit = v;
    ramp(bus.sfx, 0.9, 0.05);
    ramp(bus.music, 0, 0.05);
    const later = (sec, fn) => v.timers.push(setTimeout(() => visit === v && fn(), sec * 1000));
    const custom = CUSTOM[`${pad2(i)}-bite`] ? clip(CUSTOM[`${pad2(i)}-bite`]) : { ok: false };
    const ad = CUSTOM[`${pad2(i)}-ad`] ? clip(CUSTOM[`${pad2(i)}-ad`]) : { ok: false };
    const fx = SFX[st.sfx] ? SFX[st.sfx](ac.currentTime + 0.05) : 0.5;
    const line = custom.ok ? custom : clip(`audio/voice/${st.voice}.mp3`);
    later(fx + 0.2, () => {
      if (say(line, 0.85)) v.els.push(line);
      caption(st.line, st.source);
      const len = Number.isFinite(line.duration) ? line.duration : 3;
      // after the line, the advert: the music bed eases in under everything
      later(len + 0.8, () => {
        if (ad.ok) {
          ad.loop = true;
          if (say(ad, 0)) { v.els.push(ad); fadeEl(ad, 0.35, 4000); }
        } else {
          startSong(st.song);
          ramp(bus.music, 0.9, 4);
        }
        caption(null);
        // and, like an advert, the tagline comes back over the music
        later(16, () => {
          const tag = clip(`audio/voice/${st.tag || st.voice}.mp3`);
          ramp(bus.music, 0.45, 0.6);
          if (say(tag, 0.7)) v.els.push(tag);
          caption(st.tagLine || st.line, st.tagSource || st.source);
          const tl = Number.isFinite(tag.duration) ? tag.duration : 3;
          later(tl + 0.4, () => { ramp(bus.music, 0.9, 1.5); caption(null); });
        });
      });
    });
  }
  function end() {
    const v = visit;
    visit = null;
    if (!v) return;
    v.timers.forEach(clearTimeout);
    v.els.forEach((el) => fadeEl(el, 0, 900));
    if (ac) {
      ramp(bus.music, 0, 1.2);
      ramp(bus.sfx, 0, 0.6);
      const s = song;
      setTimeout(() => { if (song === s) stopSong(); }, 1300);
    }
    caption(null);
  }

  // ---------- the subtitle ----------
  let capEl = null;
  function caption(line, source) {
    capEl = capEl || document.getElementById('sound-line');
    if (!capEl) return;
    if (!line) { capEl.classList.remove('on'); return; }
    capEl.querySelector('q').textContent = line;
    capEl.querySelector('span').textContent = source ? ` ${source}, read aloud` : '';
    capEl.classList.add('on');
  }

  // ---------- what the page calls ----------
  let held = { i: null, since: 0 };
  const Sound = {
    get on() { return enabled; },
    toggle() {
      if (!enabled) {
        if (!init()) return false;
        if (ac.state === 'suspended') ac.resume();
        enabled = true;
        held.since = performance.now() - 400;
      } else {
        enabled = false;
        end();
      }
      return enabled;
    },
    // Called every frame with the stage you are resting on, or null while you travel.
    update(i, now) {
      if (i !== held.i) {
        held = { i, since: now };
        if (visit) end();
      }
      if (!enabled || i == null || visit) return;
      if (now - held.since > 700) begin(i);
    },
    // warm the spoken lines so they start on time
    preload() {
      STAGES.forEach((s) => { clip(`audio/voice/${s.voice}.mp3`); if (s.tag) clip(`audio/voice/${s.tag}.mp3`); });
      Object.values(CUSTOM).forEach(clip);
    },
  };
  global.Sound = Sound;
})(window);
