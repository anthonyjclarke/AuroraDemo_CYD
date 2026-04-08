/*
 * Aurora Demo — ESP32 CYD Edition
 *
 * Procedurally animated visual effects running on the ESP32 Cheap Yellow Display
 * (CYD) family.  Effects rotate every 20 seconds.
 *
 * Board variants — select via PlatformIO env:
 *   env:esp32-cyd-28  CYD 2.8"  ILI9341  320×240  (-DBOARD_CYD_28=1)
 *   env:esp32-cyd-40  CYD 4.0"  ST7796S  480×320  (-DBOARD_CYD_40=1)
 *
 * Origins:
 *   Aurora effects engine  — Jason Coon / PixelMatix (2014)
 *                            https://github.com/pixelmatix/aurora
 *   ESP32 HUB75 DMA port   — mrfaptastic / mrcodetastic
 *                            https://github.com/mrcodetastic/ESP32-HUB75-MatrixPanel-DMA
 *   ESP32 CYD port         — Anthony Clarke (2026)
 *                            https://github.com/anthonyjclarke
 *
 * Rendering pipeline:
 *   effects.ClearFrame()  →  pattern.drawFrame()  →  effects.ShowFrame()
 *
 * Canvas: MATRIX_WIDTH × MATRIX_HEIGHT virtual, scaled 2×2 to fill the TFT.
 *   CYD 2.8" (ILI9341): 160×120 × 2 = 320×240   (~96 KB buffers)
 *   CYD 4.0" (ST7796):  120×80  × 4 = 480×320   (~48 KB buffers)
 * leds[], heat[], and noise[][] are heap-allocated in Effects::Setup() so
 * the large buffers don't overflow the linker's BSS segment.
 *
 * Hardware — CYD pin mapping (configured via TFT_eSPI build flags):
 *   MISO=12  MOSI=13  SCLK=14  CS=15  DC=2  RST=N/A  Backlight=21  TouchCS=33
 *
 * Debug level (set via -DDEBUG_LEVEL=N in platformio.ini build_flags):
 *   0=Off  1=Error  2=Warn  3=Info (default)  4=Verbose
 */

/* ─── Version ─────────────────────────────────────────────────────────────── */
#define VERSION_MAJOR  0
#define VERSION_MINOR  6
#define VERSION_PATCH  0
#define VERSION_STRING "0.6.0"

#include <Arduino.h>
#include <FastLED.h>
#include <TFT_eSPI.h>
#include "debug.h"

TFT_eSPI tft;   // display object — must be declared before Effects.h is included

#include "Effects.h"
Effects effects;

#include "Drawable.h"
#include "Playlist.h"
#include "Patterns.h"
Patterns patterns;

/* ─── Touch calibration ─────────────────────────────────────────────────────
 *  Values are board-specific.  Run the TFT_eSPI touch calibration example and
 *  replace the five values for each board with your unit-specific readings.
 *  For pattern-advance purposes any reasonable calibration works fine.
 *
 *  CYD 4.0" values are PLACEHOLDERS — recalibrate on the physical unit.      */
#if defined(BOARD_CYD_40)
static uint16_t touchCal[5] = { 300, 3600, 200, 3700, 7 };  // PLACEHOLDER — recalibrate
#else  // BOARD_CYD_28 (default)
static uint16_t touchCal[5] = { 339, 3470, 237, 3580, 7 };
#endif

/* ─── Timing ─────────────────────────────────────────────────────────────── */
const unsigned long PATTERN_DURATION_MS = 20000;  // 20 s per effect
static bool in_pattern_transition = false;

unsigned long ms_pattern_start = 0;
unsigned long last_frame       = 0;
unsigned long frame_count      = 0;
unsigned int  default_fps      = 30;
unsigned int  pattern_fps      = 30;

void nextPattern();  // forward declaration — defined below

/* ─── Touch ─────────────────────────────────────────────────────────────────
 *  Poll the XPT2046 resistive touch controller.  Any tap advances to the next
 *  pattern immediately, the same as the automatic 20-second rotation.
 *  TOUCH_DEBOUNCE_MS prevents a single press from firing repeatedly.
 *  TOUCH_Z_THRESHOLD is lower than TFT_eSPI's default (600), which is often
 *  too strict for CYD panels and can make all taps look like "no touch".     */
