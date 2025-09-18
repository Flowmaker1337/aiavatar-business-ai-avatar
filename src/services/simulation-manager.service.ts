import {v4 as uuidv4} from 'uuid';
import {
    SimulationExecution,
    SimulationScenario,
    SimulationParticipant,
    SimulationMessage,
    SimulationConfig,
    SimulationAnalysis,
    BusinessAvatar,
    IntentClassificationResult
} from '../models/types';
import sessionService from './session.service';
import openAIService from './openai.service';
import IntentClassifier from './intent-classifier.service';
import FlowManager from './flow-manager.service';
import {ConversationAnalyzerService} from './conversation-analyzer.service';
import {ExecutionTimerService} from './execution-timer.service';
import DatabaseService from './database.service';

/**
 * SimulationManager - zarządza symulacjami konwersacji między AI Avatarami
 * Umożliwia uruchamianie, monitorowanie i analizę dialogów AI-AI
 */
export class SimulationManager {
    private static instance: SimulationManager;
    private activeSimulations: Map<string, SimulationExecution> = new Map();
    private sessionService = sessionService;
    private openAIService = openAIService;
    private intentClassifier: IntentClassifier;
    private flowManager: FlowManager;
    private conversationAnalyzer: ConversationAnalyzerService;
    private databaseService: DatabaseService;

    private constructor() {
        this.intentClassifier = IntentClassifier.getInstance();
        this.flowManager = FlowManager.getInstance();
        this.conversationAnalyzer = new ConversationAnalyzerService();
        this.databaseService = DatabaseService.getInstance();
    }

    public static getInstance(): SimulationManager {
        if (!SimulationManager.instance) {
            SimulationManager.instance = new SimulationManager();
        }
        return SimulationManager.instance;
    }

    /**
     * Tworzy i uruchamia nową symulację konwersacji
     */
    public async startSimulation(
        scenario: SimulationScenario,
        config: SimulationConfig
    ): Promise<SimulationExecution> {
        const timer = new ExecutionTimerService('SimulationManager.startSimulation');
        timer.start();

        try {
            const simulationId = uuidv4();

            // Utworz sesje dla każdego uczestnika
            const participantSessions = new Map<string, string>();

            for (const participant of scenario.participants) {
                const sessionId = uuidv4();

                // Załaduj odpowiednie flow definitions dla typu avatara
                await this.flowManager.loadFlowDefinitionsForAvatar(participant.avatarType);

                participantSessions.set(participant.id, sessionId);

                console.log(`✅ Created session ${sessionId} for participant ${participant.id} (${participant.avatarType})`);
            }

            // Utworz execution object
            const simulation: SimulationExecution = {
                id: simulationId,
                scenario,
                status: 'setting_up',
                start_time: Date.now(),
                current_turn: 0,
                max_turns: Math.floor(scenario.duration_minutes * 2), // Assuming ~2 turns per minute
                messages: [],
                analysis: this.initializeAnalysis(),
                participants_sessions: participantSessions
            };

            this.activeSimulations.set(simulationId, simulation);

            // Uruchom symulację
            if (config.auto_start) {
                await this.runSimulation(simulationId, config);
            }

            timer.stop();
            console.log(`🚀 Started simulation ${simulationId} with ${scenario.participants.length} participants`);

            return simulation;
        } catch (error) {
            timer.stop();
            console.error('❌ Error starting simulation:', error);
            throw error;
        }
    }

