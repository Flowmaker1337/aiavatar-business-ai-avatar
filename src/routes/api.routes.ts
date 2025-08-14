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

const router = Router();

// Initialize controllers
const simulationController = new SimulationController();
const personaController = new PersonaController();
const flowWizardController = new FlowWizardController();
const customAvatarController = new CustomAvatarController();

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

// Endpoint for getting prompt templates
router.get('/prompt-templates', flowController.getPromptTemplates.bind(flowController));

// Endpoint for getting intent definitions
router.get('/intent-definitions', flowController.getIntentDefinitions.bind(flowController));

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

// ============ SIMULATION ENDPOINTS ============

// Create new simulation
router.post('/simulation/create', simulationController.createSimulation.bind(simulationController));

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

// Get all active simulations
router.get('/simulation/active', simulationController.getActiveSimulations.bind(simulationController));

// Get scenario templates
router.get('/simulation/templates/scenarios', simulationController.getScenarioTemplates.bind(simulationController));

// Get persona templates
router.get('/simulation/templates/personas', simulationController.getPersonaTemplates.bind(simulationController));

// Export simulation
router.post('/simulation/export/:id', simulationController.exportSimulation.bind(simulationController));

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

export default router; 