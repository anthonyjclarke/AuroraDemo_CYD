# Changelog

All notable changes to **Aurora Demo — ESP32 CYD Edition** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [0.5.1] — 2026-04-08

### Added
- GitHub repository published at `anthonyjclarke/AuroraDemo_CYD`

### Changed
- **Pattern name overlay** now uses a custom bitmap renderer on the TFT instead of TFT_eSPI text APIs
- **Touch handling** now advances patterns on raw-pressure edge detection with lower latency
- **Pattern transitions** now clear the TFT and Aurora framebuffer before the next animation starts, avoiding residual pixels between effects
- **PatternInvaders** variants now tile across the full 160×120 canvas instead of older small-canvas limits
- **PatternMultipleStream** now calls `ShowFrame()` and seeds motion across the full canvas
- **PatternCube** now uses a full-range sinusoid for `zCamera` after the old `beatsin8()` overflow broke projection
- **PatternSpin** now uses bounded arc sampling and no longer hangs after a few seconds
- Long overlay labels now split across two lines, including camel-case names such as `ElectricMandala`

---

## [0.5.0] — 2026-03-14

### Changed
- **PatternInvadersMedium** — scaled to fill the 160×120 canvas:
  - Each invader pixel block: 2×2 → 4×4 px
  - Each invader: 10×10 → 20×20 px with a 2 px gap between invaders
  - Grid: 3×3 invaders (original 32×32) → 7 columns × 5 rows (160×120)
- **PatternCube** — scaled projection parameters for the larger canvas:
  - `focal`: 30 → 90 (3× increase, maintains visual scale)
  - `cubeWidth`: 28 → 90 (3× increase)
  - `Ox`, `Oy`: hardcoded `15.5` → `MATRIX_CENTER_X` / `MATRIX_CENTER_Y` (canvas-agnostic)
  - `zCamera` animated range: 100–140 → 280–380 (keeps all vertices in front of camera; minimum safe value is `cubeWidth × √3 ≈ 156`)

### Added
- Version constants in `src/main.cpp`: `VERSION_MAJOR`, `VERSION_MINOR`, `VERSION_PATCH`, `VERSION_STRING`
- Version printed to Serial on boot

---

## [0.4.0] — 2026-03-14

### Added
- **Touch support** — tap anywhere on the CYD screen to advance to the next pattern immediately
  - XPT2046 resistive touch controller enabled via `TOUCH_CS=33` build flag
  - Leading-edge raw-pressure detection with a 250 ms debounce prevents accidental repeat triggers
  - Calibration constants provided for CYD landscape orientation (user-replaceable)
- **Pattern name overlay** — at each pattern transition (including startup):
  - Screen clears to black
  - Effect name rendered via a custom bitmap font for 1.0 s
  - Screen cleared again before animation begins
- **`lib/debug.h`** — levelled debug logging system (reusable across projects):
  - Levels: 0=Off, 1=Error, 2=Warn, 3=Info, 4=Verbose
  - Macros: `DBG_ERROR`, `DBG_WARN`, `DBG_INFO`, `DBG_VERBOSE`
  - Compile-time default via `-DDEBUG_LEVEL=N` in `platformio.ini`
  - Runtime-adjustable via `debugLevel` variable
  - All format strings auto-appended with `\n`

### Changed
- FPS reporting reduced from once-per-second to **once per pattern transition** (average fps over the full pattern duration)
- All `Serial.print` calls in `src/main.cpp` replaced with `DBG_INFO` / `DBG_VERBOSE` macros
- `nextPattern()` extracted as a named function encapsulating stop/advance/show-name/start
- Heap free memory logged at boot after `Effects::Setup()` to confirm allocation succeeded
- `src/main.cpp` timing variables simplified: removed `fps_timer`, replaced with per-pattern `frame_count` accumulator
- **PatternSwirl** and **PatternCube** — `blur2d()` calls replaced with `effects.DimAll()`:
  - `blur2d(leds, w, h, amount)` asserts in newer FastLED versions with *"the user didn't provide an XY Function"* when called without an `XYMap`
  - `DimAll()` provides the same lossy-fade visual effect unconditionally

---

## [0.3.0] — 2026-03-14

### Added
- All 12 previously disabled patterns now enabled (total: 29 active patterns)
  - Patterns re-enabled: `PatternNoiseSmearing`, `PatternIncrementalDrift2`, `PatternSpin`, `PatternBounce`, `PatternInvaders` (Small/Medium/Large), `PatternCube`, `PatternFire`, `PatternPulse`, `PatternSpark`, `PatternRadar`
- `Effects::drawCircle()` — Bresenham circle rasteriser into the CRGB framebuffer
- `Effects::fillRect()` — axis-aligned filled rectangle into the CRGB framebuffer
- `Effects::MoveFractionalNoiseX()` / `MoveFractionalNoiseY()` — sub-pixel noise-smear scrolling (required by Fire, Spark, Pulse, NoiseSmearing patterns)
- `Effects::standardNoiseSmearing()` — convenience wrapper combining noise update + fractional move (used by PatternPulse)
- `PatternNoiseSmearing.h` include path added to `platformio.ini` via `-I lib` (file lives outside a library subdirectory)

