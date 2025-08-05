import { VectorDatabaseService } from '../models/types';
import { getVectorDatabaseName } from '../config/env';

/**
 * Command types for vector database clearing operations
 */
export type ClearCommand = 'clear-all' | 'preview' | 'duplicates';

/**
 * Interface for clear operation statistics
 */
export interface ClearStats {
  totalVectors?: number;
  deletedVectors?: number;
  duplicateVectors?: number;
  operationTime?: number;
}

/**
 * Abstract base class for vector database clearing operations
 * Provides common functionality for clearing operations across different vector databases
 */
export abstract class BaseVectorClearService {
  protected abstract vectorService: VectorDatabaseService;

  /**
   * Parse command line arguments to determine operation type
   */
  public parseCommand(args: string[]): ClearCommand {
    const command = args[0] || 'clear-all';
    
    if (!this.isValidCommand(command)) {
      this.printUsage();
      process.exit(0);
    }
    
    return command as ClearCommand;
  }

  /**
   * Check if command is valid
   */
  private isValidCommand(command: string): boolean {
    return ['clear-all', 'preview', 'duplicates'].includes(command);
  }

  /**
   * Print usage instructions
   */
  private printUsage(): void {
    console.log('Available commands:');
    console.log('  clear-all   - Delete all vectors (default)');
    console.log('  preview     - Show statistics without deleting');
    console.log('  duplicates  - Delete only duplicates (not implemented)');
  }

  /**
   * Execute clear operation based on command
   */
  public async executeCommand(command: ClearCommand): Promise<void> {
    switch (command) {
      case 'clear-all':
        await this.clearAll();
        break;
      case 'preview':
        await this.preview();
        break;
      case 'duplicates':
        await this.clearDuplicates();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Clear all vectors from the database
   */
  public async clearAll(): Promise<void> {
    try {
      console.log(`🚀 Starting ${getVectorDatabaseName()} index clearing process`);
      console.log('Deleting all vectors from collection...');
      
      const startTime = Date.now();
      const success = await this.vectorService.deleteAllVectors();
      const operationTime = Date.now() - startTime;
      
      if (success) {
        console.log(`✅ Successfully cleared ${getVectorDatabaseName()} index.`);
        console.log('🔄 Index is now ready for new data loading.');
        console.log(`⏱️  Operation completed in ${operationTime}ms`);
      } else {
        console.log(`❌ Problem occurred while clearing ${getVectorDatabaseName()} index.`);
      }
      
    } catch (error: any) {
      console.error('\n❌ CRITICAL ERROR:', error.message);
      throw error;
    }
  }

  /**
   * Preview operation - show statistics without deleting
   */
  public async preview(): Promise<void> {
    try {
      console.log(`🚀 Starting ${getVectorDatabaseName()} index preview`);
      console.log('ℹ️  Preview mode - data will not be deleted');
      
      // TODO: Implement statistics gathering
      console.log('📊 Preview function not yet implemented');
      console.log('💡 This would show:');
      console.log('   - Total number of vectors');
      console.log('   - Storage usage');
      console.log('   - Duplicate content detection');
      console.log('   - Vector metadata analysis');
      console.log('💡 To clear all data, run with clear-all parameter');
      
    } catch (error: any) {
      console.error('\n❌ PREVIEW ERROR:', error.message);
      throw error;
    }
  }

  /**
   * Clear duplicate content based on content hashes
   */
  public async clearDuplicates(): Promise<void> {
    try {
      console.log(`🔍 Starting duplicate removal for ${getVectorDatabaseName()}`);
      console.log('🔍 Duplicate removal function not yet implemented');
      console.log('💡 Requires implementation of query function to check existing vectors');
      
      // TODO: Implement logic to:
      console.log('📋 Implementation plan:');
      console.log('   1. Query all vectors with their content_hash metadata');
      console.log('   2. Group by content_hash to find duplicates');
      console.log('   3. Keep newest version (based on created_at) and delete older ones');
      console.log('   4. Report statistics about removed duplicates');
      
    } catch (error: any) {
      console.error('\n❌ DUPLICATE REMOVAL ERROR:', error.message);
      throw error;
    }
  }

  /**
   * Run the clearing service with command line arguments
   */
  public async run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = this.parseCommand(args);
    
    try {
      await this.executeCommand(command);
      console.log('Task completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during task execution:', error);
      process.exit(1);
    }
  }

  /**
   * Get database health status before operations
   */
  protected async checkDatabaseHealth(): Promise<boolean> {
    try {
      const isHealthy = await this.vectorService.getHealthStatus();
      if (!isHealthy) {
               console.warn(`⚠️  ${getVectorDatabaseName()} database health check failed`);
       return false;
     }
     console.log(`✅ ${getVectorDatabaseName()} database is healthy`);
     return true;
   } catch (error: any) {
     console.error(`❌ Failed to check ${getVectorDatabaseName()} health:`, error.message);
      return false;
    }
  }

  /**
   * Abstract method for database-specific pre-clear operations
   */
  protected abstract performPreClearChecks(): Promise<boolean>;

  /**
   * Abstract method for database-specific post-clear operations  
   */
  protected abstract performPostClearCleanup(): Promise<void>;
} 