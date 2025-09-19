import {Request, Response} from 'express';
import DatabaseService from '../services/database.service';
import sessionService from '../services/session.service';
import MemoryManager from '../services/memory-manager.service';
import FlowManager from '../services/flow-manager.service';

class SessionController {
    private db = DatabaseService.getInstance();

    // // Endpoint for creating new session
    // public async createSession(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { userId, avatarId } = req.body;
    //
    //     if (!userId || !avatarId) {
    //       res.status(400).json({ error: 'Missing required parameters: userId, avatarId' });
    //       return;
    //     }

    //     // Check if user and avatar exist
    //     const db = DatabaseService.getInstance();
    //     const user = await db.getUserById(userId);
    //
    //     if (!user) {
    //       res.status(404).json({ error: 'User with given ID not found' });
    //       return;
    //     }

    //     const avatar = await db.getAvatarById(avatarId);
    //
    //     if (!avatar) {
    //       res.status(404).json({ error: 'Avatar with given ID not found' });
    //       return;
    //     }

    //     // Create new session
    //     const newSession = await db.createSession(userId, avatarId);

    //     res.status(201).json({
    //       success: true,
    //       session: newSession
    //     });
    //   } catch (error) {
    //     console.error('Error during session creation:', error);
    //     res.status(500).json({ error: 'An error occurred during session creation' });
    //   }
    // }

    // // Endpoint for getting user sessions
    // public async getUserSessions(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { userId } = req.params;

    //     if (!userId) {
    //       res.status(400).json({ error: 'User ID parameter is required' });
    //       return;
    //     }

    //     const db = DatabaseService.getInstance();
    //     const sessions = await db.getUserSessions(userId);

    //     res.status(200).json({
    //       success: true,
    //       sessions
    //     });
    //   } catch (error) {
    //     console.error('Error during user sessions retrieval:', error);
    //     res.status(500).json({ error: 'An error occurred during user sessions retrieval' });
    //   }
    // }

    // // Endpoint for getting session by ID
    // public async getSession(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { sessionId } = req.params;

    //     if (!sessionId) {
    //       res.status(400).json({ error: 'Session ID parameter is required' });
    //       return;
    //     }

    //     const db = DatabaseService.getInstance();
    //     const session = await db.getSessionById(sessionId);

    //     if (!session) {
    //       res.status(404).json({ error: 'Session with given ID not found' });
    //       return;
    //     }

    //     res.status(200).json({
    //       success: true,
    //       session
    //     });
    //   } catch (error) {
    //     console.error('Error during session retrieval:', error);
    //     res.status(500).json({ error: 'An error occurred during session retrieval' });
    //   }
    // }

    // // Endpoint for adding message to chat history
    // public async addMessageToChatHistory(req: Request, res: Response): Promise<void> {
    //   try {
    //     const { sessionId, content, isUser } = req.body;

    //     if (!sessionId || !content || isUser === undefined) {
    //       res.status(400).json({ error: 'Missing required parameters: sessionId, content, isUser' });
    //       return;
    //     }

    //     const db = DatabaseService.getInstance();

    //     // Check if session exists
    //     const session = await db.getSessionById(sessionId);
    //     if (!session) {
    //       res.status(404).json({ error: 'Session with given ID not found' });
    //       return;
    //     }

    //     // Add message to chat history
    //     const chatMessage = await db.addMessageToChatHistory(sessionId, content, isUser);

    //     res.status(201).json({
    //       success: true,
    //       message: chatMessage
    //     });
    //   } catch (error) {
    //     console.error('Error during adding message to chat history:', error);
    //     res.status(500).json({ error: 'An error occurred during adding message to chat history' });
    //   }
    // }

    // Endpoint for getting chat history
    public async getChatHistory(req: Request, res: Response): Promise<void> {
        try {
            const {sessionId} = req.params;

            if (!sessionId) {
                res.status(400).json({error: 'Session ID parameter is required'});
                return;
            }

            const db = DatabaseService.getInstance();
            const chatHistory = await db.getChatHistory(sessionId);

            res.status(200).json({
                success: true,
                chatHistory
            });
        } catch (error) {
            console.error('Error during chat history retrieval:', error);
            res.status(500).json({error: 'An error occurred during chat history retrieval'});
        }
    }

    /**
     * Gets the current state of a session (MindState & Flow)
     */
    public async getSessionState(req: Request, res: Response): Promise<void> {
        const {sessionId} = req.params;

        try {
            const memoryManager = MemoryManager.getInstance();
            const flowManager = FlowManager.getInstance();

            const mindState = await memoryManager.getMindStateStack(sessionId);
            const activeFlow = flowManager.getActiveFlow(sessionId);

            res.status(200).json({
                status: 'success',
                sessionId: sessionId,
                mindState: mindState,
                activeFlow: activeFlow,
            });

        } catch (error: any) {
            console.error(`❌ Error getting state for session ${sessionId}:`, error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get session state',
                error: error.message
            });
        }
    }
}

export default new SessionController(); 