# Engraved Machines

An endless zoom through thirteen machines, drawn as a relief print. Each machine has a portal. Zoom into it and the next machine is already there:

| Portal | Where it is |
| --- | --- |
| Screen | Apple II, Macintosh 128K, PowerBook 100, iMac G3, iPod, iPhone, MacBook Air, MacBook Pro Retina, MacBook Pro 14″, iMac 24″ |
| Silkscreen | Apple I: the Apple II is printed on the board in reverse, white on green |
| Die | Apple M1: the MacBook Pro is etched into the silicon |
| Sticker | Mac mini: a peeling sticker with the Apple I on it, which closes the loop back to 1976 |

Open `index.html` in a browser. No build step or server is needed.

## Controls

- Pinch on a trackpad or touch screen, or scroll, to zoom. Zooming out past the Apple I takes you to the Mac mini.
- Drag up or down to zoom. Double-click or double-tap to dive one level.
- Use the arrow keys or `+` and `-` to step. `p` plays the whole loop.
- Click a year on the rail to jump to it. `#iphone`, `#apple-m1` and similar names in the URL open on that machine.

## How it works

- `js/ink.js` is the mark-making engine. Ink marks are tapered gouge polygons. Pencil marks are thin, slightly unsteady graphite lines that run past their corners, drawn in two searching passes, with light graphite shading and pencilled dimensions and notes. Marks are recorded once per machine in local units (a 1000×1000 frame) into ordered layers, and each layer becomes one merged `Path2D`. Fine layers have a level of detail, so carving and shading fade in as a machine grows on screen.
- `js/devices.js` holds the machines. Each one has a `draw(plate)`, an optional `glass` overlay that dissolves as you pass through the screen, optional live `extras` (9:41, slide to unlock, hello, the M1 floorplan), and a `portal`.
- `js/app.js` holds the camera. Cameras are complex affine maps `z ↦ A·z + B`. Level `k + t` is a pure zoom about the one point where machine `k` at rest and its portal at full size agree, so the motion has no drift. The sticker portal is rotated, so the camera turns as you go.
- At rest a portal is empty. As you travel in, the next machine arrives in pencil first and is then inked over. Zooming back out reverses it. Silkscreen and die portals print the arriving machine in reverse and blend back to normal as you arrive. Faint pencil rings run out from the portal while you move, and a fixed paper grain sits over everything. Motion is reduced under `prefers-reduced-motion`.

To add a machine, push another entry into `D` in `devices.js` with a `portal`. The rail and the loop pick it up.
