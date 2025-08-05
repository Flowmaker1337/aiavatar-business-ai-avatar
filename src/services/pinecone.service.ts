import {Index, Pinecone} from '@pinecone-database/pinecone';
import {
    PINECONE_API_KEY,
    PINECONE_ENVIRONMENT,
    PINECONE_PROJECT_ID,
    PINECONE_INDEX_NAME,
    getVectorDatabaseName
} from '../config/env';
import { VectorData } from '../models/types';
import { BaseVectorDatabaseService } from './base-vector-database.service';
import vectorConfigService from './vector-config.service';

/**
 * Pinecone Vector Database Service
 * Extends BaseVectorDatabaseService for Pinecone-specific operations
 */
class PineconeService extends BaseVectorDatabaseService {
    private client: Pinecone;
    private index: Index;

    constructor() {
        super();
        this.client = new Pinecone({
            apiKey: PINECONE_API_KEY,
            environment: PINECONE_ENVIRONMENT,
            projectId: PINECONE_PROJECT_ID
        });

        this.index = this.client.Index(PINECONE_INDEX_NAME);        
    }

    /**
     * Perform vector search in Pinecone
     */
    protected async performVectorSearch(queryEmbedding: number[]): Promise<any> {
        const queryResponse = await this.index.query({
            vector: queryEmbedding,
            topK: vectorConfigService.getBestMatchingRecordsAmount(),
            includeValues: false,
            includeMetadata: true
        });

        return queryResponse.matches;
    }

    /**
     * Extract text from Pinecone search result
     */
    protected extractTextFromResult(result: any): string | null {
        return result.metadata?.text || null;
    }

    /**
     * Extract score from Pinecone search result
     */
    protected extractScoreFromResult(result: any): number | null {
        return result.score || null;
    }

    /**
     * Extract metadata from Pinecone search result
     */
    protected extractMetadataFromResult(result: any): any {
        return result.metadata || null;
    }

    /**
     * Perform upsert in Pinecone
     */
    protected async performUpsert(vectors: VectorData[]): Promise<number> {
        // Convert VectorData to Pinecone format
        const pineconeVectors = vectors.map(vector => ({
            id: vector.id, // Already string UUID format
            values: vector.values,
            metadata: {
                category: vector.metadata.category,
                topic: vector.metadata.topic,
                text: vector.metadata.text,
                text_length: vector.metadata.text_length,
                token_count: vector.metadata.token_count,
                ...(vector.metadata.avatar_id && { avatar_id: vector.metadata.avatar_id })
            }
        }));

        await this.index.upsert(pineconeVectors);
        return vectors.length;
    }

    /**
     * Perform delete all in Pinecone
     */
    protected async performDeleteAll(): Promise<boolean> {
        await this.index.deleteAll();
        return true;
    }

    /**
     * Perform delete by IDs in Pinecone
     */
    protected async performDeleteByIds(ids: string[]): Promise<boolean> {
        try {
            // IDs are already strings (UUID format)
            await this.index.deleteMany(ids);
            return true;
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Error deleting vectors by IDs:`, error.message);
            return false;
        }
    }

    /**
     * Perform health check for Pinecone
     */
    protected async performHealthCheck(): Promise<boolean> {
        try {
            // Try to describe the index to check if it's accessible
            await this.index.describeIndexStats();
            return true;
        } catch (error: any) {
            return false;
        }
    }
}

export default new PineconeService(); 