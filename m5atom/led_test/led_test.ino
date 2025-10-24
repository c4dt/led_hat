#include <Arduino.h>
#include <M5Atom.h>

#define PIN_STRIP 26
#define PIN_LED 27
#define NUMPIXELS 300
#define FIRST_PIXEL 0

#include <Adafruit_NeoPixel.h>

// With the Brack LED-line, it's NEO_RGBW
// With the Circle, it's NEO_GRB
Adafruit_NeoPixel pixels(NUMPIXELS, PIN_STRIP, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel led(1, PIN_LED, NEO_GRB + NEO_KHZ800);

void setup() {
  M5.begin(true, false, false);

  led.begin();
  led.setPixelColor(0, pixels.Color(32, 0, 0));
  led.show();

  pixels.begin();
  pixels.setBrightness(128);
  pixels.clear();
  for (uint16_t i = 0; i < NUMPIXELS; i++) {
    pixels.setPixelColor(i, pixels.gamma32(pixels.ColorHSV((i % 8) << 13,
    0x7f + (i & 0x10) << 3, i & 0x7f)));
  }
  pixels.show();

  led.begin();
  led.setPixelColor(0, pixels.Color(0, 32, 0));
  led.show();
}

int j = 0;

void loop() {
  Serial.println(j);
  for (int i = 0; i < 8; i++) {
    pixels.setPixelColor(((i + j) % 8) + 3,
                         pixels.ColorHSV(0x7fff, 0x7f, i << 3));
  }
  pixels.setPixelColor(0, pixels.Color(32, 0, 0));
  pixels.setPixelColor(1, pixels.Color(0, 32, 0));
  pixels.setPixelColor(2, pixels.Color(0, 0, 32));
  pixels.show();
  delay(1000);
  j++;
}
