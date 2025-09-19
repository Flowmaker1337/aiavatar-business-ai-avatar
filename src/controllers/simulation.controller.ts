import {Request, Response} from 'express';
import fs from 'fs';
import path from 'path';
import {
    SimulationScenario,
    SimulationConfig,
    SimulationExecution,
    SimulationParticipant,
    SimulationPersona,
    BusinessAvatar
} from '../models/types';
import SimulationManager from '../services/simulation-manager.service';
import {ExecutionTimerService} from '../services/execution-timer.service';

/**
 * SimulationController - API endpoints dla modułu symulacji konwersacji
 * Umożliwia tworzenie, uruchamianie i monitorowanie symulacji AI-AI
 */
export class SimulationController {
    private simulationManager: SimulationManager;
    private chatSessions: Map<string, any> = new Map(); // Store chat sessions

    constructor() {
        this.simulationManager = SimulationManager.getInstance();
    }

    /**
     * POST /api/simulation/create
     * Tworzy nową symulację na podstawie scenariusza
     */
    public async createSimulation(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SimulationController.createSimulation');
        timer.start();

        try {
            const {scenario, config} = req.body;

            // Walidacja danych wejściowych
            if (!scenario || !config) {
                res.status(400).json({
                    success: false,
                    error: 'Scenario and config are required'
                });
                timer.stop();
                return;
            }

            // Walidacja scenariusza
            const validationError = this.validateScenario(scenario);
            if (validationError) {
                res.status(400).json({
                    success: false,
                    error: validationError
                });
                timer.stop();
                return;
            }

            // Uruchom symulację
            const simulation = await this.simulationManager.startSimulation(scenario, config);

            timer.stop();
            res.status(201).json({
                success: true,
                data: {
                    simulation_id: simulation.id,
                    status: simulation.status,
                    participants_count: simulation.scenario.participants.length,
                    estimated_duration: scenario.duration_minutes
                },
                execution_time: timer.getElapsedTime()
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error creating simulation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while creating simulation'
            });
        }
    }

