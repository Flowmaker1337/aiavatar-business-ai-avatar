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
}
