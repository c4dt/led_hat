/**
 * Connecting through WiFi to the display, and showing it.
 */

#include <Arduino.h>
#include <DFRobot_SCD4X.h>
#include <HTTPClient.h>
#include <M5Atom.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiUDP.h>

// This needs to define WIFI_AP and WIFI_PW.
// Don't check into github...
#include "wifi.h"

// #define BASE_NAME "led-hat.c4dt.org"
// #define BASE_NAME "led-hat.ineiti.ch"
// #define BASE_NAME "192.168.178.143"
#define BASE_NAME "10.47.158.86"
// #define BASE_NAME "192.168.0.161"
// #define BASE_URL "https://" BASE_NAME
#define BASE_URL "http://" BASE_NAME ":8080"
#define BASE_UDP_PORT 8081

#define REQUEST_FPS 50
#define REQUEST_INTERVAL 1000 / REQUEST_FPS

#define PIN_STRIP 26
#define PIN_LED 27
#define NUMPIXELS 300
#define BRIGHTNESS 32

// Doesn't work because of __enable_irq()!
// #include <PololuLedStrip.h>
// Doesn't work because of RMT_MEM_NUM_BLOCKS_1
// #include "Freenove_WS2812_Lib_for_ESP32.h"

DFRobot_SCD4X SCD4X(&Wire, /*i2cAddr = */ SCD4X_I2C_ADDR);

#include <Adafruit_NeoPixel.h>

Adafruit_NeoPixel pixels(NUMPIXELS, PIN_STRIP, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel led(1, PIN_LED, NEO_GRB + NEO_KHZ800);

#define STATE_WIFI 0
void state_wifi();
#define STATE_UDP_READ 1
void state_udp_read();
#define STATE_GET_CONNECT 2
void state_get_connect();
#define STATE_GET_REQUEST 3
void state_get_request();

#define REQUEST_UDP 0
#define REQUEST_GET 1

int request = REQUEST_UDP;
WiFiMulti wifiMulti;
int state = 0;
unsigned long last = 0;

HTTPClient http;

void setup_co2();
void check_co2();
uint16_t co2;

void setup() {
  M5.begin(true, false, false);

  led.begin();
  led.setPixelColor(0, pixels.Color(32, 0, 0));
  led.show();

  wifiMulti.addAP(WIFI_AP, WIFI_PW);
  Serial.printf("\nConnecting to %s / %s...\n", WIFI_AP, WIFI_PW);

  delay(50);

  led.setPixelColor(0, pixels.Color(32, 32, 0));

  setup_co2();

  led.setPixelColor(0, pixels.Color(0, 32, 32));

  pixels.begin();
  pixels.setBrightness(BRIGHTNESS);
  pixels.clear();

  led.setPixelColor(0, pixels.Color(0, 32, 0));
}

void loop() {
  check_co2();
  fetch_button();
  switch (state) {
  case STATE_WIFI:
    state_wifi();
    return;
    break;
  case STATE_UDP_READ:
    state_udp_read();
    break;
  case STATE_GET_CONNECT:
    state_get_connect();
    return;
    break;
  case STATE_GET_REQUEST:
    state_get_request();
    break;
  }

  unsigned long now = millis();
  if (now <= REQUEST_INTERVAL + last) {
    // Serial.printf("Request duration: %ld..%ld = %ld\n", last, now, now -
    // last);
    delay(REQUEST_INTERVAL + last - now);
    // } else {
    //   Serial.printf("Request duration overflow: %ld..%ld = %ld\n", last, now,
    //   now - last);
  }
  last = millis();
}

static uint8_t hex2u8(const char *c) {
  uint8_t high = *c % 16 + 9 * (*c / 97);
  c++;
  uint8_t low = *c % 16 + 9 * (*c / 97);
  return low + (high << 4);
}

static uint32_t str2pix(const char *c) {
  // return pixels.Color(hex2u8(c) >> 4, hex2u8(c + 2) >> 4, hex2u8(c + 4) >>
  // 4);
  return pixels.Color(hex2u8(c), hex2u8(c + 2), hex2u8(c + 4));
  // return pixels.gamma32(pixels.Color(hex2u8(c), hex2u8(c + 2), hex2u8(c +
  // 4)));
}

void show_LEDs_hex(const char *hexes) {
  for (int i = 0; i < NUMPIXELS; i++) {
    // pixels.setPixelColor(i, str2pix(hexes + i * 6));
    pixels.setPixelColor(
        i, pixels.gamma32(str2pix(hexes + (NUMPIXELS - i - 1) * 6)));
  }
  pixels.setBrightness(BRIGHTNESS);
  pixels.show();
}

void show_LEDs(uint8_t *rgb) {
  for (int i = 0; i < NUMPIXELS; i++) {
    // pixels.setPixelColor(i,
    //                      pixels.Color(rgb[i*3], rgb[i*3+1], rgb[i*3+2]));
    pixels.setPixelColor(NUMPIXELS - i - 1,
                         pixels.gamma32(pixels.Color(rgb[i * 3], rgb[i * 3 + 1],
                                                     rgb[i * 3 + 2])));
  }
  pixels.setBrightness(BRIGHTNESS);
  pixels.show();
}

void state_wifi() {
  if ((wifiMulti.run() == WL_CONNECTED)) {
    led.setPixelColor(0, pixels.Color(0, 32, 0));
    led.show();

    state = request_start();
  } else {
    Serial.printf("WiFi connection to %s / %s failed\n", WIFI_AP, WIFI_PW);

    delay(50);
  }
}

bool http_begin(String url) {
  http.setReuse(false);
  http.end();
  if (url.startsWith("https://")) {
    return http.begin(url, (const char *)NULL);
  } else {
    return http.begin(url);
  }
}

int request_start() {
  Serial.printf("Request is %d\n", request);
  switch (request) {
  case REQUEST_GET:
    return STATE_GET_CONNECT;
  case REQUEST_UDP:
    return STATE_UDP_READ;
  }
}

WiFiUDP client_udp;

void state_udp_read() {
  // WiFiSTAClass local;
  // Serial.printf("Local IP: %s\n", local.localIP().toString());
  // client_udp.begin(8081);

  client_udp.beginPacket(BASE_NAME, BASE_UDP_PORT);
  client_udp.write((uint8_t *)&co2, 2);
  client_udp.endPacket();

  int count = 10;
  while (client_udp.parsePacket() == 0) {
    if (count-- == 0) {
      Serial.printf("%06ld (%03d): Didn't get a reply in %dms\n", millis(),
                    millis() - last, REQUEST_INTERVAL);
      return;
    }
    delay(REQUEST_INTERVAL / 10);
  }
  int bufLen = NUMPIXELS * 3;
  uint8_t buf[bufLen + 1];
  int res = client_udp.read(buf, bufLen);
  if (res != bufLen) {
    Serial.printf("%06ld (%03d): Only got %d out of %d bytes\n", millis(),
                  millis() - last, res, bufLen);
  } else {
    show_LEDs(buf);
  }
}

void state_get_connect() {
  char *url = BASE_URL "/api/get_leds";
  // char *url = "http://1.1.1.1";
  http_begin(url);
  Serial.printf("Connecting to: %s\n", url);
  // http.GET();

  state = STATE_GET_REQUEST;
}

void state_get_request() {
  http.setReuse(true);

  int httpCode = http.GET();
  // Serial.printf("[HTTP] GET... code: %d\n", httpCode);

  if (httpCode > 0) {

    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      // Serial.println(hexes);
      show_LEDs_hex(payload.c_str());
    } else {
      Serial.printf("Wrong http code: %d\n", httpCode);
      state = STATE_GET_CONNECT;
      return;
    }
  } else {
    Serial.printf("[HTTP] GET... failed, error(%d): %s\n", httpCode,
                  http.errorToString(httpCode).c_str());
    state = STATE_GET_CONNECT;
    delay(5000);
    return;
  }

  // http.end();
}

