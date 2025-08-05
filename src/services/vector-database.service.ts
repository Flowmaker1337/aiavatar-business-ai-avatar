import { VectorDatabaseService, VectorData, VectorDatabaseHealth } from '../models/types';
import { getVectorDatabaseName } from '../config/env';
import { BaseVectorUploadService } from './base-vector-upload.service';
import { BaseVectorClearService, ClearCommand } from './base-vector-clear.service';

/**
 * Vector Database Adapter Service
 * Provides unified interface for vector database operations
 * Automatically selects between Pinecone and Qdrant based on configuration
 */
class VectorDatabaseAdapterService implements VectorDatabaseService {
    private vectorDbService!: VectorDatabaseService;
    private isInitialized: boolean = false;

    constructor() {
        // Don't initialize immediately - use lazy loading
    }

    /**
     * Initialize vector database service based on configuration (lazy loading)
     */
    private async initializeVectorDatabase(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        const databaseName = getVectorDatabaseName();
        switch (databaseName) {
            case 'pinecone':
                // Dynamic import to avoid loading Pinecone when using Qdrant
                const { default: pineconeService } = await import('./pinecone.service');
                this.vectorDbService = pineconeService;
                console.log('[VECTOR-DB] Using Pinecone as vector database');
                break;
            case 'qdrant':
                // Dynamic import to avoid loading Qdrant when using Pinecone
                const { default: qdrantService } = await import('./qdrant.service');
                this.vectorDbService = qdrantService;
                console.log('[VECTOR-DB] Using Qdrant as vector database');
                break;
            default:
                console.warn(`[VECTOR-DB] Unknown vector database type: ${databaseName}, defaulting to Qdrant`);
                const { default: defaultQdrantService } = await import('./qdrant.service');
                this.vectorDbService = defaultQdrantService;
        }

        this.isInitialized = true;
    }

    /**
     * Ensure service is initialized before use
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.initializeVectorDatabase();
        }
    }


    /**
     * Query knowledge base for similar vectors
     * @param query User query text
     * @returns Array of matching text chunks
     */
    public async queryKnowledgeBase(query: string): Promise<string[]> {
        await this.ensureInitialized();
        try {
            console.log(`[VECTOR-DB] Querying ${getVectorDatabaseName()} knowledge base`);
            return await this.vectorDbService.queryKnowledgeBase(query);
        } catch (error: any) {
            console.error(`[VECTOR-DB] Error querying ${getVectorDatabaseName()} knowledge base:`, error.message);
            return [];
        }
    }

    /**
     * Add or update vectors in the database
     * @param vectors Array of vectors to upsert
     * @returns Number of successfully added vectors
     */
    public async upsertVectors(vectors: VectorData[]): Promise<number> {
        await this.ensureInitialized();
        try {
            console.log(`[VECTOR-DB] Upserting ${vectors.length} vectors to ${getVectorDatabaseName()}`);
            return await this.vectorDbService.upsertVectors(vectors);
        } catch (error: any) {
            console.error(`[VECTOR-DB] Error upserting vectors to ${getVectorDatabaseName()}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete all vectors from the database
     * @returns Success status
     */
    public async deleteAllVectors(): Promise<boolean> {
        await this.ensureInitialized();
        try {
            console.log(`[VECTOR-DB] Deleting all vectors from ${getVectorDatabaseName()}`);
            return await this.vectorDbService.deleteAllVectors();
        } catch (error: any) {
            console.error(`[VECTOR-DB] Error deleting all vectors from ${getVectorDatabaseName()}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete specific vectors by IDs
     * @param ids Array of vector IDs to delete
     * @returns Success status
     */
    public async deleteVectorsByIds(ids: string[]): Promise<boolean> {
        await this.ensureInitialized();
        try {
            console.log(`[VECTOR-DB] Deleting ${ids.length} vectors from ${getVectorDatabaseName()}`);
            return await this.vectorDbService.deleteVectorsByIds(ids);
        } catch (error: any) {
            console.error(`[VECTOR-DB] Error deleting vectors from ${getVectorDatabaseName()}:`, error.message);
            throw error;
        }
    }

    /**
     * Get database health status
     * @returns Health status
     */
    public async getHealthStatus(): Promise<boolean> {
        await this.ensureInitialized();
        return await this.vectorDbService.getHealthStatus();
    }

    /**
     * Get detailed health information
     * @returns Detailed health status with database type, message and timestamp
     */
    public async getDetailedHealthStatus(): Promise<VectorDatabaseHealth> {
        await this.ensureInitialized();
        return await this.vectorDbService.getDetailedHealthStatus();
    }

    /**
     * Centralized upload function that automatically uses the configured vector database
     * @param filePath Optional path to JSON file
     */
    public async uploadData(filePath?: string): Promise<void> {
        await this.ensureInitialized();
        // Create upload service instance for current database
        const uploadService = new GenericVectorUploadService(this.vectorDbService);
        await uploadService.uploadData(filePath);
    }

    /**
     * Centralized clear function that automatically uses the configured vector database
     * @param command Clear command (clear-all, preview, duplicates)
     */
    public async clearData(command: ClearCommand = 'clear-all'): Promise<void> {
        await this.ensureInitialized();
        // Create clear service instance for current database
        const clearService = new GenericVectorClearService(this.vectorDbService);
        await clearService.executeCommand(command);
    }
}

/**
 * Generic upload service that works with any vector database service
 */
class GenericVectorUploadService extends BaseVectorUploadService {
    protected vectorService: VectorDatabaseService;

    constructor(vectorService: VectorDatabaseService) {
        super();
        this.vectorService = vectorService;
    }

    protected async performPreUploadChecks(): Promise<void> {
        const isHealthy = await this.vectorService.getHealthStatus();
        if (!isHealthy) {
            throw new Error(`${getVectorDatabaseName()} database is not accessible. Please check your configuration.`);
        }
        console.log(`✅ ${getVectorDatabaseName()} database is accessible`);
    }
}

/**
 * Generic clear service that works with any vector database service
 */
class GenericVectorClearService extends BaseVectorClearService {
    protected vectorService: VectorDatabaseService;

    constructor(vectorService: VectorDatabaseService) {
        super();
        this.vectorService = vectorService;
    }

    protected async performPreClearChecks(): Promise<boolean> {
        const isHealthy = await this.checkDatabaseHealth();
        if (!isHealthy) {
            console.error(`${getVectorDatabaseName()} database health check failed`);
            return false;
        }
        return true;
    }

    protected async performPostClearCleanup(): Promise<void> {
        console.log(`🧹 ${getVectorDatabaseName()} cleanup completed`);
    }
}

export default new VectorDatabaseAdapterService(); 