// ============ CENTRALIZED AUTHENTICATION MANAGER ============

class AuthManager {
    constructor() {
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        this.tokenExpiresAt = null;
        this.refreshTimer = null;

        // Initialize from localStorage
        this.loadFromStorage();

        // Setup automatic token refresh
        this.setupTokenRefresh();

        // Setup event listeners
        this.setupEventListeners();
    }

    // ============ TOKEN MANAGEMENT ============

    setTokens(accessToken, refreshToken, expiresAt) {
        this.token = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpiresAt = new Date(expiresAt);

        // Save to localStorage
        localStorage.setItem('auth_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('token_expires_at', expiresAt);

        // Setup refresh timer
        this.setupTokenRefresh();

        console.log('✅ Tokens set successfully, expires at:', this.tokenExpiresAt);
    }

    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        this.tokenExpiresAt = null;

        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expires_at');
        localStorage.removeItem('user_data');

        // Clear refresh timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        console.log('🧹 Tokens cleared');
        this.dispatchEvent('auth:logout');
    }

    loadFromStorage() {
        this.token = localStorage.getItem('auth_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        const expiresAt = localStorage.getItem('token_expires_at');
        const userData = localStorage.getItem('user_data');

        if (expiresAt) {
            this.tokenExpiresAt = new Date(expiresAt);
        }

        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                localStorage.removeItem('user_data');
            }
        }

        // Check if token is expired
        if (this.token && this.tokenExpiresAt && new Date() >= this.tokenExpiresAt) {
            console.log('⏰ Token expired, attempting refresh');
            this.refreshTokens();
        }
    }

    setupTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        if (!this.tokenExpiresAt) return;

        // Refresh token 5 minutes before expiry
        const refreshTime = this.tokenExpiresAt.getTime() - Date.now() - (5 * 60 * 1000);

        if (refreshTime > 0) {
            this.refreshTimer = setTimeout(() => {
                this.refreshTokens();
            }, refreshTime);

            console.log(`🔄 Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);
        } else {
            // Token expires soon, refresh now
            this.refreshTokens();
        }
    }

    async refreshTokens() {
        if (!this.refreshToken) {
            console.log('❌ No refresh token available');
            this.logout();
            return false;
        }

        try {
            console.log('🔄 Refreshing tokens...');

            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: this.refreshToken
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.setTokens(
                    data.data.access_token,
                    data.data.refresh_token,
                    data.data.expires_at
                );

                console.log('✅ Tokens refreshed successfully');
                this.dispatchEvent('auth:token-refreshed');
                return true;
            } else {
                console.error('❌ Token refresh failed:', data.error);
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            this.logout();
            return false;
        }
    }

    // ============ AUTHENTICATION METHODS ============

    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({email, password})
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Set tokens
                this.setTokens(
                    data.data.access_token,
                    data.data.refresh_token,
                    data.data.expires_at
                );

                // Set user data
                this.user = data.data.user;
                localStorage.setItem('user_data', JSON.stringify(this.user));

                console.log('✅ Login successful:', this.user.email);
                this.dispatchEvent('auth:login', {user: this.user});

                return {success: true, user: this.user};
            } else {
                console.error('❌ Login failed:', data.error);
                return {success: false, error: data.error};
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            return {success: false, error: 'Network error'};
        }
    }

    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Auto-login after registration
                this.setTokens(
                    data.data.access_token,
                    data.data.refresh_token,
                    data.data.expires_at
                );

                this.user = data.data.user;
                localStorage.setItem('user_data', JSON.stringify(this.user));

                console.log('✅ Registration successful:', this.user.email);
                this.dispatchEvent('auth:register', {user: this.user});

                return {success: true, user: this.user};
            } else {
                console.error('❌ Registration failed:', data.error);
                return {success: false, error: data.error};
            }
        } catch (error) {
            console.error('❌ Registration error:', error);
            return {success: false, error: 'Network error'};
        }
    }

    async logout() {
        try {
            if (this.token) {
                // Inform server about logout
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    }
                });
            }
        } catch (error) {
            console.error('Logout API call failed:', error);
        }

        this.clearTokens();
        console.log('👋 Logged out');
    }

    // ============ API REQUEST HELPERS ============

    async makeAuthenticatedRequest(url, options = {}) {
        // Ensure we have a valid token
        // if (!this.isAuthenticated()) {
        //     throw new Error('Not authenticated');
        // }
        //
        // // Check if token needs refresh
        // if (this.tokenExpiresAt && new Date() >= new Date(this.tokenExpiresAt.getTime() - 60000)) {
        //     const refreshed = await this.refreshTokens();
        //     if (!refreshed) {
        //         throw new Error('Token refresh failed');
        //     }
        // }
        //
        // // Add authorization header
        // const headers = {
        //     'Authorization': `Bearer ${this.token}`,
        //     'Content-Type': 'application/json',
        //     ...options.headers
        // };

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle authentication errors
        if (response.status === 401) {
            const data = await response.json();

            if (data.code === 'TOKEN_EXPIRED') {
                console.log('🔄 Token expired during request, refreshing...');
                const refreshed = await this.refreshTokens();
                if (refreshed) {
                    // Retry the request with new token
                    headers['Authorization'] = `Bearer ${this.token}`;
                    return fetch(url, {...options, headers});
                }
            }

            console.log('🚫 Authentication failed, logging out');
            await this.logout();
            throw new Error('Authentication failed');
        }

        return response;
    }

    // ============ UTILITY METHODS ============

    isAuthenticated() {
        return !!(this.token && this.user && this.tokenExpiresAt && new Date() < this.tokenExpiresAt);
    }

    getUser() {
        return this.user;
    }

    getUserRole() {
        return this.user?.role || null;
    }

    hasRole(role) {
        return this.getUserRole() === role;
    }

    isAdmin() {
        return this.hasRole('admin');
    }

    getToken() {
        return this.token;
    }

    getTimeUntilExpiry() {
        if (!this.tokenExpiresAt) return 0;
        return Math.max(0, this.tokenExpiresAt.getTime() - Date.now());
    }

    // ============ EVENT SYSTEM ============

    setupEventListeners() {
        // Listen for storage changes (multi-tab support)
        window.addEventListener('storage', (e) => {
            if (e.key === 'auth_token' && e.newValue !== this.token) {
                console.log('🔄 Token changed in another tab');
                this.loadFromStorage();
                this.dispatchEvent('auth:token-changed');
            }
        });

        // Listen for page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                // Check token validity when page becomes visible
                this.validateToken();
            }
        });
    }

    dispatchEvent(eventName, detail = {}) {
        window.dispatchEvent(new CustomEvent(eventName, {detail}));
    }

    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.valid) {
                    return true;
                }
            }

            console.log('🚫 Token validation failed');
            this.logout();
            return false;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    // ============ DEBUGGING ============

    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated(),
            user: this.user,
            tokenExpiresAt: this.tokenExpiresAt,
            timeUntilExpiry: this.getTimeUntilExpiry(),
            hasToken: !!this.token,
            hasRefreshToken: !!this.refreshToken
        };
    }
}

// ============ GLOBAL INSTANCE ============

// Create global auth manager instance
window.authManager = new AuthManager();

// Convenience methods
window.isAuthenticated = () => window.authManager.isAuthenticated();
window.getCurrentUser = () => window.authManager.getUser();
window.makeAuthenticatedRequest = (url, options) => window.authManager.makeAuthenticatedRequest(url, options);

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

console.log('🔐 AuthManager initialized');
