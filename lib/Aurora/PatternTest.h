
#ifndef PatternTest_H
#define PatternTest_H

class PatternTest : public Drawable {
  private:

  public:
    PatternTest() {
      name = (char *)"Test Pattern";
    }

    unsigned int drawFrame() {
      for (uint16_t i = 0; i < NUM_LEDS; i++)
        effects.leds[i] = CRGB(128, 0, 0);
      effects.ShowFrame();
      return 0;
    }
};

#endif
