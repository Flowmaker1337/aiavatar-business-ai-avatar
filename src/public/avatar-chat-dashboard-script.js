// Avatar Chat Dashboard
class AvatarChatDashboard {
    constructor() {
        this.currentAvatar = null;
        this.currentSession = null;
        this.availableFlows = [];
        this.activeFlow = null;
        this.chatHistory = [];
        this.isProcessing = false;

        this.init();
    }

    async init() {
        console.log('🚀 Avatar Chat Dashboard initialized');

        // Load available avatars
        await this.loadAvailableAvatars();

        // Setup event listeners
        this.setupEventListeners();

        // Check for URL parameters (avatar selection)
        this.checkUrlParameters();
    }

    setupEventListeners() {
        // Enter key in message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const avatarId = urlParams.get('avatar');
        if (avatarId) {
            const selector = document.getElementById('avatarSelect');
            if (selector) {
                selector.value = avatarId;
                this.selectAvatar(avatarId);
            }
        }
    }

    async loadAvailableAvatars() {
        try {
            // Load custom avatars only if user is logged in
            // Use AuthManager for authenticated requests
            if (window.authManager && window.authManager.isAuthenticated()) {
                try {
                    const response = await window.authManager.makeAuthenticatedRequest('/api/avatars');

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.avatars) {
                            this.populateCustomAvatars(data.avatars);
                            console.log(`✅ Loaded ${data.avatars.length} custom avatars`);
                        }
                    } else if (response.status === 401) {
                        console.log('ℹ️ User not authenticated - skipping custom avatars');
                    }
                } catch (error) {
                    console.log('ℹ️ Could not load custom avatars:', error.message);
                }
            } else {
                console.log('ℹ️ No auth token - using predefined avatars only');
            }
        } catch (error) {
            console.error('Error in loadAvailableAvatars:', error);
        }
    }

    populateCustomAvatars(avatars) {
        const customGroup = document.getElementById('customAvatarsGroup');
        if (!customGroup) return;

        // Clear existing options
        customGroup.innerHTML = '';

        // Add custom avatars (exclude reactive ones)
        avatars.forEach(avatar => {
            if (avatar.type !== 'reactive') {
                const option = document.createElement('option');
                option.value = `custom_${avatar.id}`;
                option.textContent = `🎭 ${avatar.name}`;
                customGroup.appendChild(option);
            }
        });

        console.log(`✅ Loaded ${avatars.length} custom avatars`);
    }

    async selectAvatar(avatarId) {
        if (!avatarId) {
            this.clearAvatar();
            return;
        }

        try {
            this.showLoading('Ładowanie avatara...');

            this.currentAvatar = {
                id: avatarId,
                type: avatarId.startsWith('custom_') ? 'custom' : 'predefined'
            };

            // Load avatar details
            await this.loadAvatarDetails(avatarId);

            // Load available flows for this avatar
            await this.loadAvatarFlows(avatarId);

            // Update UI
            this.updateAvatarInfo();
            this.updateFlowPanel();

            // Clear previous chat
            this.clearChat();

            // Add welcome message
            this.addWelcomeMessage();

            // Enable controls
            this.enableControls();

            this.hideLoading();
            this.showNotification(`Avatar ${this.currentAvatar.name} załadowany!`, 'success');

        } catch (error) {
            console.error('Error selecting avatar:', error);
            this.hideLoading();
            this.showNotification(`Błąd podczas ładowania avatara: ${error.message}`, 'error');
        }
    }

    async loadAvatarDetails(avatarId) {
        if (avatarId === 'networker') {
            this.currentAvatar = {
                ...this.currentAvatar,
                name: 'Networker',
                description: 'Profesjonalny ambasador biznesowy',
                icon: '🤝',
                specialization: 'networkingu i rozwoju biznesu'
            };
        } else if (avatarId === 'trainer') {
            this.currentAvatar = {
                ...this.currentAvatar,
                name: 'Trener',
                // description: 'Ekspert od archetypów osobowości',
                description: 'Ekspert od AI',
                icon: '🎓',
                specialization: 'szkoleniach i edukacji'
            };
        } else if (avatarId.startsWith('custom_')) {
            // Load custom avatar details
            const customId = avatarId.replace('custom_', '');
            const response = await window.authManager.makeAuthenticatedRequest(`/api/avatars/${customId}`);

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentAvatar = {
                        ...this.currentAvatar,
                        name: data.avatar.name,
                        description: data.avatar.description,
                        icon: '🎭',
                        specialization: data.avatar.specialization || 'custom avatar'
                    };
                }
            }
        }
    }

    async loadAvatarFlows(avatarId) {
        try {
            let flowsResponse;

            if (avatarId === 'networker' || avatarId === 'trainer') {
                // Load predefined flows
                flowsResponse = await window.authManager.makeAuthenticatedRequest(`/api/flows?avatar_type=${avatarId}`);
            } else if (avatarId.startsWith('custom_')) {
                // Load custom avatar flows
                const customId = avatarId.replace('custom_', '');
                flowsResponse = await window.authManager.makeAuthenticatedRequest(`/api/avatar/${customId}/flow-definitions`);
            }

            if (flowsResponse && flowsResponse.ok) {
                const data = await flowsResponse.json();
                if (data.status === 'success' && data.flows) {
                    this.availableFlows = data.flows.map(flow => ({
                        ...flow,
                        status: 'available'
                    }));
                    console.log(`✅ Loaded ${this.availableFlows.length} flows for ${avatarId}`);
                }
            }
        } catch (error) {
            console.error('Error loading avatar flows:', error);
            this.availableFlows = [];
        }
    }

    updateAvatarInfo() {
        if (!this.currentAvatar) return;

        const avatarIcon = document.querySelector('.avatar-icon');
        const avatarName = document.getElementById('avatarName');
        const avatarDescription = document.getElementById('avatarDescription');

        if (avatarIcon) avatarIcon.textContent = this.currentAvatar.icon;
        if (avatarName) avatarName.textContent = this.currentAvatar.name;
        if (avatarDescription) avatarDescription.textContent = this.currentAvatar.description;
    }

    updateFlowPanel() {
        const flowContent = document.getElementById('flowContent');
        const totalFlows = document.getElementById('totalFlows');

        if (!flowContent) return;

        if (this.availableFlows.length === 0) {
            flowContent.innerHTML = `
                <div class="no-avatar-selected">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Brak dostępnych flows dla tego avatara</p>
                </div>
            `;
            if (totalFlows) totalFlows.textContent = '0';
            return;
        }

        // Update stats
        if (totalFlows) totalFlows.textContent = this.availableFlows.length;

        // Generate flows HTML
        const flowsHtml = this.availableFlows.map(flow => `
            <div class="flow-item ${flow.status}">
                <div class="flow-status"></div>
                <div class="flow-name">${flow.name}</div>
                <div class="flow-description">${flow.description || 'Brak opisu'}</div>
                <div class="flow-meta">
                    <span>Priorytet: ${flow.priority || 5}</span>
                    <span>${flow.steps?.length || 0} kroków</span>
                </div>
            </div>
        `).join('');

        flowContent.innerHTML = flowsHtml;
    }

    selectFlow(flowId) {
        const flow = this.availableFlows.find(f => f.id === flowId);
        if (!flow) return;

        // Update active flow
        this.availableFlows.forEach(f => {
            f.status = f.id === flowId ? 'active' : 'available';
        });

        this.activeFlow = flow;
        this.updateFlowPanel();

        // Show intent overlay
        this.showIntentInfo(flow.entry_intents?.[0] || 'unknown', flow.name);

        this.showNotification(`Aktywowany flow: ${flow.name}`, 'info');
    }

    addWelcomeMessage() {
        if (!this.currentAvatar) return;

        const welcomeText = `Cześć! Jestem ${this.currentAvatar.name}, ${this.currentAvatar.description}. Specjalizuję się w ${this.currentAvatar.specialization}. Jak mogę Ci pomóc?`;

        this.addMessage('bot', welcomeText);
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input?.value?.trim();

        if (!message || this.isProcessing || !this.currentAvatar) return;

        // Add user message
        this.addMessage('user', message);
        input.value = '';

        // Show typing indicator
        this.showTyping(true);
        this.isProcessing = true;

        try {
            // Send to backend
            const response = await this.sendToBackend(message);

            // Add bot response
            this.addMessage('bot', response.message);

            // Update flow status if needed
            if (response.flow_info) {
                this.updateFlowStatus(response.flow_info);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('bot', 'Przepraszam, wystąpił błąd podczas przetwarzania wiadomości.');
        } finally {
            this.showTyping(false);
            this.isProcessing = false;
        }
    }

    async sendToBackend(message) {
        try {
            const startTime = Date.now();

            const response = await this.apiCall('/api/query', {
                method: 'POST',
                body: {
                    user_message: message,
                    session_id: this.currentSession || '',
                    avatar_type: this.currentAvatar.type === 'custom' ? 'custom' : this.currentAvatar.id,
                    avatar_id: this.currentAvatar.type === 'custom' ? this.currentAvatar.id.replace('custom_', '') : null
                }
            });

            const endTime = Date.now();
            console.log(`API call took ${endTime - startTime}ms`);
            console.log('API Response:', response);

            // Update session
            this.currentSession = response.session_id;

            // Get real flow info from session state (like classic dashboard)
            await this.refreshFlowState();

            return {
                message: response.message,
                analysis: response.analysis,
                flow_info: response.flow_info
            };

        } catch (error) {
            console.error('API call failed:', error);
            throw new Error(`Błąd komunikacji z serwerem: ${error.message}`);
        }
    }

    async apiCall(endpoint, options = {}) {
        // Add /api prefix if not already present
        const url = endpoint.startsWith('/api/') ? endpoint : `/api${endpoint}`;

        // Use AuthManager for authenticated requests
        const response = await window.authManager.makeAuthenticatedRequest(url, {
            method: options.method || 'GET',
            body: options.body ? JSON.stringify(options.body) : undefined,
            headers: options.headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({
                message: `HTTP ${response.status}: ${response.statusText}`
            }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    async refreshFlowState() {
        if (!this.currentSession) {
            console.log('No session - cannot refresh flow state');
            return;
        }

        try {
            console.log(`🔄 Refreshing flow state for session: ${this.currentSession}`);
            const response = await this.apiCall(`/state/${this.currentSession}`, {method: 'GET'});

            if (response.status === 'success' && response.activeFlow) {
                console.log('✅ Active flow received from session state:', response.activeFlow);

                // Convert activeFlow to our flow_info format
                const flowInfo = {
                    current_flow: response.activeFlow.flow_id,
                    detected_intent: response.activeFlow.triggered_intent ||
                        response.activeFlow.context?.intent ||
                        response.mindState?.stack?.[response.mindState.stack.length - 1]?.intent ||
                        'unknown',
                    current_step: response.activeFlow.current_step,
                    current_step_index: response.activeFlow.step_index || 1,
                    completed_steps: response.activeFlow.completed_steps || [],
                    status: response.activeFlow.status
                };

                console.log('🔍 Intent sources:', {
                    triggered_intent: response.activeFlow.triggered_intent,
                    context_intent: response.activeFlow.context?.intent,
                    mindstate_intent: response.mindState?.stack?.[response.mindState.stack.length - 1]?.intent,
                    final_intent: flowInfo.detected_intent
                });

                this.updateCurrentFlow(flowInfo);
            } else {
                console.log('ℹ️ No active flow in session state');
                this.clearCurrentFlow();
            }

        } catch (error) {
            console.error('❌ Error refreshing flow state:', error);
            // Fallback to inference if session state fails
            console.log('🔄 Falling back to message inference...');
        }
    }

    clearCurrentFlow() {
        const currentFlowContent = document.getElementById('currentFlowContent');
        const flowStepsContainer = document.getElementById('flowStepsContainer');

        if (currentFlowContent) {
            currentFlowContent.innerHTML = `
                <div class="no-active-flow">
                    <i class="fas fa-pause-circle"></i>
                    <p>Brak aktywnego flow</p>
                    <small>Rozpocznij rozmowę aby aktywować flow</small>
                </div>
            `;
        }

        if (flowStepsContainer) {
            flowStepsContainer.style.display = 'none';
        }
    }

    tryExtractFlowInfo(response) {
        // Try to create flow_info from available response data
        let flowInfo = {};

        // Check if we have analysis data
        if (response.analysis) {
            console.log('Analysis data (full object):', JSON.stringify(response.analysis, null, 2));
            if (response.analysis.intent) {
                flowInfo.detected_intent = response.analysis.intent;
            }
            if (response.analysis.current_flow) {
                flowInfo.current_flow = response.analysis.current_flow;
            }
            if (response.analysis.flow_execution) {
                flowInfo = {...flowInfo, ...response.analysis.flow_execution};
            }
        }

        // Try to infer flow from bot response content
        const botMessage = response.message || '';
        console.log('Bot message for flow inference:', botMessage);

        // Analyze bot response to infer current flow
        const inferredFlow = this.inferFlowFromResponse(botMessage);
        if (inferredFlow) {
            flowInfo = {...flowInfo, ...inferredFlow};
            console.log('Inferred flow from response:', inferredFlow);
        }

        // Fallback for first message
        if (Object.keys(flowInfo).length === 0 && (!this.chatHistory || this.chatHistory.length <= 2)) {
            const greetingFlow = this.availableFlows.find(f =>
                f.id === 'greeting_flow' ||
                f.name.toLowerCase().includes('powitanie') ||
                f.entry_intents?.includes('greeting')
            );

            if (greetingFlow) {
                flowInfo = {
                    current_flow: greetingFlow.id,
                    detected_intent: 'greeting',
                    current_step: greetingFlow.steps?.[0]?.id || 'initial_greeting',
                    current_step_index: 1,
                    completed_steps: []
                };
                console.log('Fallback to greeting flow:', flowInfo);
            }
        }

        if (Object.keys(flowInfo).length > 0) {
            this.updateCurrentFlow(flowInfo);
        } else {
            console.log('Could not extract or infer any flow info');
        }
    }

    inferFlowFromResponse(botMessage) {
        const message = botMessage.toLowerCase();

        // Keywords that suggest specific flows (matching our actual flow IDs)
        const flowKeywords = {
            'greeting_flow': ['witaj', 'cześć', 'dzień dobry', 'powitanie', 'jak mogę', 'widzę że twoja firma'],
            'company_presentation_flow': ['firma', 'specjalizuje', 'oferujemy', 'naszą firmą', 'international', 'logispol', 'ekspansji', 'rynkach międzynarodowych'],
            'user_needs_gathering_flow': ['potrzeby', 'wyzwania', 'problemy', 'cele', 'dotychczasowe informacje', 'planowaniu dalszego rozwoju', 'jakie wyzwania'],
            'solution_presentation_flow': ['rozwiązanie', 'propozycja', 'możemy pomóc', 'pomóc w ekspansji'],
            'contact_exchange_flow': ['kontakt', 'e-mail', 'telefon', 'spotkanie', 'umówić', 'skontaktuj', 'zespołem', 'przejść do zespołu', 'zorganizować spotkanie', 'przesłać materiały', 'sposób kontaktu', 'jaki sposób kontaktu'],
            'user_expectations_flow': ['oczekiwania', 'spodziewasz', 'wyobrażasz'],
            'user_questions_flow': ['pytanie', 'pytania', 'chcesz wiedzieć'],
            'value_proposition_flow': ['wartość', 'korzyści', 'dlaczego']
        };

        // Check which flow keywords match the response
        for (const [flowId, keywords] of Object.entries(flowKeywords)) {
            const matchedKeywords = keywords.filter(keyword => message.includes(keyword));
            if (matchedKeywords.length > 0) {
                console.log(`🎯 Flow match found! FlowID: ${flowId}, Keywords: [${matchedKeywords.join(', ')}]`);
                const matchedFlow = this.availableFlows.find(f => f.id === flowId);
                if (matchedFlow) {
                    const flowInfo = {
                        current_flow: flowId,
                        detected_intent: matchedFlow.entry_intents?.[0] || 'inferred',
                        current_step: matchedFlow.steps?.[0]?.id || 'step_1',
                        current_step_index: 1,
                        completed_steps: []
                    };
                    console.log(`✅ Returning flow info:`, flowInfo);
                    return flowInfo;
                } else {
                    console.log(`⚠️ Flow ${flowId} not found in availableFlows`);
                }
            }
        }

        // If no keyword match, try to map analysis.intent to flow
        console.log('❌ No keyword matches found, checking if we can map intent to flow');
        return null;
    }

    addMessage(sender, content) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        // Remove welcome message if present
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const timestamp = new Date().toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${sender === 'user' ? '👤' : (this.currentAvatar?.icon || '🤖')}
            </div>
            <div class="message-content">
                ${content}
                <div class="message-time">${timestamp}</div>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store in history
        this.chatHistory.push({
            sender,
            content,
            timestamp: new Date().toISOString()
        });
    }

    showTyping(show) {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    showIntentInfo(intent, flowName) {
        const overlay = document.getElementById('intentOverlay');
        const intentValue = document.getElementById('detectedIntent');
        const flowValue = document.getElementById('activeFlow');

        if (overlay && intentValue && flowValue) {
            intentValue.textContent = intent;
            flowValue.textContent = flowName;
            overlay.style.display = 'block';

            // Auto hide after 5 seconds
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 5000);
        }
    }

    updateCurrentFlow(flowInfo) {
        const currentFlowContent = document.getElementById('currentFlowContent');
        const flowStepsContainer = document.getElementById('flowStepsContainer');
        const progressText = document.querySelector('.progress-text');

        if (!flowInfo || !flowInfo.current_flow) {
            // No active flow - reset all flows to available status
            this.availableFlows.forEach(f => {
                f.status = 'available';
            });

            // Update the flow panel to reflect visual changes
            this.updateFlowPanel();

            if (currentFlowContent) {
                currentFlowContent.innerHTML = `
                    <div class="no-active-flow">
                        <i class="fas fa-pause-circle"></i>
                        <p>Brak aktywnego flow</p>
                        <small>Rozpocznij rozmowę aby aktywować flow</small>
                    </div>
                `;
            }
            if (flowStepsContainer) flowStepsContainer.style.display = 'none';
            if (progressText) progressText.textContent = 'Gotowy do rozmowy';
            return;
        }

        // Find the active flow
        const activeFlow = this.availableFlows.find(f => f.id === flowInfo.current_flow);
        if (!activeFlow) return;

        // Update visual status of flows (set active flow and make others available)
        this.availableFlows.forEach(f => {
            f.status = f.id === flowInfo.current_flow ? 'active' : 'available';
        });

        // Update the flow panel to reflect visual changes
        this.updateFlowPanel();

        // Update progress text
        if (progressText) {
            progressText.textContent = `${activeFlow.name} - Krok ${flowInfo.current_step_index || 1}`;
        }

        // Show flow info
        if (currentFlowContent) {
            currentFlowContent.innerHTML = `
                <div class="active-flow-info">
                    <h4>${activeFlow.name}</h4>
                    <p>${activeFlow.description || 'Brak opisu'}</p>
                    <div class="flow-meta">
                        <span><i class="fas fa-bullseye"></i> Intent: ${flowInfo.detected_intent || 'N/A'}</span>
                        <span><i class="fas fa-step-forward"></i> Krok: ${flowInfo.current_step || 'N/A'}</span>
                    </div>
                </div>
            `;
        }

        // Show flow steps
        this.displayFlowSteps(activeFlow, flowInfo);

        // Update intent overlay
        if (flowInfo.detected_intent) {
            this.showIntentInfo(flowInfo.detected_intent, activeFlow.name);
        }
    }

    displayFlowSteps(flow, flowInfo) {
        const flowStepsContainer = document.getElementById('flowStepsContainer');
        const flowSteps = document.getElementById('flowSteps');
        const currentStepNumber = document.getElementById('currentStepNumber');
        const totalSteps = document.getElementById('totalSteps');

        if (!flowStepsContainer || !flowSteps) return;

        const steps = flow.steps || [];
        const currentStepId = flowInfo.current_step;

        // Update counters
        if (currentStepNumber) currentStepNumber.textContent = flowInfo.current_step_index || 0;
        if (totalSteps) totalSteps.textContent = steps.length;

        // Generate steps HTML
        const stepsHtml = steps.map((step, index) => {
            let stepClass = 'flow-step pending';

            if (flowInfo.completed_steps && flowInfo.completed_steps.includes(step.id)) {
                stepClass = 'flow-step completed';
            } else if (step.id === currentStepId) {
                stepClass = 'flow-step active';
            }

            return `
                <div class="${stepClass}">
                    <div class="step-indicator"></div>
                    <div class="step-name">${step.name || step.id}</div>
                    <div class="step-description">${step.description || ''}</div>
                </div>
            `;
        }).join('');

        flowSteps.innerHTML = stepsHtml;
        flowStepsContainer.style.display = 'block';
    }

    updateFlowStatus(flowInfo) {
        this.updateCurrentFlow(flowInfo);
    }

    clearAvatar() {
        this.currentAvatar = null;
        this.availableFlows = [];
        this.activeFlow = null;

        // Update UI
        const avatarIcon = document.querySelector('.avatar-icon');
        const avatarName = document.getElementById('avatarName');
        const avatarDescription = document.getElementById('avatarDescription');
        const flowContent = document.getElementById('flowContent');

        if (avatarIcon) avatarIcon.textContent = '🤖';
        if (avatarName) avatarName.textContent = 'Wybierz Avatar';
        if (avatarDescription) avatarDescription.textContent = 'Wybierz avatar aby rozpocząć rozmowę';

        if (flowContent) {
            flowContent.innerHTML = `
                <div class="no-avatar-selected">
                    <i class="fas fa-robot"></i>
                    <p>Wybierz avatar aby zobaczyć dostępne flows</p>
                </div>
            `;
        }

        this.clearChat();
        this.disableControls();
    }

    clearChat() {
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-comments"></i>
                    <h3>Witaj w Avatar Chat Dashboard!</h3>
                    <p>Wybierz avatar z menu powyżej aby rozpocząć strukturyzowaną rozmowę.</p>
                </div>
            `;
        }
        this.chatHistory = [];
    }

    clearSession() {
        this.clearAvatar();
        const selector = document.getElementById('avatarSelect');
        if (selector) selector.value = '';
        this.showNotification('Sesja została zresetowana', 'info');
    }

    enableControls() {
        const refreshBtn = document.getElementById('refreshFlowsBtn');
        const studioBtn = document.getElementById('openFlowStudioBtn');
        const messageInput = document.getElementById('messageInput');

        if (refreshBtn) refreshBtn.disabled = false;
        if (studioBtn) studioBtn.disabled = false;
        if (messageInput) messageInput.disabled = false;
    }

    disableControls() {
        const refreshBtn = document.getElementById('refreshFlowsBtn');
        const studioBtn = document.getElementById('openFlowStudioBtn');
        const messageInput = document.getElementById('messageInput');

        if (refreshBtn) refreshBtn.disabled = true;
        if (studioBtn) studioBtn.disabled = true;
        if (messageInput) messageInput.disabled = true;
    }

    async refreshFlows() {
        if (!this.currentAvatar) return;

        this.showLoading('Odświeżanie flows...');
        await this.loadAvatarFlows(this.currentAvatar.id);

        // After refreshing flows, restore the active flow state from session
        if (this.currentSession) {
            await this.refreshFlowState();
        } else {
            this.updateFlowPanel();
        }

        this.hideLoading();
        this.showNotification('Flows odświeżone', 'success');
    }

    openFlowStudio() {
        if (!this.currentAvatar) return;

        // Open Flow Studio with current avatar context
        const url = `/flow-studio.html?avatar=${this.currentAvatar.id}`;
        window.open(url, '_blank');
    }

    exportChat() {
        if (this.chatHistory.length === 0) {
            this.showNotification('Brak rozmowy do eksportu', 'warning');
            return;
        }

        const chatData = {
            avatar: this.currentAvatar,
            timestamp: new Date().toISOString(),
            messages: this.chatHistory
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${this.currentAvatar?.name || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Rozmowa została wyeksportowana', 'success');
    }

    showLoading(message = 'Ładowanie...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.avatarDashboard = new AvatarChatDashboard();
});
