'use strict';

(async function () {
  const $ = (id) => document.getElementById(id);
  const key = 'engraved-machines.music-picks.v1';
  const audio = $('audio');
  let stages = [], picks = {}, active = null, activeButton = null, request = 0;
  let storageAvailable = true;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const pressed = (value) => {
    if (!activeButton) return;
    activeButton.setAttribute('aria-pressed', String(value));
    activeButton.setAttribute('aria-label', `${value ? 'Pause' : 'Play'} ${active?.title || 'new M1 clip'}`);
    activeButton.textContent = value ? 'Pause' : activeButton.id === 'play-bite' ? 'Play new M1 clip' : 'Play sample';
  };
  const problem = () => {
    pressed(false);
    $('play-status').textContent = 'This sample could not play. Try again, or use the YouTube link.';
  };

  async function play(track, button) {
    if (activeButton === button && !audio.paused) { audio.pause(); return; }
    const token = ++request;
    $('play-status').textContent = '';
    if (activeButton !== button || audio.ended || audio.currentTime >= (track.playEnd ?? Infinity) || audio.error) {
      audio.pause();
      pressed(false);
      active = track;
      activeButton = button;
      audio.src = track.file;
      audio.currentTime = track.playStart || 0;
      $('playing-title').textContent = track.title;
      $('playing-detail').textContent = track.artist || 'Apple Event, November 2020';
      $('playing-source').href = track.url;
      $('playing-source').textContent = button.id === 'play-bite' ? 'Original event on YouTube ↗' : 'Full track on YouTube ↗';
      $('playing-source').hidden = false;
    }
    try {
      await audio.play();
    } catch (error) {
      if (token === request && error.name !== 'AbortError') problem();
    }
  }
  audio.addEventListener('play', () => pressed(true));
  audio.addEventListener('pause', () => pressed(false));
  audio.addEventListener('ended', () => pressed(false));
  audio.addEventListener('error', problem);
  audio.addEventListener('timeupdate', () => {
    if (active?.playEnd != null && audio.currentTime >= active.playEnd) audio.pause();
  });

  $('play-bite').addEventListener('click', () => play({
    title: 'Our first chip designed specifically for the Mac',
    file: 'audio/custom/09-bite.mp3',
    url: 'https://www.youtube.com/watch?v=5AwdkGKmZ0I&t=377s',
  }, $('play-bite')));

  function updatePicks() {
    const count = Object.keys(picks).length;
    $('count').textContent = `${count} / ${stages.length} picked`;
    $('export').disabled = count === 0;
    for (const stage of stages) {
      $(`picked-${stage.id}`).textContent = picks[stage.id] ? '✓' : '';
      $(`picked-${stage.id}`).hidden = !picks[stage.id];
      $(`clear-${stage.id}`).hidden = !picks[stage.id];
      for (const track of stage.tracks) $(`pick-${stage.id}-${track.id}`).checked = picks[stage.id] === track.id;
    }
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(picks)); }
    catch (_) { storageAvailable = false; }
    $('save-status').textContent = storageAvailable ? 'Picks saved in this browser.' : 'Browser storage is unavailable. Download your picks before closing this page.';
    updatePicks();
  }

  function render(stage, index) {
    const link = el('a');
    link.href = `#machine-${stage.id}`;
    link.append(el('span', 'year', stage.year), el('span', '', stage.name));
    const tick = el('span', 'picked'); tick.id = `picked-${stage.id}`;
    tick.setAttribute('aria-label', 'Choice saved');
    link.append(tick); $('machine-nav').append(link);

    const section = el('section', 'machine'); section.id = `machine-${stage.id}`;
    section.setAttribute('aria-labelledby', `heading-${stage.id}`);
    const heading = el('div', 'machine-heading');
    const title = el('h2', '', stage.name); title.id = `heading-${stage.id}`;
    heading.append(el('span', 'number', String(index + 1).padStart(2, '0')), title, el('span', 'year', stage.year));
    const clear = el('button', 'clear', 'Clear pick'); clear.type = 'button'; clear.id = `clear-${stage.id}`;
    clear.setAttribute('aria-label', `Clear pick for ${stage.name}`);
    clear.addEventListener('click', () => { delete picks[stage.id]; save(); });
    heading.append(clear); section.append(heading);
    const tracks = el('div', 'tracks'); tracks.setAttribute('role', 'group'); tracks.setAttribute('aria-labelledby', title.id);
    for (const track of stage.tracks) {
      const card = el('article', 'track');
      const badges = el('div', 'badges');
      if (track.current) badges.append(el('span', 'badge current', 'In the app now'));
      if (track.appleUsed) badges.append(el('span', 'badge', 'Apple used'));
      card.append(badges, el('h3', '', track.title), el('p', 'artist', track.artist), el('p', 'style', track.style), el('p', 'context', track.context));
      const button = el('button', 'play', 'Play sample'); button.type = 'button';
      button.setAttribute('aria-label', `Play ${track.title} by ${track.artist}`);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => play(track, button));
      const source = el('a', 'youtube', 'Full track on YouTube ↗'); source.href = track.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
      const label = el('label', 'pick');
      const radio = el('input'); radio.type = 'radio'; radio.name = `pick-${stage.id}`; radio.value = track.id; radio.id = `pick-${stage.id}-${track.id}`;
      radio.setAttribute('aria-label', `Choose ${track.title} for ${stage.name}`);
      radio.addEventListener('change', () => { if (radio.checked) { picks[stage.id] = track.id; save(); } });
      label.append(radio, el('span', '', 'My pick for this machine'));
      card.append(button, source, label); tracks.append(card);
    }
    section.append(tracks); $('options').append(section);
  }

  $('export').addEventListener('click', () => {
    const selected = stages.filter(s => picks[s.id]).map(stage => {
      const track = stage.tracks.find(t => t.id === picks[stage.id]);
      return { stage: stage.name, stageId: stage.id, artist: track.artist, title: track.title, url: track.url, videoId: track.id };
    });
    const blob = new Blob([JSON.stringify({ version: 1, selections: selected }, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = el('a'); link.href = url; link.download = 'soundtrack-picks.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('save-status').textContent = 'Picks downloaded. Send me soundtrack-picks.json to apply them.';
  });

  try {
    const response = await fetch('audio/previews/options.json');
    if (!response.ok) throw new Error('The listening list could not load');
    ({ stages } = await response.json());
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      for (const stage of stages) if (stage.tracks.some(t => t.id === saved?.[stage.id])) picks[stage.id] = saved[stage.id];
    } catch (_) { storageAvailable = false; }
    $('loading').remove();
    stages.forEach(render);
    updatePicks();
    if (!storageAvailable) $('save-status').textContent = 'Browser storage is unavailable. Download your picks before closing this page.';
  } catch (error) {
    $('loading').textContent = 'Could not load the listening list. Run ./serve.sh and open http://localhost:8642/music.html, then reload.';
  }
})();
