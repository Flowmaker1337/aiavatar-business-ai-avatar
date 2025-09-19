import {
    SimulationExecution,
    SimulationAnalysis,
    ParticipantPerformance,
    FlowAnalysis,
    SimulationMessage,
    SimulationParticipant
} from '../models/types';
import openAIService from './openai.service';
import {ExecutionTimerService} from './execution-timer.service';

/**
 * ConversationAnalyzerService - analizuje jakość i efektywność symulowanych konwersacji
 * Generuje insights i sugestie ulepszenia dla AI Avatarów
 */
export class ConversationAnalyzerService {
    private openAIService = openAIService;

    constructor() {
        // openAIService is a singleton instance
    }

    /**
     * Analizuje kompletną konwersację i generuje pełną analizę
     */
    public async analyzeConversation(simulation: SimulationExecution): Promise<SimulationAnalysis> {
        const timer = new ExecutionTimerService('ConversationAnalyzer.analyzeConversation');
        timer.start();

        try {
            const analysis: SimulationAnalysis = {
                conversation_quality_score: await this.calculateQualityScore(simulation),
                participant_performance: await this.analyzeParticipantPerformance(simulation),
                flow_analysis: await this.analyzeFlowUsage(simulation),
                intent_distribution: this.analyzeIntentDistribution(simulation),
                response_times: this.analyzeResponseTimes(simulation),
                conversation_metrics: await this.calculateConversationMetrics(simulation),
                insights: await this.generateInsights(simulation),
                improvement_suggestions: await this.generateImprovementSuggestions(simulation)
            };

            timer.stop();
            console.log(`📊 Complete conversation analysis finished for simulation ${simulation.id}`);

            return analysis;
        } catch (error) {
            timer.stop();
            console.error('❌ Error analyzing conversation:', error);
            throw error;
        }
    }

    /**
     * Analizuje konwersację częściowo (dla real-time updates)
     */
    public async analyzeConversationPartial(simulation: SimulationExecution): Promise<Partial<SimulationAnalysis>> {
        try {
            return {
                conversation_quality_score: await this.calculateQualityScore(simulation),
                intent_distribution: this.analyzeIntentDistribution(simulation),
                response_times: this.analyzeResponseTimes(simulation),
                conversation_metrics: await this.calculateConversationMetrics(simulation)
            };
        } catch (error) {
            console.error('❌ Error in partial conversation analysis:', error);
            return {};
        }
    }

    /**
     * Oblicza ogólny wskaźnik jakości konwersacji (0-100)
     */
    private async calculateQualityScore(simulation: SimulationExecution): Promise<number> {
        const messages = simulation.messages;
        if (messages.length < 2) return 0;

        let totalScore = 0;
        const weights = {
            coherence: 0.3,
            engagement: 0.2,
            goal_achievement: 0.25,
            flow_completion: 0.15,
            response_quality: 0.1
        };

        // 1. Koherencja konwersacji (czy rozmowa ma sens)
        const coherenceScore = await this.analyzeCoherence(messages);
        totalScore += coherenceScore * weights.coherence;

        // 2. Zaangażowanie uczestników
        const engagementScore = this.analyzeEngagement(simulation);
        totalScore += engagementScore * weights.engagement;

        // 3. Osiągnięcie celów scenariusza
        const goalScore = await this.analyzeGoalAchievement(simulation);
        totalScore += goalScore * weights.goal_achievement;

        // 4. Ukończenie flows
        const flowScore = await this.analyzeFlowCompletion(simulation);
        totalScore += flowScore * weights.flow_completion;

        // 5. Jakość odpowiedzi
        const responseScore = await this.analyzeResponseQuality(messages);
        totalScore += responseScore * weights.response_quality;

        return Math.round(totalScore * 100);
    }

