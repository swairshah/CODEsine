# Watercolour Machines

The same endless zoom through thirteen machines as `../iLoop`, drawn in sepia pen and washed in transparent watercolour on cold-pressed paper. The machines, their order, the three ways each one leads to the next, the easter eggs on the screens, the controls and the sound are all unchanged. Only the drawing and some of the transitions are new.

Open `index.html` in a browser. No build step or server is needed. It needs WebGL 2 for the paper; without it, the washes and pen are shown flat.

## The look

The version follows three sketches from the artifact library:

- `cel-scooter-two-layer`: a crisp, fine pen line over flat washes that sit a little off the line, in front of a loose, hazy background wash.
- `shin-hanga-snowy-bicycle-crossing`: fine ink and quiet, graded washes, with the white of the paper kept for the lights.
- `touristmap-sandcastle-beach`: pen outlines, warm washes and hand-lettered labels, like notes on a map.

What makes it read as paint rather than a filter:

- Every colour is a transparent glaze. Glazes multiply, so where two overlap the colour gets darker. Nothing is painted white: the lights are the paper, left bare.
- Each surface is painted the way a watercolourist would do it. The shape is reserved, then filled with one wash of its own colour, then shaded with a cool glaze (ultramarine with a little sienna). Large surfaces get a second glaze over their darker half, so they are graded rather than flat.
- The washes wander off the pen line. Each wash is shrunk a little and its edge is pushed in and out by noise, and each part's washes are shifted slightly, so paper shows between the colour and the line in some places and colour runs past it in others. The noise is fixed to the drawing, so the wobble travels with the machine.
- Pigment pools at the edges. Where a wash meets anything else, it dries darker at its rim. Pale washes show this most.
- Pigment settles into the paper. The paper is cold-pressed, with irregular bumps and fibres, lit from the upper left. Pigment collects in the hollows as fine grains, clumps into soft flecks, and varies slowly across a wash. This is strongest in middle tones and fades out in the darkest washes, as it does with real paint.
- Now and then a large surface has a bloom: a cauliflower-edged patch where water ran back into a drying wash.
- There is no black. The darkest material (a screen, black plastic) is a dense Payne's grey that still shows the grain.
- The pen is a sepia-black fine nib. Each line runs from corner to corner, swells a little under pressure, runs past the corners, and now and then skips on the paper. An edge shared by two faces is drawn the same way twice, so it reads as one line. The pen catches on the paper's ridges.
- Close up, pen lines are redrawn along their centrelines with a nib that only slowly gets wider, so zooming into a chip keeps a fine pen line instead of a thick brush outline.
- Faint pencil underdrawing shows under the washes, as it does in a real watercolour. `?pencil=0` in the URL turns it off.
- Notes and dimensions are written by hand in pen.
- Behind each machine there is a loose ground of warm ochre, laid sideways with a dry brush that breaks up at its ends, a haze of the machine's own colour dropped wet into wet, a harder patch of cool grey, and a few flicked spots. Cast shadows are a quick cool glaze.

## Transitions

The camera paths are the same as the original. What changes is how things appear:

- **Going inside** (Apple Watch to M1, Mac mini to Apple I): the next machine is drawn in pen first. Then its colour floods in from the middle, as a wet front spreading across damp paper with a dark tide line at its edge.
- **Assembling** (Apple I to Apple II, M1 to iMac 24″): each part arrives as a pen drawing, and its washes spread out from the part's centre as it settles. During the iMac's run of seven colours, each colour is dropped wet into wet behind it and bleeds into the last.
- **1984**: after the hammer, the Macintosh is drawn in the white light in pen, and its colour floods in.
- **Screens**: the next machine is already on the screen as a tiny painting in that screen's own look (phosphor, MacPaint, LCD and so on), and zooming only enlarges it.
- Leaving a machine, its washes thin out as you pass through its screen.

## Controls

- Scroll down to travel into each machine and up to come back out. On a phone, swipe up and down. Pinch and drag gestures are turned off on purpose.
- Use the ← and → keys or buttons to step one machine. `p` or ▶ runs the whole loop.
- The Notes button (four lines) shows or hides the descriptions and the notes drawn beside each machine. They start hidden, and turning them on is remembered in this browser.
- The note button turns the music on or off, and the speech-bubble button the voice clips. Each works on its own. The music is on unless you turn it off (a browser lets it start only at your first click, tap or key press); the voice clips start off. Both choices are remembered. With the voice clips on, ▶ stays on each machine until its clip has finished.
- Click a year on the rail to jump to it. `#iphone`, `#apple-m1` and similar names in the URL open on that machine.

