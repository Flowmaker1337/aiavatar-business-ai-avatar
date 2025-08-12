import { Request, Response } from 'express';
import FlowWizardService, { GeneratedFlowPackage } from '../services/flow-wizard.service';
import { ExecutionTimerService } from '../services/execution-timer.service';

/**
 * FlowWizardController - API endpoints dla AI-powered generatora flows
 * Umożliwia tworzenie kompletnych flows z intencjami i promptami
 */
export class FlowWizardController {
    private flowWizard: FlowWizardService;

    constructor() {
        this.flowWizard = FlowWizardService.getInstance();
    }

    /**
     * POST /api/flow-wizard/generate
     * Generuje kompletny flow package
     */
    public async generateFlow(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('FlowWizardController.generateFlow');
        timer.start();

        try {
            const { 
                businessContext, 
                flowPurpose, 
                avatarType = 'networker', 
                useRAG = true,
                saveToFiles = false
            } = req.body;

            // Walidacja danych wejściowych
            if (!businessContext || !flowPurpose) {
                res.status(400).json({
                    success: false,
                    error: 'businessContext and flowPurpose are required'
                });
                timer.stop();
                return;
            }

            // Walidacja avatarType
            const validAvatarTypes = ['networker', 'trainer', 'client', 'custom'];
            if (!validAvatarTypes.includes(avatarType)) {
                res.status(400).json({
                    success: false,
                    error: `avatarType must be one of: ${validAvatarTypes.join(', ')}`
                });
                timer.stop();
                return;
            }

            console.log(`🧙‍♂️ Generating flow: ${flowPurpose} for ${businessContext}`);

            // Wygeneruj kompletny flow package
            const flowPackage = await this.flowWizard.generateCompleteFlow(
                businessContext,
                flowPurpose,
                avatarType,
                useRAG
            );

            // Opcjonalnie zapisz do plików
            let savedToFiles = false;
            if (saveToFiles) {
                savedToFiles = await this.flowWizard.saveFlowPackage(flowPackage);
            }

            timer.stop();
            res.status(201).json({
                success: true,
                data: {
                    flow_package: flowPackage,
                    saved_to_files: savedToFiles,
                    generation_time_ms: timer.getElapsedTime()
                },
                message: `Successfully generated flow: ${flowPackage.name}`
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating flow:', error);
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating flow',
                details: errorMessage
            });
        }
    }

    /**
     * POST /api/flow-wizard/generate-quick
     * Szybkie generowanie flow z predefiniowanymi szablonami
     */
    public async generateQuickFlow(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('FlowWizardController.generateQuickFlow');
        timer.start();

        try {
            const { template, customization = {} } = req.body;

            if (!template) {
                res.status(400).json({
                    success: false,
                    error: 'template is required'
                });
                timer.stop();
                return;
            }

            // Predefiniowane szablony dla popularnych przypadków
            const quickTemplates = this.getQuickTemplates();
            const selectedTemplate = quickTemplates[template];

            if (!selectedTemplate) {
                res.status(400).json({
                    success: false,
                    error: `Unknown template: ${template}. Available: ${Object.keys(quickTemplates).join(', ')}`
                });
                timer.stop();
                return;
            }

            // Zastosuj customization
            const finalConfig = { ...selectedTemplate, ...customization };

            // Wygeneruj flow
            const flowPackage = await this.flowWizard.generateCompleteFlow(
                finalConfig.businessContext,
                finalConfig.flowPurpose,
                finalConfig.avatarType,
                finalConfig.useRAG
            );

            timer.stop();
            res.status(201).json({
                success: true,
                data: {
                    template_used: template,
                    flow_package: flowPackage,
                    generation_time_ms: timer.getElapsedTime()
                },
                message: `Generated flow from template: ${template}`
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating quick flow:', error);
            
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating quick flow'
            });
        }
    }

