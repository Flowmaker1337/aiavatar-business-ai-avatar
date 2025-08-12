import { Request, Response } from 'express';
import CustomAvatarService from '../services/custom-avatar.service';
import { ExecutionTimerService } from '../services/execution-timer.service';

/**
 * CustomAvatarController - API endpoints dla zarządzania custom avatarami
 * Integruje Avatar Creator z Dashboard architecture
 */
export class CustomAvatarController {
    private customAvatarService: CustomAvatarService;

    constructor() {
        this.customAvatarService = CustomAvatarService.getInstance();
    }

    /**
     * POST /api/avatar/save
     * Zapisuje nowego custom avatara z Creator
     */
    public async saveAvatar(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('CustomAvatarController.saveAvatar');
        timer.start();

        try {
            const {
                name,
                description,
                personality,
                specialization,
                communication_style,
                background,
                knowledge_files,
                flows,
                intents
            } = req.body;

            // Walidacja wymaganych pól
            if (!name || !description) {
                res.status(400).json({
                    success: false,
                    error: 'Name and description are required'
                });
                timer.stop();
                return;
            }

            // Zapisz custom avatara
            const customAvatar = await this.customAvatarService.saveCustomAvatar({
                name,
                description,
                personality: personality || '',
                specialization: specialization || '',
                communication_style: communication_style || '',
                background: background || '',
                knowledge_files: knowledge_files || [],
                flows: flows || [],
                intents: intents || []
            });

            timer.stop();
            res.status(201).json({
                success: true,
                data: customAvatar,
                message: `Custom avatar '${customAvatar.name}' saved successfully`,
                processing_time_ms: timer.getElapsedTime()
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error saving custom avatar:', error);
            
            res.status(500).json({
                success: false,
                error: 'Internal server error while saving custom avatar'
            });
        }
    }

    /**
     * GET /api/avatars
     * Pobiera wszystkie custom avatary
     */
    public async getAllAvatars(req: Request, res: Response): Promise<void> {
        try {
            const avatars = await this.customAvatarService.getAllCustomAvatars();

            res.json({
                success: true,
                data: avatars, // Bezpośrednio array avatarów
                count: avatars.length
            });

        } catch (error) {
            console.error('❌ Error fetching custom avatars:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching avatars'
            });
        }
    }

    /**
     * GET /api/avatar/:id
     * Pobiera custom avatara po ID
     */
    public async getAvatarById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const avatar = await this.customAvatarService.getCustomAvatarById(id);

            if (!avatar) {
                res.status(404).json({
                    success: false,
                    error: 'Custom avatar not found'
                });
                return;
            }

            res.json({
                success: true,
                data: avatar
            });

        } catch (error) {
            console.error('❌ Error fetching custom avatar:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching avatar'
            });
        }
    }

    /**
     * PUT /api/avatar/:id
     * Aktualizuje custom avatara
     */
    public async updateAvatar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updates = req.body;

            const updatedAvatar = await this.customAvatarService.updateCustomAvatar(id, updates);

            if (!updatedAvatar) {
                res.status(404).json({
                    success: false,
                    error: 'Custom avatar not found'
                });
                return;
            }

            res.json({
                success: true,
                data: updatedAvatar,
                message: 'Custom avatar updated successfully'
            });

        } catch (error) {
            console.error('❌ Error updating custom avatar:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while updating avatar'
            });
        }
    }

    /**
     * DELETE /api/avatar/:id
     * Usuwa custom avatara
     */
    public async deleteAvatar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const deleted = await this.customAvatarService.deleteCustomAvatar(id);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Custom avatar not found'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Custom avatar deleted successfully'
            });

        } catch (error) {
            console.error('❌ Error deleting custom avatar:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while deleting avatar'
            });
        }
    }

    /**
     * POST /api/avatar/:id/activate
     * Aktywuje custom avatara
     */
    public async activateAvatar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const activatedAvatar = await this.customAvatarService.activateCustomAvatar(id);

            if (!activatedAvatar) {
                res.status(404).json({
                    success: false,
                    error: 'Custom avatar not found'
                });
                return;
            }

            res.json({
                success: true,
                data: activatedAvatar,
                message: 'Custom avatar activated successfully'
            });

        } catch (error) {
            console.error('❌ Error activating custom avatar:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while activating avatar'
            });
        }
    }

    /**
     * GET /api/avatar/:id/flows
     * Pobiera flows dla custom avatara
     */
    public async getAvatarFlows(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const flows = await this.customAvatarService.getAvatarFlows(id);

            res.json({
                success: true,
                data: {
                    flows,
                    count: flows.length
                }
            });

        } catch (error) {
            console.error('❌ Error fetching avatar flows:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching flows'
            });
        }
    }

    /**
     * GET /api/avatar/:id/intents
     * Pobiera intencje dla custom avatara
     */
    public async getAvatarIntents(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const intents = await this.customAvatarService.getAvatarIntents(id);

            res.json({
                success: true,
                data: {
                    intents,
                    count: intents.length
                }
            });

        } catch (error) {
            console.error('❌ Error fetching avatar intents:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching intents'
            });
        }
    }

    /**
     * GET /api/avatars/stats
     * Pobiera statystyki wszystkich custom avatarów
     */
    public async getAvatarsStats(req: Request, res: Response): Promise<void> {
        try {
            const avatars = await this.customAvatarService.getAllCustomAvatars();

            const stats = {
                total_avatars: avatars.length,
                active_avatars: avatars.filter(a => a.status === 'active').length,
                draft_avatars: avatars.filter(a => a.status === 'draft').length,
                archived_avatars: avatars.filter(a => a.status === 'archived').length,
                total_flows: avatars.reduce((sum, a) => sum + a.flows.length, 0),
                total_intents: avatars.reduce((sum, a) => sum + a.intents.length, 0),
                total_knowledge_files: avatars.reduce((sum, a) => sum + a.knowledge_files.length, 0),
                most_recent: avatars.length > 0 ? avatars[0] : null
            };

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('❌ Error fetching avatars stats:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching stats'
            });
        }
    }

    /**
     * Process knowledge files for avatar (convert to RAG vectors)
     */
    public async processKnowledgeFiles(req: Request, res: Response): Promise<void> {
        try {
            const { avatarId } = req.params;
            
            const result = await this.customAvatarService.processKnowledgeFiles(avatarId);
            
            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Knowledge files processed successfully',
                    data: {
                        total_vectors: result.totalVectors,
                        errors: result.errors
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to process knowledge files',
                    errors: result.errors
                });
            }
        } catch (error: any) {
            console.error('❌ Error processing knowledge files:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    /**
     * Upload and add knowledge file to avatar (placeholder - requires multer setup)
     */
    public async uploadKnowledgeFile(req: Request, res: Response): Promise<void> {
        try {
            const { avatarId } = req.params;
            const { fileName, fileType, fileSize, fileContent } = req.body;
            
            if (!fileName || !fileType || !fileContent) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: fileName, fileType, fileContent'
                });
                return;
            }

            // Create KnowledgeFile object
            const knowledgeFile = {
                id: `${Date.now()}_${fileName}`,
                name: fileName,
                original_name: fileName,
                file_type: fileType,
                file_size: fileSize || fileContent.length,
                uploaded_at: Date.now(),
                processed: false,
                processing_status: 'pending' as const,
                content_preview: fileContent.substring(0, 100),
                vector_ids: []
            };

            // Convert fileContent to Buffer (assuming base64 encoded)
            const fileBuffer = Buffer.from(fileContent, 'base64');

            const result = await this.customAvatarService.addKnowledgeFileToAvatar(
                avatarId, 
                knowledgeFile, 
                fileBuffer
            );

            if (result.success) {
                res.status(200).json({
                    success: true,
                    message: 'Knowledge file uploaded and processed successfully',
                    data: {
                        file_id: knowledgeFile.id,
                        vector_count: result.vectorCount
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to process knowledge file',
                    error: result.error
                });
            }

        } catch (error: any) {
            console.error('❌ Error uploading knowledge file:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

export default CustomAvatarController;
