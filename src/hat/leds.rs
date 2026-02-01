use std::f32::consts::PI;

/// Handles diagonal LED arrangements, like this:
///
/// X  .  X  .  X
/// .  X  .  X  .
/// X  .  X  .  X
///
/// Also supposes that the LEDs create a spiral.
pub struct LEDCriss {
    // The total is the number of LEDs, without the holes.
    total: usize,
    // The circumference contains the holes in the pattern.
    circum: usize,
    // The available range as (width, height), where only half
    // of the LEDs are actually populated.
    pub range: (usize, usize),
    // LEDs are spiralling around from bottom to top,
    // so the last LED with y = 0 is left of the first LED with y = 1.
    pub leds: Vec<LED>,
}

impl LEDCriss {
    /// total number of LEds, and circum number of LEDs on the bottom range.
    pub fn new(total: usize, circum: usize) -> Self {
        let range = (
            circum * 2 - 1,
            (total as f32 / circum as f32).ceil() as usize,
        );
        Self {
            total,
            circum: range.0,
            range,
            leds: vec![LED::black(); total],
        }
    }

    pub fn clear(&mut self) {
        self.leds = vec![LED::black(); self.total];
    }

    // Perhaps a bit too optimized.
    // It applies a filter to the LEDs with the following properties:
    // - if (fx, fy) falls on a _real_ LED, the LED is set with that color
    // - the sum of all intensities for each color corresponds to the [led] color
    // - it wraps around if the object is with x < 0 or x > circum
    pub fn set(&mut self, fx: f32, fy: f32, led: &LED) {
        // println!("fx({fx}) - fy({fy})");
        // The actual grid as reference
        let (ix, iy) = (fx.floor() as i32, fy.floor() as i32);
        // Only LEDs in this range will ever be lit by this point.
        for lx in -1..=2 {
            for ly in -1..=2 {
                let (x, y) = (ix + lx, iy + ly);
                // println!("lx({lx}) - ly({ly}) - x({x}) - y({y})");
                if (x + y) % 2 != 0 {
                    // Not on a real LED, but on a hole.
                    // println!("LED hole");
                    continue;
                }
                let index = (y * self.circum as i32) + x;
                if index < 0 || index / 2 >= self.total as i32 {
                    // println!("Index out of range: index({index})");
                    continue;
                }

                let (dx, dy) = (x as f32 - fx, y as f32 - fy);
                let bright = Self::calc_square(dx, dy);

                // Add to existing LEDs, so it should be nice.
                // println!("index({index}) - dx({dx})/dy({dy}) - bright({bright})");
                if bright >= 0. {
                    self.leds[index as usize / 2].add(&led.brightness(bright));
                } else {
                    // println!("Brightness negative");
                }
            }
        }
    }

    pub fn set_u(&mut self, x: usize, y: usize, led: LED) {
        let index = (y * self.circum) + x % self.circum;
        if index % 2 == 0 {
            self.leds[index / 2] = led;
        }
    }

    pub fn fill(&mut self, led: &LED) {
        for i in 0..self.leds.len() {
            self.leds[i] = led.clone();
        }
    }

    pub fn brightness(&mut self, bright: f32) {
        for led in &mut self.leds {
            *led = led.brightness(bright);
        }
    }

    pub fn set_char(&mut self, x: usize, char: u8) {
        match char {
            b'0'..=b'9' => self.write_char(x, DIGITS[(char - b'0') as usize]),
            _ => {
                tracing::warn!("Printing unknown char: {char}")
            }
        }
    }

    fn write_char(&mut self, x: usize, bit: [u8; DIGITS_WIDTH]) {
        let on = LED::from_rgb(0xa0, 0xa0, 0xa0);
        for y in 0..8 {
            let byte = bit[7 - y];
            for b in 0..DIGITS_WIDTH {
                if (byte >> b) & 1 == 1 {
                    self.set_u(x + b, y, on.clone());
                }
            }
        }
    }

    pub fn set_string(&mut self, x: usize, s: &str) {
        for c in s.as_bytes().iter().enumerate() {
            self.set_char(x + c.0 * DIGITS_WIDTH, *c.1);
        }
    }

