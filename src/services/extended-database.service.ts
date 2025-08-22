import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { 
  MONGODB_URI, 
  MONGODB_DB_NAME 
} from '../config/env';
import {
  UserAccount,
  UserSession,
  ExtendedAvatar,
  CompanyProfile,
  SimulationScene,
  ExtendedSimulationExecution,
  UserAnalytics,
  SystemAnalytics,
  AuditLog,
  Permission,
  UserRole
} from '../models/auth-types';

class ExtendedDatabaseService {
  private client: MongoClient;
  private db: Db | null = null;
  private static instance: ExtendedDatabaseService;
  private isConnected: boolean = false;

  // Collections
  private userAccounts: Collection<UserAccount> | null = null;
  private userSessions: Collection<UserSession> | null = null;
  private extendedAvatars: Collection<ExtendedAvatar> | null = null;
  private companyProfiles: Collection<CompanyProfile> | null = null;
  private simulationScenes: Collection<SimulationScene> | null = null;
  private simulationExecutions: Collection<ExtendedSimulationExecution> | null = null;
  private userAnalytics: Collection<UserAnalytics> | null = null;
  private systemAnalytics: Collection<SystemAnalytics> | null = null;
  private auditLogs: Collection<AuditLog> | null = null;
  private permissions: Collection<Permission> | null = null;

  private constructor() {
    this.client = new MongoClient(MONGODB_URI);
  }

  public static getInstance(): ExtendedDatabaseService {
    if (!ExtendedDatabaseService.instance) {
      ExtendedDatabaseService.instance = new ExtendedDatabaseService();
    }
    return ExtendedDatabaseService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Extended Database is already connected');
      return;
    }

