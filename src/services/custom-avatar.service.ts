import { v4 as uuidv4 } from 'uuid';
import { CustomAvatar, KnowledgeFile, CustomFlow, CustomIntent, AvatarUsageStats } from '../models/types';
import DatabaseService from './database.service';
import KnowledgeFileProcessor from './knowledge-file-processor.service';
import { ExecutionTimerService } from './execution-timer.service';
import vectorDatabaseService from './vector-database.service';

/**
 * CustomAvatarService - zarządzanie custom avatarami stworzonych w Creator
 * Integruje się z istniejącą architekturą Dashboard (FlowManager, IntentClassifier)
 */
export class CustomAvatarService {
    private static instance: CustomAvatarService;
    private databaseService = DatabaseService.getInstance();
    private knowledgeProcessor = KnowledgeFileProcessor.getInstance();
    private vectorDatabaseService = vectorDatabaseService;
    private collection = 'custom_avatars';

    constructor() {
        // Singleton instance
    }

    public static getInstance(): CustomAvatarService {
        if (!CustomAvatarService.instance) {
            CustomAvatarService.instance = new CustomAvatarService();
        }
        return CustomAvatarService.instance;
    }

    /**
     * Zapisuje nowego custom avatara do bazy danych
     */
    public async saveCustomAvatar(avatarData: {
        name: string;
        description: string;
        personality: string;
        specialization: string;
        communication_style: string;
        background: string;
        knowledge_files: any[];
        flows: any[];
        intents: any[];
    }): Promise<CustomAvatar> {
        const timer = new ExecutionTimerService('CustomAvatarService.saveCustomAvatar');
        timer.start();

        try {
            const customAvatar: CustomAvatar = {
                id: uuidv4(),
                name: avatarData.name,
                description: avatarData.description,
                personality: avatarData.personality,
                specialization: avatarData.specialization,
                communication_style: avatarData.communication_style,
                background: avatarData.background,
                avatar_type: 'custom',
                created_at: Date.now(),
                updated_at: Date.now(),
                status: 'draft',
                
                // Konwertuj knowledge files
                knowledge_files: avatarData.knowledge_files.map(file => this.convertToKnowledgeFile(file)),
                
                // Konwertuj intents first
                intents: avatarData.intents.map(intent => this.convertToCustomIntent(intent)),
                
                // Konwertuj flows (with intent linking)
                flows: avatarData.flows.map(flow => this.convertToCustomFlow(flow, avatarData.intents)),
                
                usage_stats: {
                    total_conversations: 0,
                    total_messages: 0,
                    average_conversation_length: 0,
                    most_used_flows: [],
                    most_triggered_intents: [],
                    last_used: Date.now()
                }
            };

            // Zapisz do bazy danych
            await this.databaseService.create(this.collection, customAvatar);

            timer.stop();
            console.log(`✅ Custom avatar saved: ${customAvatar.name} (${customAvatar.id})`);
            
            return customAvatar;

        } catch (error) {
            timer.stop();
            console.error('❌ Error saving custom avatar:', error);
            throw error;
        }
    }

    /**
     * Pobiera wszystkie custom avatary
     */
    public async getAllCustomAvatars(): Promise<CustomAvatar[]> {
        try {
            const avatars = await this.databaseService.findAll<CustomAvatar>(this.collection);
            return avatars.sort((a: CustomAvatar, b: CustomAvatar) => b.updated_at - a.updated_at);
        } catch (error) {
            console.error('❌ Error fetching custom avatars:', error);
            return [];
        }
    }

    /**
     * Pobiera custom avatara po ID
     */
    public async getCustomAvatarById(avatarId: string): Promise<CustomAvatar | null> {
        try {
            return await this.databaseService.findById<CustomAvatar>(this.collection, avatarId);
        } catch (error) {
            console.error(`❌ Error fetching custom avatar ${avatarId}:`, error);
            return null;
        }
    }

