# Aurora Demo — Claude Code Context

Repository: <https://github.com/anthonyjclarke/AuroraDemo_CYD>

## Project Overview

ESP32-based visual effects demo running 29 procedurally-animated patterns on the **Cheap Yellow Display (CYD)** family. Two board variants are supported, each with its own PlatformIO environment:

| Env               | Board     | Driver  | Display   | Canvas  | Scale |
|:------------------|:----------|:--------|:----------|:--------|:------|
| `esp32-cyd-28`    | CYD 2.8"  | ILI9341 | 320×240   | 160×120 | 2×    |
| `esp32-cyd-35`    | CYD 3.5"  | ST7796  | 480×320   | 240×160 | 2×    |

- **Version**: 0.6.0 (`VERSION_STRING` in `src/main.cpp`)
- **Active patterns**: 29, rotate every 20 s (or on touch)
- **Origins**: Jason Coon / PixelMatix Aurora (2014) → mrfaptastic ESP32-HUB75 port → Anthony Clarke CYD port (2026)

The repository contains **two parallel targets**:
- **ESP32 CYD firmware** — PlatformIO project (root of repo)
- **Browser demo** — standalone static web app in `web/`, 27 patterns, no build step required

---

## Hardware

- **MCU**: ESP32 (`esp32dev` board in PlatformIO)
- **Display**: ILI9341 (CYD 2.8") or ST7796 (CYD 3.5"), driven by `TFT_eSPI`
- **Touch**: XPT2046 resistive controller, shares SPI bus
- **GPIO pins are identical on both board variants**

### Pin Mapping

| Signal     | GPIO | Signal        | GPIO    |
|:-----------|:-----|:--------------|:--------|
| TFT MOSI   | 13   | TFT SCLK      | 14      |
| TFT CS     | 15   | TFT DC        | 2       |
| TFT RST    | —    | Backlight     | 21      |
| TFT MISO   | 12   | Touch CS      | 33      |
| SPI main   | 55 MHz | SPI touch   | 2.5 MHz |

Touch calibration (landscape, rotation 1) is set per board via `#if defined(BOARD_CYD_35)` in `main.cpp`. CYD 3.5" values are placeholders — run the TFT_eSPI calibration example on the physical unit and replace them.

- CYD 2.8": `{ 339, 3470, 237, 3580, 7 }`
- CYD 3.5": `{ 300, 3600, 200, 3700, 7 }` (PLACEHOLDER — recalibrate)

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
       └─ effects.ShowFrame() build RGB565 scanlines → tft.pushImage() × 2 per row
```

`ShowFrame()` scales each 160×1 Aurora scanline to two 320×1 TFT rows.
`XY(x, y)` returns `(y * MATRIX_WIDTH) + x + 1` — offset by 1 so index 0 safely absorbs out-of-bounds writes (never displayed).

### Key Constants

```cpp
MATRIX_WIDTH    = 160    MATRIX_HEIGHT    = 120
MATRIX_CENTER_X = 80     MATRIX_CENTER_Y  = 60
MATRIX_CENTRE_X = 79     MATRIX_CENTRE_Y  = 59   // byte (off-by-one variants)
NUM_LEDS        = 19201                           // (160 × 120) + 1
```

### Heap-Allocated Buffers (initialised in `Effects::Setup()`)

| Buffer                  | CYD 2.8" (160×120) | CYD 3.5" (240×160) | Why heap, not BSS               |
|:------------------------|:-------------------|:-------------------|:--------------------------------|
| `CRGB *leds`            | ~57.6 KB           | ~115 KB            | Prevents `dram0_0_seg` overflow |
| `byte *heat`            | ~18.8 KB           | ~38.4 KB           | Same reason                     |
| `uint8_t (*noise)[H]`   | ~18.8 KB           | ~38.4 KB           | Same reason                     |
| **Total**               | **~95 KB**         | **~192 KB**        | ESP32 SRAM: 320 KB              |

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
| 11 | PatternWave                | Wave               | Travelling waves, 4 rotation modes               |
| 12 | PatternAttract             | Attract            | Boids orbiting gravity attractor                  |
| 13 | PatternSwirl               | Swirl              | `DimAll` blur + sine wave modulation              |
| 14 | PatternBounce              | Bounce             | Gravity-bouncing particle system                  |
| 15 | PatternFlock               | Flock              | Craig Reynolds boid flocking                      |
| 16 | PatternInfinity            | Infinity           | Lissajous figure-8 curves                        |
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
static const unsigned int  NAME_HOLD_MS = 1000;  // pattern name overlay hold
static const unsigned long TOUCH_DEBOUNCE_MS = 250; // touch repeat guard
static const uint16_t TOUCH_Z_THRESHOLD = 350;   // pressure threshold to detect press
static const uint16_t TOUCH_RELEASE_Z   = 120;   // hysteresis threshold for release
unsigned int        default_fps         = 30;    // fallback frame rate
```

