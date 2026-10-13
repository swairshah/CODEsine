# Engraved Machines

An endless zoom through thirteen machines, drawn as a relief print with pencil over the ink. Each machine leads to the next in one of three ways:

| How | Where |
| --- | --- |
| A chip becomes a machine. You zoom into a chip, and the next machine's parts fly in and close around it. | Apple I to Apple II (the 6502); Apple M1 to iMac 24″, as an exploded diagram that collapses while the seven iMac colours run past, and the screen says hello |
| You go inside. The shell lifts away, you zoom onto the chip, and the chip becomes the next thing. | MacBook Air (M1) to Apple M1; Mac mini to the Apple I, etched into the M4's silicon |
| An easter egg on screen. The next machine hides in that era's screen, and you zoom into it. | Apple II (a lo-res Macintosh after `RUN MACINTOSH`), Macintosh 128K (a PowerBook icon), PowerBook 100 (an iMac icon), iMac G3 (an iPod mounted as a disk), iPod (the album cover while “Take California”, the song from the first iPod advert, plays), iPhone (the Mail envelope), MacBook Air (Time Machine in the Dock), iMac 24″ (Displays), MacBook Pro 14″ (AirDrop) |

The machines follow their reference photos: the Apple II with two Disk II drives and a Monitor III, the dark-grey PowerBook 100 with its centred trackball, the G3's white front and Bondi Blue shell, and so on. The 2012 MacBook Pro was swapped for the M1 MacBook Air, so going inside to find the M1 is historically true.

Open `index.html` in a browser. No build step or server is needed.

## Controls

- Scroll down to travel into each machine and up to come back out. On a phone, swipe up and down. Pinch and drag gestures are turned off on purpose.
- Use the arrow keys or the `−` and `+` buttons to step one machine. `p` or Play runs the whole loop.
- Notes shows or hides the descriptions. Your choice is remembered in this browser.
- Sound turns the soundtrack on or off. It starts off.
- Click a year on the rail to jump to it. `#iphone`, `#apple-m1` and similar names in the URL open on that machine.

## Sound

When you rest on a machine, it plays period sound effects first: the Apple II's power-on beep and the Disk II seeking, iPod wheel clicks, a MagSafe snap. Then a narrator reads that era's best-known line, such as "1,000 songs in your pocket", with a subtitle naming where the line comes from. If you stay, an original music bed in the style of that era's adverts eases in quietly, and the line returns over it like a tagline. When you scroll on, it fades out and the next machine's sound begins.

None of it is a recording from an Apple event or advert. Those recordings are copyrighted, so the effects and music are made live with Web Audio, and the lines are read by macOS voices: Fred, a voice from the classic Mac era, for the Macintosh's own 1984 "hello", and Samantha for the rest. The clips are in `audio/voice/`.

To use recordings you have the rights to, put them in `audio/custom/` and list them in `CUSTOM` at the top of `js/sound.js`. `05-bite` replaces the iPod's spoken line and `05-ad` replaces its music.

## How it works

- `js/ink.js` is the mark-making engine. Ink marks are tapered gouge polygons; pencil marks are thin, unsteady graphite lines found in two passes, with light graphite shading, dimensions and notes. Marks are recorded once per machine into ordered layers, and each layer becomes one merged `Path2D`. A plate can draw through an affine map, which is how keys, labels and screens sit on the faces of a 3D model.
- `js/geo.js` holds affine maps and a small 3D modeller: boxes (with rounded or sloped tops), extrusions, slabs, lofts and cylinders in centimetres, seen in a fixed orthographic three-quarter view and shaded from one light. Orthographic projection maps every flat face to the page by an exact affine transform.
- `js/kit.js` holds the machine registry and shared pieces: screens with a hidden portal, keyboards, vents, and period desktop furniture.
- `js/machines/*.js` are the machines. Each one names its parts. Parts can fly in during an assembly or peel away when you go inside, and each machine marks the rectangles that transitions use: `portal`, `focus`, `anchor`, `chip` and `self`.
- `js/sound.js` is the soundtrack: a small synth rack (oscillators, FM, plucked strings, drums from noise), a step sequencer for each era's music bed, and the timing for each visit.
- `js/app.js` holds the camera. A camera is an affine map from a machine's 1000 × 1000 frame to the screen. Every transition interpolates along the one-parameter path `pow(M, t)` from the identity to the map that frames the target, which reads as a camera moving in and turning square to a screen or chip. On screens, the next machine arrives in pencil first and is then inked.

To add a machine, call `Kit.add` in a machine file with a `make(model)` and a `next` that says how it leads on.