    /**
     * Aktualizuje custom avatara
     */
    public async updateCustomAvatar(avatarId: string, updates: Partial<CustomAvatar>): Promise<CustomAvatar | null> {
        try {
            const updatedAvatar = await this.databaseService.update<CustomAvatar>(
                this.collection, 
                avatarId, 
                { ...updates, updated_at: Date.now() }
            );

            console.log(`✅ Custom avatar updated: ${avatarId}`);
            return updatedAvatar;
        } catch (error) {
            console.error(`❌ Error updating custom avatar ${avatarId}:`, error);
            return null;
        }
    }

    /**
     * Usuwa custom avatara
     */
    // deleteCustomAvatar method moved to end of class with enhanced functionality

    /**
     * Aktywuje custom avatara (zmienia status na 'active')
     */
    public async activateCustomAvatar(avatarId: string): Promise<CustomAvatar | null> {
        return this.updateCustomAvatar(avatarId, { 
            status: 'active',
            updated_at: Date.now()
        });
    }

    /**
     * Pobiera flows dla custom avatara
     */
    public async getAvatarFlows(avatarId: string): Promise<CustomFlow[]> {
        const avatar = await this.getCustomAvatarById(avatarId);
        return avatar ? avatar.flows : [];
    }

    /**
     * Pobiera intencje dla custom avatara
     */
    public async getAvatarIntents(avatarId: string): Promise<CustomIntent[]> {
        const avatar = await this.getCustomAvatarById(avatarId);
        return avatar ? avatar.intents : [];
    }

    /**
     * Aktualizuje statystyki użycia avatara
     */
    public async updateUsageStats(avatarId: string, stats: Partial<AvatarUsageStats>): Promise<void> {
        try {
            const avatar = await this.getCustomAvatarById(avatarId);
            if (avatar && avatar.usage_stats) {
                const updatedStats: AvatarUsageStats = { 
                    ...avatar.usage_stats, 
                    ...stats 
                };
                await this.updateCustomAvatar(avatarId, { usage_stats: updatedStats });
            }
        } catch (error) {
            console.error(`❌ Error updating usage stats for avatar ${avatarId}:`, error);
        }
    }

    // ============ PRIVATE HELPER METHODS ============

    private convertToKnowledgeFile(file: any): KnowledgeFile {
        return {
            id: uuidv4(),
            name: file.name,
            original_name: file.name,
            file_type: file.type,
            file_size: file.size,
            uploaded_at: Date.now(),
            processed: false,
            processing_status: 'pending',
            content_preview: file.name.substring(0, 100),
            vector_ids: []
        };
    }

    private convertToCustomFlow(flow: any, intents: any[] = []): CustomFlow {
        // Znajdź intents które używają tego flow
        const relatedIntents = intents
            .filter(intent => intent.flow_name === flow.name)
            .map(intent => intent.name);

        return {
            id: flow.id || uuidv4(),
            name: flow.name,
            description: flow.description,
            steps: flow.steps || [],
            entry_intents: relatedIntents.length > 0 ? relatedIntents : (flow.entry_intents || []),
            priority: flow.priority || 5,
            success_criteria: flow.success_criteria || [],
            max_duration: flow.max_duration || 3600,
            repeatable: flow.repeatable !== false,
            created_from: flow.created_from || 'ai_generated'
        };
    }

    private convertToCustomIntent(intent: any): CustomIntent {
        return {
            name: intent.name,
            description: intent.description || '',
            keywords: intent.keywords || [],
            examples: intent.examples || [],
            requires_flow: intent.requires_flow || false,
            flow_name: intent.flow_name,
            repeatable: intent.repeatable !== false,
            priority: intent.priority || 5,
            system_prompt: intent.system_prompt,
            user_prompt_template: intent.user_prompt_template,
            confidence_threshold: intent.confidence_threshold || 0.7,
            created_from: intent.created_from || 'ai_generated'
        };
    }

