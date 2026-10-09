# Aurora Demo — Codex Context

Repository: <https://github.com/anthonyjclarke/AuroraDemo_CYD>

## Project

Port of the Aurora effects engine (Jason Coon / PixelMatix → mrfaptastic HUB75
port) to the CYD family: 29 header-only patterns in `lib/Aurora/` rotate every
20 s or on a tap. No WiFi, no settings, no NVS, no OTA, no filesystem. Version
is `FIRMWARE_VERSION` in `include/config.h` (0.8.0-dev on `dev`). `web/` is an
independent browser demo in plain JS – it shares no code with the firmware and
is not served by the ESP32 or published by CI.

## Hardware

| Env            | Board           | Driver  | Display | Canvas  | Scale | Backlight | SPI    |
|:---------------|:----------------|:--------|:--------|:--------|:------|:----------|:-------|
| `esp32-cyd-28` | ESP32-2432S028R | ILI9341 | 320×240 | 160×120 | 2×    | GPIO 21   | 55 MHz |
| `esp32-cyd-40` | ESP32-32E       | ST7796S | 480×320 | 120×80  | 4×    | GPIO 27   | 27 MHz |

- Board is selected by `-DBOARD_CYD_28` / `-DBOARD_CYD_40`; canvas size and
  `DISPLAY_SCALE` are build flags, not code constants.
- `TFT_MISO=12` is set; the 4.0″ needs `TFT_RGB_ORDER=TFT_BGR`.
- Neither board has PSRAM. Canvas buffers are ~96 KB (2.8″) and ~48 KB
  (4.0″) of heap; a bigger canvas must still fit after `Effects::Setup()`.
- Wrong image on the wrong board: the 4.0″ build on a 2.8″ stays dark
  (backlight pin), it doesn't brick.

## Libraries

- `TFT_eSPI` is configured entirely by `build_flags` – no `User_Setup.h`.
- `fastled/FastLED@3.10.3` is pinned: 3.10.6 makes `memset(leds, …)` in
  `Effects.h` ambiguous with `fl::memset` (ADL). Test before unpinning.
- `blur2d()` is not used – FastLED's flat-pointer overload asserts without an
  `XYMap`. Swirl and Cube use `effects.DimAll()` instead.

## Web installer and releases

- Release images come only from CI on a `v*` tag on `main` – never publish a local build.
- Never put `firmware-merged.bin` in a manifest; it fills NVS with `0xFF`.
- `PROJECT_NAME` and `partitions_custom.csv` are frozen once released.
- No WiFi, so no Improv: the installer always offers Install. If WiFi is ever added, copy Improv in from `cyd-web-installer/copy-in`, never from `lib_deps`.
- `espressif32@6.12.0` is pinned (arduino-esp32 2.0.17); unpinned resolves to pioarduino 3.x.
- Before the next release, clear *Tests owed* in docs/WEB_INSTALLER.md (RUNBOOK 5b).

## Architecture rules

- `TFT_eSPI tft` must be declared in `main.cpp` **before** `#include "Effects.h"`
  – `ShowFrame()` uses it directly. There is no HUB75 `matrix` object.
- `leds[]`, `heat[]` and `noise[][]` are allocated at runtime in
  `Effects::Setup()` (`ps_calloc()` if PSRAM, else `new[]`). Never make them
  static arrays – BSS overflows.
- `XY(x, y)` returns `y * MATRIX_WIDTH + x + 1`: index 0 is a sink for
  out-of-bounds writes and is never displayed. Keep the `+ 1`.
- `PatternLife::world` is allocated in `start()` and freed in `stop()`;
  `PatternMaze::Directions` is `enum : uint8_t`. Both avoid BSS overflow.
- `noise_x/y/z`, `noise_scale_x/y` and `noisesmoothing` are file-scope globals
  in `Effects.h`, used without `effects.` by the noise-smearing patterns.
- Adding a pattern: include it in `Patterns.h`, declare the member, add it to
  `items[]` **and** bump `PATTERN_COUNT`. `PatternTest` is declared but
  deliberately left out of `items[]`.
- Patterns return a frame delay from `drawFrame()`; 0 means `default_fps`.

## Known exceptions and gotchas

- `showPatternName()` blocks with `delay(NAME_HOLD_MS)` (1 s) during a
  transition – the one accepted `delay()`.
- The name overlay uses its own 5×7 bitmap renderer because TFT_eSPI text
  APIs proved unreliable here. Don't switch it back.
- `patterns.listPatterns()` prints JSON with raw `Serial.println()` – the one
  exception to `debug.h` macros.
- Touch advances on a raw-pressure edge (`getTouchRawZ()` > 350, release
  < 120, 250 ms debounce). TFT_eSPI's default threshold (600) is too strict for
  CYD panels. Calibration only affects the verbose tap log, so the 4.0″
  placeholder values are harmless.
- `PatternCube`'s `zCamera` (280–380) must exceed `cubeWidth × √3 ≈ 156`;
  the old `beatsin8()` version overflowed and broke projection.
- `PatternSpin` uses bounded arc sampling – the old unbounded
  coordinate-matching loop hung the board.
- `PatternMultipleStream` must call `effects.ShowFrame()` itself.
