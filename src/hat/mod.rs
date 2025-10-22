use icon::Icon;

pub mod countdown;
pub mod function;
pub mod icon;

pub trait State {
    fn get_leds(&mut self, time: u128) -> Vec<LED>;
}

pub struct Hat {
    leds: usize,
    state: Box<dyn State>,
}

impl Hat {
    pub fn new(leds: usize) -> Self {
        Hat {
            leds,
            state: Box::new(Icon::new(leds)),
        }
    }

    pub fn get_leds(&mut self) -> String {
        self.state
            .get_leds(Self::get_time())
            .iter()
            .map(|led| led.to_string())
            .collect::<Vec<_>>()
            .join("")
    }

    pub fn set_state(&mut self, state: Box<dyn State>) {
        self.state = state;
    }

    pub fn get_time() -> u128 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    }
}

#[derive(Debug, Clone, Copy)]
pub struct LED {
    red: u8,
    green: u8,
    blue: u8,
}

impl LED {
    pub fn white() -> Self {
        Self::from_hex("ffffff")
    }

    pub fn black() -> Self {
        Self::from_hex("000000")
    }

    pub fn from_hue(hue: u8) -> LED {
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
            _ => LED::white(),
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

    pub fn is_black(&self) -> bool {
        self.red == 0 && self.green == 0 && self.blue == 0
    }

    pub fn brightness(&mut self, delta: f32) -> LED {
        Self {
            red: Self::calc_bright(self.red, delta),
            green: Self::calc_bright(self.green, delta),
            blue: Self::calc_bright(self.blue, delta),
        }
    }

    pub fn mean(&self, others: Vec<Self>) -> Self {
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

    pub fn xor(&mut self, other: LED) {
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
