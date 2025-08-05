import fs from 'fs';
import path from 'path';
import { 
    FlowDefinition, 
    FlowStep, 
    FlowExecution, 
    FlowStepExecution, 
    MindStateStack, 
    BusinessAvatar 
} from '../models/types';
import MemoryManager from './memory-manager.service';
import { ExecutionTimerService } from './execution-timer.service';

/**
 * FlowManager - zarządza przepływem rozmowy przez zdefiniowane flows
 * Implementuje logikę przechodzenia między krokami i walidacji postępu
 */
class FlowManager {
    private static instance: FlowManager;
    private flowDefinitions: FlowDefinition[] = [];
    private activeFlows: Map<string, FlowExecution> = new Map();
    private initialized = false;

    private constructor() {}

    public static getInstance(): FlowManager {
        if (!FlowManager.instance) {
            FlowManager.instance = new FlowManager();
        }
        return FlowManager.instance;
    }

    /**
     * Checks if the service is initialized
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Initializes the flow manager - loads flow definitions
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const filePath = path.resolve(__dirname, '../config/flow-definitions.json');
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            this.flowDefinitions = data.flows;
            this.initialized = true;
            
            console.log(`✅ FlowManager initialized with ${this.flowDefinitions.length} flow definitions`);
        } catch (error) {
            console.error('❌ Failed to initialize FlowManager:', error);
            throw error;
        }
    }

    /**
     * Ładuje definicje flow dla konkretnego typu avatara
     */
    public async loadFlowDefinitionsForAvatar(avatarType: string): Promise<void> {
        try {
            let fileName = 'flow-definitions.json'; // Default networker
            
            if (avatarType === 'trainer') {
                fileName = 'training-flow-definitions.json';
            }
            
            const filePath = path.resolve(__dirname, `../config/${fileName}`);
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            this.flowDefinitions = data.flows;
            this.initialized = true; // Mark as initialized after loading avatar-specific definitions
            
            console.log(`✅ FlowManager loaded ${this.flowDefinitions.length} flow definitions for avatar type: ${avatarType}`);
        } catch (error) {
            console.error(`❌ Failed to load flow definitions for avatar type ${avatarType}:`, error);
            // Fallback to default if training definitions not found
            if (avatarType === 'trainer') {
                console.log('🔄 Falling back to default flow definitions');
                await this.initialize();
            } else {
                throw error;
            }
        }
    }

    /**
     * Rozpoczyna nowy flow dla użytkownika
     */
    public async startFlow(
        sessionId: string,
        intentName: string,
        avatar: BusinessAvatar,
        userMessage: string
    ): Promise<FlowExecution | null> {
        if (!this.initialized) {
            await this.initialize();
        }

        const timer = new ExecutionTimerService('startFlow in FlowManager');
        timer.start();

        try {
            // Znajdź flow definition dla tej intencji
            const flowDef = this.findFlowForIntent(intentName);
            if (!flowDef) {
                console.log(`No flow definition found for intent: ${intentName}`);
                timer.stop();
                return null;
            }

            // Sprawdź czy flow już istnieje dla tej sesji
            const existingFlow = this.activeFlows.get(sessionId);
            if (existingFlow && existingFlow.flow_id === flowDef.id) {
                console.log(`Flow ${flowDef.id} already active for session ${sessionId}`);
                timer.stop();
                return existingFlow;
            }

            // Utwórz nową instancję flow
            const flowExecution: FlowExecution = {
                id: `${sessionId}-${flowDef.id}-${Date.now()}`,
                session_id: sessionId,
                flow_id: flowDef.id,
                flow_name: flowDef.name,
                current_step: flowDef.steps[0].id,
                completed_steps: [],
                step_executions: [],
                start_time: Date.now(),
                last_activity: Date.now(),
                status: 'active',
                context: {
                    user_message: userMessage,
                    avatar: avatar,
                    intent: intentName
                }
            };

            // Zapisz flow w pamięci
            this.activeFlows.set(sessionId, flowExecution);

            // Rozpocznij pierwszy krok
            await this.executeStep(sessionId, flowDef.steps[0]);

            timer.stop();
            console.log(`✅ Started flow ${flowDef.id} for session ${sessionId}`);
            
            return flowExecution;
        } catch (error) {
            timer.stop();
            console.error('Error starting flow:', error);
            return null;
        }
    }

