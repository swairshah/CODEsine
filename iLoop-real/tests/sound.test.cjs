const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function harness({ strict = false } = {}) {
  const elements = [];
  const gesture = { on: false };
  const listeners = {};
  // a tap: a gesture while the page's listeners run
  const tap = () => { gesture.on = true; for (const fn of listeners.pointerup || []) fn(); gesture.on = false; };
  let now = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = () => ({ gain: param(), threshold: param(), ratio: param(), frequency: param(), Q: param(), detune: param(), connect(n) { return n; }, start() {}, stop() {} });
  class AudioContext {
    currentTime = 0; sampleRate = 100; state = 'running'; destination = node();
    createGain = node; createDynamicsCompressor = node; createConvolver = node;
    createOscillator = node; createBiquadFilter = node; createBufferSource = node;
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
  }
  class Audio {
    currentTime = 0; duration = NaN; volume = 1; paused = true; events = {};
    constructor() { elements.push(this); }
    addEventListener(event, fn) { this.events[event] = fn; }
    // strict is Safari: an element may start only in a gesture, and once it has, it stays allowed
    play() {
      if (strict && !gesture.on && !this.allowed) { const e = new Error('refused'); e.name = 'NotAllowedError'; return Promise.reject(e); }
      this.allowed = true; this.paused = false; return Promise.resolve();
    }
    pause() { this.paused = true; }
    fail() { this.events.error(); }
  }
  const el = () => ({ classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, append() {}, appendChild() {}, remove() {}, querySelector: el });
  const context = {
    window: { AudioContext, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), addEventListener: (e, fn) => (listeners[e] = listeners[e] || []).push(fn) }, Audio,
    document: { createElement: el, getElementById: el, body: el() },
    location: { protocol: 'file:' }, performance: { now: () => now },
    setInterval: () => 1, clearInterval() {}, setTimeout() {},
  };
  vm.createContext(context);
  for (const f of ['js/soundtrack.js', 'js/sound.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), context);
  const sound = context.window.Sound;
  const frame = (level = 0, rest = 0, elapsed = 100) => { now += elapsed; sound.update(level, rest, now); };
  const arrive = () => { frame(); frame(0, 0, 700); };
  return { config: context.window.SOUNDTRACK, sound, elements, frame, arrive, gesture, tap };
}

test('all 13 stages prefer existing local audio and retain both original fallbacks', () => {
  const { config } = harness();
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'audio/custom/sources.json')));
  assert.equal(config.stages.length, 13);
  assert.equal(config.preferYouTube, false);
  for (const [i, stage] of config.stages.entries()) {
    assert.equal(stage.name, manifest.stages[i].name);
    for (const kind of ['bite', 'music']) {
      assert.equal(stage[kind][0].kind, 'file');
      assert.equal(stage[kind][0].src, manifest.stages[i][kind].file);
      assert.ok(fs.statSync(path.join(root, stage[kind][0].src)).size > 1000);
      assert.equal(stage[kind][1].kind, 'youtube');
      assert.equal(stage[kind][1].id, new URL(manifest.stages[i][kind].url).searchParams.get('v'));
      if (kind === 'bite') {
        assert.equal(stage[kind][1].start, manifest.stages[i].bite.start);
        assert.equal(stage[kind][1].end, manifest.stages[i].bite.end);
        assert.equal(stage[kind][0].line, manifest.stages[i].bite.line);
        assert.ok(manifest.stages[i].bite.end - manifest.stages[i].bite.start <= config.biteMax);
      }
      assert.equal(stage[kind][2].kind, kind === 'bite' ? 'file' : 'synth');
      if (kind === 'bite') assert.ok(fs.existsSync(path.join(root, stage[kind][2].src)));
    }
  }
});

test('missing local files fall back to narration and synth without YouTube', () => {
  const { sound, elements, arrive, frame } = harness();
  sound.toggle(); arrive();
  const failed = elements.filter(el => /custom\/00-(music|bite)\.mp3$/.test(el.src));
  assert.equal(failed.length, 2);
  failed.forEach(el => el.fail());
  frame();
  const state = sound.debug();
  assert.equal(state.music[0].kind, 'SynthSource');
  assert.equal(state.bite.id, 'audio/voice/00.mp3');
  assert.ok(elements.filter(el => el.src.endsWith('00-music.mp3')).every(el => el.paused));
});