### Fixed
- **PatternInvaders** — replaced `matrix.fillScreen(0)` with `effects.ClearFrame()` and `matrix.fillRect()` with `effects.fillRect()`
- **PatternCube** — added `#include "Geometry.h"` (provides `Vertex`, `Point`, `EdgePoint`, `squareFace`); replaced `matrix.drawLine()` with `effects.BresenhamLine()`
- **PatternPulse** — replaced `matrix.drawCircle()` with `effects.drawCircle()`
- **PatternRadar** — missing `#define PatternRadar_H` guard added
- **PatternSpin** — missing `#define PatternSpin_H` guard added; local variable `float radians` renamed to `rads` to stop it shadowing the `radians()` function
- **PatternBounce** — missing `#define PatternBounce_H` guard added
- `Patterns.h` `PATTERN_COUNT`: 17 → 29; `PatternNoiseSmearing` class name corrected to `PatternMultipleStream`

---

## [0.2.0] — 2026-03-14

### Added
- Heap allocation for all large buffers in `Effects::Setup()`:
  - `CRGB *leds` — `MATRIX_WIDTH × MATRIX_HEIGHT × 3` bytes
  - `byte *heat` — `NUM_LEDS` bytes
  - `uint8_t (*noise)[MATRIX_HEIGHT]` — `MATRIX_WIDTH × MATRIX_HEIGHT` bytes
  - Total ~96 KB moved from BSS to heap, eliminating `dram0_0_seg` linker overflow

### Changed
- Canvas upgraded from **80×60** (4× scale) to **160×120** (2× scale):
  - `MATRIX_WIDTH=160 -DMATRIX_HEIGHT=120` in `platformio.ini`
  - `ShowFrame()` scales each Aurora pixel to a 2×2 block on the 320×240 display (one `pushImage()` call per physical scanline, two scanlines per Aurora row)
  - Full 320×240 display area now used at 160×120 virtual resolution
- `ClearFrame()` fixed for heap pointer: `sizeof(leds)` → `NUM_LEDS * sizeof(CRGB)`

---

## [0.1.0] — 2026-03-14

### Added
- Initial port of Aurora effects engine to the **ESP32 CYD** (ILI9341 320×240 TFT)
- Single PlatformIO environment `esp32-cyd` (`esp32dev` board)
- Display via `TFT_eSPI` — `ShowFrame()` replaces the HUB75 DMA output path
- 17 active patterns ported and compiling from the original Aurora library
- `lib/Aurora/` library directory structure — PlatformIO LDF auto-discovery
- TFT_eSPI inline pin config via `build_flags` (no `User_Setup.h` needed):
  - MOSI=13, SCLK=14, CS=15, DC=2, RST=–1, BL=21, TouchCS=33
- Millis-based pattern rotation (20 s per effect, no `delay()` in main loop)
- Serial output at 115200 baud: pattern list on boot, pattern name on each transition
- `src/main.cpp` header documenting origin chain: Jason Coon → mrfaptastic → Anthony Clarke

### Removed
- All HUB75 DMA driver code and conditional compilation (`#ifdef CYD_DISPLAY` / `#ifndef`)
- `mrfaptastic/ESP32 HUB75 LED MATRIX PANEL DMA Display` library dependency
- `adafruit/Adafruit GFX Library` dependency (was HUB75-only)
- `matrix.*` API calls throughout pattern files (replaced with `effects.*` equivalents)

### Fixed
- `Drawable.h` default `drawFrame()`: `matrix.fillScreen(0)` → `effects.ClearFrame()`
- `PatternMaze.h` `start()`: `matrix.fillScreen(0)` → `effects.ClearFrame()`
- `PatternTest.h`: replaced `matrix.fillScreen(matrix.color565(...))` with effects-based fill

---

## To Do

### Patterns & Visuals
- [ ] PatternLife: cells may be too small at 1×1 px — scale to 2×2 or 3×3 blocks
- [ ] PatternMaze: walls at 1 px — consider 2 px lines for visibility
- [ ] PatternSnake: scale snake thickness to match canvas size
- [ ] Add palette cycling on touch long-press (hold >1 s = next palette, tap = next pattern)

### Hardware & UX
- [ ] Touch calibration helper — Serial command to run calibration and print `touchCal[5]` values for the specific unit
- [ ] Optional IR remote or physical button for pattern advance
- [ ] Brightness control (touch swipe up/down or potentiometer on ADC pin)

### Code Quality
- [ ] Move `VERSION_STRING` into its own `lib/version.h` so patterns/effects can reference it
- [ ] Add `PatternSpiral` and `PatternInfinity` size review for 160×120
- [ ] Replace blocking `delay()` in `showPatternName()` with a non-blocking state machine so touch remains responsive during the name overlay

### Infrastructure
- [ ] OTA firmware update support (WiFi + ArduinoOTA or ESPAsyncWebServer)
- [ ] SPIFFS/LittleFS config file — persist last pattern index, palette, brightness across reboots
- [ ] Web UI for runtime control of pattern, palette, debug level
- [ ] GitHub Actions CI — `pio run` build check on push

---

*Origins: Jason Coon / PixelMatix Aurora (2014) → mrfaptastic ESP32-HUB75 port → Anthony Clarke CYD port (2024)*
