import OpenAI from 'openai';
import {OPENAI_API_KEY} from '../config/env';
import {Goal, DetectedGoal, ExecuteDetectedGoal} from '../models/types';
import fs from 'fs';
import path from 'path';
import {UtilsService} from "./utils.service";
import {ExecutionTimerService} from "./execution-timer.service";

class GoalService {
    private client: OpenAI;
    private goals: Goal[] = [];
    private enabledGoals: Goal[] = [];

    constructor() {
        this.client = new OpenAI({
            apiKey: OPENAI_API_KEY
        });

        this.loadGoalsFromConfigFile();
        this.setEnabledAndDisabledGoals();
    }

    private loadGoalsFromConfigFile() {
        // Try loading goals from configuration file
        try {
            // Check different possible paths to goals.json file
            let goalsPath = path.resolve(__dirname, '../config/goals.json');

            // If doesn't exist, try alternative path (for Vercel)
            if (!fs.existsSync(goalsPath)) {
                goalsPath = path.resolve(process.cwd(), './dist/config/goals.json');
            }

            // If still doesn't exist, try last alternative
            if (!fs.existsSync(goalsPath)) {
                goalsPath = path.resolve(process.cwd(), './src/config/goals.json');
            }

            if (fs.existsSync(goalsPath)) {
                console.log(`Found configuration file at: ${goalsPath}`);
                const goalsData = fs.readFileSync(goalsPath, 'utf8');
                const parsed = JSON.parse(goalsData);
                if (parsed && parsed.goals && Array.isArray(parsed.goals)) {
                    this.goals = parsed.goals;
                    console.log(`Loaded ${this.goals.length} goals from configuration file.`);
                } else {
                    console.warn('Configuration file does not contain goals field of array type. Using empty goals array.');
                }
            } else {
                console.warn('Goals configuration file does not exist. Using empty goals array.');
                console.warn('Checked following paths:');
                console.warn(`- ${path.resolve(__dirname, '../config/goals.json')}`);
                console.warn(`- ${path.resolve(process.cwd(), './dist/config/goals.json')}`);
                console.warn(`- ${path.resolve(process.cwd(), './src/config/goals.json')}`);
            }
        } catch (error) {
            console.error('Error loading goals:', error);
            console.log('Using empty goals array.');
        }
    }

    private setEnabledAndDisabledGoals() {
        for (const goal of this.goals) {
            if (goal.enabled_by_default) {
                this.enabledGoals.push(goal);
            }
        }
    }

    /**
     * Executes actions associated with detected goal
     */
    public async executeActionForDetectedGoal(query: string): Promise<ExecuteDetectedGoal | null> {
        const executionTimerService = new ExecutionTimerService('executeActionForDetectedGoal in GoalService');
        executionTimerService.start();
        const detectedGoal = await this.detectGoal(query);

        if (detectedGoal === null) {
            executionTimerService.stop();
            console.log('[GOAL DETECTION] No active goal matching user intention detected.');
            return null;
        }

        const goal = this.enabledGoals.find(g => g.name === detectedGoal.name);
        if (!goal) {
            executionTimerService.stop();
            console.error(`Detected goal does not exist in active goals list. Goal name: ${detectedGoal.name}`);
            return null;
        }

        console.log('[GOAL DETECTION] Detected goal:');
        console.log(`  - Goal name: ${detectedGoal.name}`);
        console.log('  - Detected entities: ', UtilsService.formatStringMap(detectedGoal.entities));

        console.log('[GOAL EXECUTION] Actions to execute:');
        if (goal.actions.instruction) console.log(`    * Instruction: ${goal.actions.instruction}`);
        if (goal.actions.emotion_change) console.log(`    * Emotion change: ${goal.actions.emotion_change}`);
        if (goal.actions.say_verbatim) {
            console.log(`    * Direct response: "${goal.actions.say_verbatim}"`);
            console.log('\n[RESPONSE] Using direct response from goal');
            executionTimerService.stop();
            return {
                executedGoalName: goal.name,
                responseText: goal.actions.say_verbatim,
                isSayVerbatim: true
            };
        } else {
            executionTimerService.stop();
            return null;
        }
    }

    /**
     * Detects goal based on user query
     */
    private async detectGoal(query: string): Promise<DetectedGoal | null> {
        if (this.enabledGoals.length === 0) {
            console.log('No active goals to check.');
            return null;
        }

        try {
            // For testing purposes, we can return null without calling OpenAI API
            if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
                console.log('No OpenAI API key. Skipping goal detection.');
                return null;
            }

            // Prepare prompt for the model
            const prompt = this.prepareGoalDetectionPrompt();

            const response = await this.client.chat.completions.create({
                // model: 'gpt-4o-mini',
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: prompt
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 50,
                // max_completion_tokens: 50,
                response_format: {type: 'json_object'}
            });

            const content = response.choices[0].message.content;
            if (!content) return null;

            const result = JSON.parse(content);

            if (result.name && result.confidence > 0.7) {
                return {
                    name: result.name,
                    confidence: result.confidence,
                    entities: result.entities || {}
                };
            }

            return null;
        } catch (error) {
            console.error('Error during goal detection:', error);
            return null;
        }
    }

    /**
     * Prepares prompt for goal detection
     */
    private prepareGoalDetectionPrompt(): string {
        const goalsDescription = this.enabledGoals.filter(goal => goal.activation.intent).map(goal => {
            return `- ${goal.name}: [Intent: ${goal.activation.intent}]`;
        }).join('\n');

        return `Jako system klasyfikacji celów, Twoim zadaniem jest wykrycie czy zapytanie użytkownika pasuje do jednego z predefiniowanych celów.
    
    Dostępne cele:
    ${goalsDescription}
    
    Przeanalizuj zapytanie użytkownika i określ, czy pasuje do jednego z powyższych celów.
    Jeśli pasuje, zwróć nazwę celu oraz wydobyte encje (jeśli są).
    Jeśli nie pasuje do żadnego celu, zwróć null.
    
    Zwróć odpowiedź w formacie JSON:
    {
      "name": "nazwa_celu lub null",
      "confidence": [wartość od 0 do 1],
      "entities": {
        "nazwa_encji": "wartość"
      }
    }`;
    }
}

export default new GoalService();