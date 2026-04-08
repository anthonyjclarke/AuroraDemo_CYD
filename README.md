# Aurora Demo — ESP32 CYD Edition

<!-- Update version badge when VERSION_STRING changes in src/main.cpp -->
![Version](https://img.shields.io/badge/version-0.6.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-ESP32-green.svg)
![PlatformIO](https://img.shields.io/badge/PlatformIO-6.x-orange.svg)
![Board](https://img.shields.io/badge/CYD-2.8%22%20%7C%204.0%22-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)
![Status](https://img.shields.io/badge/status-stable-green.svg)

Procedurally animated visual effects running on the **ESP32 Cheap Yellow Display** (CYD) family. Two board variants are supported: the 2.8″ ILI9341 (320×240) and the 4.0″ ST7796S (480×320). Each has its own PlatformIO build environment; all 29 patterns run identically on both.

Twenty-nine effects rotate automatically every 20 seconds. Tap the screen at any time to skip to the next effect immediately.

**Current version: 0.6.0** — see [CHANGELOG.md](CHANGELOG.md) for full history.

Repository: [github.com/anthonyjclarke/AuroraDemo_CYD](https://github.com/anthonyjclarke/AuroraDemo_CYD)

This repository now contains two parallel Aurora Demo targets:

- the **ESP32 CYD firmware** in the existing PlatformIO project
- a **browser-native static web app** in [`web/`](web/)

---

## Origins & Credits

| Layer                          | Author                     | Source                                                                                    |
|:-------------------------------|:---------------------------|:------------------------------------------------------------------------------------------|
| Aurora effects engine (origin) | Jason Coon / PixelMatix    | [pixelmatix/aurora](https://github.com/pixelmatix/aurora)                                |
| ESP32 HUB75 DMA port           | mrfaptastic / mrcodetastic | [ESP32-HUB75-MatrixPanel-DMA](https://github.com/mrcodetastic/ESP32-HUB75-MatrixPanel-DMA) |
| ESP32 CYD (ILI9341) port       | Anthony Clarke             | [anthonyjclarke/AuroraDemo_CYD](https://github.com/anthonyjclarke/AuroraDemo_CYD)        |

The Aurora effects engine was originally written in 2014 for the Teensy + SmartMatrix. mrfaptastic ported it to ESP32 with HUB75 DMA LED panels. This project re-targets that work to the much cheaper and more accessible CYD hardware using TFT_eSPI.

---

## Hardware

Both CYD variants are ESP32 development boards with an integrated TFT and XPT2046 resistive touch controller, available for ~£5–15. No external wiring is required.

| Spec         | CYD 2.8″ (`esp32-cyd-28`)  | CYD 4.0″ (`esp32-cyd-40`)  |
|:-------------|:---------------------------|:---------------------------|
| MCU          | ESP32 (ESP32-2432S028R)    | ESP32 (ESP32-32E)          |
| Display      | ILI9341 · 320×240 · SPI    | ST7796S · 480×320 · SPI    |
| Touch        | XPT2046 resistive          | XPT2046 resistive          |
| Flash        | 4 MB                       | 4 MB                       |
| RAM          | 320 KB SRAM (no PSRAM)     | 520 KB SRAM (no PSRAM)     |
| Canvas       | 160×120 @ 2× scale         | 120×80 @ 4× scale          |
| SPI freq     | 55 MHz                     | 27 MHz                     |
| Backlight    | GPIO 21                    | GPIO 27                    |
| Colour order | BGR                        | BGR                        |

### Pin Mapping

Most SPI pins are shared across both boards. The backlight GPIO differs.

| Signal     | GPIO | Signal       | GPIO (2.8″) | GPIO (4.0″) |
|:-----------|:-----|:-------------|:------------|:------------|
| TFT MOSI   | 13   | Backlight    | 21          | 27          |
| TFT SCLK   | 14   | TFT DC       | 2           | 2           |
| TFT CS     | 15   | TFT RST      | —           | —           |
| TFT MISO   | 12   | Touch CS     | 33          | 33          |

---

## Build & Flash

### Prerequisites

- [VSCode](https://code.visualstudio.com/) with the [PlatformIO extension](https://platformio.org/install/ide?install=vscode)
- A USB cable connected to your CYD

### Commands

Select the correct environment for your board. All `pio` commands accept `-e <env>` to target a specific board.

**CYD 2.8″ (ILI9341 320×240)**

```bash
pio run -e esp32-cyd-28                          # build only
pio run -e esp32-cyd-28 --target upload          # build and flash
pio device monitor --environment esp32-cyd-28    # serial monitor (115200 baud)
```

**CYD 4.0″ (ST7796S 480×320)**

```bash
pio run -e esp32-cyd-40                          # build only
pio run -e esp32-cyd-40 --target upload          # build and flash
pio device monitor --environment esp32-cyd-40    # serial monitor (115200 baud)
```

In VSCode with the PlatformIO extension, use the environment picker in the status bar (bottom of the window) to select `esp32-cyd-28` or `esp32-cyd-40` before clicking Build or Upload.

On boot the firmware prints the board name, version, heap usage, and the full active pattern list. At each pattern transition it logs the average fps for the outgoing effect and the name of the next.

---

## Browser Demo

The repo also includes a browser-native implementation of Aurora Demo under
[`web/`](web/). It is a separate static app that mirrors the animation set for desktop/mobile browsers;
it is not served by the ESP32 and does not change the firmware runtime.

### Run

Open [`web/index.html`](web/index.html)
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
effects.ShowFrame()         scale each pixel DISPLAY_SCALE × DISPLAY_SCALE
                            → push to TFT via tft.pushImage()
```

Patterns work in virtual canvas coordinates. `ShowFrame()` handles the upscale transparently via the `DISPLAY_SCALE` build flag:

| Board     | Canvas   | Scale | Output     |
|:----------|:---------|:------|:-----------|
| CYD 2.8″  | 160×120  | 2×    | 320×240    |
| CYD 4.0″  | 120×80   | 4×    | 480×320    |

The three large buffers (`leds[]`, `heat[]`, `noise[][]`) are heap-allocated in `Effects::Setup()` rather than placed in the linker's BSS segment. Combined size: ~96 KB on the 2.8″ board, ~48 KB on the 4.0″ board.

---

## Touch Interaction

Tap anywhere on the screen to advance to the next effect immediately — the same transition used by the 20-second auto-rotation. Touch uses raw-pressure edge detection with a 250 ms debounce so taps still work even when calibrated coordinates are noisy.

Touch calibration constants are defined in `src/main.cpp`. The default values suit most CYD units in landscape orientation; if tap accuracy is important, run a calibration sketch and replace the five values.

Each transition clears both the TFT and the Aurora framebuffer before the next pattern starts. The effect name is then shown briefly using a small built-in bitmap renderer rather than the TFT library font APIs, which proved unreliable on this target.

---

## Configuration

Board-specific settings (canvas size, scale, SPI speed, backlight GPIO, driver) are set via `platformio.ini` build flags per environment. Shared runtime constants live in `src/main.cpp`.

| Setting           | CYD 2.8″         | CYD 4.0″         | Location                           |
|:------------------|:-----------------|:-----------------|:-----------------------------------|
| Canvas width      | 160 px           | 120 px           | `platformio.ini` `-DMATRIX_WIDTH`  |
| Canvas height     | 120 px           | 80 px            | `platformio.ini` `-DMATRIX_HEIGHT` |
| Display scale     | 2×               | 4×               | `platformio.ini` `-DDISPLAY_SCALE` |
| Pattern duration  | 20 s             | 20 s             | `main.cpp` `PATTERN_DURATION_MS`   |
| Name overlay hold | 1.0 s            | 1.0 s            | `main.cpp` `NAME_HOLD_MS`          |
| Touch debounce    | 250 ms           | 250 ms           | `main.cpp` `TOUCH_DEBOUNCE_MS`     |
| Target FPS        | 30               | 30               | `main.cpp` `default_fps`           |
| Serial baud       | 115200           | 115200           | `main.cpp` `Serial.begin()`        |
| Debug level       | 3 (Info)         | 3 (Info)         | `platformio.ini` `-DDEBUG_LEVEL`   |

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
