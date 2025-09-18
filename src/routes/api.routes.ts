import { Router } from 'express';
import queryController from '../controllers/query.controller';
import userController from '../controllers/user.controller';
import avatarController from '../controllers/avatar.controller';
import sessionController from '../controllers/session.controller';
import healthController from '../controllers/health.controller';
import flowController from '../controllers/flow.controller';
import knowledgePrepareController from '../controllers/knowledge-prepare.controller';
import SimulationController from '../controllers/simulation.controller';
import PersonaController from '../controllers/persona.controller';
import FlowWizardController from '../controllers/flow-wizard.controller';
import CustomAvatarController from '../controllers/custom-avatar.controller';
import { ReactiveAvatarController } from '../controllers/reactive-avatar.controller';
import CompanyProfileController from '../controllers/company-profile.controller';
import ExtendedCompanyProfileController from '../controllers/extended-company-profile.controller';
import SceneBuilderController from '../controllers/scene-builder.controller';
import AuthRoutes from './auth.routes';
import ExtendedAvatarRoutes from './extended-avatar.routes';

// Import enhanced authentication middleware
import { 
    authenticate, 
    requireRole, 
    requireAnyRole, 
    requirePermission, 
    requireOwnership, 
    optionalAuth,
    rateLimit 
} from '../middleware/enhanced-auth.middleware';

const router = Router();

// ============ GLOBAL MIDDLEWARE ============
// Apply rate limiting to all API routes
router.use(rateLimit(1000, 15 * 60 * 1000)); // 1000 requests per 15 minutes

// Initialize controllers
const simulationController = new SimulationController();
const personaController = new PersonaController();
const flowWizardController = new FlowWizardController();
const customAvatarController = new CustomAvatarController();
const reactiveAvatarController = new ReactiveAvatarController();
const companyProfileController = new CompanyProfileController();
const extendedCompanyProfileController = new ExtendedCompanyProfileController();
const sceneBuilderController = new SceneBuilderController();

// Initialize auth routes
const authRoutes = new AuthRoutes();
const extendedAvatarRoutes = new ExtendedAvatarRoutes();

// ============ PUBLIC ROUTES (NO AUTH REQUIRED) ============
// Authentication routes - must remain public
router.use('/auth', authRoutes.getRouter());

// Health check endpoints - public for monitoring
router.get('/health', healthController.getApplicationHealth.bind(healthController));
router.get('/health/vector-database', healthController.getVectorDatabaseHealth.bind(healthController));
router.get('/health/detailed', healthController.getDetailedHealth.bind(healthController));

// ============ PROTECTED ROUTES (AUTHENTICATION REQUIRED) ============
// All routes below require authentication

// ============ QUERY & CHAT ENDPOINTS ============
// Core AI interaction endpoints - require authentication and avatar access
router.post('/query', 
    authenticate, 
    requirePermission('read', 'avatars'),
    queryController.handleQuery.bind(queryController)
);

router.post('/query/stream',
    authenticate, 
    requirePermission('read', 'avatars'),
    queryController.handleStreamingQuery.bind(queryController)
);

router.get('/query/stream/listen', 
    authenticate, 
    requirePermission('read', 'avatars'),
    queryController.listenStreamingQuery.bind(queryController)
);

// ============ USER MANAGEMENT ENDPOINTS ============
router.post('/users', 
    authenticate, 
    requireRole('admin'),
    userController.createUser
);

router.get('/users/:userId', 
    authenticate, 
    requireOwnership('userId'),
    userController.getUser
);

// ============ AVATAR ENDPOINTS ============
// Extended avatar routes with enhanced auth
router.use('/avatars', authenticate, extendedAvatarRoutes.getRouter());

// Legacy avatar endpoints
router.post('/avatars', 
    authenticate, 
    requirePermission('create', 'avatars'),
    avatarController.createAvatar
);

router.get('/avatars/:avatarId', 
    authenticate, 
    requirePermission('read', 'avatars'),
    avatarController.getAvatar
);

// ============ CHAT & SESSION ENDPOINTS ============
router.get('/chat/:sessionId', 
    authenticate, 
    requireOwnership('sessionId'),
    sessionController.getChatHistory
);

router.get('/state/:sessionId', 
    authenticate, 
    requireOwnership('sessionId'),
    sessionController.getSessionState.bind(sessionController)
);

// ============ FLOW ENDPOINTS ============
router.get('/flows', 
    authenticate, 
    requirePermission('read', 'flows'),
    flowController.getFlowDefinitions.bind(flowController)
);

router.get('/prompt-templates', 
    authenticate, 
    requirePermission('read', 'flows'),
    flowController.getPromptTemplates.bind(flowController)
);

router.get('/intent-definitions', 
    authenticate, 
    requirePermission('read', 'intents'),
    flowController.getIntentDefinitions.bind(flowController)
);

