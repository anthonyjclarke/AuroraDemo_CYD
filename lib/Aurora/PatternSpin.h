/*
* Aurora: https://github.com/pixelmatix/aurora
* Copyright (c) 2014 Jason Coon
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

#ifndef PatternSpin_H
#define PatternSpin_H

class PatternSpin : public Drawable {
public:
    PatternSpin() {
        name = (char *)"Spin";
    }

    float degrees = 0;
    float radius = 16;

    float speedStart = 1;
    float velocityStart = 0.6;

    float maxSpeed = 30;

    float speed = speedStart;
    float velocity = velocityStart;

    void start() {
        speed = speedStart;
        velocity = velocityStart;
        degrees = 0;
    }

    unsigned int drawFrame() {
        effects.DimAll(190);

        CRGB color = effects.ColorFromCurrentPalette(speed * 8);

        // Draw along the swept arc with a bounded number of samples. The older
        // coordinate-matching loop could become non-terminating once floating
        // angles were rounded to integer pixels.
        int steps = max(1, (int)ceilf(speed));
        for (int i = 0; i <= steps; i++) {
            float t = (float)i / (float)steps;
            float sampleDegrees = degrees + (speed * t);
            float rads = radians(sampleDegrees);
            int x = (int)(MATRIX_CENTER_X + radius * cos(rads));
            int y = (int)(MATRIX_CENTER_Y - radius * sin(rads));

            effects.drawBackgroundFastLEDPixelCRGB(x, y, color);
            effects.drawBackgroundFastLEDPixelCRGB(y, x, color);
        }

        degrees += speed;

        // add velocity to the particle each pass around the accelerator
        if (degrees >= 360) {
            degrees = 0;
            speed += velocity;
            if (speed <= speedStart) {
                speed = speedStart;
                velocity *= -1;
            }
            else if (speed > maxSpeed){
                speed = maxSpeed - velocity;
                velocity *= -1;
            }
        }

        effects.ShowFrame();

        return 0;
    }
};

#endif
