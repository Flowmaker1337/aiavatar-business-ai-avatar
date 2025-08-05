import fs from 'fs';
import path from 'path';

interface ConversationLog {
    sessionId: string;
    timestamp: string;
    userMessage: string;
    avatarResponse: string;
    intent: any;
    mindState: any;
    prompts: {
        system: string;
        user: string;
    };
}

class ConversationLoggerService {
    private static instance: ConversationLoggerService;
    private logDirectory: string;

    private constructor() {
        this.logDirectory = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(this.logDirectory)) {
            fs.mkdirSync(this.logDirectory, { recursive: true });
            console.log(`✅ Created conversation log directory at: ${this.logDirectory}`);
        }
    }

    public static getInstance(): ConversationLoggerService {
        if (!ConversationLoggerService.instance) {
            ConversationLoggerService.instance = new ConversationLoggerService();
        }
        return ConversationLoggerService.instance;
    }

    public log(data: ConversationLog): void {
        const timestamp = new Date().toISOString();
        const date = timestamp.split('T')[0];
        const fileName = `conversation_log_${date}.jsonl`;
        const filePath = path.join(this.logDirectory, fileName);
        
        const logEntry = JSON.stringify({
            ...data,
            log_timestamp: timestamp
        });
        
        try {
            fs.appendFileSync(filePath, logEntry + '\n');
        } catch (error) {
            console.error('❌ Failed to write to conversation log:', error);
        }
    }
}

export default ConversationLoggerService.getInstance(); 