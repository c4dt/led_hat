use super::State;

pub enum IconType {
    Empty,
}

pub struct Icon {
    leds: usize,
    icon: IconType,
}

impl State for Icon {
    fn get_leds(&mut self, time: u128) -> Vec<super::LED> {
        todo!()
    }
}

impl Icon {
    pub fn new(leds: usize) -> Self {
        Self {
            leds,
            icon: IconType::Empty,
        }
    }
}
