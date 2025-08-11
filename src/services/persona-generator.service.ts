import openAIService from './openai.service';
import { SimulationPersona } from '../models/types';
import { ExecutionTimerService } from './execution-timer.service';

/**
 * PersonaGeneratorService - generuje rozbudowane persony na podstawie ogólnego opisu
 * Używa AI do tworzenia szczegółowych profili uczestników symulacji
 */
export class PersonaGeneratorService {
    private static instance: PersonaGeneratorService;
    private openAIService = openAIService;

    constructor() {
        // Singleton instance
    }

    public static getInstance(): PersonaGeneratorService {
        if (!PersonaGeneratorService.instance) {
            PersonaGeneratorService.instance = new PersonaGeneratorService();
        }
        return PersonaGeneratorService.instance;
    }

    /**
     * Generuje rozbudowaną personę na podstawie krótkiego opisu
     */
    public async generatePersona(
        basicDescription: string,
        role: 'teacher' | 'learner' | 'seller' | 'buyer' | 'interviewer' | 'interviewee',
        industry?: string,
        companySize?: string
    ): Promise<SimulationPersona> {
        const timer = new ExecutionTimerService('PersonaGenerator.generatePersona');
        timer.start();

        try {
            const generatedPersona = await this.callAIPersonaGenerator(
                basicDescription,
                role,
                industry,
                companySize
            );

            timer.stop();
            console.log(`✅ Generated persona: ${generatedPersona.name}`);
            
            return generatedPersona;
        } catch (error) {
            timer.stop();
            console.error('❌ Error generating persona:', error);
            throw error;
        }
    }

    /**
     * Wywołuje AI do wygenerowania szczegółowej persony
     */
    private async callAIPersonaGenerator(
        basicDescription: string,
        role: string,
        industry?: string,
        companySize?: string
    ): Promise<SimulationPersona> {
        
        const prompt = this.buildPersonaPrompt(basicDescription, role, industry, companySize);
        
        const userPrompt = {
            role: 'user' as const,
            content: prompt
        };

        const response = await this.openAIService.generateResponse(userPrompt);
        
        try {
            // Parsuj odpowiedź JSON od AI
            const parsedPersona = JSON.parse(response);
            
            // Waliduj i uzupełnij brakujące pola
            return this.validateAndCompletePersona(parsedPersona);
            
        } catch (parseError) {
            console.error('❌ Error parsing AI response:', parseError);
            console.log('Raw AI response:', response);
            
            // Fallback - stwórz podstawową personę
            return this.createFallbackPersona(basicDescription, role, industry);
        }
    }

    /**
     * Buduje prompt dla AI do generowania persony
     */
    private buildPersonaPrompt(
        basicDescription: string,
        role: string,
        industry?: string,
        companySize?: string
    ): string {
        return `Stwórz szczegółową personę dla symulacji biznesowej na podstawie opisu.

OPIS PODSTAWOWY: "${basicDescription}"
ROLA W SYMULACJI: ${role}
${industry ? `BRANŻA: ${industry}` : ''}
${companySize ? `WIELKOŚĆ FIRMY: ${companySize}` : ''}

Wygeneruj kompletną personę w formacie JSON:

{
  "name": "Imię Nazwisko - Pozycja",
  "background": "Szczegółowy opis doświadczenia i tła zawodowego (2-3 zdania)",
  "goals": [
    "Konkretny cel 1 w kontekście biznesowym",
    "Konkretny cel 2 w kontekście biznesowym",
    "Konkretny cel 3 w kontekście biznesowym"
  ],
  "challenges": [
    "Główne wyzwanie 1 z którym się mierzy",
    "Główne wyzwanie 2 z którym się mierzy",
    "Główne wyzwanie 3 z którym się mierzy"
  ],
  "personality_traits": [
    "Cecha osobowości 1",
    "Cecha osobowości 2", 
    "Cecha osobowości 3",
    "Cecha osobowości 4"
  ],
  "communication_style": "Opis stylu komunikacji - jak ta osoba rozmawia, zadaje pytania, prezentuje informacje",
  "expertise_level": "beginner|intermediate|advanced|expert",
  "industry": "Dokładna nazwa branży",
  "company_size": "Startup (5-10 osób)|Średnia firma (50-250 osób)|Duża korporacja (500+ osób)",
  "budget_range": "Orientacyjny budżet jaki dysponuje (jeśli dotyczy)",
  "decision_making_style": "Opis jak podejmuje decyzje - szybko/powoli, analitycznie/intuicyjnie"
}

INSTRUKCJE:
1. Nazwa powinna być realistyczna polska nazwa + pozycja zawodowa
2. Background powinien być szczegółowy ale zwięzły
3. Goals powinny być SMART i biznesowe
4. Challenges powinny być realistyczne dla tej roli/branży
5. Personality_traits - 4 konkretne cechy charakteru
6. Communication_style - szczegółowy opis jak osoba komunikuje się
7. Expertise_level - dopasuj do opisanego doświadczenia
8. Industry - sprecyzuj branżę na podstawie opisu
9. Company_size - wybierz najbardziej prawdopodobny rozmiar
10. Budget_range - oszacuj budżet jeśli osoba decyduje o zakupach
11. Decision_making_style - opisz styl podejmowania decyzji

Odpowiedz TYLKO poprawnym JSON-em, bez dodatkowych komentarzy.`;
    }

