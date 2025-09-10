// ============ FRONTEND PAGE SECURITY MANAGER ============

class PageSecurity {
    constructor() {
        this.publicPages = [
            '/login.html',
            '/register.html'
        ];

        this.protectedPages = [
            '/', // Homepage requires authentication
            '/enhanced-avatar-builder.html',
            '/flow-studio.html', 
            '/avatar-chat-dashboard.html',
            '/react-dashboard.html',
            '/dashboard',
            '/company-profile-creator.html',
            '/scene-builder.html',
            '/avatar-flow-creator.html',
            '/simulation-chat.html',
            '/simulation-dashboard.html',
            '/visual-flow-designer.html'
        ];
        
        this.adminPages = [
            '/admin-dashboard.html',
            '/user-management.html'
        ];
        
        this.currentPage = window.location.pathname;
        this.initialized = false;
        
        this.init();
    }

    init() {
        if (this.initialized) return;

        // Do not run security checks on public pages
        if (this.publicPages.includes(this.currentPage)) {
            console.log(' Public page, skipping security checks.');
            // Still initialize AuthManager for login/register forms
            if (typeof window.authManager === 'undefined') {
                 setTimeout(() => this.init(), 100);
                 return;
            }
            return;
        }
        
        // Wait for auth manager to be ready
        if (typeof window.authManager === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }
        
        this.initialized = true;
        this.checkPageAccess();
        this.setupEventListeners();
        this.addSecurityHeaders();
        
        console.log('🛡️ PageSecurity initialized for:', this.currentPage);
    }

    // ============ ACCESS CONTROL ============

    checkPageAccess() {
        // Skip check for public pages (already handled in init)
        if (this.publicPages.includes(this.currentPage)) {
            return;
        }

        const isProtected = this.isProtectedPage();
        const isAdminPage = this.isAdminPage();
        const isAuthenticated = window.authManager.isAuthenticated();
        const isAdmin = window.authManager.isAdmin();

        console.log('🔍 Page access check:', {
            page: this.currentPage,
            isProtected,
            isAdminPage,
            isAuthenticated,
            isAdmin
        });

        if (isAdminPage && (!isAuthenticated || !isAdmin)) {
            this.redirectToLogin('Admin access required');
            return;
        }

        if (isProtected && !isAuthenticated) {
            this.redirectToLogin('Authentication required');
            return;
        }

        // Page access granted
        this.onPageAccessGranted();
    }

    isProtectedPage() {
        // Only check for exact match
        return this.protectedPages.includes(this.currentPage);
    }

    isAdminPage() {
        // Only check for exact match
        return this.adminPages.includes(this.currentPage);
    }

    redirectToLogin(reason = 'Authentication required') {
        console.log('🚫 Access denied:', reason);
        
        // Show notification if available
        if (typeof showNotification === 'function') {
            showNotification(reason, 'warning');
        }
        
        // Store intended destination
        sessionStorage.setItem('intended_destination', window.location.href);
        
        // Redirect to login
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }

    onPageAccessGranted() {
        console.log('✅ Page access granted');
        
        // Initialize page-specific security
        this.initializePageSecurity();
        
        // Show user info if available
        this.displayUserInfo();
        
        // Setup session monitoring
        this.setupSessionMonitoring();
    }

    // ============ PAGE-SPECIFIC SECURITY ============

    initializePageSecurity() {
        // Add CSRF protection
        this.addCSRFProtection();
        
        // Setup secure form handling
        this.setupSecureFormHandling();
        
        // Add XSS protection
        this.addXSSProtection();
        
        // Setup content security
        this.setupContentSecurity();
    }