// ============ TEXT-TO-SPEECH ENDPOINTS ============
router.get('/tts/health', 
    authenticate,
    queryController.checkTTSHealth.bind(queryController)
);

// ============ KNOWLEDGE PREPARATION ENGINE ENDPOINTS ============
router.post('/knowledge/process', 
    authenticate, 
    requirePermission('create', 'avatars'),
    knowledgePrepareController.processTrainingFile.bind(knowledgePrepareController)
);

router.get('/knowledge/flows/:courseId', 
    authenticate, 
    requirePermission('read', 'flows'),
    knowledgePrepareController.getProcessedFlows.bind(knowledgePrepareController)
);

router.post('/knowledge/test-12archetypes', 
    authenticate, 
    requireRole('admin'),
    knowledgePrepareController.test12Archetypes.bind(knowledgePrepareController)
);

router.get('/knowledge/health', 
    authenticate,
    knowledgePrepareController.healthCheck.bind(knowledgePrepareController)
);

// ============ SIMULATION ENDPOINTS ============

// Create new simulation
router.post('/simulation/create', simulationController.createSimulation.bind(simulationController));

// Get all active simulations - MUST be before /:id routes
router.get('/simulation/active', simulationController.getActiveSimulations.bind(simulationController));

// Get simulation info
router.get('/simulation/:id', simulationController.getSimulation.bind(simulationController));

// Get simulation messages
router.get('/simulation/:id/messages', simulationController.getSimulationMessages.bind(simulationController));

// Get simulation analysis
router.get('/simulation/:id/analysis', simulationController.getSimulationAnalysis.bind(simulationController));

// Pause simulation
router.post('/simulation/:id/pause', simulationController.pauseSimulation.bind(simulationController));

// Resume simulation
router.post('/simulation/:id/resume', simulationController.resumeSimulation.bind(simulationController));

// Get scenario templates - specific routes before parametrized routes
router.get('/simulation/templates/scenarios', simulationController.getScenarioTemplates.bind(simulationController));

// Get persona templates
router.get('/simulation/templates/personas', simulationController.getPersonaTemplates.bind(simulationController));

// Export simulation
router.post('/simulation/export/:id', simulationController.exportSimulation.bind(simulationController));

// ============ SIMULATION CHAT MODE ENDPOINTS ============

// Start simulation chat session - specific routes before parametrized routes
router.post('/simulation/start', simulationController.startChatSimulation.bind(simulationController));

// Send message in simulation chat
router.post('/simulation/message', simulationController.sendChatMessage.bind(simulationController));

// Get simulation chat session
router.get('/simulation/session/:sessionId', simulationController.getChatSession.bind(simulationController));

// ============ PERSONA ENDPOINTS ============

// Generate new persona
router.post('/persona/generate', personaController.generatePersona.bind(personaController));

// Generate example personas
router.post('/persona/examples', personaController.generateExamples.bind(personaController));

// Persona library management
router.get('/persona/library', personaController.getPersonaLibrary.bind(personaController));
router.get('/persona/library/stats', personaController.getLibraryStats.bind(personaController));
router.get('/persona/library/popular', personaController.getPopularPersonas.bind(personaController));

// Import/Export library
router.post('/persona/library/export', personaController.exportLibrary.bind(personaController));
router.post('/persona/library/import', personaController.importLibrary.bind(personaController));

// Individual persona management
router.get('/persona/:id', personaController.getPersona.bind(personaController));
router.put('/persona/:id', personaController.updatePersona.bind(personaController));
router.delete('/persona/:id', personaController.deletePersona.bind(personaController));

// Persona actions
router.post('/persona/:id/favorite', personaController.toggleFavorite.bind(personaController));
router.post('/persona/:id/rate', personaController.ratePersona.bind(personaController));
router.post('/persona/:id/tags', personaController.addTags.bind(personaController));

// Convert persona to simulation participant
router.post('/persona/:id/participant', personaController.createParticipant.bind(personaController));

// ============ FLOW WIZARD ENDPOINTS ============

// Generate complete flow with AI
router.post('/flow-wizard/generate', flowWizardController.generateFlow.bind(flowWizardController));

// Generate quick flow from templates
router.post('/flow-wizard/generate-quick', flowWizardController.generateQuickFlow.bind(flowWizardController));

// Get available quick templates
router.get('/flow-wizard/templates', flowWizardController.getTemplates.bind(flowWizardController));

// Save flow package to files
router.post('/flow-wizard/save', flowWizardController.saveFlowPackage.bind(flowWizardController));

// Validate flow package structure
router.post('/flow-wizard/validate', flowWizardController.validateFlowPackage.bind(flowWizardController));

// Generate example flow packages
router.post('/flow-wizard/examples', flowWizardController.generateExamples.bind(flowWizardController));

// Generate specific avatar field with AI
router.post('/flow-wizard/generate-avatar-field', flowWizardController.generateAvatarField.bind(flowWizardController));

