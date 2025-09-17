import openAIService from './openai.service';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExecutionTimerService } from './execution-timer.service';

/**
 * FlowWizardService - AI-powered generator flows, intencji i promptów
 * Automatycznie tworzy kompletne flow z architekturą Memory + RAG + Intents
 */
export class FlowWizardService {
    private static instance: FlowWizardService;
    private openAIService = openAIService;

    constructor() {
        // Singleton instance
    }

    public static getInstance(): FlowWizardService {
        if (!FlowWizardService.instance) {
            FlowWizardService.instance = new FlowWizardService();
        }
        return FlowWizardService.instance;
    }

    /**
     * Główna metoda - generuje kompletny flow z intencjami i promptami
     */
    public async generateCompleteFlow(
        businessContext: string,
        flowPurpose: string,
        avatarType: 'networker' | 'trainer' | 'client' | 'custom' = 'networker',
        useRAG: boolean = true
    ): Promise<GeneratedFlowPackage> {
        const timer = new ExecutionTimerService('FlowWizard.generateCompleteFlow');
        timer.start();

        try {
            console.log(`🧙‍♂️ Generating complete flow for: ${flowPurpose}`);

            // 1. Generuj strukturę flow
            const flowStructure = await this.generateFlowStructure(
                businessContext, 
                flowPurpose, 
                avatarType
            );

            // 2. Generuj intencje dla flow
            const flowIntents = await this.generateFlowIntents(
                flowStructure, 
                businessContext, 
                avatarType
            );

            // 3. Generuj prompty dla każdego kroku
            const flowPrompts = await this.generateFlowPrompts(
                flowStructure, 
                flowIntents, 
                businessContext, 
                avatarType,
                useRAG
            );

            // 4. Generuj knowledge base jeśli używamy RAG
            const knowledgeBase = useRAG ? await this.generateKnowledgeBase(
                businessContext, 
                flowPurpose, 
                avatarType
            ) : null;

            // 5. Złóż wszystko w kompletny package
            const completePackage: GeneratedFlowPackage = {
                id: uuidv4(),
                name: flowStructure.name,
                description: flowStructure.description,
                business_context: businessContext,
                avatar_type: avatarType,
                created_at: new Date().toISOString(),
                
                flow_definition: flowStructure,
                intent_definitions: flowIntents,
                prompt_templates: flowPrompts,
                knowledge_base: knowledgeBase,
                
                integration_instructions: this.generateIntegrationInstructions(
                    flowStructure, 
                    flowIntents, 
                    avatarType
                )
            };

            timer.stop();
            console.log(`✅ Generated complete flow package: ${completePackage.name}`);
            
            return completePackage;

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating complete flow:', error);
            throw error;
        }
    }

    /**
     * Generuje strukturę flow z krokami
     */
    private async generateFlowStructure(
        businessContext: string,
        flowPurpose: string,
        avatarType: string
    ): Promise<GeneratedFlowDefinition> {
        
        const prompt = this.buildFlowStructurePrompt(businessContext, flowPurpose, avatarType);
        
        const userPrompt = {
            role: 'user' as const,
            content: prompt
        };

        const response = await this.openAIService.generateResponse(userPrompt);
        
        try {
            // Spróbuj wyczyścić odpowiedź od AI przed parsowaniem
            const cleanResponse = this.cleanAIResponse(response);
            const parsedFlow = JSON.parse(cleanResponse);
            return this.validateAndCompleteFlowStructure(parsedFlow, businessContext, avatarType);
        } catch (parseError) {
            console.error('❌ Error parsing flow structure:', parseError);
            console.log('Raw AI response:', response);
            
            // Fallback - stwórz podstawowy flow structure
            return this.createFallbackFlowStructure(businessContext, flowPurpose, avatarType);
        }
    }

