import { Request, Response } from 'express';
import openaiService from '../services/openai.service';
import goalService from '../services/goal.service';
import {
  AnalysisResult,
  ChatHistory,
  UserQuery,
  UserStreamingQuery,
  BusinessAvatar,
  IntentClassificationResult,
  MindStateStack,
  FlowExecution,
  SystemPrompt, UserPrompt
} from '../models/types';
import sessionService from "../services/session.service";
import DatabaseService from "../services/database.service";
import vectorDatabaseService from '../services/vector-database.service';
import IntentClassifier from '../services/intent-classifier.service';
import MemoryManager from '../services/memory-manager.service';
import PromptBuilder from '../services/prompt-builder.service';
import ElevenLabsService from '../services/elevenlabs.service';
import ConversationLoggerService from '../services/conversation-logger.service';
import FlowManager from '../services/flow-manager.service';
import CustomAvatarService from '../services/custom-avatar.service';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

interface SessionContext {
  sessionId: string;
  chatHistory: ChatHistory[];
  avatarName: string | null;
  businessAvatar: BusinessAvatar | null;
  mindState: MindStateStack;
}

interface QueryProcessingResult {
  sessionId: string;
  response: string;
  analysisResult?: AnalysisResult;
  goalExecuted?: string;
  isSayVerbatim?: boolean;
}

interface StreamingCallbacks {
  onAnalysisComplete?: (analysis: AnalysisResult) => void;
  onKnowledgeRetrieved?: (contextFound: boolean) => void;
  onStreamingChunk?: (chunk: string) => void;
}

class QueryController {
  // Map storing active SSE connections
  private activeConnections: Map<string, Response> = new Map();
  
  // Message constants
  private static readonly NON_RELEVANT_TOPIC_MESSAGE = 'Przepraszam, ale mogę rozmawiać tylko na tematy związane z ofertą naszej firmy.';
  