    /**
     * Analizuje koherencję konwersacji
     */
    private async analyzeCoherence(messages: SimulationMessage[]): Promise<number> {
        if (messages.length < 3) return 0.5;

        // Bierz próbkę co 3 wiadomości dla analizy
        const sampleMessages = messages.filter((_, index) => index % 3 === 0);
        const conversationText = sampleMessages.map(m => m.content).join('\n');

        const prompt = `Oceń koherencję tej konwersacji w skali 0-1. 
Sprawdź czy:
- Odpowiedzi nawiązują do poprzednich wiadomości
- Rozmowa ma logiczny przebieg  
- Nie ma nagłych zmian tematu
- Zachowana jest ciągłość kontekstu

KONWERSACJA:
${conversationText}

Odpowiedz TYLKO liczbą od 0 do 1 (np. 0.8):`;

        try {
            const userPrompt = {
                role: 'user' as const,
                content: prompt
            };

            const response = await this.openAIService.generateResponse(userPrompt);

            const score = parseFloat(response.trim());
            return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
        } catch (error) {
            console.error('Error analyzing coherence:', error);
            return 0.5;
        }
    }

    /**
     * Analizuje zaangażowanie uczestników
     */
    private analyzeEngagement(simulation: SimulationExecution): number {
        const messages = simulation.messages;
        if (messages.length === 0) return 0;

        // Sprawdź równowagę w rozmowie
        const participantCounts = new Map<string, number>();
        for (const message of messages) {
            const count = participantCounts.get(message.participant_id) || 0;
            participantCounts.set(message.participant_id, count + 1);
        }

        // Oblicz równowagę (im bardziej równa dystrybucja, tym lepiej)
        const counts = Array.from(participantCounts.values());
        const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
        const balance = 1 / (1 + variance / avg); // Normalizacja 0-1

        // Sprawdź średnią długość wiadomości (dłuższe = więcej zaangażowania)
        const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
        const lengthScore = Math.min(1, avgLength / 200); // 200 znaków = maksymalny wynik

        return (balance * 0.6 + lengthScore * 0.4);
    }

    /**
     * Analizuje osiągnięcie celów scenariusza
     */
    private async analyzeGoalAchievement(simulation: SimulationExecution): Promise<number> {
        const scenario = simulation.scenario;
        const recentMessages = simulation.messages.slice(-6);
        const conversationText = recentMessages.map(m => m.content).join('\n');

        const prompt = `Oceń w skali 0-1 jak dobrze osiągnięto cel tego scenariusza:

CEL SCENARIUSZA: ${scenario.objective}
KRYTERIA SUKCESU: ${scenario.evaluation_criteria.join(', ')}

OSTATNIE FRAGMENTY ROZMOWY:
${conversationText}

Oceń czy rozmowa zmierza ku realizacji celu. Odpowiedz TYLKO liczbą 0-1:`;

        try {
            const userPrompt = {
                role: 'user' as const,
                content: prompt
            };

            const response = await this.openAIService.generateResponse(userPrompt);

            const score = parseFloat(response.trim());
            return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
        } catch (error) {
            console.error('Error analyzing goal achievement:', error);
            return 0.5;
        }
    }

    /**
     * Analizuje ukończenie flows
     */
    private async analyzeFlowCompletion(simulation: SimulationExecution): Promise<number> {
        // Placeholder - można rozwinąć o integrację z FlowManager
        const messages = simulation.messages;
        const flowMessages = messages.filter(m => m.flow_step);

        if (flowMessages.length === 0) return 0.3; // Brak flows = średni wynik

        // Prosta heurystyka - czy flow messages mają różne kroki
        const uniqueSteps = new Set(flowMessages.map(m => m.flow_step));
        const progressScore = Math.min(1, uniqueSteps.size / 5); // Zakładamy 5 kroków max

        return progressScore;
    }

    /**
     * Analizuje jakość odpowiedzi
     */
    private async analyzeResponseQuality(messages: SimulationMessage[]): Promise<number> {
        if (messages.length < 2) return 0.5;

        // Bierz próbkę odpowiedzi do analizy
        const sampleSize = Math.min(4, Math.floor(messages.length / 2));
        const sampleMessages = messages.slice(-sampleSize);

        let totalScore = 0;
        let analyzedCount = 0;

        for (const message of sampleMessages) {
            if (message.content.length < 10) continue; // Skip bardzo krótkie

            const score = await this.analyzeMessageQuality(message.content);
            totalScore += score;
            analyzedCount++;
        }

        return analyzedCount > 0 ? totalScore / analyzedCount : 0.5;
    }

