import {VectorDatabaseService} from '../models/types';
import vectorDataProcessor, {KnowledgeItem, ProcessingStats} from './vector-data-processor.service';
import {getVectorDatabaseName} from '../config/env';

/**
 * Abstract base class for vector database upload operations
 * Provides common functionality for uploading data across different vector databases
 */
export abstract class BaseVectorUploadService {
    protected abstract vectorService: VectorDatabaseService;

    /**
     * Main upload process - template method pattern
     */
    public async uploadData(filePath?: string): Promise<void> {
        try {
            console.log(`🚀 Starting ${getVectorDatabaseName()} data upload process`);

            // Step 1: Initialize resources
            await this.initializeUpload();

            // Step 2: Load and validate data
            const rawData = await this.loadData(filePath);
            const validation = this.validateData(rawData);

            if (!validation.isValid) {
                this.handleValidationErrors(validation.errors);
                return;
            }

            // Step 3: Validate text lengths
            await this.validateTextLengths(validation.validData);

            // Step 4: Process data in batches
            const stats = await this.processBatches(validation.validData);

            // Step 5: Print summary and cleanup
            this.printSummary(stats);

        } catch (error: any) {
            console.error('\n❌ CRITICAL ERROR:', error.message);
            throw error;
        } finally {
            this.cleanup();
        }
    }

    /**
     * Initialize upload process (tokenizer, health checks, etc.)
     */
    protected async initializeUpload(): Promise<void> {
        await vectorDataProcessor.initializeTokenizer();
        await this.performPreUploadChecks();
    }

    /**
     * Load data from JSON file
     */
    protected async loadData(filePath?: string): Promise<any> {
        const dataPath = filePath || vectorDataProcessor.getDefaultKnowledgeFilePath();
        return await vectorDataProcessor.loadJsonData(dataPath);
    }

    /**
     * Validate loaded data structure
     */
    protected validateData(rawData: any) {
        const validation = vectorDataProcessor.validateData(rawData);

        if (validation.isValid) {
            console.log(`✅ Loaded ${validation.validData.length} valid records from file`);
        }

        return validation;
    }

    /**
     * Handle validation errors
     */
    protected handleValidationErrors(errors: string[]): void {
        console.error('❌ Data validation errors found:');
        errors.forEach(error => console.error(`   - ${error}`));
        console.error(`Invalid data structure in JSON file. Found ${errors.length} errors.`);
        process.exit(1);
    }

    /**
     * Validate text lengths against token limits
     */
    protected async validateTextLengths(data: KnowledgeItem[]): Promise<void> {
        console.log('Validating text lengths...');

        const lengthValidation = vectorDataProcessor.validateTextLengths(data);

        if (!lengthValidation.isValid) {
            console.error('\nRecommendations:');
            console.error('1. Split long texts into smaller fragments (each below 8000 tokens)');
            console.error('2. Alternatively, shorten content while keeping essential information');
            console.error(`3. Maximum tokens allowed: ${vectorDataProcessor.getMaxTokensAllowed()}`);
            console.error(`   (approximately ${Math.round(vectorDataProcessor.getMaxTokensAllowed() * 3.5)} characters for Polish language)`);
            process.exit(1);
        }

        console.log('✅ All texts fit within token limit');
    }

    /**
     * Process data in batches and upload to vector database
     */
    protected async processBatches(data: KnowledgeItem[]): Promise<ProcessingStats> {
        const batches = vectorDataProcessor.createBatches(data);

        const stats: ProcessingStats = {
            totalItems: data.length,
            processedItems: 0,
            successfulItems: 0,
            failedItems: 0,
            batches: batches.length
        };

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];

            // Generate embeddings for this batch
            const vectors = await vectorDataProcessor.generateEmbeddingsBatch(
                batch,
                batchIndex,
                batches.length
            );

            stats.processedItems += batch.length;

            // Upload batch to vector database with retry logic
            if (vectors.length > 0) {
                try {
                    const addedCount = await vectorDataProcessor.handleRetry(
                        () => this.vectorService.upsertVectors(vectors),
                        `batch ${batchIndex + 1} upload to ${getVectorDatabaseName()}`
                    );

                    stats.successfulItems += addedCount;
                    console.log(`  ✅ Batch ${batchIndex + 1} sent to ${getVectorDatabaseName()} (${vectors.length} vectors)`);

                } catch (error: any) {
                    console.error(`  ❌ Failed to upload batch ${batchIndex + 1}:`, error.message);
                    stats.failedItems += vectors.length;
                }

                // Add delay between batches
                await vectorDataProcessor.delayBetweenBatches(batchIndex, batches.length);
            }
        }

        return stats;
    }

    /**
     * Print processing summary
     */
    protected printSummary(stats: ProcessingStats): void {
        vectorDataProcessor.printSummary(stats, getVectorDatabaseName());
    }

    /**
     * Cleanup resources
     */
    protected cleanup(): void {
        vectorDataProcessor.cleanup();
    }

    /**
     * Abstract method for database-specific pre-upload checks
     */
    protected abstract performPreUploadChecks(): Promise<void>;

    /**
     * Run upload service from command line
     */
    public async run(): Promise<void> {
        try {
            await this.uploadData();
            console.log('Task completed successfully');
            process.exit(0);
        } catch (error) {
            console.error('Error during task execution:', error);
            process.exit(1);
        }
    }
} 