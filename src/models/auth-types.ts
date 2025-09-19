// ============ AUTHENTICATION & AUTHORIZATION TYPES ============

import {ObjectId} from 'mongodb';
import {SimulationAnalysis} from './types';

export type UserRole = 'admin' | 'user';

export type PermissionAction =
    | 'create' | 'read' | 'update' | 'delete'
    | 'manage_users' | 'view_analytics' | 'export_data'
    | 'create_demo_avatars' | 'manage_global_settings';

export type ResourceType =
    | 'avatars' | 'flows' | 'intents' | 'companies'
    | 'scenes' | 'simulations' | 'users' | 'settings';

// ============ USER MANAGEMENT ============

export interface UserAccount {
    _id: ObjectId;
    id: string; // UUID for external references
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    status: 'active' | 'inactive' | 'suspended';
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
    email_verified: boolean;
    profile: UserProfile;
    preferences: UserPreferences;
    subscription?: UserSubscription;
}

export interface UserProfile {
    company_name?: string;
    industry?: string;
    job_title?: string;
    phone?: string;
    timezone: string;
    language: string;
    avatar_url?: string;
}

export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    notifications: {
        email: boolean;
        browser: boolean;
        simulation_reports: boolean;
        avatar_updates: boolean;
    };
    dashboard_layout: 'compact' | 'detailed';
    default_avatar_type?: string;
}

export interface UserSubscription {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired';
    expires_at?: Date;
    limits: {
        max_avatars: number;
        max_flows_per_avatar: number;
        max_knowledge_files_per_avatar: number;
        max_simulations_per_month: number;
        max_storage_mb: number;
    };
}

// ============ PERMISSIONS & ROLES ============

export interface Permission {
    _id: ObjectId;
    id: string;
    name: string;
    description: string;
    resource: ResourceType;
    action: PermissionAction;
    conditions?: PermissionCondition[];
}

export interface PermissionCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'owner';
    value: any;
}

export interface RolePermission {
    role: UserRole;
    permissions: string[]; // Permission IDs
}

// ============ JWT & TOKEN MANAGEMENT ============

export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    sessionId: string;
    iat?: number;
    exp?: number;
}

// ============ SESSION MANAGEMENT ============

export interface UserSession {
    _id: ObjectId;
    id: string; // UUID
    user_id: string; // User UUID
    token: string; // JWT token
    refresh_token: string;
    expires_at: Date;
    created_at: Date;
    last_activity: Date;
    ip_address: string;
    user_agent: string;
    is_active: boolean;
}

// ============ EXTENDED AVATAR TYPES ============

export interface ExtendedAvatar {
    _id: ObjectId;
    id: string; // UUID
    user_id: string; // Owner UUID
    name: string;
    description: string;
    type: 'demo' | 'custom' | 'reactive';
    status: 'draft' | 'active' | 'archived';

    // Core properties
    personality: string;
    specialization: string;
    communication_style: string;
    background: string;

    // Ownership and sharing
    is_public: boolean;
    is_template: boolean;
    original_demo_id?: string; // If copied from demo

    // Content
    knowledge_files: ExtendedKnowledgeFile[];
    flows: ExtendedFlow[];
    intents: ExtendedIntent[];

    // Metadata
    created_at: Date;
    updated_at: Date;
    usage_stats: ExtendedUsageStats;
    tags: string[];
    category: string;
}

export interface ExtendedKnowledgeFile {
    id: string;
    name: string;
    original_name: string;
    file_type: string;
    file_size: number;
    uploaded_at: Date;
    processed: boolean;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    content_preview?: string;
    vector_ids: string[];
    chunk_count: number;
    embedding_model: string;
    processing_error?: string;
}

export interface ExtendedFlow {
    id: string;
    name: string;
    description: string;
    steps: ExtendedFlowStep[];
    entry_intents: string[];
    priority: number;
    success_criteria: string[];
    max_duration: number; // seconds
    repeatable: boolean;
    created_from: 'ai_generated' | 'manual' | 'hybrid' | 'imported';
    created_at: Date;
    updated_at: Date;
    version: number;
    is_template: boolean;
    original_flow_id?: string; // If imported/copied
}

export interface ExtendedFlowStep {
    id: string;
    name: string;
    description: string;
    required: boolean;
    next_steps: string[];
    validation_rules?: string[];
    timeout?: number;
    retry_count?: number;
    system_prompt?: string;
    user_prompt_template?: string;
    position: { x: number; y: number }; // For visual editor
}

export interface ExtendedIntent {
    id: string;
    name: string;
    description: string;
    keywords: string[];
    examples: string[];
    requires_flow: boolean;
    flow_name?: string;
    repeatable: boolean;
    priority: number;
    system_prompt?: string;
    user_prompt_template?: string;
    confidence_threshold: number;
    created_from: 'ai_generated' | 'manual' | 'imported';
    created_at: Date;
    updated_at: Date;
    is_template: boolean;
    original_intent_id?: string; // If imported/copied
    enabled: boolean;
}

export interface ExtendedUsageStats {
    total_conversations: number;
    total_messages: number;
    average_conversation_length: number;
    most_used_flows: string[];
    most_triggered_intents: string[];
    last_used: Date;
    success_rate: number;
    user_satisfaction_rating: number;
    performance_metrics: {
        avg_response_time_ms: number;
        intent_accuracy: number;
        flow_completion_rate: number;
    };
}