  /**
   * Classifies user intent for testing purposes
   */
  public async classifyIntent(req: Request, res: Response): Promise<void> {
    try {
      const { user_message, avatar_id, avatar_type } = req.body;
      
      if (!user_message) {
        res.status(400).json({ 
          error: 'user_message is required' 
        });
        return;
      }

      console.log(`🧪 Test Intent Classification for: "${user_message}"`);
      
      // Initialize intent classifier
      const intentClassifier = IntentClassifier.getInstance();
      
      // Load appropriate definitions based on avatar type
      if (avatar_type) {
        if (avatar_id && avatar_id.length > 10 && avatar_id.includes('-')) {
          // Custom avatar
          await intentClassifier.loadCustomIntentsForAvatar(avatar_id);
        } else {
          // Standard avatar
          await intentClassifier.loadIntentDefinitionsForAvatar(avatar_type);
        }
      }
      
      // Classify intent using the same logic as production
      const result = await intentClassifier.classifyIntent(
        user_message,
        undefined, // no mindState for testing
        avatar_id || undefined
      );
      
      console.log(`🧪 Test Classification Result:`, result);
      
      res.json({
        status: 'success',
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities || {},
        requires_flow: result.requires_flow || false,
        flow_name: result.flow_name || null,
        user_message: user_message,
        avatar_type: avatar_type,
        avatar_id: avatar_id
      });
      
    } catch (error) {
      console.error('❌ Error in intent classification:', error);
      res.status(500).json({ 
        error: 'Intent classification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handles user query
   */
  public async handleQuery(req: Request, res: Response): Promise<void> {
    try {
      const { user_message, session_id, avatar_type }: UserQuery = req.body;
      
      this.logQueryStart(user_message, session_id);
      
      // User message validation
      if (!this.validateUserMessage(user_message)) {
        this.sendErrorResponse(res, 'User message is missing', 400);
        return;
      }

      // Get/create session context
      const sessionContext = await this.getOrCreateSessionContext(session_id, avatar_type);
      if (!sessionContext) {
        this.sendErrorResponse(res, `Session with id = ${session_id} does not exist.`, 400);
        return;
      }

      // Process query (without streaming)
      const result = await this.processUserQuery(user_message, sessionContext, avatar_type);
      
      this.logQueryEnd();
      
      // Send response
      this.sendSuccessResponse(res, result);
      
    } catch (error) {
      this.handleQueryError(error, res);
    }
  }

  /**
   * Establishes SSE connection and waits for streaming responses
   */
  public async listenStreamingQuery(req: Request, res: Response): Promise<void> {
    const requestId = this.setupSSEConnection(req, res);
    this.sendSSEMessage(res, {
      status: 'connected',
      request_id: requestId,
      message: 'Connected, waiting for query...'
    });
  }

  /**
   * Handles user query in streaming mode
   */
  public async handleStreamingQuery(req: Request, res: Response): Promise<void> {
    try {
      const { user_message, session_id, request_id, avatar_type }: UserStreamingQuery = req.body;
      
      this.logStreamingQueryStart(user_message, session_id, request_id);
      
      // Get SSE connection
      const sseResponse = this.getSSEConnection(request_id);
      if (!sseResponse) {
        this.sendErrorResponse(res, 'Active SSE connection not found for this request', 400);
        return;
      }
      
      // User message validation
      if (!this.validateUserMessage(user_message)) {
        this.sendSSEError(sseResponse, 'User message is missing', request_id);
        return;
      }

      // Get/create session context
      const sessionContext = await this.getOrCreateSessionContext(session_id, avatar_type);
      if (!sessionContext) {
        this.sendSSEError(sseResponse, `Session with id = ${session_id} does not exist.`, request_id);
        return;
      }

      this.sendSSEMessage(sseResponse, {
        status: 'processing',
        session_id: sessionContext.sessionId,
        request_id
      });

      // Process query with callbacks for streaming
      const result = await this.processUserQuery(user_message, sessionContext, avatar_type, {
        onAnalysisComplete: (analysis: AnalysisResult) => this.handleAnalysisComplete(sseResponse, analysis, sessionContext.sessionId, request_id),
        onKnowledgeRetrieved: (contextFound: boolean) => this.handleKnowledgeRetrieved(sseResponse, contextFound, sessionContext.sessionId, request_id),
        onStreamingChunk: (chunk: string) => this.handleStreamingChunk(sseResponse, chunk, sessionContext.sessionId, request_id)
      });
      
      this.logQueryEnd();
      
      // Send final SSE response
      this.sendSSESuccess(sseResponse, result, request_id);
      
    } catch (error) {
      this.handleStreamingQueryError(error, req, res);
    }
  }

  // ============ PRIVATE HELPER METHODS ============

  /**
   * Validates user message input
   */
  private validateUserMessage(userMessage: string): boolean {
    return !!userMessage;
  }

  /**
   * Gets existing session context or creates new one
   */
  private async getOrCreateSessionContext(sessionId?: string, avatarType?: string): Promise<SessionContext | null> {
    let currentSessionId: string;
    let chatHistory: ChatHistory[] = [];
    let avatarName: string | null = null;
    let businessAvatar: BusinessAvatar | null = null;

    if (sessionId) {
      const session = await sessionService.getSessionById(sessionId);
      if (!session) {
        return null;
      }
      
      currentSessionId = sessionId;
      const avatar = await DatabaseService.getInstance().getAvatarById(session.avatarId);
      if (avatar) {
        avatarName = avatar.firstName + ' ' + avatar.lastName;
        // Create BusinessAvatar based on avatar type
        console.log('🔧 QueryController: avatarType from request:', avatarType);
        businessAvatar = await this.createBusinessAvatarByType(avatarType || 'networker');
      } else {
        console.error('No avatar found for session:', session.avatarId);
        // Stwórz domyślny BusinessAvatar
        businessAvatar = this.createDefaultBusinessAvatar();
        avatarName = businessAvatar.firstName + ' ' + businessAvatar.lastName;
      }
      
      chatHistory = await sessionService.getChatHistory(currentSessionId);
    } else {
      const session = await sessionService.createSessionForDefaultUserAndAvatar();
      currentSessionId = session._id;
      
      // Pobierz domyślny avatar
      const avatar = await DatabaseService.getInstance().getAvatarById(session.avatarId);
      if (avatar) {
        avatarName = avatar.firstName + ' ' + avatar.lastName;
        console.log('🔧 QueryController: avatarType from request (else branch):', avatarType);
        businessAvatar = await this.createBusinessAvatarByType(avatarType || 'networker');
      } else {
        console.error('No avatar found for session:', session.avatarId);
        // Stwórz domyślny BusinessAvatar
        businessAvatar = this.createDefaultBusinessAvatar();
        avatarName = businessAvatar.firstName + ' ' + businessAvatar.lastName;
      }
    }

    // Pobierz MindState
    const memoryManager = MemoryManager.getInstance();
    const mindState = await memoryManager.getMindStateStack(currentSessionId);

    return {
      sessionId: currentSessionId,
      chatHistory,
      avatarName,
      businessAvatar,
      mindState
    };
  }

  /**
   * Creates BusinessAvatar based on avatar type
   */
  private async createBusinessAvatarByType(avatarType: string): Promise<BusinessAvatar> {
    console.log('🔧 QueryController: createBusinessAvatarByType called with:', avatarType);
    
    // Check if it's a custom avatar (UUID format: 8-4-4-4-12 characters)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (avatarType && uuidRegex.test(avatarType)) {
      console.log('✅ QueryController: Detected UUID format, calling createCustomBusinessAvatar');
      return await this.createCustomBusinessAvatar(avatarType);
    }
    
    if (avatarType === 'trainer') {
      console.log('✅ QueryController: Creating trainer avatar');
      return this.createTrainerBusinessAvatar();
    } else {
      console.log('✅ QueryController: Creating networker avatar (default)');
      return this.createNetworkerBusinessAvatar();
    }
  }

  /**
   * Creates BusinessAvatar from CustomAvatar
   */
  private async createCustomBusinessAvatar(avatarId: string): Promise<BusinessAvatar> {
    console.log('🔧 QueryController: createCustomBusinessAvatar called with ID:', avatarId);
    const customAvatarService = CustomAvatarService.getInstance();
    const customAvatar = await customAvatarService.getCustomAvatarById(avatarId);
    
    console.log('🔧 QueryController: Retrieved custom avatar:', customAvatar?.name);
    
    if (!customAvatar) {
      console.warn(`❌ Custom avatar ${avatarId} not found, falling back to networker`);
      return this.createNetworkerBusinessAvatar();
    }

    // Convert CustomAvatar to BusinessAvatar
    const result = {
      _id: new ObjectId(),
      firstName: customAvatar.name.split(' ')[0] || customAvatar.name,
      lastName: customAvatar.name.split(' ').slice(1).join(' ') || '',
      company: {
        name: 'Custom Avatar Company',
        industry: customAvatar.specialization || 'Technology',
        location: 'Warszawa',
        size: 'średnia',
        mission: customAvatar.description,
        offer: [customAvatar.specialization],
        use_cases: ['AI Solutions', 'Business Consulting'],
        strategic_goals: ['Innovation', 'Growth', 'Excellence'],
        business_needs: ['Technology Partners', 'Clients'],
        specializations: [customAvatar.specialization]
      },
      personality: {
        style: customAvatar.communication_style || 'Professional',
        tone: customAvatar.personality || 'Expert and friendly',
        business_motivation: customAvatar.description || 'Excellence in business',
        communication_style: customAvatar.communication_style || 'Clear and professional',
        emotional_traits: customAvatar.personality?.split(', ') || ['Professional', 'Knowledgeable'],
        strengths: [customAvatar.specialization || 'Business expertise'],
        weaknesses: ['Perfectionism']
      },
      position: 'CEO',
      experience_years: 10,
      specializations: [customAvatar.specialization],
      active_flows: [],
      // KLUCZOWE: Dodaj custom avatar fields dla PromptBuilder i FlowManager
      avatar_type: 'custom' as const,
      id: avatarId, // UUID dla FlowManager
      name: customAvatar.name,
      description: customAvatar.description,
      specialization: customAvatar.specialization,
      background: customAvatar.background
    } as any; // Type assertion żeby TypeScript nie narzekał
    
    console.log('✅ QueryController: Created BusinessAvatar with avatar_type:', (result as any).avatar_type);
    return result;
  }

  /**
   * Creates Networker BusinessAvatar (Anna Kowalczyk)
   */
  private createNetworkerBusinessAvatar(): BusinessAvatar {
    return {
      _id: new ObjectId(),
      firstName: "Anna",
      lastName: "Kowalczyk",
      company: {
        name: "LogisPol International",
        industry: "Logistyka i Transport",
        location: "Warszawa",
        size: "duża",
        mission: "Dostarczanie najwyższej jakości usług logistycznych w Europie Środkowo-Wschodniej",
        offer: ["Transport międzynarodowy", "Magazynowanie", "Fulfillment", "Logistyka kontraktowa"],
        use_cases: ["E-commerce logistics", "B2B distribution", "Cross-docking", "Last-mile delivery"],
        strategic_goals: ["Ekspansja na 8 nowych rynków europejskich", "Digitalizacja procesów", "Zrównoważony rozwój"],
        business_needs: ["Partnerzy technologiczni", "Klienci e-commerce", "Dostawcy IT"],
        specializations: ["Ekspansja zagraniczna", "Analiza rynków", "Negocjacje międzynarodowe"]
      },
      personality: {
        style: "Profesjonalny i analityczny",
        tone: "Ekspercki w zakresie logistyki",
        business_motivation: "Pomoc polskim firmom w ekspansji zagranicznej",
        communication_style: "Strukturalny, używa przykładów z rzeczywistych projektów",
        emotional_traits: ["Analityczny", "Cierpliwy", "Zorientowany na rezultaty"],
        strengths: ["Znajomość rynków europejskich", "Doświadczenie w ekspansji", "Umiejętności negocjacyjne"],
        weaknesses: ["Czasem zbyt szczegółowy", "Fokus na logistyce"]
      },
      position: "Dyrektor ds. Ekspansji Zagranicznej",
      experience_years: 12,
      specializations: ["International Expansion", "Market Analysis", "Supply Chain Management"],
      active_flows: [],
      last_interaction: Date.now()
    };
  }

  /**
   * Creates Trainer BusinessAvatar (Prof. Anna Kowalska)
   */
  private createTrainerBusinessAvatar(): BusinessAvatar {
    return {
      _id: new ObjectId(),
      firstName: "Prof. Anna",
      lastName: "Kowalska",
      company: {
        name: "Instytut Archetypów Osobowości",
        industry: "Edukacja i Rozwój Osobisty",
        location: "Warszawa",
        size: "średnia",
        mission: "Wspieranie rozwoju osobistego przez zrozumienie archetypów osobowości",
        offer: ["Szkolenia z archetypów", "Coaching biznesowy", "Warsztat rozwoju osobistego", "Analiza zespołowa"],
        use_cases: ["Leadership development", "Team building", "Personal branding", "Career coaching"],
        strategic_goals: ["Digitalizacja szkoleń", "Ekspansja metodyki", "Rozwój narzędzi diagnostycznych"],
        business_needs: ["Partnerzy edukacyjni", "Klienci korporacyjni", "Platformy e-learningowe"],
        specializations: ["12 Archetypów Osobowości", "Psychologia biznesu", "Metodyki szkoleniowe"]
      },
      personality: {
        style: "Ciepły i empatyczny pedagog",
        tone: "Mądry mentor z dużym doświadczeniem",
        business_motivation: "Pomaganie ludziom w odkrywaniu swojego potencjału",
        communication_style: "Używa metafor, przykładów z kultury, zadaje pytania refleksyjne",
        emotional_traits: ["Empatyczny", "Cierpliwy", "Inspirujący"],
        strengths: ["Głęboka wiedza psychologiczna", "Umiejętności dydaktyczne", "Doświadczenie coachingowe"],
        weaknesses: ["Czasem zbyt teoretyczny", "Długie wyjaśnienia"]
      },
      position: "Psycholog Biznesu i Trener Rozwoju Osobistego",
      experience_years: 15,
      specializations: ["Personality Archetypes", "Business Psychology", "Adult Learning"],
      active_flows: [],
      last_interaction: Date.now()
    };
  }

  /**
   * Creates mock BusinessAvatar from regular Avatar (temporary solution)
   */
  private async createMockBusinessAvatar(avatar: any): Promise<BusinessAvatar> {
    // Tymczasowe rozwiązanie - tworzymy mock BusinessAvatar
    return {
      _id: avatar._id,
      firstName: avatar.firstName,
      lastName: avatar.lastName,
      company: {
        name: "AI Innovation Solutions",
        industry: "Technologie AI",
        location: "Warszawa",
        size: "średnia",
        mission: "Dostarczanie innowacyjnych rozwiązań AI dla biznesu",
        offer: ["Systemy AI", "Automatyzacja procesów", "Doradztwo technologiczne"],
        use_cases: ["Chatboty", "Analiza danych", "Personalizacja"],
        strategic_goals: ["Ekspansja na rynki europejskie", "Rozwój produktów AI"],
        business_needs: ["Partnerzy technologiczni", "Klienci enterprise"],
        specializations: ["Machine Learning", "NLP", "Computer Vision"]
      },
      personality: {
        style: "Profesjonalny i przyjazny",
        tone: "Ekspercki ale przystępny",
        business_motivation: "Pomaganie firmom w transformacji cyfrowej",
        communication_style: "Bezpośredni i konkretny",
        emotional_traits: ["Empatyczny", "Cierpliwy", "Entuzjastyczny"],
        strengths: ["Znajomość technologii", "Umiejętności komunikacyjne"],
        weaknesses: ["Czasem zbyt techniczny", "Perfekcjonizm"]
      },
      position: "Senior AI Consultant",
      experience_years: 8,
      specializations: ["AI Strategy", "ML Implementation", "Tech Leadership"],
      active_flows: [],
      last_interaction: Date.now()
    };
  }

  /**
   * Creates default BusinessAvatar when no avatar exists
   */
  private createDefaultBusinessAvatar(): BusinessAvatar {
    return {
      _id: new ObjectId(),
      firstName: "AI",
      lastName: "Assistant",
      company: {
        name: "AI Innovation Solutions",
        industry: "Technologie AI",
        location: "Warszawa",
        size: "średnia",
        mission: "Dostarczanie innowacyjnych rozwiązań AI dla biznesu",
        offer: ["Systemy AI", "Automatyzacja procesów", "Doradztwo technologiczne"],
        use_cases: ["Chatboty", "Analiza danych", "Personalizacja"],
        strategic_goals: ["Ekspansja na rynki europejskie", "Rozwój produktów AI"],
        business_needs: ["Partnerzy technologiczni", "Klienci enterprise"],
        specializations: ["Machine Learning", "NLP", "Computer Vision"]
      },
      personality: {
        style: "Profesjonalny i przyjazny",
        tone: "Ekspercki ale przystępny",
        business_motivation: "Pomaganie firmom w transformacji cyfrowej",
        communication_style: "Bezpośredni i konkretny",
        emotional_traits: ["Empatyczny", "Cierpliwy", "Entuzjastyczny"],
        strengths: ["Znajomość technologii", "Umiejętności komunikacyjne"],
        weaknesses: ["Czasem zbyt techniczny", "Perfekcjonizm"]
      },
      position: "Senior AI Consultant",
      experience_years: 8,
      specializations: ["AI Strategy", "ML Implementation", "Tech Leadership"],
      active_flows: [],
      last_interaction: Date.now()
    };
  }

  /**
   * Processes user query with unified logic for both streaming and non-streaming
   * Uses optional callbacks for streaming functionality
   */
  private async processUserQuery(
    userMessage: string, 
    sessionContext: SessionContext,
    avatarType?: string,
    streamingCallbacks?: StreamingCallbacks
  ): Promise<QueryProcessingResult> {
    // Add user message to chat history
    await this.addUserMessageToHistory(sessionContext.sessionId, userMessage);

    // Load appropriate definitions for avatar type
    if (avatarType) {
      const intentClassifier = IntentClassifier.getInstance();
      const flowManager = FlowManager.getInstance();
      
      // Check if it's a custom avatar
      if (avatarType.length > 10 && avatarType.includes('-')) {
        // Custom avatar - load custom definitions
        await intentClassifier.loadCustomIntentsForAvatar(avatarType);
        await flowManager.loadCustomFlowsForAvatar(avatarType);
      } else {
        // Standard avatar
        await intentClassifier.loadIntentDefinitionsForAvatar(avatarType);
        await flowManager.loadFlowDefinitionsForAvatar(avatarType);
      }
    }

    // STARY SYSTEM GOALS - WYŁĄCZONY
    // Check for goal execution (zachowujemy kompatybilność z starym systemem)
    // const goalResult = await this.executeGoalIfDetected(userMessage, sessionContext.sessionId);
    // if (goalResult) {
    //   return goalResult;
    // }

    // === NOWY SYSTEM INTENCJI ===
    
    // 1. Klasyfikacja intencji
    const intentClassifier = IntentClassifier.getInstance();
    const avatarIdForIntent = (avatarType && avatarType.length > 10 && avatarType.includes('-')) ? avatarType : undefined;
    let intentResult = await intentClassifier.classifyIntent(userMessage, sessionContext.mindState, avatarIdForIntent);
    
    // Specjalna logika: jeśli użytkownik przedstawia ofertę, NPC może wyrazić zainteresowanie
    if (intentResult.intent === 'user_presenting_offer') {
      // Prawdopodobność 70% że NPC wyrazi zainteresowanie
      const shouldExpressInterest = Math.random() < 0.7;
      
      if (shouldExpressInterest) {
        console.log(`[NPC INTEREST] User presented offer, NPC expressing interest`);
        intentResult = {
          intent: 'npc_interest_in_user_offer',
          confidence: 0.8,
          entities: {},
          requires_flow: true,
          flow_name: 'npc_buyer_flow',
          is_continuation: false
        };
      }
    }
    
    console.log(`[INTENT CLASSIFICATION] Detected intent: ${intentResult.intent} (confidence: ${intentResult.confidence})`);

    // 2. Zarządzanie Flow
    const flowManager = FlowManager.getInstance();
    
    // KONTEKSTOWA KLASYFIKACJA: Sprawdź czy użytkownik jest w kroku oczekującym email
    const currentFlow = flowManager.getActiveFlow(sessionContext.sessionId);
    if (currentFlow && currentFlow.current_step === 'meeting_arrangement') {
      const extractedEmail = this.extractEmailFromMessage(userMessage);
      if (extractedEmail) {
        console.log(`[CONTEXT OVERRIDE] User in meeting_arrangement step provided email: ${extractedEmail}`);
        intentResult = {
          intent: 'email_provided',
          confidence: 0.95,
          entities: { email: extractedEmail },
          requires_flow: false,
          is_continuation: true
        };
      }
    }
    
    if (intentResult.requires_flow) {
        if (!sessionContext.businessAvatar) {
            throw new Error('BusinessAvatar is required to start a flow.');
        }
        const startedFlow = await flowManager.startFlow(sessionContext.sessionId, intentResult.intent, sessionContext.businessAvatar, userMessage);
        if (startedFlow) {
            console.log(`[FLOW] Started or continued flow: ${startedFlow.flow_name}`);
        }
    } else {
        const currentActiveFlow = flowManager.getActiveFlow(sessionContext.sessionId);
        if (currentActiveFlow && await flowManager.shouldContinueFlow(sessionContext.sessionId, intentResult.intent)) {
            await flowManager.progressFlow(sessionContext.sessionId, userMessage);
            console.log(`[FLOW] Progressed flow: ${currentActiveFlow.flow_name}`);
        }
    }

    // 2a. Sprawdź czy aktywny flow powinien przejść do kolejnego kroku
    const currentActiveFlow = flowManager.getActiveFlow(sessionContext.sessionId);
    if (currentActiveFlow && currentActiveFlow.status === 'active') {
        // Sprawdź czy aktualny krok można uznać za zakończony na podstawie odpowiedzi użytkownika
        const shouldProgress = await this.shouldProgressFlowStep(userMessage, currentActiveFlow, intentResult.intent);
        if (shouldProgress) {
            await flowManager.progressFlow(sessionContext.sessionId, userMessage, currentActiveFlow.current_step);
            console.log(`[FLOW] Auto-progressed flow ${currentActiveFlow.flow_name} to next step`);
        }
    }
    
    // 3. Aktualizacja MindState
    const memoryManager = MemoryManager.getInstance();
    
    // Sprawdź czy intencja może być wykonana
    const canExecute = await memoryManager.canExecuteIntent(sessionContext.sessionId, intentResult.intent);
    if (!canExecute) {
      console.log(`[INTENT CLASSIFICATION] Intent ${intentResult.intent} cannot be executed (already fulfilled or too recent)`);
      // Fallback do general_questions
      intentResult.intent = 'general_questions';
    }
    
    // Push nową intencję na stos
    await memoryManager.pushIntent(
      sessionContext.sessionId,
      intentResult.intent,
      intentResult.confidence,
      { user_message: userMessage }
    );
    
    // 4. Pobierz kontekst z RAG jeśli potrzeba
    let ragContext = '';
    const trainerIntents = ['theory_request', 'show_me_how', 'ask_question', 'practice_together', 'test_me', 'summarize_learning', 'what_next'];
    const networkerIntents = ['general_questions', 'solution_presentation'];
    
    if (networkerIntents.includes(intentResult.intent) || trainerIntents.includes(intentResult.intent)) {
      console.log('\n[KNOWLEDGE BASE] Searching for information in knowledge base...');
      
      let contextKnowledge: string[] = [];
      
      if (trainerIntents.includes(intentResult.intent) && avatarType === 'trainer') {
        // Use trainer knowledge base
        contextKnowledge = await this.getTrainerKnowledgeContext(userMessage);
      } else {
        // Use networker knowledge base (vector database)
        contextKnowledge = await vectorDatabaseService.queryKnowledgeBase(userMessage);
      }
      
      ragContext = contextKnowledge.join('\n');
      console.log('[KNOWLEDGE BASE] Found context:', contextKnowledge.length > 0 ? 'Found' : 'None');
      
      // Notify streaming clients about knowledge retrieval
      streamingCallbacks?.onKnowledgeRetrieved?.(contextKnowledge.length > 0);
    }
    
    // 5. Budowanie promptu
    if (!sessionContext.businessAvatar) {
      throw new Error('BusinessAvatar is required for new intent system');
    }
    
    // Pobierz flow context jeśli istnieje aktywny flow
    const existingFlow = flowManager.getActiveFlow(sessionContext.sessionId);
    const flowContext = existingFlow?.context || {};
    
    const promptBuilder = PromptBuilder.getInstance();
    
    // Sprawdź czy to custom avatar i przekaż jego ID
    let avatarIdForPrompt: string | undefined;
    if (avatarType && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(avatarType)) {
      avatarIdForPrompt = avatarType;
    }
    
    const { systemPrompt, userPrompt } = await promptBuilder.buildPromptForIntent(
      intentResult.intent,
      userMessage,
      sessionContext.businessAvatar,
      sessionContext.mindState,
      ragContext,
      this.formatChatHistory(sessionContext.chatHistory),
      flowContext,
      avatarIdForPrompt
    );
    
    // 6. Generowanie odpowiedzi
    const response = await this.generateResponseWithPrompts(
      systemPrompt,
      userPrompt,
      streamingCallbacks?.onStreamingChunk
    );
    
    // 7. Oznacz intencję jako zrealizowaną
    await memoryManager.markIntentFulfilled(sessionContext.sessionId, intentResult.intent);
    
    // 8. Dodaj odpowiedź do historii
    await sessionService.addAvatarMessageToChatHistory(sessionContext.sessionId, response);
    
    // 9. Zapisz log konwersacji
    ConversationLoggerService.log({
        sessionId: sessionContext.sessionId,
        timestamp: new Date().toISOString(),
        userMessage: userMessage,
        avatarResponse: response,
        intent: intentResult,
        mindState: await memoryManager.getMindStateStack(sessionContext.sessionId),
        prompts: {
            system: systemPrompt.content,
            user: userPrompt.content
        }
    });

         // Konwertuj IntentClassificationResult na AnalysisResult (dla kompatybilności)
     const analysisResult: AnalysisResult = {
       is_question: intentResult.intent === 'general_questions',
       tone: 'neutral',
       topic_relevant: true,
       intent: this.mapIntentToAnalysisIntent(intentResult.intent)
     };
    
    // Notify streaming clients about analysis completion
    streamingCallbacks?.onAnalysisComplete?.(analysisResult);

    return {
      sessionId: sessionContext.sessionId,
      response,
      analysisResult
    };
  }

  /**
   * Adds user message to chat history
   */
  private async addUserMessageToHistory(sessionId: string, userMessage: string): Promise<void> {
    await sessionService.addUserMessageToChatHistory(sessionId, userMessage);
  }

  /**
   * Executes goal if detected
   */
  private async executeGoalIfDetected(userMessage: string, sessionId: string): Promise<QueryProcessingResult | null> {
    const goalExecutionResult = await goalService.executeActionForDetectedGoal(userMessage);
    if (goalExecutionResult) {
      console.log('[COMPLETION] Finishing query processing');
      console.log('========================================================\n');
      await sessionService.addAvatarMessageToChatHistory(
        sessionId, 
        goalExecutionResult.responseText, 
        goalExecutionResult.executedGoalName, 
        goalExecutionResult.isSayVerbatim
      );

      return {
        sessionId,
        response: goalExecutionResult.responseText,
        goalExecuted: goalExecutionResult.executedGoalName,
        isSayVerbatim: goalExecutionResult.isSayVerbatim
      };
    }
    return null;
  }

  /**
   * Analyzes user query
   */
  private async analyzeUserQuery(userMessage: string, contextKnowledge: string[], sessionContext: SessionContext): Promise<AnalysisResult> {
    console.log('\n[QUERY ANALYSIS] Starting user query analysis...');
    const userPrompt = openaiService.generateUserPrompt(
      userMessage,
      contextKnowledge,
      sessionContext.chatHistory,
      sessionContext.avatarName
    );
    
    const analysisResult = await openaiService.analyzeQuery(userPrompt);
    this.logAnalysisResults(analysisResult);
    return analysisResult;
  }

  /**
   * Handles question logic and knowledge base search
   * Returns either context knowledge or non-relevant topic response
   */
  private async handleQuestionLogic(
    userMessage: string, 
    analysisResult: AnalysisResult, 
    sessionId: string,
    onKnowledgeRetrieved?: (contextFound: boolean) => void
  ): Promise<
    | { isNonRelevantTopic: false; contextKnowledge: string[] }
    | { isNonRelevantTopic: true; response: string }
  > {
    if (analysisResult.is_question) {
      if (analysisResult.topic_relevant) {
                  console.log('\n[KNOWLEDGE BASE] Searching for information in knowledge base...');
        const contextKnowledge = await vectorDatabaseService.queryKnowledgeBase(userMessage);
        console.log('[KNOWLEDGE BASE] Found context:', contextKnowledge.length > 0 ? 'Found' : 'None');
        
        // Notify streaming clients about knowledge retrieval
        onKnowledgeRetrieved?.(contextKnowledge.length > 0);
        
        return {
          isNonRelevantTopic: false,
          contextKnowledge
        };
      } else {
        const nonRelevantResponse = await this.handleNonRelevantTopic(sessionId);
        return {
          isNonRelevantTopic: true,
          response: nonRelevantResponse
        };
      }
    }
    
    return {
      isNonRelevantTopic: false,
      contextKnowledge: []
    };
  }

  /**
   * Handles non-relevant topic response and returns the message
   */
  private async handleNonRelevantTopic(sessionId: string): Promise<string> {
    console.log('[RESPONSE GENERATION] Generated response:', QueryController.NON_RELEVANT_TOPIC_MESSAGE);
    await sessionService.addAvatarMessageToChatHistory(sessionId, QueryController.NON_RELEVANT_TOPIC_MESSAGE);
    console.log('\n[COMPLETION] Finishing query processing');
    console.log('========================================================\n');
    
    return QueryController.NON_RELEVANT_TOPIC_MESSAGE;
  }

  /**
   * Generates response (streaming or non-streaming based on callback presence)
   */
  private async generateResponse(
    userMessage: string,
    contextKnowledge: string[],
    sessionContext: SessionContext,
    onStreamingChunk?: (chunk: string) => void
  ): Promise<string> {
    const userPrompt = openaiService.generateUserPrompt(
      userMessage,
      contextKnowledge,
      sessionContext.chatHistory,
      sessionContext.avatarName
    );

    const systemPrompt = openaiService.generateLeasingAdvisorSystemPrompt();
    if (onStreamingChunk) {
      // Streaming response
      console.log('\n[STREAMING RESPONSE GENERATION] Generating response...');
      let fullResponse = '';

      await openaiService.generateStreamingResponse(userPrompt, (chunk: string) => {
        fullResponse += chunk;
        console.log('[RESPONSE GENERATION] Generated response chunk:', chunk);
        onStreamingChunk(chunk);
      }, systemPrompt);

      console.log('[RESPONSE GENERATION] Generated response:', fullResponse);
      return fullResponse;
    } else {
      // Regular response
      console.log('\n[RESPONSE GENERATION] Generating response...');

      const response = await openaiService.generateResponse(userPrompt, systemPrompt);
      console.log('[RESPONSE GENERATION] Generated response:', response);
      return response;
    }
  }

  /**
   * Sets up SSE connection
   */
  private setupSSEConnection(req: Request, res: Response): string {
    const requestId = uuidv4();

    // SSE headers configuration
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Connection timeout - close after 15 minutes of inactivity
    req.setTimeout(15 * 60 * 1000);

    // Register connection
    this.activeConnections.set(requestId, res);

    // Handle connection close
    req.on('close', () => {
      console.log(`SSE connection closed for requestId: ${requestId}`);
      this.activeConnections.delete(requestId);
    });

    return requestId;
  }

  /**
   * Gets SSE connection by request ID
   */
  private getSSEConnection(requestId: string): Response | null {
    return this.activeConnections.get(requestId) || null;
  }

  /**
   * Sends SSE message
   */
  private sendSSEMessage(res: Response, data: any): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Sends SSE error message
   */
  private sendSSEError(res: Response, message: string, requestId: string): void {
    this.sendSSEMessage(res, {
      status: 'error',
      message,
      request_id: requestId,
      done: true
    });
  }

  /**
   * Sends SSE success message
   */
  private sendSSESuccess(res: Response, result: QueryProcessingResult, requestId: string): void {
    this.sendSSEMessage(res, {
      status: 'success',
      message: result.response,
      session_id: result.sessionId,
      request_id: requestId,
      audio_url: null,
      analysis: result.analysisResult,
      goal_executed: result.goalExecuted,
      say_verbatim: result.isSayVerbatim,
      done: true
    });
  }

  /**
   * Handles streaming chunk callback
   */
  private handleStreamingChunk(res: Response, chunk: string, sessionId: string, requestId: string): void {
    this.sendSSEMessage(res, {
      status: 'streaming',
      chunk,
      session_id: sessionId,
      request_id: requestId
    });
  }

  /**
   * Handles analysis complete callback
   */
  private handleAnalysisComplete(res: Response, analysis: AnalysisResult, sessionId: string, requestId: string): void {
    this.sendSSEMessage(res, {
      status: 'analysis_complete',
      analysis,
      session_id: sessionId,
      request_id: requestId
    });
  }

  /**
   * Handles knowledge retrieved callback
   */
  private handleKnowledgeRetrieved(res: Response, contextFound: boolean, sessionId: string, requestId: string): void {
    this.sendSSEMessage(res, {
      status: 'knowledge_retrieved',
      context_found: contextFound,
      session_id: sessionId,
      request_id: requestId
    });
  }

  /**
   * Sends standard error response
   */
  private sendErrorResponse(res: Response, message: string, statusCode: number = 500): void {
    res.status(statusCode).json({
      status: 'error',
      message
    });
  }

  /**
   * Sends standard success response
   */
  private sendSuccessResponse(res: Response, result: QueryProcessingResult): void {
    res.status(200).json({
      status: 'success',
      message: result.response,
      session_id: result.sessionId,
      audio_url: null,
      analysis: result.analysisResult,
      goal_executed: result.goalExecuted,
      say_verbatim: result.isSayVerbatim
    });
  }

  /**
   * Handles query processing errors
   */
  private handleQueryError(error: unknown, res: Response): void {
    console.error('Error during query processing:', error);
    this.sendErrorResponse(res, 'An error occurred during query processing');
  }

  /**
   * Handles streaming query errors
   */
  private handleStreamingQueryError(error: unknown, req: Request, res: Response): void {
    console.error('Error during streaming query processing:', error);
    
    const sseResponse = req.body.request_id ? this.activeConnections.get(req.body.request_id) : null;
    
    if (sseResponse) {
      this.sendSSEError(sseResponse, 'An error occurred during query processing', req.body.request_id);
    } else {
      this.sendErrorResponse(res, 'An error occurred during query processing');
    }
  }

  /**
   * Logs query start
   */
  private logQueryStart(userMessage: string, sessionId?: string): void {
    console.log('=========== QUERY PROCESSING START ===========');
    console.log(`[INPUT DATA] Query: "${userMessage}"`);
    console.log(`[INPUT DATA] Session ID: ${sessionId || 'none'}`);
  }

  /**
   * Logs streaming query start
   */
  private logStreamingQueryStart(userMessage: string, sessionId?: string, requestId?: string): void {
    console.log('=========== STREAMING QUERY PROCESSING START ===========');
    console.log(`[INPUT DATA] Query: "${userMessage}"`);
    console.log(`[INPUT DATA] Session ID: ${sessionId || 'none'}`);
    console.log(`[INPUT DATA] Request ID: ${requestId || 'none'}`);
  }

  /**
   * Logs analysis results
   */
  private logAnalysisResults(analysisResult: AnalysisResult): void {
    console.log('[QUERY ANALYSIS] Analysis results:');
    console.log(`  - Is question: ${analysisResult.is_question}`);
    console.log(`  - Topic relevant to leasing: ${analysisResult.topic_relevant}`);
    console.log(`  - Recognized intent: ${analysisResult.intent}`);
  }

  /**
   * Logs query end
   */
  private logQueryEnd(): void {
    console.log('\n[COMPLETION] Finishing query processing');
    console.log('========================================================\n');
  }

  /**
   * Formats chat history for prompt context
   */
  private formatChatHistory(chatHistory: ChatHistory[]): string {
    if (!chatHistory || chatHistory.length === 0) {
      return 'Brak historii rozmowy';
    }

    return chatHistory
      .slice(-5) // Ostatnie 5 wiadomości
      .map(msg => `${msg.isUser ? 'Użytkownik' : 'Avatar'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Wyciąga adres email z wiadomości
   */
  private extractEmailFromMessage(message: string): string | null {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = message.match(emailRegex);
    return match ? match[0] : null;
  }

  /**
   * Sprawdza czy flow powinien przejść do kolejnego kroku
   */
  private async shouldProgressFlowStep(userMessage: string, activeFlow: FlowExecution, currentIntent: string): Promise<boolean> {
    // Specjalne przypadki dla conversation_redirect_flow
    if (activeFlow.flow_id === 'conversation_redirect_flow') {
      // Jeśli jesteśmy w kroku meeting_arrangement, sprawdź czy podano poprawny email
      if (activeFlow.current_step === 'meeting_arrangement') {
        const extractedEmail = this.extractEmailFromMessage(userMessage);
        
        // Jeśli użytkownik tylko obiecuje podać email, nie przechodź dalej
        if (currentIntent === 'email_promise') {
          console.log(`⏸️ User promised email but didn't provide it yet - staying in meeting_arrangement`);
          return false; // Pozostań w kroku meeting_arrangement, poproś o konkretny email
        }
        
        if (extractedEmail && currentIntent === 'email_provided') {
          console.log(`✅ Valid email found: ${extractedEmail}`);
          // Zapisz email w kontekście flow
          activeFlow.context.extracted_email = extractedEmail;
          return true;
        } else {
          console.log(`❌ No valid email found in message: ${userMessage}`);
          return false; // Pozostań w kroku meeting_arrangement
        }
      }
      
      // Jeśli jesteśmy w kroku meeting_confirmation, zakończ flow
      if (activeFlow.current_step === 'meeting_confirmation') {
        return true;
      }
    }
    
    // Specjalne przypadki dla npc_buyer_flow
    if (activeFlow.flow_id === 'npc_buyer_flow') {
      // Użytkownik odpowiada na pytania NPC jako potencjalnego klienta
      const isProvidingInfo = userMessage.length > 20 && !userMessage.includes('?');
      const isDetailedResponse = /\b(oferujemy|mamy|możemy|specjalizujemy|rozwiązanie|produkty|usługi|cena|koszt|termin|warunki)\b/i.test(userMessage);
      
      // Progresja przez kroki flow gdy użytkownik udziela szczegółowych odpowiedzi
      if (isProvidingInfo && isDetailedResponse) {
        return true;
      }
      
      // Automatyczna progresja na końcu flow
      if (activeFlow.current_step === 'purchase_decision') {
        return true;
      }
    }
    
    // Proste heurystyki do określenia czy krok jest zakończony:
    
    // 1. Jeśli użytkownik odpowiada na pytanie (nie zadaje nowego pytania)
    const isAnswering = !userMessage.includes('?') && userMessage.length > 10;
    
    // 2. Jeśli użytkownik podaje konkretne informacje (zawiera słowa kluczowe)
    const providesInfo = /\b(potrzebuje|problem|wyzwanie|trudność|używamy|mamy|chcemy|planujemy|szukamy)\b/i.test(userMessage);
    
    // 3. Jeśli to nie jest powtórzenie tej samej intencji
    const isNewInfo = currentIntent !== 'user_needs' || activeFlow.step_executions.length > 1;
    
    // Flow powinien przejść dalej jeśli użytkownik udziela odpowiedzi
    return isAnswering && (providesInfo || isNewInfo);
  }

  /**
   * Generates response using system and user prompts
   */
  private async generateResponseWithPrompts(
    systemPrompt: SystemPrompt,
    userPrompt: UserPrompt,
    onStreamingChunk?: (chunk: string) => void
  ): Promise<string> {
    console.log('\n[RESPONSE GENERATION] Generating response with new prompt system...');

    if (onStreamingChunk) {
      // Streaming response
      let fullResponse = '';
      
      await openaiService.generateStreamingResponse(userPrompt, (chunk: string) => {
        fullResponse += chunk;
        console.log('[RESPONSE GENERATION] Generated response chunk:', chunk);
        onStreamingChunk(chunk);
      }, systemPrompt);
      
      console.log('[RESPONSE GENERATION] Generated response:', fullResponse);
      return fullResponse;
    } else {
      // Regular response
      const response = await openaiService.generateResponse(userPrompt, systemPrompt);
      console.log('[RESPONSE GENERATION] Generated response:', response);
      return response;
    }
  }

  /**
   * Maps intent classification result to analysis intent format
   */
  private mapIntentToAnalysisIntent(intent: string): 'question' | 'greeting' | 'criticism' | 'other' {
    switch (intent) {
      case 'greeting':
        return 'greeting';
      case 'general_questions':
      case 'user_questions':
        return 'question';
      case 'user_comments':
        return 'criticism';
      default:
        return 'other';
    }
  }

  /**
   * Generates speech from text using ElevenLabs
   */
  public async generateSpeech(req: Request, res: Response): Promise<void> {
    try {
      const { text, voice_id, options } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text parameter is required' });
        return;
      }

      console.log(`🎵 TTS request for text: "${text.substring(0, 100)}..."`);

      const elevenlabsService = ElevenLabsService.getInstance();
      
      if (!elevenlabsService.isInitialized()) {
        res.status(503).json({ error: 'ElevenLabs service not available' });
        return;
      }

      // Sprawdź czy tekst jest odpowiedni do TTS
      if (!elevenlabsService.isTextSuitableForTTS(text)) {
        res.status(400).json({ error: 'Text not suitable for TTS (too long or too much formatting)' });
        return;
      }

      // Oczyść tekst
      const cleanText = elevenlabsService.cleanTextForTTS(text);

      // Generuj mowę
      const audioBuffer = await elevenlabsService.generateSpeech(cleanText, voice_id, options);

      if (!audioBuffer) {
        res.status(500).json({ error: 'Failed to generate speech' });
        return;
      }

      // Zwróć audio jako MP3
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length.toString());
      res.setHeader('Content-Disposition', 'attachment; filename="speech.mp3"');
      
      res.end(audioBuffer);
      
      console.log(`✅ TTS response sent (${audioBuffer.length} bytes)`);
    } catch (error) {
      console.error('❌ Error in generateSpeech:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Streams speech generation
   */
  public async streamSpeech(req: Request, res: Response): Promise<void> {
    try {
      const { text, voice_id, options } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text parameter is required' });
        return;
      }

      console.log(`🎵 TTS streaming request for text: "${text.substring(0, 100)}..."`);

      const elevenlabsService = ElevenLabsService.getInstance();
      
      if (!elevenlabsService.isInitialized()) {
        res.status(503).json({ error: 'ElevenLabs service not available' });
        return;
      }

      // Sprawdź czy tekst jest odpowiedni do TTS
      if (!elevenlabsService.isTextSuitableForTTS(text)) {
        res.status(400).json({ error: 'Text not suitable for TTS' });
        return;
      }

      // Oczyść tekst
      const cleanText = elevenlabsService.cleanTextForTTS(text);

      // Generuj streaming
      const audioStream = await elevenlabsService.generateSpeechStream(cleanText, voice_id, options);

      if (!audioStream) {
        res.status(500).json({ error: 'Failed to generate speech stream' });
        return;
      }

      // Ustaw headers dla streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Connection', 'keep-alive');

      // Przekaż stream do response
      const reader = audioStream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          res.write(Buffer.from(value));
        }
        
        res.end();
        console.log(`✅ TTS streaming completed`);
      } catch (streamError) {
        console.error('❌ Error in streaming:', streamError);
        res.status(500).end();
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('❌ Error in streamSpeech:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Gets available voices from ElevenLabs
   */
  public async getVoices(req: Request, res: Response): Promise<void> {
    try {
      const elevenlabsService = ElevenLabsService.getInstance();
      
      if (!elevenlabsService.isInitialized()) {
        res.status(503).json({ error: 'ElevenLabs service not available' });
        return;
      }

      const voices = await elevenlabsService.getAvailableVoices();

      if (!voices) {
        res.status(500).json({ error: 'Failed to get voices' });
        return;
      }

      res.json({ voices });
      console.log(`✅ Voices list sent (${voices.length} voices)`);
    } catch (error) {
      console.error('❌ Error in getVoices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Checks ElevenLabs service health
   */
  public async checkTTSHealth(req: Request, res: Response): Promise<void> {
    try {
      const elevenlabsService = ElevenLabsService.getInstance();
      
      const isHealthy = await elevenlabsService.checkApiHealth();

      res.json({ 
        initialized: elevenlabsService.isInitialized(),
        api_healthy: isHealthy,
        default_voice: elevenlabsService.getDefaultVoiceId()
      });
    } catch (error) {
      console.error('❌ Error in checkTTSHealth:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Gets trainer knowledge context using PROPER EMBEDDINGS (not keyword search!)
   */
  private async getTrainerKnowledgeContext(userMessage: string): Promise<string[]> {
    try {
      // 🔥 FIXED: Use proper vector search for trainer!
      console.log('🧠 [TRAINER RAG] Using vector embeddings search (PROPER!)');
      
      // Generate embedding for user query
      // const queryEmbedding = await openaiService.generateEmbeddings(userMessage);
      
      // Search in vector database with trainer filter
      const searchResults = await vectorDatabaseService.queryKnowledgeBase(userMessage);
      
      console.log(`[TRAINER RAG] Found ${searchResults.length} relevant chunks via embeddings`);
      
      // Fallback to old keyword method ONLY if vector search fails
      if (searchResults.length === 0) {
        console.log('⚠️ [TRAINER RAG] Vector search returned no results, falling back to keyword search');
        return this.getTrainerKnowledgeContextKeyword(userMessage);
      }
      
      return searchResults.slice(0, 3); // Top 3 results
      
    } catch (error) {
      console.error('❌ Error in trainer vector search, falling back to keyword:', error);
      return this.getTrainerKnowledgeContextKeyword(userMessage);
    }
  }

  /**
   * Fallback keyword method (DEPRECATED - only for emergencies)
   */
  private async getTrainerKnowledgeContextKeyword(userMessage: string): Promise<string[]> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.resolve(__dirname, '../config/training-avatar-knowledge.json');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const knowledgeData = JSON.parse(rawData);
      
      const contextChunks: string[] = [];
      
      // Search through trainer avatar chunks
      if (knowledgeData.avatars && knowledgeData.avatars.length > 0) {
        const trainerAvatar = knowledgeData.avatars[0]; // Prof. Anna Kowalska
        
        if (trainerAvatar.chunks) {
          // 🚨 DEPRECATED: Simple keyword matching (lamerski approach!)
          const queryLower = userMessage.toLowerCase();
          
          for (const chunk of trainerAvatar.chunks) {
            const chunkTextLower = chunk.text.toLowerCase();
            
            // Check if query contains relevant keywords from chunk
            if (queryLower.includes('archetyp') && chunkTextLower.includes('archetyp')) {
              contextChunks.push(`[${chunk.topic}] ${chunk.text}`);
            } else if (queryLower.includes('wojownik') && chunkTextLower.includes('wojownik')) {
              contextChunks.push(`[${chunk.topic}] ${chunk.text}`);
            } else if (queryLower.includes('teoria') && chunk.category === 'THEORY') {
              contextChunks.push(`[${chunk.topic}] ${chunk.text}`);
            }
          }
        }
      }
      
      console.log(`[TRAINER KB FALLBACK] Found ${contextChunks.length} relevant chunks via keywords`);
      return contextChunks.slice(0, 3); // Limit to top 3 chunks
      
    } catch (error) {
      console.error('❌ Error loading trainer knowledge base:', error);
      return [];
    }
  }
}

export default new QueryController(); 