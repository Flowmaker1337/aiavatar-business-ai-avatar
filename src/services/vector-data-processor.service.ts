import fs from 'fs/promises';
import path from 'path';
import {chunk} from 'lodash';
import {get_encoding} from 'tiktoken';
import openaiService from './openai.service';
import vectorIdService from './vector-id.service';
import {VectorData} from '../models/types';

// Configuration constants
const MAX_TOKENS_ALLOWED = 8000; // Actual limit is 8191, leaving safety margin
const BATCH_SIZE = 20;

/**
 * Interface for knowledge item structure
 */
export interface KnowledgeItem {
    category: string;
    topic: string;
    text: string;
}

/**
 * Interface for processing statistics
 */
export interface ProcessingStats {
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    batches: number;
}

/**
 * Interface for validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    validData: KnowledgeItem[];
}

/**
 * Service for common vector data processing operations
 * Used by both Pinecone and Qdrant upload scripts
 */
class VectorDataProcessorService {
    private tokenizer: any = null;

    /**
     * Helper function to add delays
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize tokenizer for text processing
     */
    public async initializeTokenizer(): Promise<void> {
        try {
            this.tokenizer = get_encoding('cl100k_base');
            console.log('✅ Tokenizer initialized successfully');
        } catch (error: any) {
            console.error(`❌ Failed to initialize tokenizer: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean up tokenizer resources
     */
    public cleanup(): void {
        if (this.tokenizer) {
            this.tokenizer.free();
            this.tokenizer = null;
        }
    }

    /**
     * Load and parse JSON data from file
     */
    public async loadJsonData(filePath: string): Promise<any> {
        console.log(`Loading JSON file from: ${filePath}`);

        try {
            const rawData = JSON.parse(await fs.readFile(filePath, 'utf8'));
            console.log('Data loaded from JSON file - verifying structure...');
            return rawData;
        } catch (error: any) {
            console.error(`Error loading JSON file: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate knowledge item structure
     */
    private validateKnowledgeItem(item: any, index: number): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!item) {
            errors.push(`Item at index ${index} is null or undefined`);
            return {isValid: false, errors};
        }

        if (typeof item !== 'object') {
            errors.push(`Item at index ${index} is not an object (type: ${typeof item})`);
            return {isValid: false, errors};
        }

        // Check required fields
        if (!item.category || typeof item.category !== 'string') {
            errors.push(`Item at index ${index} has invalid or missing 'category' field`);
        }

        if (!item.topic || typeof item.topic !== 'string') {
            errors.push(`Item at index ${index} has invalid or missing 'topic' field`);
        }

        if (!item.text || typeof item.text !== 'string') {
            errors.push(`Item at index ${index} has invalid or missing 'text' field`);
        }

        // Check if text is not empty
        if (item.text && item.text.trim() === '') {
            errors.push(`Item at index ${index} has empty 'text' field`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate and process raw JSON data
     */
    public validateData(rawData: any): ValidationResult {
        // Check if data is an array
        if (!Array.isArray(rawData)) {
            return {
                isValid: false,
                errors: ['JSON file should contain an array of objects, but contains: ' + typeof rawData],
                validData: []
            };
        }

        if (rawData.length === 0) {
            return {
                isValid: false,
                errors: ['JSON file contains empty array. No data to process.'],
                validData: []
            };
        }

        // Validate all elements
        const validationErrors: string[] = [];
        const validData: KnowledgeItem[] = [];

        for (let i = 0; i < rawData.length; i++) {
            const validation = this.validateKnowledgeItem(rawData[i], i);
            if (validation.isValid) {
                // Convert to proper type after validation
                const validItem: KnowledgeItem = {
                    category: String(rawData[i].category),
                    topic: String(rawData[i].topic),
                    text: String(rawData[i].text)
                };
                validData.push(validItem);
            } else {
                validationErrors.push(...validation.errors);
            }
        }

        return {
            isValid: validationErrors.length === 0,
            errors: validationErrors,
            validData
        };
    }

    /**
     * Validate text lengths against token limits
     */
    public validateTextLengths(data: KnowledgeItem[]): { isValid: boolean; errors: string[] } {
        if (!this.tokenizer) {
            throw new Error('Tokenizer not initialized. Call initializeTokenizer() first.');
        }

        const errors: string[] = [];

        for (let i = 0; i < data.length; i++) {
            const tokenCount = this.tokenizer.encode(data[i].text).length;
            if (tokenCount > MAX_TOKENS_ALLOWED) {
                errors.push(`Item ${i + 1} (topic: "${data[i].topic}"): ${tokenCount} tokens (limit: ${MAX_TOKENS_ALLOWED})`);
            }
        }

        if (errors.length > 0) {
            console.error('❌ The following items exceed the token limit:');
            errors.forEach(error => console.error(`  - ${error}`));
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate embeddings for a batch of items
     */
    public async generateEmbeddingsBatch(
        batch: KnowledgeItem[],
        batchIndex: number,
        totalBatches: number
    ): Promise<VectorData[]> {
        if (!this.tokenizer) {
            throw new Error('Tokenizer not initialized. Call initializeTokenizer() first.');
        }

        const vectors: VectorData[] = [];
        console.log(`\nProcessing batch ${batchIndex + 1}/${totalBatches}`);

        for (let i = 0; i < batch.length; i++) {
            const {category, topic, text} = batch[i];
            const globalIndex = batchIndex * BATCH_SIZE + i;

            console.log(`  Embedding: [${globalIndex + 1}] Topic: ${topic}`);

            try {
                // Generate embedding using existing service
                const embedding = await openaiService.generateEmbeddings(text);

                vectors.push({
                    id: vectorIdService.generateUniqueId(),
                    values: embedding,
                    metadata: {
                        category,
                        topic,
                        text, // Store full text in metadata
                        text_length: text.length,
                        token_count: this.tokenizer.encode(text).length,
                        content_hash: vectorIdService.generateContentBasedId(category, topic, text),
                        created_at: new Date().toISOString(),
                        avatar_id: 'default' // Support for multi-avatar in future
                    }
                });
            } catch (error: any) {
                console.error(`  ❌ Error generating embedding for "${topic}":`, error.message);

                // Add delay in case of rate limit error
                if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
                    console.log('  ⏳ Rate limit detected, waiting 60 seconds...');
                    await this.delay(60000); // Wait one minute
                }
                continue; // Continue to next record despite error
            }

            // Add delay every few records to avoid API rate limits
            if (i > 0 && i % 5 === 0) {
                await this.delay(500); // 500ms delay
            }
        }

        return vectors;
    }

    /**
     * Process data in batches
     */
    public createBatches(data: KnowledgeItem[]): KnowledgeItem[][] {
        const batches = chunk(data, BATCH_SIZE);
        console.log(`Divided data into ${batches.length} batches of maximum ${BATCH_SIZE} records each`);
        return batches;
    }

    /**
     * Handle retry logic for vector database operations
     */
    public async handleRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        retryDelay: number = 30000
    ): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            console.error(`  ❌ Error during ${operationName}:`, error.message);

            // Check if it's a rate limit error
            if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
                console.log(`  ⏳ Rate limit detected for ${operationName}, waiting ${retryDelay / 1000} seconds...`);
                await this.delay(retryDelay);

                try {
                    const result = await operation();
                    console.log(`  ✅ Retry successful for ${operationName}`);
                    return result;
                } catch (retryError: any) {
                    console.error(`  ❌ Retry failed for ${operationName}:`, retryError.message);
                    throw retryError;
                }
            }

            throw error;
        }
    }

    /**
     * Add delay between batches
     */
    public async delayBetweenBatches(currentBatch: number, totalBatches: number): Promise<void> {
        if (currentBatch < totalBatches - 1) {
            console.log('  ⏳ Short break before next batch...');
            await this.delay(1000); // 1 second break
        }
    }

    /**
     * Print processing summary
     */
    public printSummary(stats: ProcessingStats, databaseType: string): void {
        console.log('\n=== SUMMARY ===');
        console.log(`✅ Completed processing ${stats.processedItems} records`);
        console.log(`✅ Successfully added ${stats.successfulItems} vectors to ${databaseType}`);

        if (stats.failedItems > 0) {
            console.log(`❌ Failed to process ${stats.failedItems} records`);
        }

        console.log(`✅ Upload process completed successfully`);
    }

    /**
     * Get default knowledge file path
     */
    public getDefaultKnowledgeFilePath(): string {
        // return path.join(__dirname, '../config/leasing-knowledge.json');
        return path.join(__dirname, '../config/trainer-knowledge.json');
    }

    /**
     * Get batch size configuration
     */
    public getBatchSize(): number {
        return BATCH_SIZE;
    }

    /**
     * Get maximum tokens allowed
     */
    public getMaxTokensAllowed(): number {
        return MAX_TOKENS_ALLOWED;
    }
}

export default new VectorDataProcessorService(); 