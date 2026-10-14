# Poster Machines

The same endless zoom through thirteen machines as `../iLoop`, printed as a series of screenprinted posters. Each machine is its own poster, pulled in four inks on cream stock: black, signal red, and two spot colours that change from poster to poster. The machines, their order, the three ways one leads to the next, the easter eggs, the controls and the soundtrack are all the same as in `iLoop`. What changes is how everything is drawn, and some of the transitions.

Open `index.html` in a browser. No build step or server is needed. It needs WebGL2; without it the page falls back to the flat colours, without the print texture.

## The look

Three sketches from `artifact-library` set the look:

- `bauhaus-rotary-phone-dial`: a dark, solid object against primary blocks, a red circle, a blue square and a diagonal black bar.
- `constructivist-power-drill-diagonal`: red, black and cream, hard diagonals, and a slogan banner in heavy type.
- `screenprint-helmet-visor`: a product printed in four or five flat inks, with posterised shading, slight misregistration, registration marks and a colour bar in the margin.

Every poster has its own composition behind the machine: a Bauhaus circle and square, a constructivist band with a banner, a sunset cut by paper stripes, a Swiss grid with a red field, a target of rings, or stacked blocks. The year is set huge in Anton, and the notes are set in Oswald capitals with a red square.

These things make it read as a print rather than a drawing app:

- Only four inks. Every colour on the sheet is paper, one ink, or two inks printed over each other. A colour that no ink combination can print is moved to the nearest one that can. A machine's real colour becomes its poster's S ink. The iMac colours run through the S screen while it assembles.
- Light is posterised. Each face takes one of three flat steps: a halftone of its ink in the light, solid ink in the middle, and ink with a black halftone over it in shadow. Where the light crosses a step inside a face, that part is cut as a separate flat shape.
- Halftone dots are round and coarse, at a different screen angle on each plate.
- Each plate sits slightly off register, differently on every pull. Thin slivers of paper show on one side of an edge and a dark overprint on the other.
- Stencil edges wander a little. The ink is thinner where the squeegee starved it, carries the faint weave of the mesh, and has the odd pinhole. The paper has mottling, fibres and tooth.
- The sheet has crop marks at its corners.

## Transitions

The camera paths are the same as in `iLoop`. On top of them:

- As you arrive at a machine, its poster prints over the old sheet in a printer's order: the accent plate first, then the red, then the black key, then the year. The red circle opens from its centre, bars and bands run in along their length, blocks grow out of one side, and the figures of the year rise into place one by one.
- While you travel, the four plates slide apart. When you stop, they spring back into register with a small overshoot. This is turned off when the system asks for reduced motion.
- The spot inks change from one poster's to the next near the end of each transition, so the next machine is first printed in the current poster's inks.
- Parts that fade in or out turn into a halftone of their own ink, because a partial ink can only be printed as a screen of dots.
- Apple II to Macintosh: the 1984 hammer is printed red, and the broken screen's shards are a black halftone.
- Watch to M1: the next sheet is laid across the old one, with a black edge.
- Mac mini to Apple I: inside the die the Apple I is printed in reverse, paper on solid black, until it settles into its own poster.

## Controls

- Scroll down to travel into each machine and up to come back out. On a phone, swipe up and down.
- Use the ← and → keys or buttons to step one machine. `p` or ▶ runs the whole loop.
- The Notes button shows or hides the caption and the notes beside each machine.
- The note button turns the music on or off, and the speech-bubble button the voice clips. Each works on its own, and both start off. With the voice clips on, ▶ stays on each machine until its clip has finished.
- Click a year on the rail to jump to it. `#iphone`, `#apple-m1` and similar names in the URL open on that machine.
- `?at=6.5` holds the view at one moment, here halfway from the iPhone to the MacBook Air. This is for checking transitions.

## Sound

Each machine has two layers, and each has its own button:

- **Background music** follows your scroll. Between two machines, the old track and the new one crossfade on an equal-power curve, so one fades out exactly as the other fades in. While you rest on a machine, its track keeps playing.
- **A sound bite** plays once each time you arrive, after a short pause. It ducks the music while it plays. It fades out at the end of its clip, after `biteMax` seconds if the clip is long, or quickly as soon as you scroll away.

