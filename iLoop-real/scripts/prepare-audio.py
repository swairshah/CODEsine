#!/usr/bin/env python3
"""Rebuild the selected local audio. Requires current yt-dlp and ffmpeg on PATH.

Only use sources you are authorized to download and include in your app.
The source list records provenance, not a license to redistribute these recordings.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def prepare(spec, kind, args):
    target = ROOT / spec['file']
    if target.exists() and not args.force:
        return f'Skipped {target.name} (already exists)'
    key = hashlib.sha256(json.dumps([spec['url'], spec['start'], spec['end']]).encode()).hexdigest()[:16]
    cache = args.cache / key
    cache.mkdir(parents=True, exist_ok=True)
    raw = next((p for p in cache.glob('source.*') if p.suffix in ('.webm', '.m4a', '.mp4', '.opus')), None)
    if raw is None:
        # Some uploads reject one audio format but still serve the other.
        for fmt in ['bestaudio', 'bestaudio[ext=m4a]']:
            cmd = [args.yt_dlp, '--no-playlist', '--no-progress', '-f', fmt,
                   '--socket-timeout', '20', '--retries', '2', '-o', str(cache / 'source.%(ext)s')]
            if spec['end'] is not None:
                cmd += ['--download-sections', f'*{spec["start"]}-{spec["end"]}', '--force-keyframes-at-cuts']
            try:
                run(cmd + [spec['url']])
                break
            except subprocess.CalledProcessError:
                if fmt != 'bestaudio':
                    raise
        raw = next(p for p in cache.glob('source.*') if p.suffix in ('.webm', '.m4a', '.mp4', '.opus'))
    duration = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'default=noprint_wrappers=1:nokey=1', str(raw)]))
    if spec['end'] is not None:
        duration = min(duration, spec['end'] - spec['start'])
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix('.tmp.mp3')
    loudness = -16 if kind == 'bite' else -18
    filters = (f'loudnorm=I={loudness}:TP=-1.5:LRA=11,'
               f'afade=t=in:d=0.02,afade=t=out:st={max(0, duration - 0.1)}:d=0.1')
    try:
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw), '-t', str(duration),
             '-vn', '-map_metadata', '-1', '-af', filters, '-ar', '44100',
             '-ac', '1' if kind == 'bite' else '2', '-c:a', 'libmp3lame',
             '-b:a', '96k' if kind == 'bite' else '160k',
             '-metadata', f'title={spec["title"]}', '-metadata', f'comment=Source: {spec["url"]}', str(temp)])
        temp.replace(target)
    finally:
        temp.unlink(missing_ok=True)
    return f'Built {target.name} ({duration:.1f}s)'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--yt-dlp', default='yt-dlp')
    parser.add_argument('--cache', type=Path, default=Path(tempfile.gettempdir()) / 'codesine-source-cache')
    parser.add_argument('--jobs', type=int, default=2)
    parser.add_argument('--force', action='store_true', help='Rebuild existing MP3s')
    args = parser.parse_args()
    stages = json.loads((ROOT / 'audio/custom/sources.json').read_text())['stages']
    jobs = [(stage[kind], kind) for stage in stages for kind in ['bite', 'music']]
    failed = []

    def build(job):
        spec, kind = job
        try:
            return prepare(spec, kind, args)
        except (subprocess.CalledProcessError, OSError, StopIteration) as error:
            failed.append(spec['file'])
            detail = error.stderr if isinstance(error, subprocess.CalledProcessError) else str(error)
            return f'FAILED {spec["file"]}: {detail}'

    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        for result in pool.map(build, jobs):
            print(result, flush=True)
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
