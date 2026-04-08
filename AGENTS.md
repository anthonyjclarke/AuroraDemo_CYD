# Aurora Demo — Codex Context

Repository: <https://github.com/anthonyjclarke/AuroraDemo_CYD>

## Project Overview

ESP32-based visual effects demo running 29 procedurally-animated patterns on the **Cheap Yellow Display (CYD)** family. Two board variants are supported, each with its own PlatformIO environment:

| Env               | Board ID           | Driver  | Display | Canvas  | Scale | Heap buffers |
|:------------------|:-------------------|:--------|:--------|:--------|:------|:-------------|
| `esp32-cyd-28`    | ESP32-2432S028R    | ILI9341 | 320×240 | 160×120 | 2×    | ~96 KB       |
| `esp32-cyd-40`    | ESP32-32E          | ST7796S | 480×320 | 120×80  | 4×    | ~48 KB       |

- **Version**: 0.6.0 (`VERSION_STRING` in `src/main.cpp`)
- **Active patterns**: 29, rotate every 20 s (or on touch)
- **Origins**: Jason Coon / PixelMatix Aurora (2014) → mrfaptastic ESP32-HUB75 port → Anthony Clarke CYD port (2026)

The repository contains **two parallel targets**:
- **ESP32 CYD firmware** — PlatformIO project (root of repo)
- **Browser demo** — standalone static web app in `web/`, 27 patterns, no build step required

---

## Hardware

- **MCU**: ESP32 (`esp32dev` board in PlatformIO) — both boards
- **Display**: ILI9341 (CYD 2.8") or ST7796S (CYD 4.0"), driven by `TFT_eSPI`
- **Touch**: XPT2046 resistive controller, shares SPI bus on both boards

### Pin Mapping

Most pins are identical across both boards. The backlight GPIO and SPI frequency differ.

| Signal     | GPIO | Note                              |
|:-----------|:-----|:----------------------------------|
| TFT MOSI   | 13   | Both boards                       |
| TFT SCLK   | 14   | Both boards                       |
| TFT CS     | 15   | Both boards                       |
| TFT DC     | 2    | Both boards                       |
| TFT MISO   | 12   | Both boards                       |
| TFT RST    | —    | Not connected on either board     |
| Touch CS   | 33   | Both boards                       |
| Backlight  | 21   | CYD 2.8" only (`BOARD_CYD_28`)    |
| Backlight  | 27   | CYD 4.0" only (`BOARD_CYD_40`)    |
| SPI freq   | 55 MHz | CYD 2.8" (`-DSPI_FREQUENCY`)   |
| SPI freq   | 27 MHz | CYD 4.0" (`-DSPI_FREQUENCY`)   |

Touch calibration (landscape, rotation 1) is set per board via `#if defined(BOARD_CYD_40)` in `main.cpp`. The 4.0" values are placeholders — run the TFT_eSPI calibration example on the physical unit and replace them.

- CYD 2.8": `{ 339, 3470, 237, 3580, 7 }`
- CYD 4.0": `{ 300, 3600, 200, 3700, 7 }` (PLACEHOLDER — recalibrate)

---

## Libraries

| Library                | Version   | Purpose                                  |
|:-----------------------|:----------|:-----------------------------------------|
| `bodmer/TFT_eSPI`      | `^2.5.43` | ILI9341/ST7796 display driver + touch    |
| `fastled/FastLED`      | `^3.4.0`  | Color maths, palettes, noise             |

TFT_eSPI is configured entirely via `build_flags` — no `User_Setup.h` file needed.

---

## Project Structure

```
src/
  main.cpp              Entry point: setup, loop, touch, pattern transitions

lib/
  debug.h               Levelled logging macros (reusable, not Aurora-specific)

  Aurora/
    Effects.h           Core engine: framebuffer, ShowFrame, palettes, noise (~900 lines)
    Drawable.h          Abstract base class for all patterns
    Playlist.h          Sequencer interface
    Patterns.h          Instantiates & sequences all 29 active patterns
    Vector.h            2D vector math  (PVector = Vector2<float>)
    Boid.h              Craig Reynolds flocking entity
    Attractor.h         Gravitational attractor for boid physics
    Geometry.h          3D structs: Vertex, Point, EdgePoint, squareFace, triFace
    PatternXxx.h        One file per pattern (29 active)

web/                    Browser demo (separate target, not served by the ESP32)
  index.html            Entry point
  app.js                Canvas renderer + 27 pattern implementations (plain JS)
  styles.css            UI styling
  README.md             Run instructions for the browser demo
```

