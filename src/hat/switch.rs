use crate::hat::{
    countdown::Countdown,
    function::{FormulaStrings, Function},
    icon::Icon,
};

pub struct Switch {
    function: Function,
    icons: Icon,
    countdown: Countdown,
    state: HatState,
}

pub enum HatState {
    Function,
    Icon,
    Countdown,
}

impl Switch {
    pub fn new(leds: usize, circum: usize) -> Self {
        Switch {
            icons: Icon::new(leds, circum),
            function: Function::new(leds, circum, 1, 1),
            countdown: Countdown::new(),
            state: HatState::Function,
        }
    }

    pub fn get_leds(&mut self) -> String {
        let time = Self::get_time();

        match self.state {
            HatState::Function => self.function.get_leds(time),
            HatState::Icon => self.icons.get_leds(time),
            HatState::Countdown => self.countdown.get_leds(time),
        }
        .iter()
        .map(|led| led.to_string())
        .collect::<Vec<_>>()
        .join("")
    }

    pub fn get_status(&self) -> String {
        match self.state {
            HatState::Function => "Function",
            HatState::Icon => "Icon",
            HatState::Countdown => "Countdown",
        }
        .into()
    }

    pub fn add_formula(&mut self, fs: FormulaStrings) {
        self.function.add_formula(fs);
    }

    pub fn set_state(&mut self, state: HatState) {
        self.state = state;
    }

    pub fn get_time() -> u128 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    }
}
