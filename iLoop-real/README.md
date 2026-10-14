# Studio Machines (iLoop-real)

The same endless zoom through thirteen machines as `../iLoop`, photographed instead of drawn. Each machine stands on a seamless paper sweep in a studio lit by softboxes, modelled in real millimetres, with real materials, and with its screen showing its own era's interface at its own resolution. The machines, their order, the three ways one leads to the next, the easter eggs, the captions, the controls and the soundtrack are all the same as in `iLoop`. What changes is how everything is made, and how the transitions read through a camera.

Open `index.html` in a browser. No build step or server is needed.

## The machines

| Machine | File | On its screen, and how it leads on |
| --- | --- | --- |
| Apple I | `js/machines/apple-i.js` | The bare board; the camera goes down onto the white ceramic 6502, and the Apple II assembles round it |
| Apple II | `js/machines/apple-ii.js` | `]RUN` in mixed mode on the Monitor III, then the 1984 egg: a sledgehammer through the tube, and the Macintosh behind it |
| Macintosh 128K | `js/machines/macintosh-128k.js` | MacPaint at 512 × 342 in one bit, the PowerBook in its drawing window |
| PowerBook 100 | `js/machines/powerbook-100.js` | System 7 on the passive-matrix panel, the iMac in a QuickTime movie |
| iMac G3 | `js/machines/imac-g3.js` | Mac OS 9 at 1024 × 768, the iPod in iTunes |
| iPod | `js/machines/ipod.js` | Now Playing on the 160 × 128 LCD, the iPhone as the album's silhouette |
| iPhone | `js/machines/iphone.js` | The iPhone OS 1 home screen; the Mail egg opens the envelope on the MacBook Air |
| MacBook Air | `js/machines/macbook-air.js` | Leopard; the clock egg runs Time Machine forward to 2016 and the Apple Watch |
| Apple Watch | `js/machines/apple-watch.js` | The Activity face; inside, down to the S2, then swiped to the M1 |
| Apple M1 | `js/machines/apple-m1.js` | The package; the iMac 24″ assembles round its lid |
| iMac 24″ | `js/machines/imac-24.js` | Big Sur and Safari on apple.com, the MacBook Pro as the page's hero picture |
| MacBook Pro 14″ | `js/machines/macbook-pro-14.js` | Monterey and AirDrop; the airdrop egg opens the Mac mini's circle |
| Mac mini | `js/machines/mac-mini.js` | Inside, down through the board to the M4's die, with the Apple I etched into it |

## Controls

The same as `iLoop`: scroll (or swipe) down to travel into each machine and up to come back out; ← and → step one machine; `p` or ▶ plays the whole loop; the Notes button hides the captions; click a year on the rail to jump; `#iphone`, `#apple-m1` and so on open on a machine.

The note button turns the music on or off, and the speech-bubble button the voice clips. Each works on its own, and both start off. With the voice clips on, ▶ stays on each machine until its clip has finished (then a breath of music, and never more than 30 seconds).

For checking and debugging:

