use crate::hat::{icon::Icon, State};

pub struct Switch {
    leds: usize,
    circum: usize,
    state: Box<dyn State>,
}

impl Switch {
    pub fn new(leds: usize, circum: usize) -> Self {
        Switch {
            leds,
            circum,
            state: Box::new(Icon::new(leds, circum)),
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
