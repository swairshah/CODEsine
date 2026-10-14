# Clean Poster Machines

The same endless zoom through thirteen machines as `../iLoop`, drawn as a series of clean, flat-colour posters. It takes the compositions and type of `../iLoop-graphic` and drops everything that made that version look printed: no halftone dots, no misregistration, no ragged ink edges, no paper specks. Each machine is drawn in its own colours, closer to `../iLoop-real`, but as flat vector illustration rather than a 3D render. The machines, their order, the three ways one leads to the next, the easter eggs, the controls and the soundtrack are all the same as in `iLoop`.

Open `index.html` in a browser. No build step or server is needed, and no WebGL: everything is Canvas2D.

## The look

- **Posters, as in the graphic version.** Every machine has its own composition behind it: a Bauhaus circle and square, a constructivist band with a banner, a sunset cut by stripes, a Swiss grid with a red field, a target of rings, or stacked blocks. The year is set huge in Anton, and the notes are set in Oswald capitals with a red square.
- **Flat, crisp shapes.** Every surface is a filled polygon with clean anti-aliased edges. Light is cut into five flat tonal steps of the surface's own colour: two shadows, the colour itself, and two lights. Where the light crosses a step inside a face, that part is its own flat shape.
- **Real colours.** A machine's body and second colour come from the machine (beige ABS, Bondi Blue, rose gold, the green of a circuit board), not from the poster's inks. A surface with no colour of its own is a neutral as light as its material: white plastic, silver, space grey. White parts and the white of screens are white, not the poster's cream.
- **Shadows lean cool, lights lean white**, so a ramp reads as a material under light rather than a darker and lighter copy of one ink.
- **Translucency is real.** Glass, reflections and parts fading in or out are drawn with true transparency, not as a screen of dots.
- **Lines are even.** Keylines, edges and cables are strokes of one width, like a pen in a vector drawing.

## Transitions

The camera paths are the same as in `iLoop`. On top of them:

- As you arrive at a machine, its poster builds over the old one in order: the accent shape first, then the red, then the black, then the year. The red circle opens from its centre, bars and bands run in along their length, blocks grow out of one side, and the figures of the year rise into place one by one.
- The poster's colours blend from one poster's to the next near the end of each transition. While the iMac 24″ assembles, its body runs through the seven iMac colours.
- Parts that come and go fade cleanly.
- Apple II to Macintosh: the 1984 hammer is red, and the broken screen's shards fly out as clean glass.
- Watch to M1: the next poster is laid across the old one, with a black edge.
- Mac mini to Apple I: inside the die the Apple I is drawn in reverse, light lines on black, until it settles into its own poster.

## Controls

- Scroll down to travel into each machine and up to come back out. On a phone, swipe up and down.
- Use the ← and → keys or buttons to step one machine. `p` or ▶ runs the whole loop.
- The Notes button shows or hides the caption and the notes beside each machine. They start hidden.
- The note button turns the music on or off, and the speech-bubble button the voice clips. Each works on its own. Both are on unless you turn them off (a browser lets sound start only at your first click, tap or key press), and both choices are remembered. Sound pauses while the page is hidden and picks up where it was when you come back. On a phone the timeline runs along the top and the buttons along the bottom, and the buttons give a small tap of haptic feedback. With the voice clips on, ▶ stays on each machine until its clip has finished.
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

The app plays local recordings in `audio/custom/` first. In this version `audio` is a link to `../iLoop/audio`, so every version shares one set of recordings. Each machine has a short speech clip and one full song selected from `SOUNDTRACK.md`. The clips have been trimmed to complete phrases, and their volume has been adjusted to keep speech clear above the music. The iPhone uses "Perfect Timing (This Morning)", from its own adverts.

The original narrated lines in `audio/voice/` and synth music remain as fallbacks if a local recording fails. Set `useCustom: false` in `js/soundtrack.js` to use those placeholders again. Levels and fade times are at the top of the same file.

Local recordings work when you open `index.html` directly or run `./serve.sh` at http://localhost:8642. YouTube playback is off by default. Set `preferYouTube: true` to enable the visible YouTube players as an intermediate fallback when serving over http.

`audio/custom/sources.json` records the source URLs and exact clip times. To rebuild the MP3s, install a current `yt-dlp` and `ffmpeg`, then run `python3 scripts/prepare-audio.py --force`. The recordings remain copyrighted. Obtain the required permissions before publishing or redistributing them.

Run the audio and music-picker tests with `node --test tests/*.test.cjs`.

### Choose different music

Run `./serve.sh` and open [the listening page](http://localhost:8642/music.html). Each machine has four options from `SOUNDTRACK.md`, including the current track for comparison. All 52 options have local 40-second samples, taken from 0:30 to 1:10 in the source video. Only one sample plays at a time.

Choose a track for each machine, then use "Download my picks" to export `soundtrack-picks.json`. Picks are saved in this browser; they don't change the app's music yet. The page also previews the updated M1 introduction, now installed in the app.

`audio/previews/options.json` records the options and source URLs. Run `python3 scripts/prepare-music-options.py` to rebuild missing previews with `yt-dlp` and `ffmpeg`. Add `--force` to replace existing previews.

## How it works

- `js/ink.js` records each machine as filled polygons under role names, and looks each role's colour up when it is drawn, so a poster's palette can change under a machine. `face()` cuts a face's light into five flat steps; a step is written `role@k` and resolved by `shade()`, which mixes the colour toward a cool shadow or toward white.
- There is no press. The graphic version drew into an offscreen canvas and printed it through a WebGL2 shader (`print.js`); here the scene is drawn straight onto the visible canvas, so it is simpler and faster.
- `js/geo.js`, `js/kit.js` and `js/machines/*.js` are the same modeller and machines as in `iLoop-graphic`. The one change is that the M1's memory packages are plain matte faces instead of a stipple.
- `js/app.js` holds the camera and transitions, the poster compositions (`drawBackdrop`) and the poster colours (`POSTER`). `withTint()` gives each machine its own colours and a true white. The crop marks and the registration spring are gone.
- The poster keeps clear of the page's own type: `measure()` records where the caption, the buttons, the hint and the rail sit, and `yearSpot()` places each year where it touches none of them.
- `js/sound.js` and `js/soundtrack.js` are the same as in every other version, and `audio` is a link to `../iLoop/audio`.

Run the audio and music-picker tests with `node --test tests/*.test.cjs`.
