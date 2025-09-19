// ============ HOMEPAGE JAVASCRIPT - AIWAVE INSPIRED ============

class HomepageApp {
    constructor() {
        this.currentPage = 'welcome';
        this.sidebarCollapsed = false;
        this.isMobile = window.innerWidth <= 768;
        this.isLoggedIn = false; // Initialize as not logged in
        this.currentUser = null;
        this.allAvatars = [];
        this.currentAvatars = [];
        this.currentCategory = 'all';
        this.searchQuery = '';

        // Wait for auth manager to be ready
        this.waitForAuthManager().then(() => {
            this.init();
        });
    }

    async waitForAuthManager() {
        while (typeof window.authManager === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('✅ AuthManager ready for homepage');
    }

    init() {
        this.checkAuthentication();
        this.bindEvents();
        this.loadCustomAvatars();
        this.setupRouting();
        this.startAnimations();

        // Check initial screen size
        this.handleResize();

        console.log('🎯 Homepage App initialized');
    }

    bindEvents() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link[data-page]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // Quick action cards
        const actionCards = document.querySelectorAll('.action-card[data-page]');
        actionCards.forEach(card => {
            card.addEventListener('click', () => {
                const page = card.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // Floating action button
        const fab = document.getElementById('fabButton');
        if (fab) {
            fab.addEventListener('click', () => this.handleFabClick());
        }

        // New chat button
        const newChatBtn = document.querySelector('.new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.navigateToPage('simulation-dashboard'));
        }

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // User profile toggle
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.addEventListener('click', () => this.toggleUserMenu());
        }

        // Avatar dropdown change
        const avatarDropdown = document.getElementById('avatar-type');
        if (avatarDropdown) {
            avatarDropdown.addEventListener('change', (e) => this.handleAvatarChange(e.target.value));
        }

        // Search functionality
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }

        // Notifications
        const notificationsBtn = document.querySelector('.notifications-btn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => this.showNotifications());
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        this.sidebarCollapsed = !this.sidebarCollapsed;

        if (this.isMobile) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        }

        // Save state
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);

        console.log(`🎯 Sidebar ${this.sidebarCollapsed ? 'collapsed' : 'expanded'}`);
    }

    navigateToPage(pageName) {
        console.log(`🎯 Navigating to page: ${pageName}`);

        // Show loading
        this.showLoading();

        // Update navigation active state
        this.updateNavigation(pageName);

        // Hide welcome screen
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }

        // Hide all embedded pages
        const embeddedPages = document.querySelectorAll('.embedded-page');
        embeddedPages.forEach(page => {
            page.style.display = 'none';
        });

        // Update page title and breadcrumb
        this.updatePageHeader(pageName);

        // Show target page with smooth transition
        setTimeout(() => {
            this.showTargetPage(pageName);
            this.hideLoading();
        }, 500);

        // Update current page
        this.currentPage = pageName;

        // Update URL (basic routing)
        window.history.pushState({page: pageName}, '', `#${pageName}`);
    }

    updateNavigation(pageName) {
        // Remove active class from all nav items
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        // Add active class to current nav item
        const currentNavLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
        if (currentNavLink) {
            currentNavLink.closest('.nav-item').classList.add('active');
        }
    }

    updatePageHeader(pageName) {
        const pageTitle = document.querySelector('.page-title');
        const breadcrumbActive = document.querySelector('.breadcrumb-item.active');

        const pageTitles = {
            'dashboard': 'Basic Dashboard',
            'simulation-dashboard': 'Talk Simulator',
            'avatar-creator': 'Avatar Creator',
            'flow-manager': 'Flow Manager',
            'role-training': 'Role Training',
            'company-profile-creator': 'Company Profile Creator',
            'scene-builder': 'Scene Builder',
            'analytics': 'Analityka',
            'reports': 'Raporty',
            'settings': 'Ustawienia',
            'help': 'Pomoc'
        };

        if (pageTitle) {
            pageTitle.textContent = pageTitles[pageName] || 'AI Avatar Business';
        }

        if (breadcrumbActive) {
            breadcrumbActive.textContent = pageTitles[pageName] || pageName;
        }
    }

    showTargetPage(pageName) {
        const pageMapping = {
            'dashboard': 'dashboardPage',
            'simulation-dashboard': 'simulationPage',
            'role-training': 'roleTrainingPage'
        };

        if (pageName === 'avatar-manager') {
            this.showAvatarManager();
        } else if (pageName === 'avatar-chat') {
            this.showAvatarChat();
        } else if (pageName === 'flow-studio') {
            this.showFlowStudio();
        } else if (pageName === 'avatar-creator') {
            this.showEnhancedAvatarBuilder();
        } else if (pageName === 'flow-manager') {
            this.showAvatarManager(); // Use the new Avatar Manager for flow management
        } else if (pageName === 'company-profile-creator') {
            this.showCompanyProfileCreator();
        } else if (pageName === 'scene-builder') {
            this.showSceneBuilder();
        } else {
            const targetPageId = pageMapping[pageName];
            if (targetPageId) {
                const targetPage = document.getElementById(targetPageId);
                if (targetPage) {
                    targetPage.style.display = 'block';
                    targetPage.style.animation = 'fadeInUp 0.5s ease forwards';
                }
            } else {
                // Show placeholder for non-implemented pages
                this.showPlaceholder(pageName);
            }
        }
    }