    /**
     * Analizuje jakość pojedynczej wiadomości
     */
    private async analyzeMessageQuality(content: string): Promise<number> {
        // Prosta analiza bez API call dla performance
        let score = 0.5; // Base score

        // Długość wiadomości
        if (content.length > 50 && content.length < 500) score += 0.1;

        // Obecność pytań (engagement)
        if (content.includes('?')) score += 0.1;

        // Konkretność (liczby, nazwy)
        if (/\d/.test(content) || /[A-Z][a-z]+/.test(content)) score += 0.1;

        // Brak powtórzeń
        const words = content.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        if (uniqueWords.size / words.length > 0.7) score += 0.1;

        // Struktura (przecinki, kropki)
        if (content.includes(',') || content.split('.').length > 2) score += 0.1;

        return Math.min(1, score);
    }

    /**
     * Analizuje wydajność poszczególnych uczestników
     */
    private async analyzeParticipantPerformance(simulation: SimulationExecution): Promise<Map<string, ParticipantPerformance>> {
        const performanceMap = new Map<string, ParticipantPerformance>();

        for (const participant of simulation.scenario.participants) {
            const performance = await this.calculateParticipantPerformance(simulation, participant);
            performanceMap.set(participant.id, performance);
        }

        return performanceMap;
    }

    /**
     * Oblicza wydajność pojedynczego uczestnika
     */
    private async calculateParticipantPerformance(
        simulation: SimulationExecution,
        participant: SimulationParticipant
    ): Promise<ParticipantPerformance> {
        const participantMessages = simulation.messages.filter(m => m.participant_id === participant.id);

        if (participantMessages.length === 0) {
            return {
                participant_id: participant.id,
                message_count: 0,
                avg_response_time: 0,
                intent_accuracy: 0,
                flow_completion_rate: 0,
                conversation_contribution: 0,
                goal_achievement: 0,
                strengths: [],
                weaknesses: ['Brak aktywności w konwersacji'],
                improvement_areas: ['Zwiększ zaangażowanie', 'Więcej interakcji']
            };
        }

        // Oblicz metryki
        const avgResponseTime = participantMessages
            .reduce((sum, msg) => sum + msg.response_time_ms, 0) / participantMessages.length;

        const conversationContribution = participantMessages.length / simulation.messages.length;

        // Analiza jakości wiadomości uczestnika
        const messageQuality = await this.analyzeParticipantMessageQuality(participantMessages);

        // Identyfikuj mocne i słabe strony
        const {strengths, weaknesses, improvements} = await this.identifyParticipantStrengthsWeaknesses(
            participant, participantMessages
        );

        return {
            participant_id: participant.id,
            message_count: participantMessages.length,
            avg_response_time: avgResponseTime,
            intent_accuracy: messageQuality.intent_accuracy,
            flow_completion_rate: messageQuality.flow_completion,
            conversation_contribution: conversationContribution,
            goal_achievement: messageQuality.goal_achievement,
            strengths,
            weaknesses,
            improvement_areas: improvements
        };
    }

    /**
     * Analizuje jakość wiadomości uczestnika
     */
    private async analyzeParticipantMessageQuality(messages: SimulationMessage[]): Promise<{
        intent_accuracy: number;
        flow_completion: number;
        goal_achievement: number;
    }> {
        // Placeholder analysis - można rozbudować
        const hasValidIntents = messages.filter(m => m.intent && m.intent !== 'unknown').length;
        const intent_accuracy = hasValidIntents / messages.length;

        const hasFlowSteps = messages.filter(m => m.flow_step).length;
        const flow_completion = hasFlowSteps / messages.length;

        // Prosta analiza celów bazująca na długości i różnorodności wiadomości
        const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
        const goal_achievement = Math.min(1, avgLength / 150); // 150 chars = good engagement

        return {
            intent_accuracy,
            flow_completion,
            goal_achievement
        };
    }

