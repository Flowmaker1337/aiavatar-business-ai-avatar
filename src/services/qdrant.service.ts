import {QdrantClient} from '@qdrant/js-client-rest';
import {QDRANT_URL, QDRANT_COLLECTION_NAME, QDRANT_API_KEY, getVectorDatabaseName} from '../config/env';
import {VectorData} from '../models/types';
import {BaseVectorDatabaseService} from './base-vector-database.service';
import vectorConfigService from './vector-config.service';

/**
 * Qdrant Vector Database Service
 * Extends BaseVectorDatabaseService for Qdrant-specific operations
 * Uses official @qdrant/js-client-rest library
 */
class QdrantService extends BaseVectorDatabaseService {
    private client: QdrantClient;

    constructor() {
        super();

        // Initialize official Qdrant client
        this.client = new QdrantClient({
            url: QDRANT_URL,
            ...(QDRANT_API_KEY && {apiKey: QDRANT_API_KEY})
        });
    }

    /**
     * Initialize Qdrant collection if it doesn't exist
     */
    private async ensureCollectionExists(): Promise<void> {
        try {
            // Check if collection exists
            const collections = await this.client.getCollections();
            const collectionExists = collections.collections.some(
                collection => collection.name === QDRANT_COLLECTION_NAME
            );

            if (collectionExists) {
                console.log(`[${getVectorDatabaseName()}] Collection '${QDRANT_COLLECTION_NAME}' already exists`);
            } else {
                // Collection doesn't exist, create it
                console.log(`[${getVectorDatabaseName()}] Creating collection '${QDRANT_COLLECTION_NAME}'`);
                await this.createCollection();
            }
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Error checking collection existence:`, error.message);
            throw error;
        }
    }

    /**
     * Create Qdrant collection with proper configuration
     */
    private async createCollection(): Promise<void> {
        try {
            await this.client.createCollection(QDRANT_COLLECTION_NAME, {
                vectors: {
                    size: vectorConfigService.getVectorSize(),
                    distance: 'Cosine'
                }
            });
            console.log(`[${getVectorDatabaseName()}] Successfully created collection '${QDRANT_COLLECTION_NAME}'`);
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Error creating collection:`, error.message);
            throw error;
        }
    }

    /**
     * Perform vector search in Qdrant
     */
    protected async performVectorSearch(queryEmbedding: number[]): Promise<any> {
        await this.ensureCollectionExists();

        return await this.client.search(QDRANT_COLLECTION_NAME, {
            vector: queryEmbedding,
            limit: vectorConfigService.getBestMatchingRecordsAmount(),
            with_payload: true,
            with_vector: false
        });
    }

    /**
     * Extract text from Qdrant search result
     */
    protected extractTextFromResult(result: any): string | null {
        return result.payload?.text || null;
    }

    /**
     * Extract score from Qdrant search result
     */
    protected extractScoreFromResult(result: any): number | null {
        return result.score || null;
    }

    /**
     * Extract metadata from Qdrant search result
     */
    protected extractMetadataFromResult(result: any): any {
        return result.payload || null;
    }

    /**
     * Perform upsert in Qdrant
     */
    protected async performUpsert(vectors: VectorData[]): Promise<number> {
        await this.ensureCollectionExists();

        // Convert VectorData to Qdrant format
        const qdrantPoints = vectors.map(vector => ({
            id: vector.id,
            vector: vector.values,
            payload: {
                category: vector.metadata.category,
                topic: vector.metadata.topic,
                text: vector.metadata.text,
                text_length: vector.metadata.text_length,
                token_count: vector.metadata.token_count,
                ...(vector.metadata.avatar_id && {avatar_id: vector.metadata.avatar_id})
            }
        }));

        // Upsert points in batches
        const batchSize = 100;
        let totalAdded = 0;

        for (let i = 0; i < qdrantPoints.length; i += batchSize) {
            const batch = qdrantPoints.slice(i, i + batchSize);

            try {
                await this.client.upsert(QDRANT_COLLECTION_NAME, {
                    points: batch
                });

                totalAdded += batch.length;
                console.log(`[${getVectorDatabaseName()}] Added batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(qdrantPoints.length / batchSize)} (${batch.length} vectors)`);
            } catch (error: any) {
                console.error(`[${getVectorDatabaseName()}] Error adding vectors:`, error.message);
                console.error(`[${getVectorDatabaseName()}] Error name:`, error.name);
                console.error(`[${getVectorDatabaseName()}] Error status:`, error.status);
                if (error.response) {
                    console.error(`[${getVectorDatabaseName()}] Error response status:`, error.response.status);
                    console.error(`[${getVectorDatabaseName()}] Error response data:`, JSON.stringify(error.response.data, null, 2));
                }
                if (error.data) {
                    console.error(`[${getVectorDatabaseName()}] Error data:`, JSON.stringify(error.data, null, 2));
                }
                throw error;
            }
        }

        return totalAdded;
    }

    /**
     * Perform delete all in Qdrant
     */
    protected async performDeleteAll(): Promise<boolean> {
        await this.ensureCollectionExists();

        await this.client.delete(QDRANT_COLLECTION_NAME, {
            filter: {}
        });

        return true;
    }

    /**
     * Perform delete by IDs in Qdrant
     */
    protected async performDeleteByIds(ids: string[]): Promise<boolean> {
        await this.ensureCollectionExists();

        await this.client.delete(QDRANT_COLLECTION_NAME, {
            points: ids
        });

        return true;
    }

    /**
     * Perform health check for Qdrant
     */
    protected async performHealthCheck(): Promise<boolean> {
        try {
            // Use Qdrant client health check
            await this.client.getCollections();
            return true;
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Health check failed:`, error.message);
            return false;
        }
    }

    /**
     * Get collection info
     * @returns Collection information
     */
    public async getCollectionInfo(): Promise<any> {
        try {
            await this.ensureCollectionExists();
            return await this.client.getCollection(QDRANT_COLLECTION_NAME);
        } catch (error: any) {
            console.error(`[${getVectorDatabaseName()}] Error getting collection info:`, error.message);
            throw error;
        }
    }
}

export default new QdrantService(); 