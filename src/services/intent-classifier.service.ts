import fs from 'fs';
import path from 'path';
import openAIService from './openai.service';
import { IntentClassificationResult, IntentDefinition, MindStateStack, UserPrompt } from '../models/types';
import { ExecutionTimerService } from './execution-timer.service';

/**
 * IntentClassifier - klasyfikuje intencje użytkownika na podstawie jego wiadomości
 * Używa OpenAI do analizy tekstu i dopasowywania do zdefiniowanych intencji
 */
class IntentClassifier {
    private static instance: IntentClassifier;
    private intentDefinitions: IntentDefinition[] = [];
    private initialized = false;

    private constructor() {}

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
     * Klasyfikuje intencję na podstawie wiadomości użytkownika
     */
    public async classifyIntent(
        userMessage: string,
        mindState?: MindStateStack
    ): Promise<IntentClassificationResult> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Użyj OpenAI do klasyfikacji - bez keyword matching!
        const aiResult = await this.classifyWithOpenAI(userMessage, mindState);
        return aiResult;
    }

    /**
     * Klasyfikuje intencję używając OpenAI
     */
    private async classifyWithOpenAI(
        userMessage: string,
        mindState?: MindStateStack
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

            const systemPrompt = this.createClassificationPrompt();
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
            
            // Znajdź definicję intencji
            const intentDef = this.intentDefinitions.find(def => def.name === intentName);
            if (!intentDef) {
                console.warn(`⚠️ Unknown intent returned by OpenAI: ${intentName}, falling back to user_comments`);
                const fallbackDef = this.intentDefinitions.find(def => def.name === 'user_comments');
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
    private createClassificationPrompt(): string {
        const intentList = this.intentDefinitions.map(intent => `- ${intent.name}`).join('\n');

        return `Zadanie: Na podstawie wypowiedzi użytkownika, wybierz najbardziej pasującą intencję spośród poniższych:

${intentList}

Przykład:
Użytkownik: "Chciałbym dowiedzieć się czym się zajmujecie."
Odpowiedź: ask_about_npc_firm

Użytkownik: "Potrzebuję wsparcia w marketingu."
Odpowiedź: user_needs

Użytkownik: "Nasza firma zajmuje się produkcją."
Odpowiedź: user_firm_info

Użytkownik: "O szczegółach najlepiej gdybyś porozmawiał z moim zespołem."
Odpowiedź: conversation_redirect

Użytkownik: "Skontaktuj się z naszym zespołem."
Odpowiedź: conversation_redirect

Użytkownik: "jan.kowalski@firma.pl"
Odpowiedź: email_provided

Użytkownik: "Mój email to kowalski@example.com"
Odpowiedź: email_provided

Użytkownik: "kowalski@gmail.com to jego email"
Odpowiedź: email_provided

Użytkownik: "Podam Ci mail do kierownika"
Odpowiedź: email_promise

Użytkownik: "Dam Ci jego email"
Odpowiedź: email_promise

Użytkownik: "To brzmi interesująco, mogłoby nam się przydać"
Odpowiedź: npc_interest_in_user_offer

Użytkownik: "Jesteśmy zainteresowani Twoim rozwiązaniem"
Odpowiedź: npc_interest_in_user_offer

Użytkownik: "Oferujemy rozwiązania z zakresu automatyzacji"
Odpowiedź: user_presenting_offer

Użytkownik: "Specjalizujemy się w systemach CRM"
Odpowiedź: user_presenting_offer

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
}

export default IntentClassifier; 