// ============ CUSTOM AVATAR ENDPOINTS ============

// Save new custom avatar from Creator
router.post('/avatar/save', customAvatarController.saveAvatar.bind(customAvatarController));

// Get all custom avatars
router.get('/avatars', customAvatarController.getAllAvatars.bind(customAvatarController));

// Get custom avatar by ID
router.get('/avatar/:id', customAvatarController.getAvatarById.bind(customAvatarController));

// Update custom avatar
router.put('/avatar/:id', customAvatarController.updateAvatar.bind(customAvatarController));

// Delete custom avatar
router.delete('/avatar/:id', customAvatarController.deleteAvatar.bind(customAvatarController));

// Activate custom avatar
router.post('/avatar/:id/activate', customAvatarController.activateAvatar.bind(customAvatarController));

// Get avatar flows
router.get('/avatar/:id/flows', customAvatarController.getAvatarFlows.bind(customAvatarController));

// Get avatar intents
router.get('/avatar/:id/intents', customAvatarController.getAvatarIntents.bind(customAvatarController));

// Get avatars statistics
router.get('/avatars/stats', customAvatarController.getAvatarsStats.bind(customAvatarController));

// Get flow definitions for custom avatar
router.get('/avatar/:avatarId/flow-definitions', flowController.getFlowDefinitionsForCustomAvatar.bind(flowController));

// Process knowledge files for avatar
router.post('/avatar/:avatarId/process-knowledge', customAvatarController.processKnowledgeFiles.bind(customAvatarController));

// Upload knowledge file to avatar
router.post('/avatar/:avatarId/upload-knowledge', customAvatarController.uploadKnowledgeFile.bind(customAvatarController));

// Simulation avatars endpoint
router.get('/simulation-avatars', (req, res) => {
    try {
        const simulationAvatars = require('../config/simulation-avatars.json');
        res.json(simulationAvatars);
    } catch (error) {
        console.error('Error loading simulation avatars:', error);
        res.status(500).json({ error: 'Failed to load simulation avatars' });
    }
});

// Reactive avatar prompts endpoints
router.post('/reactive-avatars/:avatarId/prompts', reactiveAvatarController.savePrompts.bind(reactiveAvatarController));
router.get('/reactive-avatars/:avatarId/prompts', reactiveAvatarController.getPrompts.bind(reactiveAvatarController));
router.get('/reactive-avatars/prompts', reactiveAvatarController.getAllPrompts.bind(reactiveAvatarController));

// Generate new reactive avatar with AI
router.post('/reactive-avatars/generate', reactiveAvatarController.generateReactiveAvatar.bind(reactiveAvatarController));

// Save generated reactive avatar to simulation-avatars.json
router.post('/reactive-avatars/save-generated', reactiveAvatarController.saveGeneratedAvatar.bind(reactiveAvatarController));

// ============ COMPANY PROFILES ENDPOINTS ============

// Extended Company profile endpoints (new system)
router.post('/company-profiles', extendedCompanyProfileController.createProfile.bind(extendedCompanyProfileController));
router.get('/company-profiles/templates', extendedCompanyProfileController.getTemplates.bind(extendedCompanyProfileController));
router.get('/company-profiles/:profileId', extendedCompanyProfileController.getProfile.bind(extendedCompanyProfileController));
router.put('/company-profiles/:profileId', extendedCompanyProfileController.updateProfile.bind(extendedCompanyProfileController));
router.delete('/company-profiles/:profileId', extendedCompanyProfileController.deleteProfile.bind(extendedCompanyProfileController));
router.get('/company-profiles', extendedCompanyProfileController.getProfiles.bind(extendedCompanyProfileController));

// Legacy Company profile endpoints (old system - for backward compatibility)
router.post('/company-profiles-legacy/:companyId', companyProfileController.saveProfile.bind(companyProfileController));
router.get('/company-profiles-legacy/:companyId', companyProfileController.getProfile.bind(companyProfileController));
router.get('/company-profiles-legacy', companyProfileController.getAllProfiles.bind(companyProfileController));

// ============ SIMULATION SCENES ENDPOINTS ============

// Scene Builder endpoints
router.post('/simulation-scenes', sceneBuilderController.createScene.bind(sceneBuilderController));
router.get('/simulation-scenes/templates', sceneBuilderController.getTemplates.bind(sceneBuilderController));
router.get('/simulation-scenes/:sceneId', sceneBuilderController.getScene.bind(sceneBuilderController));
router.put('/simulation-scenes/:sceneId', sceneBuilderController.updateScene.bind(sceneBuilderController));
router.delete('/simulation-scenes/:sceneId', sceneBuilderController.deleteScene.bind(sceneBuilderController));
router.post('/simulation-scenes/:sceneId/duplicate', sceneBuilderController.duplicateScene.bind(sceneBuilderController));
router.get('/simulation-scenes', sceneBuilderController.getScenes.bind(sceneBuilderController));

export default router; 