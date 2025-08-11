// Types for communication between modules
export interface UserQuery {
  user_message: string;
  session_id?: string;
  avatar_type?: string;
}

export interface UserStreamingQuery extends UserQuery {
  request_id: string;
}

export interface NPCState {
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    neutral: number;
  };
  activeGoals: string[];
  disabledGoals: string[];
}

export interface AnalysisResult {
  is_question: boolean;
  tone: 'angry' | 'nice' | 'neutral';
  topic_relevant: boolean;
  intent: 'question' | 'greeting' | 'criticism' | 'other';
  detected_goal?: DetectedGoal;
}

export interface DetectedGoal {
  name: string;
  confidence: number;
  entities?: Record<string, string>;
}

export interface Goal {
  name: string;
  repeatable: boolean;
  enabled_by_default: boolean;
  activation: {
    trigger?: string;
    intent?: string;
  };
  actions: GoalAction;
  extracted_entities?: {
    name: string;
  }[];
  activation_condition?: {
    logical_expression: string;
  };
}

export interface GoalAction {
  instruction?: string;
  emotion_change?: 'JOY' | 'ANGER' | 'SADNESS' | 'FEAR' | 'NEUTRAL';
  character_changes?: {
    enable_goals?: string[];
    disable_goals?: string[];
  };
  say_verbatim?: string;
  send_trigger?: string;
  trigger_params?: {
    name: string;
    value: string;
  }[];
}

export interface ExecuteDetectedGoal {
  executedGoalName: string;
  responseText: string;
  isSayVerbatim: boolean;
}

export interface ResponseData {
  message: string;
  audio_url?: string;
  state?: NPCState;
}

export interface KnowledgeChunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    category: string;
    relevance_score?: number;
  };
}

// Message format for API
export interface MessagePayload {
  user_message: string;
  is_question: boolean;
  history: string;
  context_knowledge: string;
  tone: 'angry' | 'nice' | 'neutral';
}

// Configuration for speech synthesizer (Eleven Labs)
export interface SpeechConfig {
  text: string;
  voice_id: string;
  model_id: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

// MongoDB interfaces for managing users, avatars, sessions and chat history
import { ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId; // MongoDB ObjectId
  email: string; // Unique user identifier
  firstName: string;
  lastName: string;  
}

export interface Avatar {
  _id: ObjectId; // MongoDB ObjectId   
  firstName: string;
  lastName: string;  
}

// Default IDs for default user and avatar
export const DEFAULT_USER_ID = '6818757b228dbc374ab60abb';
export const DEFAULT_AVATAR_ID = '681876c1228dbc374ab60abc';

export interface Session {
  _id: string; // UUID as string
  userId: ObjectId;
  avatarId: ObjectId;
  startedAt: Date;
}

export interface ChatHistory {
  _id: ObjectId; // MongoDB ObjectId
  sessionId: string;
  isUser: boolean;
  content: string;
  timestamp: Date;
  goalName: string | null;
  isSayVerbatim: boolean;
}

export interface Prompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface UserPrompt extends Prompt {
  role: 'user';
}

export interface SystemPrompt extends Prompt {
  role: 'system';
}

/**
 * Interface for vector database operations
 * This allows easy switching between different vector databases (Pinecone, Qdrant, etc.)
 */
export interface VectorDatabaseService {
  /**
   * Query knowledge base for similar vectors
   * @param query User query text
   * @returns Array of matching text chunks
   */
  queryKnowledgeBase(query: string): Promise<string[]>;
  
  /**
   * Add or update vectors in the database
   * @param vectors Array of vectors to upsert
   * @returns Number of successfully added vectors
   */
  upsertVectors(vectors: VectorData[]): Promise<number>;
  
  /**
   * Delete all vectors from the database
   * @returns Success status
   */
  deleteAllVectors(): Promise<boolean>;
  
  /**
   * Delete specific vectors by IDs
   * @param ids Array of vector IDs to delete
   * @returns Success status
   */
  deleteVectorsByIds(ids: string[]): Promise<boolean>;
  
