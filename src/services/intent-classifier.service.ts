import fs from 'fs';
import path from 'path';
import openAIService from './openai.service';
import { IntentClassificationResult, IntentDefinition, MindStateStack, UserPrompt, CustomAvatar, CustomIntent } from '../models/types';
import { ExecutionTimerService } from './execution-timer.service';
import CustomAvatarService from './custom-avatar.service';

/**
 * IntentClassifier - klasyfikuje intencje użytkownika na podstawie jego wiadomości
 * Używa OpenAI do analizy tekstu i dopasowywania do zdefiniowanych intencji
 */
class IntentClassifier {
    private static instance: IntentClassifier;
    private intentDefinitions: IntentDefinition[] = [];
    private customIntentDefinitions: Map<string, IntentDefinition[]> = new Map(); // avatarId -> intents
    private initialized = false;
    private customAvatarService: CustomAvatarService;

    private constructor() {
        this.customAvatarService = CustomAvatarService.getInstance();
    }

    public static getInstance(): IntentClassifier {
        if (!IntentClassifier.instance) {
            IntentClassifier.instance = new IntentClassifier();
        }
        return IntentClassifier.instance;
    }

    /**
     * Inicjalizuje klasyfikator - ładuje definicje intencji
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const filePath = path.resolve(__dirname, '../config/intent-definitions.json');
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            this.intentDefinitions = data.intents;
            this.initialized = true;
            
            console.log(`✅ IntentClassifier initialized with ${this.intentDefinitions.length} intent definitions`);
        } catch (error) {
            console.error('❌ Failed to initialize IntentClassifier:', error);
            throw error;
        }
    }

    /**
     * Ładuje definicje intencji dla konkretnego typu avatara
     */
    public async loadIntentDefinitionsForAvatar(avatarType: string): Promise<void> {
        try {
            let fileName = 'intent-definitions.json'; // Default networker
            
            if (avatarType === 'trainer') {
                fileName = 'training-intent-definitions.json';
            }
            
            const filePath = path.resolve(__dirname, `../config/${fileName}`);
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            this.intentDefinitions = data.intents;
            this.initialized = true; // Mark as initialized after loading avatar-specific definitions
            
            console.log(`✅ IntentClassifier loaded ${this.intentDefinitions.length} intent definitions for avatar type: ${avatarType}`);
        } catch (error) {
            console.error(`❌ Failed to load intent definitions for avatar type ${avatarType}:`, error);
            // Fallback to default if training definitions not found
            if (avatarType === 'trainer') {
                console.log('🔄 Falling back to default intent definitions');
                await this.initialize();
            } else {
                throw error;
            }
        }
    }

    /**
     * Klasyfikuje intencję na podstawie wiadomości użytkownika
     */
    public async classifyIntent(
        userMessage: string,
        mindState?: MindStateStack,
        avatarId?: string
    ): Promise<IntentClassificationResult> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Jeśli to custom avatar, załaduj jego custom intents
        if (avatarId) {
            await this.loadCustomIntentsForAvatar(avatarId);
        }

