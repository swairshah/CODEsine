# Marker Machines

The iLoop drawn as an industrial designer's presentation sketch, the way frog design drew Apple's machines in the Snow White years. It is the same endless zoom through thirteen machines as `../iLoop`, with the same machines, the same order, the same three ways of leading on (a chip becomes a machine, you go inside, or an easter egg on screen) and the same soundtrack. Only the medium has changed: each machine is drawn in pencil on grey marker paper, toned in marker, lit with white pencil, and lifted off the page by a block of bold colour behind it.

Open `index.html` in a browser. No build step or server is needed. It needs WebGL2 for the paper; without it, the drawing is shown without the paper's grain or the marker's streaks.

## The medium

- **Paper.** A mid-grey marker paper with a fine, even tooth, a faint cloud in the sizing and a little light falling off toward the edges. The paper is fixed to the screen. The drawing moves over it. On grey paper the paper itself is the middle tone: lit faces stay close to it, and shadow faces go darker.
- **Pencil.** Each surface is found the way a designer finds it. Light construction lines come first, long and running well past the corners, the bigger the shape the further. The contour is then pressed in over them, its weight rising and falling along its length, a little past each corner. Edges that turn away from the light get a darker accent. Pencil catches on the tooth of the paper and skips the valleys.
- **Marker.** Translucent marker, laid in fast parallel strokes of a chisel nib. The strokes run up and down a vertical face and along the surface on any other. Each stroke runs the full length of the face, its ends following the outline, a little over it in places and short of it in others. Neighbouring strokes overlap into one smooth layer, a few are gone over twice, and the ink streaks along the strokes and pools at its wet edges.
  - White plastic and aluminium are cool grey marker. A lit face keeps most of its paper and is toned only toward its shadow edge, with the strokes thinning out in small runs toward the light. A face turned partly away gets one layer and half a second. A shadow face gets two layers, with a darker grey in its deepest part.
  - A coloured machine is laid in its own colour: one layer over each face, with a streak of paper left on the lit side, and a darker marker of the same family on the shadow side, with cool grey over it in shadow. The colours are the real ones: the Apple I's green board, the beige of the Apple II and the Macintosh, the iMac G3's Bondi Blue, the iMac 24's blue (and its seven colours as it assembles), the Watch's pink band, and the rainbow logo wherever a machine has it.
  - Black parts, glass and screens are black marker, which streaks like a glossy surface.
  - Each machine stands on a dark marker swipe for its cast shadow.
- **White pencil.** On the edges that catch the light, stopping short of the corners, with a glint on the lit corner of each large top. The brightest faces get a soft rub of white chalk toward the light. Screens get two reflections swept diagonally across the glass, each a soft white band with a few strokes of white pencil along it.
- **Solid colour.** What is on the screens, the labels and the keys are painted flat, so the period interfaces stay crisp.
- **The colour behind.** A loose block of one bold marker behind each machine, as a designer lifts a drawing off the page: a few broad chisel strokes side by side along a band, a block or a swoosh, each starting and stopping a little differently. The colours come from one set of eight markers that the other versions do not use: fuchsia, cyan, coral, lemon, chartreuse, violet, mint and cobalt. Each is chosen to set off its machine's own colour, neighbours never share one, so every step of the loop changes colour, and the loop closes from the Mac mini's chartreuse back to the Apple I's fuchsia.

| Year | Machine | Behind it |
| --- | --- | --- |
| 1976 | Apple I | fuchsia band |
| 1977 | Apple II | cyan block |
| 1984 | Macintosh 128K | coral band |
| 1991 | PowerBook 100 | lemon swoosh |
| 1998 | iMac G3 | chartreuse block |
| 2001 | iPod | violet band |
| 2007 | iPhone | fuchsia swoosh |
| 2008 | MacBook Air | mint band |
| 2015 | Apple Watch | lemon block |
| 2020 | Apple M1 | cobalt swoosh |
| 2021 | iMac 24″ | coral band |
| 2021 | MacBook Pro 14″ | cyan block |
| 2024 | Mac mini | chartreuse swoosh |

The page around the drawing is lettered like the board it would be pinned to, and the year and the next machine are underlined in the colour behind the machine you are looking at.

## Transitions

The camera paths and the three ways of leading on are the original ones. What changes is how a machine comes and goes. It arrives in the order a designer draws it:

1. The construction lines, then the contours.
2. The first layer of marker, swept across the machine from left to right behind a wet front of stroke ends, and then the second layer on the shadow side.
3. The white pencil highlights and glints flick on.
4. The block of colour is swiped in behind it, along its strokes.

- **Going inside.** Going inside the Apple Watch or the Mac mini, the colour behind goes first, then the shell is taken apart in the same order backwards as it lifts away: the highlights go, the marker is swept off, and the lines fade. From the Watch's chip, the view is then swiped aside like a card, and the M1 slides in on its own card. In the Mac mini's M4, the Apple I is drawn in the die in the order above, light on dark silicon at first, until it comes out onto the paper.
- **An assembly.** In the Apple II and iMac 24″ assemblies each part is drawn in pencil while it waits in place, and is marked in as it flies home. The block of colour is swiped in when the machine has closed. The iMac's seven colours still run past while it closes.
- **A screen.** On a screen, the next machine is there from the start, drawn as that screen would show it. As you zoom in, its colours settle into the drawing, and only then is its block of colour swiped in behind it. The machine you leave keeps its own block until it is taken away.
- **Screen easter eggs keep their period looks.** The phosphor, MacPaint, LCD and silhouette screens show the next machine in their own way, and the 1984 hammer, the Mail envelope and the Time Machine clock play as before. Glass and the hammer's motion blur fade as a plain transparency.

## Controls