    /**
     * Wykonuje symulację konwersacji
     */
    private async runSimulation(simulationId: string, config: SimulationConfig): Promise<void> {
        const simulation = this.activeSimulations.get(simulationId);
        if (!simulation) {
            throw new Error(`Simulation ${simulationId} not found`);
        }

        simulation.status = 'running';
        console.log(`🎬 Running simulation ${simulationId}`);

        try {
            // Wybierz conversation starter
            const starterMessage = this.selectConversationStarter(simulation.scenario);

            // Rozpocznij od pierwszego uczestnika (zazwyczaj teacher/seller)
            const initiatingParticipant = simulation.scenario.participants.find(p =>
                ['teacher', 'seller', 'interviewer'].includes(p.role)
            ) || simulation.scenario.participants[0];

            // Dodaj pierwszą wiadomość
            await this.addSimulationMessage(
                simulationId,
                initiatingParticipant.id,
                starterMessage,
                'greeting'
            );

            // Główna pętla konwersacji
            while (simulation.current_turn < simulation.max_turns && simulation.status === 'running') {
                await this.executeConversationTurn(simulationId, config);

                // Opcjonalna analiza w czasie rzeczywistym
                if (config.enable_real_time_analysis && simulation.current_turn % 5 === 0) {
                    await this.updateRealTimeAnalysis(simulationId);
                }

                // Sprawdź warunki zakończenia
                if (await this.shouldEndSimulation(simulationId)) {
                    break;
                }

                // Krótka przerwa między turami
                await this.sleep(1000);
            }

            // Zakończ symulację
            await this.completeSimulation(simulationId);

        } catch (error) {
            simulation.status = 'failed';
            console.error(`❌ Simulation ${simulationId} failed:`, error);
            throw error;
        }
    }

    /**
     * Wykonuje jedną turę konwersacji
     */
    private async executeConversationTurn(simulationId: string, config: SimulationConfig): Promise<void> {
        const simulation = this.activeSimulations.get(simulationId);
        if (!simulation) return;

        const timer = new ExecutionTimerService('SimulationManager.executeConversationTurn');
        timer.start();

        try {
            // Znajdź uczestnika, który powinien odpowiedzieć
            const respondingParticipant = this.getNextRespondingParticipant(simulation);
            if (!respondingParticipant) {
                console.log('⚠️ No responding participant found, ending simulation');
                return;
            }

            // Pobierz ostatnią wiadomość do odpowiedzi
            const lastMessage = simulation.messages[simulation.messages.length - 1];
            if (!lastMessage || lastMessage.participant_id === respondingParticipant.id) {
                // Skip if it's the same participant or no message to respond to
                return;
            }

            // Przygotuj kontekst konwersacji
            const conversationContext = this.buildConversationContext(simulation, respondingParticipant);

            // Sklasyfikuj intencję ostatniej wiadomości
            // const intentResult = await this.intentClassifier.classifyIntent(
            //     lastMessage.content
            // );

            const intentResult:IntentClassificationResult = {
                intent: '',
                confidence: 0
            };

            // Wygeneruj odpowiedź
            const response = await this.generateParticipantResponse(
                respondingParticipant,
                lastMessage.content,
                conversationContext,
                intentResult
            );

            // Dodaj odpowiedź do symulacji
            await this.addSimulationMessage(
                simulationId,
                respondingParticipant.id,
                response,
                intentResult.intent,
                timer.getElapsedTime()
            );

            simulation.current_turn++;
            timer.stop();

            console.log(`💬 Turn ${simulation.current_turn}: ${respondingParticipant.persona.name} responded`);

        } catch (error) {
            timer.stop();
            console.error('❌ Error executing conversation turn:', error);
            throw error;
        }
    }

