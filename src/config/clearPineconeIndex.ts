import dotenv from 'dotenv';
import path from 'path';
import pineconeService from '../services/pinecone.service';
import { BaseVectorClearService } from '../services/base-vector-clear.service';

// Load environment variables (if not already loaded)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Pinecone clear service implementation
 * Extends base clear service with Pinecone-specific operations
 */
class PineconeClearService extends BaseVectorClearService {
  protected vectorService = pineconeService;

  /**
   * Perform Pinecone-specific pre-clear checks
   */
  protected async performPreClearChecks(): Promise<boolean> {
    // Check Pinecone health
    const isHealthy = await this.checkDatabaseHealth();
    if (!isHealthy) {
      console.error('Pinecone database health check failed');
      return false;
    }
    return true;
  }

  /**
   * Perform Pinecone-specific post-clear cleanup
   */
  protected async performPostClearCleanup(): Promise<void> {
    // No specific cleanup needed for Pinecone
    console.log('🧹 Pinecone cleanup completed');
  }
}

/**
 * Main function for clearing all data from Pinecone index
 * @param clearAll If true, clear all data. If false, only show stats
 */
export async function clearPineconeIndex(clearAll: boolean = true): Promise<void> {
  const service = new PineconeClearService();
  
  if (clearAll) {
    await service.clearAll();
  } else {
    await service.preview();
  }
}

/**
 * Function to clear duplicate content based on content hashes
 * This function would need to be implemented with query support
 */
export async function clearDuplicates(): Promise<void> {
  const service = new PineconeClearService();
  await service.clearDuplicates();
}

// Run function if file is executed directly
if (require.main === module) {
  const service = new PineconeClearService();
  service.run();
} 