- Scroll down to travel into each machine and up to come back out. On a phone, swipe up and down. Pinch and drag gestures are turned off on purpose.
- Use the ← and → keys or buttons to step one machine. `p` or ▶ runs the whole loop.
- The Notes button (four lines) shows or hides the descriptions and the notes drawn beside each machine. They start hidden, and turning them on is remembered in this browser.
- The note button turns the music on or off, and the speech-bubble button the voice clips. Each works on its own. Both are on unless you turn them off (a browser lets sound start only at your first click, tap or key press), and both choices are remembered. Sound pauses while the page is hidden and picks up where it was when you come back. On a phone the timeline runs along the top and the buttons along the bottom, and the buttons give a small tap of haptic feedback. With the voice clips on, ▶ stays on each machine until its clip has finished.
- Click a year on the rail to jump to it. `#iphone`, `#apple-m1` and similar names in the URL open on that machine.
- `?at=6.5` holds the view at one point of the loop (here, halfway from the iPhone to the MacBook Air), for checking a transition. `?perf` logs the frame rate to the console.

## Sound

Each machine has two layers, and each has its own button:

- **Background music** follows your scroll. Between two machines, the old track and the new one crossfade on an equal-power curve, so one fades out exactly as the other fades in. While you rest on a machine, its track keeps playing.
- **A sound bite** plays once each time you arrive, after a short pause. It ducks the music while it plays. It fades out at the end of its clip, after `biteMax` seconds if the clip is long, or quickly as soon as you scroll away.

What plays is set in `js/soundtrack.js`, one entry per machine. Each entry has a `bite` and a `music` list, in order of preference, and the first source that can play is used:

- `yt(id, start, end, title, line, source)`: a YouTube clip between two times, in seconds. It plays in a small visible player docked at the bottom right, as YouTube requires.
- `file(src, { start, end, line, source })`: an audio file in this folder.
- `synth(song)`: an original placeholder bed made in the browser.

The `audio` folder here is a link to `../iLoop/audio`, so this version plays the same recordings as the original. The app plays local recordings in `audio/custom/` first. Each machine has a short speech clip and one full song selected from `SOUNDTRACK.md`. The clips have been trimmed to complete phrases, and their volume has been adjusted to keep speech clear above the music. The iPhone uses "Perfect Timing (This Morning)", from its own adverts.

The original narrated lines in `audio/voice/` and synth music remain as fallbacks if a local recording fails. Set `useCustom: false` in `js/soundtrack.js` to use those placeholders again. Levels and fade times are at the top of the same file.

Local recordings work when you open `index.html` directly or run `./serve.sh` at http://localhost:8642. YouTube playback is off by default. Set `preferYouTube: true` to enable the visible YouTube players as an intermediate fallback when serving over http.

`audio/custom/sources.json` records the source URLs and exact clip times. To rebuild the MP3s, install a current `yt-dlp` and `ffmpeg`, then run `python3 scripts/prepare-audio.py --force`. The recordings remain copyrighted. Obtain the required permissions before publishing or redistributing them.

Run the audio and music-picker tests with `node --test tests/*.test.cjs`.

### Choose different music

Run `./serve.sh` and open [the listening page](http://localhost:8642/music.html). Each machine has four options from `SOUNDTRACK.md`, including the current track for comparison. All 52 options have local 40-second samples, taken from 0:30 to 1:10 in the source video. Only one sample plays at a time.

Choose a track for each machine, then use "Download my picks" to export `soundtrack-picks.json`. Picks are saved in this browser; they don't change the app's music yet. The page also previews the updated M1 introduction, now installed in the app.

`audio/previews/options.json` records the options and source URLs. Run `python3 scripts/prepare-music-options.py` to rebuild missing previews with `yt-dlp` and `ffmpeg`. Add `--force` to replace existing previews.

## How it works

- `js/ink.js` is the mark-making engine. It keeps the original Plate API, so `js/kit.js` and the machine geometry are almost unchanged. Every mark is still a polygon recorded once per machine into layers and replayed at any zoom, but each layer now belongs to a stage of the drawing: the paper inside a surface, construction lines, contours, the first and second marker layers, solid colour, white pencil, or notes. `face()` decides how a surface is toned, `marker()` lays the strokes, `sketch()` and `pencil()` draw the lines, and `shadow()` swipes the cast shadow. A part's contours are drawn after everything else in that part.
- `drawPlate()` replays a plate. Its pencil amount brings in the lines, and its ink amount sweeps the marker layers in behind a wet front and then flicks on the white pencil. Surfaces still hide what is behind them as soon as their outline is drawn.
- `js/geo.js` turns each face's 3D normal into the direction of its marker strokes, places the white pencil on lit edges and the glints, and records where the machine stands in its frame. `js/kit.js` puts the reflections on each screen's glass once the machine is drawn. The Apple II's and the Mac mini's shadows in `js/machines/` are now marker swipes.
- `js/app.js` holds the camera, the transitions and the easter eggs, as in the original. It also holds the marker colours: each machine's own colour and the block behind it (`MARK`), which it builds once per machine and swipes in and out.
- `js/paper.js` draws every frame twice, in lockstep, into two hidden canvases. One holds the colour. The other records how each mark was made: red is marker density, green is pencil, blue is the direction of the marker strokes. `Paper.dual()` is a 2D context that writes to both, so the easter eggs in `app.js` work unchanged; what they draw is plain paint. A WebGL2 shader then lays the drawing on the paper. The paper is made once for each window size and stored in a texture. For each pixel, the marker's density varies in long soft streaks along its strokes and darkens where a patch of marker ends. Pencil shows the colour around it where the paper's tooth is too deep for it to catch.
- `js/soundtrack.js`, `js/sound.js` and the tests are the original files, unchanged.
