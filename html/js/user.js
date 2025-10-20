// User interface functionality
class UserInterface {
  constructor() {
    this.apiBaseUrl = window.location.origin;
    this.ledSimulation = null;
    this.formulaParser = new FormulaParser();
    this.checkInterval = null;
    this.history = [];

    this.initializeInterface();
  }

  initializeInterface() {
    // Always show the user interface first (ignore API status)
    this.showUserInterface();

    // Initialize LED simulation after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.ledSimulation = new LEDSimulation();
      this.updateExampleButton(); // Initialize button state
    }, 100);

    // Load formula history
    this.loadHistory();

    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Time slider
    const timeSlider = document.getElementById("time-slider");
    if (timeSlider) {
      timeSlider.addEventListener("input", () => {
        this.updateTimeSimulation();
      });
    }

    // Formula inputs
    ["red-formula", "green-formula", "blue-formula"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener("input", () => {
          this.updatePreview();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            this.submitFormula();
          }
        });
      }
    });

    // Example dropdown
    const exampleSelect = document.getElementById("example-select");
    if (exampleSelect) {
      exampleSelect.addEventListener("change", () => {
        this.updateExampleButton();
      });
    }
  }

  showUserInterface() {
    // Always show the user interface and hide access restrictions
    const accessText = document.getElementById("access-text");
    const noAccessDiv = document.getElementById("no-access");
    const userInterfaceDiv = document.getElementById("user-interface");

    if (accessText) {
      accessText.textContent = "Standalone Mode";
    }
    if (noAccessDiv) {
      noAccessDiv.style.display = "none";
    }
    if (userInterfaceDiv) {
      userInterfaceDiv.style.display = "block";
    }
  }

  updateCountdownDisplay(remainingMs) {
    const countdownTime = document.getElementById("countdown-time");
    if (countdownTime && remainingMs > 0) {
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      countdownTime.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  updatePreview() {
    const redFormula = document.getElementById("red-formula")?.value || "";
    const greenFormula = document.getElementById("green-formula")?.value || "";
    const blueFormula = document.getElementById("blue-formula")?.value || "";

    // Update preview text
    this.updateFormulaPreview("red-preview", redFormula);
    this.updateFormulaPreview("green-preview", greenFormula);
    this.updateFormulaPreview("blue-preview", blueFormula);

    // Update LED simulation
    const currentTime = parseFloat(
      document.getElementById("time-slider")?.value || 0,
    );
    this.ledSimulation.updateLEDs(
      redFormula,
      greenFormula,
      blueFormula,
      currentTime,
    );
  }

  updateFormulaPreview(previewId, formula) {
    const previewElement = document.getElementById(previewId);
    if (!previewElement) return;

    if (!formula.trim()) {
      previewElement.textContent = "";
      return;
    }

    const validation = this.formulaParser.validate(formula);
    if (validation.valid) {
      const infix = this.formulaParser.toInfix(formula);
      previewElement.textContent = infix;
      previewElement.style.color = "#4CAF50";
    } else {
      previewElement.textContent = validation.errors[0] || "Invalid formula";
      previewElement.style.color = "#f44336";
    }
  }

  updateTimeSimulation() {
    const timeSlider = document.getElementById("time-slider");
    const timeValue = document.getElementById("time-value");

    if (timeSlider && timeValue) {
      const time = parseFloat(timeSlider.value);
      timeValue.textContent = time.toFixed(1);
      this.ledSimulation.setTime(time);
    }
  }

  toggleAnimation() {
    const playBtn = document.getElementById("play-btn");
    if (!playBtn) return;

    if (this.ledSimulation.isPlaying) {
      this.ledSimulation.stopAnimation();
      playBtn.textContent = "Play Animation";
    } else {
      this.ledSimulation.startAnimation();
      playBtn.textContent = "Pause Animation";
    }
  }

  resetTime() {
    this.ledSimulation.resetTime();
    const playBtn = document.getElementById("play-btn");
    if (playBtn && this.ledSimulation.isPlaying) {
      this.ledSimulation.stopAnimation();
      playBtn.textContent = "Play Animation";
    }
  }

  submitFormula() {
    const redFormula = document.getElementById("red-formula")?.value || "";
    const greenFormula = document.getElementById("green-formula")?.value || "";
    const blueFormula = document.getElementById("blue-formula")?.value || "";

    // Validate formulas
    const redValidation = this.formulaParser.validate(redFormula);
    const greenValidation = this.formulaParser.validate(greenFormula);
    const blueValidation = this.formulaParser.validate(blueFormula);

    if (
      !redValidation.valid ||
      !greenValidation.valid ||
      !blueValidation.valid
    ) {
      this.showStatusMessage(
        "Please fix formula errors before submitting",
        "error",
      );
      return;
    }

    // In standalone mode, just add to history and show success
    this.showStatusMessage("Formula saved to local history!", "success");
    this.addToHistory(redFormula, greenFormula, blueFormula);
  }

  clearFormulas() {
    document.getElementById("red-formula").value = "";
    document.getElementById("green-formula").value = "";
    document.getElementById("blue-formula").value = "";

    // Clear previews
    document.getElementById("red-preview").textContent = "";
    document.getElementById("green-preview").textContent = "";
    document.getElementById("blue-preview").textContent = "";

    // Clear simulation
    this.ledSimulation.clearLEDs();
  }

  loadExample(patternName = "rainbow") {
    const pattern = this.ledSimulation.loadExamplePattern(patternName);

    document.getElementById("red-formula").value = pattern.red;
    document.getElementById("green-formula").value = pattern.green;
    document.getElementById("blue-formula").value = pattern.blue;

    this.updatePreview();
  }

  loadSelectedExample() {
    const selectElement = document.getElementById("example-select");
    const selectedPattern = selectElement.value;

    if (!selectedPattern) {
      this.showStatusMessage("Please select an example pattern first", "error");
      return;
    }

    this.loadExample(selectedPattern);
    this.showStatusMessage(`${selectedPattern.charAt(0).toUpperCase() + selectedPattern.slice(1)} pattern loaded!`, "success");
  }

  updateExampleButton() {
    const selectElement = document.getElementById("example-select");
    const exampleButton = document.getElementById("example-btn");

    if (selectElement && exampleButton) {
      const hasSelection = selectElement.value !== "";
      exampleButton.disabled = !hasSelection;

      if (hasSelection) {
        exampleButton.textContent = `Load ${selectElement.options[selectElement.selectedIndex].text}`;
      } else {
        exampleButton.textContent = "Load Example";
      }
    }
  }

  showStatusMessage(message, type) {
    const statusElement = document.getElementById("submission-status");
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = "block";

    // Hide after 5 seconds
    setTimeout(() => {
      statusElement.style.display = "none";
    }, 5000);
  }

  addToHistory(red, green, blue) {
    const historyItem = {
      timestamp: Date.now(),
      red: red,
      green: green,
      blue: blue,
    };

    this.history.unshift(historyItem);

    // Keep only last 20 items
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }

    this.saveHistory();
    this.renderHistory();
  }

  saveHistory() {
    try {
      localStorage.setItem("formula_history", JSON.stringify(this.history));
    } catch (error) {
      console.warn("Could not save history to localStorage:", error);
    }
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem("formula_history");
      if (stored) {
        this.history = JSON.parse(stored);
        this.renderHistory();
      }
    } catch (error) {
      console.warn("Could not load history from localStorage:", error);
      this.history = [];
    }
  }

  renderHistory() {
    const historyContainer = document.getElementById("formula-history");
    if (!historyContainer) return;

    historyContainer.innerHTML = "";

    if (this.history.length === 0) {
      historyContainer.innerHTML =
        '<p style="color: #ccc; text-align: center;">No formulas in history</p>';
      return;
    }

    this.history.forEach((item, index) => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";
      historyItem.onclick = () => this.loadFromHistory(item);

      const timestamp = new Date(item.timestamp).toLocaleString();

      historyItem.innerHTML = `
                <div class="timestamp">${timestamp}</div>
                <div class="formulas">
                    <div class="formula-line red">R: ${item.red || "(empty)"}</div>
                    <div class="formula-line green">G: ${item.green || "(empty)"}</div>
                    <div class="formula-line blue">B: ${item.blue || "(empty)"}</div>
                </div>
            `;

      historyContainer.appendChild(historyItem);
    });
  }

  loadFromHistory(item) {
    document.getElementById("red-formula").value = item.red || "";
    document.getElementById("green-formula").value = item.green || "";
    document.getElementById("blue-formula").value = item.blue || "";

    this.updatePreview();
    this.showStatusMessage("Formula loaded from history", "success");
  }

  // Removed periodic status checks - not needed in standalone mode

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    if (this.ledSimulation) {
      this.ledSimulation.destroy();
    }
  }
}

// Global functions for HTML onclick handlers
let userInterface;

function updatePreview() {
  if (userInterface && userInterface.ledSimulation) {
    userInterface.updatePreview();
  }
}

function updateTimeSimulation() {
  if (userInterface && userInterface.ledSimulation) {
    userInterface.updateTimeSimulation();
  }
}

function toggleAnimation() {
  if (userInterface && userInterface.ledSimulation) {
    userInterface.toggleAnimation();
  }
}

function resetTime() {
  if (userInterface && userInterface.ledSimulation) {
    userInterface.resetTime();
  }
}

function submitFormula() {
  if (userInterface) {
    userInterface.submitFormula();
  }
}

function clearFormulas() {
  if (userInterface) {
    userInterface.clearFormulas();
  }
}

function loadExample() {
  if (userInterface) {
    userInterface.loadExample();
  }
}

function loadSelectedExample() {
  if (userInterface) {
    userInterface.loadSelectedExample();
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  userInterface = new UserInterface();
});

// Cleanup when page unloads
window.addEventListener("beforeunload", () => {
  if (userInterface) {
    userInterface.destroy();
  }
});
