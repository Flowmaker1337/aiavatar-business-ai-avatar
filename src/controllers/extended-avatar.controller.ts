// ============ EXTENDED AVATAR CONTROLLER ============

import { Request, Response } from 'express';
import ExtendedDatabaseService from '../services/extended-database.service';
import { ExtendedAvatar } from '../models/auth-types';

export class ExtendedAvatarController {
    private extendedDb: ExtendedDatabaseService;

    constructor() {
        this.extendedDb = ExtendedDatabaseService.getInstance();
    }

    // Get all avatars for authenticated user
    public getUserAvatars = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const avatars = await this.extendedDb.getAvatarsByUserId(userId);
            
            res.json({
                success: true,
                avatars,
                count: avatars.length
            });
        } catch (error) {
            console.error('Error fetching user avatars:', error);
            res.status(500).json({ 
                error: 'Failed to fetch avatars',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Get all demo avatars (public)
    public getDemoAvatars = async (req: Request, res: Response): Promise<void> => {
        try {
            const demoAvatars = await this.extendedDb.getDemoAvatars();
            
            res.json({
                success: true,
                avatars: demoAvatars,
                count: demoAvatars.length
            });
        } catch (error) {
            console.error('Error fetching demo avatars:', error);
            res.status(500).json({ 
                error: 'Failed to fetch demo avatars',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Get specific avatar by ID
    public getAvatarById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.userId;

            const avatar = await this.extendedDb.getAvatarById(id);
            if (!avatar) {
                res.status(404).json({ error: 'Avatar not found' });
                return;
            }

            // Check ownership for non-demo avatars
            if (avatar.type !== 'demo' && avatar.user_id !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            res.json({
                success: true,
                avatar
            });
        } catch (error) {
            console.error('Error fetching avatar:', error);
            res.status(500).json({ 
                error: 'Failed to fetch avatar',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Create new avatar
    public createAvatar = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const {
                name,
                description,
                type = 'custom',
                personality,
                specialization,
                communication_style,
                background,
                category = 'general',
                tags = []
            } = req.body;

            // Validate required fields
            if (!name || !description || !personality) {
                res.status(400).json({ 
                    error: 'Missing required fields: name, description, personality' 
                });
                return;
            }

            // Create avatar data
            const avatarData = {
                user_id: userId,
                name,
                description,
                type: type as 'custom' | 'reactive',
                status: 'draft' as const,
                personality,
                specialization: specialization || '',
                communication_style: communication_style || 'professional',
                background: background || '',
                is_public: false,
                is_template: false,
                knowledge_files: [],
                flows: [],
                intents: [],
                usage_stats: {
                    total_conversations: 0,
                    total_messages: 0,
                    average_conversation_length: 0,
                    most_used_flows: [],
                    most_triggered_intents: [],
                    last_used: new Date(),
                    success_rate: 0,
                    user_satisfaction_rating: 0,
                    performance_metrics: {
                        avg_response_time_ms: 0,
                        intent_accuracy: 0,
                        flow_completion_rate: 0
                    }
                },
                tags: Array.isArray(tags) ? tags : [],
                category
            };

            const newAvatar = await this.extendedDb.createAvatar(avatarData);

            res.status(201).json({
                success: true,
                avatar: newAvatar,
                message: 'Avatar created successfully'
            });

        } catch (error) {
            console.error('Error creating avatar:', error);
            res.status(500).json({ 
                error: 'Failed to create avatar',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Copy demo avatar to user account
    public copyDemoAvatar = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const { sourceAvatarId, name, customizations = {} } = req.body;

            if (!sourceAvatarId) {
                res.status(400).json({ error: 'Source avatar ID is required' });
                return;
            }

            // Verify source is a demo avatar
            const sourceAvatar = await this.extendedDb.getAvatarById(sourceAvatarId);
            if (!sourceAvatar || sourceAvatar.type !== 'demo') {
                res.status(400).json({ error: 'Source must be a demo avatar' });
                return;
            }

            // Copy avatar with customizations
            const copiedAvatar = await this.extendedDb.copyDemoAvatar(
                sourceAvatarId,
                userId,
                {
                    name: name || `${sourceAvatar.name} (Kopia)`,
                    ...customizations
                }
            );

            res.status(201).json({
                success: true,
                avatar: copiedAvatar,
                message: 'Demo avatar copied successfully'
            });

        } catch (error) {
            console.error('Error copying demo avatar:', error);
            res.status(500).json({ 
                error: 'Failed to copy demo avatar',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Update avatar
    public updateAvatar = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            // Check if avatar exists and user owns it
            const existingAvatar = await this.extendedDb.getAvatarById(id);
            if (!existingAvatar) {
                res.status(404).json({ error: 'Avatar not found' });
                return;
            }

            if (existingAvatar.user_id !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            // Update avatar
            const updateData = {
                ...req.body,
                updated_at: new Date()
            };

            // Remove fields that shouldn't be updated directly
            delete updateData._id;
            delete updateData.id;
            delete updateData.user_id;
            delete updateData.created_at;

            const result = await this.extendedDb.updateAvatar(id, updateData);
            if (!result) {
                res.status(500).json({ error: 'Failed to update avatar' });
                return;
            }

            const updatedAvatar = await this.extendedDb.getAvatarById(id);

            res.json({
                success: true,
                avatar: updatedAvatar,
                message: 'Avatar updated successfully'
            });

        } catch (error) {
            console.error('Error updating avatar:', error);
            res.status(500).json({ 
                error: 'Failed to update avatar',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Delete avatar
    public deleteAvatar = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            // Check if avatar exists and user owns it
            const existingAvatar = await this.extendedDb.getAvatarById(id);
            if (!existingAvatar) {
                res.status(404).json({ error: 'Avatar not found' });
                return;
            }

            if (existingAvatar.user_id !== userId) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            // Don't allow deleting demo avatars
            if (existingAvatar.type === 'demo') {
                res.status(400).json({ error: 'Cannot delete demo avatars' });
                return;
            }

            const result = await this.extendedDb.deleteAvatar(id);
            if (!result) {
                res.status(500).json({ error: 'Failed to delete avatar' });
                return;
            }

            res.json({
                success: true,
                message: 'Avatar deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting avatar:', error);
            res.status(500).json({ 
                error: 'Failed to delete avatar',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    // Get avatar statistics
    public getAvatarStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                res.status(401).json({ error: 'User not authenticated' });
                return;
            }

            const avatars = await this.extendedDb.getAvatarsByUserId(userId);
            
            const stats = {
                total_avatars: avatars.length,
                active_avatars: avatars.filter((a: ExtendedAvatar) => a.status === 'active').length,
                draft_avatars: avatars.filter((a: ExtendedAvatar) => a.status === 'draft').length,
                archived_avatars: avatars.filter((a: ExtendedAvatar) => a.status === 'archived').length,
                with_flows: avatars.filter((a: ExtendedAvatar) => a.flows && a.flows.length > 0).length,
                reactive_only: avatars.filter((a: ExtendedAvatar) => a.type === 'reactive').length,
                total_conversations: avatars.reduce((sum: number, a: ExtendedAvatar) => sum + (a.usage_stats?.total_conversations || 0), 0),
                total_messages: avatars.reduce((sum: number, a: ExtendedAvatar) => sum + (a.usage_stats?.total_messages || 0), 0),
                categories: [...new Set(avatars.map((a: ExtendedAvatar) => a.category))],
                most_used: avatars
                    .sort((a: ExtendedAvatar, b: ExtendedAvatar) => (b.usage_stats?.total_conversations || 0) - (a.usage_stats?.total_conversations || 0))
                    .slice(0, 5)
                    .map((a: ExtendedAvatar) => ({ id: a.id, name: a.name, conversations: a.usage_stats?.total_conversations || 0 }))
            };

            res.json({
                success: true,
                stats
            });

        } catch (error) {
            console.error('Error fetching avatar stats:', error);
            res.status(500).json({ 
                error: 'Failed to fetch avatar statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}