        // Użyj OpenAI do klasyfikacji - bez keyword matching!
        const aiResult = await this.classifyWithOpenAI(userMessage, mindState, avatarId);
        return aiResult;
    }

    /**
     * Klasyfikuje intencję używając OpenAI
     */
    private async classifyWithOpenAI(
        userMessage: string,
        mindState?: MindStateStack,
        avatarId?: string
    ): Promise<IntentClassificationResult> {
        const timer = new ExecutionTimerService('classifyIntent in IntentClassifier');
        timer.start();
        
        console.log(`🔍 Intent classification for: "${userMessage}"`);

        try {
            // Sprawdź czy mamy API key
            const apiKey = openAIService.getClient().apiKey;
            console.log(`🔑 API Key check: ${apiKey ? 'Present' : 'Missing'} (${apiKey?.substring(0, 10)}...)`);
            
            if (!apiKey || apiKey === 'fake-api-key') {
                console.log('❌ No OpenAI API key. Using keyword matching fallback.');
                timer.stop();
                return this.fallbackToKeywordMatching(userMessage);
            }

            const systemPrompt = this.createClassificationPrompt(avatarId);
            const userPrompt = this.createUserPrompt(userMessage, mindState);
            
            console.log(`📤 Sending to OpenAI...`);

            // Bezpośrednie użycie OpenAI API
            const response = await openAIService.getClient().chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 20,
                temperature: 0.1
            });

            timer.stop();

            const content = response.choices[0].message.content;
            if (!content) {
                throw new Error('No response from OpenAI');
            }

            const intentName = content.trim();
            console.log(`✅ OpenAI classified intent: "${intentName}" for message: "${userMessage}"`);
            
            // Znajdź definicję intencji (w standard + custom intents)
            const allIntents = this.getIntentDefinitionsForAvatar(avatarId);
            const intentDef = allIntents.find(def => def.name === intentName);
            if (!intentDef) {
                console.warn(`⚠️ Unknown intent returned by OpenAI: ${intentName}, falling back to user_comments`);
                const fallbackDef = allIntents.find(def => def.name === 'user_comments');
                return {
                    intent: 'user_comments',
                    confidence: 0.3,
                    entities: {},
                    requires_flow: fallbackDef?.requires_flow || false,
                    flow_name: fallbackDef?.flow_name,
                    is_continuation: false
                };
            }

            return {
                intent: intentName,
                confidence: 0.9,
                entities: {},
                requires_flow: intentDef.requires_flow,
                flow_name: intentDef.flow_name,
                is_continuation: false
            };

        } catch (error) {
            timer.stop();
            console.error('❌ Error in OpenAI intent classification:', error);
            
            // Fallback do keyword matching
            return this.fallbackToKeywordMatching(userMessage);
        }
    }

    /**
     * Tworzy system prompt dla klasyfikacji intencji
     */
    private createClassificationPrompt(avatarId?: string): string {
        const allIntents = this.getIntentDefinitionsForAvatar(avatarId);
        console.log(`🔧 IntentClassifier: Creating prompt for ${allIntents.length} intents:`, allIntents.map(i => i.name).join(', '));
        let intentList = '';
        for (const intent of allIntents) {
            intentList += `Opis intencji: ${intent.description}\n`;

            const examples = intent.examples.map(example => `- ${example}`).join('\n');
            if (examples.length > 0) {
                intentList += `Przykłady:\n`;
                intentList += examples;
                intentList += '\n';
            }

            intentList += `Nazwa intencji: ${intent.name}\n\n`;
        }

        return `Zadanie: Na podstawie wypowiedzi użytkownika, wybierz najbardziej pasującą intencję spośród poniższych:

        ${intentList}
        Zwróć TYLKO nazwę intencji, nic więcej.`;
    }

    /**
     * Tworzy user prompt z kontekstem
     */
    private createUserPrompt(userMessage: string, mindState?: MindStateStack): string {
        let prompt = `Wiadomość do klasyfikacji: "${userMessage}"`;

        if (mindState && mindState.stack.length > 0) {
            const recentIntents = mindState.stack
                .slice(-3)
                .map(item => item.intent)
                .join(', ');
            
            prompt += `\n\nKontekst ostatnich intencji: ${recentIntents}`;
        }

        return prompt;
    }

    /**
     * Sprawdza czy intencja jest kontynuacją poprzedniej
     */
    public async isIntentContinuation(
        classifiedIntent: string,
        mindState: MindStateStack
    ): Promise<boolean> {
        if (mindState.stack.length === 0) {
            return false;
        }

        const lastItem = mindState.stack[mindState.stack.length - 1];
        const timeDiff = Date.now() - lastItem.timestamp;
        const isRecent = timeDiff < 30000; // 30 sekund

        return isRecent && lastItem.intent === classifiedIntent;
    }

    /**
     * Pobiera definicję intencji
     */
    public getIntentDefinition(intentName: string): IntentDefinition | null {
        return this.intentDefinitions.find(def => def.name === intentName) || null;
    }

    /**
     * Pobiera wszystkie definicje intencji
     */
    public getAllIntentDefinitions(): IntentDefinition[] {
        return [...this.intentDefinitions];
    }

    /**
     * Sprawdza czy intencja wymaga flow
     */
    public requiresFlow(intentName: string): boolean {
        const intentDef = this.getIntentDefinition(intentName);
        return intentDef?.requires_flow || false;
    }

    /**
     * Pobiera nazwę flow dla intencji
     */
    public getFlowName(intentName: string): string | undefined {
        const intentDef = this.getIntentDefinition(intentName);
        return intentDef?.flow_name;
    }

    /**
     * Fallback do keyword matching gdy nie ma API key lub wystąpił błąd
     */
    private fallbackToKeywordMatching(userMessage: string): IntentClassificationResult {
        console.log('🔄 Fallback to keyword matching for intent classification.');
        const keywordMatch = this.intentDefinitions.find(def => {
            const lowerCaseMessage = userMessage.toLowerCase();
            return def.keywords.some(keyword => lowerCaseMessage.includes(keyword.toLowerCase()));
        });

        if (keywordMatch) {
            console.log(`🎯 Keyword match found: "${keywordMatch.name}" for message: "${userMessage}"`);
            return {
                intent: keywordMatch.name,
                confidence: 0.9, // Wyższa pewność dla fallbacku
                entities: {},
                requires_flow: keywordMatch.requires_flow || false,
                flow_name: keywordMatch.flow_name,
                is_continuation: false
            };
        }

        // Domyślny fallback
        console.log(`🤷 No keyword match found, using general_questions fallback for: "${userMessage}"`);
        const fallbackDef = this.intentDefinitions.find(def => def.name === 'general_questions');
        return {
            intent: 'general_questions',
            confidence: 0.3,
            entities: {},
            requires_flow: fallbackDef?.requires_flow || false,
            flow_name: fallbackDef?.flow_name,
            is_continuation: false
        };
    }

    /**
     * Ładuje custom intents dla konkretnego custom avatara
     */
    public async loadCustomIntentsForAvatar(avatarId: string): Promise<void> {
        try {
            const customAvatar = await this.customAvatarService.getCustomAvatarById(avatarId);
            if (!customAvatar) {
                console.log(`❌ Custom avatar ${avatarId} not found`);
                return;
            }

            // Konwertuj CustomIntent[] na IntentDefinition[]
            const customIntentDefinitions: IntentDefinition[] = customAvatar.intents.map(customIntent => 
                this.convertCustomIntentToDefinition(customIntent)
            );

            // Zapisz custom intents dla tego avatara
            this.customIntentDefinitions.set(avatarId, customIntentDefinitions);
            
            console.log(`✅ IntentClassifier loaded ${customIntentDefinitions.length} custom intents for avatar: ${customAvatar.name} (${avatarId})`);
        } catch (error) {
            console.error(`❌ Failed to load custom intents for avatar ${avatarId}:`, error);
        }
    }

    /**
     * Pobiera wszystkie intent definitions dla danego avatara (standard + custom)
     */
    public getIntentDefinitionsForAvatar(avatarId?: string): IntentDefinition[] {
        // If custom avatar ID provided and has custom intents, combine with basic system intents
        if (avatarId && this.customIntentDefinitions.has(avatarId)) {
            const customIntents = this.customIntentDefinitions.get(avatarId)!;
            
            // Basic system intents that every avatar needs
            // const basicSystemIntents = ['greeting', 'email_provided', 'email_promise', 'conversation_redirect'];
            // const systemIntents = this.intentDefinitions.filter(intent =>
            //     basicSystemIntents.includes(intent.name)
            // );

          const systemIntents = this.intentDefinitions;
            const combinedIntents = [...systemIntents, ...customIntents];
            console.log(`🎯 IntentClassifier: Using ${systemIntents.length} system + ${customIntents.length} custom intents for avatar ${avatarId}`);
            return combinedIntents;
        }

        // Otherwise use all standard intents
        console.log(`🎯 IntentClassifier: Using ${this.intentDefinitions.length} standard intents`);
        return [...this.intentDefinitions];
    }

    /**
     * Konwertuje CustomIntent na IntentDefinition dla kompatybilności
     */
    private convertCustomIntentToDefinition(customIntent: CustomIntent): IntentDefinition {
        return {
            name: customIntent.name,
            description: customIntent.description,
            keywords: customIntent.keywords,
            examples: customIntent.examples,
            requires_flow: customIntent.requires_flow,
            flow_name: customIntent.flow_name,
            repeatable: customIntent.repeatable,
            priority: customIntent.priority,
            confidence_threshold: customIntent.confidence_threshold,
            user_prompt_template: customIntent.user_prompt_template,
            system_prompt_template: customIntent.system_prompt,
            enabled: true, // Custom intents are enabled by default
            avatar_type: 'custom'
        };
    }
}

export default IntentClassifier; 