    /**
     * Przechodzi do następnego kroku w flow
     */
    public async progressFlow(
        sessionId: string,
        userMessage: string,
        completedStepId?: string
    ): Promise<FlowExecution | null> {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return null;
        }

        const flowDef = this.flowDefinitions.find(f => f.id === flow.flow_id);
        if (!flowDef) {
            return null;
        }

        try {
            // Jeśli podano completedStepId, oznacz krok jako zakończony
            if (completedStepId) {
                await this.markStepCompleted(sessionId, completedStepId);
            }

            // Znajdź następny krok
            const nextStep = this.getNextStep(flow, flowDef);
            if (!nextStep) {
                // Flow zakończony
                await this.completeFlow(sessionId);
                return flow;
            }

            // Wykonaj następny krok
            flow.current_step = nextStep.id;
            flow.last_activity = Date.now();
            flow.context.user_message = userMessage;

            await this.executeStep(sessionId, nextStep);

            console.log(`✅ Progressed flow ${flow.flow_id} to step ${nextStep.id}`);
            return flow;
        } catch (error) {
            console.error('Error progressing flow:', error);
            return null;
        }
    }

    /**
     * Sprawdza czy flow powinien być kontynuowany
     */
    public async shouldContinueFlow(sessionId: string, intent: string): Promise<boolean> {
        const flow = this.activeFlows.get(sessionId);
        if (!flow || flow.status !== 'active') {
            return false;
        }

        const flowDef = this.flowDefinitions.find(f => f.id === flow.flow_id);
        if (!flowDef) {
            return false;
        }

        // Sprawdź czy nowa intencja pasuje do aktualnego flow
        if (flowDef.entry_intents.includes(intent)) {
            return true;
        }

        // Sprawdź czy flow nie przekroczył max_duration
        const elapsed = Date.now() - flow.start_time;
        if (elapsed > flowDef.max_duration * 1000) {
            await this.timeoutFlow(sessionId);
            return false;
        }

        return true;
    }

    /**
     * Pobiera aktualny flow dla sesji
     */
    public getActiveFlow(sessionId: string): FlowExecution | null {
        return this.activeFlows.get(sessionId) || null;
    }

    /**
     * Kończy flow
     */
    public async completeFlow(sessionId: string): Promise<void> {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return;
        }

        flow.status = 'completed';
        flow.end_time = Date.now();

        // Aktualizuj MindState
        const memoryManager = MemoryManager.getInstance();
        await memoryManager.updateFlowStatus(sessionId, flow.flow_id, 'completed');

        console.log(`✅ Completed flow ${flow.flow_id} for session ${sessionId}`);
    }

    /**
     * Kończy flow z timeout
     */
    public async timeoutFlow(sessionId: string): Promise<void> {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return;
        }

        flow.status = 'timeout';
        flow.end_time = Date.now();

        // Aktualizuj MindState
        const memoryManager = MemoryManager.getInstance();
        await memoryManager.updateFlowStatus(sessionId, flow.flow_id, 'timeout');

        console.log(`⏰ Flow ${flow.flow_id} timed out for session ${sessionId}`);
    }

    /**
     * Anuluje flow
     */
    public async cancelFlow(sessionId: string): Promise<void> {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return;
        }

        flow.status = 'cancelled';
        flow.end_time = Date.now();

        // Usuń z aktywnych flows
        this.activeFlows.delete(sessionId);

        console.log(`❌ Cancelled flow ${flow.flow_id} for session ${sessionId}`);
    }

    /**
     * Sprawdza czy flow jest zakończony
     */
    public isFlowCompleted(sessionId: string): boolean {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return false;
        }

        const flowDef = this.flowDefinitions.find(f => f.id === flow.flow_id);
        if (!flowDef) {
            return false;
        }

        // Sprawdź czy wszystkie wymagane kroki są zakończone
        const requiredSteps = flowDef.success_criteria;
        return requiredSteps.every(stepId => flow.completed_steps.includes(stepId));
    }

    /**
     * Pobiera postęp flow (% zakończenia)
     */
    public getFlowProgress(sessionId: string): number {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return 0;
        }

        const flowDef = this.flowDefinitions.find(f => f.id === flow.flow_id);
        if (!flowDef) {
            return 0;
        }

        const totalSteps = flowDef.success_criteria.length;
        const completedSteps = flow.completed_steps.filter(stepId => 
            flowDef.success_criteria.includes(stepId)
        ).length;

        return Math.round((completedSteps / totalSteps) * 100);
    }

    /**
     * Gets all flow definitions
     */
    public getAllFlowDefinitions(): FlowDefinition[] {
        return this.flowDefinitions;
    }

    // ============ PRIVATE METHODS ============

    /**
     * Znajduje flow definition dla intencji
     */
    private findFlowForIntent(intentName: string): FlowDefinition | null {
        // Sortuj flows według priorytetu (wyższy = ważniejszy)
        const sortedFlows = [...this.flowDefinitions].sort((a, b) => b.priority - a.priority);
        
        for (const flow of sortedFlows) {
            if (flow.entry_intents.includes(intentName)) {
                return flow;
            }
        }
        
        return null;
    }

    /**
     * Wykonuje krok flow
     */
    private async executeStep(sessionId: string, step: FlowStep): Promise<void> {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return;
        }

        const stepExecution: FlowStepExecution = {
            step_id: step.id,
            step_name: step.name,
            start_time: Date.now(),
            status: 'active'
        };

        flow.step_executions.push(stepExecution);
        
        // Aktualizuj MindState z aktualnym krokiem flow
        const memoryManager = MemoryManager.getInstance();
        await memoryManager.updateCurrentFlow(sessionId, flow.flow_id, step.id);
        
        console.log(`🚀 Executing step ${step.id} (${step.name}) for flow ${flow.flow_id}`);
    }

    /**
     * Oznacza krok jako zakończony
     */
    private async markStepCompleted(sessionId: string, stepId: string): Promise<void> {
        const flow = this.activeFlows.get(sessionId);
        if (!flow) {
            return;
        }

        // Dodaj do zakończonych kroków
        if (!flow.completed_steps.includes(stepId)) {
            flow.completed_steps.push(stepId);
        }

        // Zaktualizuj step execution
        const stepExecution = flow.step_executions.find(se => se.step_id === stepId);
        if (stepExecution) {
            stepExecution.status = 'completed';
            stepExecution.end_time = Date.now();
        }

        console.log(`✅ Marked step ${stepId} as completed for flow ${flow.flow_id}`);
    }

    /**
     * Pobiera następny krok w flow
     */
    private getNextStep(flow: FlowExecution, flowDef: FlowDefinition): FlowStep | null {
        const currentStep = flowDef.steps.find(s => s.id === flow.current_step);
        if (!currentStep) {
            return null;
        }

        // Sprawdź czy aktualny krok ma zdefiniowane następne kroki
        if (!currentStep.next_steps || currentStep.next_steps.length === 0) {
            return null;
        }

        // Jeśli next_steps zawiera "completed", flow jest zakończony
        if (currentStep.next_steps.includes('completed')) {
            return null;
        }

        // Weź pierwszy dostępny następny krok
        const nextStepId = currentStep.next_steps[0];
        return flowDef.steps.find(s => s.id === nextStepId) || null;
    }

    /**
     * Pobiera flow definition po ID
     */
    public getFlowDefinition(flowId: string): FlowDefinition | null {
        return this.flowDefinitions.find(f => f.id === flowId) || null;
    }

    /**
     * Czyści nieaktywne flows (cleanup)
     */
    public async cleanupInactiveFlows(): Promise<void> {
        const now = Date.now();
        const timeout = 30 * 60 * 1000; // 30 minut

        for (const [sessionId, flow] of this.activeFlows.entries()) {
            if (now - flow.last_activity > timeout) {
                await this.timeoutFlow(sessionId);
                this.activeFlows.delete(sessionId);
            }
        }
    }
}

export default FlowManager; 