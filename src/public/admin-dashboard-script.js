// ============ ADMIN DASHBOARD JAVASCRIPT ============

class AdminDashboard {
    constructor() {
        this.currentTab = 'overview';
        this.users = [];
        this.auditLogs = [];
        this.systemStats = {};
        
        // Wait for auth manager to be ready
        this.waitForAuthManager().then(() => {
            this.init();
        });
    }

    async waitForAuthManager() {
        while (typeof window.authManager === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('✅ AuthManager ready for admin dashboard');
    }

    init() {
        // Check admin permissions
        if (!this.checkAdminAccess()) {
            this.redirectToUnauthorized();
            return;
        }

        this.bindEvents();
        this.loadInitialData();
        
        console.log('🛡️ Admin Dashboard initialized');
    }

    // ============ ACCESS CONTROL ============

    checkAdminAccess() {
        const user = window.authManager.getUser();
        const isAdmin = window.authManager.isAdmin();
        
        console.log('🔍 Admin access check:', { user, isAdmin });
        
        return isAdmin;
    }

    redirectToUnauthorized() {
        alert('Dostęp tylko dla administratorów!');
        window.location.href = '/';
    }

    // ============ EVENT BINDING ============

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // User form submission
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => this.handleUserFormSubmit(e));
        }

        // Modal close on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // ============ TAB MANAGEMENT ============

    switchTab(tabName) {
        // Update active tab link
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'overview':
                await this.loadOverviewData();
                break;
            case 'users':
                await this.loadUsersData();
                break;
            case 'roles':
                await this.loadRolesData();
                break;
            case 'audit':
                await this.loadAuditData();
                break;
            case 'settings':
                await this.loadSettingsData();
                break;
        }
    }

    // ============ DATA LOADING ============

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadSystemStats(),
                this.loadOverviewData()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Błąd podczas ładowania danych');
        }
    }

    async loadSystemStats() {
        try {
            // Load basic system statistics
            const response = await window.authManager.makeAuthenticatedRequest('/api/admin/stats');
            
            if (response.ok) {
                const data = await response.json();
                this.systemStats = data.data || {};
                this.updateStatsDisplay();
            } else {
                // Fallback to mock data
                this.systemStats = {
                    totalUsers: 42,
                    activeUsers: 38,
                    totalAvatars: 156,
                    totalSimulations: 89
                };
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading system stats:', error);
            // Use mock data
            this.systemStats = {
                totalUsers: 42,
                activeUsers: 38,
                totalAvatars: 156,
                totalSimulations: 89
            };
            this.updateStatsDisplay();
        }
    }

    updateStatsDisplay() {
        document.getElementById('totalUsers').textContent = this.systemStats.totalUsers || '0';
        document.getElementById('activeUsers').textContent = this.systemStats.activeUsers || '0';
        document.getElementById('totalAvatars').textContent = this.systemStats.totalAvatars || '0';
        document.getElementById('totalSimulations').textContent = this.systemStats.totalSimulations || '0';
    }

    async loadOverviewData() {
        try {
            const activityContainer = document.getElementById('recentActivity');
            activityContainer.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Czas</th>
                            <th>Użytkownik</th>
                            <th>Akcja</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>2024-01-15 14:30</td>
                            <td>admin@example.com</td>
                            <td>Utworzenie avatara</td>
                            <td><span class="badge badge-success">Sukces</span></td>
                        </tr>
                        <tr>
                            <td>2024-01-15 14:25</td>
                            <td>user@example.com</td>
                            <td>Logowanie</td>
                            <td><span class="badge badge-success">Sukces</span></td>
                        </tr>
                        <tr>
                            <td>2024-01-15 14:20</td>
                            <td>test@example.com</td>
                            <td>Nieudane logowanie</td>
                            <td><span class="badge badge-danger">Błąd</span></td>
                        </tr>
                    </tbody>
                </table>
            `;
        } catch (error) {
            console.error('Error loading overview data:', error);
            document.getElementById('recentActivity').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Błąd podczas ładowania aktywności
                </div>
            `;
        }
    }

    async loadUsersData() {
        try {
            const usersContainer = document.getElementById('usersTable');
            usersContainer.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Ładowanie użytkowników...</p>
                </div>
            `;

            const response = await window.authManager.makeAuthenticatedRequest('/api/auth/users');
            
            if (response.ok) {
                const data = await response.json();
                this.users = data.data || [];
                this.renderUsersTable();
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            document.getElementById('usersTable').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Błąd podczas ładowania użytkowników
                </div>
            `;
        }
    }

    renderUsersTable() {
        const usersContainer = document.getElementById('usersTable');
        
        if (this.users.length === 0) {
            usersContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    Brak użytkowników do wyświetlenia
                </div>
            `;
            return;
        }

        usersContainer.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Imię i Nazwisko</th>
                        <th>Email</th>
                        <th>Rola</th>
                        <th>Status</th>
                        <th>Ostatnie logowanie</th>
                        <th>Akcje</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.users.map(user => this.renderUserRow(user)).join('')}
                </tbody>
            </table>
        `;
    }

    renderUserRow(user) {
        const statusBadge = this.getStatusBadge(user.status);
        const roleBadge = this.getRoleBadge(user.role);
        const lastLogin = user.last_login ? new Date(user.last_login).toLocaleDateString('pl-PL') : 'Nigdy';

        return `
            <tr>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${lastLogin}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="adminApp.editUser('${user.id}')" title="Edytuj">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="adminApp.toggleUserStatus('${user.id}')" title="Zmień status">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                    ${user.role !== 'admin' ? `
                        <button class="btn btn-danger btn-sm" onclick="adminApp.deleteUser('${user.id}')" title="Usuń">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    getStatusBadge(status) {
        const badges = {
            active: '<span class="badge badge-success">Aktywny</span>',
            inactive: '<span class="badge badge-warning">Nieaktywny</span>',
            suspended: '<span class="badge badge-danger">Zawieszony</span>'
        };
        return badges[status] || '<span class="badge badge-secondary">Nieznany</span>';
    }

    getRoleBadge(role) {
        const badges = {
            admin: '<span class="badge badge-primary">Administrator</span>',
            user: '<span class="badge badge-secondary">Użytkownik</span>'
        };
        return badges[role] || '<span class="badge badge-secondary">Nieznana</span>';
    }

    async loadRolesData() {
        try {
            const rolesContainer = document.getElementById('rolesContent');
            
            // Show loading
            rolesContainer.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Ładowanie ról i uprawnień...</p>
                </div>
            `;

            // Try to get permission analytics
            const response = await window.authManager.makeAuthenticatedRequest('/api/admin/permissions/analytics');
            
            let permissionsData;
            if (response.ok) {
                const data = await response.json();
                permissionsData = data.data;
            } else {
                // Fallback to mock data
                permissionsData = {
                    system_permissions: {
                        admin: [
                            'create_avatars', 'read_all_avatars', 'update_all_avatars', 'delete_all_avatars',
                            'manage_users', 'view_system_analytics', 'manage_global_settings'
                        ],
                        user: [
                            'create_avatars', 'read_own_avatars', 'update_own_avatars', 'delete_own_avatars',
                            'read_demo_avatars'
                        ]
                    },
                    user_distribution: {
                        by_role: { admin: 2, user: 40 },
                        by_status: { active: 38, inactive: 3, suspended: 1 }
                    }
                };
            }

            this.renderRolesContent(permissionsData);

        } catch (error) {
            console.error('Error loading roles data:', error);
            document.getElementById('rolesContent').innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Błąd podczas ładowania ról i uprawnień
                </div>
            `;
        }
    }

    renderRolesContent(permissionsData) {
        const rolesContainer = document.getElementById('rolesContent');
        
        rolesContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div class="data-table">
                    <div class="data-table-header">
                        <h4 class="data-table-title">Dystrybucja Ról</h4>
                    </div>
                    <div style="padding: 20px;">
                        ${Object.entries(permissionsData.user_distribution?.by_role || {}).map(([role, count]) => `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>${this.getRoleName(role)}:</span>
                                <strong>${count}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="data-table">
                    <div class="data-table-header">
                        <h4 class="data-table-title">Status Użytkowników</h4>
                    </div>
                    <div style="padding: 20px;">
                        ${Object.entries(permissionsData.user_distribution?.by_status || {}).map(([status, count]) => `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span>${this.getStatusName(status)}:</span>
                                <strong>${count}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="data-table">
                <div class="data-table-header">
                    <h4 class="data-table-title">Uprawnienia według Ról</h4>
                </div>
                <div style="padding: 20px;">
                    ${Object.entries(permissionsData.system_permissions || {}).map(([role, permissions]) => `
                        <div style="margin-bottom: 30px;">
                            <h5 style="color: #2c3e50; margin-bottom: 15px;">
                                ${this.getRoleBadge(role)} ${this.getRoleName(role)}
                            </h5>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                                ${permissions.map(permission => `
                                    <div style="background: #f8f9fa; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem;">
                                        <i class="fas fa-check-circle" style="color: #28a745; margin-right: 6px;"></i>
                                        ${this.formatPermissionName(permission)}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getRoleName(role) {
        const names = {
            admin: 'Administrator',
            user: 'Użytkownik'
        };
        return names[role] || role;
    }

    getStatusName(status) {
        const names = {
            active: 'Aktywny',
            inactive: 'Nieaktywny',
            suspended: 'Zawieszony'
        };
        return names[status] || status;
    }

    formatPermissionName(permission) {
        return permission
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    async loadAuditData() {
        const auditContainer = document.getElementById('auditLogs');
        
        auditContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <strong>Informacja:</strong> Logi audytu będą dostępne w przyszłych wersjach.
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Czas</th>
                        <th>Użytkownik</th>
                        <th>Akcja</th>
                        <th>Zasób</th>
                        <th>IP</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>2024-01-15 14:30:25</td>
                        <td>admin@example.com</td>
                        <td>create_avatar</td>
                        <td>avatars/12345</td>
                        <td>192.168.1.100</td>
                        <td><span class="badge badge-success">Sukces</span></td>
                    </tr>
                    <tr>
                        <td>2024-01-15 14:25:10</td>
                        <td>user@example.com</td>
                        <td>login</td>
                        <td>users/67890</td>
                        <td>192.168.1.101</td>
                        <td><span class="badge badge-success">Sukces</span></td>
                    </tr>
                    <tr>
                        <td>2024-01-15 14:20:45</td>
                        <td>test@example.com</td>
                        <td>login_failed</td>
                        <td>users/unknown</td>
                        <td>192.168.1.102</td>
                        <td><span class="badge badge-danger">Błąd</span></td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    async loadSettingsData() {
        // Settings tab is already populated in HTML
        console.log('Settings tab loaded');
    }

    // ============ USER MANAGEMENT ============

    showCreateUserModal() {
        document.getElementById('userModalTitle').textContent = 'Dodaj Użytkownika';
        document.getElementById('userForm').reset();
        document.getElementById('userModal').classList.add('show');
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('userModalTitle').textContent = 'Edytuj Użytkownika';
        document.getElementById('userFirstName').value = user.first_name;
        document.getElementById('userLastName').value = user.last_name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userStatus').value = user.status;
        
        document.getElementById('userForm').dataset.userId = userId;
        document.getElementById('userModal').classList.add('show');
    }

    async handleUserFormSubmit(e) {
        e.preventDefault();
        
        const formData = {
            first_name: document.getElementById('userFirstName').value,
            last_name: document.getElementById('userLastName').value,
            email: document.getElementById('userEmail').value,
            role: document.getElementById('userRole').value,
            status: document.getElementById('userStatus').value
        };

        const userId = document.getElementById('userForm').dataset.userId;
        
        try {
            let response;
            if (userId) {
                // Update existing user
                response = await window.authManager.makeAuthenticatedRequest(`/api/auth/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                // Create new user
                response = await window.authManager.makeAuthenticatedRequest('/api/auth/users', {
                    method: 'POST',
                    body: JSON.stringify({...formData, password: 'TempPassword123!'})
                });
            }

            if (response.ok) {
                this.showSuccess(userId ? 'Użytkownik zaktualizowany' : 'Użytkownik utworzony');
                this.closeModal('userModal');
                await this.loadUsersData();
            } else {
                const error = await response.json();
                this.showError(error.error || 'Błąd podczas zapisywania użytkownika');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError('Błąd podczas zapisywania użytkownika');
        }
    }

    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        
        try {
            const response = await window.authManager.makeAuthenticatedRequest(`/api/auth/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                this.showSuccess('Status użytkownika zmieniony');
                await this.loadUsersData();
            } else {
                const error = await response.json();
                this.showError(error.error || 'Błąd podczas zmiany statusu');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showError('Błąd podczas zmiany statusu');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
            return;
        }

        try {
            const response = await window.authManager.makeAuthenticatedRequest(`/api/auth/users/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccess('Użytkownik usunięty');
                await this.loadUsersData();
            } else {
                const error = await response.json();
                this.showError(error.error || 'Błąd podczas usuwania użytkownika');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Błąd podczas usuwania użytkownika');
        }
    }

    // ============ UTILITY METHODS ============

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
        if (modalId === 'userModal') {
            document.getElementById('userForm').reset();
            delete document.getElementById('userForm').dataset.userId;
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;
        
        // Insert at top of content
        const content = document.querySelector('.admin-content');
        content.insertBefore(notification, content.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    async refreshUsers() {
        await this.loadUsersData();
        this.showSuccess('Lista użytkowników odświeżona');
    }

    async refreshAuditLogs() {
        await this.loadAuditData();
        this.showSuccess('Logi audytu odświeżone');
    }

    async exportAuditLogs() {
        this.showNotification('Eksport logów będzie dostępny w przyszłych wersjach', 'info');
    }

    async showPermissionsAnalytics() {
        // Switch to roles tab if not already there
        if (this.currentTab !== 'roles') {
            this.switchTab('roles');
        }
        this.showNotification('Analiza uprawnień wyświetlona', 'info');
    }
}

// ============ GLOBAL INITIALIZATION ============

// Initialize admin dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminDashboard();
});

console.log('🛡️ Admin Dashboard script loaded');