    try {
      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to MongoDB (Extended Database)');

      this.db = this.client.db(MONGODB_DB_NAME);
      
      // Initialize collections
      this.userAccounts = this.db.collection<UserAccount>('user_accounts');
      this.userSessions = this.db.collection<UserSession>('user_sessions');
      this.extendedAvatars = this.db.collection<ExtendedAvatar>('extended_avatars');
      this.companyProfiles = this.db.collection<CompanyProfile>('company_profiles');
      this.simulationScenes = this.db.collection<SimulationScene>('simulation_scenes');
      this.simulationExecutions = this.db.collection<ExtendedSimulationExecution>('simulation_executions');
      this.userAnalytics = this.db.collection<UserAnalytics>('user_analytics');
      this.systemAnalytics = this.db.collection<SystemAnalytics>('system_analytics');
      this.auditLogs = this.db.collection<AuditLog>('audit_logs');
      this.permissions = this.db.collection<Permission>('permissions');

      // Create indexes
      await this.createIndexes();
      
      // Initialize default data
      await this.initializeDefaultData();
      
      console.log('Extended Database initialization completed successfully');
    } catch (error) {
      console.error('Error during Extended Database initialization:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    try {
      // User accounts indexes
      await this.userAccounts!.createIndex({ email: 1 }, { unique: true });
      await this.userAccounts!.createIndex({ id: 1 }, { unique: true });
      await this.userAccounts!.createIndex({ role: 1 });
      await this.userAccounts!.createIndex({ status: 1 });

      // User sessions indexes
      await this.userSessions!.createIndex({ user_id: 1 });
      await this.userSessions!.createIndex({ token: 1 }, { unique: true });
      await this.userSessions!.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

      // Extended avatars indexes
      await this.extendedAvatars!.createIndex({ user_id: 1 });
      await this.extendedAvatars!.createIndex({ id: 1 }, { unique: true });
      await this.extendedAvatars!.createIndex({ type: 1 });
      await this.extendedAvatars!.createIndex({ status: 1 });
      await this.extendedAvatars!.createIndex({ is_public: 1 });
      await this.extendedAvatars!.createIndex({ tags: 1 });

      // Company profiles indexes
      await this.companyProfiles!.createIndex({ user_id: 1 });
      await this.companyProfiles!.createIndex({ id: 1 }, { unique: true });
      await this.companyProfiles!.createIndex({ industry: 1 });

      // Simulation scenes indexes
      await this.simulationScenes!.createIndex({ user_id: 1 });
      await this.simulationScenes!.createIndex({ id: 1 }, { unique: true });
      await this.simulationScenes!.createIndex({ category: 1 });
      await this.simulationScenes!.createIndex({ is_template: 1 });

      // Simulation executions indexes
      await this.simulationExecutions!.createIndex({ user_id: 1 });
      await this.simulationExecutions!.createIndex({ id: 1 }, { unique: true });
      await this.simulationExecutions!.createIndex({ scene_id: 1 });
      await this.simulationExecutions!.createIndex({ status: 1 });

      // Analytics indexes
      await this.userAnalytics!.createIndex({ user_id: 1, period: 1, date: 1 });
      await this.systemAnalytics!.createIndex({ period: 1, date: 1 });

      // Audit logs indexes
      await this.auditLogs!.createIndex({ user_id: 1 });
      await this.auditLogs!.createIndex({ timestamp: 1 });
      await this.auditLogs!.createIndex({ resource_type: 1 });

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }

  private async initializeDefaultData(): Promise<void> {
    try {
      // Create default admin user if doesn't exist
      const adminExists = await this.userAccounts!.findOne({ email: 'admin@aiavatar.com' });
      if (!adminExists) {
        await this.createUser({
          email: 'admin@aiavatar.com',
          password: 'admin123', // Will be hashed
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin'
        });
        console.log('Default admin user created');
      }

      // Create default permissions
      await this.initializePermissions();

      // Create demo avatars
      await this.initializeDemoAvatars();

      console.log('Default data initialization completed');
    } catch (error) {
      console.error('Error initializing default data:', error);
      throw error;
    }
  }

  private async initializePermissions(): Promise<void> {
    const defaultPermissions = [
      { name: 'create_avatar', resource: 'avatars', action: 'create' },
      { name: 'read_own_avatars', resource: 'avatars', action: 'read' },
      { name: 'update_own_avatars', resource: 'avatars', action: 'update' },
      { name: 'delete_own_avatars', resource: 'avatars', action: 'delete' },
      { name: 'manage_all_users', resource: 'users', action: 'manage_users' },
      { name: 'view_system_analytics', resource: 'settings', action: 'view_analytics' },
      { name: 'create_demo_avatars', resource: 'avatars', action: 'create_demo_avatars' }
    ];

    for (const perm of defaultPermissions) {
      const exists = await this.permissions!.findOne({ name: perm.name });
      if (!exists) {
        await this.permissions!.insertOne({
          _id: new ObjectId(),
          id: uuidv4(),
          name: perm.name,
          description: `Permission to ${perm.action} ${perm.resource}`,
          resource: perm.resource as any,
          action: perm.action as any
        });
      }
    }
  }

  private async initializeDemoAvatars(): Promise<void> {
    const demoAvatars = [
      {
        name: 'Prezes IT',
        description: 'Doświadczony prezes firmy technologicznej, ekspert od AI i automatyzacji',
        personality: 'Charyzmatyczny, wizjonerski, analityczny, otwarty na innowacje',
        specialization: 'Zarządzanie projektami AI, rozwój algorytmów uczenia maszynowego',
        communication_style: 'Jasny i zrozumiały, otwarty na feedback, techniczny',
        background: 'Z ponad 10-letnim doświadczeniem w branży technologicznej, specjalista od transformacji cyfrowej',
        category: 'business'
      },
      {
        name: 'Networker',
        description: 'Ekspert od networkingu i budowania relacji biznesowych',
        personality: 'Towarzyski, empatyczny, perswazyjny, zorientowany na ludzi',
        specialization: 'Budowanie sieci kontaktów, sprzedaż B2B, rozwój biznesu',
        communication_style: 'Przyjazny, angażujący, skupiony na relacjach',
        background: 'Wieloletnie doświadczenie w sprzedaży i rozwoju biznesu',
        category: 'sales'
      },
      {
        name: 'Trener',
        description: 'Profesjonalny trener biznesowy i coach rozwoju osobistego',
        personality: 'Motywujący, cierpliwy, analityczny, wspierający',
        specialization: 'Szkolenia biznesowe, coaching, rozwój umiejętności',
        communication_style: 'Edukacyjny, inspirujący, zadaje dobre pytania',
        background: 'Certyfikowany trener i coach z wieloletnim doświadczeniem',
        category: 'training'
      },
      {
        name: 'Uczeń',
        description: 'Ciekawy świata student gotowy do nauki i zadawania pytań',
        personality: 'Ciekawski, entuzjastyczny, otwarty na wiedzę, wytrwały',
        specialization: 'Uczenie się, zadawanie pytań, przyswajanie wiedzy',
        communication_style: 'Dociekliwy, prosty, zadaje dużo pytań',
        background: 'Student chętny do nauki i rozwoju',
        category: 'education'
      },
      {
        name: 'Pracownik',
        description: 'Doświadczony pracownik biurowy, ekspert od codziennych zadań',
        personality: 'Praktyczny, zorganizowany, pomocny, metodyczny',
        specialization: 'Zarządzanie zadaniami, organizacja pracy, efektywność',
        communication_style: 'Konkretny, praktyczny, skupiony na rozwiązaniach',
        background: 'Wieloletnie doświadczenie w środowisku biurowym',
        category: 'workplace'
      },
      {
        name: 'Klient',
        description: 'Reprezentuje perspektywę klienta w różnych scenariuszach biznesowych',
        personality: 'Wymagający, dociekliwy, zorientowany na wartość, ostrożny',
        specialization: 'Ocena produktów/usług, negocjacje, podejmowanie decyzji',
        communication_style: 'Bezpośredni, zadaje konkretne pytania, oczekuje wartości',
        background: 'Doświadczony klient biznesowy z wysokimi oczekiwaniami',
        category: 'customer'
      }
    ];

    for (const avatar of demoAvatars) {
      const exists = await this.extendedAvatars!.findOne({ 
        name: avatar.name, 
        type: 'demo' 
      });
      
      if (!exists) {
        await this.extendedAvatars!.insertOne({
          _id: new ObjectId(),
          id: uuidv4(),
          user_id: 'system', // System-owned demo avatars
          name: avatar.name,
          description: avatar.description,
          type: 'demo',
          status: 'active',
          personality: avatar.personality,
          specialization: avatar.specialization,
          communication_style: avatar.communication_style,
          background: avatar.background,
          is_public: true,
          is_template: true,
          knowledge_files: [],
          flows: [],
          intents: [],
          created_at: new Date(),
          updated_at: new Date(),
          usage_stats: {
            total_conversations: 0,
            total_messages: 0,
            average_conversation_length: 0,
            most_used_flows: [],
            most_triggered_intents: [],
            last_used: new Date(),
            success_rate: 0,
            user_satisfaction_rating: 0,
            performance_metrics: {
              avg_response_time_ms: 0,
              intent_accuracy: 0,
              flow_completion_rate: 0
            }
          },
          tags: [avatar.category],
          category: avatar.category
        });
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('Extended Database not connected');
      return;
    }
    
    try {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from Extended Database');
    } catch (error) {
      console.error('Error during Extended Database disconnection:', error);
      throw error;
    }
  }

  // ============ USER MANAGEMENT ============

  public async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: UserRole;
  }): Promise<UserAccount> {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const user: UserAccount = {
      _id: new ObjectId(),
      id: uuidv4(),
      email: userData.email,
      password_hash: passwordHash,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: userData.role,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      email_verified: false,
      profile: {
        timezone: 'UTC',
        language: 'pl'
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          browser: true,
          simulation_reports: true,
          avatar_updates: true
        },
        dashboard_layout: 'detailed'
      },
      subscription: {
        plan: 'free',
        status: 'active',
        limits: {
          max_avatars: 5,
          max_flows_per_avatar: 3,
          max_knowledge_files_per_avatar: 10,
          max_simulations_per_month: 50,
          max_storage_mb: 100
        }
      }
    };

