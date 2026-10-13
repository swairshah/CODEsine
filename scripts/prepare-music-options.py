#!/usr/bin/env python3
"""Build a four-track audition list per machine from SOUNDTRACK.md.

Requires yt-dlp and ffmpeg. Current app tracks are reused; other tracks get
40-second local previews. The source recordings remain copyrighted.
"""
import argparse
import importlib.util
import hashlib
import json
import subprocess
from pathlib import Path
import re
from concurrent.futures import ThreadPoolExecutor
import tempfile

ROOT = Path(__file__).resolve().parents[1]
module = importlib.util.spec_from_file_location('prepare_audio', ROOT / 'scripts/prepare-audio.py')
audio = importlib.util.module_from_spec(module)
module.loader.exec_module(audio)

STYLES = [
    ['Instrumental synth', 'Bright disco pop', 'Funk and guitar', 'Disco groove'],
    ['Electronic disco', 'Falsetto disco', 'Orchestral pop', 'Minimal electronic'],
    ['Instrumental score', 'Synth rock', 'Sparse pop and funk', 'Bright synth-pop'],
    ['Heavy alternative rock', 'Funk rock', 'Acoustic alternative', 'Playful dance'],
    ['Psychedelic pop', 'Sample-based dance', 'Electronic hip-hop', 'Electronic pop'],
    ['Instrumental breakbeat', 'Guitar rock', 'Hip-hop and dance', 'French house'],
    ['Light indie pop', 'Gentle acoustic pop', 'Electronic hip-hop', 'Pop and R&B'],
    ['Acoustic folk-pop', 'Orchestral pop', 'Psychedelic synth-pop', 'Alternative hip-hop'],
    ['Uplifting pop', 'Australian hip-hop', 'Retro synth-pop', 'Disco-pop'],
    ['Disco-pop', 'Bright funk-pop', 'Soft disco groove', 'Robotic electronic'],
    ['Soul and funk', 'Electronic dance', 'Pop and hip-hop', 'Warm indie pop'],
    ['Dark electronic', 'Apple-sound collage', 'Brass and hip-hop', 'Fast synth-pop'],
    ['Pop-rock', 'Light disco-pop', 'West Coast hip-hop', 'Dreamy pop'],
]


def catalog():
    current = json.loads((ROOT / 'audio/custom/sources.json').read_text())['stages']
    sections = re.split(r'^## \d+\. ', (ROOT / 'SOUNDTRACK.md').read_text(), flags=re.M)[1:]
    if len(sections) != len(current):
        raise ValueError('Soundtrack stage count has changed')
    stages = []
    for i, (section, active) in enumerate(zip(sections, current)):
        heading = section.splitlines()[0]
        stage = {'id': f'{i:02}', 'name': active['name'], 'year': int(heading.rsplit(', ', 1)[1]), 'tracks': []}
        songs = section.split('**Songs**', 1)[1]
        for j, match in enumerate(re.finditer(r'^\d+\. (★ )?\[([^\]]+)\]\((https://www\.youtube\.com/watch\?v=([^&)]+))\)\.(.*)$', songs, re.M)):
            used, label, url, video_id, context = match.groups()
            artist, title = label.split(', ', 1)
            is_current = url == active['music']['url']
            stage['tracks'].append({
                'id': video_id, 'artist': artist, 'title': title.strip('"'),
                'style': STYLES[i][j], 'context': context.strip(), 'appleUsed': bool(used),
                'current': is_current, 'url': url,
                'file': f'audio/previews/{video_id}.mp3',
                'localSource': active['music']['file'] if is_current else None,
                'start': 30, 'end': 70, 'playStart': 0, 'playEnd': 40,
            })
        if len(stage['tracks']) != 4 or sum(t['current'] for t in stage['tracks']) != 1:
            raise ValueError(f'Expected four options and one current track for {stage["name"]}')
        stages.append(stage)
    return {'previewSeconds': 40, 'stages': stages}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--yt-dlp', default='yt-dlp')
    parser.add_argument('--cache', type=Path, default=Path(tempfile.gettempdir()) / 'codesine-source-cache')
    parser.add_argument('--jobs', type=int, default=3)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    data = catalog()
    target = ROOT / 'audio/previews/options.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    tracks = [t for s in data['stages'] for t in s['tracks']]

    def build(track):
        try:
            if track['localSource']:
                key = hashlib.sha256(json.dumps([track['url'], track['start'], track['end']]).encode()).hexdigest()[:16]
                cache = args.cache / key
                cache.mkdir(parents=True, exist_ok=True)
                raw = cache / 'source.m4a'
                if not raw.exists() or args.force:
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / track['localSource']),
                                    '-ss', '30', '-t', '40', '-c:a', 'alac', str(raw)], check=True)
            return True, audio.prepare({**track, 'title': f'{track["artist"]}, {track["title"]}'}, 'music', args)
        except Exception as error:
            return False, f'FAILED {track["title"]}: {getattr(error, "stderr", str(error))}'

    failed = False
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        for ok, message in pool.map(build, tracks):
            print(message, flush=True)
            failed |= not ok
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