static const unsigned long TOUCH_DEBOUNCE_MS = 250;
static const uint16_t      TOUCH_Z_THRESHOLD  = 350;
static const uint16_t      TOUCH_RELEASE_Z    = 120;
static unsigned long       last_touch_ms     = 0;
static bool                prev_touched      = false;

static bool isTouchPressedRaw() {
  uint16_t rawZ = tft.getTouchRawZ();
  bool pressed = rawZ > TOUCH_Z_THRESHOLD;
  bool released = rawZ < TOUCH_RELEASE_Z;

  if (released) {
    prev_touched = false;
  } else if (pressed) {
    prev_touched = true;
  }

  return pressed;
}

void checkTouch() {
  uint16_t tx, ty;
  uint16_t rawZ = tft.getTouchRawZ();
  bool touched = tft.getTouch(&tx, &ty, TOUCH_Z_THRESHOLD);
  bool pressed = rawZ > TOUCH_Z_THRESHOLD;
  bool released = rawZ < TOUCH_RELEASE_Z;

  // Act on the leading edge of a physical press. Some CYD panels report valid
  // pressure but fail TFT_eSPI's stricter coordinate validation, so pressure
  // edge is the reliable trigger for "next pattern".
  if (pressed && !prev_touched && !in_pattern_transition) {
    unsigned long now = millis();
    if (now - last_touch_ms >= TOUCH_DEBOUNCE_MS) {
      last_touch_ms = now;
      if (touched) DBG_VERBOSE("[touch] tap at (%d, %d)", tx, ty);
      nextPattern();
    }
  }

  // Use hysteresis on release so the press state resets promptly even if the
  // panel reports noisy intermediate pressure values.
  if (released) {
    prev_touched = false;
  } else if (pressed) {
    prev_touched = true;
  }
}

/* ─── Pattern name overlay ──────────────────────────────────────────────────
 *  Clears the display, shows the effect name centred for NAME_HOLD_MS, then
 *  clears again so the animation starts on a black canvas.                   */
static const unsigned int NAME_HOLD_MS = 1000;

static const uint8_t kGlyphSpace[7] = {0, 0, 0, 0, 0, 0, 0};
static const uint8_t kGlyphA[7] = {14, 17, 17, 31, 17, 17, 17};
static const uint8_t kGlyphB[7] = {30, 17, 17, 30, 17, 17, 30};
static const uint8_t kGlyphC[7] = {14, 17, 16, 16, 16, 17, 14};
static const uint8_t kGlyphD[7] = {30, 17, 17, 17, 17, 17, 30};
static const uint8_t kGlyphE[7] = {31, 16, 16, 30, 16, 16, 31};
static const uint8_t kGlyphF[7] = {31, 16, 16, 30, 16, 16, 16};
static const uint8_t kGlyphG[7] = {14, 17, 16, 23, 17, 17, 15};
static const uint8_t kGlyphH[7] = {17, 17, 17, 31, 17, 17, 17};
static const uint8_t kGlyphI[7] = {31, 4, 4, 4, 4, 4, 31};
static const uint8_t kGlyphJ[7] = {7, 2, 2, 2, 2, 18, 12};
static const uint8_t kGlyphK[7] = {17, 18, 20, 24, 20, 18, 17};
static const uint8_t kGlyphL[7] = {16, 16, 16, 16, 16, 16, 31};
static const uint8_t kGlyphM[7] = {17, 27, 21, 21, 17, 17, 17};
static const uint8_t kGlyphN[7] = {17, 25, 21, 19, 17, 17, 17};
static const uint8_t kGlyphO[7] = {14, 17, 17, 17, 17, 17, 14};
static const uint8_t kGlyphP[7] = {30, 17, 17, 30, 16, 16, 16};
static const uint8_t kGlyphQ[7] = {14, 17, 17, 17, 21, 18, 13};
static const uint8_t kGlyphR[7] = {30, 17, 17, 30, 20, 18, 17};
static const uint8_t kGlyphS[7] = {15, 16, 16, 14, 1, 1, 30};
static const uint8_t kGlyphT[7] = {31, 4, 4, 4, 4, 4, 4};
static const uint8_t kGlyphU[7] = {17, 17, 17, 17, 17, 17, 14};
static const uint8_t kGlyphV[7] = {17, 17, 17, 17, 17, 10, 4};
static const uint8_t kGlyphW[7] = {17, 17, 17, 21, 21, 21, 10};
static const uint8_t kGlyphX[7] = {17, 17, 10, 4, 10, 17, 17};
static const uint8_t kGlyphY[7] = {17, 17, 10, 4, 4, 4, 4};
static const uint8_t kGlyphZ[7] = {31, 1, 2, 4, 8, 16, 31};