    /**
     * Generuje intencje dla flow
     */
    private async generateFlowIntents(
        flowStructure: GeneratedFlowDefinition,
        businessContext: string,
        avatarType: string
    ): Promise<GeneratedIntentDefinition[]> {
        
        const prompt = this.buildIntentGenerationPrompt(flowStructure, businessContext, avatarType);
        
        const userPrompt = {
            role: 'user' as const,
            content: prompt
        };

        const response = await this.openAIService.generateResponse(userPrompt);
        
        try {
            const cleanResponse = this.cleanAIResponse(response);
            const parsedIntents = JSON.parse(cleanResponse);
            return this.validateAndCompleteIntents(parsedIntents, flowStructure);
        } catch (parseError) {
            console.error('❌ Error parsing intents:', parseError);
            console.log('Raw AI response:', response);
            
            // Fallback - stwórz podstawowe intencje
            return this.createFallbackIntents(flowStructure, businessContext);
        }
    }

    /**
     * Generuje prompty dla każdego kroku flow
     */
    private async generateFlowPrompts(
        flowStructure: GeneratedFlowDefinition,
        flowIntents: GeneratedIntentDefinition[],
        businessContext: string,
        avatarType: string,
        useRAG: boolean
    ): Promise<GeneratedPromptTemplate[]> {
        
        const prompts: GeneratedPromptTemplate[] = [];
        
        // Generuj prompt dla każdej intencji
        for (const intent of flowIntents) {
            const prompt = await this.generateSinglePromptTemplate(
                intent,
                flowStructure,
                businessContext,
                avatarType,
                useRAG
            );
            prompts.push(prompt);
        }

        return prompts;
    }

    /**
     * Generuje jeden prompt template
     */
    private async generateSinglePromptTemplate(
        intent: GeneratedIntentDefinition,
        flowStructure: GeneratedFlowDefinition,
        businessContext: string,
        avatarType: string,
        useRAG: boolean
    ): Promise<GeneratedPromptTemplate> {
        
        const prompt = this.buildPromptTemplatePrompt(
            intent, 
            flowStructure, 
            businessContext, 
            avatarType, 
            useRAG
        );
        
        const userPrompt = {
            role: 'user' as const,
            content: prompt
        };

        const response = await this.openAIService.generateResponse(userPrompt);
        
        try {
            const cleanResponse = this.cleanAIResponse(response);
            const parsedPrompt = JSON.parse(cleanResponse);
            return this.validateAndCompletePromptTemplate(parsedPrompt, intent);
        } catch (parseError) {
            console.error('❌ Error parsing prompt template:', parseError);
            console.log('Raw AI response:', response);
            
            // Fallback - stwórz podstawowy prompt template
            return this.createFallbackPromptTemplate(intent, businessContext, avatarType);
        }
    }

    /**
     * Generuje knowledge base dla RAG
     */
    private async generateKnowledgeBase(
        businessContext: string,
        flowPurpose: string,
        avatarType: string
    ): Promise<GeneratedKnowledgeBase> {
        
        const prompt = this.buildKnowledgeBasePrompt(businessContext, flowPurpose, avatarType);
        
        const userPrompt = {
            role: 'user' as const,
            content: prompt
        };

        const response = await this.openAIService.generateResponse(userPrompt);
        
        try {
            const cleanResponse = this.cleanAIResponse(response);
            const parsedKB = JSON.parse(cleanResponse);
            return this.validateAndCompleteKnowledgeBase(parsedKB, businessContext);
        } catch (parseError) {
            console.error('❌ Error parsing knowledge base:', parseError);
            console.log('Raw AI response:', response);
            
            // Fallback - stwórz podstawową knowledge base
            return this.createFallbackKnowledgeBase(businessContext, flowPurpose, avatarType);
        }
    }

    // ============ PROMPT BUILDERS ============

