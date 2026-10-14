# Engraved Machines

An endless zoom through thirteen machines, drawn as a relief print with pencil over the ink. Each machine leads to the next in one of three ways:

| How | Where |
| --- | --- |
| A chip becomes a machine. You zoom into a chip, and the next machine's parts fly in and close around it. | Apple I to Apple II (the 6502); Apple M1 to iMac 24″, as an exploded diagram that collapses while the seven iMac colours run past, and the screen says hello |
| You go inside. The shell lifts away, you zoom onto the chip, and the chip becomes the next thing. | MacBook Air (M1) to Apple M1; Mac mini to the Apple I, etched into the M4's silicon |
| An easter egg on screen. Each screen draws the next machine its own way, there from the start, and you zoom into it. | Apple II (in phosphor, after `RUN MACINTOSH`), Macintosh 128K (a MacPaint drawing), PowerBook 100 (a QuickTime movie on its LCD), iMac G3 (an iPod in iTunes), iPod (a silhouette album cover while Jet, from the iPod advert, plays), iPhone (the Mail icon), MacBook Air (Time Machine, run forwards), iMac 24″ (a FaceTime call), MacBook Pro 14″ (AirDrop) |

The machines follow their reference photos: the Apple II with two Disk II drives and a Monitor III, the dark-grey PowerBook 100 with its centred trackball, the G3's white front and Bondi Blue shell, and so on. The 2012 MacBook Pro was swapped for the M1 MacBook Air, so going inside to find the M1 is historically true.

Open `index.html` in a browser. No build step or server is needed.

## Controls

- Scroll down to travel into each machine and up to come back out. On a phone, swipe up and down. Pinch and drag gestures are turned off on purpose.
- Use the arrow keys or the `−` and `+` buttons to step one machine. `p` or Play runs the whole loop.
- Notes shows or hides the descriptions. Your choice is remembered in this browser.
- Sound turns the soundtrack on or off. It starts off.
- Click a year on the rail to jump to it. `#iphone`, `#apple-m1` and similar names in the URL open on that machine.

## Sound

Turn on Sound and each machine has two layers:

- **Background music** follows your scroll. Between two machines, the old track and the new one crossfade on an equal-power curve, so one fades out exactly as the other fades in. While you rest on a machine, its track keeps playing.
- **A sound bite** plays once each time you arrive, after a short pause. It ducks the music while it plays. It fades out at the end of its clip, after `biteMax` seconds if the clip is long, or quickly as soon as you scroll away.

What plays is set in `js/soundtrack.js`, one entry per machine. Each entry has a `bite` and a `music` list, in order of preference, and the first source that can play is used:

- `yt(id, start, end, title, line, source)`: a YouTube clip between two times, in seconds. It plays in a small visible player docked at the bottom right, as YouTube requires.
- `file(src, { start, end, line, source })`: an audio file in this folder.
- `synth(song)`: an original placeholder bed made in the browser.

The app plays local recordings in `audio/custom/` first. Each machine has a short speech clip and one full song selected from `SOUNDTRACK.md`. The clips have been trimmed to complete phrases, and their volume has been adjusted to keep speech clear above the music. The iPhone uses "Perfect Timing (This Morning)", from its own adverts.

The original narrated lines in `audio/voice/` and synth music remain as fallbacks if a local recording fails. Set `useCustom: false` in `js/soundtrack.js` to use those placeholders again. Levels and fade times are at the top of the same file.

Local recordings work when you open `index.html` directly or run `./serve.sh` at http://localhost:8642. YouTube playback is off by default. Set `preferYouTube: true` to enable the visible YouTube players as an intermediate fallback when serving over http.

`audio/custom/sources.json` records the source URLs and exact clip times. To rebuild the MP3s, install a current `yt-dlp` and `ffmpeg`, then run `python3 scripts/prepare-audio.py --force`. The recordings remain copyrighted. Obtain the required permissions before publishing or redistributing them.

Run the audio and music-picker tests with `node --test tests/*.test.cjs`.

### Choose different music

Run `./serve.sh` and open [the listening page](http://localhost:8642/music.html). Each machine has four options from `SOUNDTRACK.md`, including the current track for comparison. All 52 options have local 40-second samples, taken from 0:30 to 1:10 in the source video. Only one sample plays at a time.

Choose a track for each machine, then use "Download my picks" to export `soundtrack-picks.json`. Picks are saved in this browser; they don't change the app's music yet. The page also previews the updated M1 introduction, now installed in the app.

`audio/previews/options.json` records the options and source URLs. Run `python3 scripts/prepare-music-options.py` to rebuild missing previews with `yt-dlp` and `ffmpeg`. Add `--force` to replace existing previews.

## How it works

- `js/ink.js` is the mark-making engine. Ink marks are tapered gouge polygons; pencil marks are thin, unsteady graphite lines found in two passes, with light graphite shading, dimensions and notes. Marks are recorded once per machine into ordered layers, and each layer becomes one merged `Path2D`. A plate can draw through an affine map, which is how keys, labels and screens sit on the faces of a 3D model.
- `js/geo.js` holds affine maps and a small 3D modeller: boxes (with rounded or sloped tops), extrusions, slabs, lofts and cylinders in centimetres, seen in a fixed orthographic three-quarter view and shaded from one light. Orthographic projection maps every flat face to the page by an exact affine transform.
- `js/kit.js` holds the machine registry and shared pieces: screens with a hidden portal, keyboards, vents, and period desktop furniture.
- `js/machines/*.js` are the machines. Each one names its parts. Parts can fly in during an assembly or peel away when you go inside, and each machine marks the rectangles that transitions use: `portal`, `focus`, `anchor`, `chip` and `self`.
- `js/soundtrack.js` says what plays at each machine. `js/sound.js` decides when: the crossfades, ducking and fades, the YouTube, file and synth sources, and a small synth rack for the placeholders.
- `js/app.js` holds the camera. A camera is an affine map from a machine's 1000 × 1000 frame to the screen. Every transition interpolates along the one-parameter path `pow(M, t)` from the identity to the map that frames the target, which reads as a camera moving in and turning square to a screen or chip. On screens, the next machine arrives in pencil first and is then inked.

To add a machine, call `Kit.add` in a machine file with a `make(model)` and a `next` that says how it leads on.