    /**
     * Identyfikuje mocne i słabe strony uczestnika
     */
    private async identifyParticipantStrengthsWeaknesses(
        participant: SimulationParticipant,
        messages: SimulationMessage[]
    ): Promise<{
        strengths: string[];
        weaknesses: string[];
        improvements: string[];
    }> {
        const strengths: string[] = [];
        const weaknesses: string[] = [];
        const improvements: string[] = [];

        // Analiza na podstawie liczby wiadomości
        if (messages.length >= 5) {
            strengths.push('Wysokie zaangażowanie w rozmowę');
        } else if (messages.length <= 2) {
            weaknesses.push('Niskie zaangażowanie w rozmowę');
            improvements.push('Więcej aktywnej komunikacji');
        }

        // Analiza długości wiadomości
        const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
        if (avgLength > 200) {
            strengths.push('Szczegółowe i wyczerpujące odpowiedzi');
        } else if (avgLength < 50) {
            weaknesses.push('Zbyt krótkie odpowiedzi');
            improvements.push('Bardziej szczegółowe wyjaśnienia');
        }

        // Analiza czasów odpowiedzi
        const avgResponseTime = messages.reduce((sum, m) => sum + m.response_time_ms, 0) / messages.length;
        if (avgResponseTime < 2000) {
            strengths.push('Szybkie reakcje');
        } else if (avgResponseTime > 5000) {
            weaknesses.push('Długie czasy odpowiedzi');
            improvements.push('Szybsze przetwarzanie informacji');
        }

        // Analiza specyficzna dla roli
        if (participant.role === 'teacher' || participant.role === 'seller') {
            const hasQuestions = messages.some(m => m.content.includes('?'));
            if (hasQuestions) {
                strengths.push('Zadawanie pytań angażujących');
            } else {
                weaknesses.push('Brak pytań angażujących klienta');
                improvements.push('Więcej pytań otwartych');
            }
        }

        return {strengths, weaknesses, improvements};
    }

    /**
     * Analizuje użycie flows w konwersacji
     */
    private async analyzeFlowUsage(simulation: SimulationExecution): Promise<FlowAnalysis> {
        const messages = simulation.messages;
        const flowsTriggered = new Map<string, number>();
        const flowCompletionRates = new Map<string, number>();
        const flowTransitions: Array<{ from: string; to: string; count: number }> = [];

        // Analizuj flow steps w wiadomościach
        const flowMessages = messages.filter(m => m.flow_step);

        for (const message of flowMessages) {
            if (message.flow_step) {
                const flowName = this.extractFlowNameFromStep(message.flow_step);
                const count = flowsTriggered.get(flowName) || 0;
                flowsTriggered.set(flowName, count + 1);
            }
        }

        // Placeholder dla innych analiz flow
        // Można rozbudować o rzeczywistą integrację z FlowManager

        return {
            flows_triggered: flowsTriggered,
            flow_completion_rates: flowCompletionRates,
            flow_transitions: flowTransitions,
            stuck_points: []
        };
    }

    /**
     * Wyciąga nazwę flow z nazwy kroku
     */
    private extractFlowNameFromStep(stepName: string): string {
        // Prosta heurystyka - można usprawnić
        return stepName.split('_')[0] || 'unknown';
    }

    /**
     * Analizuje dystrybucję intencji
     */
    private analyzeIntentDistribution(simulation: SimulationExecution): Map<string, number> {
        const distribution = new Map<string, number>();

        for (const message of simulation.messages) {
            const count = distribution.get(message.intent) || 0;
            distribution.set(message.intent, count + 1);
        }

        return distribution;
    }

    /**
     * Analizuje czasy odpowiedzi
     */
    private analyzeResponseTimes(simulation: SimulationExecution): {
        average: number;
        min: number;
        max: number;
    } {
        const responseTimes = simulation.messages
            .filter(m => m.response_time_ms > 0)
            .map(m => m.response_time_ms);

        if (responseTimes.length === 0) {
            return {average: 0, min: 0, max: 0};
        }

        const sum = responseTimes.reduce((a, b) => a + b, 0);
        return {
            average: sum / responseTimes.length,
            min: Math.min(...responseTimes),
            max: Math.max(...responseTimes)
        };
    }

    /**
     * Oblicza metryki konwersacji
     */
    private async calculateConversationMetrics(simulation: SimulationExecution): Promise<{
        total_turns: number;
        avg_message_length: number;
        topic_consistency: number;
        goal_achievement_rate: number;
    }> {
        const messages = simulation.messages;

        const total_turns = messages.length;
        const avg_message_length = total_turns > 0
            ? messages.reduce((sum, m) => sum + m.content.length, 0) / total_turns
            : 0;

        const topic_consistency = await this.calculateTopicConsistency(messages);
        const goal_achievement_rate = await this.analyzeGoalAchievement(simulation);

        return {
            total_turns,
            avg_message_length,
            topic_consistency,
            goal_achievement_rate
        };
    }

