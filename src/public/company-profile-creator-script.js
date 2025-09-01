// Company Profile Creator
class CompanyProfileCreator {
    constructor() {
        this.currentProfile = null;
        this.tags = {
            values: [],
            products: [],
            targetAudience: [],
            keyMessages: [],
            doNotUse: []
        };
        this.teamRoles = [];
        
        this.init();
    }

    async init() {
        console.log('🏢 Company Profile Creator initialized');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load existing profiles
        await this.loadExistingProfiles();
        
        // Add default team role
        this.addTeamRole();
    }

    setupEventListeners() {
        // Tag inputs
        const tagInputs = ['valuesInput', 'productsInput', 'targetAudienceInput', 'keyMessagesInput', 'doNotUseInput'];
        tagInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const tagType = inputId.replace('Input', '');
                        this.addTagFromInput(tagType);
                    }
                });
            }
        });
    }

    addTag(tagType) {
        const input = document.getElementById(`${tagType}Input`);
        if (input && input.value.trim()) {
            this.addTagFromInput(tagType);
        } else {
            // Show input field for adding new tag
            input?.focus();
        }
    }

    addTagFromInput(tagType) {
        const input = document.getElementById(`${tagType}Input`);
        const value = input.value.trim();
        
        if (value && !this.tags[tagType].includes(value)) {
            this.tags[tagType].push(value);
            input.value = '';
            this.updateTagsDisplay(tagType);
        }
    }

    removeTag(tagType, index) {
        this.tags[tagType].splice(index, 1);
        this.updateTagsDisplay(tagType);
    }

    updateTagsDisplay(tagType) {
        const display = document.getElementById(`${tagType}Display`);
        if (!display) return;

        const tags = this.tags[tagType];
        const addButton = display.querySelector('.add-tag-btn');
        
        // Clear existing tags but keep add button
        display.innerHTML = '';
        
        // Add tag items
        tags.forEach((tag, index) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `
                <span>${tag}</span>
                <span class="tag-remove" onclick="companyCreator.removeTag('${tagType}', ${index})">×</span>
            `;
            display.appendChild(tagElement);
        });
        
        // Re-add the add button
        display.appendChild(addButton);
    }

    addTeamRole() {
        const roleId = `role_${Date.now()}`;
        const role = {
            id: roleId,
            title: '',
            description: '',
            responsibilities: []
        };
        
        this.teamRoles.push(role);
        this.updateTeamRolesDisplay();
        
        // Focus on the new role input
        setTimeout(() => {
            const newInput = document.querySelector(`#${roleId}_title`);
            if (newInput) newInput.focus();
        }, 100);
    }

    removeTeamRole(roleId) {
        this.teamRoles = this.teamRoles.filter(role => role.id !== roleId);
        this.updateTeamRolesDisplay();
    }

    updateTeamRolesDisplay() {
        const container = document.getElementById('teamRolesList');
        if (!container) return;

        container.innerHTML = '';
        
        this.teamRoles.forEach((role, index) => {
            const roleElement = document.createElement('div');
            roleElement.className = 'role-item';
            roleElement.innerHTML = `
                <input type="text" 
                       id="${role.id}_title" 
                       placeholder="Stanowisko (np. CEO, CTO, Marketing Manager)" 
                       value="${role.title}"
                       onchange="companyCreator.updateTeamRole('${role.id}', 'title', this.value)">
                <input type="text" 
                       id="${role.id}_description" 
                       placeholder="Opis roli" 
                       value="${role.description}"
                       onchange="companyCreator.updateTeamRole('${role.id}', 'description', this.value)">
                <button type="button" class="role-remove" onclick="companyCreator.removeTeamRole('${role.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(roleElement);
        });
    }

    updateTeamRole(roleId, field, value) {
        const role = this.teamRoles.find(r => r.id === roleId);
        if (role) {
            role[field] = value;
        }
    }

    async generateWithAI(field) {
        console.log(`🤖 Generating ${field} with AI...`);
        
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';
        button.disabled = true;
        
        try {
            // Get context from current form data
            const context = this.getFormData();
            
            const response = await fetch('/api/flow-wizard/generate-avatar-field', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    field_name: field,
                    context: {
                        company_name: context.name,
                        industry: context.industry,
                        company_size: context.size,
                        existing_data: context
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success && result.generated_content) {
                // Fill the appropriate field
                const fieldElement = document.getElementById(this.getFieldElementId(field));
                if (fieldElement) {
                    fieldElement.value = result.generated_content;
                    this.showNotification(`✅ Wygenerowano ${field} z AI!`, 'success');
                } else {
                    console.warn(`Field element not found for: ${field}`);
                }
            } else {
                throw new Error(result.error || 'Nie udało się wygenerować treści');
            }
            
        } catch (error) {
            console.error(`❌ Error generating ${field}:`, error);
            this.showNotification(`❌ Błąd generowania: ${error.message}`, 'error');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    getFieldElementId(field) {
        const fieldMapping = {
            'description': 'companyDescription',
            'mission': 'mission'
        };
        return fieldMapping[field] || field;
    }

    getFormData() {
        return {
            name: document.getElementById('companyName')?.value || '',
            description: document.getElementById('companyDescription')?.value || '',
            industry: document.getElementById('industry')?.value || '',
            size: document.getElementById('companySize')?.value || 'startup',
            location: document.getElementById('location')?.value || '',
            mission: document.getElementById('mission')?.value || '',
            values: this.tags.values,
            products_services: this.tags.products,
            target_audience: this.tags.targetAudience,
            brand_voice: {
                tone: document.getElementById('brandTone')?.value || 'professional',
                style: document.getElementById('brandStyle')?.value || 'formal',
                key_messages: this.tags.keyMessages,
                do_not_use: this.tags.doNotUse
            },
            team_roles: this.teamRoles.filter(role => role.title.trim())
        };
    }

    async saveProfile() {
        console.log('💾 Saving company profile...');
        
        const formData = this.getFormData();
        
        // Validation
        if (!formData.name.trim()) {
            this.showNotification('❌ Nazwa firmy jest wymagana', 'error');
            return;
        }
        
        if (!formData.industry) {
            this.showNotification('❌ Branża jest wymagana', 'error');
            return;
        }
        
        const saveButton = document.querySelector('.btn-primary');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
        saveButton.disabled = true;
        
        try {
            // Generate unique ID for the profile
            const profileId = this.currentProfile?.id || `company_${Date.now()}`;
            
            const profileData = {
                ...formData,
                id: profileId,
                user_id: 'current_user', // TODO: Get from auth
                created_at: this.currentProfile?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_template: false
            };
            
            console.log('📤 Sending profile data:', profileData);
            
            // For now, use the extended database service endpoint
            // TODO: Create proper company profile endpoint
            const response = await fetch('/api/company-profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Profile saved:', result);
            
            this.showNotification('✅ Profil firmy został zapisany!', 'success');
            
            // Refresh the profiles list
            await this.loadExistingProfiles();
            
            // Clear form if it was a new profile
            if (!this.currentProfile) {
                this.clearForm();
            }
            
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            this.showNotification(`❌ Błąd zapisywania: ${error.message}`, 'error');
        } finally {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        }
    }

    async loadExistingProfiles() {
        console.log('📂 Loading existing profiles...');
        
        try {
            const response = await fetch('/api/company-profiles');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📥 Loaded profiles:', result);
            
            this.displayProfiles(result.data || {});
            
        } catch (error) {
            console.error('❌ Error loading profiles:', error);
            document.getElementById('existingProfiles').innerHTML = `
                <p style="text-align: center; color: #ff6b6b;">
                    Błąd ładowania profili: ${error.message}
                </p>
            `;
        }
    }

    displayProfiles(profiles) {
        const container = document.getElementById('existingProfiles');
        
        if (Object.keys(profiles).length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #a0aec0;">
                    Brak zapisanych profili firm. Stwórz pierwszy profil!
                </p>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        Object.entries(profiles).forEach(([profileId, profile]) => {
            const profileCard = document.createElement('div');
            profileCard.className = 'profile-card';
            profileCard.innerHTML = `
                <div class="profile-header">
                    <div>
                        <div class="profile-title">${profile.name || profile.company_id || 'Unnamed Company'}</div>
                        <div class="profile-meta">
                            <span><i class="fas fa-industry"></i> ${profile.industry || 'N/A'}</span>
                            <span><i class="fas fa-users"></i> ${profile.size || profile.company_size || 'N/A'}</span>
                            <span><i class="fas fa-map-marker-alt"></i> ${profile.location || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="profile-actions">
                        <button class="btn-small btn-edit" onclick="companyCreator.editProfile('${profileId}')">
                            <i class="fas fa-edit"></i> Edytuj
                        </button>
                        <button class="btn-small btn-delete" onclick="companyCreator.deleteProfile('${profileId}')">
                            <i class="fas fa-trash"></i> Usuń
                        </button>
                    </div>
                </div>
                <p style="color: #a0aec0; margin: 0;">${profile.description || profile.company_context || 'Brak opisu'}</p>
            `;
            container.appendChild(profileCard);
        });
    }

    editProfile(profileId) {
        console.log('✏️ Editing profile:', profileId);
        // TODO: Load profile data into form
        this.showNotification('⚠️ Edycja profili będzie dostępna wkrótce', 'error');
    }

    deleteProfile(profileId) {
        if (confirm('Czy na pewno chcesz usunąć ten profil?')) {
            console.log('🗑️ Deleting profile:', profileId);
            // TODO: Implement profile deletion
            this.showNotification('⚠️ Usuwanie profili będzie dostępne wkrótce', 'error');
        }
    }

    previewProfile() {
        const formData = this.getFormData();
        console.log('👁️ Profile preview:', formData);
        
        // Create preview modal/popup
        const preview = JSON.stringify(formData, null, 2);
        alert(`Profile Preview:\n\n${preview}`);
    }

    loadTemplates() {
        console.log('📋 Loading templates...');
        this.showNotification('⚠️ Szablony będą dostępne wkrótce', 'error');
    }

    clearForm() {
        // Clear all form fields
        document.getElementById('companyProfileForm').reset();
        
        // Clear tags
        Object.keys(this.tags).forEach(tagType => {
            this.tags[tagType] = [];
            this.updateTagsDisplay(tagType);
        });
        
        // Clear team roles
        this.teamRoles = [];
        this.updateTeamRolesDisplay();
        this.addTeamRole(); // Add one default role
        
        this.currentProfile = null;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.companyCreator = new CompanyProfileCreator();
});
