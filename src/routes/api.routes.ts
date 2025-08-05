import { Router } from 'express';
import queryController from '../controllers/query.controller';
import userController from '../controllers/user.controller';
import avatarController from '../controllers/avatar.controller';
import sessionController from '../controllers/session.controller';
import healthController from '../controllers/health.controller';
import flowController from '../controllers/flow.controller';
import knowledgePrepareController from '../controllers/knowledge-prepare.controller';

const router = Router();

// Endpoint for processing queries
router.post('/query', queryController.handleQuery.bind(queryController));

// Endpoint for processing queries in streaming mode (SSE)
router.post('/query/stream', queryController.handleStreamingQuery.bind(queryController));

// Endpoint for listening to streaming responses
router.get('/query/stream/listen', queryController.listenStreamingQuery.bind(queryController));

// User endpoints
router.post('/users', userController.createUser);
router.get('/users/:userId', userController.getUser);

// Avatar endpoints
router.post('/avatars', avatarController.createAvatar);
router.get('/avatars/:avatarId', avatarController.getAvatar);

// Chat history endpoints - read-only
router.get('/chat/:sessionId', sessionController.getChatHistory);

// Endpoint for getting session state (MindState & Flow)
router.get('/state/:sessionId', sessionController.getSessionState.bind(sessionController));

// ============ FLOW ENDPOINTS ============

// Endpoint for getting all flow definitions
router.get('/flows', flowController.getFlowDefinitions.bind(flowController));

// ============ TEXT-TO-SPEECH ENDPOINTS ============

// Endpoint for checking TTS service health
router.get('/tts/health', queryController.checkTTSHealth.bind(queryController));

// ============ HEALTH CHECK ENDPOINTS ============

// Endpoint for testing application health
router.get('/health', healthController.getApplicationHealth.bind(healthController));

// Endpoint for checking vector database health
router.get('/health/vector-database', healthController.getVectorDatabaseHealth.bind(healthController));

// Endpoint for detailed health check of all system components
router.get('/health/detailed', healthController.getDetailedHealth.bind(healthController));

// ============ KNOWLEDGE PREPARATION ENGINE ENDPOINTS ============

// Endpoint for processing training materials
router.post('/knowledge/process', knowledgePrepareController.processTrainingFile.bind(knowledgePrepareController));

// Endpoint for getting processed flows
router.get('/knowledge/flows/:courseId', knowledgePrepareController.getProcessedFlows.bind(knowledgePrepareController));

// Test endpoint for 12 Archetypes processing
router.post('/knowledge/test-12archetypes', knowledgePrepareController.test12Archetypes.bind(knowledgePrepareController));

// Health check for Knowledge Preparation Engine
router.get('/knowledge/health', knowledgePrepareController.healthCheck.bind(knowledgePrepareController));

export default router; 