| Parameter | Effect |
| --- | --- |
| `?at=6.7` | freezes the level at 6.7 (the iPhone, 70% of the way into its Mail icon); input is ignored |
| `?perf` | shows the time spent per rendered frame |
| `?dpr=1` | sets the rendering pixel ratio (default: the screen's, up to 2) |
| `?noao`, `?nodof`, `?nobloom` | turn off ambient occlusion (and with it depth of field, which reads its depth), depth of field, bloom |
| `?nosweep` | lights every set with the bare studio, without the paper sweep in its reflections |
| `?nox` | leaves out the last stretch's hand-off to the next machine, to see the screen alone |

## Sound

Unchanged from `iLoop`: `js/sound.js`, `js/soundtrack.js`, `js/music-picker.js`, `music.html`, `scripts/` and `tests/` are copies, and `audio` is a link to `../iLoop/audio`. See `../iLoop/README.md` for how the music and sound bites are chosen and rebuilt. Run the tests with `node --test tests/*.test.cjs`.

## How it is rendered

- **three.js r186**, bundled once with the addons used into `vendor/three.bundle.js` (a classic script that sets `window.THREE`, so the page opens from `file://`). `scripts/build-vendor.sh` rebuilds it from npm; three's licence is in `vendor/LICENSE-three.txt`.
- **The studio** (`js/real/core.js`). Image-based light from a studio built out of emissive panels and prefiltered (PMREM): a key softbox above left, a broad overhead, a scrim behind, a dim fill, two strip lights behind for edges, white cards low on each side. Each set's reflections also hold its paper sweep, lit, with the shaded band where it curves up (`Real.sweepEnv(paper)`): a vertical face of metal mostly mirrors the paper in front of it, so the sides of a Mac mini read silver and the front edge of a MacBook Pro reads, rather than going black. Glass and polished metal reflect these shapes, as in a product photograph. A key light casts a soft (VSM) shadow onto a paper sweep sized to the machine.
- **The camera** is a long lens (85–105 mm equivalent) with a shift lens, so the machine sits in the free part of the page while its verticals stay true.
- **Post-processing**: ground-truth ambient occlusion, a depth-of-field gather, bloom (only screens and glints are bright enough), and Khronos PBR Neutral tone mapping, which keeps product colours true.
- **Materials** (`js/real/materials.js`) are physically based: moulded ABS with its stipple, bead-blasted and brushed aluminium, polished steel and chrome, black glass, translucent polycarbonate, epoxy and ceramic chip packages, rubber. Fine surface texture comes from noise in the object's own space, so it needs no UVs and holds up at any zoom.
- **Screens** (`js/real/display.js`). Each screen is drawn by its machine into a canvas at the screen's own resolution: 512 × 342 for the Macintosh, 320 × 480 for the iPhone. Every frame, only the part of the screen in view is composited, at the resolution it is seen at, through a shader for its technology: a CRT's phosphor, beam and scan lines; a passive-matrix LCD's pale panel and pixel gaps; an LCD's RGB stripes and black matrix; an aperture grille. The result lights the glass as emission, and the glass reflects the studio. Up close you see the pixels and then the subpixels; from further away than one device pixel per screen pixel, a dither is seen as its average tone, as a lens would see it, rather than aliasing into stripes.
- **The portal.** Wherever a screen's canvas is transparent, the next machine shows through. It is rendered live (or from a snapshot, at rest) and drawn the way that screen would draw it: dithered to one bit on the Macintosh, in phosphor on the Apple II, as a silhouette on the iPod. As the camera arrives the screen's look, structure and glass fade, the portal opens out over the whole frame, and the picture hands over to the machine itself.

## How the transitions work (`js/real/app.js`)

The level L is continuous: floor(L) is the machine in front of you and t = frac(L) is how far you have travelled toward the next one. Everything is a function of L, so scrolling scrubs every transition both ways.

- **screen**: the camera swings round to face the screen square-on and dollies in exponentially (every stretch of scroll magnifies by the same factor), until the next machine's whole view, as drawn on the screen, fills the frame. The look fades from about t = 0.8 and the pixel structure from 0.8 to 0.96. From 0.78 to 0.95 the portal opens out over the whole frame, feathered past its edge, so the screen's own furniture (menus, windows, the Dock) is gone before the hand-off. Over 0.9 to 1 the picture hands over to the next machine's own render, which is laid exactly where its frame lies on the glass at that moment (the frame is a rectangle on a flat pane, so its picture is a homography of the render), so the two never show doubled; at t = 1 the frame is the view. Where a portal is wider or taller than the page, the frame's edge (sweep) is carried on outward, so any window shape works at any window size.
- **inside**: parts with `peel` lift away while the camera travels down onto the chip mark; with `next.swipe`, the view is then swiped away like a card and the next machine slides in behind it.
- **die**: as inside, but the chip mark carries a `silicon` display, and the next machine is etched into it (light edges on dark silicon) until the camera arrives.
- **assemble**: the camera goes down to a macro shot of the focus chip (t < 0.38). There it cross-fades to the same chip on the next machine's board (its anchor), and the next machine's parts with `fly` come in and seat round it while the camera pulls back out to rest.

**Getting ready while idle.** While nothing moves, the app gets every machine ready, nearest first, one per idle moment: built, its shaders compiled and textures uploaded, and its snapshot (the picture of it at rest that the previous machine's screen shows) rendered, then again once its own next machine has one. The full-size buffers the last stretch of a screen zoom uses are allocated the same way. The next machine's live render is kept until an egg poses it differently, so a zoom renders two full pipelines only while something in both is changing. A screen's composite grows with headroom and is bounded by what is in view, so a camera closing in on it does not reallocate every frame.

## Adding or finishing a machine

This is the contract for machine files. Follow it and you never need to touch the engine.

### Files you own and files you must not edit

- A machine is one file: `js/machines/<slug>.js`. The slug is the machine's name in lower case with runs of other characters turned into `-` (`iMac 24″` → `imac-24`). It is listed in `index.html`, in loop order.
- The engine and everything shared is `js/real/*.js`: `core.js` (renderer, studio, `Real.sweepEnv`, `Real.parts`, post-processing), `materials.js`, `shapes.js`, `details.js`, `pixel.js`, `display.js` (screens), `macos.js` (Big Sur and Monterey for the iMac 24″ and the MacBook Pro), `registry.js` and `app.js`. When several agents work on machines at once, each edits only its own machine files and describes any engine change it needs instead of making it; `vendor/`, `js/sound.js`, `js/soundtrack.js`, `js/music-picker.js` and `tests/` are shared with `iLoop` and stay as they are.
- Exception: an egg that belongs to your machine's screen is written in your file (see Eggs).

### Units, axes and size

Millimetres. y is up, the machine stands on the floor at y = 0, its front faces +z, and it is roughly centred on x = 0, z = 0. Model at the real size: the camera, the studio, depth of field and shadow softness are all set from it. Accessories (keyboard, mouse, cables, an envelope) are part of the machine and are framed with it; set `userData.noFit = true` on anything that should not be (a long cable), or give `fitBox: [[x0, y0, z0], [x1, y1, z1]]`.

### Registering

```js
Real.add({
  name: 'Macintosh 128K',  era: 'system1',  year: '1984',  kind: 'All-in-one',
  line: '…',  verb: 'Zoom into the drawing in MacPaint',   // keep the text from ../iLoop exactly
  view: { yaw: 27, pitch: 11, lens: 90, fill: 0.92 },      // see below
  set: { paper: '#d8d5cf' },                               // see below
  next: { type: 'screen', look: { kind: 'mono' } },        // how it leads on; see below
  make(M, Real) { … },                                     // build it
  pose(M, state) { … },                                    // optional: a pose an egg can ask for
  assemble(M, u) { … },                                    // optional: called while it assembles
});
```

- `view`: `yaw` (degrees round y; positive sees the right side), `pitch` (degrees above level), `lens` (35 mm-equivalent focal length; 85–105 for product shots), `fill` (how much of the free page the bounding box fills, default 0.9), optional `target` ([x, y, z] to aim at instead of the box centre) and `aperture` (depth of field at rest, default 5; 0 is none).
- `set`: `paper` (the sweep's colour), `keyDir` ([x, y, z] toward the key light), `keyI` (its strength, default 1.5), `env` (studio light multiplier, default 1), `shadowSoft` (default 14), `back` (how far the sweep's curve sits behind the machine, in machine sizes).
- `next.type`: `screen`, `inside`, `die` or `assemble` (see the table below). `next.look` is how this screen draws the next machine: `{ kind: 'mono' }` (one bit, ordered dither), `{ kind: 'gray', levels: 4 }`, `{ kind: 'silhouette', fg, bg }`, `{ kind: 'etch', fg, bg }`, or none for full colour. Optional `range: [lo, hi]` maps luminance before the look (the default for mono and gray sends the studio backdrop to white). `next.egg` names an event egg. `next.swipe` (inside only) swipes to the next machine. `next.fg`, `next.bg` colour a die's etching.

### The builder, `M`

- `M.part(name, { peel, fly })` starts (or returns to) a named group; later meshes go into it. Its pose at the end of `make` is its home.
  - `peel: { at: [t0, t1], move: [x, y, z], rot: [x, y, z] degrees, hide }` lifts it away while you go inside.
  - `fly: { from: [x, y, z], rot: [x, y, z], at: [u0, u1], show }` flies it in from that offset while this machine assembles round the previous one's chip. Parts without `fly` are there from the start, so the anchor chip and its board must not fly.
- `M.mesh(geometry, material, { pos, rot, scale, to, cast, receive, name })` adds a mesh (to the current part, or to `to`). Rotations are in degrees.
- `M.group({ pos, rot, to })` and `M.add(object, to)` for your own groups.
- `M.screen(options)` adds a screen and returns its `Real.Display` (below). The first is the main screen, `M.main`, which holds the portal; pass `main: false` for others.
- `M.mark(name, object, { center, x, y, w, h, display })` marks a rectangle the camera can travel to, in `object`'s own coordinates: `center`, its right (`x`) and up (`y`) directions (the camera looks down x × y), and its size. Use `chip` (inside, die), `focus` (assemble: on this machine), `anchor` (assemble: on the next machine). For a die, pass the silicon display as `display`.
- `M.state` is yours, for anything `pose` or `assemble` needs later. `M.root` is the machine; `M.box` its framed box.

### What each machine must provide

| Link | This machine provides | The next machine provides |
| --- | --- | --- |
| screen | a main screen with `portal.rect` | nothing |
| inside | `marks.chip`; parts with `peel` over it | nothing |
| die | `marks.chip` whose `display` is a `tech: 'silicon'` screen with `portal.rect`; parts with `peel` | nothing |
| assemble | `marks.focus` on the chip | `marks.anchor` on the same chip, and parts with `fly` |

For an assembly the camera's macro shot of `focus` cross-fades to the same shot of `anchor`, so they must be the same chip, at the same size, with x along its long side and y pointing away from the viewer. Apple I → Apple II share `Real.D.dip(40, { ceramic: true })` (the 6502); Apple M1 → iMac 24″ must share the M1 package.

In the loop: Apple I assembles into the Apple II; Apple II, Macintosh 128K, PowerBook 100, iMac G3, iPod, iPhone, MacBook Air, iMac 24″ and MacBook Pro 14″ lead on through their screens; the Apple Watch goes inside to the S2 and swipes to the M1; the M1 assembles into the iMac 24″; the Mac mini goes inside to the M4 and finds the Apple I etched in its die.

### Screens

`M.screen(o)` options (millimetres unless noted):

- `to`, `pos`, `rot`: where the glass sits; it lies in its parent's x–y plane facing +z.
- `w`, `h`: the lit picture. `glass: [w, h]`: the pane around it (default: the picture). `offset: [x, y]`: the picture's centre within the pane. `corner`: the picture's corner radius. `bulge`: a CRT face's curvature (mm at the centre).
- `tech`: `crt-white`, `crt-green`, `crt-amber`, `crt-color`, `lcd-stn` (a passive-matrix laptop), `lcd-gray` (the iPod), `lcd`, `retina`, `oled`, `silicon`. `bright` overrides its brightness; `rough` and `glassColor` its glass.
- `ui: [W, H]`: the canvas, in the screen's own pixels for anything before about 2008. `scale`: canvas pixels per ui unit (for modern screens draw in points and set `scale: 2`). `panel: [cols, rows]`: the physical pixel grid, if it differs from the canvas (a 4.5K iMac drawn on a smaller canvas). Old screens with `panel` equal to the canvas are pixel art: sampled nearest, so pixels stay square however close you come.
- `draw(g, s)`: paints the screen in ui units. Leave the portal transparent (`clearRect`, or `destination-out`); anything drawn over it afterwards (a pointer) stays on top. `s` has `W`, `H`, `time`, `display`, and whatever an egg or `assemble` put in `display.state.drawState`.
- `animate`: redraws per second while the machine is in view (a blinking cursor, a drifting pointer); 0 (the default) draws once.
- `portal: { rect: [x, y, w, h] }` in ui units: where the next machine's stage (the free part of the page) lands. Its whole view extends a little beyond it, at the page's aspect ratio.

`Real.Pix` draws period interfaces on the canvas: `bitText` (type set in whole pixels: anti-aliased, then thresholded, as a bitmap font sits on a 1984 screen), `textWidth`, `fillPat` and `PAT` (QuickDraw's 8 × 8 patterns), `bitmap` (pixels from strings), `rect`, `frame`, `line` (Bresenham), `threshold`, `rrect`, `arrow` (the classic pointer), `apple` (the logo, solid or rainbow).

### Eggs

An egg is an event on a screen rather than a picture (the Apple II's hammer, the iPhone's Mail envelope, the MacBook Air's Time Machine clock). The machine whose screen holds it registers it, in its own file:

```js
Real.egg('mail', (api) => { … });
```

It is called every frame from t = 0 to 1 while you travel to the next machine, and once with t = 0 when you leave, to reset. `api` has `t`, `zoom` (how much the camera has closed in since rest), `A` and `B` (this machine and the next), `display` (this machine's main screen), `scene` and `camera` (for 3D props such as the hammer). An egg must be a pure function of t: scrolling back must undo it, and at t = 1 the screen must show the next machine exactly as it stands at rest.

- To change the screen, put what `draw` needs in `display.state.drawState` and call `display.redraw()` when it changes. The engine has already set `display.state` for this frame (`lookAmt`, `brightMul`, `frame`…); an egg may change those too.
- To pose the next machine in the picture, call `api.poseNext(state)`; the next machine's `pose(M, state)` receives it (and `{}` at rest). The Mail egg calls `poseNext({ emerge })`, so **the MacBook Air must implement `pose(M, { emerge })`**: 0 is the laptop still in its interoffice envelope, 1 is at rest.
- Eggs live in: `apple-ii.js` ('1984'), `iphone.js` ('mail'), `macbook-air.js` ('clock'), `macbook-pro-14.js` ('airdrop'), `mac-mini.js` ('m4'). The iMac 24″'s colours and its hello are its `assemble(M, u)` hook.
- **Mind the glass plane.** Near the end of a zoom a CRT's bulge flattens to the plane of its glass; anything of the machine whose front face sits in front of that plane (a bezel lip, a hammer's rest position) will then cover the screen. Keep the screen's surroundings behind the glass.
- **Warm up an egg's props.** The first frame that draws a new object compiles its shaders and uploads its textures. An egg's 3D props (the hammer, the glass shards) are drawn hidden inside the machine for the first frames of its `pose()` so that cost is paid at rest, not at the moment of the throw.
- An egg's screen may open its own portal wider as t grows (AirDrop's circle does); the engine also opens every portal over the whole frame from t = 0.78 to 0.95.

### Geometry, materials, details

- `Real.G` (geometry): `rrect`, `rrectHole`, `circleHole` (2D shapes), `extrude` (a shape with a rounded bevel that stays inside its outline), `profile` (a side profile extruded across the width, edges rounded), `plate`, `slab`, `rbox`, `cyl`, `lathe`, `loftRR` (a loft through rounded rectangles: keycaps, feet, tapering housings), `tube`, `coil`, `splitGroups` (give parts of one geometry different materials), `merge`, `smoothNormals`, `mesh`, `group`, `place`.
- `Real.Mat` (materials): `abs`, `plastic`, `alu`, `brushed`, `chrome`, `steel`, `rubber`, `glass`, `clear`, `translucent`, `epoxy`, `ceramic`, `gold`, `tin`, `hole` (a dark opening), `printed` (from a canvas), `micro` (add surface texture to your own material).
- `Real.D` (details): `keyboard` (sculpted or flat keys with their legends in one mesh; a legend's `align` is `tl`, `tc`, `c`, `bl`, `br` or `tr`, per key or for the board), `dip` (a DIP chip with pins and markings), `decal` and `label` (printing), `appleLogo` (raised or inlaid), `drawApple` (the logo in a canvas, solid or rainbow), `screw`, `foot`, `slots`.
- `Real.sweepEnv(paper)`: the studio with that paper sweep in it, the environment every set is lit with; give it to a material of your own as `envMap` (with `envMapIntensity` 0.36).
- `Real.parts`: parts one machine builds and another reuses. The owner publishes a builder when its file loads (`Real.parts.m1Package`, from `apple-m1.js`); a borrower looks it up inside its `make()`, never at load time, so file order does not matter. (The iMac 24″ goes one step further and clones the Apple M1 machine's own package, so its anchor is exactly the M1's focus.)
- Two surfaces must never run together on one outline at one depth (a recess that starts exactly on its hole's edge): they fight for depth in the AO pass, which draws a dashed line there. Start the inner surface a little outside the hole, inside the moulding, so it comes out through the wall at an angle.
- Nothing should be a raw box: bevel or round every edge. Repeated small parts (pins, keys, holes) should be merged into one mesh. Keep a machine under about 300,000 triangles.

### Checking your machine

Screenshots in headless Chrome (WebGL works through Metal):

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-angle=metal \
  --enable-unsafe-swiftshader --hide-scrollbars --window-size=1280,900 --virtual-time-budget=8000 \
  --screenshot=/tmp/shot.png "file://$PWD/index.html?at=6"
```

Check, for your machine at index k: rest at `?at=k` at 1280 × 900 and 1600 × 1000; the travel out of it at t = 0.3, 0.6, 0.85 and 0.95 (`?at=k.3` …); and the travel into it from the previous machine (`?at=k-0.4` …). Look at it next to your memory of the real product: proportions, every visible detail, materials under the studio light, and the screen as it really looked, pixel for pixel. The console must stay free of errors.
