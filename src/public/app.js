// AI Avatar Business Dashboard
class AvatarDashboard {
    constructor() {
        this.currentSession = null;
        this.currentFlow = null;
        this.mindState = null;
        this.flows = [];
        this.apiLog = [];
        this.performanceLog = [];
        this.debugVisible = false;
        this.currentAvatarType = 'networker'; // Default avatar
        
        // Initialize components
        this.initializeEventListeners();
        this.initializeFlowGraph();
        this.loadFlowDefinitions();
        this.updateAvatarDisplay();
        this.startHealthCheck();
    }

    // ============ INITIALIZATION ============

    initializeEventListeners() {
        // Chat controls
        document.getElementById('send-message').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Header controls
        document.getElementById('avatar-type').addEventListener('change', (e) => this.changeAvatar(e.target.value));
        document.getElementById('clear-session').addEventListener('click', () => this.clearSession());
        document.getElementById('export-data').addEventListener('click', () => this.exportData());

        // Flow controls
        document.getElementById('flow-selector').addEventListener('change', (e) => this.selectFlow(e.target.value));
        document.getElementById('reset-graph').addEventListener('click', () => this.resetGraph());

        // MindState controls
        document.getElementById('refresh-mindstate').addEventListener('click', () => this.refreshMindState());

        // Debug controls
        document.getElementById('toggle-debug').addEventListener('click', () => this.toggleDebug());
    }