    /**
     * Buduje prompt do generowania struktury flow
     */
    private buildFlowStructurePrompt(
        businessContext: string,
        flowPurpose: string,
        avatarType: string
    ): string {
        return `Jesteś ekspertem w projektowaniu conversational flows dla AI Avatarów w biznesie.

KONTEKST BIZNESOWY: ${businessContext}
CEL FLOW: ${flowPurpose}
TYP AVATARA: ${avatarType}

Wygeneruj strukturę flow z krokami. Flow musi:
1. Być praktyczny i biznesowy
2. Mieć logiczną sekwencję kroków
3. Zawierać success criteria
4. Być dostosowany do typu avatara (${avatarType})

PRZYKŁAD ISTNIEJĄCEGO FLOW:
{
  "id": "greeting_flow",
  "name": "Powitanie i nawiązanie kontaktu",
  "description": "Proces powitania i zbudowania pierwszego kontaktu",
  "entry_intents": ["greeting"],
  "priority": 10,
  "steps": [
    {
      "id": "initial_greeting",
      "name": "Powitanie",
      "description": "Ciepłe powitanie użytkownika",
      "required": true,
      "next_steps": ["company_introduction"]
    },
    {
      "id": "company_introduction", 
      "name": "Przedstawienie firmy",
      "description": "Krótkie przedstawienie swojej firmy",
      "required": true,
      "next_steps": ["conversation_opener"]
    }
  ],
  "success_criteria": ["initial_greeting", "company_introduction"],
  "max_duration": 300,
  "repeatable": true
}

Wygeneruj podobną strukturę dopasowaną do celu: "${flowPurpose}".

ODPOWIEDZ TYLKO POPRAWNYM JSON-EM, bez dodatkowych komentarzy.`;
    }

    /**
     * Buduje prompt do generowania intencji
     */
    private buildIntentGenerationPrompt(
        flowStructure: GeneratedFlowDefinition,
        businessContext: string,
        avatarType: string
    ): string {
        return `Wygeneruj intencje (intent definitions) dla flow: "${flowStructure.name}".

KONTEKST: ${businessContext}
AVATAR TYPE: ${avatarType}
FLOW STEPS: ${flowStructure.steps.map(s => s.name).join(', ')}

Każdy intent musi mieć:
- name: unikalna nazwa
- description: co reprezentuje
- keywords: słowa kluczowe po polsku
- examples: przykłady wypowiedzi użytkownika
- requires_flow: true/false
- flow_name: nazwa flow (jeśli requires_flow = true)
- priority: 1-10

PRZYKŁAD:
{
  "name": "greeting",
  "description": "Rozpoczęcie rozmowy w uprzejmy sposób",
  "keywords": ["cześć", "dzień dobry", "witaj", "hello"],
  "examples": [
    "Dzień dobry, miło mi poznać",
    "Cześć, jak się masz?"
  ],
  "requires_flow": true,
  "flow_name": "greeting_flow",
  "repeatable": true,
  "priority": 10
}

Wygeneruj array intencji dla flow "${flowStructure.name}".
Uwzględnij główny intent triggering flow + dodatkowe supportowe intents.

ODPOWIEDZ JAKO JSON ARRAY intencji, bez dodatkowych komentarzy.`;
    }

    /**
     * Buduje prompt do generowania prompt template
     */
    private buildPromptTemplatePrompt(
        intent: GeneratedIntentDefinition,
        flowStructure: GeneratedFlowDefinition,
        businessContext: string,
        avatarType: string,
        useRAG: boolean
    ): string {
        const ragInstructions = useRAG ? `
- Użyj {{context_knowledge}} dla informacji z RAG
- Odwoływaj się do bazy wiedzy gdy relevant
- Wskazówka: {{knowledge_base.${businessContext.toLowerCase().replace(/\s+/g, '_')}}}` : '';

        return `Wygeneruj prompt template dla intencji: "${intent.name}".

KONTEKST: ${businessContext}
FLOW: ${flowStructure.name}
AVATAR TYPE: ${avatarType}
USE RAG: ${useRAG}

Template musi zawierać:
- system_prompt: instrukcje dla AI 
- user_prompt_template: template z placeholderami {{}}
- variables: lista używanych zmiennych

DOSTĘPNE VARIABLES:
- {{user_message}} - wiadomość użytkownika
- {{npc_persona.firstName}}, {{npc_persona.lastName}} 
- {{npc_company.name}}, {{npc_company.specialization}}
- {{user_company.name}}, {{user_company.industry}}
- {{memory_short}}, {{memory_long}} - pamięć krótko/długoterminowa${ragInstructions}

PRZYKŁAD:
{
  "id": "greeting_template",
  "name": "Greeting Template",
  "intent": "greeting",
  "system_prompt": "Jesteś profesjonalnym ambasadorem firmy {{npc_company.name}}...",
  "user_prompt_template": "Rozmówca napisał: '{{user_message}}' Twoje zadanie: 1. Powitaj się...",
  "variables": ["npc_company.name", "user_message"],
  "priority": 10
}

Wygeneruj template dla intencji "${intent.name}" dostosowany do biznesu: ${businessContext}.

ODPOWIEDZ TYLKO POPRAWNYM JSON-EM.`;
    }

