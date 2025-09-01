import { Request, Response } from 'express';
import ExtendedDatabaseService from '../services/extended-database.service';
import { ExecutionTimerService } from '../services/execution-timer.service';
import { SimulationScene, SceneParticipant } from '../models/auth-types';

export class SceneBuilderController {
    private databaseService: ExtendedDatabaseService;

    constructor() {
        this.databaseService = ExtendedDatabaseService.getInstance();
    }

    /**
     * POST /api/simulation-scenes
     * Creates a new simulation scene
     */
    public async createScene(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SceneBuilderController.createScene');
        timer.start();

        try {
            const sceneData = req.body;
            
            // Validation
            if (!sceneData.name || !sceneData.category) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: name, category'
                });
                timer.stop();
                return;
            }

            // Set default user_id if not provided (for development)
            if (!sceneData.user_id) {
                sceneData.user_id = 'default_user';
            }

            // Set defaults
            const defaultSceneData = {
                description: '',
                scenario: {
                    situation: '',
                    context: '',
                    objectives: [],
                    constraints: [],
                    success_criteria: []
                },
                required_participants: [],
                optional_participants: [],
                estimated_duration_minutes: 30,
                difficulty_level: 'intermediate' as const,
                conversation_starters: [],
                key_talking_points: [],
                potential_objections: [],
                is_template: false,
                usage_count: 0,
                ...sceneData
            };

            console.log('🎬 Creating simulation scene:', defaultSceneData.name);

            const scene = await this.databaseService.createSimulationScene(defaultSceneData);

            timer.stop();

            res.json({
                success: true,
                data: scene,
                message: 'Simulation scene created successfully'
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error creating simulation scene:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create simulation scene',
                details: error.message
            });
        }
    }

    /**
     * GET /api/simulation-scenes
     * Gets all simulation scenes for the current user
     */
    public async getScenes(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SceneBuilderController.getScenes');
        timer.start();

        try {
            // For now, use default user - later get from auth
            const userId = req.query.user_id as string || 'default_user';
            const category = req.query.category as string;
            
            console.log('📥 Getting simulation scenes for user:', userId, category ? `category: ${category}` : '');

            let scenes: SimulationScene[];
            
            if (category) {
                scenes = await this.databaseService.getScenesByCategory(category);
            } else {
                scenes = await this.databaseService.getSimulationScenesByUserId(userId);
            }

            timer.stop();

            res.json({
                success: true,
                data: scenes,
                count: scenes.length
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting simulation scenes:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get simulation scenes',
                details: error.message
            });
        }
    }

    /**
     * GET /api/simulation-scenes/:sceneId
     * Gets a specific simulation scene
     */
    public async getScene(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SceneBuilderController.getScene');
        timer.start();

        try {
            const { sceneId } = req.params;
            
            console.log('📥 Getting simulation scene:', sceneId);

            const scene = await this.databaseService.getSimulationSceneById(sceneId);

            if (!scene) {
                res.status(404).json({
                    success: false,
                    error: 'Simulation scene not found'
                });
                timer.stop();
                return;
            }

            timer.stop();

            res.json({
                success: true,
                data: scene
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting simulation scene:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get simulation scene',
                details: error.message
            });
        }
    }

    /**
     * PUT /api/simulation-scenes/:sceneId
     * Updates a simulation scene
     */
    public async updateScene(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SceneBuilderController.updateScene');
        timer.start();

        try {
            const { sceneId } = req.params;
            const updateData = req.body;
            
            console.log('✏️ Updating simulation scene:', sceneId);

            const updatedScene = await this.databaseService.updateSimulationScene(sceneId, updateData);

            if (!updatedScene) {
                res.status(404).json({
                    success: false,
                    error: 'Simulation scene not found'
                });
                timer.stop();
                return;
            }

            timer.stop();

            res.json({
                success: true,
                data: updatedScene,
                message: 'Simulation scene updated successfully'
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error updating simulation scene:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update simulation scene',
                details: error.message
            });
        }
    }

    /**
     * DELETE /api/simulation-scenes/:sceneId
     * Deletes a simulation scene
     */
    public async deleteScene(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SceneBuilderController.deleteScene');
        timer.start();

        try {
            const { sceneId } = req.params;
            
            console.log('🗑️ Deleting simulation scene:', sceneId);

            const deleted = await this.databaseService.deleteSimulationScene(sceneId);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Simulation scene not found'
                });
                timer.stop();
                return;
            }

            timer.stop();

            res.json({
                success: true,
                message: 'Simulation scene deleted successfully'
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error deleting simulation scene:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete simulation scene',
                details: error.message
            });
        }
    }

    /**
     * GET /api/simulation-scenes/templates
     * Gets simulation scene templates
     */
    public async getTemplates(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SceneBuilderController.getTemplates');
        timer.start();

        try {
            console.log('📋 Getting simulation scene templates');

            const templates = await this.databaseService.getTemplateScenes();

            timer.stop();

            res.json({
                success: true,
                data: templates,
                count: templates.length
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting simulation scene templates:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get simulation scene templates',
                details: error.message
            });
        }
    }

    /**
     * POST /api/simulation-scenes/:sceneId/duplicate
     * Duplicates a simulation scene
     */
    public async duplicateScene(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('SceneBuilderController.duplicateScene');
        timer.start();

        try {
            const { sceneId } = req.params;
            const { name } = req.body;
            
            console.log('📋 Duplicating simulation scene:', sceneId);

            const originalScene = await this.databaseService.getSimulationSceneById(sceneId);

            if (!originalScene) {
                res.status(404).json({
                    success: false,
                    error: 'Original simulation scene not found'
                });
                timer.stop();
                return;
            }

            // Create a copy with new name
            const duplicatedSceneData = {
                ...originalScene,
                name: name || `${originalScene.name} (kopia)`,
                is_template: false,
                usage_count: 0
            };

            // Remove fields that shouldn't be copied
            delete (duplicatedSceneData as any)._id;
            delete (duplicatedSceneData as any).id;
            delete (duplicatedSceneData as any).created_at;
            delete (duplicatedSceneData as any).updated_at;

            const duplicatedScene = await this.databaseService.createSimulationScene(duplicatedSceneData);

            timer.stop();

            res.json({
                success: true,
                data: duplicatedScene,
                message: 'Simulation scene duplicated successfully'
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error duplicating simulation scene:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to duplicate simulation scene',
                details: error.message
            });
        }
    }
}

export default SceneBuilderController;

