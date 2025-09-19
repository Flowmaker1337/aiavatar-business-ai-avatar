import dotenv from 'dotenv';
import path from 'path';
import pineconeService from '../services/pinecone.service';
import {BaseVectorUploadService} from '../services/base-vector-upload.service';

// Load environment variables (if not already loaded)
dotenv.config({path: path.resolve(__dirname, '../../.env')});

/**
 * Pinecone upload service implementation
 * Extends base upload service with Pinecone-specific operations
 */
class PineconeUploadService extends BaseVectorUploadService {
    protected vectorService = pineconeService;

    /**
     * Perform Pinecone-specific pre-upload checks
     */
    protected async performPreUploadChecks(): Promise<void> {
        // Check Pinecone health
        const isHealthy = await this.vectorService.getHealthStatus();
        if (!isHealthy) {
            throw new Error('Pinecone database is not accessible. Please check your configuration.');
        }
        console.log('✅ Pinecone database is accessible');
    }
}

/**
 * Main function for uploading data to Pinecone
 * @param filePath Optional path to JSON file
 */
export async function uploadToPinecone(filePath?: string): Promise<void> {
    const service = new PineconeUploadService();
    await service.uploadData(filePath);
}

// Run function if file is executed directly
if (require.main === module) {
    const service = new PineconeUploadService();
    service.run();
} 