    /**
     * Generuje odpowiedź uczestnika symulacji
     */
    private async generateParticipantResponse(
        participant: SimulationParticipant,
        inputMessage: string,
        conversationContext: string,
        intentResult: IntentClassificationResult
    ): Promise<string> {

        // Zbuduj prompt specyficzny dla roli uczestnika
        const rolePrompt = this.buildRoleSpecificPrompt(participant, intentResult);

        // Pobierz historię konwersacji
        const simulation = this.activeSimulations.get(participant.id.split('_')[0]) ||
            Array.from(this.activeSimulations.values())[0];
        const conversationHistory = simulation ? this.buildConversationHistory(simulation) : '';

        // Zbuduj pełny prompt z instrukcjami przeciw powtarzaniu powitań
        const systemPrompt = {
            role: 'system' as const,
            content:
                `Jesteś ${participant.persona.name}, ${participant.persona.background}. 
                Odpowiadaj w naturalny sposób zgodnie ze swoją rolą: ${participant.role}.
                Styl komunikacji: ${participant.persona.communication_style}.
                Cechy osobowości: ${participant.persona.personality_traits.join(', ')}.
                
                WAŻNE INSTRUKCJE:
                - NIE powtarzaj powitań (dzień dobry, witam, cześć) jeśli już się przywitałeś
                - Prowadź naturalną konwersację kontynuując poprzednie wątki
                - Odpowiadaj na konkretne pytania i komentarze rozmówcy
                - Nie zaczynaj od nowa - to kontynuacja rozmowy`
        };

        const userPrompt = {
            role: 'user' as const,
            content:
                `${rolePrompt}

                HISTORIA KONWERSACJI:
                ${conversationHistory}
                
                KONTEKST KONWERSACJI:
                ${conversationContext}
                
                OSTATNIA WIADOMOŚĆ OD ROZMÓWCY:
                "${inputMessage}"
                
                TWOJA ODPOWIEDŹ (jako ${participant.persona.name}, KONTYNUUJ rozmowę, NIE witaj się ponownie):`
        };

        const response = await this.openAIService.generateResponse(userPrompt, systemPrompt);
        return response.trim();
    }

    /**
     * Buduje historię konwersacji dla kontekstu
     */
    private buildConversationHistory(simulation: SimulationExecution): string {
        if (!simulation.messages || simulation.messages.length === 0) {
            return 'Rozmowa właśnie się rozpoczęła.';
        }

        // Pokaż ostatnie 5 wiadomości dla kontekstu
        const recentMessages = simulation.messages.slice(-5);

        return recentMessages.map(message => {
            const participant = simulation.scenario.participants.find(p => p.id === message.participant_id);
            const speakerName = participant?.persona.name || 'Nieznany';
            return `${speakerName}: "${message.content}"`;
        }).join('\n');
    }

    /**
     * Buduje prompt specyficzny dla roli uczestnika
     */
    private buildRoleSpecificPrompt(
        participant: SimulationParticipant,
        intentResult: IntentClassificationResult
    ): string {
        const persona = participant.persona;

        let rolePrompt = `TWOJA ROLA: ${participant.role}
POZIOM DOŚWIADCZENIA: ${persona.expertise_level}
BRANŻA: ${persona.industry}
WIELKOŚĆ FIRMY: ${persona.company_size}

TWOJE CELE W TEJ ROZMOWIE:
${persona.goals.map(goal => `- ${goal}`).join('\n')}

TWOJE WYZWANIA:
${persona.challenges.map(challenge => `- ${challenge}`).join('\n')}`;

        // Dodaj specyficzne instrukcje dla roli
        switch (participant.role) {
            case 'buyer':
            case 'learner':
                rolePrompt += `\n\nJAKO ${participant.role.toUpperCase()}:
- Zadawaj pytania o produkty/usługi/wiedzę
- Wyrażaj wątpliwości i obawy
- Negocjuj warunki jeśli to odpowiednie
- Bądź skeptyczny ale konstruktywny
- Żądaj konkretnych przykładów i dowodów`;
                break;

            case 'seller':
            case 'teacher':
                rolePrompt += `\n\nJAKO ${participant.role.toUpperCase()}:
- Prezentuj korzyści i rozwiązania
- Odpowiadaj na pytania w sposób przekonujący
- Dawaj konkretne przykłady
- Buduj zaufanie i rapport
- Prowadź rozmowę w kierunku zamknięcia/zrozumienia`;
                break;

            case 'interviewee':
                rolePrompt += `\n\nJAKO KANDYDAT:
- Odpowiadaj na pytania szczerze ale pozytywnie
- Podawaj konkretne przykłady z doświadczenia
- Zadawaj przemyślane pytania o firmę/stanowisko
- Pokazuj zaangażowanie i motywację`;
                break;

            case 'interviewer':
                rolePrompt += `\n\nJAKO REKRUTER:
- Zadawaj pytania sprawdzające kompetencje
- Oceniaj odpowiedzi kandydata
- Prezentuj firmę i stanowisko
- Sprawdzaj dopasowanie kulturowe`;
                break;
        }

        // Dodaj informacje o wykrytej intencji
        if (intentResult.intent) {
            rolePrompt += `\n\nWYKRYTA INTENCJA ROZMÓWCY: ${intentResult.intent}
ODPOWIEDZ W SPOSÓB ODPOWIADAJĄCY TEJ INTENCJI.`;
        }

        return rolePrompt;
    }

