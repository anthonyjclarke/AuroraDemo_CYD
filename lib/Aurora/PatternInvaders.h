/*
 * Aurora: https://github.com/pixelmatix/aurora
 * Copyright (c) 2014 Jason Coon
 *
 * Inspired by 'Space Invader Generator': https://the8bitpimp.wordpress.com/2013/05/07/space-invader-generator
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#ifndef PatternInvaders_H
#define PatternInvaders_H

class PatternInvadersTiled : public Drawable {
  protected:
    // Draw the 5x5 mirrored invader repeatedly across the full virtual canvas
    // instead of the old fixed small-screen placement.
    const uint8_t blockSize;
    const uint8_t blockGap;
    const uint8_t tileGap;
    const unsigned int frameDelayMs;
    uint16_t tileIndex = 0;

    int invaderSpan() const {
      return (5 * blockSize) + (4 * blockGap);
    }

    int tilePitch() const {
      return invaderSpan() + tileGap;
    }

    int columns() const {
      int span = invaderSpan();
      int pitch = tilePitch();
      if (span >= MATRIX_WIDTH) return 1;
      return ((MATRIX_WIDTH - span) / pitch) + 1;
    }

    int rows() const {
      int span = invaderSpan();
      int pitch = tilePitch();
      if (span >= MATRIX_HEIGHT) return 1;
      return ((MATRIX_HEIGHT - span) / pitch) + 1;
    }

    int tileCount() const {
      return columns() * rows();
    }

    void drawBlock(int x0, int y0, CRGB color) {
      if (blockSize == 1) {
        effects.drawBackgroundFastLEDPixelCRGB(x0, y0, color);
        return;
      }

      effects.fillRect(x0, y0, x0 + blockSize - 1, y0 + blockSize - 1, color);
    }

    void drawInvaderAt(int originX, int originY) {
      CRGB color1 = effects.ColorFromCurrentPalette(random(0, 255));
      int pitch = blockSize + blockGap;

      for (int col = 0; col < 3; col++) {
        for (int row = 0; row < 5; row++) {
          CRGB color = random(0, 2) ? color1 : CRGB::Black;
          int x = originX + (col * pitch);
          int y = originY + (row * pitch);

          drawBlock(x, y, color);

          if (col < 2) {
            int mirrorX = originX + ((4 - col) * pitch);
            drawBlock(mirrorX, y, color);
          }
        }
      }
    }

  public:
    PatternInvadersTiled(char* patternName,
                         uint8_t pixelBlockSize,
                         uint8_t pixelBlockGap,
                         uint8_t invaderGap,
                         unsigned int frameDelay)
      : blockSize(pixelBlockSize),
        blockGap(pixelBlockGap),
        tileGap(invaderGap),
        frameDelayMs(frameDelay) {
      name = patternName;
    }

    void start() {
      tileIndex = 0;
      effects.ClearFrame();
    }

    unsigned int drawFrame() {
      int count = tileCount();
      if (count <= 0) count = 1;

      if (tileIndex >= count) {
        tileIndex = 0;
        effects.ClearFrame();
      }

      int col = tileIndex % columns();
      int row = tileIndex / columns();
      int originX = col * tilePitch();
      int originY = row * tilePitch();

      drawInvaderAt(originX, originY);
      tileIndex++;

      effects.ShowFrame();

      return frameDelayMs;
    }
};

class PatternInvadersSmall : public PatternInvadersTiled {
  public:
    PatternInvadersSmall()
      : PatternInvadersTiled((char *)"Invaders Small", 1, 0, 1, 125) {}
};

class PatternInvadersMedium : public PatternInvadersTiled {
  public:
    PatternInvadersMedium()
      : PatternInvadersTiled((char *)"Invaders Medium", 4, 0, 2, 500) {}
};

class PatternInvadersLarge : public PatternInvadersTiled {
  public:
    PatternInvadersLarge()
      : PatternInvadersTiled((char *)"Invaders Large", 5, 1, 3, 750) {}
};

#endif