static const uint8_t* bitmapGlyphFor(char c) {
  switch (c) {
    case 'A': return kGlyphA;
    case 'B': return kGlyphB;
    case 'C': return kGlyphC;
    case 'D': return kGlyphD;
    case 'E': return kGlyphE;
    case 'F': return kGlyphF;
    case 'G': return kGlyphG;
    case 'H': return kGlyphH;
    case 'I': return kGlyphI;
    case 'J': return kGlyphJ;
    case 'K': return kGlyphK;
    case 'L': return kGlyphL;
    case 'M': return kGlyphM;
    case 'N': return kGlyphN;
    case 'O': return kGlyphO;
    case 'P': return kGlyphP;
    case 'Q': return kGlyphQ;
    case 'R': return kGlyphR;
    case 'S': return kGlyphS;
    case 'T': return kGlyphT;
    case 'U': return kGlyphU;
    case 'V': return kGlyphV;
    case 'W': return kGlyphW;
    case 'X': return kGlyphX;
    case 'Y': return kGlyphY;
    case 'Z': return kGlyphZ;
    default:  return kGlyphSpace;
  }
}

static void drawBitmapTextLine(const String& text, int16_t x, int16_t y, uint16_t color, uint8_t scale) {
  for (uint16_t i = 0; i < text.length(); i++) {
    const uint8_t* glyph = bitmapGlyphFor(text[i]);
    int16_t char_x = x + (i * 6 * scale);
    for (uint8_t row = 0; row < 7; row++) {
      uint8_t bits = glyph[row];
      for (uint8_t col = 0; col < 5; col++) {
        if (bits & (1 << (4 - col))) {
          tft.fillRect(char_x + (col * scale), y + (row * scale), scale, scale, color);
        }
      }
    }
  }
}

static int findOverlaySplit(const String& label, int max_chars_per_line) {
  if ((int)label.length() <= max_chars_per_line) return -1;

  int center = label.length() / 2;

  for (int radius = 0; radius < center; radius++) {
    int right = center + radius;
    if (right > 0 && right < (int)label.length() && label[right] == ' ') return right;

    int left = center - radius;
    if (left > 0 && left < (int)label.length() && label[left] == ' ') return left;
  }

  for (int radius = 0; radius < center; radius++) {
    int right = center + radius;
    if (right > 0 && right < (int)label.length() &&
        isUpperCase(label[right]) && isLowerCase(label[right - 1])) {
      return right;
    }

    int left = center - radius;
    if (left > 0 && left < (int)label.length() &&
        isUpperCase(label[left]) && isLowerCase(label[left - 1])) {
      return left;
    }
  }

  return center;
}