    await this.userAccounts!.insertOne(user);
    return user;
  }

  public async getUserByEmail(email: string): Promise<UserAccount | null> {
    return this.userAccounts!.findOne({ email });
  }

  public async getUserById(id: string): Promise<UserAccount | null> {
    return this.userAccounts!.findOne({ id });
  }

  public async validateUserPassword(email: string, password: string): Promise<UserAccount | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  // ============ SESSION MANAGEMENT ============

  public async createSession(userId: string, token: string, refreshToken: string, expiresAt: Date, ipAddress: string, userAgent: string): Promise<UserSession> {
    const session: UserSession = {
      _id: new ObjectId(),
      id: uuidv4(),
      user_id: userId,
      token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      created_at: new Date(),
      last_activity: new Date(),
      ip_address: ipAddress,
      user_agent: userAgent,
      is_active: true
    };

    await this.userSessions!.insertOne(session);
    return session;
  }

  public async getSessionByToken(token: string): Promise<UserSession | null> {
    return this.userSessions!.findOne({ token, is_active: true });
  }

  public async invalidateSession(sessionId: string): Promise<boolean> {
    const result = await this.userSessions!.updateOne(
      { id: sessionId },
      { $set: { is_active: false } }
    );
    return result.modifiedCount > 0;
  }

  // ============ AVATAR MANAGEMENT ============

  public async createAvatar(avatarData: Omit<ExtendedAvatar, '_id' | 'id' | 'created_at' | 'updated_at'>): Promise<ExtendedAvatar> {
    const avatar: ExtendedAvatar = {
      _id: new ObjectId(),
      id: uuidv4(),
      ...avatarData,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.extendedAvatars!.insertOne(avatar);
    return avatar;
  }

  public async getAvatarsByUserId(userId: string): Promise<ExtendedAvatar[]> {
    return this.extendedAvatars!.find({ user_id: userId }).toArray();
  }

  public async getAvatarById(id: string): Promise<ExtendedAvatar | null> {
    return this.extendedAvatars!.findOne({ id });
  }

  public async getDemoAvatars(): Promise<ExtendedAvatar[]> {
    return this.extendedAvatars!.find({ type: 'demo', is_public: true }).toArray();
  }

  public async copyDemoAvatar(demoAvatarId: string, userId: string, customizations?: Partial<ExtendedAvatar>): Promise<ExtendedAvatar> {
    const demoAvatar = await this.getAvatarById(demoAvatarId);
    if (!demoAvatar || demoAvatar.type !== 'demo') {
      throw new Error('Demo avatar not found');
    }

    const copiedAvatar: ExtendedAvatar = {
      ...demoAvatar,
      _id: new ObjectId(),
      id: uuidv4(),
      user_id: userId,
      type: 'custom',
      is_public: false,
      is_template: false,
      original_demo_id: demoAvatarId,
      created_at: new Date(),
      updated_at: new Date(),
      usage_stats: {
        total_conversations: 0,
        total_messages: 0,
        average_conversation_length: 0,
        most_used_flows: [],
        most_triggered_intents: [],
        last_used: new Date(),
        success_rate: 0,
        user_satisfaction_rating: 0,
        performance_metrics: {
          avg_response_time_ms: 0,
          intent_accuracy: 0,
          flow_completion_rate: 0
        }
      },
      ...customizations
    };

    await this.extendedAvatars!.insertOne(copiedAvatar);
    return copiedAvatar;
  }

  // ============ COMPANY PROFILES ============

  public async createCompanyProfile(profileData: Omit<CompanyProfile, '_id' | 'id' | 'created_at' | 'updated_at'>): Promise<CompanyProfile> {
    const profile: CompanyProfile = {
      _id: new ObjectId(),
      id: uuidv4(),
      ...profileData,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.companyProfiles!.insertOne(profile);
    return profile;
  }

  public async getCompanyProfilesByUserId(userId: string): Promise<CompanyProfile[]> {
    return this.companyProfiles!.find({ user_id: userId }).toArray();
  }

  // ============ SIMULATION SCENES ============

  public async createSimulationScene(sceneData: Omit<SimulationScene, '_id' | 'id' | 'created_at' | 'updated_at'>): Promise<SimulationScene> {
    const scene: SimulationScene = {
      _id: new ObjectId(),
      id: uuidv4(),
      ...sceneData,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.simulationScenes!.insertOne(scene);
    return scene;
  }

  public async getSimulationScenesByUserId(userId: string): Promise<SimulationScene[]> {
    return this.simulationScenes!.find({ user_id: userId }).toArray();
  }

  public async getTemplateScenes(): Promise<SimulationScene[]> {
    return this.simulationScenes!.find({ is_template: true }).toArray();
  }

  // ============ AUDIT LOGGING ============

  public async logAction(
    userId: string,
    action: string,
    resourceType: any,
    resourceId: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const auditLog: AuditLog = {
      _id: new ObjectId(),
      id: uuidv4(),
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date(),
      success,
      error_message: errorMessage
    };

    await this.auditLogs!.insertOne(auditLog);
  }

  // ============ UTILITY METHODS ============

  public getDatabase(): Db {
    if (!this.db) {
      throw new Error('Database connection is not established.');
    }
    return this.db;
  }

  public isInitialized(): boolean {
    return this.isConnected;
  }
}

export default ExtendedDatabaseService;
