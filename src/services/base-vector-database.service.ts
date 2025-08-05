import { VectorDatabaseService, VectorData, VectorDatabaseHealth } from '../models/types';
import { ExecutionTimerService } from "./execution-timer.service";
import openaiService from './openai.service';
import vectorConfigService from './vector-config.service';
import { getVectorDatabaseName } from '../config/env';

/**
 * Base class for vector database services
 * Provides common functionality and abstract methods for specific implementations
 */
export abstract class BaseVectorDatabaseService implements VectorDatabaseService {
    /**
     * Abstract method to perform vector search in specific database
     */
    protected abstract performVectorSearch(queryEmbedding: number[]): Promise<any>;

    /**
     * Abstract method to extract text from search result
     */
    protected abstract extractTextFromResult(result: any): string | null;

    /**
     * Abstract method to extract score from search result
     */
    protected abstract extractScoreFromResult(result: any): number | null;

    /**
     * Abstract method to extract metadata from search result
     */
    protected abstract extractMetadataFromResult(result: any): any;

    /**
     * Abstract method to upsert vectors in specific database
     */
    protected abstract performUpsert(vectors: VectorData[]): Promise<number>;

    /**
     * Abstract method to delete all vectors from specific database
     */
    protected abstract performDeleteAll(): Promise<boolean>;

    /**
     * Abstract method to delete specific vectors by IDs
     */
    protected abstract performDeleteByIds(ids: string[]): Promise<boolean>;

    /**
     * Abstract method to check database health
     */
    protected abstract performHealthCheck(): Promise<boolean>;

    /**
     * Convert VectorData to common format for logging
     */
    protected convertVectorDataToLogFormat(vector: VectorData): any {
        return {
            id: vector.id,
            category: vector.metadata.category,
            topic: vector.metadata.topic,
            text_length: vector.metadata.text_length,
            token_count: vector.metadata.token_count,
            ...(vector.metadata.avatar_id && { avatar_id: vector.metadata.avatar_id })
        };
    }

    /**
     * Common query knowledge base implementation
     */
    public async queryKnowledgeBase(query: string): Promise<string[]> {
        const executionTimerService = new ExecutionTimerService(`queryKnowledgeBase in ${getVectorDatabaseName()}`);
        
        try {
            // Generate embeddings for user query
            const queryEmbedding = await openaiService.generateEmbeddings(query);

            executionTimerService.start();

            // Perform search in specific database
            const searchResults = await this.performVectorSearch(queryEmbedding);

            if (searchResults && searchResults.length > 0) {
                const result: string[] = [];

                for (const match of searchResults) {
                    const score = this.extractScoreFromResult(match);
                    const metadata = this.extractMetadataFromResult(match);
                    const text = this.extractTextFromResult(match);

                    console.log(`[${getVectorDatabaseName()}] Found match with score: ${score}`);
                    
                    if (metadata) {
                        console.log(`[${getVectorDatabaseName()}] Topic: ${metadata.topic}`);
                        console.log(`[${getVectorDatabaseName()}] Category: ${metadata.category}`);
                    }
                    
                    if (typeof text === 'string' && text.trim() !== '') {
                        console.log(`[${getVectorDatabaseName()}] Text: ${text}`);
                        if (vectorConfigService.validateSearchResult(score)) {
                            result.push(text);
                        } else {
                            console.warn(`[${getVectorDatabaseName()}] This record has too low similarity and was not added to result. Score: ${score} (required min. ${vectorConfigService.getMinimumScoreThreshold()})`);
                        }
                    } else {
                        console.warn(`[${getVectorDatabaseName()}] Text field in result does not exist or has empty value. This record was not added to result.`);
                    }
                }

                executionTimerService.stop();
                return result;
            } else {
                executionTimerService.stop();
                console.log(`[${getVectorDatabaseName()}] No matches found for query.`);
                return [];
            }
        } catch (error: any) {
            executionTimerService.stop();
            console.error(`[${getVectorDatabaseName()}] Error querying knowledge base:`, error.message);
            return [];
        }
    }

    /**
     * Common upsert vectors implementation
     */
    public async upsertVectors(vectors: VectorData[]): Promise<number> {
        try {
            if (vectors.length === 0) {
                console.log(`[${getVectorDatabaseName()}] No vectors to add.`);
                return 0;
            }

            const totalAdded = await this.performUpsert(vectors);
            console.log(`[${getVectorDatabaseName()}] Successfully added ${totalAdded} vectors.`);
            return totalAdded;
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Error adding vectors:`, error.message);
            throw error;
        }
    }

    /**
     * Common delete all vectors implementation
     */
    public async deleteAllVectors(): Promise<boolean> {
        try {
            await this.performDeleteAll();
            console.log(`[${getVectorDatabaseName()}] Successfully deleted all vectors.`);
            return true;
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Error deleting vectors:`, error.message);
            throw error;
        }
    }

    /**
     * Common delete vectors by IDs implementation
     */
    public async deleteVectorsByIds(ids: string[]): Promise<boolean> {
        try {
            if (ids.length === 0) {
                console.log(`[${getVectorDatabaseName()}] No IDs to delete.`);
                return true;
            }

            await this.performDeleteByIds(ids);
            console.log(`[${getVectorDatabaseName()}] Successfully deleted ${ids.length} vectors.`);
            return true;
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Error deleting vectors:`, error.message);
            throw error;
        }
    }

    /**
     * Common health status implementation
     */
    public async getHealthStatus(): Promise<boolean> {
        try {
            const isHealthy = await this.performHealthCheck();
            if (!isHealthy) {
                console.error(`[${getVectorDatabaseName()}] Health check failed`);
            }
            return isHealthy;
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Health check failed:`, error.message);
            return false;
        }
    }

    /**
     * Common detailed health status implementation
     */
    public async getDetailedHealthStatus(): Promise<VectorDatabaseHealth> {
        const isHealthy = await this.getHealthStatus();
        return {
            databaseType: getVectorDatabaseName(),
            isHealthy,
            message: isHealthy ? 'Database is operational' : 'Database is not responding',
            timestamp: new Date()
        };
    }
} 