    /**
     * Buduje prompt do generowania knowledge base
     */
    private buildKnowledgeBasePrompt(
        businessContext: string,
        flowPurpose: string,
        avatarType: string
    ): string {
        return `Wygeneruj knowledge base (bazę wiedzy) dla RAG w kontekście: ${businessContext}.

FLOW PURPOSE: ${flowPurpose}
AVATAR TYPE: ${avatarType}

Knowledge base musi zawierać:
- industry_knowledge: wiedza branżowa
- best_practices: najlepsze praktyki
- common_objections: częste obiekcje i odpowiedzi
- business_terminology: terminologia biznesowa
- case_studies: przykłady przypadków

Format JSON:
{
  "industry": "${businessContext}",
  "avatar_type": "${avatarType}",
  "knowledge_areas": {
    "industry_knowledge": ["fact1", "fact2", ...],
    "best_practices": ["practice1", "practice2", ...],
    "common_objections": [
      {"objection": "text", "response": "odpowiedź"},
      ...
    ],
    "business_terminology": {
      "term1": "definicja1",
      "term2": "definicja2"
    },
    "case_studies": [
      {"title": "tytuł", "description": "opis", "outcome": "rezultat"},
      ...
    ]
  }
}

Wygeneruj praktyczną bazę wiedzy dla: ${businessContext} / ${flowPurpose}.

ODPOWIEDZ TYLKO POPRAWNYM JSON-EM.`;
    }

    // ============ VALIDATION METHODS ============

    private validateAndCompleteFlowStructure(
        parsedFlow: any, 
        businessContext: string, 
        avatarType: string
    ): GeneratedFlowDefinition {
        // Walidacja i uzupełnienie flow structure
        return {
            id: parsedFlow.id || uuidv4(),
            name: parsedFlow.name || 'Generated Flow',
            description: parsedFlow.description || `Flow for ${businessContext}`,
            entry_intents: parsedFlow.entry_intents || [],
            priority: parsedFlow.priority || 5,
            steps: parsedFlow.steps || [],
            success_criteria: parsedFlow.success_criteria || [],
            max_duration: parsedFlow.max_duration || 600,
            repeatable: parsedFlow.repeatable !== false,
            avatar_type: avatarType,
            business_context: businessContext
        };
    }

    private validateAndCompleteIntents(
        parsedIntents: any[], 
        flowStructure: GeneratedFlowDefinition
    ): GeneratedIntentDefinition[] {
        return parsedIntents.map(intent => ({
            name: intent.name || 'generated_intent',
            description: intent.description || 'Generated intent',
            keywords: intent.keywords || [],
            examples: intent.examples || [],
            requires_flow: intent.requires_flow !== false,
            flow_name: intent.flow_name || flowStructure.id,
            repeatable: intent.repeatable !== false,
            priority: intent.priority || 5
        }));
    }

    private validateAndCompletePromptTemplate(
        parsedPrompt: any, 
        intent: GeneratedIntentDefinition
    ): GeneratedPromptTemplate {
        return {
            id: parsedPrompt.id || `${intent.name}_template`,
            name: parsedPrompt.name || `${intent.name} Template`,
            intent: intent.name,
            system_prompt: parsedPrompt.system_prompt || 'Default system prompt',
            user_prompt_template: parsedPrompt.user_prompt_template || 'User message: {{user_message}}',
            variables: parsedPrompt.variables || ['user_message'],
            priority: parsedPrompt.priority || intent.priority
        };
    }