    /**
     * Buduje kontekst konwersacji dla uczestnika
     */
    private buildConversationContext(
        simulation: SimulationExecution,
        participant: SimulationParticipant
    ): string {
        const recentMessages = simulation.messages.slice(-6); // Ostatnie 6 wiadomości

        let context = `SCENARIUSZ: ${simulation.scenario.name}
CEL ROZMOWY: ${simulation.scenario.objective}
BRANŻA: ${simulation.scenario.context.industry}
SYTUACJA: ${simulation.scenario.context.situation}

HISTORIA ROZMOWY:`;

        for (const message of recentMessages) {
            const messageParticipant = simulation.scenario.participants.find(p => p.id === message.participant_id);
            const participantName = messageParticipant?.persona.name || 'Nieznany';
            context += `\n${participantName}: "${message.content}"`;
        }

        return context;
    }

    /**
     * Wybiera uczestnika, który powinien odpowiedzieć
     */
    private getNextRespondingParticipant(simulation: SimulationExecution): SimulationParticipant | null {
        if (simulation.messages.length === 0) {
            // Pierwsza wiadomość - wybierz initiating participant
            return simulation.scenario.participants.find(p =>
                ['teacher', 'seller', 'interviewer'].includes(p.role)
            ) || simulation.scenario.participants[0];
        }

        const lastMessage = simulation.messages[simulation.messages.length - 1];
        const lastParticipantId = lastMessage.participant_id;

        // Znajdź następnego uczestnika (prosty round-robin)
        const participants = simulation.scenario.participants;
        const lastIndex = participants.findIndex(p => p.id === lastParticipantId);
        const nextIndex = (lastIndex + 1) % participants.length;

        return participants[nextIndex];
    }

    /**
     * Dodaje wiadomość do symulacji
     */
    private async addSimulationMessage(
        simulationId: string,
        participantId: string,
        content: string,
        intent: string,
        responseTimeMs: number = 0
    ): Promise<void> {
        const simulation = this.activeSimulations.get(simulationId);
        if (!simulation) return;

        const message: SimulationMessage = {
            id: uuidv4(),
            simulation_id: simulationId,
            participant_id: participantId,
            content,
            timestamp: Date.now(),
            intent,
            response_time_ms: responseTimeMs,
            metadata: {
                confidence: 0.8, // Default confidence
                flow_triggered: false, // Will be updated by flow analysis
                rag_used: false, // Will be updated if RAG is used
                tokens_used: this.estimateTokenCount(content)
            }
        };

        simulation.messages.push(message);

        // Aktualizuj analizę
        this.updateMessageAnalysis(simulation, message);

        console.log(`📝 Added message from ${participantId}: "${content.substring(0, 50)}..."`);
    }

    /**
     * Szacuje liczbę tokenów w wiadomości
     */
    private estimateTokenCount(text: string): number {
        // Proste szacowanie: ~4 znaki = 1 token
        return Math.ceil(text.length / 4);
    }

