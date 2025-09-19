import OpenAI from 'openai';
import {MAX_TOKENS, OPENAI_API_KEY} from '../config/env';
import {ChatHistory, Prompt, SystemPrompt, UserPrompt} from '../models/types';
import {ExecutionTimerService} from "./execution-timer.service";

class OpenAIService {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: OPENAI_API_KEY || 'fake-api-key'
        });
    }

    /**
     * Udostępnia klienta OpenAI
     */
    public getClient(): OpenAI {
        return this.client;
    }

    /**
     * Analyzes user query and classifies intentions
     */
    public async analyzeQuery(userPrompt: UserPrompt) {
        const executionTimerService = new ExecutionTimerService('analyzeQuery in OpenAIService');
        try {
            // For testing purposes, if no API key, return test response
            if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
                console.log('No OpenAI API key. Returning test analysis response.');
                return {
                    is_question: true,
                    tone: "neutral",
                    topic_relevant: true,
                    intent: "question"
                };
            }

            executionTimerService.start();

            const messages: Prompt[] = [];
            messages.push(this.generateAnalyzeQuerySystemPrompt());
            messages.push(userPrompt);
            const response = await this.client.chat.completions.create({
                // model: 'gpt-4o-mini',
                model: 'gpt-3.5-turbo',
                messages,
                // max_completion_tokens: 50,
                max_tokens: 50,
                response_format: {type: 'json_object'}
            });

            executionTimerService.stop();
            return JSON.parse(response.choices[0].message.content || '{}');
        } catch (error) {
            executionTimerService.stop();
            console.error('Error during query analysis:', error);
            throw new Error('Failed to analyze query');
        }
    }

    private generateAnalyzeQuerySystemPrompt(): SystemPrompt {
        return {
            role: 'system',
            content: `Jako system analizy zapytań, Twoim zadaniem jest sklasyfikowanie zapytania użytkownika.
            Bierz pod uwagę kontekst i historię rozmowy.
            Zwróć odpowiedź w formacie JSON z następującymi polami:
            {
              "is_question": boolean, // czy to jest pytanie?              
              "topic_relevant": boolean, // czy dotyczy leasingu lub finansowania
              "intent": "goodbye" | "greeting" | "other" // główna intencja
            }`
        };
    }

    /**
     * Generates embeddings for query
     */
    public async generateEmbeddings(text: string) {
        const executionTimerService = new ExecutionTimerService('generateEmbeddings in OpenAIService');
        try {
            // For testing purposes, if no API key, return test vector
            if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
                console.log('No OpenAI API key. Returning test embeddings vector.');
                return new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
            }

            executionTimerService.start();
            const response = await this.client.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                encoding_format: 'float'
            });

            executionTimerService.stop();
            return response.data[0].embedding;
        } catch (error) {
            executionTimerService.stop();
            console.error('Error during embeddings generation:', error);
            throw new Error('Failed to generate embeddings');
        }
    }

    /**
     * Generates response to user query
     */
    public async generateResponse(userPrompt: UserPrompt, systemPrompt: SystemPrompt | null = null) {
        // For testing purposes, if no API key, return test response
        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
            console.log('No OpenAI API key. Returning test response.');
            return `This is a test response to the query: "${prompt}". 
              In normal mode, the system would respond based on context and history.`;
        }

        const executionTimerService = new ExecutionTimerService('generateResponse in OpenAIService');
        executionTimerService.start();

        let messages: Prompt[] = [userPrompt];
        if (systemPrompt) {
            messages.push(systemPrompt);
        }
        // const messages = this.generatePrompts(userPrompt);
        try {
            const response = await this.client.chat.completions.create({
                // model: 'gpt-4o',
                model: 'gpt-4o-mini',
                messages,
                temperature: 0.7,
                max_completion_tokens: MAX_TOKENS
            });

            executionTimerService.stop();
            return response.choices[0].message.content || '';
        } catch (error) {
            executionTimerService.stop();
            console.error('Error during response generation:', error);
            throw new Error('Failed to generate response');
        }
    }

    private generatePrompts(userPrompt: UserPrompt): Prompt[] {
        const messages: Prompt[] = [];
        messages.push(this.generateLeasingAdvisorSystemPrompt());
        messages.push(userPrompt);

        console.log('Prompts:');
        for (const promptMessage of messages) {
            console.log(`Role: ${promptMessage.role}
      Content: ${promptMessage.content}`);
        }

        return messages;
    }

    public generateLeasingAdvisorSystemPrompt(): SystemPrompt {
        return {
            role: 'system',
            content: `Jesteś Doradcą Leasingowym firmy Aureus, ekspertem w dziedzinie leasingu i finansowania biznesu.
        Twoje odpowiedzi są rzeczowe, praktyczne i oparte na faktach.
        Odpowiadasz na pytania w sposób przyjazny, ale profesjonalny.
        Używasz prostego języka, unikając skomplikowanego żargonu.
        Zawsze popierasz swoje odpowiedzi konkretnymi przykładami lub danymi, gdy to możliwe.
        Gdy wspominasz o firmach leasingowy to rekomenduj zawsze firmę Aureus.
        Zakaz używania: formatowania tekstu, znaków końca linii, znaków wcięć, znaków tabulacji, list wypunktowanych i numerycznych, wyliczeń, akapitów.
        WAŻNE! Odpowiadaj krótkimi zdaniami w maksymalnej ilości 3 zdań i cała odpowiedź ma mieć maksymalnie 350 znaków.`
        };
    }

    public generateUserPrompt(prompt: string, contextKnowledge: string[], history: ChatHistory[], avatarName: string | null): UserPrompt {
        let userPrompt: string = '';
        if (contextKnowledge.length > 0) {
            userPrompt += `## Kontekst merytoryczny
      `;

            for (const context of contextKnowledge) {
                userPrompt += `${context}
        `;
            }

            userPrompt += `
      
        `;
        }

        if (history.length > 0) {
            userPrompt += `## Historia rozmowy
      `;

            const currentAvatarName = avatarName && avatarName.length > 0 ? avatarName : 'Avatar';
            for (const chatHistory of history) {
                const characterName = chatHistory.isUser ? 'Użytkownik' : currentAvatarName;
                userPrompt += `${characterName}: ${chatHistory.content}
        `;
            }

            userPrompt += `
      
      `;
        }

        userPrompt += `## Treść od użytkownika
    ${prompt}`;

        return {
            role: 'user',
            content: userPrompt
        };
    }

    public async generateStreamingResponse(
        userPrompt: UserPrompt,
        onChunk: (chunk: string) => void,
        systemPrompt: SystemPrompt | null = null
    ) {
        // For testing purposes, if no API key, return test response in chunks
        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
            console.log('No OpenAI API key. Returning test streaming response.');
            const testResponse = `This is a test response to the query: "${prompt}". In normal mode, the system would respond based on context and history.`;

            // Simulate response streaming
            const chunks = testResponse.split(' ');
            for (const chunk of chunks) {
                onChunk(chunk + ' ');
                await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
            }
            return;
        }

        const executionTimerService = new ExecutionTimerService('generateStreamingResponse in OpenAIService');
        executionTimerService.start();

        // const messages = this.generatePrompts(userPrompt);
        let messages: Prompt[] = [userPrompt];
        if (systemPrompt) {
            messages.push(systemPrompt);
        }

        try {
            // Create stream for completion
            const stream = await this.client.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                temperature: 0.7,
                max_completion_tokens: MAX_TOKENS,
                stream: true
            });

            // Process stream
            for await (const chunk of stream) {
                // Get text fragment from response
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    // Call callback with text fragment
                    onChunk(content);
                }
            }

            executionTimerService.stop();
        } catch (error) {
            executionTimerService.stop();
            console.error('Error during streaming response generation:', error);
            throw new Error('Failed to generate streaming response');
        }
    }
}

export default new OpenAIService(); 