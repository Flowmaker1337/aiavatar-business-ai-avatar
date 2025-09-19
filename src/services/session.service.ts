import {DEFAULT_USER_ID, DEFAULT_AVATAR_ID, ChatHistory, Session} from '../models/types';
import DatabaseService from './database.service';

class SessionService {
    private db = DatabaseService.getInstance();

    public async getSessionById(sessionId: string): Promise<Session | null> {
        return await this.db.getSessionById(sessionId);
    }

    // Add user message to chat history
    public async addUserMessageToChatHistory(sessionId: string, content: string): Promise<ChatHistory> {
        return await this.db.addMessageToChatHistory(sessionId, content, true);
    }

    // Add avatar response to chat history
    public async addAvatarMessageToChatHistory(sessionId: string, content: string, goalName: string | null = null, isSayVerbatim: boolean = false): Promise<ChatHistory> {
        return await this.db.addMessageToChatHistory(sessionId, content, false, goalName, isSayVerbatim);
    }

    // Get chat history for current session
    public async getChatHistory(sessionId: string) {
        return this.db.getChatHistory(sessionId);
    }

    public async createSession(userId: string, avatarId: string): Promise<Session> {
        return await this.db.createSession(userId, avatarId);
    }

    public async createSessionForDefaultUserAndAvatar(): Promise<Session> {
        return await this.createSession(DEFAULT_USER_ID, DEFAULT_AVATAR_ID);
    }
}

export default new SessionService(); 