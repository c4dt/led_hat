use super::State;

pub struct Countdown {}

impl State for Countdown {
    fn get_leds(&mut self, time: u128) -> Vec<super::LED> {
        todo!()
    }
}
