use serde::{Deserialize, Serialize};

use crate::{
    hat::{
        countdown::Countdown,
        function::{FormulaStrings, Function},
        icon::{Icon, IconType},
        leds::LED,
    },
    AdminCommand,
};

#[derive(Debug, Deserialize, Serialize)]
pub struct HatStatus {
    command: AdminCommand,
    formulas_queue: usize,
    allow_function: bool,
}

pub struct Switch {
    function: Function,
    icons: Icon,
    countdown: Countdown,
    state: HatState,
    allow_function: bool,
}

#[derive(PartialEq)]
pub enum HatState {
    Function,
    Icon,
    Countdown,
}

impl Switch {
    pub fn new(leds: usize, circum: usize) -> Self {
        Switch {
            icons: Icon::new(leds, circum),
            function: Function::new(leds, circum, 1000, 10000),
            countdown: Countdown::new(leds, circum),
            state: HatState::Function,
            allow_function: true,
        }
    }

    pub fn get_leds_string(&mut self) -> String {
        self.get_leds()
            .iter()
            .map(|led| led.to_string())
            .collect::<Vec<_>>()
            .join("")
    }

    pub fn set_co2(&mut self, co2: u16) {
        self.icons.set_co2(co2);
    }

    pub fn get_leds_binary(&mut self) -> Vec<u8> {
        self.get_leds()
            .iter()
            .flat_map(|led| vec![led.red(), led.green(), led.blue()])
            .collect()
    }

    pub fn get_status(&self) -> HatStatus {
        HatStatus {
            command: match self.state {
                HatState::Function => AdminCommand::AllowFunction,
                HatState::Icon => AdminCommand::Icon(self.icons.get_icon()),
                HatState::Countdown => {
                    AdminCommand::Countdown(self.countdown.get_minutes(Self::get_time()))
                }
            },
            formulas_queue: self.function.queue_len(),
            allow_function: self.allow_function,
        }
    }

    pub fn add_formula(&mut self, fs: FormulaStrings) {
        self.function.add_formula(fs);
        if self.allow_function && self.state != HatState::Function {
            self.set_state(HatState::Function);
        }
    }

    pub fn set_state(&mut self, state: HatState) {
        self.allow_function = state == HatState::Function;
        self.state = state;
    }

    pub fn allow_function(&mut self) {
        self.allow_function = true;
    }

    pub fn start_countdown(&mut self, seconds: u128) {
        self.countdown
            .set_countdown(Self::get_time() + seconds * 1000);
        self.set_state(HatState::Countdown);
    }

    pub fn show_icon(&mut self, icon: IconType) {
        self.icons.set_icon(icon);
        self.set_state(HatState::Icon);
    }

    pub fn get_time() -> u128 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    }

    fn get_leds(&mut self) -> Vec<LED> {
        let time = Self::get_time();

        match self.state {
            HatState::Function => {
                self.function.check_formulas(time);
                self.function.get_leds(time)
            }
            HatState::Icon => self.icons.get_leds(time),
            HatState::Countdown => self.countdown.get_leds(time),
        }
    }
}
