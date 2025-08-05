import dotenv from 'dotenv';
import path from 'path';
import {UtilsService} from "../services/utils.service";

// Load environment variables from .env file
dotenv.config({path: path.resolve(__dirname, '../../.env')});

// Server configuration
export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// OpenAI API
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Pinecone
export const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
export const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || '';
export const PINECONE_PROJECT_ID = process.env.PINECONE_PROJECT_ID || '';
export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || '';

// Qdrant Vector Database
export const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
export const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || 'knowledge_base';
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY || ''; // Optional for local setup

// Vector Database Type Selection
export const VECTOR_DB_TYPE = process.env.VECTOR_DB_TYPE || 'qdrant'; // 'pinecone' or 'qdrant'

/**
 * Get current vector database name from environment configuration
 * @returns Vector database name in lowercase (e.g., 'pinecone', 'qdrant')
 */
export function getVectorDatabaseName(): string {
    return VECTOR_DB_TYPE.toLowerCase();
}

// MongoDB
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/npc_agent';
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'npc_agent';

// MongoDB collections
export const MONGODB_USERS_COLLECTION = process.env.MONGODB_USERS_COLLECTION || 'users';
export const MONGODB_AVATARS_COLLECTION = process.env.MONGODB_AVATARS_COLLECTION || 'avatars';
export const MONGODB_SESSIONS_COLLECTION = process.env.MONGODB_SESSIONS_COLLECTION || 'sessions';
export const MONGODB_CHAT_HISTORY_COLLECTION = process.env.MONGODB_CHAT_HISTORY_COLLECTION || 'chatHistory';

// Redis
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Eleven Labs (speech synthesis)
export const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY || '';

const maxTokensAsString = process.env.MAX_TOKENS || '1000';
export const MAX_TOKENS: number = parseInt(maxTokensAsString);

// Check if all required environment variables are set
export const validateEnv = (): boolean => {
    const errors: string[] = [];

    // Helper function to check if variable exists (not undefined, but empty string is OK)
    const isVariableDefined = (varName: string): boolean => {
        return process.env[varName] !== undefined;
    };

    // Helper function to check if variable has value (not empty)
    const hasValue = (varName: string): boolean => {
        return process.env[varName] !== undefined && process.env[varName] !== '';
    };

    // Core variables - always required
    const coreVars = [
        'PORT',
        'NODE_ENV',
        'OPENAI_API_KEY',
        'MONGODB_URI',
        'MONGODB_DB_NAME',
        'MONGODB_USERS_COLLECTION',
        'MONGODB_AVATARS_COLLECTION',
        'MONGODB_SESSIONS_COLLECTION',
        'MONGODB_CHAT_HISTORY_COLLECTION',
        'REDIS_URL',
        'ELEVEN_LABS_API_KEY',
        'MAX_TOKENS',
        'VECTOR_DB_TYPE'
    ];

    // Check core variables (must have values)
    for (const varName of coreVars) {
        if (!hasValue(varName)) {
            errors.push(varName);
        }
    }

    // Vector database specific validation
    const vectorDbType = getVectorDatabaseName();

    if (vectorDbType === 'pinecone') {
        // Pinecone requires all these variables with values
        const pineconeVars = [
            'PINECONE_API_KEY',
            'PINECONE_ENVIRONMENT',
            'PINECONE_PROJECT_ID',
            'PINECONE_INDEX_NAME'
        ];

        for (const varName of pineconeVars) {
            if (!hasValue(varName)) {
                errors.push(varName);
            }
        }
    } else if (vectorDbType === 'qdrant') {
        // Qdrant requires these variables with values (can be empty for local setup)
        const qdrantVars = [
            'QDRANT_URL',
            'QDRANT_COLLECTION_NAME'
        ];

        for (const varName of qdrantVars) {
            if (!isVariableDefined(varName)) {
                errors.push(varName);
            }
        }

        // QDRANT_API_KEY is optional for local setup - just needs to be defined
        if (!isVariableDefined('QDRANT_API_KEY')) {
            errors.push('QDRANT_API_KEY');
        }
    } else {
        errors.push('VECTOR_DB_TYPE (must be "pinecone" or "qdrant")');
    }

    // Report missing variables
    if (errors.length > 0) {
        console.error('Missing environment variables:', errors.join(', '));
        return false;
    }

    // Validate MAX_TOKENS
    const maxTokensAsString = process.env.MAX_TOKENS || '1000';
    if (!UtilsService.isIntegerString(maxTokensAsString)) {
        console.error('Environment variable MAX_TOKENS is not an integer');
        return false;
    }

    if (!Number.isInteger(MAX_TOKENS)) {
        console.error('Failed to convert environment variable MAX_TOKENS to integer');
        return false;
    }

    if (MAX_TOKENS <= 0) {
        console.error('Environment variable MAX_TOKENS is not a positive integer');
        return false;
    }

    return true;
}; 