    private validateAndCompleteKnowledgeBase(
        parsedKB: any, 
        businessContext: string
    ): GeneratedKnowledgeBase {
        return {
            industry: parsedKB.industry || businessContext,
            avatar_type: parsedKB.avatar_type || 'general',
            knowledge_areas: parsedKB.knowledge_areas || {},
            created_at: new Date().toISOString()
        };
    }

    private generateIntegrationInstructions(
        flowStructure: GeneratedFlowDefinition,
        flowIntents: GeneratedIntentDefinition[],
        avatarType: string
    ): string[] {
        return [
            `1. Dodaj flow definition do src/config/flow-definitions.json`,
            `2. Dodaj intent definitions do src/config/intent-definitions.json`,
            `3. Dodaj prompt templates do src/config/prompt-templates.json`,
            `4. Jeśli używasz RAG, dodaj knowledge base do odpowiedniego pliku`,
            `5. Restart aplikacji żeby załadować nowe konfiguracje`,
            `6. Test flow używając intent: ${flowIntents[0]?.name || 'main_intent'}`
        ];
    }

    /**
     * Czyści odpowiedź od AI z niepożądanych znaków
     */
    private cleanAIResponse(response: string): string {
        // Usuń markdown code blocks jeśli są
        let cleaned = response.replace(/```json\s*|\s*```/g, '');
        
        // Usuń dodatkowe komentarze na początku i końcu
        cleaned = cleaned.replace(/^[^{]*/, ''); // Usuń wszystko przed pierwszym {
        cleaned = cleaned.replace(/[^}]*$/, ''); // Usuń wszystko po ostatnim }
        
        // Znajdź pierwszy { i ostatni }
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        
        return cleaned.trim();
    }

    /**
     * Tworzy fallback flow structure gdy AI nie działa
     */
    private createFallbackFlowStructure(
        businessContext: string,
        flowPurpose: string,
        avatarType: string
    ): GeneratedFlowDefinition {
        const flowId = `generated_flow_${Date.now()}`;
        
        return {
            id: flowId,
            name: `${flowPurpose} Flow`,
            description: `Automatycznie wygenerowany flow dla: ${businessContext}`,
            entry_intents: [`${flowId}_start`],
            priority: 5,
            steps: [
                {
                    id: 'initial_contact',
                    name: 'Nawiązanie kontaktu',
                    description: 'Rozpoczęcie rozmowy i przedstawienie się',
                    required: true,
                    next_steps: ['discovery']
                },
                {
                    id: 'discovery',
                    name: 'Zbieranie informacji',
                    description: 'Poznanie potrzeb i sytuacji klienta',
                    required: true,
                    next_steps: ['solution_presentation']
                },
                {
                    id: 'solution_presentation',
                    name: 'Prezentacja rozwiązania',
                    description: 'Przedstawienie dopasowanego rozwiązania',
                    required: true,
                    next_steps: ['next_steps']
                },
                {
                    id: 'next_steps',
                    name: 'Następne kroki',
                    description: 'Ustalenie dalszych działań',
                    required: true,
                    next_steps: ['completed']
                }
            ],
            success_criteria: ['initial_contact', 'discovery', 'solution_presentation', 'next_steps'],
            max_duration: 600,
            repeatable: true,
            avatar_type: avatarType,
            business_context: businessContext
        };
    }