    fn calc_square(mut dx: f32, mut dy: f32) -> f32 {
        (dx, dy) = (dx.abs(), dy.abs());
        if dx >= 2. || dy >= 2. {
            return 0.;
        }
        if dy > dx {
            (dx, dy) = (dy, dx);
        }
        (((2. - dx).powi(2) - dy.powi(2)) / 4.).powf(0.8)
    }

    fn _calc_circle(dx: f32, dy: f32) -> f32 {
        // Calculate the brightness proportional to the area the circle
        // of this point overlaps with the target circle.
        let d = (dx.powi(2) + dy.powi(2)).sqrt();
        // α = 2 * acos(d / (2R))
        // a = 0.5 * R² * (α - sin(α))

        let r = 2f32.sqrt() / 1.9;
        let alpha = 2. * (d / (2. * r)).acos();
        let a = 0.5 * r.powi(2) * (alpha - alpha.sin());
        2. * a / (r.powi(2) * PI)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct LED {
    red: u8,
    green: u8,
    blue: u8,
}

impl LED {
    pub fn _white() -> Self {
        Self::from_hex("ffffff")
    }

    pub fn black() -> Self {
        Self::from_hex("000000")
    }

    pub fn add(&mut self, other: &LED) {
        self.red = Self::saturate(self.red, other.red);
        self.green = Self::saturate(self.green, other.green);
        self.blue = Self::saturate(self.blue, other.blue);
    }

    fn saturate(a: u8, b: u8) -> u8 {
        if a < 0xff - b {
            a + b
        } else {
            0xff
        }
    }

    pub fn from_rgb(red: u8, green: u8, blue: u8) -> LED {
        Self { red, green, blue }
    }

    pub fn red(&self) -> u8 {
        self.red
    }

    pub fn green(&self) -> u8 {
        self.green
    }

    pub fn blue(&self) -> u8 {
        self.blue
    }

    pub fn _from_hue(hue: u8) -> LED {
        let bright = hue % 64;
        let hue = hue / 64;
        let (one, two) = (255 - bright * 2, 128 + bright * 2);
        match hue {
            0 => LED {
                red: one,
                green: two,
                blue: 64,
            },
            1 => LED {
                red: 64,
                green: one,
                blue: two,
            },
            2 => LED {
                red: two,
                green: 64,
                blue: one,
            },
            _ => LED::_white(),
        }
    }

    pub fn from_hex(hex: &str) -> LED {
        let mut l = LED {
            red: 0xff,
            green: 0xff,
            blue: 0xff,
        };
        if hex.len() == 6 {
            if let Ok(red) = u8::from_str_radix(&hex[0..2], 16) {
                l.red = red;
            }
            if let Ok(green) = u8::from_str_radix(&hex[2..4], 16) {
                l.green = green;
            }
            if let Ok(blue) = u8::from_str_radix(&hex[4..6], 16) {
                l.blue = blue;
            }
        }
        l
    }

    pub fn _is_black(&self) -> bool {
        self.red == 0 && self.green == 0 && self.blue == 0
    }

    pub fn brightness(&self, delta: f32) -> LED {
        Self {
            red: Self::calc_bright(self.red, delta),
            green: Self::calc_bright(self.green, delta),
            blue: Self::calc_bright(self.blue, delta),
        }
    }

    pub fn _mean(&self, others: Vec<Self>) -> Self {
        let (mut red, mut green, mut blue) =
            (self.red as usize, self.green as usize, self.blue as usize);
        let s = others.len() + 1;
        for o in others {
            red += o.red as usize;
            green += o.green as usize;
            blue += o.blue as usize;
        }
        Self {
            red: (red / s) as u8,
            green: (green / s) as u8,
            blue: (blue / s) as u8,
        }
    }

    pub fn to_string(&self) -> String {
        format!("{:02x}{:02x}{:02x}", self.red, self.green, self.blue)
    }

    pub fn _xor(&mut self, other: LED) {
        self.red ^= other.red;
        self.green ^= other.green;
        self.blue ^= other.blue;
    }

    fn calc_bright(c: u8, delta: f32) -> u8 {
        let res = c as f32 * delta;
        if res < 0.0 {
            0
        } else if res > 255. {
            255
        } else {
            res as u8
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;

    fn check_leds(lc: &LEDCriss, pattern: &str) {
        let led_pattern = lc
            .leds
            .iter()
            .map(|led| led.to_string().chars().nth(0).unwrap());
        // println!("{:?}", led_pattern.clone().collect::<Vec<_>>());
        let pattern = pattern.chars().filter(|c| *c != ' ').collect::<Vec<_>>();
        assert_eq!(led_pattern.len(), pattern.len(), "Length mismatch");
        for (i, led) in led_pattern.enumerate() {
            assert_eq!(led, pattern[i], "pos {i}");
        }
    }

    #[test]
    // 14
    // . 11 . 12 . 13 .
    // 07 . 08 . 09 . 10
    // . 04 . 05 . 06 .
    // 00 . 01 . 02 . 03
    fn test_led_integer() {
        let mut leds = LEDCriss::new(15, 4);
        let w = &LED::_white();
        leds.set(1., 1., w);
        check_leds(&leds, "0000 f00 0000 000 0");
        leds.clear();

        leds.set(-1., -1., w);
        check_leds(&leds, "0000 000 0000 000 0");
        leds.set(0., 0., w);
        check_leds(&leds, "f000 000 0000 000 0");
        leds.set(1., 0., w);
        check_leds(&leds, "f300 300 0000 000 0");
        leds.clear();

        leds.set(0., 1., w);
        check_leds(&leds, "3003 300 3000 000 0");
        leds.clear();

        leds.set(1., 1., w);
        check_leds(&leds, "0000 f00 0000 000 0");
        leds.clear();

        leds.set(2., 4., w);
        check_leds(&leds, "0000 000 0000 000 0");
    }

    #[test]
    // 14
    // . 11 . 12 . 13 .
    // 07 . 08 . 09 . 10
    // . 04 . 05 . 06 .
    // 00 . 01 . 02 . 03
    fn test_led_float() {
        let mut leds = LEDCriss::new(15, 4);
        let w = &LED::_white();
        leds.set(2.1, 2.1, w);
        check_leds(&leds, "0000 000 0e00 010 0");

        leds.clear();
        leds.set(3.1, 2.1, w);
        check_leds(&leds, "0000 020 0240 040 0");

        leds.clear();
        leds.set(3.5, 2.5, w);
        check_leds(&leds, "0000 000 0060 060 0");
    }
}

// Copied from https://github.com/dhepper/font8x8/blob/master/font8x8_basic.h
const DIGITS_WIDTH: usize = 8;
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

// const DIGITS_WIDTH: usize = 5;
// const DIGITS: [[u8; 8]; 11] = [
//     [0x00, 0x1E, 0x33, 0x33, 0x33, 0x33, 0x33, 0x1E],
//     [0x00, 0x18, 0x1C, 0x1A, 0x18, 0x18, 0x18, 0x18],
//     [0x00, 0x1F, 0x33, 0x38, 0x1C, 0x0E, 0x07, 0x3F],
//     [0x00, 0x3F, 0x18, 0x0C, 0x1E, 0x30, 0x33, 0x1F],
//     [0x00, 0x18, 0x1C, 0x1A, 0x19, 0x7F, 0x18, 0x18],
//     [0x00, 0x3F, 0x03, 0x1F, 0x30, 0x30, 0x33, 0x1F],
//     [0x00, 0x1E, 0x03, 0x1F, 0x33, 0x33, 0x33, 0x1E],
//     [0x00, 0x3F, 0x30, 0x38, 0x1C, 0x0E, 0x06, 0x06],
//     [0x00, 0x1E, 0x33, 0x33, 0x1E, 0x33, 0x33, 0x1E],
//     [0x00, 0x1E, 0x33, 0x33, 0x33, 0x3E, 0x30, 0x1E],
//     [0x00, 0x00, 0x0C, 0x0C, 0x00, 0x00, 0x0C, 0x0C],
// ];
