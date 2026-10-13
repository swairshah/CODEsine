// sound.js: the soundtrack engine. What plays is set in soundtrack.js; this file decides when.
//
// Background music follows your scroll: between two machines the old track and the new one are
// crossfaded on an equal-power curve, so one fades out exactly as the other fades in, and at rest
// a machine's track simply keeps playing. A sound bite plays once each time you arrive, ducks the
// music while it plays, and fades out at its end, after `biteMax` seconds, or as soon as you leave.
//
// Sources are YouTube clips (in small visible players), audio files, or the synth rack below, which
// makes original placeholder music and period sound effects in the browser.
'use strict';

(function (global) {
  const CFG = global.SOUNDTRACK || { stages: [] };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  let ac = null, out = null, verb = null, noiseBuf = null, curDest = null;
  const bus = {};
  let enabled = false;

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
      bus[k].gain.value = 1;
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
    g.connect(o.dest || curDest || bus.music);
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


  // ---------- one sixteenth of a synth music bed ----------
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

  // ---------- sources ----------
  // Every source gives the same small interface: start(), stop(), gain(v), elapsed(), length(), ready.

  // a synth music bed, with its own volume
  class SynthSource {
    constructor(spec) { this.song = SONGS[spec.song]; this.g = ac.createGain(); this.g.gain.value = 0; this.g.connect(out); this.ready = !!this.song; this.timer = null; }
    start() {
      if (this.timer || !this.song) return;
      let stepN = 0, next = ac.currentTime + 0.08;
      this.t0 = ac.currentTime;
      this.timer = setInterval(() => {
        while (next < ac.currentTime + 0.2) {
          curDest = this.g;
          playStep(this.song, stepN, next);
          curDest = null;
          next += 60 / this.song.bpm / 4;
          stepN++;
        }
      }, 30);
    }
    stop() { clearInterval(this.timer); this.timer = null; }
    gain(v) { this.g.gain.setTargetAtTime(v, ac.currentTime, 0.03); }
    elapsed() { return this.timer ? ac.currentTime - this.t0 : 0; }
    length() { return Infinity; }
  }

  // an audio file; plain <audio> so it also works when the page is opened from disk
  class FileSource {
    constructor(spec, loop) {
      this.spec = spec;
      this.loop = loop;
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.src = spec.src;
      this.el.volume = 0;
      this.ready = true;
      this.el.addEventListener('error', () => (this.ready = false));
      this.el.addEventListener('timeupdate', () => {
        const end = this.spec.end;
        if (end != null && this.el.currentTime >= end) {
          if (this.loop) this.el.currentTime = this.spec.start || 0;
          else this.el.pause();
        }
      });
      this.el.loop = loop && this.spec.end == null;
    }
    start() {
      try { this.el.currentTime = this.spec.start || 0; } catch (e) {}
      const p = this.el.play();
      if (p && p.catch) p.catch(() => {});
      if (this.spec.sfx && SFX[this.spec.sfx]) SFX[this.spec.sfx](ac.currentTime + 0.02);
    }
    stop() { this.el.pause(); }
    gain(v) { this.el.volume = clamp(v, 0, 1); }
    elapsed() { return this.el.currentTime - (this.spec.start || 0); }
    length() {
      const end = this.spec.end != null ? this.spec.end : this.el.duration;
      return Number.isFinite(end) ? end - (this.spec.start || 0) : 4;
    }
  }

  // a YouTube clip, in a small player that stays visible in the dock while it is heard
  let ytApi = null;
  function loadYouTube() {
    if (ytApi) return ytApi;
    ytApi = new Promise((resolve, reject) => {
      if (global.YT && global.YT.Player) return resolve(global.YT);
      const prev = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(global.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = reject;
      document.head.appendChild(s);
      setTimeout(() => reject(new Error('YouTube did not load')), 8000);
    });
    return ytApi;
  }
  const canYouTube = () => CFG.preferYouTube && /^https?:$/.test(location.protocol);
  class YouTubeSource {
    constructor(spec, loop, label) {
      this.spec = spec;
      this.loop = loop;
      this.ready = false;
      this.failed = false;
      this.want = false;
      this.vol = 0;
      this.card = document.createElement('figure');
      this.card.className = 'yt-card';
      const box = document.createElement('div');
      const cap = document.createElement('figcaption');
      cap.textContent = `${label} · ${spec.title || ''}`;
      this.card.append(box, cap);
      dock().appendChild(this.card);
      loadYouTube().then((YT) => {
        this.player = new YT.Player(box, {
          width: 200,
          height: 200,
          videoId: spec.id,
          playerVars: { start: spec.start || 0, end: spec.end || undefined, controls: 1, modestbranding: 1, rel: 0, playsinline: 1 },
          events: {
            onReady: () => { this.ready = true; this.player.setVolume(0); if (this.want) this.start(); },
            onError: () => { this.failed = true; this.card.remove(); },
            onStateChange: (e) => {
              // play the clip's span; music loops back to its start
              if (e.data === YT.PlayerState.ENDED && this.loop && this.want) { this.player.seekTo(this.spec.start || 0, true); this.player.playVideo(); }
            },
          },
        });
      }).catch(() => { this.failed = true; this.card.remove(); });
    }
    start() {
      this.want = true;
      this.card.classList.add('on');
      if (!this.ready) return;
      this.player.seekTo(this.spec.start || 0, true);
      this.player.playVideo();
      this.t0 = performance.now();
    }
    stop() {
      this.want = false;
      this.card.classList.remove('on');
      if (this.ready) this.player.pauseVideo();
    }
    gain(v) {
      const n = Math.round(clamp(v, 0, 1) * 100);
      if (this.ready && n !== this.vol) { this.player.setVolume(n); this.vol = n; }
    }
    elapsed() {
      if (!this.ready || !this.player.getCurrentTime) return 0;
      return this.player.getCurrentTime() - (this.spec.start || 0);
    }
    length() {
      const end = this.spec.end != null ? this.spec.end : this.ready && this.player.getDuration ? this.player.getDuration() : null;
      return end ? end - (this.spec.start || 0) : 30;
    }
  }

  let dockEl = null;
  function dock() {
    if (!dockEl) {
      dockEl = document.createElement('div');
      dockEl.className = 'yt-dock';
      dockEl.setAttribute('aria-label', 'Now playing');
      document.body.appendChild(dockEl);
    }
    return dockEl;
  }

  // Pick the first source in a list that can play here.
  function make(list, loop, label) {
    for (const spec of list || []) {
      if (spec.kind === 'youtube' && canYouTube()) return new YouTubeSource(spec, loop, label);
      if (spec.kind === 'file') return new FileSource(spec, loop);
      if (spec.kind === 'synth') return new SynthSource(spec);
    }
    return null;
  }
  // the next choice after one that failed
  function fallback(list, failed, loop, label) {
    const i = list.indexOf(failed.spec);
    return make(list.slice(i + 1), loop, label);
  }

  // ---------- the mix ----------
  const musics = new Map(); // stage → { src, level, idle }
  let bite = null; // { i, src, t0, level, leaving, spec }
  let held = { i: null, since: 0 };
  let last = 0;

  function musicFor(i) {
    let m = musics.get(i);
    if (!m) {
      const st = CFG.stages[i];
      m = { src: make(st && st.music, true, 'music'), level: 0, idle: 0, playing: false };
      musics.set(i, m);
    }
    if (m.src && m.src.failed) { m.src = fallback(CFG.stages[i].music, m.src, true, 'music'); m.playing = false; }
    return m;
  }

  function startBite(i) {
    const st = CFG.stages[i];
    let src = make(st && st.bite, false, 'sound bite');
    if (!src) return;
    bite = { i, src, t0: performance.now(), level: 0, leaving: false, spec: src.spec || {} };
    src.start();
    caption(bite.spec.line, bite.spec.source);
  }
  function endBite() {
    if (bite) { bite.src.stop(); if (bite.src.card) bite.src.card.remove(); }
    bite = null;
    caption(null);
  }

  function step(L, rest, now) {
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    const N = CFG.stages.length;
    const mod = (a) => ((a % N) + N) % N;

    // bites: start after resting a moment; fade in, then out at the end, after biteMax, or on leaving
    if (rest !== held.i) {
      held = { i: rest, since: now };
      if (bite) bite.leaving = true;
    }
    if (bite && bite.src.failed) {
      const next = fallback(CFG.stages[bite.i].bite, bite.src, false, 'sound bite');
      bite.src.card && bite.src.card.remove();
      if (next) { bite.src = next; bite.spec = next.spec || {}; next.start(); caption(bite.spec.line, bite.spec.source); }
      else endBite();
    }
    if (!bite && rest != null && !held.done && now - held.since > CFG.biteDelay * 1000) {
      held.done = true;
      startBite(rest);
    }
    let duck = 1;
    if (bite) {
      const el = bite.src.elapsed(), len = Math.min(bite.src.length(), CFG.biteMax);
      let target = CFG.biteLevel;
      if (el < CFG.biteFadeIn) target *= Math.max(0, el) / CFG.biteFadeIn;
      if (el > len - CFG.biteFadeOut) target *= clamp((len - el) / CFG.biteFadeOut, 0, 1);
      const k = bite.leaving ? dt / CFG.leaveFadeOut : 1;
      bite.level = bite.leaving ? Math.max(0, bite.level - CFG.biteLevel * k) : target;
      bite.src.gain(bite.level);
      duck = 1 - (1 - CFG.duck) * (bite.level / CFG.biteLevel);
      if ((bite.leaving && bite.level <= 0.001) || el >= len) endBite();
    }

    // music: an equal-power crossfade between the machine you are leaving and the one ahead
    const K = Math.floor(L), t = L - K;
    const want = new Map([[mod(K), Math.cos((t * Math.PI) / 2)]]);
    if (t > 0.0005) want.set(mod(K + 1), Math.sin((t * Math.PI) / 2));
    for (const i of new Set([...want.keys(), ...musics.keys()])) {
      const w = want.get(i) || 0;
      if (w <= 0 && !musics.has(i)) continue;
      const m = musicFor(i);
      if (!m.src) continue;
      const target = w * CFG.musicLevel * duck;
      m.level += (target - m.level) * (1 - Math.exp(-dt / 0.12));
      if (target > 0.001 && !m.playing) { m.src.start(); m.playing = true; }
      m.src.gain(m.level);
      if (w <= 0 && m.level < 0.002) {
        m.idle += dt;
        if (m.playing && m.idle > 1.5) { m.src.stop(); m.playing = false; }
      } else m.idle = 0;
    }
  }

  // ---------- the subtitle ----------
  let capEl = null;
  function caption(line, source) {
    capEl = capEl || document.getElementById('sound-line');
    if (!capEl) return;
    if (!line) { capEl.classList.remove('on'); return; }
    capEl.querySelector('q').textContent = line;
    capEl.querySelector('span').textContent = source || '';
    capEl.classList.add('on');
  }

  // ---------- what the page calls ----------
  const Sound = {
    get on() { return enabled; },
    toggle() {
      if (!enabled) {
        if (!init()) return false;
        if (ac.state === 'suspended') ac.resume();
        enabled = true;
        held = { i: null, since: 0 };
        if (canYouTube()) loadYouTube().catch(() => {});
      } else {
        enabled = false;
        endBite();
        for (const m of musics.values()) if (m.src) { m.src.gain(0); m.src.stop(); m.playing = false; m.level = 0; }
      }
      dock().classList.toggle('off', !enabled);
      return enabled;
    },
    // every frame: L is the continuous level, rest the machine you are resting on (or null)
    update(L, rest, now) {
      if (enabled) step(L, rest, now);
    },
    preload() {},
    // for checking the mix: each live source's level and position
    debug() {
      const row = (src, level) => src && { kind: src.constructor.name, id: src.spec && (src.spec.id || src.spec.src || src.spec.song), level: +level.toFixed(3), at: +src.elapsed().toFixed(1), ready: src.ready, vol: src.vol };
      return { bite: bite && { i: bite.i, ...row(bite.src, bite.level), leaving: bite.leaving }, music: [...musics.entries()].map(([i, m]) => ({ i, playing: m.playing, ...row(m.src, m.level) })) };
    },
  };
  global.Sound = Sound;
})(window);
