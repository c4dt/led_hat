use std::f32::consts::PI;

use crate::hat::leds::{LEDCriss, LED};

pub struct Countdown {
    end_ms: u128,
    leds: LEDCriss,
}

impl Countdown {
    pub fn new(total: usize, circum: usize) -> Self {
        Self {
            end_ms: 0,
            leds: LEDCriss::new(total, circum),
        }
    }

    pub fn set_countdown(&mut self, end_ms: u128) {
        self.end_ms = end_ms;
    }

    pub fn get_leds(&mut self, now_ms: u128) -> Vec<super::LED> {
        if now_ms > self.end_ms {
            let red = LED::from_rgb(0xff, 0x80, 0x80)
                .brightness(((now_ms % 2000) as f32 / 1000. * PI).sin() * 0.5 + 0.5);
            self.leds.fill(&red);
        } else {
            self.leds.fill(&LED::from_rgb(0, 0x60, 0));
            let left = (self.end_ms - now_ms) / 1000;
            let (left_s, left_m) = (left % 60, left / 60);
            let print = format!("{left_m:02}:{left_s:02}");
            let on = LED::from_rgb(0x80, 0x80, 0x80);
            let off = LED::black();
            for y in 0..8 {
                for c in 0..5 {
                    let char = DIGITS[(print.as_bytes()[c] - b'0') as usize][7 - y];
                    for b in 0..8 {
                        self.leds.set_u(
                            c * 8 + b,
                            y,
                            if (char >> b) & 1 == 1 { &on } else { &off },
                        );
                    }
                }
            }
        }
        self.leds.brightness(0.5);
        self.leds.leds.clone()
    }
}

// Copied from https://github.com/dhepper/font8x8/blob/master/font8x8_basic.h
const DIGITS: [[u8; 8]; 11] = [
    [0x3E, 0x63, 0x73, 0x7B, 0x6F, 0x67, 0x3E, 0x00], // U+0030 (0)
    [0x0C, 0x0E, 0x0C, 0x0C, 0x0C, 0x0C, 0x3F, 0x00], // U+0031 (1)
    [0x1E, 0x33, 0x30, 0x1C, 0x06, 0x33, 0x3F, 0x00], // U+0032 (2)
    [0x1E, 0x33, 0x30, 0x1C, 0x30, 0x33, 0x1E, 0x00], // U+0033 (3)
    [0x38, 0x3C, 0x36, 0x33, 0x7F, 0x30, 0x78, 0x00], // U+0034 (4)
    [0x3F, 0x03, 0x1F, 0x30, 0x30, 0x33, 0x1E, 0x00], // U+0035 (5)
    [0x1C, 0x06, 0x03, 0x1F, 0x33, 0x33, 0x1E, 0x00], // U+0036 (6)
    [0x3F, 0x33, 0x30, 0x18, 0x0C, 0x0C, 0x0C, 0x00], // U+0037 (7)
    [0x1E, 0x33, 0x33, 0x1E, 0x33, 0x33, 0x1E, 0x00], // U+0038 (8)
    [0x1E, 0x33, 0x33, 0x3E, 0x30, 0x18, 0x0E, 0x00], // U+0039 (9)
    [0x00, 0x0C, 0x0C, 0x00, 0x00, 0x0C, 0x0C, 0x00], // U+003A (:)
];