void fetch_button() {
  if (M5.Btn.read() == 1) {
    request = (request + 1) % 2;
    state = request_start();

    led.setPixelColor(0, pixels.Color(32, 32, 0));
    led.show();

    delay(1000);

    if (request == 0) {
      led.setPixelColor(0, pixels.Color(0, 32, 0));
    } else if (request == 1) {
      led.setPixelColor(0, pixels.Color(0, 0, 32));
    }
    led.show();
  }
}

void setup_co2() {
  Wire.setPins(25, 21);

  // Init the sensor
  while (!SCD4X.begin()) {
    Serial.println("Communication with device failed, please check connection");
    delay(3000);
  }
  Serial.println("Begin ok!");
  SCD4X.enablePeriodMeasure(SCD4X_STOP_PERIODIC_MEASURE);
  SCD4X.setTempComp(4.0);
  SCD4X.setSensorAltitude(54);
  SCD4X.setAutoCalibMode(true);
  SCD4X.enablePeriodMeasure(SCD4X_START_PERIODIC_MEASURE);

  Serial.println("Finished setting up CO2 sensor");
}

#define CO2_PERIOD 1000
int co2_counter = CO2_PERIOD;

void check_co2() {
  if (co2_counter++ < CO2_PERIOD) {
    return;
  }
  co2_counter = 0;

  if (SCD4X.getDataReadyStatus()) {
    DFRobot_SCD4X::sSensorMeasurement_t data;
    SCD4X.readMeasurement(&data);
    Serial.println(String("CO2: ") + data.CO2ppm + " - temp: " + data.temp +
                   " - humid: " + data.humidity);
    co2 = data.CO2ppm;
  }
}