All pattern files are **header-only** (inline implementations, no `.cpp` files).

---

## Canvas & Rendering Pipeline

```
effects.ClearFrame()          zero leds[] (memset)
  └─ pattern.drawFrame()      write CRGB values to effects.leds[XY(x, y)]
       └─ effects.ShowFrame() build RGB565 scanlines → tft.pushImage() × DISPLAY_SCALE per row
```

`ShowFrame()` scales each virtual scanline to `DISPLAY_SCALE` physical TFT rows using the `DISPLAY_SCALE` build flag (2 on the 2.8" board, 4 on the 4.0" board). The code path is identical; only the multiplier differs.

`XY(x, y)` returns `(y * MATRIX_WIDTH) + x + 1` — offset by 1 so index 0 safely absorbs out-of-bounds writes (never displayed).

### Key Constants (per-board — set via platformio.ini build flags)

| Constant          | CYD 2.8"  | CYD 4.0"  |
|:------------------|:----------|:----------|
| `MATRIX_WIDTH`    | 160       | 120       |
| `MATRIX_HEIGHT`   | 120       | 80        |
| `MATRIX_CENTER_X` | 80        | 60        |
| `MATRIX_CENTER_Y` | 60        | 40        |
| `MATRIX_CENTRE_X` | 79        | 59        |
| `MATRIX_CENTRE_Y` | 59        | 39        |
| `DISPLAY_SCALE`   | 2         | 4         |
| `NUM_LEDS`        | 19201     | 9601      |

### Heap-Allocated Buffers (initialised in `Effects::Setup()`)

| Buffer                  | CYD 2.8" (160×120) | CYD 4.0" (120×80) | Why heap, not BSS               |
|:------------------------|:-------------------|:------------------|:--------------------------------|
| `CRGB *leds`            | ~57.6 KB           | ~28.8 KB          | Prevents `dram0_0_seg` overflow |
| `byte *heat`            | ~18.8 KB           | ~9.6 KB           | Same reason                     |
| `uint8_t (*noise)[H]`   | ~18.8 KB           | ~9.6 KB           | Same reason                     |
| **Total**               | **~95 KB**         | **~48 KB**        | Free heap before: ~327 KB       |

---

## Active Patterns (29)

| # | Class                       | Display Name       | Algorithm                                         |
|:--|:----------------------------|:-------------------|:--------------------------------------------------|
|  1 | PatternSpiro               | Spiro              | Spirograph parametric equations                   |
|  2 | PatternLife                | Life               | Conway's Game of Life                             |
|  3 | PatternFlowField           | FlowField          | Boids following Perlin noise vector field         |
|  4 | PatternPendulumWave        | PendulumWave       | `beatsin8`-driven pendulum wave                   |
|  5 | PatternIncrementalDrift    | IncrementalDrift   | Nested oscillating circles                        |
|  6 | PatternIncrementalDrift2   | IncrementalDrift2  | Oscillating circles variant                       |
|  7 | PatternMunch               | Munch              | Bitwise XOR/AND coordinate patterns               |
|  8 | PatternElectricMandala     | ElectricMandala    | Perlin noise + 4-fold caleidoscope symmetry       |
|  9 | PatternSpin                | Spin               | Accelerating/decelerating circular particle       |
| 10 | PatternSimplexNoise        | SimplexNoise       | Direct Perlin noise → colour mapping              |
| 11 | PatternWave                | Wave               | Travelling waves, 4 rotation modes                |
| 12 | PatternAttract             | Attract            | Boids orbiting gravity attractor                  |
| 13 | PatternSwirl               | Swirl              | `DimAll` blur + sine wave modulation              |
| 14 | PatternBounce              | Bounce             | Gravity-bouncing particle system                  |
| 15 | PatternFlock               | Flock              | Craig Reynolds boid flocking                      |
| 16 | PatternInfinity            | Infinity           | Lissajous figure-8 curves                         |
| 17 | PatternPlasma              | Plasma             | Sine wave interference                            |
| 18 | PatternInvadersSmall       | Invaders Small     | Space Invader sprites, 1×1 px cells               |
| 19 | PatternInvadersMedium      | Invaders Medium    | Space Invader sprites, tiled 4×4 px cells         |
| 20 | PatternInvadersLarge       | Invaders Large     | Space Invader sprites, tiled large cells          |
| 21 | PatternSnake               | Snake              | Snake-game animation                              |
| 22 | PatternCube                | Cube               | 3D wireframe cube (perspective projection)        |
| 23 | PatternFire                | Fire               | Fire simulation via fractional noise scroll       |
| 24 | PatternMaze                | Maze               | Growing-tree procedural maze                      |
| 25 | PatternPulse               | Pulse              | Expanding circle pulses with noise smearing       |
| 26 | PatternSpark               | Spark              | Spark/firework particles + noise smearing         |
| 27 | PatternSpiral              | Spiral             | Rotating spiral geometry                          |
| 28 | PatternRadar               | Radar              | Radar sweep animation                             |
| 29 | PatternMultipleStream      | MultipleStream     | Noise-smeared multi-stream pixel movement         |

