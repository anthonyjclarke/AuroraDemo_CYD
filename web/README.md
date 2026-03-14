# Aurora Demo — Browser Edition

This folder contains a browser-native, static-web implementation of Aurora Demo.
It sits alongside the CYD firmware in the main repository as an alternate runtime,
not as a replacement for the ESP32 target.

## Run

Open [index.html](/Users/anthonyjclarke/PlatformIO/Projects/AuroraDemo_CYD/web/index.html)
directly in a browser, or serve this folder with any static web server.

If your browser blocks local `file://` script loading, run a simple local server
from the `web/` directory instead:

```sh
python3 -m http.server
```

Then visit `http://localhost:8000`.

## Included Animations

- Spiro
- Radar
- Life
- Flow Field
- Pendulum Wave
- Incremental Drift
- Incremental Drift 2
- Spin
- Munch
- Electric Mandala
- Fire
- Pulse
- Simplex Noise
- Wave
- Attract
- Bounce
- Swirl
- Flock
- Infinity
- Plasma
- Spark
- Invaders
- Cube
- MultipleStream
- Snake
- Maze
- Spiral

## Palettes

- Solar
- Ocean
- Forest
- Lava
- Ice
- Neon

## Notes

- The browser app is self-contained and requires no build step.
- It uses a canvas-based renderer and browser controls for pattern selection,
  palette selection, autoplay duration, shuffle, and manual stepping.
- The presentation is Aurora-inspired, but this implementation is distinct from
  the CYD firmware pipeline and does not run on the device.
