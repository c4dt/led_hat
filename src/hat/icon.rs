use crate::hat::{Hat, LEDCriss, LED};

use super::State;

pub enum IconType {
    Empty,
    Test,
    Pumpkin,
}

pub struct Icon {
    leds: LEDCriss,
    icon: IconType,
}

impl State for Icon {
    fn get_leds(&mut self, time: u128) -> Vec<super::LED> {
        match self.icon {
            IconType::Empty => {}
            IconType::Test => {
                for i in 0..=(self.leds.range.1) {
                    self.leds.set(0., i as f32, &LED::from_hex("200808"));
                }
            }
            IconType::Pumpkin => {
                self.draw_icon(
                    40. + ((time as f64 / 2000.).sin() * 3.) as f32,
                    0.,
                    r#"
                    000011111111111111000
                    111111111111111111110
                    111100111111111100111
                    111111111111111111111
                    111111110000001111111
                    111110011111111001110
                    001111000000000011110
                    000001111111111110000
                    "#,
                    vec![LED::black(), LED::from_hex("804000")],
                );
            }
        }
        self.leds.leds.clone()
    }
}

impl Icon {
    pub fn new(leds: usize, circum: usize) -> Self {
        Self {
            leds: LEDCriss::new(leds, circum),
            icon: IconType::Pumpkin,
        }
    }

    fn draw_icon(&mut self, pos_x: f32, mut pos_y: f32, pattern: &str, colors: Vec<LED>) {
        self.leds.clear();
        let pattern_lines = pattern
            .split("\n")
            .map(|l| l.replace(" ", ""))
            .filter(|l| l.len() > 0)
            .collect::<Vec<_>>();
        pos_y += (pattern_lines.len() - 1) as f32;
        for (y, line) in pattern_lines.iter().enumerate() {
            for (x, char) in line.chars().enumerate() {
                if let Some(led) = char
                    .to_digit(10)
                    .and_then(|i| (i < colors.len() as u32).then(|| colors[i as usize]))
                {
                    self.leds.set(pos_x + x as f32, pos_y - y as f32, &led);
                }
            }
        }
    }
}

#[cfg(test)]
mod test {
    // use super::*;

    #[test]
    fn test_draw_led() {}
}