    showPlaceholder(pageName) {
        const contentArea = document.getElementById('contentArea');
        const placeholderHTML = `
            <div class="placeholder-content" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 60vh;
                text-align: center;
                animation: fadeInUp 0.5s ease forwards;
            ">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, rgba(57, 229, 117, 0.2), rgba(45, 216, 102, 0.2));
                    border: 1px solid rgba(57, 229, 117, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 24px;
                ">
                    <i class="fas fa-cog" style="font-size: 32px; color: #39e575;"></i>
                </div>
                <h2 style="color: #ffffff; margin-bottom: 16px; font-size: 28px; font-weight: 700;">
                    ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}
                </h2>
                <p style="color: rgba(255, 255, 255, 0.6); font-size: 16px; margin-bottom: 32px;">
                    Ta funkcja jest w trakcie rozwoju. Już wkrótce będzie dostępna!
                </p>
                <button class="action-btn-primary" onclick="homepageApp.navigateToPage('welcome')" style="
                    background: linear-gradient(135deg, #39e575, #2dd866);
                    color: #000;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    <i class="fas fa-home" style="margin-right: 8px;"></i>
                    Powrót do głównej
                </button>
            </div>
        `;

        contentArea.innerHTML = placeholderHTML;
    }

    setupRouting() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.navigateToPage(e.state.page);
            } else {
                this.showWelcomeScreen();
            }
        });

        // Handle initial URL hash
        const hash = window.location.hash.substring(1);
        if (hash && hash !== 'welcome') {
            setTimeout(() => {
                this.navigateToPage(hash);
            }, 1000);
        }
    }

    showWelcomeScreen() {
        // Hide all embedded pages
        const embeddedPages = document.querySelectorAll('.embedded-page');
        embeddedPages.forEach(page => {
            page.style.display = 'none';
        });

        // Show welcome screen
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'block';
        }

        // Update navigation
        this.updateNavigation('welcome');
        this.updatePageHeader('welcome');

        this.currentPage = 'welcome';
    }

    async loadCustomAvatars() {
        try {
            console.log('🎯 Loading custom avatars...');

            const response = await fetch('/api/avatars');
            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                this.updateAvatarDropdown(data.data);
                console.log(`✅ Loaded ${data.data.length} custom avatars`);
            }
        } catch (error) {
            console.error('❌ Error loading custom avatars:', error);
        }
    }

    updateAvatarDropdown(customAvatars) {
        const dropdown = document.getElementById('avatar-type');
        if (!dropdown) return;

        // Keep existing standard avatars
        const standardOptions = Array.from(dropdown.querySelectorAll('option'));

        // Add custom avatars
        if (customAvatars.length > 0) {
            // Create optgroup for custom avatars if it doesn't exist
            let customOptgroup = dropdown.querySelector('optgroup[label*="Custom"]');
            if (!customOptgroup) {
                customOptgroup = document.createElement('optgroup');
                customOptgroup.label = '🎭 Custom Avatars';
                dropdown.appendChild(customOptgroup);
            }

            // Clear existing custom options
            customOptgroup.innerHTML = '';

            // Add custom avatar options
            customAvatars.forEach(avatar => {
                const option = document.createElement('option');
                option.value = avatar.id;
                option.textContent = `${avatar.name}`;
                customOptgroup.appendChild(option);
            });
        }
    }

    handleAvatarChange(avatarId) {
        console.log(`🎯 Avatar changed to: ${avatarId}`);

        // Save selection
        localStorage.setItem('selectedAvatar', avatarId);

        // Show success notification
        this.showNotification('Avatar został zmieniony', 'success');
    }

    handleFabClick() {
        // Show context menu or quick actions
        const fabMenu = `
            <div class="fab-menu" style="
                position: fixed;
                bottom: 100px;
                right: 32px;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(57, 229, 117, 0.2);
                border-radius: 16px;
                padding: 16px;
                z-index: 1001;
                animation: fadeInUp 0.3s ease forwards;
            ">
                <div class="fab-item" data-action="new-avatar" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: #ffffff;
                    margin-bottom: 8px;
                " onmouseover="this.style.background='rgba(57, 229, 117, 0.1)'" onmouseout="this.style.background='transparent'">
                    <i class="fas fa-user-plus" style="color: #39e575;"></i>
                    <span>Nowy Avatar</span>
                </div>
                <div class="fab-item" data-action="new-flow" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: #ffffff;
                    margin-bottom: 8px;
                " onmouseover="this.style.background='rgba(57, 229, 117, 0.1)'" onmouseout="this.style.background='transparent'">
                    <i class="fas fa-sitemap" style="color: #39e575;"></i>
                    <span>Nowy Flow</span>
                </div>
                <div class="fab-item" data-action="quick-chat" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: #ffffff;
                " onmouseover="this.style.background='rgba(57, 229, 117, 0.1)'" onmouseout="this.style.background='transparent'">
                    <i class="fas fa-comments" style="color: #39e575;"></i>
                    <span>Szybki Chat</span>
                </div>
            </div>
        `;

        // Remove existing menu
        const existingMenu = document.querySelector('.fab-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        // Add menu
        document.body.insertAdjacentHTML('beforeend', fabMenu);

        // Add click handlers
        const fabItems = document.querySelectorAll('.fab-item[data-action]');
        fabItems.forEach(item => {
            item.addEventListener('click', () => {
                const action = item.getAttribute('data-action');
                this.handleFabAction(action);
                document.querySelector('.fab-menu').remove();
            });
        });

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.fab-menu') && !e.target.closest('.fab')) {
                    const menu = document.querySelector('.fab-menu');
                    if (menu) menu.remove();
                }
            }, {once: true});
        }, 100);
    }

    handleFabAction(action) {
        switch (action) {
            case 'new-avatar':
                this.navigateToPage('avatar-creator');
                break;
            case 'new-flow':
                this.navigateToPage('flow-studio');
                break;
            case 'quick-chat':
                this.navigateToPage('simulation-dashboard');
                break;
        }
    }

    handleSearch() {
        // Simple search overlay
        const searchOverlay = `
            <div class="search-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease forwards;
            ">
                <div style="
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid rgba(57, 229, 117, 0.3);
                    border-radius: 16px;
                    padding: 32px;
                    width: 90%;
                    max-width: 500px;
                ">
                    <h3 style="color: #ffffff; margin-bottom: 20px; text-align: center;">
                        🔍 Szukaj w aplikacji
                    </h3>
                    <input type="text" placeholder="Wpisz czego szukasz..." style="
                        width: 100%;
                        background: rgba(0, 0, 0, 0.8);
                        border: 1px solid rgba(57, 229, 117, 0.3);
                        color: #ffffff;
                        padding: 16px;
                        border-radius: 12px;
                        font-size: 16px;
                        margin-bottom: 20px;
                    " autofocus>
                    <div style="text-align: center;">
                        <button onclick="document.querySelector('.search-overlay').remove()" style="
                            background: linear-gradient(135deg, #39e575, #2dd866);
                            color: #000;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                        ">Zamknij</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', searchOverlay);
    }

    showNotifications() {
        const notifications = [
            {id: 1, title: 'Nowy avatar został utworzony', time: '2 min temu', type: 'success'},
            {id: 2, title: 'Przetwarzanie pliku wiedzy', time: '15 min temu', type: 'info'},
            {id: 3, title: 'Flow zaktualizowany', time: '1h temu', type: 'warning'}
        ];

        const notificationOverlay = `
            <div class="notification-overlay" style="
                position: fixed;
                top: 80px;
                right: 32px;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(57, 229, 117, 0.2);
                border-radius: 16px;
                padding: 20px;
                width: 320px;
                z-index: 1001;
                animation: fadeInDown 0.3s ease forwards;
            ">
                <h4 style="color: #ffffff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-bell" style="color: #39e575;"></i>
                    Powiadomienia
                </h4>
                ${notifications.map(notif => `
                    <div style="
                        padding: 12px;
                        border-radius: 8px;
                        margin-bottom: 8px;
                        background: rgba(57, 229, 117, 0.05);
                        border: 1px solid rgba(57, 229, 117, 0.1);
                    ">
                        <div style="color: #ffffff; font-size: 13px; margin-bottom: 4px;">
                            ${notif.title}
                        </div>
                        <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px;">
                            ${notif.time}
                        </div>
                    </div>
                `).join('')}
                <div style="text-align: center; margin-top: 16px;">
                    <button onclick="document.querySelector('.notification-overlay').remove()" style="
                        background: none;
                        border: 1px solid rgba(57, 229, 117, 0.3);
                        color: #39e575;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Zobacz wszystkie</button>
                </div>
            </div>
        `;

        // Remove existing overlay
        const existing = document.querySelector('.notification-overlay');
        if (existing) {
            existing.remove();
            return;
        }

        document.body.insertAdjacentHTML('beforeend', notificationOverlay);

        // Auto close after 5 seconds
        setTimeout(() => {
            const overlay = document.querySelector('.notification-overlay');
            if (overlay) overlay.remove();
        }, 5000);
    }

    toggleUserMenu() {
        console.log('🎯 Toggle user menu');
        this.showNotification('Menu użytkownika - w rozwoju', 'info');
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.isMobile) {
            const sidebar = document.querySelector('.sidebar');
            if (this.isMobile) {
                sidebar.classList.remove('collapsed');
                sidebar.classList.remove('open');
            } else {
                sidebar.classList.remove('open');
                sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
            }
        }
    }

    startAnimations() {
        // Animate floating cards
        const floatingCards = document.querySelectorAll('.floating-card');
        floatingCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 2}s`;
        });

        // Animate stats counter
        this.animateStats();
    }

    animateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');
        const targets = ['12', '1.2K', '98%'];

        statNumbers.forEach((stat, index) => {
            const target = targets[index];
            if (target.includes('K')) {
                this.animateNumber(stat, 0, 1200, 'K');
            } else if (target.includes('%')) {
                this.animateNumber(stat, 0, 98, '%');
            } else {
                this.animateNumber(stat, 0, parseInt(target));
            }
        });
    }

    animateNumber(element, start, end, suffix = '') {
        const duration = 2000;
        const increment = end / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                current = end;
                clearInterval(timer);
            }

            if (suffix === 'K') {
                element.textContent = (current / 1000).toFixed(1) + 'K';
            } else if (suffix === '%') {
                element.textContent = Math.floor(current) + '%';
            } else {
                element.textContent = Math.floor(current);
            }
        }, 16);
    }

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification-toast';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 32px;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(57, 229, 117, 0.3);
            border-radius: 12px;
            padding: 16px 20px;
            color: #ffffff;
            z-index: 10001;
            animation: slideInRight 0.3s ease forwards;
            max-width: 300px;
        `;

        const iconMap = {
            success: 'fa-check-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };

        const colorMap = {
            success: '#39e575',
            info: '#3aa6ff',
            warning: '#ffb74d',
            error: '#ff4757'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas ${iconMap[type]}" style="color: ${colorMap[type]}; font-size: 16px;"></i>
                <span style="font-size: 14px; font-weight: 500;">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // ============ AUTHENTICATION METHODS ============

    checkAuthentication() {
        // Use AuthManager for authentication check
        this.isLoggedIn = window.authManager.isAuthenticated();
        this.currentUser = window.authManager.getUser();

        console.log('🔍 Authentication check:', {
            isLoggedIn: this.isLoggedIn,
            user: this.currentUser
        });

        // Setup auth event listeners
        this.setupAuthEventListeners();

        if (this.isLoggedIn) {
            this.updateUIForLoggedInUser();
            console.log('✅ User is logged in:', this.currentUser);
        } else {
            this.updateUIForLoggedOutUser();
            console.log('❌ User is not logged in');
        }
    }

    setupAuthEventListeners() {
        // Listen for authentication events
        window.addEventListener('auth:login', (e) => {
            console.log('🔐 Login event received');
            this.isLoggedIn = true;
            this.currentUser = e.detail.user;
            this.updateUIForLoggedInUser();
            this.loadAvatars();
        });

        window.addEventListener('auth:logout', () => {
            console.log('🚪 Logout event received');
            this.isLoggedIn = false;
            this.currentUser = null;
            this.allAvatars = [];
            this.currentAvatars = [];
            this.updateUIForLoggedOutUser();
            this.navigateToPage('welcome');
        });

        window.addEventListener('auth:token-refreshed', () => {
            console.log('🔄 Token refreshed event received');
            // Token refreshed, continue normal operation
        });
    }

    updateUIForLoggedInUser() {
        // Update user profile in sidebar
        const userName = document.querySelector('.user-name');
        const userStatus = document.querySelector('.user-status');

        if (userName && this.currentUser) {
            userName.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        }

        if (userStatus) {
            userStatus.textContent = this.currentUser?.role === 'admin' ? 'Administrator' : 'Użytkownik';
        }

        // Show/hide navigation items based on role
        this.updateNavigationForRole();

        // Update header actions
        this.updateHeaderActions();
    }

    updateUIForLoggedOutUser() {
        // Show login/register options
        this.showAuthenticationPrompt();
    }

    updateNavigationForRole() {
        if (!this.currentUser) return;

        const isAdmin = this.currentUser.role === 'admin';

        // Show admin-only sections
        const adminSections = document.querySelectorAll('[data-admin-only]');
        adminSections.forEach(section => {
            section.style.display = isAdmin ? 'block' : 'none';
        });

        // Add admin navigation if needed
        if (isAdmin) {
            this.addAdminNavigation();
        }
    }

    addAdminNavigation() {
        const navSections = document.querySelector('.sidebar-nav');

        // Check if admin section already exists
        if (document.querySelector('.admin-nav-section')) return;

        const adminSection = document.createElement('div');
        adminSection.className = 'nav-section admin-nav-section';
        adminSection.innerHTML = `
            <h3 class="nav-section-title">Administracja</h3>
            <ul class="nav-menu">
                <li class="nav-item">
                    <a href="#users" class="nav-link" data-page="users">
                        <i class="fas fa-users nav-icon"></i>
                        <span class="nav-text">Użytkownicy</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#system" class="nav-link" data-page="system">
                        <i class="fas fa-server nav-icon"></i>
                        <span class="nav-text">System</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#logs" class="nav-link" data-page="logs">
                        <i class="fas fa-file-alt nav-icon"></i>
                        <span class="nav-text">Logi</span>
                    </a>
                </li>
            </ul>
        `;

        navSections.appendChild(adminSection);
    }

    updateHeaderActions() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        // Add logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'action-btn logout-btn';
        logoutBtn.innerHTML = `
            <i class="fas fa-sign-out-alt"></i>
            <span>Wyloguj</span>
        `;
        logoutBtn.addEventListener('click', () => this.handleLogout());

        // Add user menu button
        const userMenuBtn = document.createElement('button');
        userMenuBtn.className = 'action-btn user-menu-btn';
        userMenuBtn.innerHTML = `
            <i class="fas fa-user-circle"></i>
            <span>${this.currentUser?.first_name || 'Profil'}</span>
        `;
        userMenuBtn.addEventListener('click', () => this.showUserMenu());

        headerActions.appendChild(userMenuBtn);
        headerActions.appendChild(logoutBtn);
    }

    showAuthenticationPrompt() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (!welcomeScreen) return;

        // Add authentication prompt to welcome screen
        const authPrompt = document.createElement('div');
        authPrompt.className = 'auth-prompt';
        authPrompt.innerHTML = `
            <div class="auth-prompt-content" style="
                background: rgba(57, 229, 117, 0.05);
                border: 1px solid rgba(57, 229, 117, 0.2);
                border-radius: 16px;
                padding: 32px;
                text-align: center;
                margin: 40px 0;
            ">
                <h3 style="color: #39e575; margin-bottom: 16px; font-size: 24px;">
                    Zaloguj się aby uzyskać pełny dostęp
                </h3>
                <p style="color: rgba(255, 255, 255, 0.7); margin-bottom: 24px; font-size: 16px;">
                    Stwórz konto lub zaloguj się aby zarządzać swoimi avatarami AI
                </p>
                <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
                    <a href="login.html" class="auth-prompt-btn" style="
                        background: linear-gradient(135deg, #39e575, #2dd866);
                        color: #000;
                        padding: 12px 24px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-sign-in-alt"></i>
                        Zaloguj się
                    </a>
                    <a href="register.html" class="auth-prompt-btn" style="
                        background: rgba(57, 229, 117, 0.1);
                        border: 1px solid rgba(57, 229, 117, 0.3);
                        color: #39e575;
                        padding: 12px 24px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-user-plus"></i>
                        Stwórz konto
                    </a>
                </div>
                <div style="margin-top: 20px;">
                    <button onclick="homepageApp.enableDemoMode()" style="
                        background: none;
                        border: none;
                        color: rgba(255, 255, 255, 0.5);
                        font-size: 14px;
                        cursor: pointer;
                        text-decoration: underline;
                    ">
                        Lub kontynuuj w trybie demo
                    </button>
                </div>
            </div>
        `;

        // Insert at the beginning of welcome screen
        welcomeScreen.insertBefore(authPrompt, welcomeScreen.firstChild);
    }

    enableDemoMode() {
        localStorage.setItem('demoMode', 'true');
        this.showNotification('Tryb demo włączony', 'info');

        // Hide auth prompt
        const authPrompt = document.querySelector('.auth-prompt');
        if (authPrompt) {
            authPrompt.style.display = 'none';
        }
    }

    showUserMenu() {
        const userMenu = `
            <div class="user-menu" style="
                position: fixed;
                top: 80px;
                right: 32px;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(57, 229, 117, 0.2);
                border-radius: 16px;
                padding: 20px;
                width: 280px;
                z-index: 1001;
                animation: fadeInDown 0.3s ease forwards;
            ">
                <div class="user-menu-header" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid rgba(57, 229, 117, 0.1);
                ">
                    <div class="user-avatar" style="
                        width: 48px;
                        height: 48px;
                        background: linear-gradient(135deg, #39e575, #2dd866);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #000;
                        font-weight: 700;
                        font-size: 18px;
                    ">${this.currentUser?.first_name?.charAt(0) || 'U'}</div>
                    <div>
                        <div style="color: #ffffff; font-weight: 600; font-size: 16px;">
                            ${this.currentUser?.first_name || ''} ${this.currentUser?.last_name || ''}
                        </div>
                        <div style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">
                            ${this.currentUser?.email || ''}
                        </div>
                        <div style="color: #39e575; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                            ${this.currentUser?.role || 'user'}
                        </div>
                    </div>
                </div>
                
                <div class="user-menu-items">
                    <div class="user-menu-item" onclick="homepageApp.navigateToPage('profile')" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        margin-bottom: 8px;
                    " onmouseover="this.style.background='rgba(57, 229, 117, 0.1)'" onmouseout="this.style.background='transparent'">
                        <i class="fas fa-user" style="color: #39e575; font-size: 16px;"></i>
                        <span style="color: #ffffff; font-size: 14px;">Profil użytkownika</span>
                    </div>
                    
                    <div class="user-menu-item" onclick="homepageApp.navigateToPage('settings')" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        margin-bottom: 8px;
                    " onmouseover="this.style.background='rgba(57, 229, 117, 0.1)'" onmouseout="this.style.background='transparent'">
                        <i class="fas fa-cog" style="color: #39e575; font-size: 16px;"></i>
                        <span style="color: #ffffff; font-size: 14px;">Ustawienia</span>
                    </div>
                    
                    <div class="user-menu-item" onclick="homepageApp.handleLogout()" style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border-top: 1px solid rgba(57, 229, 117, 0.1);
                        margin-top: 12px;
                        padding-top: 16px;
                    " onmouseover="this.style.background='rgba(255, 71, 87, 0.1)'" onmouseout="this.style.background='transparent'">
                        <i class="fas fa-sign-out-alt" style="color: #ff4757; font-size: 16px;"></i>
                        <span style="color: #ff4757; font-size: 14px;">Wyloguj się</span>
                    </div>
                </div>
            </div>
        `;

        // Remove existing menu
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        document.body.insertAdjacentHTML('beforeend', userMenu);

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-menu') && !e.target.closest('.user-menu-btn')) {
                    const menu = document.querySelector('.user-menu');
                    if (menu) menu.remove();
                }
            }, {once: true});
        }, 100);
    }

    async handleLogout() {
        if (confirm('Czy na pewno chcesz się wylogować?')) {
            try {
                // Use AuthManager for logout
                await window.authManager.logout();
                this.showNotification('Wylogowano pomyślnie', 'success');

                // Redirect to login page after short delay
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1500);
            } catch (error) {
                console.error('Logout error:', error);
                this.showNotification('Błąd podczas wylogowywania', 'error');
            }
        }
    }

    async makeAuthenticatedRequest(url, options = {}) {
        try {
            // Use AuthManager for authenticated requests
            return await window.authManager.makeAuthenticatedRequest(url, options);
        } catch (error) {
            console.error('Authenticated request failed:', error);
            if (error.message === 'Authentication failed') {
                this.showNotification('Sesja wygasła. Zaloguj się ponownie.', 'warning');
            }
            throw error;
        }
    }

    // ============ AVATAR MANAGER METHODS ============

    showAvatarManager() {
        const avatarManagerScreen = document.getElementById('avatarManagerScreen');
        if (avatarManagerScreen) {
            avatarManagerScreen.style.display = 'block';
            avatarManagerScreen.style.animation = 'fadeInUp 0.5s ease forwards';

            // Initialize Avatar Manager
            this.initializeAvatarManager();

            // Load avatars
            this.loadAvatars();
        }
    }

    showAvatarChat() {
        // Redirect to Avatar Chat Dashboard page
        window.location.href = '/avatar-chat-dashboard.html';
    }

    showFlowStudio() {
        // Redirect to Flow Studio page
        window.location.href = '/flow-studio.html';
    }

    showEnhancedAvatarBuilder() {
        // Redirect to Enhanced Avatar Builder page
        window.location.href = '/enhanced-avatar-builder.html';
    }

    showCompanyProfileCreator() {
        console.log('🏢 Redirecting to Company Profile Creator');
        window.location.href = '/company-profile-creator.html';
    }

    showSceneBuilder() {
        console.log('🎬 Redirecting to Scene Builder');
        window.location.href = '/scene-builder.html';
    }

    initializeAvatarManager() {
        // Bind category tab events
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchAvatarCategory(tab.dataset.category);
            });
        });

        // Bind search
        const searchInput = document.getElementById('avatarSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAvatars(e.target.value);
            });
        }

        // Bind sort filter
        const sortFilter = document.getElementById('sortFilter');
        if (sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                this.sortAvatars(e.target.value);
            });
        }

        // Bind action buttons
        const createAvatarBtn = document.getElementById('createAvatarBtn');
        if (createAvatarBtn) {
            createAvatarBtn.addEventListener('click', () => {
                // Use enhanced avatar builder
                window.location.href = '/enhanced-avatar-builder.html';
            });
        }

        const importAvatarBtn = document.getElementById('importAvatarBtn');
        if (importAvatarBtn) {
            importAvatarBtn.addEventListener('click', () => {
                this.showImportAvatarDialog();
            });
        }

        console.log('🎭 Avatar Manager initialized');
    }

    async loadAvatars() {
        const avatarsGrid = document.getElementById('avatarsGrid');
        if (!avatarsGrid) return;

        try {
            // Show loading
            avatarsGrid.innerHTML = `
                <div class="loading-avatars">
                    <div class="loading-spinner-small"></div>
                    <p>Ładowanie avatarów...</p>
                </div>
            `;

            // Load demo avatars (always available - no auth required)
            let demoAvatars = [];
            try {
                const demoResponse = await fetch('/api/avatars/demo');
                if (demoResponse.ok) {
                    const demoData = await demoResponse.json();
                    demoAvatars = demoData.avatars || [];
                } else {
                    // Fallback to hardcoded demo avatars
                    demoAvatars = this.getDemoAvatars();
                }
            } catch (error) {
                console.error('Failed to load demo avatars, using fallback:', error);
                demoAvatars = this.getDemoAvatars();
            }

            // Load user avatars if logged in
            let userAvatars = [];
            if (this.isLoggedIn) {
                try {
                    const response = await this.makeAuthenticatedRequest('/api/avatars');
                    if (response.ok) {
                        const data = await response.json();
                        userAvatars = data.avatars || [];
                    }
                } catch (error) {
                    console.error('Failed to load user avatars:', error);
                }
            }

            // Combine all avatars
            this.allAvatars = [...demoAvatars, ...userAvatars];
            this.currentAvatars = this.allAvatars;

            // Update counts
            this.updateAvatarCounts();

            // Render avatars
            this.renderAvatars(this.currentAvatars);

        } catch (error) {
            console.error('Error loading avatars:', error);
            this.showAvatarsError();
        }
    }

    getDemoAvatars() {
        return [
            {
                id: 'demo-prezes-it',
                name: 'Prezes IT',
                type: 'demo',
                description: 'Doświadczony prezes firmy technologicznej, ekspert od AI i automatyzacji',
                personality: 'Charyzmatyczny, wizjonerski, analityczny',
                specialization: 'Zarządzanie projektami AI, rozwój algorytmów uczenia maszynowego',
                stats: {conversations: 45, flows: 3, accuracy: 94},
                status: 'active',
                category: 'business'
            },
            {
                id: 'demo-networker',
                name: 'Networker',
                type: 'demo',
                description: 'Ekspert od networkingu i budowania relacji biznesowych',
                personality: 'Towarzyski, empatyczny, perswazyjny',
                specialization: 'Budowanie sieci kontaktów, sprzedaż B2B',
                stats: {conversations: 67, flows: 4, accuracy: 91},
                status: 'active',
                category: 'sales'
            },
            {
                id: 'demo-trener',
                name: 'Trener',
                type: 'demo',
                description: 'Profesjonalny trener biznesowy i coach rozwoju osobistego',
                personality: 'Motywujący, cierpliwy, analityczny',
                specialization: 'Szkolenia biznesowe, coaching, rozwój umiejętności',
                stats: {conversations: 89, flows: 5, accuracy: 96},
                status: 'active',
                category: 'training'
            },
            {
                id: 'demo-uczen',
                name: 'Uczeń',
                type: 'demo',
                description: 'Ciekawy świata student gotowy do nauki i zadawania pytań',
                personality: 'Ciekawski, entuzjastyczny, otwarty na wiedzę',
                specialization: 'Uczenie się, zadawanie pytań, przyswajanie wiedzy',
                stats: {conversations: 23, flows: 2, accuracy: 87},
                status: 'active',
                category: 'education'
            },
            {
                id: 'demo-pracownik',
                name: 'Pracownik',
                type: 'demo',
                description: 'Doświadczony pracownik biurowy, ekspert od codziennych zadań',
                personality: 'Praktyczny, zorganizowany, pomocny',
                specialization: 'Zarządzanie zadaniami, organizacja pracy, efektywność',
                stats: {conversations: 56, flows: 3, accuracy: 92},
                status: 'active',
                category: 'workplace'
            },
            {
                id: 'demo-klient',
                name: 'Klient',
                type: 'demo',
                description: 'Reprezentuje perspektywę klienta w różnych scenariuszach biznesowych',
                personality: 'Wymagający, dociekliwy, zorientowany na wartość',
                specialization: 'Ocena produktów/usług, negocjacje, podejmowanie decyzji',
                stats: {conversations: 34, flows: 2, accuracy: 89},
                status: 'active',
                category: 'customer'
            }
        ];
    }

    updateAvatarCounts() {
        const counts = {
            all: this.allAvatars.length,
            'with-flows': this.allAvatars.filter(a =>
                (a.flows && a.flows.length > 0) || (a.stats && a.stats.flows > 0)
            ).length,
            reactive: this.allAvatars.filter(a => a.type === 'reactive').length,
            demo: this.allAvatars.filter(a => a.type === 'demo').length
        };

        // Update tab counts
        Object.keys(counts).forEach(category => {
            const tab = document.querySelector(`[data-category="${category}"] .tab-count`);
            if (tab) {
                tab.textContent = counts[category];
            }
        });
    }

    switchAvatarCategory(category) {
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');

        // Filter avatars
        switch (category) {
            case 'all':
                this.currentAvatars = this.allAvatars;
                break;
            case 'with-flows':
                this.currentAvatars = this.allAvatars.filter(a =>
                    (a.flows && a.flows.length > 0) || (a.stats && a.stats.flows > 0)
                );
                break;
            case 'reactive':
                this.currentAvatars = this.allAvatars.filter(a => a.type === 'reactive');
                break;
            case 'demo':
                this.currentAvatars = this.allAvatars.filter(a => a.type === 'demo');
                break;
            default:
                this.currentAvatars = this.allAvatars;
        }

        this.renderAvatars(this.currentAvatars);
    }

    filterAvatars(searchTerm) {
        if (!searchTerm.trim()) {
            this.renderAvatars(this.currentAvatars);
            return;
        }

        const filtered = this.currentAvatars.filter(avatar =>
            avatar.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            avatar.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            avatar.specialization.toLowerCase().includes(searchTerm.toLowerCase())
        );

        this.renderAvatars(filtered);
    }

    sortAvatars(sortBy) {
        const sorted = [...this.currentAvatars].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'created':
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                case 'activity':
                    return (b.stats?.conversations || 0) - (a.stats?.conversations || 0);
                case 'performance':
                    return (b.stats?.accuracy || 0) - (a.stats?.accuracy || 0);
                default:
                    return 0;
            }
        });

        this.renderAvatars(sorted);
    }

    renderAvatars(avatars) {
        const avatarsGrid = document.getElementById('avatarsGrid');
        if (!avatarsGrid) return;

        if (avatars.length === 0) {
            this.showEmptyState();
            return;
        }

        const avatarsHTML = avatars.map(avatar => this.createAvatarCard(avatar)).join('');
        avatarsGrid.innerHTML = avatarsHTML;

        // Add event listeners to avatar cards
        this.bindAvatarCardEvents();
    }

    createAvatarCard(avatar) {
        const initial = avatar.name.charAt(0);

        // Handle both old format (stats) and new format (usage_stats + flows array)
        const hasFlows = (avatar.flows && avatar.flows.length > 0) || (avatar.stats && avatar.stats.flows > 0);
        const conversations = avatar.usage_stats?.total_conversations || avatar.stats?.conversations || 0;
        const flows = (avatar.flows && avatar.flows.length) || avatar.stats?.flows || 0;
        const accuracy = avatar.usage_stats?.success_rate || avatar.stats?.accuracy || 0;

        const badgeClass = avatar.type === 'demo' ? 'demo' : (avatar.status === 'active' ? '' : 'inactive');
        const badgeText = avatar.type === 'demo' ? 'DEMO' : (avatar.status === 'active' ? 'AKTYWNY' : 'NIEAKTYWNY');

        return `
            <div class="avatar-card" data-avatar-id="${avatar.id}">
                <div class="avatar-badge ${badgeClass}">${badgeText}</div>
                <button class="avatar-menu-btn" data-avatar-id="${avatar.id}">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                
                <div class="avatar-header">
                    <div class="avatar-image">${initial}</div>
                    <div class="avatar-info">
                        <div class="avatar-name">${avatar.name}</div>
                        <div class="avatar-type">${avatar.type === 'demo' ? 'Demo Avatar' : (hasFlows ? 'Z Flows' : 'Reaktywny')}</div>
                        <div class="avatar-description">${avatar.description}</div>
                    </div>
                </div>

                <div class="avatar-stats">
                    <div class="avatar-stat">
                        <div class="stat-value">${conversations}</div>
                        <div class="stat-label">Rozmów</div>
                    </div>
                    <div class="avatar-stat">
                        <div class="stat-value">${flows}</div>
                        <div class="stat-label">Flows</div>
                    </div>
                    <div class="avatar-stat">
                        <div class="stat-value">${Math.round(accuracy)}%</div>
                        <div class="stat-label">Dokładność</div>
                    </div>
                </div>

                <div class="avatar-actions">
                    ${avatar.type === 'demo'
            ? `<button class="avatar-btn avatar-btn-primary" data-action="copy" data-avatar-id="${avatar.id}">Kopiuj</button>
                           <button class="avatar-btn avatar-btn-secondary" data-action="chat" data-avatar-id="${avatar.id}">Testuj</button>`
            : `<button class="avatar-btn avatar-btn-primary" data-action="edit" data-avatar-id="${avatar.id}">Edytuj</button>
                           <button class="avatar-btn avatar-btn-secondary" data-action="chat" data-avatar-id="${avatar.id}">Chat</button>`
        }
                </div>
            </div>
        `;
    }

    bindAvatarCardEvents() {
        // Avatar action buttons
        document.querySelectorAll('.avatar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const avatarId = btn.dataset.avatarId;
                this.handleAvatarAction(action, avatarId);
            });
        });

        // Avatar menu buttons
        document.querySelectorAll('.avatar-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const avatarId = btn.dataset.avatarId;
                this.showAvatarMenu(avatarId, e.target);
            });
        });

        // Avatar cards (click to view details)
        document.querySelectorAll('.avatar-card').forEach(card => {
            card.addEventListener('click', () => {
                const avatarId = card.dataset.avatarId;
                this.showAvatarDetails(avatarId);
            });
        });
    }

    handleAvatarAction(action, avatarId) {
        console.log(`🎭 Avatar action: ${action} for ${avatarId}`);

        switch (action) {
            case 'chat':
                this.startChatWithAvatar(avatarId);
                break;
            case 'edit':
                this.editAvatar(avatarId);
                break;
            case 'copy':
                this.copyDemoAvatar(avatarId);
                break;
            default:
                console.log('Unknown avatar action:', action);
        }
    }

    startChatWithAvatar(avatarId) {
        // Store selected avatar for chat
        localStorage.setItem('selectedAvatarId', avatarId);
        this.navigateToPage('simulation-dashboard');
    }

    editAvatar(avatarId) {
        // Store avatar for editing
        localStorage.setItem('editAvatarId', avatarId);
        // Use enhanced avatar builder for editing
        window.location.href = '/enhanced-avatar-builder.html';
    }

    copyDemoAvatar(avatarId) {
        if (!this.isLoggedIn) {
            this.showNotification('Zaloguj się aby skopiować demo avatar', 'warning');
            return;
        }

        const avatar = this.allAvatars.find(a => a.id === avatarId);
        if (!avatar) return;

        // Show confirmation dialog
        if (confirm(`Czy chcesz skopiować avatar "${avatar.name}" do swojego konta?`)) {
            this.performCopyAvatar(avatar);
        }
    }

    async performCopyAvatar(avatar) {
        try {
            this.showNotification('Kopiowanie avatara...', 'info');

            const response = await this.makeAuthenticatedRequest('/api/avatars/copy', {
                method: 'POST',
                body: JSON.stringify({
                    sourceAvatarId: avatar.id,
                    name: `${avatar.name} (Kopia)`,
                    customizations: {}
                })
            });

            if (response.ok) {
                this.showNotification('Avatar skopiowany pomyślnie!', 'success');
                this.loadAvatars(); // Refresh the list
            } else {
                throw new Error('Failed to copy avatar');
            }
        } catch (error) {
            console.error('Error copying avatar:', error);
            this.showNotification('Błąd podczas kopiowania avatara', 'error');
        }
    }

    showAvatarDetails(avatarId) {
        const avatar = this.allAvatars.find(a => a.id === avatarId);
        if (!avatar) return;

        // Show avatar details modal/sidebar
        console.log('🔍 Showing avatar details for:', avatar);
        // TODO: Implement avatar details view
        this.showNotification('Szczegóły avatara - funkcja w przygotowaniu', 'info');
    }

    showAvatarMenu(avatarId, buttonElement) {
        // TODO: Implement context menu for avatar
        console.log('📋 Avatar menu for:', avatarId);
        this.showNotification('Menu avatara - funkcja w przygotowaniu', 'info');
    }

    showEmptyState() {
        const avatarsGrid = document.getElementById('avatarsGrid');
        if (!avatarsGrid) return;

        avatarsGrid.innerHTML = `
            <div class="avatars-empty">
                <div class="empty-icon">
                    <i class="fas fa-users"></i>
                </div>
                <h3 class="empty-title">Brak avatarów</h3>
                <p class="empty-description">
                    Nie masz jeszcze żadnych avatarów. Stwórz swojego pierwszego avatara lub skopiuj jeden z demo avatarów.
                </p>
                <button class="empty-action" onclick="homepageApp.navigateToPage('avatar-creator')">
                    <i class="fas fa-plus"></i>
                    Stwórz Pierwszego Avatara
                </button>
            </div>
        `;
    }

    showAvatarsError() {
        const avatarsGrid = document.getElementById('avatarsGrid');
        if (!avatarsGrid) return;

        avatarsGrid.innerHTML = `
            <div class="avatars-empty">
                <div class="empty-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="empty-title">Błąd ładowania</h3>
                <p class="empty-description">
                    Nie udało się załadować avatarów. Sprawdź połączenie internetowe i spróbuj ponownie.
                </p>
                <button class="empty-action" onclick="homepageApp.loadAvatars()">
                    <i class="fas fa-refresh"></i>
                    Spróbuj Ponownie
                </button>
            </div>
        `;
    }

    showImportAvatarDialog() {
        this.showNotification('Import avatara - funkcja w przygotowaniu', 'info');
        // TODO: Implement avatar import functionality
    }
}

// ============ CSS ANIMATIONS (Added via JavaScript) ============
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// ============ INITIALIZE APP ============
let homepageApp;

document.addEventListener('DOMContentLoaded', () => {
    homepageApp = new HomepageApp();
});

// ============ UTILITY FUNCTIONS ============
function updateActiveAvatar(avatarData) {
    const avatarName = document.querySelector('.user-name');
    if (avatarName && avatarData) {
        avatarName.textContent = avatarData.name || 'Custom Avatar';
    }
}

function refreshDashboard() {
    console.log('🔄 Refreshing dashboard data...');
    if (homepageApp) {
        homepageApp.loadCustomAvatars();
    }
}

// Export for global access
window.homepageApp = homepageApp;
