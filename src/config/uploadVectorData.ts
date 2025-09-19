import dotenv from 'dotenv';
import path from 'path';
import vectorDatabaseService from '../services/vector-database.service';

// Load environment variables (if not already loaded)
dotenv.config({path: path.resolve(__dirname, '../../.env')});

/**
 * Centralized upload function that automatically uses the configured vector database
 * Works with any vector database configured in VECTOR_DB_TYPE environment variable
 * @param filePath Optional path to JSON file
 */
export async function uploadVectorData(filePath?: string): Promise<void> {
    await vectorDatabaseService.uploadData(filePath);
}

// Run function if file is executed directly
if (require.main === module) {
    uploadVectorData()
        .then(() => {
            console.log('Upload task completed successfully');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Error during upload task execution:', err);
            process.exit(1);
        });
} 