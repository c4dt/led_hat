// LED simulation for the user interface
class LEDSimulation {
  constructor(ledCount = 50, ringCount = 5) {
    this.ledCount = ledCount;
    this.ringCount = ringCount;
    this.leds = [];
    this.animationId = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.formulaParser = new FormulaParser();

    this.initializeLEDs();

    // Handle window resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener("resize", this.handleResize);
  }

  initializeLEDs() {
    const container = document.getElementById("led-circle");
    if (!container) return;

    container.innerHTML = "";

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerSize = Math.min(containerRect.width, containerRect.height);
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;

    for (let j = 0; j < this.ringCount; j++) {
      const radius = containerSize / 2 - 20 - j * 10; // Leave some margin for LED size
      for (let i = 0; i < this.ledCount; i++) {
        const led = document.createElement("div");
        led.className = "led";
        const index = j * this.ledCount + i;
        led.dataset.index = index;

        // Calculate position around the circle
        const angle = (i / this.ledCount) * 2 * Math.PI - Math.PI / 2; // Start from top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        led.style.left = `${x}px`;
        led.style.top = `${y}px`;

        container.appendChild(led);
        this.leds.push({
          element: led,
          index: index,
          angle: angle,
          x: (i / (this.ledCount - 1)) * 2 - 1,
          y: j / (this.ringCount - 1),
        });
      }
    }
  }

  updateLEDs(redFormula, greenFormula, blueFormula, time = null) {
    if (time !== null) {
      this.currentTime = time;
    }

    this.leds.forEach((led) => {
      const variables = {
        x: led.x,
        y: (led.y + 1) / 2, // Convert from -1,1 to 0,1 range for y
        t: this.currentTime,
      };

      const red = this.formulaParser.evaluateForLED(redFormula, variables);
      const green = this.formulaParser.evaluateForLED(greenFormula, variables);
      const blue = this.formulaParser.evaluateForLED(blueFormula, variables);

      led.element.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
      led.element.style.boxShadow = `0 0 10px rgba(${red}, ${green}, ${blue}, 0.5)`;
    });
  }

  startAnimation() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    const startTime = Date.now() - this.currentTime * 1000;

    const animate = () => {
      if (!this.isPlaying) return;

      this.currentTime = (Date.now() - startTime) / 1000;

      // Get current formulas
      const redFormula = document.getElementById("red-formula")?.value || "";
      const greenFormula =
        document.getElementById("green-formula")?.value || "";
      const blueFormula = document.getElementById("blue-formula")?.value || "";

      this.updateLEDs(redFormula, greenFormula, blueFormula);

      // Update time display
      const timeSlider = document.getElementById("time-slider");
      const timeValue = document.getElementById("time-value");
      if (timeSlider && timeValue) {
        timeSlider.value = this.currentTime % 10; // Loop every 10 seconds
        timeValue.textContent = (this.currentTime % 10).toFixed(1);
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  stopAnimation() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resetTime() {
    this.currentTime = 0;
    const timeSlider = document.getElementById("time-slider");
    const timeValue = document.getElementById("time-value");
    if (timeSlider && timeValue) {
      timeSlider.value = 0;
      timeValue.textContent = "0.0";
    }

    // Update LEDs with current formulas at time 0
    const redFormula = document.getElementById("red-formula")?.value || "";
    const greenFormula = document.getElementById("green-formula")?.value || "";
    const blueFormula = document.getElementById("blue-formula")?.value || "";

    this.updateLEDs(redFormula, greenFormula, blueFormula, 0);
  }

  setTime(time) {
    this.currentTime = time;

    const redFormula = document.getElementById("red-formula")?.value || "";
    const greenFormula = document.getElementById("green-formula")?.value || "";
    const blueFormula = document.getElementById("blue-formula")?.value || "";

    this.updateLEDs(redFormula, greenFormula, blueFormula, time);
  }

  // Generate preview data for the server
  generatePreviewData(redFormula, greenFormula, blueFormula) {
    const ledData = [];

    this.leds.forEach((led) => {
      const variables = {
        x: led.x,
        y: (led.y + 1) / 2,
        t: this.currentTime,
      };

      const red = this.formulaParser.evaluateForLED(redFormula, variables);
      const green = this.formulaParser.evaluateForLED(greenFormula, variables);
      const blue = this.formulaParser.evaluateForLED(blueFormula, variables);

      ledData.push([red, green, blue]);
    });

    return ledData;
  }

  // Convert LED data to hex string (like the server expects)
  ledDataToHex(ledData) {
    let hexString = "";
    ledData.forEach(([r, g, b]) => {
      hexString += r.toString(16).padStart(2, "0");
      hexString += g.toString(16).padStart(2, "0");
      hexString += b.toString(16).padStart(2, "0");
    });
    return hexString;
  }

  // Load example patterns
  loadExamplePattern(patternName = "wave") {
    const patterns = {
      wave: {
        red: "t x + sin 0.5 * 0.5 +",
        green: "t 2 * y + cos 0.3 * 0.7 +",
        blue: "x y + t 0.5 * + sin abs",
      },
      rainbow: {
        red: "x sin 0.5 * 0.5 +",
        green: "x 0.667 + sin 0.5 * 0.5 +",
        blue: "x 1.333 + sin 0.5 * 0.5 +",
      },
      pulse: {
        red: "t 2 * sin abs",
        green: "t 1.5 * sin abs",
        blue: "t sin abs",
      },
      spiral: {
        red: "t x 10 * + sin 0.5 * 0.5 +",
        green: "t x 10 * + 0.667 + sin 0.5 * 0.5 +",
        blue: "t x 10 * + 1.333 + sin 0.5 * 0.5 +",
      },
    };

    return patterns[patternName] || patterns.wave;
  }

  // Clear all LEDs (set to black)
  clearLEDs() {
    this.leds.forEach((led) => {
      led.element.style.backgroundColor = "rgb(0, 0, 0)";
      led.element.style.boxShadow = "none";
    });
  }

  // Get LED count
  getLEDCount() {
    return this.ledCount;
  }

  // Set LED count (reinitialize if different)
  setLEDCount(count) {
    if (count !== this.ledCount) {
      this.ledCount = count;
      this.initializeLEDs();
    }
  }

  // Handle window resize
  handleResize() {
    // Debounce resize events
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.repositionLEDs();
    }, 100);
  }

  // Reposition LEDs without recreating them
  repositionLEDs() {
    const container = document.getElementById("led-circle");
    if (!container || this.leds.length === 0) return;

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const containerSize = Math.min(containerRect.width, containerRect.height);
    const centerX = containerSize / 2;
    const centerY = containerSize / 2;

    this.leds.forEach((led) => {
      const radius = containerSize / 2 - 20 - led.y * 10 * this.ringCount;
      const x = centerX + radius * Math.cos(led.angle);
      const y = centerY + radius * Math.sin(led.angle);

      led.element.style.left = `${x}px`;
      led.element.style.top = `${y}px`;
    });
  }

  // Cleanup method
  destroy() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    window.removeEventListener("resize", this.handleResize);
    this.stopAnimation();
  }
}