test('unknown file duration does not fade a bite after four seconds', () => {
  const { sound, elements, arrive, frame, config } = harness();
  sound.toggle(); arrive();
  const bite = elements.find(el => el.src.endsWith('00-bite.mp3'));
  bite.currentTime = 4.5;
  frame();
  assert.equal(sound.debug().bite.level, config.biteLevel);
  bite.duration = 13.4;
  bite.currentTime = 13.4;
  frame();
  assert.equal(sound.debug().bite, null);
  assert.ok(bite.paused);
});

test('music crossfades equally at midpoint and is ducked during speech', () => {
  const { sound, elements, frame, arrive, config } = harness();
  sound.toggle();
  for (let i = 0; i < 30; i++) frame(0.5, null);
  const music = sound.debug().music;
  for (const track of music) assert.ok(Math.abs(track.level - config.musicLevel / Math.sqrt(2)) < 0.003);
  arrive();
  elements.find(el => el.src.endsWith('00-bite.mp3')).currentTime = 1;
  for (let i = 0; i < 30; i++) frame();
  assert.ok(Math.abs(sound.debug().music[0].level - config.musicLevel * config.duck) < 0.003);
});

test('bites fade on leaving, play once per arrival, and mute stops files', () => {
  const { sound, elements, arrive, frame } = harness();
  sound.toggle(); arrive();
  elements.find(el => el.src.endsWith('00-bite.mp3')).currentTime = 1;
  frame();
  for (let i = 0; i < 10; i++) frame(0.2, null);
  assert.equal(sound.debug().bite, null);
  arrive();
  assert.ok(sound.debug().bite);
  const bite = elements.filter(el => el.src.endsWith('00-bite.mp3')).at(-1);
  bite.duration = 13.4; bite.currentTime = 13.4;
  frame(); frame(0, 0, 1000);
  assert.equal(sound.debug().bite, null);
  assert.equal(sound.toggle(), false);
  assert.ok(elements.every(el => el.paused));
});

test('music and bites switch separately', () => {
  const { sound, elements, arrive, frame } = harness();
  // music only: the track plays, no bite starts, and autoplay need not wait
  sound.set(true, false); arrive();
  for (let i = 0; i < 10; i++) frame();
  assert.equal(sound.debug().bite, null);
  assert.ok(sound.debug().music[0].level > 0.1);
  assert.equal(sound.busy(), false);
  // bites on as well, while resting: this machine's bite plays
  sound.setBites(true); arrive();
  assert.ok(sound.debug().bite);
  assert.equal(sound.busy(), true);
  // music off: the bite carries on, the music fades to silence
  sound.setMusic(false);
  for (let i = 0; i < 30; i++) frame();
  assert.ok(sound.debug().bite);
  assert.ok(sound.debug().music.every(m => m.level < 0.002));
  // bites off too: everything stops
  assert.equal(sound.setBites(false), false);
  assert.equal(sound.on, false);
  assert.ok(elements.every(el => el.paused));
});

test('in Safari, files that start after a scroll still play, on players unlocked by the click', async () => {
  const { sound, elements, frame, gesture } = harness({ strict: true });
  // the click that turns sound on
  gesture.on = true; sound.set(true, true); gesture.on = false;
  await new Promise((r) => setImmediate(r));
  // scroll, with no gesture, three machines on, and rest there
  for (let i = 0; i <= 30; i++) frame(i / 10, null);
  frame(3, 3); frame(3, 3, 700);
  await new Promise((r) => setImmediate(r));
  const d = sound.debug();
  const music = d.music.find((m) => m.i === 3);
  assert.equal(music.kind, 'FileSource');
  assert.match(music.id, /03-music\.mp3$/);
  assert.match(d.bite.id, /03-bite\.mp3$/);
  for (const name of ['03-music.mp3', '03-bite.mp3']) assert.ok(elements.some((el) => el.src.endsWith(name) && !el.paused), name);
});

test('a file refused for want of a gesture waits for the next one instead of falling back', async () => {
  const { sound, elements, arrive, tap } = harness({ strict: true });
  // sound turned on outside a gesture (the music switch remembered from last time), so nothing is unlocked
  sound.set(true, false); arrive();
  await new Promise((r) => setImmediate(r));
  assert.equal(sound.debug().music[0].kind, 'FileSource');
  assert.ok(elements.filter((el) => el.src.endsWith('00-music.mp3')).every((el) => el.paused));
  // the first tap: the waiting track starts
  tap();
  await new Promise((r) => setImmediate(r));
  assert.ok(elements.some((el) => el.src.endsWith('00-music.mp3') && !el.paused));
});
