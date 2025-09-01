// Scene Builder
class SceneBuilder {
    constructor() {
        this.currentScene = null;
        this.selectedCategory = null;
        this.selectedDifficulty = 'intermediate';
        this.lists = {
            objectives: [],
            constraints: [],
            successCriteria: [],
            conversationStarters: [],
            keyTalkingPoints: [],
            potentialObjections: []
        };
        this.participants = {
            required: [],
            optional: []
        };
        
        this.init();
    }

    async init() {
        console.log('🎬 Scene Builder initialized');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load company profiles for context selector
        await this.loadCompanyProfiles();
        
        // Load existing scenes
        await this.loadExistingScenes();
        
        // Load templates
        await this.loadTemplates();
        
        // Add default participant
        this.addParticipant('required');
    }

    setupEventListeners() {
        // List inputs
        const listInputs = ['objectivesInput', 'constraintsInput', 'successCriteriaInput', 
                           'conversationStartersInput', 'keyTalkingPointsInput', 'potentialObjectionsInput'];
        listInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const listType = inputId.replace('Input', '');
                        this.addListItem(listType);
                    }
                });
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[onclick="sceneBuilder.switchTab('${tabName}')"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        // Load data for specific tabs
        if (tabName === 'manage') {
            this.loadExistingScenes();
        } else if (tabName === 'templates') {
            this.loadTemplates();
        }
    }

    selectCategory(category) {
        // Update visual selection
        document.querySelectorAll('.category-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector(`[data-category="${category}"]`).classList.add('selected');
        
        this.selectedCategory = category;
        console.log('📂 Selected category:', category);
    }

    selectDifficulty(difficulty) {
        // Update visual selection
        document.querySelectorAll('.difficulty-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('selected');
        
        this.selectedDifficulty = difficulty;
        console.log('⭐ Selected difficulty:', difficulty);
    }

    focusInput(listType) {
        const input = document.getElementById(`${listType}Input`);
        if (input) {
            input.focus();
        }
    }

    addListItem(listType) {
        const input = document.getElementById(`${listType}Input`);
        const value = input.value.trim();
        
        if (value && !this.lists[listType].includes(value)) {
            this.lists[listType].push(value);
            input.value = '';
            this.updateListDisplay(listType);
        }
    }

    removeListItem(listType, index) {
        this.lists[listType].splice(index, 1);
        this.updateListDisplay(listType);
    }

    updateListDisplay(listType) {
        const display = document.getElementById(`${listType}Display`);
        if (!display) return;

        const items = this.lists[listType];
        const addButton = display.querySelector('.add-item-btn');
        
        // Clear existing items but keep add button
        display.innerHTML = '';
        
        // Add list items
        items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'list-item';
            itemElement.innerHTML = `
                <span class="list-item-text">${item}</span>
                <span class="list-item-remove" onclick="sceneBuilder.removeListItem('${listType}', ${index})">
                    <i class="fas fa-times"></i>
                </span>
            `;
            display.appendChild(itemElement);
        });
        
        // Re-add the add button
        display.appendChild(addButton);
    }

    addParticipant(type) {
        const participantId = `participant_${Date.now()}`;
        const participant = {
            id: participantId,
            role: '',
            motivation: '',
            behavior_style: 'neutral'
        };
        
        this.participants[type].push(participant);
        this.updateParticipantsDisplay(type);
        
        // Focus on the new participant input
        setTimeout(() => {
            const newInput = document.querySelector(`#${participantId}_role`);
            if (newInput) newInput.focus();
        }, 100);
    }

    removeParticipant(type, participantId) {
        this.participants[type] = this.participants[type].filter(p => p.id !== participantId);
        this.updateParticipantsDisplay(type);
    }

    updateParticipantsDisplay(type) {
        const container = document.getElementById(`${type}ParticipantsList`);
        if (!container) return;

        container.innerHTML = '';
        
        this.participants[type].forEach((participant, index) => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item';
            participantElement.innerHTML = `
                <input type="text" 
                       id="${participant.id}_role" 
                       placeholder="Rola (np. Klient, Manager, Sprzedawca)" 
                       value="${participant.role}"
                       onchange="sceneBuilder.updateParticipant('${type}', '${participant.id}', 'role', this.value)">
                <input type="text" 
                       id="${participant.id}_motivation" 
                       placeholder="Motywacja uczestnika" 
                       value="${participant.motivation}"
                       onchange="sceneBuilder.updateParticipant('${type}', '${participant.id}', 'motivation', this.value)">
                <select onchange="sceneBuilder.updateParticipant('${type}', '${participant.id}', 'behavior_style', this.value)">
                    <option value="cooperative" ${participant.behavior_style === 'cooperative' ? 'selected' : ''}>Współpracujący</option>
                    <option value="neutral" ${participant.behavior_style === 'neutral' ? 'selected' : ''}>Neutralny</option>
                    <option value="challenging" ${participant.behavior_style === 'challenging' ? 'selected' : ''}>Wymagający</option>
                    <option value="aggressive" ${participant.behavior_style === 'aggressive' ? 'selected' : ''}>Agresywny</option>
                </select>
                <button type="button" class="participant-remove" onclick="sceneBuilder.removeParticipant('${type}', '${participant.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(participantElement);
        });
    }

    updateParticipant(type, participantId, field, value) {
        const participant = this.participants[type].find(p => p.id === participantId);
        if (participant) {
            participant[field] = value;
        }
    }

    async loadCompanyProfiles() {
        console.log('🏢 Loading company profiles...');
        
        try {
            const response = await fetch('/api/company-profiles');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            const profiles = result.data || {};
            
            const selector = document.getElementById('companyContext');
            if (selector) {
                // Clear existing options except the first one
                selector.innerHTML = '<option value="">Wybierz profil firmy (opcjonalne)</option>';
                
                Object.entries(profiles).forEach(([profileId, profile]) => {
                    const option = document.createElement('option');
                    option.value = profileId;
                    option.textContent = profile.name || profile.company_id || 'Unnamed Company';
                    selector.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('❌ Error loading company profiles:', error);
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
                        scene_name: context.name,
                        category: context.category,
                        difficulty: context.difficulty_level,
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
            'description': 'sceneDescription',
            'situation': 'scenarioSituation',
            'context': 'scenarioContext'
        };
        return fieldMapping[field] || field;
    }

    getFormData() {
        return {
            name: document.getElementById('sceneName')?.value || '',
            description: document.getElementById('sceneDescription')?.value || '',
            category: this.selectedCategory || 'meeting',
            company_id: document.getElementById('companyContext')?.value || null,
            scenario: {
                situation: document.getElementById('scenarioSituation')?.value || '',
                context: document.getElementById('scenarioContext')?.value || '',
                objectives: this.lists.objectives,
                constraints: this.lists.constraints,
                success_criteria: this.lists.successCriteria
            },
            required_participants: this.participants.required.filter(p => p.role.trim()),
            optional_participants: this.participants.optional.filter(p => p.role.trim()),
            estimated_duration_minutes: parseInt(document.getElementById('estimatedDuration')?.value) || 30,
            difficulty_level: this.selectedDifficulty,
            conversation_starters: this.lists.conversationStarters,
            key_talking_points: this.lists.keyTalkingPoints,
            potential_objections: this.lists.potentialObjections
        };
    }

    async saveScene() {
        console.log('💾 Saving simulation scene...');
        
        const formData = this.getFormData();
        
        // Validation
        if (!formData.name.trim()) {
            this.showNotification('❌ Nazwa sceny jest wymagana', 'error');
            return;
        }
        
        if (!formData.category) {
            this.showNotification('❌ Kategoria sceny jest wymagana', 'error');
            return;
        }
        
        const saveButton = document.querySelector('.btn-primary');
        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zapisywanie...';
        saveButton.disabled = true;
        
        try {
            const sceneData = {
                ...formData,
                user_id: 'default_user', // TODO: Get from auth
                is_template: false,
                usage_count: 0
            };
            
            console.log('📤 Sending scene data:', sceneData);
            
            const response = await fetch('/api/simulation-scenes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sceneData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Scene saved:', result);
            
            this.showNotification('✅ Scena została zapisana!', 'success');
            
            // Refresh the scenes list
            await this.loadExistingScenes();
            
            // Clear form if it was a new scene
            if (!this.currentScene) {
                this.clearForm();
            }
            
        } catch (error) {
            console.error('❌ Error saving scene:', error);
            this.showNotification(`❌ Błąd zapisywania: ${error.message}`, 'error');
        } finally {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        }
    }

    async loadExistingScenes() {
        console.log('📂 Loading existing scenes...');
        
        try {
            const response = await fetch('/api/simulation-scenes');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📥 Loaded scenes:', result);
            
            this.displayScenes(result.data || []);
            
        } catch (error) {
            console.error('❌ Error loading scenes:', error);
            document.getElementById('existingScenes').innerHTML = `
                <p style="text-align: center; color: #ff6b6b;">
                    Błąd ładowania scen: ${error.message}
                </p>
            `;
        }
    }

    displayScenes(scenes) {
        const container = document.getElementById('existingScenes');
        
        if (scenes.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #a0aec0;">
                    Brak zapisanych scen. Stwórz pierwszą scenę!
                </p>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        scenes.forEach(scene => {
            const sceneCard = document.createElement('div');
            sceneCard.className = 'scene-card';
            sceneCard.innerHTML = `
                <div class="scene-header">
                    <div>
                        <div class="scene-title">${scene.name}</div>
                        <div class="scene-category">${this.getCategoryDisplayName(scene.category)}</div>
                    </div>
                    <div class="scene-actions">
                        <button class="btn-small btn-edit" onclick="sceneBuilder.editScene('${scene.id}')">
                            <i class="fas fa-edit"></i> Edytuj
                        </button>
                        <button class="btn-small btn-duplicate" onclick="sceneBuilder.duplicateScene('${scene.id}')">
                            <i class="fas fa-copy"></i> Duplikuj
                        </button>
                        <button class="btn-small btn-delete" onclick="sceneBuilder.deleteScene('${scene.id}')">
                            <i class="fas fa-trash"></i> Usuń
                        </button>
                    </div>
                </div>
                <div class="scene-meta">
                    <span><i class="fas fa-clock"></i> ${scene.estimated_duration_minutes} min</span>
                    <span><i class="fas fa-signal"></i> ${this.getDifficultyDisplayName(scene.difficulty_level)}</span>
                    <span><i class="fas fa-users"></i> ${scene.required_participants?.length || 0} uczestników</span>
                    <span><i class="fas fa-eye"></i> ${scene.usage_count || 0} użyć</span>
                </div>
                <p style="color: #a0aec0; margin: 0;">${scene.description || 'Brak opisu'}</p>
            `;
            container.appendChild(sceneCard);
        });
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            'meeting': 'Spotkanie',
            'sales': 'Sprzedaż',
            'training': 'Szkolenie',
            'support': 'Wsparcie',
            'negotiation': 'Negocjacje',
            'crisis': 'Kryzys',
            'onboarding': 'Onboarding'
        };
        return categoryNames[category] || category;
    }

    getDifficultyDisplayName(difficulty) {
        const difficultyNames = {
            'beginner': 'Początkujący',
            'intermediate': 'Średni',
            'advanced': 'Zaawansowany'
        };
        return difficultyNames[difficulty] || difficulty;
    }

    async loadTemplates() {
        console.log('📋 Loading scene templates...');
        
        try {
            const response = await fetch('/api/simulation-scenes/templates');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📥 Loaded templates:', result);
            
            this.displayTemplates(result.data || []);
            
        } catch (error) {
            console.error('❌ Error loading templates:', error);
            document.getElementById('sceneTemplates').innerHTML = `
                <p style="text-align: center; color: #ff6b6b;">
                    Błąd ładowania szablonów: ${error.message}
                </p>
            `;
        }
    }

    displayTemplates(templates) {
        const container = document.getElementById('sceneTemplates');
        
        if (templates.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: #a0aec0;">
                    Brak dostępnych szablonów.
                </p>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        templates.forEach(template => {
            const templateCard = document.createElement('div');
            templateCard.className = 'template-card';
            templateCard.onclick = () => this.useTemplate(template);
            templateCard.innerHTML = `
                <div class="template-icon">
                    <i class="fas fa-${this.getCategoryIcon(template.category)}"></i>
                </div>
                <div class="scene-title">${template.name}</div>
                <div class="scene-category">${this.getCategoryDisplayName(template.category)}</div>
                <p style="color: #a0aec0; margin: 10px 0;">${template.description || 'Brak opisu'}</p>
                <div class="scene-meta">
                    <span><i class="fas fa-clock"></i> ${template.estimated_duration_minutes} min</span>
                    <span><i class="fas fa-signal"></i> ${this.getDifficultyDisplayName(template.difficulty_level)}</span>
                </div>
            `;
            container.appendChild(templateCard);
        });
    }

    getCategoryIcon(category) {
        const categoryIcons = {
            'meeting': 'users',
            'sales': 'handshake',
            'training': 'graduation-cap',
            'support': 'headset',
            'negotiation': 'balance-scale',
            'crisis': 'exclamation-triangle',
            'onboarding': 'user-plus'
        };
        return categoryIcons[category] || 'theater-masks';
    }

    useTemplate(template) {
        console.log('📋 Using template:', template.name);
        
        // Switch to create tab
        this.switchTab('create');
        
        // Fill form with template data
        document.getElementById('sceneName').value = template.name + ' (kopia)';
        document.getElementById('sceneDescription').value = template.description || '';
        document.getElementById('scenarioSituation').value = template.scenario?.situation || '';
        document.getElementById('scenarioContext').value = template.scenario?.context || '';
        document.getElementById('estimatedDuration').value = template.estimated_duration_minutes || 30;
        
        // Set category and difficulty
        this.selectCategory(template.category);
        this.selectDifficulty(template.difficulty_level);
        
        // Set lists
        this.lists.objectives = [...(template.scenario?.objectives || [])];
        this.lists.constraints = [...(template.scenario?.constraints || [])];
        this.lists.successCriteria = [...(template.scenario?.success_criteria || [])];
        this.lists.conversationStarters = [...(template.conversation_starters || [])];
        this.lists.keyTalkingPoints = [...(template.key_talking_points || [])];
        this.lists.potentialObjections = [...(template.potential_objections || [])];
        
        // Update displays
        Object.keys(this.lists).forEach(listType => {
            this.updateListDisplay(listType);
        });
        
        // Set participants
        this.participants.required = [...(template.required_participants || [])];
        this.participants.optional = [...(template.optional_participants || [])];
        
        this.updateParticipantsDisplay('required');
        this.updateParticipantsDisplay('optional');
        
        this.showNotification('✅ Szablon został załadowany!', 'success');
    }

    editScene(sceneId) {
        console.log('✏️ Editing scene:', sceneId);
        // TODO: Load scene data into form
        this.showNotification('⚠️ Edycja scen będzie dostępna wkrótce', 'error');
    }

    async duplicateScene(sceneId) {
        console.log('📋 Duplicating scene:', sceneId);
        
        try {
            const response = await fetch(`/api/simulation-scenes/${sceneId}/duplicate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('✅ Scene duplicated:', result);
            
            this.showNotification('✅ Scena została zduplikowana!', 'success');
            await this.loadExistingScenes();
            
        } catch (error) {
            console.error('❌ Error duplicating scene:', error);
            this.showNotification(`❌ Błąd duplikowania: ${error.message}`, 'error');
        }
    }

    async deleteScene(sceneId) {
        if (confirm('Czy na pewno chcesz usunąć tę scenę?')) {
            console.log('🗑️ Deleting scene:', sceneId);
            
            try {
                const response = await fetch(`/api/simulation-scenes/${sceneId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                this.showNotification('✅ Scena została usunięta!', 'success');
                await this.loadExistingScenes();
                
            } catch (error) {
                console.error('❌ Error deleting scene:', error);
                this.showNotification(`❌ Błąd usuwania: ${error.message}`, 'error');
            }
        }
    }

    previewScene() {
        const formData = this.getFormData();
        console.log('👁️ Scene preview:', formData);
        
        // Create preview modal/popup
        const preview = JSON.stringify(formData, null, 2);
        alert(`Scene Preview:\n\n${preview}`);
    }

    clearForm() {
        // Clear all form fields
        document.getElementById('sceneForm').reset();
        
        // Clear selections
        this.selectedCategory = null;
        this.selectedDifficulty = 'intermediate';
        
        // Clear visual selections
        document.querySelectorAll('.category-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelectorAll('.difficulty-option').forEach(opt => opt.classList.remove('selected'));
        document.querySelector('[data-difficulty="intermediate"]').classList.add('selected');
        
        // Clear lists
        Object.keys(this.lists).forEach(listType => {
            this.lists[listType] = [];
            this.updateListDisplay(listType);
        });
        
        // Clear participants
        this.participants.required = [];
        this.participants.optional = [];
        this.updateParticipantsDisplay('required');
        this.updateParticipantsDisplay('optional');
        
        // Add default participant
        this.addParticipant('required');
        
        this.currentScene = null;
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
    window.sceneBuilder = new SceneBuilder();
});

