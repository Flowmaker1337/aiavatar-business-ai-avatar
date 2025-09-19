import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import {v4 as uuidv4} from 'uuid';
import qdrantService from '../services/qdrant.service';
import {VectorData} from '../models/types';
import openAIService from '../services/openai.service';
import {ExecutionTimerService} from '../services/execution-timer.service';

// Load environment variables
dotenv.config({path: path.resolve(__dirname, '../../.env')});

interface BusinessAvatarChunk {
    id: string;
    category: string;
    topic: string;
    text: string;
}

interface BusinessAvatar {
    id: string;
    name: string;
    position: string;
    company: string;
    category: string;
    chunks: BusinessAvatarChunk[];
}

interface BusinessAvatarsData {
    avatars: BusinessAvatar[];
}

/**
 * Service do uploadowania danych biznesowych avatarów do Qdrant
 */
class BusinessAvatarsUploadService {
    private collectionName = 'business_avatars_knowledge';

    constructor() {
        // Używamy singleton OpenAIService
    }

    /**
     * Główna funkcja uploadowania danych
     */
    public async uploadBusinessAvatarsData(): Promise<void> {
        try {
            console.log('🚀 Starting business avatars data upload process');

            // 1. Sprawdź health Qdrant
            await this.performHealthCheck();

            // 2. Załaduj dane
            const data = await this.loadBusinessAvatarsData();

            // 3. Przetwórz dane
            const processedData = await this.processBusinessAvatarsData(data);

            // 4. Upload do Qdrant
            await this.uploadToQdrant(processedData);

            console.log('✅ Business avatars data upload completed successfully');
        } catch (error: any) {
            console.error('\n❌ CRITICAL ERROR:', error.message);
            throw error;
        }
    }

    /**
     * Sprawdza health Qdrant
     */
    private async performHealthCheck(): Promise<void> {
        const isHealthy = await qdrantService.getHealthStatus();
        if (!isHealthy) {
            throw new Error('Qdrant database is not accessible. Please check your configuration.');
        }
        console.log('✅ Qdrant database is accessible');
    }

    /**
     * Ładuje dane biznesowych avatarów z pliku JSON
     */
    private async loadBusinessAvatarsData(): Promise<BusinessAvatarsData> {
        const filePath = path.resolve(__dirname, 'business-avatars-knowledge.json');

        if (!fs.existsSync(filePath)) {
            throw new Error(`Business avatars knowledge file not found: ${filePath}`);
        }

        console.log(`Loading business avatars data from: ${filePath}`);
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(rawData) as BusinessAvatarsData;

        // Walidacja struktury danych
        if (!data.avatars || !Array.isArray(data.avatars)) {
            throw new Error('Invalid business avatars data structure');
        }

        const totalChunks = data.avatars.reduce((sum, avatar) => sum + avatar.chunks.length, 0);
        console.log(`✅ Loaded ${data.avatars.length} business avatars with ${totalChunks} knowledge chunks`);

        return data;
    }

    /**
     * Przetwarza dane biznesowe avatarów na wektory
     */
    private async processBusinessAvatarsData(data: BusinessAvatarsData): Promise<VectorData[]> {
        const vectors: VectorData[] = [];

        for (const avatar of data.avatars) {
            console.log(`\nProcessing avatar: ${avatar.name} (${avatar.position})`);

            for (const chunk of avatar.chunks) {
                console.log(`  Processing chunk: ${chunk.topic}`);

                // Generuj embedding z timerem
                const timer = new ExecutionTimerService('generateEmbeddings in OpenAIService');
                timer.start();
                const embedding = await openAIService.generateEmbeddings(chunk.text);
                timer.stop();

                // Utwórz vector data
                const vectorData: VectorData = {
                    id: uuidv4(),
                    values: embedding,
                    metadata: {
                        category: 'business_avatar',
                        avatar_id: avatar.id,
                        avatar_name: avatar.name,
                        avatar_position: avatar.position,
                        avatar_company: avatar.company,
                        avatar_category: avatar.category,
                        chunk_id: chunk.id,
                        chunk_category: chunk.category,
                        topic: chunk.topic,
                        text: chunk.text,
                        text_length: chunk.text.length,
                        token_count: this.estimateTokens(chunk.text),
                        created_at: new Date().toISOString()
                    }
                };

                vectors.push(vectorData);
            }
        }

        console.log(`✅ Generated ${vectors.length} vectors from business avatars data`);
        return vectors;
    }

    /**
     * Uploaduje wektory do Qdrant
     */
    private async uploadToQdrant(vectors: VectorData[]): Promise<void> {
        const batchSize = 50;
        const batches = this.createBatches(vectors, batchSize);

        console.log(`Uploading ${vectors.length} vectors in ${batches.length} batches...`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`\nProcessing batch ${i + 1}/${batches.length} (${batch.length} vectors)`);

            try {
                const addedCount = await qdrantService.upsertVectors(batch);
                console.log(`  ✅ Batch ${i + 1} uploaded successfully (${addedCount} vectors)`);

                // Krótka przerwa między batches
                if (i < batches.length - 1) {
                    console.log('  ⏳ Short break before next batch...');
                    await this.sleep(1000);
                }
            } catch (error) {
                console.error(`  ❌ Error uploading batch ${i + 1}:`, error);
                throw error;
            }
        }
    }

    /**
     * Dzieli dane na batche
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Estymuje liczbę tokenów
     */
    private estimateTokens(text: string): number {
        // Prosta estymacja: słowo ≈ 1.3 tokena
        const words = text.split(/\s+/).filter(word => word.length > 0);
        return Math.ceil(words.length * 1.3);
    }

    /**
     * Sleep function
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Publiczna metoda do uruchamiania
     */
    public async run(): Promise<void> {
        try {
            await this.uploadBusinessAvatarsData();
            console.log('\n🎉 Task completed successfully');
        } catch (error) {
            console.error('\n💥 Task failed:', error);
            process.exit(1);
        }
    }
}

// Uruchom gdy plik jest wykonywany bezpośrednio
if (require.main === module) {
    const service = new BusinessAvatarsUploadService();
    service.run();
}

export default BusinessAvatarsUploadService; 