    addCSRFProtection() {
        // Add CSRF token to all forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (!form.querySelector('input[name="csrf_token"]')) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                csrfInput.value = this.generateCSRFToken();
                form.appendChild(csrfInput);
            }
        });
    }

    setupSecureFormHandling() {
        // Override form submissions to use authenticated requests
        document.addEventListener('submit', async (e) => {
            const form = e.target;
            if (!form.tagName || form.tagName.toLowerCase() !== 'form') return;
            
            // Skip if form has data-no-auth attribute
            if (form.hasAttribute('data-no-auth')) return;
            
            e.preventDefault();
            
            try {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                const response = await window.authManager.makeAuthenticatedRequest(
                    form.action || window.location.pathname,
                    {
                        method: form.method || 'POST',
                        body: JSON.stringify(data)
                    }
                );
                
                if (response.ok) {
                    const result = await response.json();
                    this.handleFormSuccess(form, result);
                } else {
                    const error = await response.json();
                    this.handleFormError(form, error);
                }
            } catch (error) {
                console.error('Form submission error:', error);
                this.handleFormError(form, { error: error.message });
            }
        });
    }

    addXSSProtection() {
        // Sanitize dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        this.sanitizeElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    sanitizeElement(element) {
        // Remove potentially dangerous attributes
        const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur'];
        dangerousAttrs.forEach(attr => {
            if (element.hasAttribute && element.hasAttribute(attr)) {
                element.removeAttribute(attr);
            }
        });

        // Sanitize child elements
        if (element.children) {
            Array.from(element.children).forEach(child => this.sanitizeElement(child));
        }
    }

    setupContentSecurity() {
        // Prevent iframe embedding (clickjacking protection)
        if (window.self !== window.top) {
            console.warn('🚨 Page loaded in iframe - potential clickjacking attack');
            document.body.style.display = 'none';
            alert('Security warning: This page cannot be displayed in a frame.');
        }

        // Disable right-click context menu in production
        if (window.location.hostname !== 'localhost') {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
        }
    }

    // ============ SESSION MONITORING ============

    setupSessionMonitoring() {
        // Monitor authentication status
        window.addEventListener('auth:logout', () => {
            this.handleSessionExpired();
        });

        window.addEventListener('auth:token-refreshed', () => {
            console.log('🔄 Token refreshed, continuing session');
        });

        // Setup idle timeout
        this.setupIdleTimeout();
        
        // Setup session heartbeat
        this.setupSessionHeartbeat();
    }

    setupIdleTimeout() {
        let idleTimer;
        const idleTimeLimit = 30 * 60 * 1000; // 30 minutes

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                this.handleIdleTimeout();
            }, idleTimeLimit);
        };

        // Reset timer on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetIdleTimer, { passive: true });
        });

        resetIdleTimer();
    }

    setupSessionHeartbeat() {
        // Send heartbeat every 5 minutes
        setInterval(async () => {
            if (window.authManager.isAuthenticated()) {
                try {
                    await window.authManager.validateToken();
                } catch (error) {
                    console.error('Session heartbeat failed:', error);
                }
            }
        }, 5 * 60 * 1000);
    }

    handleIdleTimeout() {
        console.log('⏰ User idle timeout');
        
        if (typeof showNotification === 'function') {
            showNotification('Session expired due to inactivity', 'warning');
        }
        
        window.authManager.logout();
        this.redirectToLogin('Session expired due to inactivity');
    }

    handleSessionExpired() {
        console.log('🚫 Session expired');
        
        // Clear sensitive data from page
        this.clearSensitiveData();
        
        // Show session expired message
        this.showSessionExpiredModal();
    }

    // ============ UI HELPERS ============

    displayUserInfo() {
        const user = window.authManager.getUser();
        if (!user) return;

        // Update user info in UI
        const userElements = document.querySelectorAll('.user-name');
        userElements.forEach(el => el.textContent = `${user.first_name} ${user.last_name}`);

        const emailElements = document.querySelectorAll('.user-email');
        emailElements.forEach(el => el.textContent = user.email);

        const roleElements = document.querySelectorAll('.user-role');
        roleElements.forEach(el => el.textContent = user.role);

        // Show/hide admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = window.authManager.isAdmin() ? 'block' : 'none';
        });
    }

    showSessionExpiredModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('session-expired-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'session-expired-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <h3>🔒 Session Expired</h3>
                        <p>Your session has expired. Please log in again to continue.</p>
                        <button onclick="window.location.href='/login.html'" class="btn btn-primary">
                            Go to Login
                        </button>
                    </div>
                </div>
            `;
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'flex';
    }

    clearSensitiveData() {
        // Clear form fields
        const sensitiveFields = document.querySelectorAll('input[type="password"], input[data-sensitive]');
        sensitiveFields.forEach(field => field.value = '');

        // Clear sensitive text content
        const sensitiveElements = document.querySelectorAll('.sensitive-data');
        sensitiveElements.forEach(el => el.textContent = '***');
    }

    // ============ UTILITY METHODS ============

    generateCSRFToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    addSecurityHeaders() {
        // Add security meta tags if not present
        if (!document.querySelector('meta[http-equiv="X-Frame-Options"]')) {
            const frameOptions = document.createElement('meta');
            frameOptions.setAttribute('http-equiv', 'X-Frame-Options');
            frameOptions.setAttribute('content', 'DENY');
            document.head.appendChild(frameOptions);
        }

        if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
            const contentType = document.createElement('meta');
            contentType.setAttribute('http-equiv', 'X-Content-Type-Options');
            contentType.setAttribute('content', 'nosniff');
            document.head.appendChild(contentType);
        }
    }

    setupEventListeners() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.checkPageAccess();
        });

        // Handle page focus
        window.addEventListener('focus', () => {
            if (this.isProtectedPage()) {
                this.checkPageAccess();
            }
        });
    }

    handleFormSuccess(form, result) {
        console.log('✅ Form submitted successfully:', result);
        
        if (typeof showNotification === 'function') {
            showNotification(result.message || 'Operation completed successfully', 'success');
        }
        
        // Trigger custom event
        form.dispatchEvent(new CustomEvent('form:success', { detail: result }));
    }

    handleFormError(form, error) {
        console.error('❌ Form submission failed:', error);
        
        if (typeof showNotification === 'function') {
            showNotification(error.error || 'Operation failed', 'error');
        }
        
        // Trigger custom event
        form.dispatchEvent(new CustomEvent('form:error', { detail: error }));
    }
}

// ============ GLOBAL INITIALIZATION ============

// Initialize page security when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pageSecurity = new PageSecurity();
    });
} else {
    window.pageSecurity = new PageSecurity();
}

console.log('🛡️ PageSecurity loaded');