    /**
     * Tworzy fallback intencje gdy AI nie działa
     */
    private createFallbackIntents(
        flowStructure: GeneratedFlowDefinition,
        businessContext: string
    ): GeneratedIntentDefinition[] {
        const baseIntent = flowStructure.id.replace('generated_flow_', '');
        
        return [
            {
                name: `${baseIntent}_start`,
                description: `Rozpoczęcie flow: ${flowStructure.name}`,
                keywords: ['zacznij', 'rozpocznij', 'chcę', 'potrzebuję'],
                examples: [
                    `Chcę rozpocząć ${businessContext.toLowerCase()}`,
                    `Potrzebuję pomocy z ${businessContext.toLowerCase()}`,
                    'Zacznijmy rozmowę',
                    'Jestem zainteresowany współpracą'
                ],
                requires_flow: true,
                flow_name: flowStructure.id,
                repeatable: true,
                priority: 8
            },
            {
                name: `${baseIntent}_continue`,
                description: `Kontynuacja flow: ${flowStructure.name}`,
                keywords: ['kontynuuj', 'dalej', 'następny', 'więcej'],
                examples: [
                    'Co dalej?',
                    'Kontynuujmy',
                    'Następny krok',
                    'Opowiedz więcej'
                ],
                requires_flow: true,
                flow_name: flowStructure.id,
                repeatable: true,
                priority: 6
            }
        ];
    }

    /**
     * Tworzy fallback knowledge base gdy AI nie działa
     */
    private createFallbackKnowledgeBase(
        businessContext: string,
        flowPurpose: string,
        avatarType: string
    ): GeneratedKnowledgeBase {
        return {
            industry: businessContext,
            avatar_type: avatarType,
            knowledge_areas: {
                industry_knowledge: [
                    `${businessContext} - podstawowe informacje`,
                    'Branża charakteryzuje się wysoką konkurencją',
                    'Kluczowe jest zrozumienie potrzeb klienta',
                    'Personalizacja oferty zwiększa skuteczność'
                ],
                best_practices: [
                    'Aktywne słuchanie potrzeb klienta',
                    'Zadawanie otwartych pytań',
                    'Budowanie relacji przed sprzedażą',
                    'Prezentacja korzyści zamiast cech produktu'
                ],
                common_objections: [
                    {
                        objection: 'To za drogie',
                        response: 'Rozumiem Twoje obawy. Spójrzmy na ROI i długoterminowe korzyści.'
                    },
                    {
                        objection: 'Nie mamy budżetu',
                        response: 'Jakie jest koszty braku rozwiązania tego problemu?'
                    },
                    {
                        objection: 'Musimy pomyśleć',
                        response: 'Oczywiście. Jakie konkretne kwestie wymagają przemyślenia?'
                    }
                ],
                business_terminology: {
                    'ROI': 'Return on Investment - zwrot z inwestycji',
                    'Lead': 'Potencjalny klient zainteresowany ofertą',
                    'Conversion': 'Konwersja - przejście z leada na klienta',
                    'Pain point': 'Problem lub wyzwanie klienta'
                },
                case_studies: [
                    {
                        title: `Sukces w ${businessContext}`,
                        description: `Implementacja rozwiązania w podobnej firmie`,
                        outcome: 'Wzrost efektywności o 30%'
                    }
                ]
            },
            created_at: new Date().toISOString()
        };
    }

    /**
     * Tworzy fallback prompt template gdy AI nie działa
     */
    private createFallbackPromptTemplate(
        intent: GeneratedIntentDefinition,
        businessContext: string,
        avatarType: string
    ): GeneratedPromptTemplate {
        return {
            id: `${intent.name}_template`,
            name: `${intent.name} Template`,
            intent: intent.name,
            system_prompt: `Jesteś profesjonalnym ${avatarType} w obszarze: ${businessContext}. 
            Twoje zadanie to prowadzenie rozmowy zgodnie z intencją: ${intent.description}.
            Zachowuj profesjonalny, ale ciepły ton rozmowy. 
            Zawsze zadawaj pytania, które prowadzą rozmowę dalej.`,
            user_prompt_template: `Rozmówca napisał: "{{user_message}}"

Twoje zadanie:
1. Odpowiedz zgodnie z intencją: ${intent.description}
2. Dostosuj odpowiedź do kontekstu: ${businessContext}
3. Zakończ konkretnym pytaniem prowadzącym rozmowę dalej

OSTATNIA WIADOMOŚĆ UŻYTKOWNIKA:
{{user_message}}

TWOJA ODPOWIEDŹ:`,
            variables: ['user_message', 'npc_company.name', 'user_company.name'],
            priority: intent.priority || 5
        };
    }

