import fs from 'fs';
import path from 'path';
import { 
    PromptContext, 
    PromptTemplate, 
    BusinessAvatar, 
    MindStateStack, 
    SystemPrompt, 
    UserPrompt 
} from '../models/types';
import { ExecutionTimerService } from './execution-timer.service';

/**
 * PromptBuilder - buduje prompty na podstawie intencji, kontekstu i szablonów
 * Implementuje logikę zamiany placeholderów na rzeczywiste dane
 */
class PromptBuilder {
    private static instance: PromptBuilder;
    private templates: PromptTemplate[] = [];
    private defaultSystemPrompt: PromptTemplate | null = null;
    private initialized = false;

    private constructor() {}

    public static getInstance(): PromptBuilder {
        if (!PromptBuilder.instance) {
            PromptBuilder.instance = new PromptBuilder();
        }
        return PromptBuilder.instance;
    }

    /**
     * Inicjalizuje prompt builder - ładuje szablony
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const filePath = path.resolve(__dirname, '../config/prompt-templates.json');
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            this.templates = data.templates;
            this.defaultSystemPrompt = this.templates.find(t => t.id === 'system_prompt_default') || null;
            this.initialized = true;
            
            console.log(`✅ PromptBuilder initialized with ${this.templates.length} prompt templates`);
            if (this.defaultSystemPrompt) {
                console.log('✅ Default system prompt loaded.');
            }
        } catch (error) {
            console.error('❌ Failed to initialize PromptBuilder:', error);
            throw error;
        }
    }

    /**
     * Buduje kompletny prompt na podstawie kontekstu
     */
    public async buildPrompt(context: PromptContext): Promise<{ systemPrompt: SystemPrompt; userPrompt: UserPrompt }> {
        if (!this.initialized) {
            await this.initialize();
        }
        
        const timer = new ExecutionTimerService('buildPrompt in PromptBuilder');
        timer.start();

        // Najpierw sprawdź czy istnieje template dla aktualnego kroku flow
        let template: PromptTemplate | null = null;
        if (context.current_flow_step) {
            template = this.findTemplateForFlowStep(context.current_flow_step);
        }
        
        // Jeśli nie znaleziono template'a dla kroku, użyj template'a dla intencji
        if (!template) {
            template = this.findTemplate(context.current_intent);
        }
        
        if (!template) {
            timer.stop();
            throw new Error(`No template found for intent: ${context.current_intent} or flow step: ${context.current_flow_step}`);
        }

        let systemPrompt = this.buildSystemPrompt(template, context);
        const userPrompt = this.buildUserPrompt(template, context);

        // Dodaj domyślny system prompt, jeśli istnieje
        if (this.defaultSystemPrompt) {
            const defaultSystemText = this.replacePlaceholders(this.defaultSystemPrompt.system_prompt, context);
            systemPrompt.content = `${defaultSystemText}\n\n${systemPrompt.content}`;
        }
        
        timer.stop();
        return { systemPrompt, userPrompt };
    }

    /**
     * Znajduje szablon dla intencji
     */
    private findTemplate(intent: string): PromptTemplate | null {
        return this.templates.find(template => template.intent === intent) || null;
    }

    /**
     * Znajduje szablon dla aktualnego kroku flow
     */
    private findTemplateForFlowStep(flowStep: string): PromptTemplate | null {
        // Mapowanie kroków flow na template'y
        const flowStepTemplateMap: Record<string, string> = {
            'meeting_arrangement': 'meeting_arrangement',
            'meeting_confirmation': 'meeting_confirmation',
            'express_interest': 'express_interest',
            'ask_about_offer': 'ask_about_offer',
            'evaluate_fit': 'evaluate_fit',
            'discuss_terms': 'discuss_terms',
            'purchase_decision': 'purchase_decision'
        };
        
        const templateIntent = flowStepTemplateMap[flowStep];
        if (templateIntent) {
            return this.templates.find(template => template.intent === templateIntent) || null;
        }
        
        return null;
    }

