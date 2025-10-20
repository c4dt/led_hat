// Reverse Polish Notation formula parser for LED Hat
class FormulaParser {
  constructor() {
    // Available functions
    this.functions = {
      cos: (a) => Math.cos(a * Math.PI),
      sin: (a) => Math.sin(a * Math.PI),
      tan: (a) => Math.tan(a * Math.PI),
      acos: (a) => Math.acos(a) / Math.PI,
      asin: (a) => Math.asin(a) / Math.PI,
      atan: (a) => Math.atan(a) / Math.PI,
      sqrt: Math.sqrt,
      exp: Math.exp,
      abs: Math.abs,
      pow: (a, b) => Math.pow(a, b),
      "+": (a, b) => a + b,
      "-": (a, b) => a - b,
      "*": (a, b) => a * b,
      "/": (a, b) => a / b,
      "%": (a, b) => a % b,
      "^": (a, b) => Math.pow(a, b),
    };

    // Binary operators (require two operands)
    this.binaryOperators = ["+", "-", "*", "/", "%", "^", "pow"];

    // Unary functions (require one operand)
    this.unaryFunctions = [
      "cos",
      "sin",
      "tan",
      "acos",
      "asin",
      "atan",
      "sqrt",
      "exp",
      "abs",
    ];
  }

  // Parse and evaluate a reverse Polish notation formula
  evaluate(formula, variables) {
    if (!formula || formula.trim() === "") {
      return 0;
    }

    const tokens = formula.trim().split(/\s+/);
    const stack = [];

    try {
      for (let token of tokens) {
        if (this.isNumber(token)) {
          stack.push(parseFloat(token));
        } else if (variables.hasOwnProperty(token)) {
          stack.push(variables[token]);
        } else if (this.functions.hasOwnProperty(token)) {
          if (this.binaryOperators.includes(token)) {
            if (stack.length < 2) {
              throw new Error(
                `Binary operator '${token}' requires two operands`,
              );
            }
            const b = stack.pop();
            const a = stack.pop();
            stack.push(this.functions[token](a, b));
          } else if (this.unaryFunctions.includes(token)) {
            if (stack.length < 1) {
              throw new Error(`Unary function '${token}' requires one operand`);
            }
            const a = stack.pop();
            stack.push(this.functions[token](a));
          } else {
            throw new Error(`Unknown function: ${token}`);
          }
        } else {
          // Unknown token - stop parsing here
          break;
        }
      }

      if (stack.length === 1) {
        return stack[0];
      } else if (stack.length > 1) {
        // Return the top of stack if multiple values remain
        return stack[stack.length - 1];
      } else {
        return 0;
      }
    } catch (error) {
      console.warn(`Formula evaluation error: ${error.message}`);
      return 0;
    }
  }

  // Check if a token is a number
  isNumber(token) {
    return !isNaN(parseFloat(token)) && isFinite(parseFloat(token));
  }

  // Validate a formula without evaluating it
  validate(formula) {
    if (!formula || formula.trim() === "") {
      return { valid: true, errors: [] };
    }

    const tokens = formula.trim().split(/\s+/);
    const errors = [];
    const stack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (this.isNumber(token)) {
        stack.push("number");
      } else if (["x", "y", "t"].includes(token)) {
        stack.push("variable");
      } else if (this.functions.hasOwnProperty(token)) {
        if (this.binaryOperators.includes(token)) {
          if (stack.length < 2) {
            errors.push(
              `Token ${i + 1} ('${token}'): Binary operator requires two operands`,
            );
          } else {
            stack.pop();
            stack.pop();
            stack.push("result");
          }
        } else if (this.unaryFunctions.includes(token)) {
          if (stack.length < 1) {
            errors.push(
              `Token ${i + 1} ('${token}'): Unary function requires one operand`,
            );
          } else {
            stack.pop();
            stack.push("result");
          }
        }
      } else {
        errors.push(`Token ${i + 1} ('${token}'): Unknown token`);
        // Stop validation at first unknown token
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      stackSize: stack.length,
    };
  }

  // Convert RPN to infix notation for display
  toInfix(formula) {
    if (!formula || formula.trim() === "") {
      return "";
    }

    const tokens = formula.trim().split(/\s+/);
    const stack = [];

    try {
      for (let token of tokens) {
        if (this.isNumber(token) || ["x", "y", "t"].includes(token)) {
          stack.push(token);
        } else if (this.functions.hasOwnProperty(token)) {
          if (this.binaryOperators.includes(token)) {
            if (stack.length < 2) {
              return `Error: ${token} needs two operands`;
            }
            const b = stack.pop();
            const a = stack.pop();
            if (token === "pow") {
              stack.push(`pow(${a}, ${b})`);
            } else {
              stack.push(`(${a} ${token} ${b})`);
            }
          } else if (this.unaryFunctions.includes(token)) {
            if (stack.length < 1) {
              return `Error: ${token} needs one operand`;
            }
            const a = stack.pop();
            stack.push(`${token}(${a})`);
          }
        } else {
          // Unknown token - stop here
          break;
        }
      }

      return stack.length > 0 ? stack[stack.length - 1] : "";
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  // Get available functions and operators for help
  getAvailableFunctions() {
    return {
      unary: this.unaryFunctions,
      binary: this.binaryOperators,
      variables: ["x", "y", "t"],
    };
  }

  // Clamp value to valid LED color range (0-255)
  clampToLEDRange(value) {
    if (isNaN(value) || !isFinite(value)) {
      return 0;
    }

    // Normalize to -1 .. 1 range first, then to 0-255
    let normalized = value <= 1 ? (value >= -1 ? value : -1) : 1;

    return Math.floor(((normalized + 1) / 2) * 256);
  }

  // Evaluate formula for LED color (returns 0-255)
  evaluateForLED(formula, variables) {
    const result = this.evaluate(formula, variables);
    return this.clampToLEDRange(result);
  }
}