    /**
     * Zapisuje wygenerowany package do plików
     */
    public async saveFlowPackage(flowPackage: GeneratedFlowPackage): Promise<boolean> {
        try {
            const configDir = path.resolve(__dirname, '../config');
            const timestamp = new Date().toISOString().split('T')[0];
            
            // Zapisz jako backup files z timestamp
            const backupDir = path.join(configDir, 'generated_flows', timestamp);
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Zapisz każdy komponent osobno
            fs.writeFileSync(
                path.join(backupDir, `${flowPackage.id}_flow.json`),
                JSON.stringify(flowPackage.flow_definition, null, 2)
            );

            fs.writeFileSync(
                path.join(backupDir, `${flowPackage.id}_intents.json`),
                JSON.stringify(flowPackage.intent_definitions, null, 2)
            );

            fs.writeFileSync(
                path.join(backupDir, `${flowPackage.id}_prompts.json`),
                JSON.stringify(flowPackage.prompt_templates, null, 2)
            );

            if (flowPackage.knowledge_base) {
                fs.writeFileSync(
                    path.join(backupDir, `${flowPackage.id}_knowledge.json`),
                    JSON.stringify(flowPackage.knowledge_base, null, 2)
                );
            }

            // Zapisz kompletny package
            fs.writeFileSync(
                path.join(backupDir, `${flowPackage.id}_complete.json`),
                JSON.stringify(flowPackage, null, 2)
            );

            console.log(`✅ Flow package saved to: ${backupDir}`);
            return true;

        } catch (error) {
            console.error('❌ Error saving flow package:', error);
            return false;
        }
    }

