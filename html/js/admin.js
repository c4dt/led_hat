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

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/admin/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ secret })
            });

            if (response.ok) {
                this.authenticated = true;
                sessionStorage.setItem('admin_authenticated', 'true');
                sessionStorage.setItem('admin_secret', secret);
                this.showAdminPanel();
                errorDiv.style.display = 'none';
            } else {
                this.showError('Invalid admin secret');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            this.showError('Authentication failed. Please try again.');
        }
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
            const response = await this.makeAuthenticatedRequest('/api/admin/countdown', {
                method: 'POST',
                body: JSON.stringify({ minutes })
            });

            if (response.ok) {
                this.updateTimer();
                this.showSuccessMessage(`${minutes} minute countdown started`);
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

    async resetCountdown() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/countdown/reset', {
                method: 'POST'
            });

            if (response.ok) {
                this.updateTimer();
                this.showSuccessMessage('Countdown reset');
            } else {
                this.showErrorMessage('Failed to reset countdown');
            }
        } catch (error) {
            console.error('Error resetting countdown:', error);
            this.showErrorMessage('Failed to reset countdown');
        }
    }

    async enableUserAccess() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/access', {
                method: 'POST',
                body: JSON.stringify({ enabled: true })
            });

            if (response.ok) {
                this.updateTimer();
                this.showSuccessMessage('User access enabled');
            } else {
                this.showErrorMessage('Failed to enable user access');
            }
        } catch (error) {
            console.error('Error enabling access:', error);
            this.showErrorMessage('Failed to enable user access');
        }
    }

    async updateTimer() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/status');
            const data = await response.json();

            const timeRemaining = document.getElementById('time-remaining');
            const timerStatus = document.getElementById('timer-status');
            const timerDisplay = document.querySelector('.timer-display');

            if (data.countdown_active) {
                const remainingMs = data.remaining_time;
                const minutes = Math.floor(remainingMs / 60000);
                const seconds = Math.floor((remainingMs % 60000) / 1000);

                timeRemaining.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                timerStatus.textContent = 'Countdown Active';

                if (remainingMs <= 0) {
                    timerDisplay.classList.add('expired');
                    timerStatus.textContent = 'Countdown Expired';
                } else {
                    timerDisplay.classList.add('active');
                    timerDisplay.classList.remove('expired');
                }
            } else {
                timeRemaining.textContent = '--:--';
                timerStatus.textContent = data.user_access_enabled ? 'User Access Enabled' : 'No Timer Active';
                timerDisplay.classList.remove('active', 'expired');
            }
        } catch (error) {
            console.error('Error updating timer:', error);
        }
    }

    async updateStats() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/stats');
            const data = await response.json();

            document.getElementById('active-connections').textContent = data.active_connections || '0';
            document.getElementById('formulas-today').textContent = data.formulas_today || '0';
            document.getElementById('system-uptime').textContent = this.formatUptime(data.uptime_seconds || 0);
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async updateStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/status`);
            const data = await response.json();

            const statusText = document.getElementById('status-text');
            statusText.textContent = `System Status: ${data.status || 'Unknown'}`;
        } catch (error) {
            console.error('Error updating status:', error);
            document.getElementById('status-text').textContent = 'System Status: Error';
        }
    }

    async viewLogs() {
        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/logs');
            const logs = await response.text();

            // Create a modal or new window to display logs
            const logWindow = window.open('', 'logs', 'width=800,height=600,scrollbars=yes');
            logWindow.document.write(`
                <html>
                <head>
                    <title>System Logs</title>
                    <style>
                        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
                        pre { white-space: pre-wrap; word-wrap: break-word; }
                    </style>
                </head>
                <body>
                    <h1>System Logs</h1>
                    <pre>${logs}</pre>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('Error viewing logs:', error);
            this.showErrorMessage('Failed to load logs');
        }
    }

    async clearHistory() {
        if (!confirm('Are you sure you want to clear the formula history? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/history/clear', {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccessMessage('Formula history cleared');
            } else {
                this.showErrorMessage('Failed to clear history');
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showErrorMessage('Failed to clear history');
        }
    }

    async restartSystem() {
        if (!confirm('Are you sure you want to restart the system? This will disconnect all users.')) {
            return;
        }

        try {
            const response = await this.makeAuthenticatedRequest('/api/admin/restart', {
                method: 'POST'
            });

            if (response.ok) {
                this.showSuccessMessage('System restart initiated');
                // Redirect to home page after a delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            } else {
                this.showErrorMessage('Failed to restart system');
            }
        } catch (error) {
            console.error('Error restarting system:', error);
            this.showErrorMessage('Failed to restart system');
        }
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const secret = sessionStorage.getItem('admin_secret');
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Secret': secret,
                ...options.headers
            }
        };

        return fetch(`${this.apiBaseUrl}${url}`, { ...defaultOptions, ...options });
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showSuccessMessage(message) {
        // You could implement a toast notification here
        console.log('Success:', message);
        alert(message); // Simple alert for now
    }

    showErrorMessage(message) {
        // You could implement a toast notification here
        console.error('Error:', message);
        alert(`Error: ${message}`); // Simple alert for now
    }

    startPeriodicUpdates() {
        // Update timer every second
        this.timerInterval = setInterval(() => {
            if (this.authenticated) {
                this.updateTimer();
            }
        }, 1000);

        // Update stats every 30 seconds
        this.statsInterval = setInterval(() => {
            if (this.authenticated) {
                this.updateStats();
            }
            this.updateStatus();
        }, 30000);
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

function enableUserAccess() {
    adminInterface.enableUserAccess();
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