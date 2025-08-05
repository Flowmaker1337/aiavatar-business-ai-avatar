import dotenv from 'dotenv';
import path from 'path';
import qdrantService from '../services/qdrant.service';
import { BaseVectorClearService } from '../services/base-vector-clear.service';

// Load environment variables (if not already loaded)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Qdrant clear service implementation
 * Extends base clear service with Qdrant-specific operations
 */
class QdrantClearService extends BaseVectorClearService {
  protected vectorService = qdrantService;

  /**
   * Perform Qdrant-specific pre-clear checks
   */
  protected async performPreClearChecks(): Promise<boolean> {
    // Check Qdrant health
    const isHealthy = await this.checkDatabaseHealth();
    if (!isHealthy) {
      console.error('Qdrant database health check failed');
      return false;
    }
    return true;
  }

  /**
   * Perform Qdrant-specific post-clear cleanup
   */
  protected async performPostClearCleanup(): Promise<void> {
    // No specific cleanup needed for Qdrant
    console.log('🧹 Qdrant cleanup completed');
  }
}

/**
 * Main function for clearing all data from Qdrant index
 * @param clearAll If true, clear all data. If false, only show stats
 */
export async function clearQdrantIndex(clearAll: boolean = true): Promise<void> {
  const service = new QdrantClearService();
  
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
  const service = new QdrantClearService();
  await service.clearDuplicates();
}

// Run function if file is executed directly
if (require.main === module) {
  const service = new QdrantClearService();
  service.run();
} 