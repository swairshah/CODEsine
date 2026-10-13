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

- `js/ink.js` is the mark-making engine. Every mark is a tapered gouge polygon. Marks are recorded once per machine in local units (a 1000×1000 frame) into ordered layers, and each layer becomes one merged `Path2D`. Fine layers have a level of detail, so a machine seen through a small portal shows only its solid blocks, and its carving fades in as it grows.
- `js/devices.js` holds the machines. Each one has a `draw(plate)`, an optional `glass` overlay that dissolves as you pass through the screen, optional live `extras` (9:41, slide to unlock, hello, the M1 floorplan), and a `portal`.
- `js/app.js` holds the camera. Cameras are complex affine maps `z ↦ A·z + B`. Level `k + t` is a pure zoom about the one point where machine `k` at rest and its portal at full size agree, so the motion has no drift. The sticker portal is rotated, so the camera turns as you go. Machines draw recursively into their portals. Silkscreen and die portals invert the palette and blend back to normal as you arrive.
- The motion borrows from the skillet sketch: heat lines rise off warm machines, carved rings ripple out from the portal while you travel, and ink flecks fly when you break through into the next machine. Motion is reduced under `prefers-reduced-motion`.

To add a machine, push another entry into `D` in `devices.js` with a `portal`. The rail and the loop pick it up.
