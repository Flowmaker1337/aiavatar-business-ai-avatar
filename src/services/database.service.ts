import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { 
  MONGODB_URI, 
  MONGODB_DB_NAME, 
  MONGODB_USERS_COLLECTION,
  MONGODB_AVATARS_COLLECTION,
  MONGODB_SESSIONS_COLLECTION,
  MONGODB_CHAT_HISTORY_COLLECTION 
} from '../config/env';
import { User, Avatar, Session, ChatHistory } from '../models/types';

class DatabaseService {
  private client: MongoClient;
  private db: Db | null = null;
  private static instance: DatabaseService;
  private isConnected: boolean = false;
  private isInitializeCompleted: boolean = false;

  // Collections
  private users: Collection<User> | null = null;
  private avatars: Collection<Avatar> | null = null;
  private sessions: Collection<Session> | null = null;
  private chatHistory: Collection<ChatHistory> | null = null;

  private constructor() {
    this.client = new MongoClient(MONGODB_URI);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isInitializeCompleted) {
      console.log('Database is already fully initialized');
      return;
    }

    try {
      // Establish connection only if we're not already connected
      if (!this.isConnected) {
        await this.client.connect();
        this.isConnected = true;
        console.log('Connected to MongoDB database');
      } else {
        console.log('MongoDB database connection already exists');
      }

      // Get access to the database
      this.db = this.client.db(MONGODB_DB_NAME);
      console.log(`Using database: ${MONGODB_DB_NAME}`);
      
              // Initialize collections
      this.users = this.db.collection<User>(MONGODB_USERS_COLLECTION);
      this.avatars = this.db.collection<Avatar>(MONGODB_AVATARS_COLLECTION);
      this.sessions = this.db.collection<Session>(MONGODB_SESSIONS_COLLECTION);
      this.chatHistory = this.db.collection<ChatHistory>(MONGODB_CHAT_HISTORY_COLLECTION);
      
      console.log(`Initialized collections: ${MONGODB_USERS_COLLECTION}, ${MONGODB_AVATARS_COLLECTION}, ${MONGODB_SESSIONS_COLLECTION}, ${MONGODB_CHAT_HISTORY_COLLECTION}`);
      
      // Create indexes
      await this.users.createIndex({ email: 1 }, { unique: true });
      await this.sessions.createIndex({ userId: 1 });
      await this.chatHistory.createIndex({ sessionId: 1 });
      
      // Full initialization completed successfully
      this.isInitializeCompleted = true;
      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Error during database initialization:', error);
      // Do not modify isConnected flag if error occurred after connection was established
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('No active MongoDB database connection');
      return;
    }
    