    /**
     * Buduje system prompt
     */
    private buildSystemPrompt(template: PromptTemplate, context: PromptContext): SystemPrompt {
        let systemPrompt = template.system_prompt;

        // Zamień placeholdery
        systemPrompt = this.replacePlaceholders(systemPrompt, context);

        return {
            role: 'system',
            content: systemPrompt
        };
    }

    /**
     * Buduje user prompt
     */
    private buildUserPrompt(template: PromptTemplate, context: PromptContext): UserPrompt {
        let userPrompt = template.user_prompt_template;

        // Zamień placeholdery
        userPrompt = this.replacePlaceholders(userPrompt, context);

        // Dodaj kontekst
        userPrompt = this.addContextToPrompt(userPrompt, context);

        return {
            role: 'user',
            content: userPrompt
        };
    }

    /**
     * Zamienia placeholdery w tekście
     */
    private replacePlaceholders(text: string, context: PromptContext): string {
        let result = text;

        // Podstawowe placeholdery
        result = result.replace(/\{\{user_message\}\}/g, context.user_message);
        result = result.replace(/\{\{current_intent\}\}/g, context.current_intent);
        result = result.replace(/\{\{current_flow\}\}/g, context.current_flow || '');
        result = result.replace(/\{\{current_flow_step\}\}/g, context.current_flow_step || '');

        // Avatar placeholdery
        if (context.avatar) {
            result = result.replace(/\{\{npc_persona\.firstName\}\}/g, context.avatar.firstName || '');
            result = result.replace(/\{\{npc_persona\.lastName\}\}/g, context.avatar.lastName || '');
            result = result.replace(/\{\{npc_company\.name\}\}/g, context.avatar.company?.name || '');
            result = result.replace(/\{\{npc_company\.specialization\}\}/g, context.avatar.company?.specializations?.join(', ') || '');
            result = result.replace(/\{\{npc_company\.services\}\}/g, context.avatar.company?.offer?.join(', ') || '');
            result = result.replace(/\{\{npc_company\.mission\}\}/g, context.avatar.company?.mission || '');
        }

        // User company placeholdery (domyślne wartości jeśli nie ma danych)
        result = result.replace(/\{\{user_company\.name\}\}/g, 'Twoja firma');
        result = result.replace(/\{\{user_company\.industry\}\}/g, 'Twoja branża');
        result = result.replace(/\{\{user_company\.needs\}\}/g, 'potrzeby biznesowe');
        result = result.replace(/\{\{user_company\.strategic_goals\}\}/g, 'cele strategiczne');

        // Memory placeholdery
        const memoryShort = this.getMemoryShort(context.mind_state);
        const memoryLong = this.getMemoryLong(context.mind_state);
        
        result = result.replace(/\{\{memory_short\}\}/g, memoryShort);
        result = result.replace(/\{\{memory_long\}\}/g, memoryLong);

        // Session context placeholdery
        if (context.session_context) {
            Object.keys(context.session_context).forEach(key => {
                const placeholder = `{{${key}}}`;
                const value = context.session_context![key];
                result = result.replace(new RegExp(placeholder, 'g'), String(value));
            });
        }

        // Flow context placeholdery (np. extracted_email)
        if (context.flow_context) {
            Object.keys(context.flow_context).forEach(key => {
                const placeholder = `{{${key}}}`;
                const value = context.flow_context![key];
                result = result.replace(new RegExp(placeholder, 'g'), String(value));
            });
        }

        return result;
    }

    /**
     * Dodaje kontekst do prompta
     */
    private addContextToPrompt(prompt: string, context: PromptContext): string {
        let contextualPrompt = prompt;

        // Dodaj kontekst RAG jeśli istnieje
        if (context.rag_context && context.rag_context.length > 0) {
            contextualPrompt += '\n\n### KONTEKST Z BAZY WIEDZY ###\n';
            contextualPrompt += context.rag_context;
        }

        // Dodaj historię rozmowy jeśli istnieje
        if (context.chat_history && context.chat_history.length > 0) {
            contextualPrompt += '\n\n### HISTORIA ROZMOWY ###\n';
            contextualPrompt += context.chat_history;
        }

        // Dodaj kontekst MindState
        if (context.mind_state && context.mind_state.stack.length > 0) {
            const recentIntents = context.mind_state.stack
                .slice(-3)
                .map(item => `${item.intent} (${new Date(item.timestamp).toLocaleTimeString()})`)
                .join(', ');
            
            contextualPrompt += '\n\n### OSTATNIE INTENCJE ###\n';
            contextualPrompt += `Ostatnie intencje: ${recentIntents}`;
        }

        return contextualPrompt;
    }