void showPatternName(const char* name) {
  effects.ClearFrame();
  tft.fillScreen(TFT_BLACK);
  int16_t cx = tft.width() / 2;
  int16_t cy = tft.height() / 2;
  String label(name);
  label.toUpperCase();
  const uint8_t scale = 4;
  const int char_w = 6 * scale;
  const int line_h = 8 * scale;
  const int max_chars_per_line = tft.width() / char_w;

  int split = findOverlaySplit(label, max_chars_per_line);
  String line1 = label;
  String line2 = "";
  if (split > 0) {
    line1 = label.substring(0, split);
    line2 = label.substring(label[split] == ' ' ? split + 1 : split);
  }

  int line1_x = (tft.width()  - (line1.length() * char_w)) / 2;
  int line2_x = (tft.width()  - (line2.length() * char_w)) / 2;
  int line1_y = line2.length() ? (cy - line_h) : (cy - (line_h / 2));
  int line2_y = cy + 4;

  if (line1_x < 4) line1_x = 4;
  if (line2_x < 4) line2_x = 4;

  drawBitmapTextLine(line1, line1_x, line1_y, TFT_CYAN, scale);
  if (line2.length()) {
    drawBitmapTextLine(line2, line2_x, line2_y, TFT_CYAN, scale);
  }

  // Temporary blocking delay for visibility while debugging the overlay.
  delay(NAME_HOLD_MS);
  effects.ClearFrame();
  tft.fillScreen(TFT_BLACK);
}

/* ─── Pattern transition ────────────────────────────────────────────────────
 *  Reports the average fps of the outgoing effect (once), then advances to
 *  the next effect, shows its name, and starts the animation.                */
void nextPattern() {
  if (in_pattern_transition) return;
  in_pattern_transition = true;
  prev_touched = true;

  unsigned long elapsed = millis() - ms_pattern_start;
  if (elapsed > 0) {
    DBG_INFO("[done] %-22s  avg fps: %lu",
             patterns.getCurrentPatternName(),
             (frame_count * 1000UL) / elapsed);
  }

  patterns.stop();
  effects.ClearFrame();
  effects.ShowFrame();
  patterns.moveRandom(1);

  DBG_INFO("[next] %s", patterns.getCurrentPatternName());
  showPatternName(patterns.getCurrentPatternName());

  effects.ClearFrame();
  patterns.start();
  ms_pattern_start = millis();
  last_frame        = millis();
  frame_count       = 0;
  in_pattern_transition = false;
}

/* ─── Setup ─────────────────────────────────────────────────────────────── */
void setup() {
  Serial.begin(115200);
  delay(250);

  tft.begin();
  tft.setRotation(1);          // landscape — 320×240 (CYD 2.8") or 480×320 (CYD 4.0")
  tft.setTouch(touchCal);      // load touch calibration
  tft.fillScreen(TFT_BLACK);
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, HIGH);  // backlight on

#if defined(BOARD_CYD_40)
  DBG_INFO("=== Aurora Demo v" VERSION_STRING " — CYD 4.0\" (ST7796S 480x320) ===");
#else
  DBG_INFO("=== Aurora Demo v" VERSION_STRING " — CYD 2.8\" (ILI9341 320x240) ===");
#endif
  DBG_INFO("Debug level: %d", debugLevel);
  DBG_INFO("Touch: CS=%d Z-threshold=%u", TOUCH_CS, TOUCH_Z_THRESHOLD);

  DBG_INFO("Heap before effects.Setup(): %lu bytes free, PSRAM: %lu bytes free",
           ESP.getFreeHeap(), ESP.getFreePsram());
  effects.Setup();
  DBG_INFO("Heap after effects.Setup(): %lu bytes free, PSRAM: %lu bytes free",
           ESP.getFreeHeap(), ESP.getFreePsram());

  DBG_INFO("Patterns loaded:");
  patterns.listPatterns();

  // Pick a random starting pattern, show its name, then begin
  patterns.moveRandom(1);
  DBG_INFO("[start] %s", patterns.getCurrentPatternName());
  showPatternName(patterns.getCurrentPatternName());
  patterns.start();

  ms_pattern_start = millis();
  last_frame        = millis();
}

/* ─── Main loop ─────────────────────────────────────────────────────────── */
void loop() {
  // Touch: tap anywhere to advance to the next pattern immediately
  checkTouch();

  // Pattern rotation: automatic after PATTERN_DURATION_MS
  if ((millis() - ms_pattern_start) >= PATTERN_DURATION_MS) {
    nextPattern();
  }

  // Frame render — honour the per-pattern target rate
  if ((millis() - last_frame) >= (1000u / pattern_fps)) {
    last_frame  = millis();
    pattern_fps = patterns.drawFrame();
    if (!pattern_fps) pattern_fps = default_fps;
    ++frame_count;
  }
}