    /**
     * GET /api/simulation/:id
     * Pobiera informacje o symulacji
     */
    public async getSimulation(req: Request, res: Response): Promise<void> {
        try {
            const simulationId = req.params.id;

            const simulation = this.simulationManager.getSimulation(simulationId);
            if (!simulation) {
                res.status(404).json({
                    success: false,
                    error: 'Simulation not found'
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: simulation.id,
                    status: simulation.status,
                    scenario: simulation.scenario,
                    current_turn: simulation.current_turn,
                    max_turns: simulation.max_turns,
                    start_time: simulation.start_time,
                    end_time: simulation.end_time,
                    messages_count: simulation.messages.length,
                    analysis: simulation.analysis
                }
            });

        } catch (error) {
            console.error('❌ Error getting simulation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching simulation'
            });
        }
    }

    /**
     * GET /api/simulation/:id/messages
     * Pobiera wiadomości z symulacji
     */
    public async getSimulationMessages(req: Request, res: Response): Promise<void> {
        try {
            const simulationId = req.params.id;
            const {limit = 50, offset = 0} = req.query;

            const simulation = this.simulationManager.getSimulation(simulationId);
            if (!simulation) {
                res.status(404).json({
                    success: false,
                    error: 'Simulation not found'
                });
                return;
            }

            const startIndex = parseInt(offset as string) || 0;
            const limitNum = parseInt(limit as string) || 50;
            const messages = simulation.messages.slice(startIndex, startIndex + limitNum);

            // Wzbogać wiadomości o informacje o uczestnikach
            const enrichedMessages = messages.map(message => {
                const participant = simulation.scenario.participants.find(p => p.id === message.participant_id);
                return {
                    ...message,
                    participant_name: participant?.persona.name || 'Unknown',
                    participant_role: participant?.role || 'unknown'
                };
            });

            res.json({
                success: true,
                data: {
                    messages: enrichedMessages,
                    total_count: simulation.messages.length,
                    has_more: startIndex + limitNum < simulation.messages.length
                }
            });

        } catch (error) {
            console.error('❌ Error getting simulation messages:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching messages'
            });
        }
    }

    /**
     * GET /api/simulation/:id/analysis
     * Pobiera analizę symulacji
     */
    public async getSimulationAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const simulationId = req.params.id;

            const simulation = this.simulationManager.getSimulation(simulationId);
            if (!simulation) {
                res.status(404).json({
                    success: false,
                    error: 'Simulation not found'
                });
                return;
            }

            // Konwertuj Maps do obiektów dla JSON serialization
            const analysis = {
                ...simulation.analysis,
                participant_performance: Object.fromEntries(simulation.analysis.participant_performance),
                intent_distribution: Object.fromEntries(simulation.analysis.intent_distribution),
                flow_analysis: {
                    ...simulation.analysis.flow_analysis,
                    flows_triggered: Object.fromEntries(simulation.analysis.flow_analysis.flows_triggered),
                    flow_completion_rates: Object.fromEntries(simulation.analysis.flow_analysis.flow_completion_rates)
                }
            };

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('❌ Error getting simulation analysis:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching analysis'
            });
        }
    }

    /**
     * POST /api/simulation/:id/pause
     * Pauzuje symulację
     */
    public async pauseSimulation(req: Request, res: Response): Promise<void> {
        try {
            const simulationId = req.params.id;

            const success = this.simulationManager.pauseSimulation(simulationId);
            if (!success) {
                res.status(400).json({
                    success: false,
                    error: 'Cannot pause simulation (not found or not running)'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Simulation paused successfully'
            });

        } catch (error) {
            console.error('❌ Error pausing simulation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while pausing simulation'
            });
        }
    }

    /**
     * POST /api/simulation/:id/resume
     * Wznawia symulację
     */
    public async resumeSimulation(req: Request, res: Response): Promise<void> {
        try {
            const simulationId = req.params.id;
            const {config} = req.body;

            const defaultConfig: SimulationConfig = {
                auto_start: true,
                turn_timeout_seconds: 30,
                max_message_length: 1000,
                enable_real_time_analysis: true,
                save_to_database: true,
                export_format: 'json',
                analysis_depth: 'detailed'
            };

            const success = await this.simulationManager.resumeSimulation(
                simulationId,
                config || defaultConfig
            );

            if (!success) {
                res.status(400).json({
                    success: false,
                    error: 'Cannot resume simulation (not found or not paused)'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Simulation resumed successfully'
            });

        } catch (error) {
            console.error('❌ Error resuming simulation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while resuming simulation'
            });
        }
    }

    /**
     * GET /api/simulation/active
     * Pobiera wszystkie aktywne symulacje
     */
    public async getActiveSimulations(req: Request, res: Response): Promise<void> {
        try {
            const simulations = this.simulationManager.getAllActiveSimulations();

            const simulationSummaries = simulations.map(sim => ({
                id: sim.id,
                name: sim.scenario.name,
                status: sim.status,
                participants_count: sim.scenario.participants.length,
                current_turn: sim.current_turn,
                max_turns: sim.max_turns,
                start_time: sim.start_time,
                quality_score: sim.analysis.conversation_quality_score,
                progress_percentage: Math.round((sim.current_turn / sim.max_turns) * 100)
            }));

            res.json({
                success: true,
                data: {
                    simulations: simulationSummaries,
                    total_count: simulationSummaries.length
                }
            });

        } catch (error) {
            console.error('❌ Error getting active simulations:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching active simulations'
            });
        }
    }

    /**
     * GET /api/simulation/templates/scenarios
     * Pobiera gotowe szablony scenariuszy
     */
    public async getScenarioTemplates(req: Request, res: Response): Promise<void> {
        try {
            // Ładuj pełne scenariusze z pliku JSON zamiast uproszczonych szablonów
            const fullScenarios = await this.loadFullScenarioTemplates();

            res.json({
                success: true,
                data: {
                    templates: fullScenarios,
                    total_count: fullScenarios.length
                }
            });

        } catch (error) {
            console.error('❌ Error getting scenario templates:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching templates'
            });
        }
    }

    /**
     * GET /api/simulation/templates/personas
     * Pobiera gotowe szablony person
     */
    public async getPersonaTemplates(req: Request, res: Response): Promise<void> {
        try {
            const personas = this.getDefaultPersonaTemplates();

            res.json({
                success: true,
                data: {
                    personas,
                    total_count: personas.length
                }
            });

        } catch (error) {
            console.error('❌ Error getting persona templates:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching persona templates'
            });
        }
    }

    /**
     * POST /api/simulation/export/:id
     * Eksportuje symulację do pliku
     */
    public async exportSimulation(req: Request, res: Response): Promise<void> {
        try {
            const simulationId = req.params.id;
            const {format = 'json'} = req.body;

            const simulation = this.simulationManager.getSimulation(simulationId);
            if (!simulation) {
                res.status(404).json({
                    success: false,
                    error: 'Simulation not found'
                });
                return;
            }

            let exportData: any;
            let contentType: string;
            let filename: string;

            switch (format) {
                case 'json':
                    exportData = JSON.stringify(simulation, null, 2);
                    contentType = 'application/json';
                    filename = `simulation_${simulationId}.json`;
                    break;

                case 'csv':
                    exportData = this.convertSimulationToCSV(simulation);
                    contentType = 'text/csv';
                    filename = `simulation_${simulationId}.csv`;
                    break;

                default:
                    res.status(400).json({
                        success: false,
                        error: 'Unsupported export format'
                    });
                    return;
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportData);

        } catch (error) {
            console.error('❌ Error exporting simulation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while exporting simulation'
            });
        }
    }

    // ============ PRIVATE HELPER METHODS ============

    /**
     * Waliduje scenariusz symulacji
     */
    private validateScenario(scenario: any): string | null {
        if (!scenario.name || typeof scenario.name !== 'string') {
            return 'Scenario name is required and must be a string';
        }

        if (!scenario.participants || !Array.isArray(scenario.participants) || scenario.participants.length < 2) {
            return 'At least 2 participants are required';
        }

        if (!scenario.duration_minutes || scenario.duration_minutes < 1) {
            return 'Duration must be at least 1 minute';
        }

        for (const participant of scenario.participants) {
            if (!participant.avatarType || !participant.role || !participant.persona) {
                return 'Each participant must have avatarType, role, and persona';
            }
        }

        return null;
    }

    /**
     * Konwertuje symulację do formatu CSV
     */
    private convertSimulationToCSV(simulation: SimulationExecution): string {
        const headers = [
            'Timestamp',
            'Participant ID',
            'Participant Name',
            'Role',
            'Message',
            'Intent',
            'Flow Step',
            'Response Time (ms)'
        ];

        const rows = simulation.messages.map(message => {
            const participant = simulation.scenario.participants.find(p => p.id === message.participant_id);
            return [
                new Date(message.timestamp).toISOString(),
                message.participant_id,
                participant?.persona.name || 'Unknown',
                participant?.role || 'unknown',
                `"${message.content.replace(/"/g, '""')}"`, // Escape quotes
                message.intent,
                message.flow_step || '',
                message.response_time_ms.toString()
            ];
        });

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * Ładuje pełne scenariusze z pliku JSON
     */
    private async loadFullScenarioTemplates(): Promise<SimulationScenario[]> {
        try {
            const scenariosPath = path.resolve(__dirname, '../config/simulation-scenarios.json');

            if (!fs.existsSync(scenariosPath)) {
                console.warn('⚠️ Scenarios file not found, using default templates');
                return this.getDefaultScenarioTemplates() as SimulationScenario[];
            }

            const rawData = fs.readFileSync(scenariosPath, 'utf8');
            const scenariosData = JSON.parse(rawData);

            if (scenariosData.scenarios && Array.isArray(scenariosData.scenarios)) {
                console.log(`📋 Loaded ${scenariosData.scenarios.length} full scenarios from file`);
                return scenariosData.scenarios;
            } else {
                console.warn('⚠️ Invalid scenarios file format, using default templates');
                return this.getDefaultScenarioTemplates() as SimulationScenario[];
            }

        } catch (error) {
            console.error('❌ Error loading scenarios from file:', error);
            return this.getDefaultScenarioTemplates() as SimulationScenario[];
        }
    }

    /**
     * Zwraca domyślne szablony scenariuszy
     */
    private getDefaultScenarioTemplates(): Partial<SimulationScenario>[] {
        return [
            {
                name: 'Sprzedaż B2B - Usługi IT',
                description: 'Symulacja rozmowy handlowej dotyczącej usług IT dla firm',
                objective: 'Skuteczna prezentacja oferty i zamknięcie sprzedaży',
                duration_minutes: 15,
                context: {
                    industry: 'IT/Technologie',
                    situation: 'Pierwsze spotkanie z potencjalnym klientem',
                    success_metrics: ['Prezentacja oferty', 'Identyfikacja potrzeb', 'Umówienie kolejnego spotkania']
                },
                conversation_starters: [
                    'Dzień dobry! Dziękuję za znalezienie czasu na spotkanie. Opowiem Panu o naszych usługach IT.',
                    'Witam! Chciałbym dowiedzieć się więcej o Państwa firmie i jak możemy pomóc w transformacji cyfrowej.'
                ],
                evaluation_criteria: ['Jakość prezentacji', 'Odpowiedzi na pytania', 'Budowanie relacji']
            },
            {
                name: 'Szkolenie - Zarządzanie zespołem',
                description: 'Sesja szkoleniowa z zakresu zarządzania zespołem',
                objective: 'Przekazanie wiedzy o technikach zarządzania',
                duration_minutes: 20,
                context: {
                    industry: 'Edukacja/HR',
                    situation: 'Szkolenie dla nowego menedżera',
                    success_metrics: ['Zrozumienie teorii', 'Praktyczne przykłady', 'Plan rozwoju']
                },
                conversation_starters: [
                    'Witam na szkoleniu z zarządzania zespołem. Na czym chciałby się Pan skupić?',
                    'Dzień dobry! Jakie ma Pan doświadczenie w zarządzaniu ludźmi?'
                ],
                evaluation_criteria: ['Przekaz wiedzy', 'Zaangażowanie ucznia', 'Praktyczne zastosowanie']
            },
            {
                name: 'Networking - Nawiązywanie kontaktów',
                description: 'Symulacja spotkania networkingowego',
                objective: 'Nawiązanie wartościowych kontaktów biznesowych',
                duration_minutes: 10,
                context: {
                    industry: 'Różne',
                    situation: 'Konferencja branżowa',
                    success_metrics: ['Wymiana kontaktów', 'Identyfikacja synergii', 'Plany współpracy']
                },
                conversation_starters: [
                    'Witam! Miło Pana poznać. Czym się Pan zajmuje?',
                    'Dzień dobry! Interesująca prezentacja. W jakiej branży Pan działa?'
                ],
                evaluation_criteria: ['Naturalność rozmowy', 'Wzajemne korzyści', 'Konkretne ustalenia']
            }
        ];
    }

    /**
     * Zwraca domyślne szablony person
     */
    private getDefaultPersonaTemplates(): SimulationPersona[] {
        return [
            {
                name: 'Jan Kowalski - CEO startupu',
                background: 'Założyciel 5-osobowego startupu technologicznego',
                goals: ['Zwiększenie efektywności zespołu', 'Skalowanie biznesu', 'Pozyskanie inwestorów'],
                challenges: ['Ograniczony budżet', 'Brak doświadczenia w zarządzaniu', 'Konkurencja'],
                personality_traits: ['Ambitny', 'Otwarty na innowacje', 'Niecierpliwy'],
                communication_style: 'Bezpośredni, konkretny, zorientowany na rezultaty',
                expertise_level: 'intermediate',
                industry: 'Technologie',
                company_size: 'Startup (5-10 osób)',
                budget_range: '10k-50k PLN',
                decision_making_style: 'Szybki, intuicyjny'
            },
            {
                name: 'Anna Nowak - Dyrektor HR',
                background: 'Doświadczony dyrektor HR w korporacji 500+ osób',
                goals: ['Rozwój kompetencji zespołu', 'Poprawa kultury organizacyjnej', 'Retention talentów'],
                challenges: ['Duża rotacja', 'Remote work challenges', 'Budżet na szkolenia'],
                personality_traits: ['Analityczna', 'Empatyczna', 'Systematyczna'],
                communication_style: 'Strukturalny, oparty na danych, wspierający',
                expertise_level: 'expert',
                industry: 'Usługi finansowe',
                company_size: 'Duża korporacja (500+ osób)',
                budget_range: '100k-500k PLN',
                decision_making_style: 'Przemyślany, konsultacyjny'
            },
            {
                name: 'Michał Wiśniewski - Właściciel MŚP',
                background: 'Właściciel rodzinnej firmy produkcyjnej działającej od 15 lat',
                goals: ['Modernizacja procesów', 'Zwiększenie marży', 'Przygotowanie do sukcesji'],
                challenges: ['Opór wobec zmian', 'Ograniczone zasoby IT', 'Konkurencja cenowa'],
                personality_traits: ['Konserwatywny', 'Praktyczny', 'Sceptyczny wobec nowości'],
                communication_style: 'Ostrożny, potrzebuje dowodów, wartości tradycyjne',
                expertise_level: 'intermediate',
                industry: 'Produkcja',
                company_size: 'Średnia firma (50-250 osób)',
                budget_range: '50k-200k PLN',
                decision_making_style: 'Powolny, analityczny'
            }
        ];
    }

    // ============ SIMULATION CHAT MODE ENDPOINTS ============

    /**
     * POST /api/simulation/start
     * Rozpoczyna sesję chat simulation z reactive avatar
     */
    public async startChatSimulation(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SimulationController.startChatSimulation');
        timer.start();

        try {
            const {avatar_id, user_role, user_company} = req.body;

            if (!avatar_id || !user_role) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: avatar_id, user_role'
                });
                timer.stop();
                return;
            }

            // Validate avatar_id
            if (!['client', 'student'].includes(avatar_id)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid avatar_id. Must be "client" or "student"'
                });
                timer.stop();
                return;
            }

            // Validate user_role  
            if (!['trainer', 'seller'].includes(user_role)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid user_role. Must be "trainer" or "seller"'
                });
                timer.stop();
                return;
            }

            // Generate session ID
            const sessionId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Store session data
            const sessionData = {
                session_id: sessionId,
                avatar_id,
                user_role,
                user_company: user_company || 'aureus',
                started_at: new Date(),
                messages: [],
                status: 'active'
            };

            this.chatSessions.set(sessionId, sessionData);

            timer.stop();
            console.log(`🎮 Started chat simulation: ${sessionId} (${user_role} vs ${avatar_id})`);

            res.json({
                success: true,
                session_id: sessionId,
                avatar_id,
                user_role,
                message: 'Simulation chat session started successfully'
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error starting chat simulation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start simulation session'
            });
        }
    }

    /**
     * POST /api/simulation/message
     * Wysyła wiadomość do reactive avatar i otrzymuje odpowiedź
     */
    public async sendChatMessage(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SimulationController.sendChatMessage');
        timer.start();

        try {
            const {session_id, message} = req.body;

            if (!session_id || !message) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: session_id, message'
                });
                timer.stop();
                return;
            }

            // Get session data
            const sessionData = this.chatSessions.get(session_id);
            if (!sessionData) {
                res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
                timer.stop();
                return;
            }

            // Store user message
            const userMessage = {
                id: `msg_${Date.now()}_user`,
                sender: sessionData.user_role,
                content: message,
                timestamp: new Date(),
                is_user: true
            };
            sessionData.messages.push(userMessage);

            // Generate AI response using SimulationManager
            const avatarResponse = await this.simulationManager.generateReactiveResponse(
                sessionData.avatar_id,
                message,
                sessionData.user_role,
                sessionData.messages,
                sessionData.user_company
            );

            // Store avatar response
            const avatarMessage = {
                id: `msg_${Date.now()}_avatar`,
                sender: sessionData.avatar_id,
                content: avatarResponse,
                timestamp: new Date(),
                is_user: false
            };
            sessionData.messages.push(avatarMessage);

            // Update session
            this.chatSessions.set(session_id, sessionData);

            timer.stop();
            console.log(`💬 Processed message in session: ${session_id}`);

            res.json({
                success: true,
                response: avatarResponse,
                message_id: avatarMessage.id,
                session_id
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error processing chat message:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process message'
            });
        }
    }

    /**
     * GET /api/simulation/session/:sessionId
     * Pobiera dane sesji chat simulation
     */
    public async getChatSession(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SimulationController.getChatSession');
        timer.start();

        try {
            const {sessionId} = req.params;

            const sessionData = this.chatSessions.get(sessionId);
            if (!sessionData) {
                res.status(404).json({
                    success: false,
                    error: 'Session not found'
                });
                timer.stop();
                return;
            }

            timer.stop();

            res.json({
                success: true,
                session: sessionData
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error getting chat session:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get session data'
            });
        }
    }
}

export default SimulationController;
