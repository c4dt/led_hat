use crate::hat::leds::LED;

pub mod countdown;
pub mod function;
pub mod icon;
pub mod leds;
pub mod switch;

pub trait State: Send + Sync {
    fn get_leds(&mut self, time_ms: u128) -> Vec<LED>;
}