Patterns return delay-ms from `drawFrame()` (0 = uncapped, uses `default_fps`). The main render loop uses `millis()` — non-blocking. Exception: `showPatternName()` uses a blocking `delay(NAME_HOLD_MS)` during pattern transitions.

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
effects.loadPalette(n);     // 0=Rainbow 1=Ocean 2=Cloud 3=Forest 4=Party
                            // 5=Grey 6=Heat 7=Lava 8=Ice 9=Random
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

- **Any tap** → immediate advance to next pattern (same path as 20 s timer)
- Leading-edge pressure detection: fires on `rawZ > TOUCH_Z_THRESHOLD` (350) when `prev_touched` is false
- Release detected via hysteresis: `rawZ < TOUCH_RELEASE_Z` (120) resets `prev_touched`
- 250 ms debounce (`TOUCH_DEBOUNCE_MS`) prevents rapid re-firing
- `in_pattern_transition` flag blocks touch during transitions
- Touch CS GPIO 33 enabled via `-DTOUCH_CS=33` build flag
- Calibration: `static uint16_t touchCal[5] = { 339, 3470, 237, 3580, 7 }` in `main.cpp`

---

## Pattern Transition Sequence

```
patterns.stop()                    // stop current pattern
effects.ClearFrame()
effects.ShowFrame()                // flush black frame
patterns.moveRandom(1)             // advance shuffled index; internally stops old
                                   // item again and starts the new one
showPatternName(name)              // ClearFrame → fillScreen(BLACK) → draw bitmap
                                   // text → delay(1000) → ClearFrame → fillScreen(BLACK)
effects.ClearFrame()
patterns.start()                   // second start() call on the new pattern (redundant
                                   // but harmless — matches structure of moveRandom)
```

---

## Serial Output (115200 baud)

```
[INFO] === Aurora Demo v0.6.0 — CYD 2.8" (ILI9341 320x240) ===
[INFO] Heap after effects.Setup(): 241532 bytes free
[INFO] Patterns loaded:
{
  "count": 29,
  "results": [
    "0: Spiro",
    ...
  ]
}
[INFO] [start] Plasma
[INFO] [done] Plasma              avg fps: 28
[INFO] [next] Cube
```

Note: `listPatterns()` writes directly via `Serial.println()` (no `[INFO]` prefix on the JSON block).

FPS is reported **once per transition** (average over the full pattern duration) — not every second.

---

## Browser Demo (`web/`)

A separate static web app that mirrors the Aurora animations for desktop/mobile browsers. It is **not** served by the ESP32 and does not affect the firmware.

- **Runtime**: plain JavaScript, no build step, no dependencies
- **Canvas**: 64×64 virtual grid rendered on an HTML5 `<canvas>`
- **Patterns**: 27 (the three `Invaders` variants are merged into one; all others match the firmware)
- **Palettes**: Solar, Ocean, Forest, Lava, Ice, Neon
- **Controls**: pattern selector, palette selector, previous/next, shuffle, autoplay toggle, duration slider, live FPS display
- **Run**: open `web/index.html` in a browser, or `cd web && python3 -m http.server` → `http://localhost:8000`

The JS pattern implementations are loosely analogous to the C++ originals but are independent re-implementations — they share no code with the firmware.

---

## Key Implementation Notes

- **`PatternTest`** is declared in `Patterns.h` and `PatternTest.h` is included, but `patternTest` is **not** in `items[]` — it never appears in the rotation.
- **`PatternLife::world`** is heap-allocated (`new Cell[MATRIX_WIDTH][MATRIX_HEIGHT]`) in `start()` / freed in `stop()` to avoid BSS overflow at larger canvas sizes. Other patterns with canvas-sized arrays should follow the same pattern.
- **`PatternMaze::Directions`** uses `enum Directions : uint8_t` so the `grid[width][height]` member stays at 1 byte/cell instead of 4, preventing BSS overflow at 240×160.
- **No HUB75 code** — entirely removed. No `matrix` object, no `#ifdef CYD_DISPLAY` guards.
- **`blur2d()` not used** — the FastLED v3.4+ flat-pointer overload asserts without an `XYMap`. PatternSwirl and PatternCube use `effects.DimAll()` instead (same visual result).
- **All pattern headers** use `#ifndef PatternFoo_H` / `#define PatternFoo_H` guards.
- **`noise_x`, `noise_y`, `noise_z`, `noise_scale_x`, `noise_scale_y`, `noisesmoothing`** are file-scope globals in `Effects.h` — accessed directly (without `effects.`) by noise-smearing patterns.
- **`tft` global** declared in `main.cpp` before `#include "Effects.h"` — this ordering is mandatory.
- **Pattern scaling**: Invaders Small, Medium, and Large all tile dynamically across the 160×120 canvas; PatternCube uses `focal=90`, `cubeWidth=90`, and a sinusoidal `zCamera` range of 280–380 (must exceed `cubeWidth × √3 ≈ 156`).
- **PatternMultipleStream** now seeds motion across the full canvas and explicitly calls `effects.ShowFrame()` each pass.
- **PatternSpin** uses bounded arc sampling rather than an unbounded coordinate-matching loop, which prevents the old runtime hang.
