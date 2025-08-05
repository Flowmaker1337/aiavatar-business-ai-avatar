import { Router } from 'express';
import queryController from '../controllers/query.controller';
import userController from '../controllers/user.controller';
import avatarController from '../controllers/avatar.controller';
import sessionController from '../controllers/session.controller';
import healthController from '../controllers/health.controller';
import flowController from '../controllers/flow.controller';

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

export default router; 