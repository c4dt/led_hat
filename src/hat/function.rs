use super::State;

pub struct Function {}

impl State for Function {
    fn get_leds(&mut self, time: u128) -> Vec<super::LED> {
        todo!()
    }
}
