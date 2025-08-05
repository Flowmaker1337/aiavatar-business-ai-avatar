import { 
    MindStateStack, 
    MindStateStackItem, 
    FulfilledIntent, 
    IntentClassificationResult 
} from '../models/types';
import DatabaseService from './database.service';

/**
 * MemoryManager - zarządza MindStateStack dla każdej sesji
 * Implementuje logikę stosu intencji, walidacji i zarządzania pamięcią
 */
class MemoryManager {
    private static instance: MemoryManager;
    private mindStateCache: Map<string, MindStateStack> = new Map();
    private databaseService: DatabaseService;

    private constructor() {
        this.databaseService = DatabaseService.getInstance();
    }

    public static getInstance(): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }

    /**
     * Pobiera MindStateStack dla sesji
     */
    public async getMindStateStack(sessionId: string): Promise<MindStateStack> {
        // Najpierw sprawdź cache
        if (this.mindStateCache.has(sessionId)) {
            return this.mindStateCache.get(sessionId)!;
        }

        // Pobierz z bazy danych
        const mindState = await this.loadMindStateFromDatabase(sessionId);
        
        // Dodaj do cache
        this.mindStateCache.set(sessionId, mindState);
        
        return mindState;
    }

    /**
     * Zapisuje MindStateStack do bazy i cache
     */
    public async saveMindStateStack(mindState: MindStateStack): Promise<void> {
        mindState.updated_at = Date.now();
        
        // Aktualizuj cache
        this.mindStateCache.set(mindState.session_id, mindState);
        
        // Zapisz do bazy
        await this.saveMindStateToDatabase(mindState);
    }

    /**
     * Dodaje nową intencję do stosu
     */
    public async pushIntent(
        sessionId: string, 
        intent: string, 
        confidence: number,
        metadata?: Record<string, any>
    ): Promise<MindStateStack> {
        const mindState = await this.getMindStateStack(sessionId);
        
        const newItem: MindStateStackItem = {
            tag: intent,
            timestamp: Date.now(),
            intent: intent,
            confidence: confidence,
            metadata: metadata || {}
        };

        // Dodaj do stosu
        mindState.stack.push(newItem);
        
        // Aktualizuj fulfilled_intents
        if (!mindState.fulfilled_intents[intent]) {
            mindState.fulfilled_intents[intent] = {
                fulfilled: false,
                repeatable: true,
                completion_count: 0
            };
        }
        
        mindState.fulfilled_intents[intent].last_used = Date.now();

        await this.saveMindStateStack(mindState);
        return mindState;
    }

    /**
     * Usuwa ostatnią intencję ze stosu
     */
    public async popIntent(sessionId: string): Promise<MindStateStackItem | null> {
        const mindState = await this.getMindStateStack(sessionId);
        
        if (mindState.stack.length === 0) {
            return null;
        }

        const poppedItem = mindState.stack.pop()!;
        await this.saveMindStateStack(mindState);
        
        return poppedItem;
    }

    /**
     * Sprawdza czy intencja może być zrealizowana
     */
    public async canExecuteIntent(sessionId: string, intent: string): Promise<boolean> {
        const mindState = await this.getMindStateStack(sessionId);
        const fulfilledIntent = mindState.fulfilled_intents[intent];
        
        if (!fulfilledIntent) {
            return true; // Nowa intencja - można wykonać
        }

        // Sprawdź czy jest repeatable
        if (!fulfilledIntent.repeatable && fulfilledIntent.fulfilled) {
            return false;
        }

        // Sprawdź max_age
        if (fulfilledIntent.max_age && fulfilledIntent.last_used) {
            const age = (Date.now() - fulfilledIntent.last_used) / 1000;
            if (age < fulfilledIntent.max_age) {
                return false;
            }
        }

        return true;
    }

    /**
     * Oznacza intencję jako zrealizowaną
     */
    public async markIntentFulfilled(sessionId: string, intent: string): Promise<void> {
        const mindState = await this.getMindStateStack(sessionId);
        
        if (!mindState.fulfilled_intents[intent]) {
            mindState.fulfilled_intents[intent] = {
                fulfilled: false,
                repeatable: true,
                completion_count: 0
            };
        }

        mindState.fulfilled_intents[intent].fulfilled = true;
        mindState.fulfilled_intents[intent].completion_count++;
        mindState.fulfilled_intents[intent].last_used = Date.now();

        await this.saveMindStateStack(mindState);
    }

    /**
     * Sprawdza czy intencja to kontynuacja poprzedniej
     */
    public async isIntentContinuation(sessionId: string, intent: string): Promise<boolean> {
        const mindState = await this.getMindStateStack(sessionId);
        
        if (mindState.stack.length === 0) {
            return false;
        }

        const lastItem = mindState.stack[mindState.stack.length - 1];
        
        // Sprawdź czy to ta sama intencja w krótkim czasie
        const timeDiff = Date.now() - lastItem.timestamp;
        const isRecent = timeDiff < 30000; // 30 sekund
        
        return isRecent && lastItem.intent === intent;
    }

    /**
     * Aktualizuje obecny flow
     */
    public async updateCurrentFlow(sessionId: string, flowName: string, flowStep?: string): Promise<void> {
        const mindState = await this.getMindStateStack(sessionId);
        
        mindState.current_flow = flowName;
        mindState.current_flow_step = flowStep;
        
        await this.saveMindStateStack(mindState);
    }

    /**
     * Czyści przestarzałe intencje
     */
    public async cleanupExpiredIntents(sessionId: string): Promise<void> {
        const mindState = await this.getMindStateStack(sessionId);
        const now = Date.now();
        
        // Wyczyść stary stos (starsze niż 1 godzina)
        mindState.stack = mindState.stack.filter(item => {
            const age = (now - item.timestamp) / 1000;
            return age < 3600; // 1 godzina
        });

        // Wyczyść przestarzałe fulfilled_intents
        Object.keys(mindState.fulfilled_intents).forEach(intent => {
            const fulfilledIntent = mindState.fulfilled_intents[intent];
            if (fulfilledIntent.max_age && fulfilledIntent.last_used) {
                const age = (now - fulfilledIntent.last_used) / 1000;
                if (age > fulfilledIntent.max_age) {
                    delete mindState.fulfilled_intents[intent];
                }
            }
        });

        await this.saveMindStateStack(mindState);
    }

    /**
     * Pobiera historię intencji
     */
    public async getIntentHistory(sessionId: string, limit: number = 10): Promise<MindStateStackItem[]> {
        const mindState = await this.getMindStateStack(sessionId);
        
        return mindState.stack
            .slice(-limit)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Resetuje MindStateStack dla sesji
     */
    public async resetMindStateStack(sessionId: string): Promise<void> {
        const mindState = await this.createEmptyMindState(sessionId);
        await this.saveMindStateStack(mindState);
    }

    /**
     * Tworzy pusty MindStateStack
     */
    private createEmptyMindState(sessionId: string): MindStateStack {
        return {
            stack: [],
            fulfilled_intents: {},
            session_id: sessionId,
            created_at: Date.now(),
            updated_at: Date.now()
        };
    }

    /**
     * Ładuje MindStateStack z bazy danych
     */
    private async loadMindStateFromDatabase(sessionId: string): Promise<MindStateStack> {
        try {
            const db = this.databaseService.getDatabase();
            const collection = db.collection('mindStates');
            
            const mindState = await collection.findOne({ session_id: sessionId });
            
            if (!mindState) {
                return this.createEmptyMindState(sessionId);
            }

            return {
                stack: mindState.stack || [],
                fulfilled_intents: mindState.fulfilled_intents || {},
                current_flow: mindState.current_flow,
                current_flow_step: mindState.current_flow_step,
                session_id: sessionId,
                created_at: mindState.created_at || Date.now(),
                updated_at: mindState.updated_at || Date.now()
            };
        } catch (error) {
            console.error('Error loading MindStateStack from database:', error);
            return this.createEmptyMindState(sessionId);
        }
    }

    /**
     * Aktualizuje status flow
     */
    public async updateFlowStatus(sessionId: string, flowId: string, status: string): Promise<void> {
        const mindState = await this.getMindStateStack(sessionId);
        
        // Aktualizuj flow status w kontekście
        if (!mindState.flow_history) {
            mindState.flow_history = [];
        }
        
        // Dodaj wpis do historii flow
        mindState.flow_history.push({
            flow_id: flowId,
            status: status,
            timestamp: Date.now()
        });
        
        // Jeśli flow jest zakończony, wyczyść current_flow
        if (status === 'completed' || status === 'timeout' || status === 'cancelled') {
            if (mindState.current_flow === flowId) {
                mindState.current_flow = undefined;
                mindState.current_flow_step = undefined;
            }
        }
        
        await this.saveMindStateStack(mindState);
    }

    /**
     * Zapisuje MindStateStack do bazy danych
     */
    private async saveMindStateToDatabase(mindState: MindStateStack): Promise<void> {
        try {
            const db = this.databaseService.getDatabase();
            const collection = db.collection('mindStates');
            
            await collection.replaceOne(
                { session_id: mindState.session_id },
                mindState,
                { upsert: true }
            );
        } catch (error) {
            console.error('Error saving MindStateStack to database:', error);
            throw error;
        }
    }
}

export default MemoryManager; 