    try {
      await this.client.close();
      this.isConnected = false;
      this.isInitializeCompleted = false;
      this.users = null;
      this.avatars = null;
      this.sessions = null;
      this.chatHistory = null;
      console.log('Disconnected from MongoDB database');
    } catch (error) {
      console.error('Error during MongoDB disconnection:', error);
      throw error;
    }
  }

  // Public method that throws exception if database is not initialized
  public assertInitialized() {
    if (!this.isInitializeCompleted) {
      throw new Error('Database is not initialized. Application should have stopped earlier.');
    }
  }

  // Public method to get database instance
  public getDatabase(): Db {
    this.assertInitialized();
    if (!this.db) {
      throw new Error('Database connection is not established.');
    }
    return this.db;
  }

  // User management methods
  public async createUser(userData: Omit<User, '_id'>): Promise<User> {
    this.assertInitialized();
    
    const result = await this.users!.insertOne({
      ...userData,
      _id: new ObjectId()
    } as User);
    
    return {
      _id: result.insertedId,
      ...userData
    } as User;
  }

  public async getUserById(id: string): Promise<User | null> {
    this.assertInitialized();
    return this.users!.findOne({ _id: new ObjectId(id) });
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    this.assertInitialized();
    return this.users!.findOne({ email });
  }

  // Avatar management methods
  public async createAvatar(avatarData: Omit<Avatar, '_id'>): Promise<Avatar> {
    this.assertInitialized();
    
    const result = await this.avatars!.insertOne({
      ...avatarData,
      _id: new ObjectId()
    } as Avatar);
    
    return {
      _id: result.insertedId,
      ...avatarData
    } as Avatar;
  }

  public async getAvatarById(id: string | ObjectId): Promise<Avatar | null> {
    this.assertInitialized();
    const currentId: ObjectId = DatabaseService.isObjectId(id) ? id : new ObjectId(id);
    return this.avatars!.findOne({ _id: currentId });
  }

  // Session management methods
  public async createSession(userId: string, avatarId: string): Promise<Session> {
    this.assertInitialized();
    
    const session: Session = {
      _id: uuidv4(),
      userId: new ObjectId(userId),
      avatarId: new ObjectId(avatarId),
      startedAt: new Date()
    };
    
    await this.sessions!.insertOne(session);
    return session;
  }

  public async getSessionById(sessionId: string): Promise<Session | null> {
    this.assertInitialized();
    return this.sessions!.findOne({ _id: sessionId });
  }

  public async getUserSessions(userId: string): Promise<Session[]> {
    this.assertInitialized();
    return this.sessions!.find({ userId: new ObjectId(userId) }).toArray();
  }

  // Chat history management methods
  public async addMessageToChatHistory(sessionId: string, content: string, isUser: boolean, goalName: string | null = null, isSayVerbatim: boolean = false): Promise<ChatHistory> {
    this.assertInitialized();
    
    const message: Omit<ChatHistory, '_id'> = {
      sessionId,
      isUser,
      content,
      timestamp: new Date(),
      goalName,
      isSayVerbatim
    };
    
    const result = await this.chatHistory!.insertOne({
      ...message,
      _id: new ObjectId()
    } as ChatHistory);
    
    return {
      _id: result.insertedId,
      ...message
    } as ChatHistory;
  }

  public async getChatHistory(sessionId: string): Promise<ChatHistory[]> {
    this.assertInitialized();
    return this.chatHistory!.find({ sessionId }).sort({ timestamp: 'asc' }).toArray();
  }

  // ============ GENERIC COLLECTION METHODS ============

  /**
   * Generic create method for any collection
   */
  public async create<T>(collectionName: string, data: any): Promise<T> {
    this.assertInitialized();
    const collection = this.db!.collection(collectionName);
    const result = await collection.insertOne(data);
    return { ...data, _id: result.insertedId } as T;
  }

  /**
   * Generic findAll method for any collection
   */
  public async findAll<T>(collectionName: string): Promise<T[]> {
    this.assertInitialized();
    const collection = this.db!.collection(collectionName);
    const results = await collection.find({}).toArray();
    return results as T[];
  }

  /**
   * Generic findById method for any collection
   */
  public async findById<T>(collectionName: string, id: string): Promise<T | null> {
    this.assertInitialized();
    const collection = this.db!.collection(collectionName);
    
    // Try to find by _id first (MongoDB ObjectId)
    let result = null;
    try {
      if (ObjectId.isValid(id)) {
        result = await collection.findOne({ _id: new ObjectId(id) });
      }
    } catch (error) {
      // If ObjectId conversion fails, continue to UUID search
    }
    
    // If not found by _id, try by 'id' field (UUID)
    if (!result) {
      result = await collection.findOne({ id: id });
    }
    
    return result as T | null;
  }

  /**
   * Generic update method for any collection
   */
  public async update<T>(collectionName: string, id: string, updates: any): Promise<T | null> {
    this.assertInitialized();
    const collection = this.db!.collection(collectionName);
    const result = await collection.findOneAndUpdate(
      { id: id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return result ? (result as T) : null;
  }

  /**
   * Generic delete method for any collection
   */
  public async delete(collectionName: string, id: string): Promise<boolean> {
    this.assertInitialized();
    const collection = this.db!.collection(collectionName);
    
    // Try to delete by _id first (MongoDB ObjectId)
    let result = null;
    try {
      if (ObjectId.isValid(id)) {
        result = await collection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          return true;
        }
      }
    } catch (error) {
      // If ObjectId conversion fails, continue to UUID deletion
    }
    
    // If not deleted by _id, try by 'id' field (UUID)
    result = await collection.deleteOne({ id: id });
    return result.deletedCount > 0;
  }

  private static isObjectId(value: any): value is ObjectId {
    return value instanceof ObjectId;
  }
}

export default DatabaseService; 