// Admin interface functionality
class AdminInterface {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.authenticated = false;
        this.timerInterval = null;
        this.statsInterval = null;
        this.availableIcons = [];

        this.initializeInterface();
    }

    async initializeInterface() {
        // Load available icons first
        await this.loadIcons();

        // Check if already authenticated (from sessionStorage)
        const savedAuth = sessionStorage.getItem('admin_authenticated');
        if (savedAuth === 'true') {
            this.authenticated = true;
            this.showAdminPanel();
        }

        // Start status updates
        this.updateStatus();
        this.startPeriodicUpdates();
    }

    async authenticate() {
        const secretInput = document.getElementById('admin-secret');
        const secret = secretInput.value.trim();
        const errorDiv = document.getElementById('auth-error');

        if (!secret) {
            this.showError('Please enter the admin secret');
            return;
        }

        // Store the secret and show the admin panel
        // Authentication will be verified with actual commands
        sessionStorage.setItem('admin_secret', secret);
        this.authenticated = true;
        sessionStorage.setItem('admin_authenticated', 'true');
        this.showAdminPanel();
        errorDiv.style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    showAdminPanel() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        this.updateTimer();
        this.updateStats();
        this.setupIconSelector();
    }

    logout() {
        // Clear authentication
        this.authenticated = false;
        sessionStorage.removeItem('admin_secret');
        sessionStorage.removeItem('admin_authenticated');

        // Show auth section, hide admin panel
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';

        // Clear the password field
        const secretInput = document.getElementById('admin-secret');
        if (secretInput) {
            secretInput.value = '';
        }

        // Show error message
        this.showError('Authentication failed - please enter the correct admin secret');
    }

    handleUnauthorized() {
        console.warn('Unauthorized access detected - logging out');
        this.logout();
    }

    async loadIcons() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/get_icons`);
            const iconsText = await response.text();

            // Parse comma-separated icon names
            this.availableIcons = iconsText.split(',').map(icon => icon.trim());
        } catch (error) {
            console.error('Error loading icons:', error);
            this.availableIcons = [];
        }
    }

    setupIconSelector() {
        const iconSelect = document.getElementById('icon-select');
        const showIconBtn = document.getElementById('show-icon-btn');

        if (!iconSelect || !this.availableIcons || this.availableIcons.length === 0) {
            console.warn('Icon selector setup failed - no icons available');
            return;
        }

        // Populate dropdown with available icons
        iconSelect.innerHTML = '<option value="">Choose an icon...</option>';
        this.availableIcons.forEach(icon => {
            const option = document.createElement('option');
            option.value = icon;
            option.textContent = icon;
            iconSelect.appendChild(option);
        });

        console.log('Icon selector populated with:', this.availableIcons);

        // Enable/disable button based on selection
        iconSelect.addEventListener('change', () => {
            showIconBtn.disabled = !iconSelect.value;
            if (iconSelect.value) {
                showIconBtn.textContent = `Show ${iconSelect.value}`;
            } else {
                showIconBtn.textContent = 'Show Icon';
            }
        });
    }

    async showSelectedIcon() {
        const iconSelect = document.getElementById('icon-select');
        const selectedIcon = iconSelect?.value;

        if (!selectedIcon) {
            this.showErrorMessage('Please select an icon first');
            return;
        }

        try {
            const secret = sessionStorage.getItem('admin_secret');

            const response = await fetch(`${this.apiBaseUrl}/api/admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    secret: secret,
                    command: { Icon: selectedIcon }
                })
            });

            if (response.ok) {
                this.updateStatus();
                this.showSuccessMessage(`${selectedIcon} icon displayed`);
            } else if (response.status === 401) {
                this.handleUnauthorized();
            } else {
                this.showErrorMessage('Failed to show icon');
            }
        } catch (error) {
            console.error('Error showing icon:', error);
            this.showErrorMessage('Failed to show icon');
        }
    }

    async setCountdown(minutes) {
        try {
            const secret = sessionStorage.getItem('admin_secret');
            const seconds = minutes * 60; // Convert minutes to seconds

            const response = await fetch(`${this.apiBaseUrl}/api/admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    secret: secret,
                    command: { Countdown: seconds }
                })
            });

            if (response.ok) {
                this.updateTimer();
                this.updateStatus();
                this.showSuccessMessage(`${minutes} minute countdown started`);
            } else if (response.status === 401) {
                this.handleUnauthorized();
            } else {
                this.showErrorMessage('Failed to set countdown');
            }
        } catch (error) {
            console.error('Error setting countdown:', error);
            this.showErrorMessage('Failed to set countdown');
        }
    }

    async setCustomCountdown() {
        const customMinutes = document.getElementById('custom-minutes').value;
        const minutes = parseInt(customMinutes);

        if (!minutes || minutes < 1 || minutes > 180) {
            this.showErrorMessage('Please enter a valid number of minutes (1-180)');
            return;
        }

        await this.setCountdown(minutes);
        document.getElementById('custom-minutes').value = '';
    }

    async allowFunction() {
        try {
            const secret = sessionStorage.getItem('admin_secret');

            const response = await fetch(`${this.apiBaseUrl}/api/admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    secret: secret,
                    command: 'AllowFunction'
                })
            });

            if (response.ok) {
                this.updateStatus();
                this.showSuccessMessage('Function mode enabled');
            } else if (response.status === 401) {
                this.handleUnauthorized();
            } else {
                this.showErrorMessage('Failed to enable function mode');
            }
        } catch (error) {
            console.error('Error enabling function mode:', error);
            this.showErrorMessage('Failed to enable function mode');
        }
    }

    async updateTimer() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/get_status`);
            const status = await response.json();

            const timeRemaining = document.getElementById('time-remaining');
            const timerStatus = document.getElementById('timer-status');
            const timerDisplay = document.querySelector('.timer-display');
            const currentTimerSection = document.querySelector('.current-timer');

            // Check if command is Countdown
            if (status.command && status.command.Countdown !== undefined) {
                // Countdown is active - show the section and value is in seconds
                const totalSeconds = status.command.Countdown;
                const displayMinutes = Math.floor(totalSeconds / 60);
                const displaySeconds = Math.floor(totalSeconds % 60);

                currentTimerSection.style.display = 'block';
                timerStatus.textContent = 'Countdown Active';
                timerDisplay.classList.add('active');
                timerDisplay.classList.remove('expired');
                timeRemaining.textContent = `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;

                // Check if expired
                if (totalSeconds <= 0) {
                    timerDisplay.classList.add('expired');
                    timerDisplay.classList.remove('active');
                    timerStatus.textContent = 'Countdown Expired';
                }
            } else {
                // No countdown active - hide the section
                currentTimerSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating timer:', error);
        }
    }

    async updateStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/get_status`);
            const status = await response.json();

            // Update formulas queue from status
            document.getElementById('formulas-queue').textContent = status.formulas_queue || '0';
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async updateStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/get_status`);
            const status = await response.json();

            const statusText = document.getElementById('status-text');

            // Determine current mode from command
            let mode = 'Unknown';
            if (status.command === 'AllowFunction') {
                mode = 'Function Mode';
            } else if (status.command && status.command.Countdown !== undefined) {
                mode = 'Countdown Mode';
            } else if (status.command && status.command.Icon) {
                mode = 'Icon Mode';
            }

            statusText.textContent = `System Status: ${mode}`;
        } catch (error) {
            console.error('Error updating status:', error);
            document.getElementById('status-text').textContent = 'System Status: Error';
        }
    }


    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showSuccessMessage(message) {
        console.log('Success:', message);
        // Display message in status text temporarily
        const statusText = document.getElementById('status-text');
        if (statusText) {
            const originalText = statusText.textContent;
            statusText.textContent = `✓ ${message}`;
            statusText.style.color = '#4CAF50';
            setTimeout(() => {
                statusText.textContent = originalText;
                statusText.style.color = '';
            }, 3000);
        }
    }

    showErrorMessage(message) {
        console.error('Error:', message);
        // Display error in status text temporarily
        const statusText = document.getElementById('status-text');
        if (statusText) {
            const originalText = statusText.textContent;
            statusText.textContent = `✗ ${message}`;
            statusText.style.color = '#f44336';
            setTimeout(() => {
                statusText.textContent = originalText;
                statusText.style.color = '';
            }, 3000);
        }
    }

    startPeriodicUpdates() {
        // Update timer, status, and stats every 2 seconds
        this.timerInterval = setInterval(() => {
            if (this.authenticated) {
                this.updateTimer();
                this.updateStats();
            }
            // Always update status (visible before auth)
            this.updateStatus();
        }, 2000);
    }
}

// Global functions for HTML onclick handlers
let adminInterface;

function authenticate() {
    adminInterface.authenticate();
}

function setCountdown(minutes) {
    adminInterface.setCountdown(minutes);
}

function setCustomCountdown() {
    adminInterface.setCustomCountdown();
}

function allowFunction() {
    adminInterface.allowFunction();
}

function showSelectedIcon() {
    adminInterface.showSelectedIcon();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminInterface = new AdminInterface();
});

// Handle Enter key in password field
document.addEventListener('DOMContentLoaded', () => {
    const secretInput = document.getElementById('admin-secret');
    secretInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            authenticate();
        }
    });
});