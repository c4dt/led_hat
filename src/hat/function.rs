use serde::{Deserialize, Serialize};

use crate::hat::leds::LED;
use std::{collections::VecDeque, f32::consts::PI};

#[derive(Default)]
pub struct Function {
    leds: usize,
    // width of the LED wall
    width: usize,
    // height of the LED wall
    height: usize,
    // Formulas waiting in the queue
    queue: VecDeque<Formula>,
    // The current formula, or None
    current: Option<Formula>,
    // Minimum time a formula is shown, in ms
    time_min: u128,
    // Total time budget divided by the length of the queue, in ms
    time_total: u128,
    // Start of current formula, in ms
    time_start: u128,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FormulaStrings {
    red: String,
    green: String,
    blue: String,
}

impl Function {
    pub fn new(leds: usize, circum: usize, time_min: u128, time_total: u128) -> Function {
        println!("{leds} / {circum} / {}", leds / circum);
        Function {
            leds,
            width: circum * 2 - 1,
            height: leds / circum,
            queue: VecDeque::from([Formula::new("t sin".into(), "x".into(), "y".into())]),
            current: None,
            time_min,
            time_total,
            time_start: 0,
        }
    }

    pub fn add_formula(&mut self, fs: FormulaStrings) {
        self.queue
            .push_back(Formula::new(fs.red, fs.green, fs.blue));
    }

    pub fn _clear_queue(&mut self) {
        self.queue.clear();
        self.current = None;
    }

    pub fn check_formulas(&mut self, time_ms: u128) {
        // Decide if it's time to go to the next formula, based on the
        // time_min, time_total, and time_start

        // Check if we need to advance to the next formula
        let should_advance = if self.current.is_some() && !self.queue.is_empty() {
            let time_since_start = time_ms - self.time_start;
            time_since_start >= self.time_min
                && (time_since_start >= self.time_total / self.queue.len() as u128)
        } else {
            !self.queue.is_empty()
        };

        if should_advance {
            // Move to next formula from queue
            if let Some(form) = self.queue.pop_front() {
                self.current = Some(form);
                self.time_start = time_ms;
            }
        }
    }

    pub fn get_leds(&self, time_ms: u128) -> Vec<super::LED> {
        // Calculate LEDs
        let mut leds = vec![];
        if let Some(formula) = &self.current {
            for y in 0..self.height {
                for x in 0..self.width {
                    if ((x + y) % 2) == 1 {
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

        while leds.len() < self.leds {
            leds.push(LED::black());
        }
        leds
    }

    pub fn queue_len(&self) -> usize {
        self.queue.len()
    }
}

// Stores one formula
struct Formula {
    // The raw formula as received from the frontend.
    // It comes as one string per color.
    red: String,
    green: String,
    blue: String,
}

impl Formula {
    fn new(red: String, green: String, blue: String) -> Self {
        // For now, we store the raw formula and validate during evaluation
        // Future enhancement could pre-parse and validate here
        Self { red, green, blue }
    }

    // Returns the value of the LED at this position and time.
    // x, y go from 0 to 1, as in the frontend
    // t goes from 0 to infinity.
    fn eval(&self, x: f32, y: f32, t: f32) -> LED {
        // Evaluate the formula using reverse Polish notation
        let red = Self::evaluate_rpn(&self.red, x, y, t);
        let green = Self::evaluate_rpn(&self.green, x, y, t);
        let blue = Self::evaluate_rpn(&self.blue, x, y, t);

        // Convert result to LED color
        LED::from_rgb(red, green, blue)
    }

    fn evaluate_rpn(raw: &str, x: f32, y: f32, t: f32) -> u8 {
        let tokens: Vec<&str> = raw.trim().split_whitespace().collect();
        let mut stack: Vec<f32> = Vec::new();

        for token in tokens {
            match token {
                // Numbers
                token if Self::is_number(token) => {
                    if let Ok(num) = token.parse::<f32>() {
                        stack.push(num);
                    }
                }
                // Variables
                "x" => stack.push(x),
                "y" => stack.push(y),
                "t" => stack.push(t),
                // Binary operators
                "+" => {
                    if stack.len() >= 2 {
                        let b = stack.pop().unwrap();
                        let a = stack.pop().unwrap();
                        stack.push(a + b);
                    }
                }
                "-" => {
                    if stack.len() >= 2 {
                        let b = stack.pop().unwrap();
                        let a = stack.pop().unwrap();
                        stack.push(a - b);
                    }
                }
                "*" => {
                    if stack.len() >= 2 {
                        let b = stack.pop().unwrap();
                        let a = stack.pop().unwrap();
                        stack.push(a * b);
                    }
                }
                "/" => {
                    if stack.len() >= 2 {
                        let b = stack.pop().unwrap();
                        let a = stack.pop().unwrap();
                        if b != 0.0 {
                            stack.push(a / b);
                        } else {
                            stack.push(0.0);
                        }
                    }
                }
                "%" => {
                    if stack.len() >= 2 {
                        let b = stack.pop().unwrap();
                        let a = stack.pop().unwrap();
                        if b != 0.0 {
                            stack.push(a % b);
                        } else {
                            stack.push(0.0);
                        }
                    }
                }
                "^" | "pow" => {
                    if stack.len() >= 2 {
                        let b = stack.pop().unwrap();
                        let a = stack.pop().unwrap();
                        stack.push(a.powf(b));
                    }
                }
                // Unary functions
                "cos" => {
                    if let Some(a) = stack.pop() {
                        stack.push((a * PI).cos());
                    }
                }
                "sin" => {
                    if let Some(a) = stack.pop() {
                        stack.push((a * PI).sin());
                    }
                }
                "tan" => {
                    if let Some(a) = stack.pop() {
                        stack.push((a * PI).tan());
                    }
                }
                "acos" => {
                    if let Some(a) = stack.pop() {
                        stack.push(a.acos() / PI);
                    }
                }
                "asin" => {
                    if let Some(a) = stack.pop() {
                        stack.push(a.asin() / PI);
                    }
                }
                "atan" => {
                    if let Some(a) = stack.pop() {
                        stack.push(a.atan() / PI);
                    }
                }
                "sqrt" => {
                    if let Some(a) = stack.pop() {
                        stack.push(a.sqrt());
                    }
                }
                "exp" => {
                    if let Some(a) = stack.pop() {
                        stack.push(a.exp());
                    }
                }
                "abs" => {
                    if let Some(a) = stack.pop() {
                        stack.push(a.abs());
                    }
                }
                // Unknown tokens are ignored
                _ => {}
            }
        }

        // Return the top of the stack or 0 if empty
        (stack.pop().unwrap_or(0.0) / 2. * 256. + 128.).clamp(0., 255.) as u8 / 4
    }

    fn is_number(token: &str) -> bool {
        token.parse::<f32>().is_ok()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_range() {
        let form = Formula::new("x cos".into(), "y cos".into(), "t cos".into());
        let led = form.eval(0., 0., 0.);
        println!("{led:?}");
        let led = form.eval(-1., 0., 0.);
        println!("{led:?}");
        let led = form.eval(1., 1., 1.);
        println!("{led:?}");
    }

    #[test]
    fn test_function() {
        let mut func = Function::new(10, 5, 10, 10);
        func.add_formula(FormulaStrings {
            red: "x cos".into(),
            green: "y cos".into(),
            blue: "t cos".into(),
        });
        println!("{:?}", func.get_leds(0));
    }
}
