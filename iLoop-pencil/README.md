# Sketchbook Machines

The iLoop drawn in pencil and wax crayon. It is the same endless zoom through thirteen machines as `../iLoop`, with the same machines, the same order, the same three ways of leading on (a chip becomes a machine, you go inside, or an easter egg on screen) and the same soundtrack. Only the medium has changed: each machine is drawn in graphite on cream drawing paper and then coloured in.

Open `index.html` in a browser. No build step or server is needed. It needs WebGL2 for the paper; without it, the colour layer is shown flat.

## The medium

The look comes from three sketches in the artifact library:

- **half-coloured-tabby-radiator**: a clean line drawing, coloured in on one side only, with a ragged edge where the colouring stops. This version's transitions are built on that idea.
- **primer-y-is-for-yoyo**: an old picture-book primer card. Cream laid paper, soft coloured pencil, printed type in a schoolbook face, a faded red.
- **tinted-postcard-fair-bull**: graphite hatching with bright tints laid loosely over it, stopping short of the edges.

What is drawn:

- **Graphite.** Each surface is found the way a draughtsman finds it: light construction strokes first, long and running past the corners, then the contour pressed in over them, its weight rising and falling along its length. Shade is hand hatching in short patches on one right-handed diagonal, with a second, crossing set in the deepest shade and a rubbed smudge under it. Cast shadows on the table are rubbed graphite with a few strokes through them. Notes and dimensions are hand-lettered in pencil, with the paper rubbed clean behind each one.
- **Crayon.** A coloured surface gets an even first layer, pressed more lightly where the light falls, and then back-and-forth strokes that follow the surface. The strokes turn in small hooks at their ends, run over the outline in places and stop short in others, and come in runs of a few passes at two pressures. Shade is a darker crayon crossed over the first, a violet-brown version of the same hue, and lit faces get a few strokes of white wax. White plastic and aluminium are left as paper and modelled in graphite and a cool grey pencil. Black materials are black wax.
- **Paper.** The sheet has a tooth: a fine grain, a coarser one and fibres, with the laid and chain lines of the mould. It is foxed in places, darker toward the edges, and carries the faint ghosts of earlier drawings that were rubbed out. The paper is fixed to the screen. The drawing moves over it.

## Transitions

The camera paths are the original ones. What changes is how a machine comes and goes:

- **A machine arrives as a drawing, and is then coloured in.** When the next machine appears, inside a chip or as parts flying into place, its construction lines come first, then its contour, and then the colour is laid in across it from left to right behind a ragged edge. Partway through, a machine is half drawn and half coloured, like the tabby on the radiator.
- **Going inside erases.** When a shell lifts away to show the chip, its colour is taken back behind the same ragged edge and its lines fade as if rubbed out.
- **An assembly is drawn part by part.** In the Apple II and iMac assemblies each part is sketched while it waits in place and coloured in as it flies home. The iMac's seven colours still run past while it closes.
- **Screen easter eggs keep their period looks.** The phosphor, MacPaint, LCD and silhouette screens draw the next machine in their own way, now in crayon. Glass, glare and the hammer's motion blur fade as a plain transparency instead of being coloured in.

## Controls

- Scroll down to travel into each machine and up to come back out. On a phone, swipe up and down. Pinch and drag gestures are turned off on purpose.
- Use the ← and → keys or buttons to step one machine. `p` or ▶ runs the whole loop.
- The Notes button (four lines) shows or hides the descriptions and the notes drawn beside each machine. They start hidden, and turning them on is remembered in this browser.
- The note button turns the music on or off, and the speech-bubble button the voice clips. Each works on its own. The music is on unless you turn it off (a browser lets it start only at your first click, tap or key press); the voice clips start off. Both choices are remembered. With the voice clips on, ▶ stays on each machine until its clip has finished.
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

- `js/ink.js` is the mark-making engine. It keeps the original Plate API, so `js/kit.js` and the machine geometry are unchanged. There are three small edits: table shadows in the machine files use a `shadow` role, `js/geo.js` shades the iMac G3's lofted shell face by face, and it calls `finish()` after each part so that part's contours go on top. Every mark is still a polygon recorded once per machine into layers, but each layer is now graphite or crayon and carries a pressure. Crayon layers also carry the direction of their strokes. `face()` decides how a surface is coloured, hatched and outlined. `sketch()` draws construction lines and contours, `scribble()` lays crayon, `hatchG()` hatches. A part's contours are drawn after everything else in that part.
- `drawPlate()` replays a plate. Its colour amount sets how far the ragged colouring edge has moved across the machine, in the machine's own 1000 × 1000 frame. Surfaces that are not coloured yet still hide what is behind them, so a half-coloured machine shows no hidden lines.
- `js/paper.js` draws every frame twice, in lockstep, into two hidden canvases. One holds the colour of the crayon. The other records how each mark was made: red is crayon pressure, green is graphite, blue is the stroke direction. `Paper.dual()` is a 2D context that writes to both, so the easter eggs in `app.js` work unchanged. A WebGL2 shader then lays the drawing on the paper. The paper is made once for each window size and stored in a texture. For each pixel, wax shows where the pressure beats the paper's tooth, with the tooth stretched into streaks along the stroke direction. Graphite takes the tooth more evenly, darkens, and shines a little where it is heavy. A blurred copy of the graphite adds a soft smudge around dense hatching.
- `js/app.js` holds the camera, the transitions and the easter eggs, as in the original.
- `js/soundtrack.js`, `js/sound.js` and the tests are the original files, unchanged.