What plays is set in `js/soundtrack.js`, one entry per machine. Each entry has a `bite` and a `music` list, in order of preference, and the first source that can play is used:

- `yt(id, start, end, title, line, source)`: a YouTube clip between two times, in seconds. It plays in a small visible player docked at the bottom right, as YouTube requires.
- `file(src, { start, end, line, source })`: an audio file in this folder.
- `synth(song)`: an original placeholder bed made in the browser.

The app plays local recordings in `audio/custom/` first. In this version `audio` is a link to `../iLoop/audio`, so both versions share one set of recordings. Each machine has a short speech clip and one full song selected from `SOUNDTRACK.md`. The clips have been trimmed to complete phrases, and their volume has been adjusted to keep speech clear above the music. The iPhone uses "Perfect Timing (This Morning)", from its own adverts.

The original narrated lines in `audio/voice/` and synth music remain as fallbacks if a local recording fails. Set `useCustom: false` in `js/soundtrack.js` to use those placeholders again. Levels and fade times are at the top of the same file.

Local recordings work when you open `index.html` directly or run `./serve.sh` at http://localhost:8642. YouTube playback is off by default. Set `preferYouTube: true` to enable the visible YouTube players as an intermediate fallback when serving over http.

`audio/custom/sources.json` records the source URLs and exact clip times. To rebuild the MP3s, install a current `yt-dlp` and `ffmpeg`, then run `python3 scripts/prepare-audio.py --force`. The recordings remain copyrighted. Obtain the required permissions before publishing or redistributing them.

Run the audio and music-picker tests with `node --test tests/*.test.cjs`.

### Choose different music

Run `./serve.sh` and open [the listening page](http://localhost:8642/music.html). Each machine has four options from `SOUNDTRACK.md`, including the current track for comparison. All 52 options have local 40-second samples, taken from 0:30 to 1:10 in the source video. Only one sample plays at a time.

Choose a track for each machine, then use "Download my picks" to export `soundtrack-picks.json`. Picks are saved in this browser; they don't change the app's music yet. The page also previews the updated M1 introduction, now installed in the app.

`audio/previews/options.json` records the options and source URLs. Run `python3 scripts/prepare-music-options.py` to rebuild missing previews with `yt-dlp` and `ffmpeg`. Add `--force` to replace existing previews.

## How it works

- `js/ink.js` records each machine as filled polygons, as before, but in recipe colours. A recipe is an amount of each ink: solid, half screen or quarter screen. `face()` posterises a face into flat steps instead of engraving it. Strokes are kept for keylines, edge highlights and cables, and fine rules are never thinner than a stencil can hold.
- `js/print.js` is the press, in WebGL2. Each frame, Canvas2D draws the scene into an offscreen canvas. The first pass separates it: each pixel is matched to the nearest recipe, which gives the coverage of each ink. On an edge, the pixel is cut to whichever side it is closer to, with a small bias toward the darker side, as ink spreads. The second pass prints: each plate is read at its registration offset with a little wander, solid areas print flat and screened areas print as dots, and the inks multiply over the paper.
- Paper texture and halftone screens are fixed to the sheet, so they stay still while the drawing moves under them.
- `js/geo.js`, `js/kit.js` and `js/machines/*.js` are the same modeller and machines as in `iLoop`, with small changes: faces pass their material's brightness so tone steps are relative to it, lofts are posterised quad by quad, and a machine can map its second colour to a darker screen of S (the Macintosh's keys).
- `js/app.js` holds the camera and transitions from `iLoop`, plus the inks for each poster (`POSTER`), the compositions behind the machines (`drawBackdrop`), the sheet's marks (`drawSheet`) and the registration spring.
- The poster keeps clear of the page's own type. On load and on every resize, `measure()` records where each machine's caption, the buttons, the hint and the rail sit. The shapes are cut away from the caption with a margin; the cut closes as the caption fades during travel. Each year is placed by `yearSpot()`: it tries the composition's preferred corners, then the margins beside the frame, at smaller sizes if needed, and takes the first place that touches none of that type and is not hidden behind the machine. A paper keyline round each figure keeps it legible over the shapes.
- `js/sound.js` and `js/soundtrack.js` are unchanged.

Run the audio and music-picker tests with `node --test tests/*.test.cjs`.