    /**
     * Generuje konkretne pole avatara za pomocą AI
     */
    public async generateAvatarField(fieldName: string, description: string): Promise<string> {
        try {
            let prompt = '';

            switch (fieldName) {
                case 'name':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj krótką, profesjonalną nazwę dla tego avatara (max 3-4 słowa).
Nazwa powinna oddawać jego rolę i specjalizację.

Przykłady:
- "Prezes Firmy"
- "Senior Developer"
- "Marketing Manager"
- "Sales Director"

Odpowiedz tylko nazwą, bez dodatkowych komentarzy.`;
                    break;

                case 'specialization':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj listę 5-7 kluczowych specjalizacji tego avatara.
Skup się na konkretnych umiejętnościach i obszarach wiedzy.

Format: lista oddzielona przecinkami.

Przykład: "Zarządzanie strategiczne, rozwój biznesu, leadership, transformacja cyfrowa, budowanie zespołów"

Odpowiedz tylko listą specjalizacji.`;
                    break;

                case 'personality':
                    prompt = `Na podstawie opisu: "${description}"
                    
Opisz osobowość tego avatara w 6-8 cechach charakteru.
Skup się na cechach wpływających na styl pracy i komunikacji.

Format: lista cech oddzielona przecinkami.

Przykład: "Charyzmatyczny, wizjonerski, pewny siebie, inspirujący innych, zorientowany na wyniki, empatyczny w kontaktach z zespołem"

Odpowiedz tylko listą cech osobowości.`;
                    break;

                case 'communication_style':
                    prompt = `Na podstawie opisu: "${description}"
                    
Opisz styl komunikacji tego avatara w 5-6 cechach.
Skup się na tym JAK komunikuje się z innymi ludźmi.

Format: lista cech oddzielona przecinkami.

Przykład: "Pewny siebie, motywujący, jasny w przekazie, słucha aktywnie, zadaje strategiczne pytania, inspiruje do działania"

Odpowiedz tylko stylem komunikacji.`;
                    break;

                case 'background':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj krótkie tło zawodowe tego avatara (2-3 zdania).
Skup się na doświadczeniu, osiągnięciach i kluczowych kompetencjach.

Przykład: "15-letnie doświadczenie w branży technologicznej, prowadził 3 startupy, zbudował zespoły ponad 200 osób, doświadczenie międzynarodowe w Europie i USA"

Odpowiedz tylko opisem background.`;
                    break;

                case 'firstName':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj typowe polskie imię dla tej osoby.
Imię powinno pasować do opisu i być realistyczne.

Odpowiedz tylko imieniem, bez dodatkowych komentarzy.`;
                    break;

                case 'lastName':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj typowe polskie nazwisko dla tej osoby.
Nazwisko powinno brzmieć naturalnie i profesjonalnie.

Odpowiedz tylko nazwiskiem, bez dodatkowych komentarzy.`;
                    break;

                case 'position':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj stanowisko/pozycję zawodową tej osoby.
Stanowisko powinno odpowiadać opisowi i być realistyczne.

Przykłady:
- "Właściciel i Dyrektor Generalny"
- "Team Leader / Junior Manager"
- "Senior Executive Coach & Psycholog"
- "Specjalista ds. Procesów"

Odpowiedz tylko stanowiskiem, bez dodatkowych komentarzy.`;
                    break;

                case 'companyName':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj nazwę firmy dla tej osoby.
Nazwa powinna brzmieć profesjonalnie i pasować do branży.
Może zawierać polskie elementy ale powinna być biznesowa.

Przykłady:
- "TechSolutions Sp. z o.o."
- "WisProd Manufacturing"
- "LogisPol International"
- "Instytut Archetypów Osobowości"

Odpowiedz tylko nazwą firmy, bez dodatkowych komentarzy.`;
                    break;

                case 'industry':
                    prompt = `Na podstawie opisu: "${description}"
                    
Wygeneruj nazwę branży/sektora dla tej firmy.
Branża powinna pasować do opisu i być konkretna.

Przykłady:
- "Produkcja przemysłowa"
- "Usługi IT"
- "Logistyka międzynarodowa"
- "Edukacja i rozwój osobisty"

Odpowiedz tylko nazwą branży, bez dodatkowych komentarzy.`;
                    break;

                case 'specializations':
                case 'companyDetails':
                case 'personalityTraits':
                    // Te są obsługiwane przez bardziej złożone prompty w ReactiveAvatarController
                    prompt = `Generate content for ${fieldName} based on: "${description}"`;
                    break;

                default:
                    throw new Error(`Unknown field name: ${fieldName}`);
            }

            const response = await this.openAIService.generateResponse({
                role: 'user',
                content: `USER: ${prompt}`
            }, {
                role: 'system',
                content: 'Jesteś ekspertem od tworzenia profili biznesowych. Generujesz precyzyjne, profesjonalne opisy zgodnie z instrukcjami.'
            });

            return response.trim();

        } catch (error) {
            console.error(`Error generating avatar field ${fieldName}:`, error);
            throw error;
        }
    }
}

// ============ INTERFACES ============

export interface GeneratedFlowPackage {
    id: string;
    name: string;
    description: string;
    business_context: string;
    avatar_type: string;
    created_at: string;
    
    flow_definition: GeneratedFlowDefinition;
    intent_definitions: GeneratedIntentDefinition[];
    prompt_templates: GeneratedPromptTemplate[];
    knowledge_base: GeneratedKnowledgeBase | null;
    integration_instructions: string[];
}

export interface GeneratedFlowDefinition {
    id: string;
    name: string;
    description: string;
    entry_intents: string[];
    priority: number;
    steps: FlowStep[];
    success_criteria: string[];
    max_duration: number;
    repeatable: boolean;
    avatar_type: string;
    business_context: string;
}

export interface FlowStep {
    id: string;
    name: string;
    description: string;
    required: boolean;
    next_steps: string[];
}

export interface GeneratedIntentDefinition {
    name: string;
    description: string;
    keywords: string[];
    examples: string[];
    requires_flow: boolean;
    flow_name: string;
    repeatable: boolean;
    priority: number;
}

export interface GeneratedPromptTemplate {
    id: string;
    name: string;
    intent: string;
    system_prompt: string;
    user_prompt_template: string;
    variables: string[];
    priority: number;
}

export interface GeneratedKnowledgeBase {
    industry: string;
    avatar_type: string;
    knowledge_areas: Record<string, any>;
    created_at: string;
}

export default FlowWizardService;
