// ============ ENHANCED AVATAR BUILDER JAVASCRIPT ============

class EnhancedAvatarBuilder {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.avatarData = {
            name: '',
            description: '',
            type: 'custom',
            category: 'business',
            personality: '',
            communication_style: 'professional',
            background: '',
            specialization: '',
            tags: [],
            knowledge_files: [],
            manual_knowledge: ''
        };
        this.uploadedFiles = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updatePreview();
        this.loadSuggestedTags();
        
        console.log('🎨 Enhanced Avatar Builder initialized');
    }

    bindEvents() {
        // Navigation
        document.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
        document.getElementById('nextStepBtn')?.addEventListener('click', () => this.nextStep());
        document.getElementById('prevStepBtn')?.addEventListener('click', () => this.prevStep());
        
        // Header actions
        document.getElementById('saveAsDraftBtn')?.addEventListener('click', () => this.saveAsDraft());
        document.getElementById('createAvatarBtn')?.addEventListener('click', () => this.createAvatar());
        
        // Step navigation
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', () => {
                const stepNumber = parseInt(step.dataset.step);
                this.goToStep(stepNumber);
            });
        });

        // Form inputs
        document.getElementById('avatarName')?.addEventListener('input', (e) => {
            this.avatarData.name = e.target.value;
            this.updatePreview();
        });

        document.getElementById('avatarDescription')?.addEventListener('input', (e) => {
            this.avatarData.description = e.target.value;
            this.updatePreview();
        });

        document.getElementById('avatarCategory')?.addEventListener('change', (e) => {
            this.avatarData.category = e.target.value;
            this.loadSuggestedTags();
            this.updatePreview();
        });

        // Avatar type selector
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.avatarData.type = option.dataset.type;
                this.updatePreview();
            });
        });

        // Personality inputs
        document.getElementById('personalityInput')?.addEventListener('input', (e) => {
            this.avatarData.personality = e.target.value;
            this.updatePreview();
        });

        document.getElementById('communicationStyle')?.addEventListener('change', (e) => {
            this.avatarData.communication_style = e.target.value;
            this.updatePreview();
        });

        document.getElementById('backgroundInfo')?.addEventListener('input', (e) => {
            this.avatarData.background = e.target.value;
            this.updatePreview();
        });

        // Personality templates
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const personality = btn.dataset.personality;
                document.getElementById('personalityInput').value = personality;
                this.avatarData.personality = personality;
                this.updatePreview();
            });
        });

        // Specialization
        document.getElementById('specializationInput')?.addEventListener('input', (e) => {
            this.avatarData.specialization = e.target.value;
            this.updatePreview();
        });

        // Tags input
        const tagsInput = document.getElementById('tagsInput');
        if (tagsInput) {
            tagsInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addTag(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }

        // File upload
        const fileInput = document.getElementById('fileInput');
        const fileUploadArea = document.getElementById('fileUploadArea');
        const selectFilesBtn = document.getElementById('selectFilesBtn');

        if (selectFilesBtn) {
            selectFilesBtn.addEventListener('click', () => fileInput?.click());
        }

        if (fileUploadArea) {
            fileUploadArea.addEventListener('click', () => fileInput?.click());
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('dragover');
            });
            fileUploadArea.addEventListener('dragleave', () => {
                fileUploadArea.classList.remove('dragover');
            });
            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
                this.handleFiles(e.dataTransfer.files);
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        // Manual knowledge
        document.getElementById('manualKnowledge')?.addEventListener('input', (e) => {
            this.avatarData.manual_knowledge = e.target.value;
        });

        // Test functionality
        document.getElementById('testBtn')?.addEventListener('click', () => this.testAvatar());
        
        // Preview refresh
        document.getElementById('refreshPreviewBtn')?.addEventListener('click', () => this.updatePreview());
    }

    goBack() {
        // Return to homepage or previous page
        if (window.homepageApp) {
            window.homepageApp.navigateToPage('avatar-manager');
        } else {
            window.location.href = '/';
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                this.goToStep(this.currentStep + 1);
            } else {
                this.createAvatar();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.totalSteps) return;

        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show target step
        document.getElementById(`step${stepNumber}`)?.classList.add('active');

        // Update progress
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 === stepNumber) {
                step.classList.add('active');
            } else if (index + 1 < stepNumber) {
                step.classList.add('completed');
            }
        });

        this.currentStep = stepNumber;

        // Update navigation buttons
        const prevBtn = document.getElementById('prevStepBtn');
        const nextBtn = document.getElementById('nextStepBtn');

        if (prevBtn) {
            prevBtn.style.display = stepNumber === 1 ? 'none' : 'flex';
        }

        if (nextBtn) {
            nextBtn.innerHTML = stepNumber === this.totalSteps 
                ? '<i class="fas fa-magic"></i> Stwórz Avatara'
                : 'Następny krok <i class="fas fa-arrow-right"></i>';
        }

        // Update summary if on last step
        if (stepNumber === 5) {
            this.updateSummary();
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.avatarData.name.trim()) {
                    this.showNotification('Podaj nazwę avatara', 'error');
                    return false;
                }
                if (!this.avatarData.description.trim()) {
                    this.showNotification('Podaj opis avatara', 'error');
                    return false;
                }
                break;
            case 2:
                if (!this.avatarData.personality.trim()) {
                    this.showNotification('Opisz personalność avatara', 'error');
                    return false;
                }
                break;
            case 3:
                if (!this.avatarData.specialization.trim()) {
                    this.showNotification('Podaj główną specjalizację avatara', 'error');
                    return false;
                }
                break;
        }
        return true;
    }

    updatePreview() {
        // Update preview image initial
        const previewInitial = document.getElementById('previewInitial');
        if (previewInitial) {
            previewInitial.textContent = this.avatarData.name.charAt(0).toUpperCase() || 'A';
        }

        // Update preview name
        const previewName = document.getElementById('previewName');
        if (previewName) {
            previewName.textContent = this.avatarData.name || 'Nowy Avatar';
        }

        // Update preview description
        const previewDescription = document.getElementById('previewDescription');
        if (previewDescription) {
            previewDescription.textContent = this.avatarData.description || 'Opis zostanie wygenerowany automatycznie';
        }

        // Update preview tags
        const previewTags = document.getElementById('previewTags');
        if (previewTags) {
            previewTags.innerHTML = this.avatarData.tags.map(tag => 
                `<div class="preview-tag">${tag}</div>`
            ).join('');
        }

        // Update preview stats
        document.getElementById('previewTypeValue')?.textContent = 
            this.avatarData.type === 'custom' ? 'Custom' : 'Reaktywny';
        document.getElementById('previewCategoryValue')?.textContent = 
            this.getCategoryDisplayName(this.avatarData.category);
        document.getElementById('previewFilesValue')?.textContent = 
            this.uploadedFiles.length.toString();

        // Update sample response
        this.updateSampleResponse();
    }

    getCategoryDisplayName(category) {
        const categories = {
            business: 'Business',
            sales: 'Sprzedaż',
            training: 'Szkolenia',
            education: 'Edukacja',
            customer: 'Obsługa klienta',
            technical: 'Techniczny',
            general: 'Ogólny'
        };
        return categories[category] || category;
    }

    updateSampleResponse() {
        const sampleResponse = document.getElementById('sampleResponse');
        if (!sampleResponse) return;

        let response = `Cześć! Jestem ${this.avatarData.name || 'nowym avatarem'}`;
        
        if (this.avatarData.specialization) {
            response += ` i specjalizuję się w ${this.avatarData.specialization.toLowerCase()}`;
        }
        
        response += '. Jak mogę Ci dziś pomóc?';

        sampleResponse.textContent = response;
    }

    loadSuggestedTags() {
        const suggestedTags = document.getElementById('suggestedTags');
        if (!suggestedTags) return;

        const tagsByCategory = {
            business: ['Zarządzanie', 'Strategia', 'Planowanie', 'Analityka', 'ROI', 'KPI'],
            sales: ['Sprzedaż', 'Negocjacje', 'CRM', 'Lead Generation', 'Konwersja', 'B2B'],
            training: ['Szkolenia', 'Coaching', 'Rozwój', 'Umiejętności', 'Motywacja', 'Feedback'],
            education: ['Edukacja', 'Nauka', 'Wiedza', 'Kursy', 'Certyfikaty', 'E-learning'],
            customer: ['Obsługa', 'Support', 'Komunikacja', 'Rozwiązywanie problemów', 'Satysfakcja'],
            technical: ['Technologia', 'IT', 'Programowanie', 'Systemy', 'Automatyzacja', 'API'],
            general: ['Komunikacja', 'Organizacja', 'Efektywność', 'Produktywność', 'Jakość']
        };

        const tags = tagsByCategory[this.avatarData.category] || tagsByCategory.general;
        
        suggestedTags.innerHTML = tags.map(tag => 
            `<button class="suggested-tag" onclick="avatarBuilder.addTag('${tag}')">${tag}</button>`
        ).join('');
    }

    addTag(tagText) {
        if (!tagText || this.avatarData.tags.includes(tagText)) return;
        
        this.avatarData.tags.push(tagText);
        this.updateTagsList();
        this.updatePreview();
    }

    removeTag(tagText) {
        this.avatarData.tags = this.avatarData.tags.filter(tag => tag !== tagText);
        this.updateTagsList();
        this.updatePreview();
    }

    updateTagsList() {
        const tagsList = document.getElementById('tagsList');
        if (!tagsList) return;

        tagsList.innerHTML = this.avatarData.tags.map(tag => 
            `<div class="tag-item">
                ${tag}
                <span class="tag-remove" onclick="avatarBuilder.removeTag('${tag}')">&times;</span>
            </div>`
        ).join('');
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            if (this.isValidFileType(file)) {
                this.uploadedFiles.push({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    file: file
                });
            }
        });
        
        this.updateFilesList();
        this.updatePreview();
    }

    isValidFileType(file) {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown'
        ];
        return allowedTypes.includes(file.type);
    }

    updateFilesList() {
        const uploadedFiles = document.getElementById('uploadedFiles');
        if (!uploadedFiles) return;

        if (this.uploadedFiles.length === 0) {
            uploadedFiles.innerHTML = '';
            return;
        }

        uploadedFiles.innerHTML = this.uploadedFiles.map((file, index) => 
            `<div class="file-item">
                <div class="file-info">
                    <div class="file-icon">
                        <i class="fas fa-file-${this.getFileIcon(file.type)}"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="file-remove" onclick="avatarBuilder.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </div>
            </div>`
        ).join('');
    }

    getFileIcon(fileType) {
        if (fileType.includes('pdf')) return 'pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'word';
        if (fileType.includes('text')) return 'text';
        return 'alt';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateFilesList();
        this.updatePreview();
    }

    updateSummary() {
        // Update summary values
        document.getElementById('summaryName').textContent = this.avatarData.name || '-';
        document.getElementById('summaryType').textContent = 
            this.avatarData.type === 'custom' ? 'Custom Avatar' : 'Reaktywny Avatar';
        document.getElementById('summaryCategory').textContent = 
            this.getCategoryDisplayName(this.avatarData.category);
        document.getElementById('summaryPersonality').textContent = 
            this.avatarData.personality || '-';
        document.getElementById('summaryStyle').textContent = 
            this.avatarData.communication_style || '-';
        document.getElementById('summarySpecialization').textContent = 
            this.avatarData.specialization || '-';
        document.getElementById('summaryTags').textContent = 
            this.avatarData.tags.join(', ') || '-';
        document.getElementById('summaryFiles').textContent = 
            `${this.uploadedFiles.length} plików`;
    }

    async testAvatar() {
        const testQuestion = document.getElementById('testQuestion');
        const testResponse = document.getElementById('testResponse');
        const testBtn = document.getElementById('testBtn');
        
        if (!testQuestion || !testResponse || !testBtn) return;
        
        const question = testQuestion.value.trim();
        if (!question) {
            this.showNotification('Wpisz pytanie do przetestowania', 'warning');
            return;
        }

        testBtn.disabled = true;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        testResponse.innerHTML = '<p style="color: #39e575;">Generowanie odpowiedzi...</p>';

        try {
            // Simulate API call for testing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const mockResponse = this.generateMockResponse(question);
            testResponse.innerHTML = `<p>${mockResponse}</p>`;
            
        } catch (error) {
            console.error('Test error:', error);
            testResponse.innerHTML = '<p style="color: #ff6b6b;">Błąd podczas testowania avatara</p>';
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    generateMockResponse(question) {
        const responses = [
            `Jako ${this.avatarData.specialization || 'specjalista'}, mogę Ci pomóc z tym zagadnieniem. ${question.includes('jak') ? 'Oto kilka kroków które polecam...' : 'Pozwól że wyjaśnię...'}`,
            `Świetne pytanie! W mojej ${this.avatarData.specialization || 'dziedzinie'} często spotykam się z podobnymi wyzwaniami. Oto co sugeruję...`,
            `Dzięki mojemu doświadczeniu w ${this.avatarData.specialization || 'tej branży'} mogę powiedzieć, że kluczowe jest...`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    async saveAsDraft() {
        this.showLoading('Zapisywanie szkicu...');
        
        try {
            const draftData = {
                ...this.avatarData,
                status: 'draft',
                created_at: new Date().toISOString()
            };

            // Save to localStorage as fallback
            localStorage.setItem('avatarDraft', JSON.stringify(draftData));
            
            this.hideLoading();
            this.showNotification('Szkic zapisany pomyślnie!', 'success');
            
        } catch (error) {
            console.error('Save draft error:', error);
            this.hideLoading();
            this.showNotification('Błąd podczas zapisywania szkicu', 'error');
        }
    }

    async createAvatar() {
        if (!this.validateCurrentStep()) return;

        this.showLoading('Tworzenie avatara...');

        try {
            // Prepare avatar data
            const avatarData = {
                name: this.avatarData.name,
                description: this.avatarData.description,
                type: this.avatarData.type,
                category: this.avatarData.category,
                personality: this.avatarData.personality,
                specialization: this.avatarData.specialization,
                communication_style: this.avatarData.communication_style,
                background: this.avatarData.background,
                tags: this.avatarData.tags
            };

            // Get auth token
            const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
            if (!token) {
                throw new Error('Authentication required');
            }

            // Create avatar
            const response = await fetch('/api/avatars', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(avatarData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create avatar');
            }

            const result = await response.json();
            
            // Clear draft
            localStorage.removeItem('avatarDraft');
            
            this.hideLoading();
            this.showNotification('Avatar utworzony pomyślnie!', 'success');
            
            // Redirect to avatar manager after short delay
            setTimeout(() => {
                if (window.homepageApp) {
                    window.homepageApp.navigateToPage('avatar-manager');
                } else {
                    window.location.href = '/';
                }
            }, 2000);

        } catch (error) {
            console.error('Create avatar error:', error);
            this.hideLoading();
            
            if (error.message.includes('Authentication')) {
                this.showNotification('Zaloguj się aby utworzyć avatara', 'warning');
                // Redirect to login
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                this.showNotification(`Błąd: ${error.message}`, 'error');
            }
        }
    }

    showLoading(text = 'Ładowanie...') {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingText) loadingText.textContent = text;
        if (loadingOverlay) loadingOverlay.classList.add('active');
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.classList.remove('active');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            animation: slideInRight 0.3s ease forwards;
        `;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#39e575',
            error: '#ff6b6b',
            warning: '#ffa502',
            info: '#3742fa'
        };
        return colors[type] || '#3742fa';
    }

    loadDraft() {
        const draft = localStorage.getItem('avatarDraft');
        if (draft) {
            try {
                const draftData = JSON.parse(draft);
                Object.assign(this.avatarData, draftData);
                this.populateForm();
                this.updatePreview();
                this.showNotification('Załadowano zapisany szkic', 'info');
            } catch (error) {
                console.error('Error loading draft:', error);
                localStorage.removeItem('avatarDraft');
            }
        }
    }

    populateForm() {
        // Populate form fields with loaded data
        const fields = {
            'avatarName': 'name',
            'avatarDescription': 'description',
            'avatarCategory': 'category',
            'personalityInput': 'personality',
            'communicationStyle': 'communication_style',
            'backgroundInfo': 'background',
            'specializationInput': 'specialization',
            'manualKnowledge': 'manual_knowledge'
        };

        Object.entries(fields).forEach(([fieldId, dataKey]) => {
            const field = document.getElementById(fieldId);
            if (field && this.avatarData[dataKey]) {
                field.value = this.avatarData[dataKey];
            }
        });

        // Update type selector
        if (this.avatarData.type) {
            document.querySelectorAll('.type-option').forEach(option => {
                option.classList.toggle('active', option.dataset.type === this.avatarData.type);
            });
        }

        // Update tags
        this.updateTagsList();
    }
}

// Global instance
let avatarBuilder;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    avatarBuilder = new EnhancedAvatarBuilder();
    
    // Load draft if exists
    avatarBuilder.loadDraft();
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
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
});

// Export for global access
window.avatarBuilder = avatarBuilder;
