# Aurora Demo — Browser Edition

This folder contains a browser-native, static web implementation of Aurora Demo.
It sits alongside the CYD firmware in the main repository as an alternate runtime,
not as a replacement for the ESP32 target.

## Run

Open [`index.html`](index.html)
directly in a browser, or serve this folder with any static web server.

If your browser blocks local `file://` script loading, run a simple local server
from the `web/` directory instead:

```sh
python3 -m http.server
```

Then visit `http://localhost:8000`.

## Included Animations

The browser app renders a 64×64 matrix and includes 27 patterns. The three
firmware `Invaders` variants are merged into one browser `Invaders` pattern.

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
  palette selection, autoplay duration, shuffle, manual stepping, fullscreen,
  and a live FPS display.
- The presentation is Aurora-inspired, but this implementation is distinct from
  the CYD firmware pipeline and shares no runtime code with the device build.