    initializeFlowGraph() {
        this.svg = d3.select('#flow-graph');
        this.g = this.svg.append('g');
        
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });
        
        this.svg.call(zoom);
    }

    // ============ API CALLS ============

    async apiCall(endpoint, options = {}) {
        const startTime = Date.now();
        const method = options.method || 'GET';
        
        try {
            const response = await fetch(`/api${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const result = await response.json();
            
            this.logApiCall(method, endpoint, response.status, duration, result);
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }
            
            return result;
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.logApiCall(method, endpoint, 'ERROR', duration, { error: error.message });
            throw error;
        }
    }

    logApiCall(method, endpoint, status, duration, result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            method,
            endpoint,
            status,
            duration,
            result
        };
        
        this.apiLog.push(logEntry);
        this.updateApiLog();
    }

    logPerformance(action, duration, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            duration,
            details
        };
        
        this.performanceLog.push(logEntry);
        this.updatePerformanceLog();
    }

    // ============ CHAT FUNCTIONALITY ============

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Clear input
        input.value = '';
        
        // Add user message to chat
        this.addMessageToChat('user', message);
        
        // Show loading state
        const loadingMsg = this.addMessageToChat('bot', 'Myślę...');
        loadingMsg.classList.add('loading');
        
        try {
            const startTime = Date.now();
            
            const response = await this.apiCall('/query', {
                method: 'POST',
                body: {
                    user_message: message,
                    session_id: this.currentSession || ''
                }
            });
            
            const endTime = Date.now();
            this.logPerformance('sendMessage', endTime - startTime, { messageLength: message.length });
            
            // Remove loading message
            loadingMsg.remove();
            
            // Update session
            this.currentSession = response.session_id;
            document.getElementById('current-session').textContent = this.currentSession.substring(0, 8) + '...';
            
            // Add bot response
            this.addMessageToChat('bot', response.message, response.analysis);
            
            // Update MindState
            await this.refreshMindState();
            
        } catch (error) {
            // Remove loading message
            loadingMsg.remove();
            
            // Add error message
            this.addMessageToChat('bot', `Błąd: ${error.message}`, null, 'error');
            
            console.error('Error sending message:', error);
        }
    }

    addMessageToChat(sender, content, analysis = null, type = 'normal') {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        if (type === 'error') {
            messageDiv.classList.add('error');
        }
        
        const timestamp = new Date().toLocaleTimeString();
        
        let html = `
            <div class="message-header">
                ${sender === 'user' ? '👤 Użytkownik' : '🤖 AI Avatar'} - ${timestamp}
            </div>
            <div class="message-content">${content}</div>
        `;
        
        if (analysis) {
            html += `
                <div class="message-intent">
                    🎯 ${analysis.intent} | 
                    ❓ ${analysis.is_question ? 'Pytanie' : 'Stwierdzenie'} | 
                    📊 ${analysis.topic_relevant ? 'Releantne' : 'Nierelantne'}
                </div>
            `;
        }
        
        messageDiv.innerHTML = html;
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageDiv;
    }

    clearSession() {
        this.currentSession = null;
        document.getElementById('current-session').textContent = '-';
        document.getElementById('chat-messages').innerHTML = '';
        
        // Reset MindState
        this.mindState = null;
        this.updateMindStateDisplay();
        
        // Reset flow graph
        this.resetGraph();
        
        console.log('Session cleared');
    }

    // ============ FLOW MANAGEMENT ============

    async loadFlowDefinitions() {
        try {
            let flows = [];
            
            if (this.currentAvatarType === 'trainer') {
                // Training flows for trainer avatar
                flows = [
                    {
                        id: 'theory_introduction_flow',
                        name: '🎓 Wprowadzenie teorii',
                        steps: [
                            { id: 'concept_introduction', name: 'Wprowadzenie koncepcji', next_steps: ['detailed_explanation'] },
                            { id: 'detailed_explanation', name: 'Szczegółowe wyjaśnienie', next_steps: ['key_principles'] },
                            { id: 'key_principles', name: 'Kluczowe zasady', next_steps: ['theory_summary'] },
                            { id: 'theory_summary', name: 'Podsumowanie teorii', next_steps: ['completed'] }
                        ]
                    },
                    {
                        id: 'guided_practice_flow',
                        name: '👥 Praktyka z przewodnikiem',
                        steps: [
                            { id: 'practice_setup', name: 'Przygotowanie do ćwiczenia', next_steps: ['step_by_step_guidance'] },
                            { id: 'step_by_step_guidance', name: 'Przewodnictwo krok po kroku', next_steps: ['feedback_loop'] },
                            { id: 'feedback_loop', name: 'Pętla zwrotna', next_steps: ['practice_completion'] },
                            { id: 'practice_completion', name: 'Zakończenie ćwiczenia', next_steps: ['completed'] }
                        ]
                    },
                    {
                        id: 'question_answer_flow',
                        name: '❓ Sesja pytań i odpowiedzi',
                        steps: [
                            { id: 'question_identification', name: 'Identyfikacja pytania', next_steps: ['knowledge_retrieval'] },
                            { id: 'knowledge_retrieval', name: 'Wyszukiwanie wiedzy', next_steps: ['answer_formulation'] },
                            { id: 'answer_formulation', name: 'Formułowanie odpowiedzi', next_steps: ['comprehension_check'] },
                            { id: 'comprehension_check', name: 'Sprawdzenie zrozumienia', next_steps: ['completed'] }
                        ]
                    },
                    {
                        id: 'assessment_flow',
                        name: '📊 Ocena i sprawdzenie',
                        steps: [
                            { id: 'assessment_preparation', name: 'Przygotowanie oceny', next_steps: ['knowledge_testing'] },
                            { id: 'knowledge_testing', name: 'Testowanie wiedzy', next_steps: ['result_analysis'] },
                            { id: 'result_analysis', name: 'Analiza wyników', next_steps: ['feedback_delivery'] },
                            { id: 'feedback_delivery', name: 'Przekazanie feedbacku', next_steps: ['completed'] }
                        ]
                    },
                    {
                        id: 'summary_reflection_flow',
                        name: '💭 Podsumowanie i refleksja',
                        steps: [
                            { id: 'content_recap', name: 'Powtórka treści', next_steps: ['key_insights'] },
                            { id: 'key_insights', name: 'Kluczowe wnioski', next_steps: ['reflection_questions'] },
                            { id: 'reflection_questions', name: 'Pytania refleksyjne', next_steps: ['next_steps_planning'] },
                            { id: 'next_steps_planning', name: 'Planowanie kolejnych kroków', next_steps: ['completed'] }
                        ]
                    }
                ];
            } else {
                // Business networking flows for networker avatar
                flows = [
                    {
                        id: 'greeting_flow',
                        name: '🤝 Powitanie i nawiązanie kontaktu',
                        steps: [
                            { id: 'initial_greeting', name: 'Powitanie', next_steps: ['company_introduction'] },
                            { id: 'company_introduction', name: 'Przedstawienie firmy', next_steps: ['conversation_opener'] },
                            { id: 'conversation_opener', name: 'Otwarcie rozmowy', next_steps: ['completed'] }
                        ]
                    },
                    {
                        id: 'company_presentation_flow',
                        name: '🏢 Prezentacja firmy NPC',
                        steps: [
                            { id: 'company_overview', name: 'Przegląd firmy', next_steps: ['services_presentation'] },
                            { id: 'services_presentation', name: 'Prezentacja usług', next_steps: ['value_proposition'] },
                            { id: 'value_proposition', name: 'Propozycja wartości', next_steps: ['examples_cases'] },
                            { id: 'examples_cases', name: 'Przykłady zastosowań', next_steps: ['completed'] }
                        ]
                    },
                    {
                        id: 'needs_analysis_flow',
                        name: '🔍 Analiza potrzeb użytkownika',
                        steps: [
                            { id: 'pain_points', name: 'Punkty bólowe', next_steps: ['impact_assessment'] },
                            { id: 'impact_assessment', name: 'Ocena wpływu', next_steps: ['solution_attempts'] },
                            { id: 'solution_attempts', name: 'Próby rozwiązania', next_steps: ['success_metrics'] },
                            { id: 'success_metrics', name: 'Metryki sukcesu', next_steps: ['completed'] }
                        ]
                    }
                ];
            }
            
            this.flows = flows;
            
            // Populate flow selector
            const selector = document.getElementById('flow-selector');
            selector.innerHTML = '<option value="">Wybierz flow...</option>';
            
            flows.forEach(flow => {
                const option = document.createElement('option');
                option.value = flow.id;
                option.textContent = flow.name;
                selector.appendChild(option);
            });
            
            console.log('Flow definitions loaded:', flows.length);
            
        } catch (error) {
            console.error('Error loading flow definitions:', error);
        }
    }

    selectFlow(flowId) {
        if (!flowId) {
            this.resetGraph();
            return;
        }
        
        const flow = this.flows.find(f => f.id === flowId);
        if (!flow) return;
        
        this.currentFlow = flow;
        this.renderFlowGraph(flow);
    }

    renderFlowGraph(flow) {
        const startTime = Date.now();
        
        // Clear existing graph
        this.g.selectAll('*').remove();
        
        // Create directed graph
        const g = new dagreD3.graphlib.Graph()
            .setGraph({})
            .setDefaultEdgeLabel(() => ({}));
        
        // Add nodes
        flow.steps.forEach(step => {
            g.setNode(step.id, {
                label: step.name,
                class: 'node'
            });
        });
        
        // Add edges
        flow.steps.forEach(step => {
            step.next_steps.forEach(nextStep => {
                if (nextStep !== 'completed') {
                    g.setEdge(step.id, nextStep);
                }
            });
        });
        
        // Create renderer
        const render = new dagreD3.render();
        
        // Render graph
        render(this.g, g);
        
        // Center the graph
        const graphWidth = g.graph().width;
        const graphHeight = g.graph().height;
        const svgWidth = parseInt(this.svg.style('width'));
        const svgHeight = parseInt(this.svg.style('height'));
        
        const translateX = (svgWidth - graphWidth) / 2;
        const translateY = (svgHeight - graphHeight) / 2;
        
        this.g.attr('transform', `translate(${translateX}, ${translateY})`);
        
        const endTime = Date.now();
        this.logPerformance('renderFlowGraph', endTime - startTime, { 
            flowId: flow.id, 
            nodeCount: flow.steps.length 
        });
    }

    resetGraph() {
        this.g.selectAll('*').remove();
        this.currentFlow = null;
        document.getElementById('flow-selector').value = '';
    }

    // ============ MINDSTATE MONITORING ============

    async refreshMindState() {
        if (!this.currentSession) return;
        
        try {
            // Since we don't have a direct MindState endpoint, we'll simulate it
            // In a real implementation, you'd call an API endpoint
            this.mindState = {
                session_id: this.currentSession,
                stack: [
                    { intent: 'greeting', timestamp: Date.now() - 60000, confidence: 0.95 },
                    { intent: 'ask_about_npc_firm', timestamp: Date.now() - 30000, confidence: 0.87 },
                    { intent: 'user_needs', timestamp: Date.now(), confidence: 0.92 }
                ],
                current_intent: 'user_needs',
                current_flow: this.currentFlow?.id || null,
                current_flow_step: 'pain_points',
                business_avatar: {
                    name: 'Anna Kowalczyk',
                    company: 'LogisPol',
                    expertise: 'Ekspansja zagraniczna'
                }
            };
            
            this.updateMindStateDisplay();
            
        } catch (error) {
            console.error('Error refreshing MindState:', error);
        }
    }

    updateMindStateDisplay() {
        if (!this.mindState) {
            // Clear displays
            document.getElementById('mindstate-stack').innerHTML = '';
            document.getElementById('current-intent').innerHTML = '<span class="intent-name">-</span><span class="intent-confidence">-</span>';
            document.getElementById('current-flow').innerHTML = '<div class="flow-name">-</div><div class="flow-step">-</div>';
            document.getElementById('business-avatar').innerHTML = '<div class="avatar-name">-</div><div class="avatar-company">-</div><div class="avatar-expertise">-</div>';
            return;
        }
        
        // Update stack
        const stackContainer = document.getElementById('mindstate-stack');
        stackContainer.innerHTML = '';
        
        this.mindState.stack.forEach((item, index) => {
            const stackItem = document.createElement('div');
            stackItem.className = `stack-item ${index === this.mindState.stack.length - 1 ? 'current' : ''}`;
            
            const timeAgo = this.formatTimeAgo(item.timestamp);
            
            stackItem.innerHTML = `
                <div class="stack-item-header">
                    <span class="stack-item-intent">${item.intent}</span>
                    <span class="stack-item-time">${timeAgo}</span>
                </div>
                <div class="stack-item-confidence">Pewność: ${(item.confidence * 100).toFixed(1)}%</div>
            `;
            
            stackContainer.appendChild(stackItem);
        });
        
        // Update current intent
        const currentIntent = this.mindState.stack[this.mindState.stack.length - 1];
        document.getElementById('current-intent').innerHTML = `
            <span class="intent-name">${currentIntent.intent}</span>
            <span class="intent-confidence">${(currentIntent.confidence * 100).toFixed(1)}%</span>
        `;
        
        // Update current flow
        if (this.mindState.current_flow) {
            const flow = this.flows.find(f => f.id === this.mindState.current_flow);
            const flowName = flow ? flow.name : this.mindState.current_flow;
            const progress = this.calculateFlowProgress(this.mindState.current_flow, this.mindState.current_flow_step);
            
            document.getElementById('current-flow').innerHTML = `
                <div class="flow-name">${flowName}</div>
                <div class="flow-step">Krok: ${this.mindState.current_flow_step}</div>
                <div class="flow-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
            
            // Highlight current step in graph
            this.highlightCurrentStep(this.mindState.current_flow_step);
        }
        
        // Update business avatar
        if (this.mindState.business_avatar) {
            document.getElementById('business-avatar').innerHTML = `
                <div class="avatar-name">${this.mindState.business_avatar.name}</div>
                <div class="avatar-company">${this.mindState.business_avatar.company}</div>
                <div class="avatar-expertise">${this.mindState.business_avatar.expertise}</div>
            `;
        }
    }

    highlightCurrentStep(stepId) {
        if (!this.currentFlow) return;
        
        // Reset all nodes
        this.g.selectAll('.node').classed('active', false);
        
        // Highlight current node
        this.g.selectAll('.node').filter(function(d) {
            return d === stepId;
        }).classed('active', true);
    }

    calculateFlowProgress(flowId, currentStep) {
        const flow = this.flows.find(f => f.id === flowId);
        if (!flow) return 0;
        
        const stepIndex = flow.steps.findIndex(s => s.id === currentStep);
        return Math.round((stepIndex + 1) / flow.steps.length * 100);
    }

    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s temu`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m temu`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h temu`;
        return `${Math.floor(seconds / 86400)}d temu`;
    }

    // ============ DEBUG FUNCTIONALITY ============

    toggleDebug() {
        this.debugVisible = !this.debugVisible;
        const debugContent = document.getElementById('debug-content');
        
        if (this.debugVisible) {
            debugContent.classList.remove('hidden');
            this.updateDebugDisplay();
        } else {
            debugContent.classList.add('hidden');
        }
    }

    updateDebugDisplay() {
        this.updateApiLog();
        this.updatePerformanceLog();
    }

    updateApiLog() {
        const logContainer = document.getElementById('api-log');
        const recentLogs = this.apiLog.slice(-10); // Show last 10 calls
        
        logContainer.textContent = recentLogs.map(log => 
            `${log.timestamp.split('T')[1].split('.')[0]} ${log.method} ${log.endpoint} - ${log.status} (${log.duration}ms)`
        ).join('\n');
        
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    updatePerformanceLog() {
        const logContainer = document.getElementById('performance-log');
        const recentLogs = this.performanceLog.slice(-10); // Show last 10 actions
        
        logContainer.textContent = recentLogs.map(log => 
            `${log.timestamp.split('T')[1].split('.')[0]} ${log.action} - ${log.duration}ms`
        ).join('\n');
        
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // ============ HEALTH CHECK ============

    async startHealthCheck() {
        // Check API health every 30 seconds
        setInterval(async () => {
            try {
                await this.apiCall('/health');
            } catch (error) {
                console.warn('Health check failed:', error);
            }
        }, 30000);
        
        // Initial health check
        try {
            await this.apiCall('/health');
            console.log('✅ Dashboard connected to API');
        } catch (error) {
            console.error('❌ Dashboard failed to connect to API:', error);
        }
    }

    // ============ EXPORT FUNCTIONALITY ============

    exportData() {
        const data = {
            session_id: this.currentSession,
            chat_history: Array.from(document.querySelectorAll('.message')).map(msg => ({
                sender: msg.classList.contains('user') ? 'user' : 'bot',
                content: msg.querySelector('.message-content').textContent,
                timestamp: msg.querySelector('.message-header').textContent
            })),
            mindstate: this.mindState,
            current_flow: this.currentFlow?.id,
            api_log: this.apiLog,
            performance_log: this.performanceLog
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `avatar-session-${this.currentSession || 'unknown'}-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // ============ AVATAR MANAGEMENT ============

    async changeAvatar(avatarType) {
        console.log(`Changing avatar to: ${avatarType}`);
        
        // Update current avatar type
        this.currentAvatarType = avatarType;
        
        // Clear current session when switching avatars
        this.clearSession();
        
        // Reload flow definitions for new avatar
        await this.loadFlowDefinitions();
        
        // Update avatar display
        this.updateAvatarDisplay();
        
        // Reset graph
        this.resetGraph();
        
        console.log(`Avatar switched to: ${avatarType}`);
    }

    updateAvatarDisplay() {
        const avatarConfig = this.getAvatarConfig(this.currentAvatarType);
        
        // Update business avatar section
        document.querySelector('#business-avatar .avatar-name').textContent = avatarConfig.name;
        document.querySelector('#business-avatar .avatar-company').textContent = avatarConfig.company;
        document.querySelector('#business-avatar .avatar-expertise').textContent = avatarConfig.expertise;
        
        // Update page title
        document.title = `AI Avatar Business - ${avatarConfig.name}`;
    }

    getAvatarConfig(avatarType) {
        const avatarConfigs = {
            networker: {
                name: 'Anna Kowalczyk',
                company: 'LogisPol International',
                expertise: 'Ekspansja zagraniczna, logistyka, networking biznesowy'
            },
            trainer: {
                name: 'Prof. Anna Kowalska',
                company: 'Instytut Archetypów Osobowości',
                expertise: '12 Archetypów Osobowości, psychologia biznesu, coaching'
            }
        };
        
        return avatarConfigs[avatarType] || avatarConfigs.networker;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AvatarDashboard();
    console.log('🚀 AI Avatar Dashboard initialized');
}); 