  /**
   * Get database health status
   * @returns Health status
   */
  getHealthStatus(): Promise<boolean>;
  
  /**
   * Get detailed health information
   * @returns Detailed health status with database type, message and timestamp
   */
  getDetailedHealthStatus(): Promise<VectorDatabaseHealth>;
}

export interface VectorData {
  id: string; // UUID format for all vector databases
  values: number[];
  metadata: {
    category: string;
    topic: string;
    text: string;
    text_length: number;
    token_count: number;
    avatar_id?: string; // For multi-avatar support
    content_hash?: string; // For deduplication
    created_at?: string; // ISO timestamp
    [key: string]: any; // Allow additional metadata fields
  };
}

export interface VectorDatabaseHealth {
  isHealthy: boolean;
  databaseType: string;
  message?: string;
  timestamp: Date;
}

export interface VectorDatabaseConfig {
    minimumScoreThreshold: number;
    bestMatchingRecordsAmount: number;
    vectorSize: number;
}

// ============ MINDSTATE STACK INTERFACES ============

export interface MindStateStackItem {
    tag: string;
    timestamp: number;
    flowStep?: string;
    intent?: string;
    confidence?: number;
    metadata?: Record<string, any>;
}

export interface FulfilledIntent {
    fulfilled: boolean;
    repeatable: boolean;
    last_used?: number;
    completion_count: number;
    max_age?: number; // w sekundach
    flow_required?: boolean;
}

export interface MindStateStack {
    stack: MindStateStackItem[];
    fulfilled_intents: Record<string, FulfilledIntent>;
    current_flow?: string;
    current_flow_step?: string;
    session_id: string;
    created_at: number;
    updated_at: number;
    flow_history?: Array<{
        flow_id: string;
        status: string;
        timestamp: number;
    }>;
}

// ============ INTENT CLASSIFICATION INTERFACES ============

export interface IntentClassificationResult {
    intent: string;
    confidence: number;
    entities?: Record<string, string>;
    requires_flow?: boolean;
    flow_name?: string;
    is_continuation?: boolean;
}

export interface IntentDefinition {
    name: string;
    description: string;
    keywords: string[];
    examples: string[];
    requires_flow: boolean;
    flow_name?: string;
    repeatable: boolean;
    max_age?: number;
    priority: number;
}

// ============ BUSINESS AVATAR INTERFACES ============

export interface BusinessCompany {
    name: string;
    industry: string;
    location: string;
    size: string;
    mission: string;
    offer: string[];
    use_cases: string[];
    strategic_goals: string[];
    business_needs: string[];
    specializations: string[];
}

export interface BusinessPersonality {
    style: string;
    tone: string;
    business_motivation: string;
    communication_style: string;
    emotional_traits: string[];
    strengths: string[];
    weaknesses: string[];
}

export interface BusinessAvatar extends Avatar {
    company: BusinessCompany;
    personality: BusinessPersonality;
    position: string;
    experience_years: number;
    specializations: string[];
    mindState?: MindStateStack;
    active_flows: string[];
    last_interaction?: number;
}

// ============ FLOW MANAGEMENT INTERFACES ============

export interface FlowStep {
    id: string;
    name: string;
    description: string;
    required: boolean;
    next_steps: string[];
    validation_rules?: string[];
    timeout?: number;
    retry_count?: number;
}

export interface FlowDefinition {
    id: string;
    name: string;
    description: string;
    entry_intents: string[];
    priority: number;
    steps: FlowStep[];
    success_criteria: string[];
    max_duration: number;
    repeatable: boolean;
    tags?: string[];
    category?: string;
}

export interface FlowStepExecution {
    step_id: string;
    step_name: string;
    start_time: number;
    end_time?: number;
    status: 'active' | 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
}

export interface FlowExecution {
    id: string;
    session_id: string;
    flow_id: string;
    flow_name: string;
    current_step: string;
    completed_steps: string[];
    step_executions: FlowStepExecution[];
    start_time: number;
    end_time?: number;
    last_activity: number;
    status: 'active' | 'completed' | 'failed' | 'cancelled' | 'timeout';
    context: Record<string, any>;
    progress_percentage?: number;
    metadata?: Record<string, any>;
}

// ============ PROMPT BUILDER INTERFACES ============

export interface PromptContext {
    user_message: string;
    chat_history: string;
    mind_state: MindStateStack;
    avatar: BusinessAvatar;
    current_intent: string;
    current_flow?: string;
    current_flow_step?: string;
    rag_context?: string;
    session_context?: Record<string, any>;
    flow_context?: Record<string, any>;
}

export interface PromptTemplate {
    id: string;
    name: string;
    intent: string;
    flow?: string;
    flow_step?: string;
    system_prompt: string;
    user_prompt_template: string;
    variables: string[];
    priority: number;
}

// ============ CONVERSATION SIMULATION INTERFACES ============

export interface SimulationParticipant {
    id: string;
    avatarType: 'networker' | 'trainer' | 'client' | 'student';
    role: 'teacher' | 'learner' | 'seller' | 'buyer' | 'interviewer' | 'interviewee';
    avatar: BusinessAvatar;
    persona: SimulationPersona;
    responseStyle: 'proactive' | 'reactive' | 'balanced';
}

export interface SimulationPersona {
    name: string;
    background: string;
    goals: string[];
    challenges: string[];
    personality_traits: string[];
    communication_style: string;
    expertise_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    industry: string;
    company_size: string;
    budget_range?: string;
    decision_making_style: string;
}

export interface SimulationScenario {
    id: string;
    name: string;
    description: string;
    objective: string;
    duration_minutes: number;
    context: {
        industry: string;
        situation: string;
        constraints?: string[];
        success_metrics: string[];
    };
    participants: SimulationParticipant[];
    conversation_starters: string[];
    evaluation_criteria: string[];
}

export interface SimulationMessage {
    id: string;
    simulation_id: string;
    participant_id: string;
    content: string;
    timestamp: number;
    intent: string;
    flow_step?: string;
    response_time_ms: number;
    metadata: {
        confidence: number;
        flow_triggered: boolean;
        rag_used: boolean;
        tokens_used: number;
    };
}

export interface SimulationExecution {
    id: string;
    scenario: SimulationScenario;
    status: 'setting_up' | 'running' | 'paused' | 'completed' | 'failed';
    start_time: number;
    end_time?: number;
    current_turn: number;
    max_turns: number;
    messages: SimulationMessage[];
    analysis: SimulationAnalysis;
    participants_sessions: Map<string, string>; // participant_id -> session_id
}

export interface SimulationAnalysis {
    conversation_quality_score: number;
    participant_performance: Map<string, ParticipantPerformance>;
    flow_analysis: FlowAnalysis;
    intent_distribution: Map<string, number>;
    response_times: {
        average: number;
        min: number;
        max: number;
    };
    conversation_metrics: {
        total_turns: number;
        avg_message_length: number;
        topic_consistency: number;
        goal_achievement_rate: number;
    };
    insights: string[];
    improvement_suggestions: string[];
}

export interface ParticipantPerformance {
    participant_id: string;
    message_count: number;
    avg_response_time: number;
    intent_accuracy: number;
    flow_completion_rate: number;
    conversation_contribution: number;
    goal_achievement: number;
    strengths: string[];
    weaknesses: string[];
    improvement_areas: string[];
}

export interface FlowAnalysis {
    flows_triggered: Map<string, number>;
    flow_completion_rates: Map<string, number>;
    flow_transitions: Array<{
        from: string;
        to: string;
        count: number;
    }>;
    stuck_points: Array<{
        flow_step: string;
        frequency: number;
        avg_duration: number;
    }>;
}

export interface SimulationConfig {
    auto_start: boolean;
    turn_timeout_seconds: number;
    max_message_length: number;
    enable_real_time_analysis: boolean;
    save_to_database: boolean;
    export_format: 'json' | 'csv' | 'xlsx';
    analysis_depth: 'basic' | 'detailed' | 'comprehensive';
}