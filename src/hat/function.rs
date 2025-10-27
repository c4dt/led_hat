use crate::hat::leds::LED;

use super::State;

#[derive(Default)]
pub struct Function {
    // width of the LED wall
    width: usize,
    // height of the LED wall
    height: usize,
    // Formulas waiting in the queue
    queue: Vec<Formula>,
    // The current formula, or None
    current: Option<Formula>,
    // Minimum time a formula is shown, in seconds
    time_min: u128,
    // Total time budget divided by the length of the queue, in seconds
    time_total: u128,
    // Start of current formula, in seconds
    time_start: u128,
}

impl State for Function {
    fn get_leds(&mut self, time_ms: u128) -> Vec<super::LED> {
        // Calculate the current state of the LEDs.
        // This needs to do the following:
        // 1. decide if it's time to go to the next formula, based on the
        // time_min, time_total, and time_start
        // 2. then call self.eval() for all LEDs in the hat, but making
        // sure that
        //   - only half of the LEDs are calculated, as the wall
        //   is made up of interleaved LEDs
        //   - the x goes from -1 to 1, as does the y
        // 3. return the LEDs

        // Check if the next formula needs to be added, depending on
        // time_ms and all the self.time_ variables.

        todo!();

        // Calculate LEDs
        let mut leds = vec![];
        if let Some(formula) = &self.current {
            for x in 0..self.width {
                for y in 0..self.height {
                    if x + y % 2 == 1 {
                        // These are the missing LEDs.
                        continue;
                    }
                    let fx = x as f32 / (self.width as f32 - 1.) * 2. - 1.;
                    let fy = y as f32 / (self.height as f32 - 1.);
                    let ft = (time_ms - self.time_start) as f32 / 1000.;
                    leds.push(formula.eval(fx, fy, ft));
                }
            }
        }

        leds
    }
}

impl Function {
    pub fn new() -> Function {
        Self::default()
    }
}

// Stores one formula
struct Formula {
    // The raw formula as received from the frontend.
    raw: String,
    // Whatever interpretation is needed can be added here.
}

impl Formula {
    fn new(raw: String) -> Self {
        // Do any interpretation necessary to the raw string here.
        Self { raw }
    }

    // Returns the value of the LED at this position and time.
    // x, y go from 0 to 1, as in the frontend
    // t goes from 0 to infinity.
    fn eval(&self, x: f32, y: f32, t: f32) -> LED {
        todo!()
    }
}
