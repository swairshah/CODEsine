const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'audio/previews/options.json')));
const storageKey = 'engraved-machines.music-picks.v1';

async function page(saved = '{}', storageFails = false) {
  const nodes = new Map(), created = [], downloads = [];
  const storage = new Map([[storageKey, saved]]);
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.attributes = {}; this.paused = true; this.currentTime = 0; created.push(this); }
    set id(id) { this._id = id; nodes.set(id, this); }
    get id() { return this._id; }
    append(...children) { this.children.push(...children); }
    remove() { nodes.delete(this.id); }
    setAttribute(k, v) { this.attributes[k] = v; }
    addEventListener(k, fn) { (this.events[k] ||= []).push(fn); }
    emit(k) { for (const fn of this.events[k] || []) fn(); }
    click() { if (this.download) downloads.push(this); this.emit('click'); }
    pause() { this.paused = true; this.emit('pause'); }
    play() { this.paused = false; this.emit('play'); return Promise.resolve(); }
  }
  for (const match of fs.readFileSync(path.join(root, 'music.html'), 'utf8').matchAll(/id="([^"]+)"/g)) {
    const node = new Element('div'); node.id = match[1];
  }
  const context = {
    document: { getElementById: id => nodes.get(id), createElement: tag => new Element(tag), body: new Element('body') },
    fetch: async () => ({ ok: true, json: async () => catalog }),
    localStorage: {
      getItem: k => { if (storageFails) throw new Error('Storage blocked'); return storage.get(k); },
      setItem: (k, v) => { if (storageFails) throw new Error('Storage blocked'); storage.set(k, v); },
    },
    Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, setTimeout: fn => fn(),
  };
  await vm.runInNewContext(fs.readFileSync(path.join(root, 'js/music-picker.js'), 'utf8'), context);
  return { nodes, created, storage, downloads };
}

test('13 machines have four existing local previews each, including the current choice', () => {
  assert.equal(catalog.stages.length, 13);
  for (const stage of catalog.stages) {
    assert.equal(stage.tracks.length, 4);
    assert.equal(stage.tracks.filter(t => t.current).length, 1);
    for (const track of stage.tracks) {
      assert.ok(fs.statSync(path.join(root, track.file)).size > 1000);
      assert.equal(track.playStart, 0);
      assert.equal(track.playEnd, 40);
      assert.equal(track.end - track.start, 40);
    }
  }
});

test('page renders 52 playable cards and restores only valid picks', async () => {
  const { nodes, created } = await page(JSON.stringify({ '00': catalog.stages[0].tracks[1].id, '01': 'not-a-track', '99': 'bogus' }));
  assert.equal(created.filter(n => n.className === 'track').length, 52);
  assert.equal(nodes.get('count').textContent, '1 / 13 picked');
  assert.equal(nodes.get('machine-nav').children.length, 13);
});

test('choosing, exporting and clearing a pick work without modifying the app', async () => {
  const { nodes, storage, downloads } = await page();
  const track = catalog.stages[0].tracks[1];
  const radio = nodes.get(`pick-00-${track.id}`);
  radio.checked = true; radio.emit('change');
  assert.equal(nodes.get('count').textContent, '1 / 13 picked');
  assert.equal(JSON.parse(storage.get(storageKey))['00'], track.id);
  nodes.get('export').click();
  assert.equal(downloads[0].download, 'soundtrack-picks.json');
  nodes.get('clear-00').click();
  assert.equal(nodes.get('count').textContent, '0 / 13 picked');
  assert.equal(nodes.get('export').disabled, true);
  assert.equal(radio.checked, false);
});

test('only one sample plays; switching to M1 updates the shared player', async () => {
  const { nodes, created } = await page();
  const controls = created.filter(n => n.className === 'play' && !n.id);
  controls[0].click();
  assert.equal(controls[0].attributes['aria-pressed'], 'true');
  controls[1].click();
  assert.equal(controls[0].attributes['aria-pressed'], 'false');
  assert.equal(controls[1].attributes['aria-pressed'], 'true');
  controls[1].click();
  assert.equal(nodes.get('audio').paused, true);
  nodes.get('play-bite').click();
  assert.equal(nodes.get('audio').src, 'audio/custom/09-bite.mp3');
  assert.match(nodes.get('playing-source').href, /t=377s/);
});

test('blocked storage still allows choices and gives an export warning', async () => {
  const { nodes } = await page('{}', true);
  const radio = nodes.get(`pick-00-${catalog.stages[0].tracks[0].id}`);
  radio.checked = true; radio.emit('change');
  assert.equal(nodes.get('count').textContent, '1 / 13 picked');
  assert.match(nodes.get('save-status').textContent, /Download your picks/);
});
