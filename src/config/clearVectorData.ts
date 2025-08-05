import dotenv from 'dotenv';
import path from 'path';
import vectorDatabaseService from '../services/vector-database.service';
import { ClearCommand } from '../services/base-vector-clear.service';

// Load environment variables (if not already loaded)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Centralized clear function that automatically uses the configured vector database
 * Works with any vector database configured in VECTOR_DB_TYPE environment variable
 * @param command Clear command (clear-all, preview, duplicates)
 */
export async function clearVectorData(command: ClearCommand = 'clear-all'): Promise<void> {
  await vectorDatabaseService.clearData(command);
}

/**
 * Parse command line arguments to determine operation type
 */
function parseCommand(args: string[]): ClearCommand {
  const command = args[0] || 'clear-all';
  
  if (!['clear-all', 'preview', 'duplicates'].includes(command)) {
    console.log('Available commands:');
    console.log('  clear-all   - Delete all vectors (default)');
    console.log('  preview     - Show statistics without deleting');
    console.log('  duplicates  - Delete only duplicates (not implemented)');
    process.exit(0);
  }
  
  return command as ClearCommand;
}

// Run function if file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = parseCommand(args);
  
  clearVectorData(command)
    .then(() => {
      console.log('Clear task completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error during clear task execution:', err);
      process.exit(1);
    });
} 