---

## Timing & Configuration

```cpp
const unsigned long PATTERN_DURATION_MS = 20000; // 20 s per effect
const unsigned int  NAME_HOLD_MS        = 1000;  // pattern name overlay hold
const unsigned long TOUCH_DEBOUNCE_MS   = 250;   // touch repeat guard
unsigned int        default_fps         = 30;    // fallback frame rate
```

Patterns return delay-ms from `drawFrame()` (0 = uncapped, uses `default_fps`). Main loop uses `millis()` — no blocking `delay()` in the render path.

---

## Global Singletons

```cpp
TFT_eSPI  tft;       // declared in main.cpp BEFORE Effects.h is included
Effects   effects;   // framebuffer, palettes, noise, geometry
Patterns  patterns;  // 29-pattern sequencer with Fisher-Yates shuffle
```

`tft` must be declared before `Effects.h` because `ShowFrame()` references it directly.

There is **no** `matrix` or HUB75 object — all display output goes through `tft`.

---

## Effects API — Commonly Used Methods

```cpp
// Pixel writing
effects.leds[XY(x, y)]  = CRGB(r, g, b);         // direct write
effects.Pixel(x, y, colorIndex);                   // palette-indexed write
effects.drawBackgroundFastLEDPixelCRGB(x, y, c);   // alias for leds[XY()] =

// Buffer control
effects.ClearFrame();                              // zero leds[]
effects.ShowFrame();                               // push to TFT (blocks ~4 ms)
effects.DimAll(value);                             // scale brightness 0–255

// Geometry
effects.BresenhamLine(x0, y0, x1, y1, color);     // line (CRGB or palette index)
effects.drawCircle(cx, cy, r, color);              // circle outline
effects.fillRect(x0, y0, x1, y1, color);          // filled rectangle

// Palette
effects.ColorFromCurrentPalette(index);            // lookup with optional brightness
effects.loadPalette(0–9);                          // 0=Rainbow … 8=Ice, 9=Random
effects.CyclePalette();                            // advance by 1

// Noise
effects.FillNoise();                               // regenerate noise[][] map
effects.MoveFractionalNoiseX(delta);               // sub-pixel horizontal shift
effects.MoveFractionalNoiseY(delta);               // sub-pixel vertical shift
effects.standardNoiseSmearing();                   // advance noise + shift both axes

// Symmetry & stream trails
effects.Caleidoscope1();                           // 4-fold rotational symmetry
effects.SpiralStream(cx, cy, r, dimm);             // spiral decay trail

// Oscillators (updated each frame by some patterns)
effects.MoveOscillators();                         // advance 6 internal oscillators
effects.osci[n]                                    // raw ramp 0–255
effects.p[n]                                       // sin8-mapped to 0…MATRIX_WIDTH-1
```

---

## Adding a New Pattern