    /**
     * GET /api/flow-wizard/templates
     * Pobiera dostępne szablony quick flow
     */
    public async getTemplates(req: Request, res: Response): Promise<void> {
        try {
            const templates = this.getQuickTemplates();
            
            res.json({
                success: true,
                data: {
                    templates,
                    count: Object.keys(templates).length
                }
            });

        } catch (error) {
            console.error('❌ Error getting templates:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching templates'
            });
        }
    }

    /**
     * POST /api/flow-wizard/save
     * Zapisuje flow package do plików konfiguracyjnych
     */
    public async saveFlowPackage(req: Request, res: Response): Promise<void> {
        try {
            const { flowPackage } = req.body;

            if (!flowPackage || !flowPackage.id) {
                res.status(400).json({
                    success: false,
                    error: 'Valid flowPackage is required'
                });
                return;
            }

            const saved = await this.flowWizard.saveFlowPackage(flowPackage);

            if (saved) {
                res.json({
                    success: true,
                    message: `Flow package ${flowPackage.name} saved successfully`
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to save flow package'
                });
            }

        } catch (error) {
            console.error('❌ Error saving flow package:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while saving flow package'
            });
        }
    }

    /**
     * POST /api/flow-wizard/validate
     * Waliduje wygenerowany flow package
     */
    public async validateFlowPackage(req: Request, res: Response): Promise<void> {
        try {
            const { flowPackage } = req.body;

            if (!flowPackage) {
                res.status(400).json({
                    success: false,
                    error: 'flowPackage is required'
                });
                return;
            }

            const validation = this.validateFlowPackageStructure(flowPackage);

            res.json({
                success: true,
                data: {
                    is_valid: validation.isValid,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    suggestions: validation.suggestions
                }
            });

        } catch (error) {
            console.error('❌ Error validating flow package:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while validating flow package'
            });
        }
    }

    /**
     * GET /api/flow-wizard/examples
     * Generuje przykładowe flow packages dla demonstracji
     */
    public async generateExamples(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('FlowWizardController.generateExamples');
        timer.start();

        try {
            const examples = [
                {
                    businessContext: 'Sprzedaż usług IT dla MŚP',
                    flowPurpose: 'Identyfikacja potrzeb technologicznych klienta',
                    avatarType: 'networker' as const
                },
                {
                    businessContext: 'Szkolenia z zarządzania projektami',
                    flowPurpose: 'Onboarding nowego członka zespołu',
                    avatarType: 'trainer' as const
                },
                {
                    businessContext: 'Konsultacje strategiczne dla startupów',
                    flowPurpose: 'Analiza modelu biznesowego',
                    avatarType: 'networker' as const
                }
            ];

            const generatedExamples: GeneratedFlowPackage[] = [];

            for (const example of examples) {
                try {
                    const flowPackage = await this.flowWizard.generateCompleteFlow(
                        example.businessContext,
                        example.flowPurpose,
                        example.avatarType,
                        true
                    );
                    generatedExamples.push(flowPackage);
                    
                    // Krótka przerwa między generowaniem
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Error generating example: ${example.flowPurpose}`, error);
                }
            }

            timer.stop();
            res.json({
                success: true,
                data: {
                    examples: generatedExamples,
                    count: generatedExamples.length,
                    generation_time_ms: timer.getElapsedTime()
                },
                message: `Generated ${generatedExamples.length} example flow packages`
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating examples:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating examples'
            });
        }
    }

    /**
     * POST /api/flow-wizard/generate-avatar-field
     * Generuje konkretne pole avatara za pomocą AI
     */
    public async generateAvatarField(req: Request, res: Response): Promise<void> {
        try {
            const { fieldName, description } = req.body;

            if (!fieldName || !description) {
                res.status(400).json({
                    success: false,
                    error: 'Field name and description are required'
                });
                return;
            }

            const result = await this.flowWizard.generateAvatarField(fieldName, description);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error generating avatar field:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating avatar field'
            });
        }
    }

    // ============ PRIVATE METHODS ============

    /**
     * Zwraca predefiniowane szablony quick flow
     */
    private getQuickTemplates(): Record<string, any> {
        return {
            'sales_discovery': {
                businessContext: 'Sprzedaż B2B usług/produktów',
                flowPurpose: 'Odkrycie potrzeb klienta i identyfikacja pain pointów',
                avatarType: 'networker',
                useRAG: true,
                description: 'Flow do prowadzenia rozmów sprzedażowych z fokusem na discovery'
            },
            'customer_onboarding': {
                businessContext: 'Onboarding nowych klientów',
                flowPurpose: 'Wprowadzenie klienta do systemu i produktu',
                avatarType: 'trainer',
                useRAG: true,
                description: 'Flow do wprowadzania nowych użytkowników'
            },
            'technical_consulting': {
                businessContext: 'Konsultacje techniczne IT',
                flowPurpose: 'Analiza wymagań technicznych i architektura rozwiązania',
                avatarType: 'networker',
                useRAG: true,
                description: 'Flow dla konsultacji technicznych'
            },
            'investment_pitch': {
                businessContext: 'Prezentacja dla inwestorów',
                flowPurpose: 'Przedstawienie modelu biznesowego i pozyskanie finansowania',
                avatarType: 'networker',
                useRAG: true,
                description: 'Flow do pitch presentations'
            },
            'team_training': {
                businessContext: 'Szkolenia zespołowe',
                flowPurpose: 'Transfer wiedzy i umiejętności w zespole',
                avatarType: 'trainer',
                useRAG: true,
                description: 'Flow do szkoleń wewnętrznych'
            }
        };
    }

    /**
     * Waliduje strukturę flow package
     */
    private validateFlowPackageStructure(flowPackage: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Sprawdź wymagane pola
        if (!flowPackage.id) errors.push('Missing flow package ID');
        if (!flowPackage.name) errors.push('Missing flow package name');
        if (!flowPackage.flow_definition) errors.push('Missing flow definition');
        if (!flowPackage.intent_definitions) errors.push('Missing intent definitions');
        if (!flowPackage.prompt_templates) errors.push('Missing prompt templates');

        // Sprawdź flow definition
        if (flowPackage.flow_definition) {
            const flow = flowPackage.flow_definition;
            if (!flow.steps || flow.steps.length === 0) {
                errors.push('Flow must have at least one step');
            }
            if (!flow.entry_intents || flow.entry_intents.length === 0) {
                warnings.push('Flow should have entry intents defined');
            }
        }

        // Sprawdź intents
        if (flowPackage.intent_definitions) {
            const intents = flowPackage.intent_definitions;
            if (!Array.isArray(intents) || intents.length === 0) {
                errors.push('Must have at least one intent definition');
            }
            
            intents.forEach((intent: any, index: number) => {
                if (!intent.name) errors.push(`Intent ${index} missing name`);
                if (!intent.examples || intent.examples.length === 0) {
                    warnings.push(`Intent ${intent.name} should have examples`);
                }
            });
        }

        // Sprawdź prompts
        if (flowPackage.prompt_templates) {
            const prompts = flowPackage.prompt_templates;
            if (!Array.isArray(prompts) || prompts.length === 0) {
                errors.push('Must have at least one prompt template');
            }

            prompts.forEach((prompt: any, index: number) => {
                if (!prompt.system_prompt) {
                    errors.push(`Prompt template ${index} missing system_prompt`);
                }
                if (!prompt.user_prompt_template) {
                    warnings.push(`Prompt template ${index} missing user_prompt_template`);
                }
            });
        }

        // Sugestie
        if (flowPackage.knowledge_base) {
            suggestions.push('Consider testing RAG integration with the provided knowledge base');
        }
        
        suggestions.push('Test the generated flow with real user inputs');
        suggestions.push('Monitor flow completion rates after deployment');

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }
}

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}

export default FlowWizardController;