    /**
     * Pobiera pamięć krótkoterminową
     */
    private getMemoryShort(mindState: MindStateStack): string {
        if (!mindState || mindState.stack.length === 0) {
            return 'Brak historii rozmowy';
        }

        const lastItem = mindState.stack[mindState.stack.length - 1];
        const timeAgo = Math.floor((Date.now() - lastItem.timestamp) / 1000);
        
        return `Ostatnia intencja: ${lastItem.intent} (${timeAgo}s temu)`;
    }

    /**
     * Pobiera pamięć długoterminową
     */
    private getMemoryLong(mindState: MindStateStack): string {
        if (!mindState || mindState.stack.length === 0) {
            return 'Brak długoterminowej historii';
        }

        const completedIntents = Object.keys(mindState.fulfilled_intents)
            .filter(intent => mindState.fulfilled_intents[intent].fulfilled)
            .join(', ');

        if (completedIntents.length === 0) {
            return 'Brak zrealizowanych intencji';
        }

        return `Zrealizowane intencje: ${completedIntents}`;
    }

    /**
     * Buduje prompt dla konkretnej intencji
     */
    public async buildPromptForIntent(
        intent: string,
        userMessage: string,
        avatar: BusinessAvatar,
        mindState: MindStateStack,
        ragContext?: string,
        chatHistory?: string,
        flowContext?: Record<string, any>
    ): Promise<{ systemPrompt: SystemPrompt; userPrompt: UserPrompt }> {
        const context: PromptContext = {
            user_message: userMessage,
            chat_history: chatHistory || '',
            mind_state: mindState,
            avatar,
            current_intent: intent,
            current_flow: mindState.current_flow,
            current_flow_step: mindState.current_flow_step,
            rag_context: ragContext,
            flow_context: flowContext
        };

        return await this.buildPrompt(context);
    }

    /**
     * Pobiera szablon dla intencji
     */
    public getTemplate(intent: string): PromptTemplate | null {
        return this.findTemplate(intent);
    }

    /**
     * Pobiera wszystkie szablony
     */
    public getAllTemplates(): PromptTemplate[] {
        return [...this.templates];
    }

    /**
     * Waliduje czy szablon ma wszystkie wymagane placeholdery
     */
    public validateTemplate(template: PromptTemplate, context: PromptContext): {
        valid: boolean;
        missingVariables: string[];
    } {
        const missingVariables: string[] = [];
        
        // Sprawdź czy wszystkie zmienne z template.variables są dostępne w kontekście
        for (const variable of template.variables) {
            if (!this.hasVariable(variable, context)) {
                missingVariables.push(variable);
            }
        }

        return {
            valid: missingVariables.length === 0,
            missingVariables
        };
    }

    /**
     * Sprawdza czy zmienna jest dostępna w kontekście
     */
    private hasVariable(variable: string, context: PromptContext): boolean {
        switch (variable) {
            case 'user_message':
                return !!context.user_message;
            case 'current_intent':
                return !!context.current_intent;
            case 'npc_company.name':
                return !!context.avatar?.company?.name;
            case 'npc_company.specialization':
                return !!context.avatar?.company?.specializations;
            case 'memory_short':
            case 'memory_long':
                return !!context.mind_state;
            case 'rag_context':
                return !!context.rag_context;
            case 'chat_history':
                return !!context.chat_history;
            default:
                return true; // Domyślnie przyjmij, że zmienna jest dostępna
        }
    }
}

export default PromptBuilder; 