## Sound

Each machine has two layers, and each has its own button:

- **Background music** follows your scroll. Between two machines, the old track and the new one crossfade on an equal-power curve, so one fades out exactly as the other fades in. While you rest on a machine, its track keeps playing.
- **A sound bite** plays once each time you arrive, after a short pause. It ducks the music while it plays. It fades out at the end of its clip, after `biteMax` seconds if the clip is long, or quickly as soon as you scroll away.

What plays is set in `js/soundtrack.js`, one entry per machine. Each entry has a `bite` and a `music` list, in order of preference, and the first source that can play is used:

- `yt(id, start, end, title, line, source)`: a YouTube clip between two times, in seconds. It plays in a small visible player docked at the bottom right, as YouTube requires.
- `file(src, { start, end, line, source })`: an audio file in this folder.
- `synth(song)`: an original placeholder bed made in the browser.

`audio` is a link to `../iLoop/audio`, so this version plays exactly the same recordings as the original. The app plays local recordings in `audio/custom/` first. Each machine has a short speech clip and one full song selected from `SOUNDTRACK.md`. The clips have been trimmed to complete phrases, and their volume has been adjusted to keep speech clear above the music. The iPhone uses "Perfect Timing (This Morning)", from its own adverts.

The original narrated lines in `audio/voice/` and synth music remain as fallbacks if a local recording fails. Set `useCustom: false` in `js/soundtrack.js` to use those placeholders again. Levels and fade times are at the top of the same file.

Local recordings work when you open `index.html` directly or run `./serve.sh` at http://localhost:8642. YouTube playback is off by default. Set `preferYouTube: true` to enable the visible YouTube players as an intermediate fallback when serving over http.

`audio/custom/sources.json` records the source URLs and exact clip times. To rebuild the MP3s, install a current `yt-dlp` and `ffmpeg`, then run `python3 scripts/prepare-audio.py --force`. The recordings remain copyrighted. Obtain the required permissions before publishing or redistributing them.

Run the audio and music-picker tests with `node --test tests/*.test.cjs`.

### Choose different music

Run `./serve.sh` and open [the listening page](http://localhost:8642/music.html). Each machine has four options from `SOUNDTRACK.md`, including the current track for comparison. All 52 options have local 40-second samples, taken from 0:30 to 1:10 in the source video. Only one sample plays at a time.

Choose a track for each machine, then use "Download my picks" to export `soundtrack-picks.json`. Picks are saved in this browser; they don't change the app's music yet. The page also previews the updated M1 introduction, now installed in the app.

`audio/previews/options.json` records the options and source URLs. Run `python3 scripts/prepare-music-options.py` to rebuild missing previews with `yt-dlp` and `ffmpeg`. Add `--force` to replace existing previews.

## How it works

- `js/ink.js` is the mark-making engine. It keeps the plate interface the machines are written against (`fill`, `ring`, `gouge`, `face`, `text` and so on) and records four kinds of paint into merged `Path2D` layers: areas painted in one wash (`over`), transparent glazes (`mul`), lifted pigment for blooms (`lift`), and lines. `face()` is where a surface becomes reserve, local colour, shade glaze, graded glaze, an occasional bloom and a pen outline. `drawPlate` replays a plate onto two canvases at once: the washes on one and the dark pen work on the other. Light lines and light text go on the washes as body colour.
- `js/paper.js` is a WebGL 2 shader that lays the two canvases on the paper each frame. It turns the washes into optical density, darkens the rim of each wash (using the wash canvas's mipmaps as a cheap blur), adds granulation, flocculation and slow variation from a procedural cold-pressed paper, lights the paper's tooth, and multiplies the pen on top.
- `js/washes.js` paints each machine's loose background once into its own canvas, with a real blur for the wet-into-wet haze, and keeps the last few.
- `js/geo.js`, `js/kit.js` and `js/machines/*.js` are the original modeller and machines. The only changes are that cast shadows are drawn as glazes, lofted surfaces are washed instead of engraved, and the modeller records each machine's extent for the background washes.
- `js/app.js` is the original camera and transitions, drawing into the two sheets and adding the floods and colour bleeds described above.
- `js/sound.js` and `js/soundtrack.js` are unchanged.

`?at=6.5` in the URL holds the journey at that level, which is useful for looking at a transition still. `?perf` logs frame times to the console. `?pool=1.2` sets how strongly pigment pools at the edges of washes.
