// ============ AUTHENTICATION JAVASCRIPT - AIWAVE INSPIRED ============

class AuthPageManager {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.currentPage = this.detectCurrentPage();
        
        // Wait for global auth manager to be ready
        this.waitForAuthManager().then(() => {
            this.init();
        });
    }

    async waitForAuthManager() {
        while (typeof window.authManager === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('✅ AuthManager ready for auth page');
    }

    init() {
        this.bindEvents();
        this.initializePasswordToggles();
        this.initializePasswordStrength();
        this.checkAuthRedirect();
        
        console.log('🔐 AuthManager initialized for page:', this.currentPage);
    }

    detectCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'register';
        return 'unknown';
    }

    bindEvents() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Demo button
        const demoButton = document.getElementById('demoButton');
        if (demoButton) {
            demoButton.addEventListener('click', () => this.handleDemo());
        }

        // Social login buttons
        const googleButton = document.querySelector('.google-button');
        const githubButton = document.querySelector('.github-button');
        
        if (googleButton) {
            googleButton.addEventListener('click', () => this.handleSocialLogin('google'));
        }
        
        if (githubButton) {
            githubButton.addEventListener('click', () => this.handleSocialLogin('github'));
        }

        // Plan selection
        const planItems = document.querySelectorAll('.plan-item');
        planItems.forEach(item => {
            item.addEventListener('click', () => this.selectPlan(item));
        });

        // Real-time validation
        if (this.currentPage === 'register') {
            this.initializeValidation();
        }
    }

    initializePasswordToggles() {
        const toggles = document.querySelectorAll('.password-toggle');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const input = toggle.parentElement.querySelector('.form-input');
                const icon = toggle.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
    }

    initializePasswordStrength() {
        const passwordInput = document.getElementById('password');
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        if (passwordInput && strengthBar && strengthText) {
            passwordInput.addEventListener('input', (e) => {
                const password = e.target.value;
                const strength = this.calculatePasswordStrength(password);
                
                strengthBar.style.width = `${strength.percentage}%`;
                strengthText.textContent = strength.label;
                
                // Update color based on strength
                if (strength.percentage < 30) {
                    strengthBar.style.background = '#ff4757';
                } else if (strength.percentage < 70) {
                    strengthBar.style.background = '#ffa502';
                } else {
                    strengthBar.style.background = '#39e575';
                }
            });
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        let label = 'Bardzo słabe';

        if (password.length >= 6) score += 20;
        if (password.length >= 8) score += 20;
        if (/[a-z]/.test(password)) score += 15;
        if (/[A-Z]/.test(password)) score += 15;
        if (/\d/.test(password)) score += 15;
        if (/[^a-zA-Z\d]/.test(password)) score += 15;

        if (score >= 80) label = 'Bardzo silne';
        else if (score >= 60) label = 'Silne';
        else if (score >= 40) label = 'Średnie';
        else if (score >= 20) label = 'Słabe';

        return { percentage: score, label };
    }

    initializeValidation() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (emailInput) {
            emailInput.addEventListener('blur', () => this.validateEmail(emailInput.value));
        }

        if (passwordInput) {
            passwordInput.addEventListener('blur', () => this.validatePassword(passwordInput.value));
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('blur', () => {
                this.validatePasswordConfirmation(passwordInput.value, confirmPasswordInput.value);
            });
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errorElement = document.getElementById('emailError');
        
        if (!email) {
            this.showFieldError(errorElement, 'Email jest wymagany');
            return false;
        } else if (!emailRegex.test(email)) {
            this.showFieldError(errorElement, 'Nieprawidłowy format email');
            return false;
        } else {
            this.clearFieldError(errorElement);
            return true;
        }
    }

    validatePassword(password) {
        const errorElement = document.getElementById('passwordError');
        
        if (!password) {
            this.showFieldError(errorElement, 'Hasło jest wymagane');
            return false;
        } else if (password.length < 6) {
            this.showFieldError(errorElement, 'Hasło musi mieć minimum 6 znaków');
            return false;
        } else {
            this.clearFieldError(errorElement);
            return true;
        }
    }

    validatePasswordConfirmation(password, confirmPassword) {
        const errorElement = document.getElementById('confirmPasswordError');
        
        if (!confirmPassword) {
            this.showFieldError(errorElement, 'Potwierdź hasło');
            return false;
        } else if (password !== confirmPassword) {
            this.showFieldError(errorElement, 'Hasła nie są identyczne');
            return false;
        } else {
            this.clearFieldError(errorElement);
            return true;
        }
    }

    showFieldError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }

    clearFieldError(element) {
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
        }
    }

    selectPlan(planItem) {
        // Remove active class from all plans
        document.querySelectorAll('.plan-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to selected plan
        planItem.classList.add('active');
        
        // Store selected plan
        const plan = planItem.getAttribute('data-plan');
        localStorage.setItem('selectedPlan', plan);
        
        console.log('🎯 Selected plan:', plan);
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!this.validateEmail(email) || !this.validatePassword(password)) {
            return;
        }

        this.showLoading('Logowanie...');
        this.setButtonLoading('loginButton', true);

        try {
            // Use global AuthManager for login
            const result = await window.authManager.login(email, password);

            if (result.success) {
                this.showSuccess('Logowanie pomyślne! Przekierowywanie...');
                
                // Check for intended destination
                const intendedDestination = sessionStorage.getItem('intended_destination');
                const redirectUrl = intendedDestination || '/';
                sessionStorage.removeItem('intended_destination');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
                
            } else {
                this.showError(result.error || 'Błąd logowania');
            }

        } catch (error) {
            console.error('Login error:', error);
            this.showError('Błąd połączenia. Spróbuj ponownie.');
        } finally {
            this.hideLoading();
            this.setButtonLoading('loginButton', false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const company = document.getElementById('company').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        const newsletter = document.getElementById('newsletter').checked;

        // Validation
        if (!firstName || !lastName) {
            this.showError('Imię i nazwisko są wymagane');
            return;
        }

        if (!this.validateEmail(email) || !this.validatePassword(password)) {
            return;
        }

        if (!this.validatePasswordConfirmation(password, confirmPassword)) {
            return;
        }

        if (!agreeTerms) {
            this.showError('Musisz zaakceptować warunki korzystania');
            return;
        }

        this.showLoading('Tworzenie konta...');
        this.setButtonLoading('registerButton', true);

        try {
            const selectedPlan = localStorage.getItem('selectedPlan') || 'free';
            
            // Use global AuthManager for registration
            const result = await window.authManager.register({
                first_name: firstName,
                last_name: lastName,
                email,
                password,
                company,
                newsletter,
                plan: selectedPlan
            });

            if (result.success) {
                this.showSuccess('Konto utworzone pomyślnie! Przekierowywanie...');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
                
            } else {
                this.showError(result.error || 'Błąd podczas tworzenia konta');
            }

        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Błąd połączenia. Spróbuj ponownie.');
        } finally {
            this.hideLoading();
            this.setButtonLoading('registerButton', false);
        }
    }

    handleDemo() {
        // Store demo flag
        localStorage.setItem('demoMode', 'true');
        
        // Redirect to homepage
        window.location.href = '/';
    }

    handleSocialLogin(provider) {
        this.showError(`Logowanie przez ${provider} będzie dostępne wkrótce`);
    }

    storeTokens(accessToken, refreshToken, remember = false) {
        const storage = remember ? localStorage : sessionStorage;
        
        storage.setItem('accessToken', accessToken);
        storage.setItem('refreshToken', refreshToken);
        storage.setItem('tokenExpiry', Date.now() + (60 * 60 * 1000)); // 1 hour
        
        console.log('🔐 Tokens stored successfully');
    }

    storeUserInfo(user) {
        const userInfo = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            preferences: user.preferences
        };
        
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        console.log('👤 User info stored:', userInfo);
    }

    checkAuthRedirect() {
        // Check if user is already logged in
        const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        
        if (accessToken) {
            // Validate token
            this.validateToken(accessToken).then(isValid => {
                if (isValid) {
                    // Redirect to homepage if already logged in
                    window.location.href = '/';
                }
            });
        }
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/validate`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        const buttonText = button.querySelector('.button-text');
        const buttonLoader = button.querySelector('.button-loader');

        if (loading) {
            button.disabled = true;
            if (buttonText) buttonText.style.display = 'none';
            if (buttonLoader) buttonLoader.style.display = 'block';
        } else {
            button.disabled = false;
            if (buttonText) buttonText.style.display = 'block';
            if (buttonLoader) buttonLoader.style.display = 'none';
        }
    }

    showLoading(text = 'Ładowanie...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay?.querySelector('.loading-text');
        
        if (overlay) {
            overlay.classList.add('active');
            if (loadingText) loadingText.textContent = text;
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    showSuccess(message) {
        const successElement = document.getElementById('successMessage');
        if (successElement) {
            successElement.querySelector('.message-text').textContent = message;
            successElement.style.display = 'flex';
            
            // Hide error if visible
            const errorElement = document.getElementById('errorMessage');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 5000);
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.querySelector('.message-text').textContent = message;
            errorElement.style.display = 'flex';
            
            // Hide success if visible
            const successElement = document.getElementById('successMessage');
            if (successElement) {
                successElement.style.display = 'none';
            }
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
}

// ============ AUTHENTICATION UTILITIES ============

class AuthUtils {
    static getToken() {
        return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    }

    static getRefreshToken() {
        return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    }

    static getUserInfo() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }

    static isLoggedIn() {
        const token = this.getToken();
        const expiry = localStorage.getItem('tokenExpiry') || sessionStorage.getItem('tokenExpiry');
        
        if (!token || !expiry) return false;
        
        return Date.now() < parseInt(expiry);
    }

    static logout() {
        // Clear all auth data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('userInfo');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('tokenExpiry');
        
        // Redirect to login
        window.location.href = '/login.html';
    }

    static async makeAuthenticatedRequest(url, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            throw new Error('No authentication token');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // If token expired, try to refresh
        if (response.status === 401) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
                // Retry with new token
                headers.Authorization = `Bearer ${this.getToken()}`;
                return fetch(url, { ...options, headers });
            } else {
                this.logout();
                throw new Error('Authentication failed');
            }
        }

        return response;
    }

    static async refreshToken() {
        const refreshToken = this.getRefreshToken();
        
        if (!refreshToken) return false;

        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: refreshToken
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update tokens
                const storage = localStorage.getItem('accessToken') ? localStorage : sessionStorage;
                storage.setItem('accessToken', data.data.access_token);
                storage.setItem('refreshToken', data.data.refresh_token);
                storage.setItem('tokenExpiry', Date.now() + (60 * 60 * 1000));
                
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }
}

// ============ INITIALIZE APP ============

let authManager;

document.addEventListener('DOMContentLoaded', () => {
    window.authPageManager = new AuthPageManager();
});

// Export for global access
window.AuthManager = AuthManager;
window.AuthUtils = AuthUtils;