    /**
     * Waliduje i uzupełnia wygenerowaną personę
     */
    private validateAndCompletePersona(parsedPersona: any): SimulationPersona {
        // Sprawdź czy wszystkie wymagane pola są obecne
        const requiredFields = [
            'name', 'background', 'goals', 'challenges', 
            'personality_traits', 'communication_style', 'expertise_level',
            'industry', 'company_size', 'decision_making_style'
        ];

        for (const field of requiredFields) {
            if (!parsedPersona[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Waliduj tablice
        if (!Array.isArray(parsedPersona.goals) || parsedPersona.goals.length < 2) {
            throw new Error('Goals must be an array with at least 2 items');
        }

        if (!Array.isArray(parsedPersona.challenges) || parsedPersona.challenges.length < 2) {
            throw new Error('Challenges must be an array with at least 2 items');
        }

        if (!Array.isArray(parsedPersona.personality_traits) || parsedPersona.personality_traits.length < 3) {
            throw new Error('Personality traits must be an array with at least 3 items');
        }

        // Waliduj expertise_level
        const validExpertiseLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
        if (!validExpertiseLevels.includes(parsedPersona.expertise_level)) {
            parsedPersona.expertise_level = 'intermediate'; // default
        }

        return {
            name: parsedPersona.name,
            background: parsedPersona.background,
            goals: parsedPersona.goals,
            challenges: parsedPersona.challenges,
            personality_traits: parsedPersona.personality_traits,
            communication_style: parsedPersona.communication_style,
            expertise_level: parsedPersona.expertise_level,
            industry: parsedPersona.industry,
            company_size: parsedPersona.company_size,
            budget_range: parsedPersona.budget_range || undefined,
            decision_making_style: parsedPersona.decision_making_style
        };
    }

    /**
     * Tworzy fallback personę gdy AI nie działa
     */
    private createFallbackPersona(
        basicDescription: string,
        role: string,
        industry?: string
    ): SimulationPersona {
        const name = this.generateFallbackName(basicDescription);
        
        return {
            name,
            background: `${basicDescription}. Doświadczony profesjonalista w swojej dziedzinie.`,
            goals: [
                'Osiągnięcie celów biznesowych',
                'Rozwój profesjonalny',
                'Budowanie relacji zawodowych'
            ],
            challenges: [
                'Konkurencja rynkowa',
                'Ograniczenia budżetowe',
                'Zarządzanie czasem'
            ],
            personality_traits: [
                'Profesjonalny',
                'Zorientowany na cele',
                'Komunikatywny',
                'Analityczny'
            ],
            communication_style: 'Profesjonalny i rzeczowy, skupiony na faktach',
            expertise_level: 'intermediate',
            industry: industry || 'Biznes',
            company_size: 'Średnia firma (50-250 osób)',
            decision_making_style: 'Analityczny, bazujący na danych'
        };
    }

    /**
     * Generuje podstawową nazwę na podstawie opisu
     */
    private generateFallbackName(description: string): string {
        // Prosta heurystyka do generowania nazwy
        const names = [
            'Jan Kowalski', 'Anna Nowak', 'Piotr Wiśniewski', 
            'Katarzyna Woźniak', 'Tomasz Dąbrowski', 'Magdalena Lewandowska'
        ];
        
        const randomName = names[Math.floor(Math.random() * names.length)];
        
        // Spróbuj wyciągnąć pozycję z opisu
        const lowerDesc = description.toLowerCase();
        let position = 'Specjalista';
        
        if (lowerDesc.includes('dyrektor')) position = 'Dyrektor';
        else if (lowerDesc.includes('manager') || lowerDesc.includes('menedżer')) position = 'Manager';
        else if (lowerDesc.includes('właściciel')) position = 'Właściciel';
        else if (lowerDesc.includes('konsultant')) position = 'Konsultant';
        else if (lowerDesc.includes('ekspert')) position = 'Ekspert';
        
        return `${randomName} - ${position}`;
    }

    /**
     * Generuje przykładowe persony dla testów
     */
    public async generateExamplePersonas(): Promise<SimulationPersona[]> {
        const examples = [
            {
                description: "Dyrektor HR w korporacji finansowej, 15 lat doświadczenia, specjalizuje się w transformacji cyfrowej działów personalnych",
                role: "interviewer" as const,
                industry: "Finanse",
                companySize: "Duża korporacja (500+ osób)"
            },
            {
                description: "Młody przedsiębiorca, założyciel startupu technologicznego, poszukuje inwestorów i partnerów biznesowych",
                role: "learner" as const,
                industry: "Technologie",
                companySize: "Startup (5-10 osób)"
            },
            {
                description: "Doświadczony sprzedawca oprogramowania B2B, specjalizuje się w rozwiązaniach dla MŚP",
                role: "seller" as const,
                industry: "IT/Software",
                companySize: "Średnia firma (50-250 osób)"
            }
        ];

        const personas: SimulationPersona[] = [];
        
        for (const example of examples) {
            try {
                const persona = await this.generatePersona(
                    example.description,
                    example.role,
                    example.industry,
                    example.companySize
                );
                personas.push(persona);
                
                // Dodaj małą przerwę między wywołaniami API
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error generating example persona:`, error);
            }
        }

        return personas;
    }
}

export default PersonaGeneratorService;