    /**
     * Przetwarza knowledge files dla avatara na RAG vectors
     */
    public async processKnowledgeFiles(avatarId: string): Promise<{ success: boolean; totalVectors: number; errors: string[] }> {
        try {
            const avatar = await this.getCustomAvatarById(avatarId);
            if (!avatar) {
                throw new Error(`Avatar ${avatarId} not found`);
            }

            console.log(`🔄 Processing ${avatar.knowledge_files.length} knowledge files for avatar: ${avatar.name}`);

            // Process all knowledge files
            const result = await this.knowledgeProcessor.processAllKnowledgeFiles(avatar.knowledge_files, avatarId);

            // Update avatar with processing results
            const updatedKnowledgeFiles = avatar.knowledge_files.map(file => ({
                ...file,
                processed: true,
                processing_status: 'completed' as const
            }));

            await this.updateCustomAvatar(avatarId, {
                knowledge_files: updatedKnowledgeFiles,
                updated_at: Date.now()
            });

            console.log(`✅ Processed knowledge files for avatar ${avatar.name}: ${result.totalVectors} vectors`);

            return {
                success: true,
                totalVectors: result.totalVectors,
                errors: result.errors
            };

        } catch (error: any) {
            console.error(`❌ Error processing knowledge files for avatar ${avatarId}:`, error);
            return {
                success: false,
                totalVectors: 0,
                errors: [error.message]
            };
        }
    }

    /**
     * Dodaje knowledge file do avatara i przetwarza go na vectors
     */
    public async addKnowledgeFileToAvatar(
        avatarId: string, 
        file: KnowledgeFile, 
        fileBuffer: Buffer
    ): Promise<{ success: boolean; vectorCount: number; error?: string }> {
        try {
            // Save file to upload directory
            await this.knowledgeProcessor.saveFileToUploadDir(file, fileBuffer);

            // Process file to vectors
            const result = await this.knowledgeProcessor.processKnowledgeFile(file, avatarId, fileBuffer);

            if (result.success) {
                // Add file to avatar's knowledge_files
                const avatar = await this.getCustomAvatarById(avatarId);
                if (avatar) {
                    const updatedKnowledgeFiles = [
                        ...avatar.knowledge_files,
                        {
                            ...file,
                            processed: true,
                            processing_status: 'completed' as const
                        }
                    ];

                    await this.updateCustomAvatar(avatarId, {
                        knowledge_files: updatedKnowledgeFiles,
                        updated_at: Date.now()
                    });
                }
            }

            return result;

        } catch (error: any) {
            console.error(`❌ Error adding knowledge file to avatar ${avatarId}:`, error);
            return { success: false, vectorCount: 0, error: error.message };
        }
    }

    /**
     * Deletes a custom avatar and all associated data (vectors, files, etc.)
     */
    public async deleteCustomAvatar(avatarId: string): Promise<{ success: boolean; deletedVectors?: number; error?: string }> {
        const timer = new ExecutionTimerService('CustomAvatarService.deleteCustomAvatar');
        timer.start();

        try {
            console.log(`🗑️ Deleting custom avatar: ${avatarId}`);

            // Get avatar data first
            const avatar = await this.getCustomAvatarById(avatarId);
            if (!avatar) {
                return { success: false, error: 'Avatar not found' };
            }

            let deletedVectors = 0;

            // TODO: Delete vectors from vector database if avatar has knowledge files
            // For now, we skip vector deletion as we don't have a method to delete by source
            if (avatar.knowledge_files && avatar.knowledge_files.length > 0) {
                console.log(`⚠️ Avatar ${avatarId} has ${avatar.knowledge_files.length} knowledge files`);
                console.log(`⚠️ Vector deletion not implemented yet - vectors will remain in database`);
                // In the future, we could:
                // 1. Query vectors by metadata.source === avatarId
                // 2. Get their IDs and use deleteVectorsByIds()
            }

            // Delete avatar from database
            const deleteResult = await this.databaseService.delete(this.collection, avatarId);
            
            if (!deleteResult) {
                return { success: false, error: 'Failed to delete avatar from database' };
            }

            timer.stop();
            console.log(`✅ Successfully deleted custom avatar: ${avatar.name} (${avatarId})`);
            
            return { 
                success: true, 
                deletedVectors 
            };

        } catch (error: any) {
            timer.stop();
            console.error(`❌ Error deleting custom avatar ${avatarId}:`, error);
            return { success: false, error: error.message };
        }
    }
}

export default CustomAvatarService;
