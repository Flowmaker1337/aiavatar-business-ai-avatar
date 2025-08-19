import { Request, Response } from 'express';
import DatabaseService from '../services/database.service';
import { ExecutionTimerService } from '../services/execution-timer.service';

interface ReactiveAvatarPrompts {
    avatar_id: 'client' | 'student';
    system_prompt: string;
    user_prompt_template: string;
    updated_at: number;
    created_at: number;
}

export class ReactiveAvatarController {
    private databaseService: any;

    constructor() {
        this.databaseService = DatabaseService.getInstance();
    }

    /**
     * POST /api/reactive-avatars/:avatarId/prompts
     * Zapisuje custom prompts dla reactive avatara
     */
    public async savePrompts(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ReactiveAvatarController.savePrompts');
        timer.start();

        try {
            const avatarId = req.params.avatarId as 'client' | 'student';
            const { system_prompt, user_prompt_template } = req.body;

            // Walidacja
            if (!['client', 'student'].includes(avatarId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid avatar ID. Must be "client" or "student"'
                });
                timer.stop();
                return;
            }

            if (!system_prompt || !user_prompt_template) {
                res.status(400).json({
                    success: false,
                    error: 'system_prompt and user_prompt_template are required'
                });
                timer.stop();
                return;
            }

            const promptData: ReactiveAvatarPrompts = {
                avatar_id: avatarId,
                system_prompt,
                user_prompt_template,
                updated_at: Date.now(),
                created_at: Date.now()
            };

            // Upsert do bazy danych  
            const collectionName = 'reactive_avatar_prompts';
            
            // Try to find existing
            const existing = await this.databaseService.findAll(collectionName);
            const existingPrompt = existing.find((p: any) => p.avatar_id === avatarId);
            
            if (existingPrompt) {
                // Update existing
                await this.databaseService.update(collectionName, existingPrompt.id || existingPrompt._id, promptData);
            } else {
                // Create new
                await this.databaseService.create(collectionName, promptData);
            }

            timer.stop();
            console.log(`✅ Saved prompts for reactive avatar: ${avatarId}`);

            res.json({
                success: true,
                message: `Prompts saved for ${avatarId}`,
                processing_time_ms: timer.getElapsedTime()
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error saving reactive avatar prompts:', error);
            
            res.status(500).json({
                success: false,
                error: 'Internal server error while saving prompts'
            });
        }
    }

    /**
     * GET /api/reactive-avatars/:avatarId/prompts
     * Pobiera custom prompts dla reactive avatara
     */
    public async getPrompts(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ReactiveAvatarController.getPrompts');
        timer.start();

        try {
            const avatarId = req.params.avatarId as 'client' | 'student';

            // Walidacja
            if (!['client', 'student'].includes(avatarId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid avatar ID. Must be "client" or "student"'
                });
                timer.stop();
                return;
            }

            const collectionName = 'reactive_avatar_prompts';
            const allPrompts = await this.databaseService.findAll(collectionName);
            const prompts = allPrompts.find((p: any) => p.avatar_id === avatarId);

            timer.stop();

            res.json({
                success: true,
                data: prompts || null,
                processing_time_ms: timer.getElapsedTime()
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error getting reactive avatar prompts:', error);
            
            res.status(500).json({
                success: false,
                error: 'Internal server error while getting prompts'
            });
        }
    }

    /**
     * GET /api/reactive-avatars/prompts
     * Pobiera wszystkie custom prompts dla reactive avatarów
     */
    public async getAllPrompts(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ReactiveAvatarController.getAllPrompts');
        timer.start();

        try {
            const collectionName = 'reactive_avatar_prompts';
            const prompts = await this.databaseService.findAll(collectionName);

            timer.stop();

            res.json({
                success: true,
                data: prompts,
                count: prompts.length,
                processing_time_ms: timer.getElapsedTime()
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error getting all reactive avatar prompts:', error);
            
            res.status(500).json({
                success: false,
                error: 'Internal server error while getting all prompts'
            });
        }
    }

    /**
     * POST /api/reactive-avatars/generate
     * Generuje nowego reactive avatara za pomocą AI
     */
    public async generateReactiveAvatar(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ReactiveAvatarController.generateReactiveAvatar');
        timer.start();

        try {
            const { description, avatarType } = req.body;

            // Walidacja
            if (!description || !description.trim()) {
                res.status(400).json({
                    success: false,
                    error: 'Description is required'
                });
                timer.stop();
                return;
            }

            if (!avatarType || !['client', 'student', 'employee'].includes(avatarType)) {
                res.status(400).json({
                    success: false,
                    error: 'avatarType must be one of: client, student, employee'
                });
                timer.stop();
                return;
            }

            console.log(`🤖 Generating reactive avatar: ${avatarType} with description: ${description}`);

            // Importuj FlowWizardService dynamicznie aby uniknąć circular dependencies
            const { default: FlowWizardService } = await import('../services/flow-wizard.service');
            const flowWizard = FlowWizardService.getInstance();

            // Wygeneruj kompletny reactive avatar
            const generatedAvatar = await this.generateCompleteReactiveAvatar(
                description, 
                avatarType, 
                flowWizard
            );

            timer.stop();
            console.log(`✅ Generated reactive avatar: ${generatedAvatar.firstName} ${generatedAvatar.lastName}`);

            res.status(201).json({
                success: true,
                data: generatedAvatar,
                processing_time_ms: timer.getElapsedTime(),
                message: `Successfully generated reactive avatar: ${generatedAvatar.firstName} ${generatedAvatar.lastName}`
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating reactive avatar:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating reactive avatar',
                details: errorMessage
            });
        }
    }

    /**
     * Generuje kompletny reactive avatar z wszystkimi polami
     */
    private async generateCompleteReactiveAvatar(
        description: string, 
        avatarType: 'client' | 'student' | 'employee',
        flowWizard: any
    ): Promise<any> {
        // Mapowanie typów na konteksty biznesowe
        const businessContexts = {
            client: 'Klient biznesowy - właściciel firmy, decision maker, sceptyczny wobec nowych rozwiązań',
            student: 'Student/uczestnik szkolenia - ambitny, chętny do nauki, potrzebuje wsparcia i kierunku',
            employee: 'Pracownik firmy - wykonawczy, zorientowany na zadania, potrzebuje jasnych instrukcji'
        };

        const businessContext = businessContexts[avatarType];

        // Generuj poszczególne pola avatara
        const firstName = await flowWizard.generateAvatarField('firstName', `${description}. Typ: ${avatarType}. ${businessContext}`);
        const lastName = await flowWizard.generateAvatarField('lastName', `${description}. Typ: ${avatarType}. Polski avatar.`);
        const position = await flowWizard.generateAvatarField('position', `${description}. Typ: ${avatarType}. ${businessContext}`);
        const companyName = await flowWizard.generateAvatarField('companyName', `${description}. Typ: ${avatarType}. Polska firma.`);
        const industry = await flowWizard.generateAvatarField('industry', `${description}. Typ: ${avatarType}. Branża firmy.`);
        const personality = await flowWizard.generateAvatarField('personality', `${description}. Typ: ${avatarType}. ${businessContext}`);
        
        // Generuj specjalizacje na podstawie typu
        const specializations = await this.generateSpecializationsForType(avatarType, description, flowWizard);
        
        // Generuj company details
        const companyDetails = await this.generateCompanyDetails(avatarType, description, companyName, industry, flowWizard);

        // Generuj personality traits
        const personalityTraits = await this.generatePersonalityTraits(avatarType, description, flowWizard);

        // Stwórz kompletny avatar object zgodny z formatem simulation-avatars.json
        const generatedAvatar = {
            _id: `sim_generated_${avatarType}_${Date.now()}`,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: companyDetails,
            personality: personalityTraits,
            position: position.trim(),
            experience_years: this.getExperienceYearsForType(avatarType),
            specializations: specializations,
            active_flows: this.getActiveFlowsForType(avatarType)
        };

        return generatedAvatar;
    }

    /**
     * Generuje specjalizacje dla danego typu avatara
     */
    private async generateSpecializationsForType(
        avatarType: string, 
        description: string, 
        flowWizard: any
    ): Promise<string[]> {
        const prompt = `Na podstawie opisu: "${description}" i typu avatara: "${avatarType}"
        
Wygeneruj 4-6 kluczowych specjalizacji tego avatara.
Każda specjalizacja powinna być krótka (2-4 słowa) i po angielsku.

Przykłady dla różnych typów:
- Client: "Manufacturing processes", "Cost optimization", "Quality management"  
- Student: "Software development", "Project management", "Team coordination"
- Employee: "Process execution", "Quality control", "Task management"

Format: JSON array stringów
Przykład: ["Manufacturing processes", "Cost optimization", "Quality management", "Traditional production methods"]

Odpowiedz tylko JSON array bez dodatkowych komentarzy.`;

        try {
            const response = await flowWizard.generateAvatarField('specializations', prompt);
            const cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
            const specializations = JSON.parse(cleanResponse);
            return Array.isArray(specializations) ? specializations : [];
        } catch (error) {
            console.error('Error generating specializations:', error);
            // Fallback specializations
            const fallbacks = {
                client: ["Business management", "Decision making", "Cost control", "Strategic planning"],
                student: ["Learning", "Skill development", "Team work", "Problem solving"],
                employee: ["Task execution", "Process following", "Quality delivery", "Team collaboration"]
            };
            return fallbacks[avatarType as keyof typeof fallbacks] || [];
        }
    }

    /**
     * Generuje szczegóły firmy
     */
    private async generateCompanyDetails(
        avatarType: string,
        description: string,
        companyName: string,
        industry: string,
        flowWizard: any
    ): Promise<any> {
        const prompt = `Na podstawie opisu: "${description}", nazwy firmy: "${companyName}", branży: "${industry}" i typu avatara: "${avatarType}"

Wygeneruj szczegóły firmy w formacie JSON:
{
  "name": "nazwa firmy",
  "industry": "branża",
  "location": "miasto w Polsce",
  "size": "rozmiar firmy (Mała/Średnia/Duża + liczba pracowników)",
  "mission": "misja firmy (1-2 zdania)",
  "offer": ["usługa1", "usługa2", "usługa3", "usługa4"],
  "use_cases": ["przypadek1", "przypadek2", "przypadek3"],
  "strategic_goals": ["cel1", "cel2", "cel3"],
  "business_needs": ["potrzeba1", "potrzeba2", "potrzeba3"],
  "specializations": ["spec1", "spec2", "spec3"]
}

Wszystko po polsku. Firma powinna być realistyczna i pasować do opisu avatara.
Odpowiedz tylko JSON bez dodatkowych komentarzy.`;

        try {
            const response = await flowWizard.generateAvatarField('companyDetails', prompt);
            const cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
            return JSON.parse(cleanResponse);
        } catch (error) {
            console.error('Error generating company details:', error);
            // Fallback company details
            return {
                name: companyName.trim(),
                industry: industry.trim(),
                location: "Warszawa",
                size: "Średnia (50-100 pracowników)",
                mission: `Dostarczanie wysokiej jakości usług w obszarze ${industry.toLowerCase()}`,
                offer: ["Podstawowe usługi", "Konsulting", "Wsparcie techniczne", "Szkolenia"],
                use_cases: ["Optymalizacja procesów", "Poprawa efektywności", "Rozwój zespołu"],
                strategic_goals: ["Wzrost sprzedaży", "Ekspansja rynkowa", "Digitalizacja"],
                business_needs: ["Nowi klienci", "Lepsze procesy", "Rozwój zespołu"],
                specializations: ["Core business", "Customer service", "Quality management"]
            };
        }
    }

    /**
     * Generuje cechy osobowości
     */
    private async generatePersonalityTraits(
        avatarType: string,
        description: string,
        flowWizard: any
    ): Promise<any> {
        const prompt = `Na podstawie opisu: "${description}" i typu avatara: "${avatarType}"

Wygeneruj cechy osobowości w formacie JSON:
{
  "style": "główny styl osobowości (krótko)",
  "tone": "ton komunikacji", 
  "business_motivation": "główna motywacja biznesowa",
  "communication_style": "styl komunikacji (szczegółowo)",
  "emotional_traits": ["cecha1", "cecha2", "cecha3", "cecha4"],
  "strengths": ["siła1", "siła2", "siła3", "siła4"],
  "weaknesses": ["słabość1", "słabość2"]
}

Dostosuj do typu avatara:
- Client: praktyczny, ostrożny, sceptyczny, ROI-focused
- Student: ambitny, niepewny, chętny do nauki, analityczny  
- Employee: wykonawczy, systematyczny, potrzebuje kierunku

Cechy emocjonalne po polsku, strengths/weaknesses po angielsku.
Odpowiedz tylko JSON bez komentarzy.`;

        try {
            const response = await flowWizard.generateAvatarField('personalityTraits', prompt);
            const cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
            return JSON.parse(cleanResponse);
        } catch (error) {
            console.error('Error generating personality traits:', error);
            // Fallback personality traits
            const fallbacks = {
                client: {
                    style: "Praktyczny i ostrożny",
                    tone: "Bezpośredni i konkretny", 
                    business_motivation: "Stabilny rozwój firmy z kontrolą nad kosztami i ryzykiem",
                    communication_style: "Skeptyczny, pyta o dowody, potrzebuje konkretów",
                    emotional_traits: ["Praktyczny", "Ostrożny", "Zorientowany na ROI", "Analityczny"],
                    strengths: ["Business experience", "Cost-conscious approach", "Quality focused", "Risk management"],
                    weaknesses: ["Resistance to change", "Slow decision making"]
                },
                student: {
                    style: "Ambitny ale niepewny",
                    tone: "Pytający i chętny do nauki",
                    business_motivation: "Rozwój umiejętności i budowanie skutecznego zespołu", 
                    communication_style: "Chłonny, zadaje dużo pytań, szuka konkretnych rozwiązań",
                    emotional_traits: ["Ambitny", "Niepewny siebie", "Chce się uczyć", "Analityczny"],
                    strengths: ["Eagerness to learn", "Analytical thinking", "Team-oriented", "Adaptable"],
                    weaknesses: ["Lack of experience", "Needs reassurance"]
                },
                employee: {
                    style: "Wykonawczy i systematyczny",
                    tone: "Konkretny i zorientowany na zadania",
                    business_motivation: "Efektywne wykonywanie zadań i rozwój kompetencji",
                    communication_style: "Precyzyjny, potrzebuje jasnych instrukcji, skupiony na rezultatach",
                    emotional_traits: ["Systematyczny", "Odpowiedzialny", "Zorientowany na zadania", "Współpracujący"],
                    strengths: ["Task execution", "Process following", "Reliability", "Team collaboration"],
                    weaknesses: ["Limited initiative", "Needs clear direction"]
                }
            };
            return fallbacks[avatarType as keyof typeof fallbacks] || fallbacks.employee;
        }
    }

    /**
     * Zwraca lata doświadczenia dla typu avatara
     */
    private getExperienceYearsForType(avatarType: string): number {
        const experienceMap = {
            client: Math.floor(Math.random() * 10) + 15, // 15-25 lat
            student: Math.floor(Math.random() * 5) + 2,  // 2-7 lat
            employee: Math.floor(Math.random() * 8) + 5  // 5-13 lat
        };
        return experienceMap[avatarType as keyof typeof experienceMap] || 5;
    }

    /**
     * Zwraca aktywne flows dla typu avatara
     */
    private getActiveFlowsForType(avatarType: string): string[] {
        const flowsMap = {
            client: ["greeting_flow", "needs_assessment_flow", "budget_discussion_flow", "decision_making_flow"],
            student: ["greeting_flow", "learning_objectives_flow", "skill_assessment_flow", "development_planning_flow"],
            employee: ["greeting_flow", "task_assignment_flow", "progress_tracking_flow", "feedback_flow"]
        };
        return flowsMap[avatarType as keyof typeof flowsMap] || flowsMap.employee;
    }

    /**
     * POST /api/reactive-avatars/save-generated
     * Zapisuje wygenerowany reactive avatar do simulation-avatars.json
     */
    public async saveGeneratedAvatar(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ReactiveAvatarController.saveGeneratedAvatar');
        timer.start();

        try {
            const { avatarData } = req.body;

            if (!avatarData || !avatarData.firstName || !avatarData.lastName) {
                res.status(400).json({
                    success: false,
                    error: 'Valid avatar data is required'
                });
                timer.stop();
                return;
            }

            console.log(`💾 Saving generated avatar: ${avatarData.firstName} ${avatarData.lastName}`);

            // Importuj path i fs
            const path = await import('path');
            const fs = await import('fs');

            // Ścieżka do simulation-avatars.json
            const configPath = path.resolve(__dirname, '../config/simulation-avatars.json');
            
            // Wczytaj istniejące avatary
            let simulationAvatars: any = {};
            try {
                const configData = fs.readFileSync(configPath, 'utf8');
                simulationAvatars = JSON.parse(configData);
            } catch (error) {
                console.error('Error reading simulation-avatars.json:', error);
                simulationAvatars = { simulation_avatars: {} };
            }

            // Upewnij się, że struktura istnieje
            if (!simulationAvatars.simulation_avatars) {
                simulationAvatars.simulation_avatars = {};
            }

            // Wygeneruj unikalny klucz dla avatara
            const avatarKey = `generated_${avatarData._id.replace('sim_generated_', '').replace('_' + Date.now(), '')}`;
            
            // Dodaj avatar do konfiguracji
            simulationAvatars.simulation_avatars[avatarKey] = avatarData;

            // Zapisz zaktualizowaną konfigurację
            fs.writeFileSync(configPath, JSON.stringify(simulationAvatars, null, 2));

            timer.stop();
            console.log(`✅ Saved generated avatar to simulation-avatars.json: ${avatarKey}`);

            res.json({
                success: true,
                data: {
                    avatar_key: avatarKey,
                    avatar_data: avatarData
                },
                processing_time_ms: timer.getElapsedTime(),
                message: `Avatar ${avatarData.firstName} ${avatarData.lastName} saved successfully`
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error saving generated avatar:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: 'Internal server error while saving generated avatar',
                details: errorMessage
            });
        }
    }
}