1. Create `lib/Aurora/PatternFoo.h` — include guard `PatternFoo_H`, class `PatternFoo : public Drawable`
2. Implement `unsigned int drawFrame()` — write to `effects.leds[]`, call `effects.ShowFrame()`, return delay ms
3. Optionally override `void start()` / `void stop()` for init/teardown
4. In `lib/Aurora/Patterns.h`:
   - Add `#include "PatternFoo.h"` with other includes
   - Declare `PatternFoo foo;` in the `private:` section
   - Add `&foo,` to `items[]`
   - Increment `PATTERN_COUNT`

---

## Debug System (`lib/debug.h`)

Five-level logging; compile-time default set via `-DDEBUG_LEVEL=N` in `platformio.ini`.

| Macro           | Level | Prefix   | Use for                    |
|:----------------|:------|:---------|:---------------------------|
| `DBG_ERROR(…)`  | 1     | `[ERR ]` | Critical failures          |
| `DBG_WARN(…)`   | 2     | `[WARN]` | Non-fatal anomalies        |
| `DBG_INFO(…)`   | 3     | `[INFO]` | Boot messages, transitions |
| `DBG_VERBOSE(…)`| 4     | `[VERB]` | Per-frame / frequent       |

All macros accept `printf`-style format strings and append `\n` automatically.
`debugLevel` is a runtime `uint8_t` — can be changed without recompile.

---

## Touch Interaction

- Any tap advances to the next pattern immediately
- Raw-pressure edge detection uses `TOUCH_Z_THRESHOLD` and `TOUCH_RELEASE_Z`
- Release detected via hysteresis: `rawZ < TOUCH_RELEASE_Z` (120) resets `prev_touched`
- 250 ms debounce (`TOUCH_DEBOUNCE_MS`) prevents rapid re-firing
- `in_pattern_transition` flag blocks touch during transitions
- Touch CS GPIO 33 enabled via `-DTOUCH_CS=33` build flag (both boards)
- Calibration is board-conditional in `main.cpp`:
  - `BOARD_CYD_28`: `{ 339, 3470, 237, 3580, 7 }`
  - `BOARD_CYD_40`: `{ 300, 3600, 200, 3700, 7 }` — PLACEHOLDER, recalibrate with TFT_eSPI calibration sketch

---

## Pattern Transition Sequence

```cpp
patterns.stop()
effects.ClearFrame()
effects.ShowFrame()          // flush black frame so old pattern does not bleed through
patterns.moveRandom(1)       // Fisher-Yates shuffled advance
showPatternName(name)        // black screen + bitmap text overlay, 1.0 s
tft.fillScreen(TFT_BLACK)    // clear before animation starts
patterns.start()             // second start() call on the new pattern (required)
```

---

## Serial Output (115200 baud)

Boot message is board-identified. Examples:

```text
[INFO] === Aurora Demo v0.6.0 — CYD 2.8" (ILI9341 320x240) ===
[INFO] === Aurora Demo v0.6.0 — CYD 4.0" (ST7796S 480x320) ===
```

```text
[INFO] Heap before effects.Setup(): 327100 bytes free, PSRAM: 0 bytes free
[INFO] Heap after effects.Setup(): 241532 bytes free, PSRAM: 0 bytes free
[INFO] Patterns loaded:
{
  "count": 29,
  "results": [ ... ]
}
[INFO] [start] Plasma
[INFO] [done] Plasma              avg fps: 28
[INFO] [next] Cube
```

FPS is reported once per transition, not every second.

---

## Key Implementation Notes

- No HUB75 code remains in the project.
- `blur2d()` is not used; `effects.DimAll()` replaces it in the affected patterns.
- All pattern headers use classic `#ifndef PatternFoo_H` guards.
- `noise_x`, `noise_y`, `noise_z`, `noise_scale_x`, `noise_scale_y`, and `noisesmoothing` are file-scope globals in `Effects.h`.
- `tft` is declared in `main.cpp` before `Effects.h`; that ordering is required.
- PatternCube uses `focal=90`, `cubeWidth=90`, and `zCamera` in the 280–380 range.
- PatternMultipleStream seeds across the full active canvas and explicitly calls `effects.ShowFrame()`.
- PatternSpin uses bounded arc sampling, avoiding the old runtime hang.
