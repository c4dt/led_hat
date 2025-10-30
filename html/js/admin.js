// Admin interface functionality
class AdminInterface {
    constructor() {
        this.apiBaseUrl = window.location.origin;
        this.authenticated = false;
        this.timerInterval = null;
        this.statsInterval = null;

        this.initializeInterface();
    }

    initializeInterface() {
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
            } else {
                this.showErrorMessage('Failed to set countdown - check admin secret');
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

    async resetCountdown() {
        // Note: Backend doesn't currently support reset command
        // This would need to be implemented as a new AdminCommand variant
        this.showErrorMessage('Reset countdown feature not yet implemented in backend');
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
            } else {
                this.showErrorMessage('Failed to enable function mode - check admin secret');
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

            // Check if command is Countdown
            if (status.command && status.command.Countdown !== undefined) {
                // Countdown is active - value is in seconds
                const totalSeconds = status.command.Countdown;
                const displayMinutes = Math.floor(totalSeconds / 60);
                const displaySeconds = Math.floor(totalSeconds % 60);

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
                // No countdown active
                timeRemaining.textContent = '--:--';
                timerDisplay.classList.remove('active', 'expired');

                // Show current mode
                if (status.command === 'AllowFunction') {
                    timerStatus.textContent = 'Function Mode';
                } else if (status.command && status.command.Icon) {
                    timerStatus.textContent = `Icon Mode: ${status.command.Icon}`;
                } else {
                    timerStatus.textContent = 'Unknown Mode';
                }
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
            document.getElementById('formulas-today').textContent = status.formulas_queue || '0';

            // Other stats not yet implemented
            document.getElementById('active-connections').textContent = 'N/A';
            document.getElementById('system-uptime').textContent = 'N/A';
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

    async viewLogs() {
        // Note: Backend doesn't have a logs endpoint yet
        this.showErrorMessage('View logs feature not yet implemented in backend');
    }

    async clearHistory() {
        // Note: Backend doesn't have a history clear endpoint yet
        this.showErrorMessage('Clear history feature not yet implemented in backend');
    }

    async restartSystem() {
        // Note: Backend doesn't have a restart endpoint yet
        this.showErrorMessage('Restart system feature not yet implemented in backend');
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

function resetCountdown() {
    adminInterface.resetCountdown();
}

function allowFunction() {
    adminInterface.allowFunction();
}

function viewLogs() {
    adminInterface.viewLogs();
}

function clearHistory() {
    adminInterface.clearHistory();
}

function restartSystem() {
    adminInterface.restartSystem();
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