// ============ COMPANY PROFILES & SCENES ============

export interface CompanyProfile {
    _id: ObjectId;
    id: string;
    user_id: string; // Owner UUID
    name: string;
    description: string;
    industry: string;
    size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    location: string;

    // Business details
    mission: string;
    values: string[];
    products_services: string[];
    target_audience: string[];

    // Brand voice
    brand_voice: {
        tone: string;
        style: string;
        key_messages: string[];
        do_not_use: string[];
    };

    // Team structure
    team_roles: CompanyRole[];

    created_at: Date;
    updated_at: Date;
    is_template: boolean;
}

export interface CompanyRole {
    id: string;
    title: string;
    department: string;
    responsibilities: string[];
    authority_level: number; // 1-10
    reports_to?: string; // Role ID
}

export interface SimulationScene {
    _id: ObjectId;
    id: string;
    user_id: string; // Owner UUID
    company_id?: string; // Optional company context

    name: string;
    description: string;
    category: 'meeting' | 'sales' | 'training' | 'support' | 'negotiation' | 'crisis' | 'onboarding';

    // Scenario details
    scenario: {
        situation: string;
        context: string;
        objectives: string[];
        constraints: string[];
        success_criteria: string[];
    };

    // Participants
    required_participants: SceneParticipant[];
    optional_participants: SceneParticipant[];

    // Configuration
    estimated_duration_minutes: number;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';

    // Content
    conversation_starters: string[];
    key_talking_points: string[];
    potential_objections: string[];

    created_at: Date;
    updated_at: Date;
    is_template: boolean;
    usage_count: number;
}

export interface SceneParticipant {
    id: string;
    role: string;
    avatar_id?: string; // Optional pre-assigned avatar
    persona: {
        background: string;
        goals: string[];
        challenges: string[];
        personality_traits: string[];
        decision_making_style: string;
    };
    required_skills: string[];
}

// ============ SIMULATION EXECUTION ============

export interface ExtendedSimulationExecution {
    _id: ObjectId;
    id: string;
    user_id: string; // Creator UUID
    scene_id: string;

    // Participants
    participants: SimulationExecutionParticipant[];

    // Execution state
    status: 'setup' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    start_time: Date;
    end_time?: Date;
    current_turn: number;
    max_turns: number;

    // Messages and analysis
    messages: ExtendedSimulationMessage[];
    real_time_analysis: SimulationAnalysis;
    final_analysis?: SimulationAnalysis;

    // Configuration
    config: SimulationExecutionConfig;

    created_at: Date;
    updated_at: Date;
}

export interface SimulationExecutionParticipant {
    id: string;
    avatar_id: string;
    role: string;
    session_id: string;
    is_human: boolean; // true if human user, false if AI avatar
    user_id?: string; // If human participant
}

export interface ExtendedSimulationMessage {
    id: string;
    simulation_id: string;
    participant_id: string;
    content: string;
    timestamp: Date;

    // AI metadata
    intent?: string;
    flow_step?: string;
    confidence?: number;
    response_time_ms: number;

    // Analysis
    sentiment: 'positive' | 'neutral' | 'negative';
    topics: string[];
    key_phrases: string[];

    // Technical
    tokens_used: number;
    cost_usd: number;
}

export interface SimulationExecutionConfig {
    auto_start: boolean;
    turn_timeout_seconds: number;
    max_message_length: number;
    enable_real_time_analysis: boolean;
    save_detailed_logs: boolean;
    export_format: 'json' | 'csv' | 'xlsx';
    analysis_depth: 'basic' | 'detailed' | 'comprehensive';
    human_participant_allowed: boolean;
}

// ============ ANALYTICS & REPORTING ============

export interface UserAnalytics {
    _id: ObjectId;
    user_id: string;
    period: 'daily' | 'weekly' | 'monthly';
    date: Date;

    metrics: {
        avatars_created: number;
        flows_created: number;
        simulations_run: number;
        messages_exchanged: number;
        time_spent_minutes: number;

        // Performance
        avg_intent_accuracy: number;
        avg_flow_completion_rate: number;
        avg_user_satisfaction: number;
    };

    top_performing_avatars: string[];
    most_used_features: string[];

    created_at: Date;
}

export interface SystemAnalytics {
    _id: ObjectId;
    period: 'daily' | 'weekly' | 'monthly';
    date: Date;

    user_metrics: {
        total_users: number;
        active_users: number;
        new_registrations: number;
        user_retention_rate: number;
    };

    content_metrics: {
        total_avatars: number;
        total_flows: number;
        total_simulations: number;
        avg_avatars_per_user: number;
    };

    performance_metrics: {
        avg_response_time_ms: number;
        system_uptime_percentage: number;
        api_success_rate: number;
        error_rate: number;
    };

    costs: {
        openai_api_cost: number;
        storage_cost: number;
        infrastructure_cost: number;
    };

    created_at: Date;
}

// ============ AUDIT LOG ============

export interface AuditLog {
    _id: ObjectId;
    id: string;
    user_id: string;
    action: string;
    resource_type: ResourceType;
    resource_id: string;
    details: Record<string, any>;
    ip_address: string;
    user_agent: string;
    timestamp: Date;
    success: boolean;
    error_message?: string;
}