    /**
     * Oblicza spójność tematyczną konwersacji
     */
    private async calculateTopicConsistency(messages: SimulationMessage[]): Promise<number> {
        if (messages.length < 3) return 1;

        // Prosta analiza - sprawdź czy wiadomości zawierają podobne słowa kluczowe
        const allWords = messages.flatMap(m =>
            m.content.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 4)
        );

        const wordCounts = new Map<string, number>();
        for (const word of allWords) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }

        // Znajdź powtarzające się słowa (temat)
        const repeatedWords = Array.from(wordCounts.entries())
            .filter(([_, count]) => count >= 2)
            .length;

        const uniqueWords = wordCounts.size;

        // Im więcej powtarzających się słów w stosunku do unikalnych, tym większa spójność
        return Math.min(1, repeatedWords / (uniqueWords * 0.3));
    }

    /**
     * Generuje insights z konwersacji
     */
    private async generateInsights(simulation: SimulationExecution): Promise<string[]> {
        const insights: string[] = [];
        const messages = simulation.messages;

        // Insight 1: Długość konwersacji
        if (messages.length > 15) {
            insights.push('Konwersacja była bardzo angażująca - duża liczba wymian');
        } else if (messages.length < 5) {
            insights.push('Konwersacja była krótka - może brakować zaangażowania');
        }

        // Insight 2: Równowaga w rozmowie
        const participantCounts = new Map<string, number>();
        for (const message of messages) {
            participantCounts.set(message.participant_id, (participantCounts.get(message.participant_id) || 0) + 1);
        }

        const counts = Array.from(participantCounts.values());
        const maxCount = Math.max(...counts);
        const minCount = Math.min(...counts);

        if (maxCount / minCount > 2) {
            insights.push('Nierównowaga w konwersacji - jeden uczestnik dominuje');
        } else {
            insights.push('Dobra równowaga w konwersacji między uczestnikami');
        }

        // Insight 3: Intencje
        const intentCounts = Array.from(simulation.analysis.intent_distribution.values());
        const totalIntents = intentCounts.reduce((sum, count) => sum + count, 0);
        const mostCommonIntentCount = Math.max(...intentCounts);

        if (mostCommonIntentCount / totalIntents > 0.5) {
            insights.push('Konwersacja skupiała się głównie na jednym temacie');
        } else {
            insights.push('Różnorodne tematy i intencje w konwersacji');
        }

        return insights;
    }

    /**
     * Generuje sugestie ulepszenia
     */
    private async generateImprovementSuggestions(simulation: SimulationExecution): Promise<string[]> {
        const suggestions: string[] = [];
        const qualityScore = simulation.analysis.conversation_quality_score;

        // Sugestie bazowane na wyniku jakości
        if (qualityScore < 60) {
            suggestions.push('Popraw naturalność odpowiedzi avatarów');
            suggestions.push('Zwiększ koherencję między wiadomościami');
            suggestions.push('Dodaj więcej kontekstu do odpowiedzi');
        } else if (qualityScore < 80) {
            suggestions.push('Zwiększ zaangażowanie poprzez więcej pytań');
            suggestions.push('Popraw timing odpowiedzi');
            suggestions.push('Wzbogać słownictwo avatarów');
        }

        // Sugestie bazowane na analizie flow
        const flowTriggered = simulation.analysis.flow_analysis.flows_triggered.size;
        if (flowTriggered < 2) {
            suggestions.push('Większe wykorzystanie różnych flow rozmowy');
            suggestions.push('Lepsze rozpoznawanie intencji użytkownika');
        }

        // Sugestie dla czasów odpowiedzi
        const avgResponseTime = simulation.analysis.response_times.average;
        if (avgResponseTime > 3000) {
            suggestions.push('Skróć czasy generowania odpowiedzi');
            suggestions.push('Optymalizuj przetwarzanie promptów');
        }

        return suggestions;
    }
}

export default ConversationAnalyzerService;