    /**
     * Aktualizuje analizę wiadomości
     */
    private updateMessageAnalysis(simulation: SimulationExecution, message: SimulationMessage): void {
        const analysis = simulation.analysis;

        // Aktualizuj dystrybucję intencji
        const currentCount = analysis.intent_distribution.get(message.intent) || 0;
        analysis.intent_distribution.set(message.intent, currentCount + 1);

        // Aktualizuj metryki czasu odpowiedzi
        if (message.response_time_ms > 0) {
            const times = analysis.response_times;
            times.min = Math.min(times.min, message.response_time_ms);
            times.max = Math.max(times.max, message.response_time_ms);

            // Przelicz średnią
            const totalMessages = simulation.messages.length;
            const totalTime = (times.average * (totalMessages - 1)) + message.response_time_ms;
            times.average = totalTime / totalMessages;
        }

        // Aktualizuj metryki konwersacji
        analysis.conversation_metrics.total_turns = simulation.messages.length;
        analysis.conversation_metrics.avg_message_length =
            simulation.messages.reduce((sum, msg) => sum + msg.content.length, 0) / simulation.messages.length;
    }

    /**
     * Wybiera conversation starter
     */
    private selectConversationStarter(scenario: SimulationScenario): string {
        const starters = scenario.conversation_starters;
        return starters[Math.floor(Math.random() * starters.length)];
    }

    /**
     * Sprawdza czy symulacja powinna się zakończyć
     */
    private async shouldEndSimulation(simulationId: string): Promise<boolean> {
        const simulation = this.activeSimulations.get(simulationId);
        if (!simulation) return true;

        // Sprawdź limity
        if (simulation.current_turn >= simulation.max_turns) {
            return true;
        }

        const elapsed = Date.now() - simulation.start_time;
        const maxDuration = simulation.scenario.duration_minutes * 60 * 1000;
        if (elapsed >= maxDuration) {
            return true;
        }

        // Sprawdź czy osiągnięto cele scenariusza
        const goalAchievement = await this.calculateGoalAchievement(simulation);
        if (goalAchievement >= 0.8) { // 80% osiągnięcia celów
            return true;
        }

        return false;
    }

    /**
     * Oblicza osiągnięcie celów scenariusza
     */
    private async calculateGoalAchievement(simulation: SimulationExecution): Promise<number> {
        // Placeholder - można rozwinąć o analizę NLP ostatnich wiadomości
        const messages = simulation.messages;
        if (messages.length < 6) return 0;

        // Prosta heurystyka - czy pojawiły się klucze intencje?
        const keyIntents = ['solution_presentation', 'meeting_arrangement', 'purchase_decision'];
        const presentIntents = Array.from(simulation.analysis.intent_distribution.keys());
        const matchedIntents = keyIntents.filter(intent => presentIntents.includes(intent));

        return matchedIntents.length / keyIntents.length;
    }

    /**
     * Kończy symulację i generuje pełną analizę
     */
    private async completeSimulation(simulationId: string): Promise<void> {
        const simulation = this.activeSimulations.get(simulationId);
        if (!simulation) return;

        simulation.status = 'completed';
        simulation.end_time = Date.now();

        // Wygeneruj pełną analizę
        simulation.analysis = await this.conversationAnalyzer.analyzeConversation(simulation);

        console.log(`✅ Simulation ${simulationId} completed with ${simulation.messages.length} messages`);
        console.log(`📊 Quality Score: ${simulation.analysis.conversation_quality_score}`);
    }

    /**
     * Aktualizuje analizę w czasie rzeczywistym
     */
    private async updateRealTimeAnalysis(simulationId: string): Promise<void> {
        const simulation = this.activeSimulations.get(simulationId);
        if (!simulation) return;

        // Partial analysis update
        const partialAnalysis = await this.conversationAnalyzer.analyzeConversationPartial(simulation);
        simulation.analysis = {...simulation.analysis, ...partialAnalysis};

        console.log(`📈 Real-time analysis updated for simulation ${simulationId}`);
    }

    /**
     * Pobiera aktywną symulację
     */
    public getSimulation(simulationId: string): SimulationExecution | null {
        return this.activeSimulations.get(simulationId) || null;
    }

    /**
     * Pobiera wszystkie aktywne symulacje
     */
    public getAllActiveSimulations(): SimulationExecution[] {
        return Array.from(this.activeSimulations.values());
    }

