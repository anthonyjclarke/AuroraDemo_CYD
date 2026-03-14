# Aurora Demo — ESP32 CYD Edition

Procedurally animated visual effects running on the **ESP32 Cheap Yellow Display** (CYD) — a low-cost ESP32 development board with a built-in 2.8″ ILI9341 320×240 TFT and resistive touch screen.

Twenty-nine effects rotate automatically every 20 seconds. Tap the screen at any time to skip to the next effect immediately.

**Current version: 0.5.0** — see [CHANGELOG.md](CHANGELOG.md) for full history.

Repository: [github.com/anthonyjclarke/AuroraDemo_CYD](https://github.com/anthonyjclarke/AuroraDemo_CYD)

This repository now contains two parallel Aurora Demo targets:

- the **ESP32 CYD firmware** in the existing PlatformIO project
- a **browser-native static web app** in [`web/`](/Users/anthonyjclarke/PlatformIO/Projects/AuroraDemo_CYD/web)

---

## Origins & Credits

| Layer                          | Author                       | Source                                                            |
|:-------------------------------|:-----------------------------|:------------------------------------------------------------------|
| Aurora effects engine (origin) | Jason Coon / PixelMatix      | [github.com/pixelmatix/aurora]                                    |
|                                                               | (https://github.com/pixelmatix/aurora)                            |
| ESP32 HUB75 DMA port           | mrfaptastic / mrcodetastic   | [ESP32-HUB75-MatrixPanel-DMA]                                     |
|                                                               | (https://github.com/mrcodetastic/ESP32-HUB75-MatrixPanel-DMA)     |
| ESP32 CYD (ILI9341) port       | Anthony Clarke               | [AuroraDemo_CYD]                                                  |
|                                                               |  (https://github.com/anthonyjclarke/AuroraDemo_CYD)               |

The Aurora effects engine was originally written in 2014 for the Teensy + SmartMatrix. mrfaptastic ported it to ESP32 with HUB75 DMA LED panels. This project re-targets that work to the much cheaper and more accessible CYD hardware using TFT_eSPI.

---

## Hardware

The CYD is an ESP32 development board with an integrated 2.8″ ILI9341 TFT (320×240, SPI) and XPT2046 resistive touch controller, available for ~£5–10. No external wiring is required — all connections are on-board.

| Spec      | Value                     |
|:----------|:--------------------------|
| MCU       | ESP32 dual-core 240 MHz   |
| Display   | ILI9341 2.8″ 320×240 SPI  |
| Touch     | XPT2046 resistive         |
| Flash     | 4 MB                      |
| RAM       | 320 KB SRAM + ~4 MB PSRAM |

### Pin Mapping

| Signal     | GPIO | Signal       | GPIO |
|:-----------|:-----|:-------------|:-----|
| TFT MOSI   | 13   | TFT SCLK     | 14   |
| TFT CS     | 15   | TFT DC       | 2    |
| TFT RST    | —    | Backlight    | 21   |
| Touch CS   | 33   |              |      |

---

## Build & Flash

### Prerequisites

- [VSCode](https://code.visualstudio.com/) with the [PlatformIO extension](https://platformio.org/install/ide?install=vscode)
- A USB cable connected to your CYD

### Commands

```bash
pio run                      # build
pio run --target upload      # build and flash
pio device monitor           # open serial monitor (115200 baud)
```

On boot the firmware prints the version, heap usage, and the full active pattern list.
At each pattern transition it logs the average fps for the outgoing effect and the name of the next.

---

## Browser Demo

The repo also includes a browser-native implementation of Aurora Demo under
[`web/`](/Users/anthonyjclarke/PlatformIO/Projects/AuroraDemo_CYD/web). It is a
separate static app that mirrors the animation set for desktop/mobile browsers;
it is not served by the ESP32 and does not change the firmware runtime.

### Run

Open [`web/index.html`](/Users/anthonyjclarke/PlatformIO/Projects/AuroraDemo_CYD/web/index.html)
directly in a browser, or serve the `web/` folder with any static web server:

```bash
cd web
python3 -m http.server
```

Then visit `http://localhost:8000`.

The browser app includes animation selection, palette selection, previous/next
controls, shuffle, autoplay, duration control, and a live FPS/status panel.

---

## Project Structure

```text
AuroraDemo_CYD/
├── src/
│   └── main.cpp              Entry point — setup, loop, touch, pattern transitions
├── lib/
│   ├── debug.h               Levelled logging macros (DBG_INFO / WARN / ERROR / VERBOSE)
│   └── Aurora/               Aurora effects engine (all header-only)
│       ├── Effects.h         Framebuffer, palettes, Perlin noise, render pipeline
│       ├── Drawable.h        Abstract base class for all patterns
│       ├── Playlist.h        Pattern sequencer interface
│       ├── Patterns.h        Pattern registry — 29 active patterns
│       ├── Vector.h          2D vector math (PVector = Vector2<float>)
│       ├── Boid.h            Craig Reynolds flocking entity
│       ├── Attractor.h       Gravitational attractor for boid physics
│       ├── Geometry.h        3D geometry structs used by PatternCube
│       └── Pattern*.h        Individual pattern implementations (one file each)
├── web/
│   ├── index.html            Browser demo entry point
│   ├── app.js                Canvas renderer and animation implementations
│   ├── styles.css            Browser demo styling
│   └── README.md             Browser demo notes and run instructions
├── platformio.ini
├── CHANGELOG.md
└── README.md
```

---

## Active Patterns (29)

| #  | Pattern                  | Algorithm                                        |
|:---|:-------------------------|:-------------------------------------------------|
|  1 | Spiro                    | Spirograph parametric equations                  |
|  2 | Life                     | Conway's Game of Life                            |
|  3 | FlowField                | Boids following a Perlin noise vector field      |
|  4 | PendulumWave             | `beatsin8`-driven pendulum wave                  |
|  5 | IncrementalDrift         | Nested oscillating circles                       |
|  6 | IncrementalDrift2        | Oscillating circles variant                      |
|  7 | Munch                    | Bitwise XOR / AND coordinate patterns            |
|  8 | ElectricMandala          | Perlin noise + 4-fold kaleidoscope symmetry      |
|  9 | Spin                     | Accelerating / decelerating circular particle    |
| 10 | SimplexNoise             | Direct Perlin noise → colour mapping             |
| 11 | Wave                     | Travelling waves, 4 rotation modes              |
| 12 | Attract                  | Boids orbiting a gravity attractor               |
| 13 | Swirl                    | Dimming blur + sine wave modulation              |
| 14 | Bounce                   | Gravity-bouncing particle system                 |
| 15 | Flock                    | Craig Reynolds boid flocking                     |
| 16 | Infinity                 | Lissajous figure-8 curves                       |
| 17 | Plasma                   | Sine wave interference                           |
| 18 | Invaders Small           | Space Invader sprites, small scale               |
| 19 | Invaders Medium          | Space Invader sprites, tiled 4×4 px cells        |
| 20 | Invaders Large           | Space Invader sprites, tiled large cells         |
| 21 | Snake                    | Snake-game animation                             |
| 22 | Cube                     | 3D wireframe cube with perspective projection    |
| 23 | Fire                     | Fire simulation via fractional noise scrolling   |
| 24 | Maze                     | Growing-tree procedural maze generation          |
| 25 | Pulse                    | Expanding circle pulses with noise smearing      |
| 26 | Spark                    | Spark / firework particles with noise smearing   |
| 27 | Spiral                   | Rotating spiral geometry                         |
| 28 | Radar                    | Radar sweep animation                            |
| 29 | MultipleStream           | Noise-smeared multi-stream pixel movement        |

---

## Rendering Pipeline

```
effects.ClearFrame()        zero leds[] framebuffer
      ↓
pattern.drawFrame()         active pattern writes CRGB values to effects.leds[XY(x, y)]
      ↓
effects.ShowFrame()         scale each pixel 2×2 → push to ILI9341 via tft.pushImage()
```

The virtual canvas is **160×120 pixels**. Each canvas pixel is rendered as a 2×2 block on the 320×240 display. Patterns work in canvas coordinates; the scaling is handled transparently by `ShowFrame()`.

The three large buffers (`leds[]`, `heat[]`, `noise[][]` — ~96 KB combined) are heap-allocated in `Effects::Setup()` rather than placed in the linker's BSS segment, which would otherwise overflow at this canvas size.

---

## Touch Interaction

Tap anywhere on the screen to advance to the next effect immediately — the same transition used by the 20-second auto-rotation. Touch uses raw-pressure edge detection with a 250 ms debounce so taps still work even when calibrated coordinates are noisy.

Touch calibration constants are defined in `src/main.cpp`. The default values suit most CYD units in landscape orientation; if tap accuracy is important, run a calibration sketch and replace the five values.

Each transition clears both the TFT and the Aurora framebuffer before the next pattern starts. The effect name is then shown briefly using a small built-in bitmap renderer rather than the TFT library font APIs, which proved unreliable on this target.

---

## Configuration

| Setting           | Value   | Location                          |
|:------------------|:--------|:----------------------------------|
| Canvas width      | 160 px  | `platformio.ini` `-DMATRIX_WIDTH` |
| Canvas height     | 120 px  | `platformio.ini` `-DMATRIX_HEIGHT`|
| Pattern duration  | 20 s    | `main.cpp` `PATTERN_DURATION_MS`  |
| Name overlay hold | 1.0 s   | `main.cpp` `NAME_HOLD_MS`         |
| Touch debounce    | 250 ms  | `main.cpp` `TOUCH_DEBOUNCE_MS`    |
| Target FPS        | 30      | `main.cpp` `default_fps`          |
| Serial baud       | 115200  | `main.cpp` `Serial.begin()`       |
| Debug level       | 3 (Info)| `platformio.ini` `-DDEBUG_LEVEL`  |

Debug levels: 0 = Off, 1 = Error, 2 = Warn, 3 = Info, 4 = Verbose.

---

## Adding a New Pattern

1. Create `lib/Aurora/PatternFoo.h` — include guard `PatternFoo_H`, class `PatternFoo : public Drawable`
2. Implement `unsigned int drawFrame()` — write to `effects.leds[XY(x, y)]`, call `effects.ShowFrame()`, return delay ms (0 = use default fps)
3. Optionally override `void start()` / `void stop()` for init / teardown
4. In `lib/Aurora/Patterns.h`:
   - Add `#include "PatternFoo.h"`
   - Declare `PatternFoo foo;` in the `private:` section
   - Add `&foo,` to `items[]`
   - Increment `PATTERN_COUNT`

---

## Libraries

| Library                                                    | Version   | Purpose                          |
|:-----------------------------------------------------------|:----------|:---------------------------------|
| [bodmer/TFT_eSPI](https://github.com/Bodmer/TFT_eSPI)     | `^2.5.43` | ILI9341 display driver + touch   |
| [fastled/FastLED](https://github.com/FastLED/FastLED)     | `^3.4.0`  | Colour maths, palettes, noise    |

TFT_eSPI is configured entirely via `build_flags` in `platformio.ini` — no `User_Setup.h` file is needed.

---

## Licence

The Aurora effects engine (`lib/Aurora/`) is copyright © 2014 Jason Coon and licensed under the MIT Licence. See individual source files for full licence text.

Portions of `Effects.h` are adapted from work by Stefan Petrick (CC0 / public domain).

This CYD port is released under the MIT Licence.
