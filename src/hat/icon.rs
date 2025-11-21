use serde::{Deserialize, Serialize};

use crate::hat::leds::{LEDCriss, LED};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum IconType {
    Empty,
    Test,
    Pumpkin,
    Fish,
    Pacman,
    BlackAlps,
}

pub struct Icon {
    leds: LEDCriss,
    icon: IconType,
}

impl Icon {
    pub fn new(leds: usize, circum: usize) -> Self {
        Self {
            leds: LEDCriss::new(leds, circum),
            icon: IconType::Fish,
        }
    }

    pub fn set_icon(&mut self, icon: IconType) {
        self.icon = icon;
    }

    pub fn get_leds(&mut self, time: u128) -> Vec<super::LED> {
        match self.icon {
            IconType::Empty => {}
            IconType::Test => {
                self.leds.clear();
                for i in 0..=(self.leds.range.1) {
                    self.leds.set(
                        40. + ((time as f64 / 2000.).sin() * 3.) as f32,
                        i as f32,
                        &LED::from_hex("800000"),
                    );
                }
            }
            IconType::Pumpkin => {
                self.draw_icon(
                    20. + ((time as f64 / 2000.).sin() * 3.) as f32,
                    0.,
                    PUMPKIN,
                    vec![LED::black(), LED::from_hex("402000")],
                );
            }
            IconType::Fish => {
                self.draw_icon(
                    ((time % 37000) as f64 / 500.) as f32,
                    0.,
                    FISH,
                    vec![LED::black(), LED::from_hex("204040")],
                );
            }
            IconType::BlackAlps => {
                self.draw_icon(
                    ((time % 37000) as f64 / 500.) as f32,
                    0.,
                    BLACKALPS,
                    vec![LED::black(), LED::from_hex("103030")],
                );
            }
            IconType::Pacman => {
                let posx = (time % 74000) / 100;
                let pacman_index = (((posx as i32 / 1) % 7) - 3).abs() as usize;
                let pacman = PACMAN[pacman_index];
                self.draw_icon(
                    posx as f32 / 2.,
                    0.,
                    pacman,
                    vec![
                        LED::black(),
                        LED::from_hex("303010"),
                        LED::from_hex("a05050"),
                    ],
                );
            }
        }
        self.leds.leds.clone()
    }

    pub fn get_icon(&self) -> IconType {
        self.icon.clone()
    }

    fn draw_icon(&mut self, mut pos_x: f32, mut pos_y: f32, pattern: &str, colors: Vec<LED>) {
        let width = self.leds.range.0 as f32;
        pos_x = (pos_x / width).fract() * width;
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

const BLACKALPS: &str = r#"
0000000000000011000000000000000000000000
0000000000000111100000000000000000000000
0000000000001100111100000000000000000000
0000000000011001111110000000000000000000
0000000000110001111110000000000000000000
0000000001100011111111111000000000000000
0000000011000011111111111111000000000000
0000000111110011111111111111111100000000
0000011000111111100001111110000111110000
"#;

const FISH: &str = r#"
                    00000000000000000000000
                    00000000000000000000000
                    10000000000111111000000
                    11100000011000000110000
                    10011001100000000001100
                    10000110000000000000011
                    10011001100000000001100
                    11100000011000000110000
                    00000000000111111000000
                    "#;

const PUMPKIN: &str = r#"
                    000011111111111111000
                    111110011111111001110
                    111100011111111000111
                    111111111100111111111
                    111111110000001111111
                    111110011111111001110
                    001111000000000011110
                    000001111111111110000
                    "#;

const PACMAN: [&str; 4] = [
    r#"
                    000000001111100000000
                    000001111112111100000
                    000111111122111111000
                    001111111111111111100
                    001111111111111111100
                    000111111111111111000
                    000001111111111100000
                    000000001111100000000
                    "#,
    r#"
                    000000001111100000000
                    000001111112111100000
                    000111111122111111000
                    001111111111111111000
                    001111111100000000000
                    000111111111111111000
                    000001111111111100000
                    000000001111100000000
                    "#,
    r#"
                    000000001111100000000
                    000001111112111100000
                    000111111122111111000
                    001111111100000000000
                    001111111100000000000
                    000111111111111111000
                    000001111111111100000
                    000000001111100000000
                    "#,
    r#"
                    000000001111100000000
                    000001111112111100000
                    000111111122110000000
                    001111111100000000000
                    001111111100000000000
                    000111111111110000000
                    000001111111111100000
                    000000001111100000000
                    "#,
];
