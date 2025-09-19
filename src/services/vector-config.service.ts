import {VectorDatabaseConfig} from '../models/types';

/**
 * Vector Database Configuration Service
 * Provides centralized configuration for vector database operations
 */
class VectorConfigService {
    private static readonly DEFAULT_CONFIG: VectorDatabaseConfig = {
        minimumScoreThreshold: 0.7,
        bestMatchingRecordsAmount: 3,
        vectorSize: 1536 // OpenAI text-embedding-ada-002 dimension
    };

    /**
     * Get current vector database configuration
     */
    public getConfig(): VectorDatabaseConfig {
        return {
            ...VectorConfigService.DEFAULT_CONFIG,
            // Can be extended with environment-specific overrides
        };
    }

    /**
     * Get minimum score threshold for vector similarity
     */
    public getMinimumScoreThreshold(): number {
        return this.getConfig().minimumScoreThreshold;
    }

    /**
     * Get number of best matching records to return
     */
    public getBestMatchingRecordsAmount(): number {
        return this.getConfig().bestMatchingRecordsAmount;
    }

    /**
     * Get vector size (embedding dimension)
     */
    public getVectorSize(): number {
        return this.getConfig().vectorSize;
    }

    /**
     * Validate search result against configuration
     */
    public validateSearchResult(score: number | null): boolean {
        if (score === null) return false;
        return score >= this.getMinimumScoreThreshold();
    }
}

export default new VectorConfigService(); 