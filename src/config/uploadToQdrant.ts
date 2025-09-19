import dotenv from 'dotenv';
import path from 'path';
import qdrantService from '../services/qdrant.service';
import {BaseVectorUploadService} from '../services/base-vector-upload.service';

// Load environment variables (if not already loaded)
dotenv.config({path: path.resolve(__dirname, '../../.env')});

/**
 * Qdrant upload service implementation
 * Extends base upload service with Qdrant-specific operations
 */
class QdrantUploadService extends BaseVectorUploadService {
    protected vectorService = qdrantService;

    /**
     * Perform Qdrant-specific pre-upload checks
     */
    protected async performPreUploadChecks(): Promise<void> {
        // Check Qdrant health
        const isHealthy = await this.vectorService.getHealthStatus();
        if (!isHealthy) {
            throw new Error('Qdrant database is not accessible. Please check your configuration.');
        }
        console.log('✅ Qdrant database is accessible');
    }
}

/**
 * Main function for uploading data to Qdrant
 * @param filePath Optional path to JSON file
 */
export async function uploadToQdrant(filePath?: string): Promise<void> {
    const service = new QdrantUploadService();
    await service.uploadData(filePath);
}

// Run function if file is executed directly
if (require.main === module) {
    const service = new QdrantUploadService();
    service.run();
} 