    /**
     * Pauzuje symulację
     */
    public pauseSimulation(simulationId: string): boolean {
        const simulation = this.activeSimulations.get(simulationId);
        if (simulation && simulation.status === 'running') {
            simulation.status = 'paused';
            return true;
        }
        return false;
    }

    /**
     * Wznawia symulację
     */
    public async resumeSimulation(simulationId: string, config: SimulationConfig): Promise<boolean> {
        const simulation = this.activeSimulations.get(simulationId);
        if (simulation && simulation.status === 'paused') {
            simulation.status = 'running';
            // Continue the simulation in background
            this.runSimulation(simulationId, config).catch(console.error);
            return true;
        }
        return false;
    }

    /**
     * Inicjalizuje pustą analizę
     */
    private initializeAnalysis(): SimulationAnalysis {
        return {
            conversation_quality_score: 0,
            participant_performance: new Map(),
            flow_analysis: {
                flows_triggered: new Map(),
                flow_completion_rates: new Map(),
                flow_transitions: [],
                stuck_points: []
            },
            intent_distribution: new Map(),
            response_times: {
                average: 0,
                min: Number.MAX_VALUE,
                max: 0
            },
            conversation_metrics: {
                total_turns: 0,
                avg_message_length: 0,
                topic_consistency: 0,
                goal_achievement_rate: 0
            },
            insights: [],
            improvement_suggestions: []
        };
    }

    /**
     * Pomocnicza funkcja sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============ SIMULATION CHAT MODE METHODS ============

    /**
     * Generuje odpowiedź reactive avatar w trybie chat simulation
     */
    public async generateReactiveResponse(
        avatarId: 'client' | 'student',
        userMessage: string,
        userRole: 'trainer' | 'seller',
        conversationHistory: any[],
        userCompany: string = 'aureus'
    ): Promise<string> {
        const timer = new ExecutionTimerService('SimulationManager.generateReactiveResponse');
        timer.start();

        try {
            // Load simulation avatars config
            const simulationAvatarsConfig = await this.loadSimulationAvatarsConfig();
            const avatarData = simulationAvatarsConfig.simulation_avatars[avatarId];

            if (!avatarData) {
                throw new Error(`Avatar ${avatarId} not found in simulation config`);
            }

            // Check for custom prompts from reactive avatar editor
            const customPrompts = await this.loadCustomReactivePrompts(avatarId);

            // Load company profile data
            const companyProfile = await this.loadCompanyProfile(userCompany);

            // Build conversation context
            const conversationContext = this.buildChatConversationHistory(conversationHistory);

            // Build role-specific system prompt
            const systemPrompt = customPrompts?.system_prompt || this.buildDefaultReactiveSystemPrompt(
                avatarData,
                avatarId,
                userRole,
                userCompany,
                companyProfile
            );

            // Build user prompt template
            const userPromptTemplate = customPrompts?.user_prompt_template || this.buildDefaultReactiveUserPrompt(
                avatarData,
                avatarId,
                userRole,
                userCompany,
                companyProfile
            );

            // Replace placeholders in user prompt
            const finalUserPrompt = userPromptTemplate
                .replace(/\{\{user_message\}\}/g, userMessage)
                .replace(/\{\{conversation_history\}\}/g, conversationContext)
                .replace(/\{\{avatar_name\}\}/g, `${avatarData.firstName} ${avatarData.lastName}`)
                .replace(/\{\{user_role\}\}/g, userRole === 'trainer' ? 'TRENER' : 'SPRZEDAWCA');

            const response = await this.openAIService.generateResponse({
                role: 'user',
                content: finalUserPrompt
            }, {
                role: 'system',
                content: systemPrompt
            });

            timer.stop();
            console.log(`🤖 Generated reactive response for ${avatarId} (${userRole} mode)`);

            return response.trim();

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating reactive response:', error);
            throw error;
        }
    }

    /**
     * Load simulation avatars configuration
     */
    private async loadSimulationAvatarsConfig(): Promise<any> {
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, '../config/simulation-avatars.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('Error loading simulation avatars config:', error);
            throw error;
        }
    }

    /**
     * Load custom reactive prompts from database
     */
    private async loadCustomReactivePrompts(avatarId: string): Promise<any> {
        try {
            // This would normally fetch from database via ReactiveAvatarController
            // For now, return null to use defaults
            return null;
        } catch (error) {
            console.error('Error loading custom reactive prompts:', error);
            return null;
        }
    }

    /**
     * Load company profile from database
     */
    private async loadCompanyProfile(companyId: string): Promise<any> {
        try {
            const collectionName = 'company_profiles';
            const allProfiles = await this.databaseService.findAll(collectionName);
            const profile = allProfiles.find((p: any) => p.company_id === companyId);
            return profile || null;
        } catch (error) {
            console.error('Error loading company profile:', error);
            return null;
        }
    }

    /**
     * Build chat conversation history for context
     */
    private buildChatConversationHistory(messages: any[]): string {
        if (!messages || messages.length === 0) {
            return 'To jest początek konwersacji.';
        }

        return messages
            .slice(-10) // Last 10 messages
            .map(msg => `${msg.sender}: ${msg.content}`)
            .join('\n');
    }

    /**
     * Build default system prompt for reactive avatar
     */
    private buildDefaultReactiveSystemPrompt(
        avatarData: any,
        avatarId: 'client' | 'student',
        userRole: 'trainer' | 'seller',
        userCompany: string = 'aureus',
        companyProfile: any = null
    ): string {
        // Get company info for context
        const companyInfo = this.getCompanyInfo(userCompany);

        // Build company context from profile or defaults
        let companyContext = companyProfile?.company_context || companyInfo.services.join(', ');
        let roleDescription = companyProfile?.your_role_description || `${userRole === 'trainer' ? 'Trener' : 'Sprzedawca'} z firmy ${companyInfo.name}`;
        let currentSituation = companyProfile?.current_situation || 'Prezentacja rozwiązań biznesowych';
        let goalsObjectives = companyProfile?.goals_objectives || 'Znalezienie najlepszego rozwiązania dla klienta';
        let keyChallenges = companyProfile?.key_challenges || 'Budżet i czas implementacji';

        const basePrompt = `Jesteś ${avatarData.firstName} ${avatarData.lastName}, ${avatarData.position} w firmie ${avatarData.company.name}.

ROZMAWASZ Z: ${roleDescription}
BRANŻA ROZMÓWCY: ${companyInfo.industry}
KONTEKST FIRMY ROZMÓWCY: ${companyContext}

SYTUACJA ROZMOWY: ${currentSituation}
CELE ROZMÓWCY: ${goalsObjectives}  
WYZWANIA ROZMÓWCY: ${keyChallenges}

TWOJA ROLA: ${avatarId === 'client' ? 'buyer (klient)' : 'learner (uczeń)'}
OSOBOWOŚĆ: ${avatarData.personality.style}
BRANŻA: ${avatarData.company.industry}
${avatarId === 'client' ? `WIELKOŚĆ FIRMY: ${avatarData.company.size}` : `DOŚWIADCZENIE: ${avatarData.experience_years} lat`}`;

        if (avatarId === 'client') {
            return basePrompt + `

TWOJE CELE W ROZMOWIE:
- Znaleźć rozwiązanie problemów swojej firmy
- Upewnić się o wartości dla biznesu
- Sprawdzić czy to opłacalne rozwiązanie
- Zminimalizować ryzyko biznesowe

TWOJE WYZWANIA:
- Ograniczony budżet
- Potrzeba uzasadnienia decyzji przed kierownictwem
- Skeptycyzm wobec nowych rozwiązań
- Presja czasu na podejmowanie decyzji

JAKO BUYER:
- Zadawaj pytania o produkty/usługi
- Wyrażaj wątpliwości i obawy
- Negocjuj warunki
- Bądź skeptyczny ale konstruktywny
- Żądaj konkretnych przykładów i dowodów

Odpowiadaj w charakterze dla tej osoby, używając jej stylu komunikacji: ${avatarData.personality.communication_style}`;
        } else {
            return basePrompt + `

TWOJE CELE W ROZMOWIE:
- Nauczyć się nowych umiejętności menedżerskich
- Zdobyć praktyczne narzędzia do pracy
- Rozwinąć kompetencje przywódcze
- Rozwiązać konkretne problemy w zespole

TWOJE WYZWANIA:
- Brak doświadczenia w zarządzaniu
- Niepewność w podejmowaniu decyzji
- Potrzeba budowania autorytetu w zespole
- Balansowanie między zadaniami technicznymi a menedżerskimi

JAKO LEARNER:
- Zadawaj pytania o wiedzę i umiejętności
- Proś o konkretne przykłady
- Dziel się swoimi wyzwaniami
- Bądź chętny do nauki
- Proś o feedback i wskazówki

Odpowiadaj w charakterze dla tej osoby, używając jej stylu komunikacji: ${avatarData.personality.communication_style}`;
        }
    }

    /**
     * Build default user prompt template for reactive avatar
     */
    private buildDefaultReactiveUserPrompt(
        avatarData: any,
        avatarId: 'client' | 'student',
        userRole: 'trainer' | 'seller',
        userCompany: string = 'aureus',
        companyProfile: any = null
    ): string {
        // Add company profile context if available
        let additionalContext = '';
        if (companyProfile) {
            additionalContext = `
KONTEKST ROZMOWY:
- Sytuacja: ${companyProfile.current_situation || 'Standardowa prezentacja'}
- Cele rozmówcy: ${companyProfile.goals_objectives || 'Znalezienie rozwiązania'}
- Wyzwania: ${companyProfile.key_challenges || 'Budżet i czas'}`;
        }

        return `Rozmówca napisał: "{{user_message}}"

Twoje zadanie jako ${avatarId === 'client' ? 'KLIENT (buyer)' : 'UCZEŃ (learner)'}:
1. Odpowiedz w charakterze ${avatarData.firstName} ${avatarData.lastName}
2. ${avatarId === 'client' ? 'Zachowuj się jak potencjalny klient szukający rozwiązań biznesowych' : 'Zachowuj się jak chętny do nauki menedżer z ograniczonym doświadczeniem'}
3. ${avatarId === 'client' ? 'Zadawaj pytania o korzyści, koszty, implementation' : 'Zadawaj pytania o praktyczne zastosowania i przykłady'}
4. Używaj stylu: ${avatarData.personality.communication_style}
5. Reaguj zgodnie z osobowością: ${avatarData.personality.style}
${additionalContext}

HISTORIA KONWERSACJI:
{{conversation_history}}

PAMIĘTAJ: Jesteś ${avatarId === 'client' ? 'skeptycznym ale zainteresowanym klientem' : 'ambitnym ale niepewnym uczniem'}.`;
    }

    /**
     * Get company configuration based on userCompany
     */
    private getCompanyInfo(userCompany: string): any {
        const companyConfigs: Record<string, any> = {
            aureus: {
                name: 'Aureus',
                industry: 'Leasing maszyn',
                services: ['Leasing operacyjny', 'Leasing finansowy', 'Wynajem długoterminowy', 'Doradztwo finansowe']
            },
            techflow: {
                name: 'TechFlow',
                industry: 'Rozwiązania IT',
                services: ['Rozwój oprogramowania', 'Cloud migration', 'IT consulting', 'Cybersecurity', 'Transformacja cyfrowa']
            },
            consultpro: {
                name: 'ConsultPro',
                industry: 'Konsulting biznesowy',
                services: ['Strategia biznesowa', 'Optymalizacja procesów', 'Change management', 'Leadership training', 'Coaching']
            },
            custom: {
                name: 'Firma rozmówcy',
                industry: 'Różne branże',
                services: ['Usługi dostosowane do branży']
            }
        };

        return companyConfigs[userCompany] || companyConfigs.aureus;
    }
}

export default SimulationManager;
