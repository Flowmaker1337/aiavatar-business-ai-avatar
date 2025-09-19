import {ELEVEN_LABS_API_KEY} from '../config/env';
import {ExecutionTimerService} from './execution-timer.service';
import fs from 'fs';
import path from 'path';

/**
 * ElevenLabs service - obsługuje syntezę mowy
 */
class ElevenLabsService {
    private static instance: ElevenLabsService;
    private initialized = false;
    private defaultVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam voice
    private baseUrl = 'https://api.elevenlabs.io/v1';

    private constructor() {
        if (!ELEVEN_LABS_API_KEY || ELEVEN_LABS_API_KEY === 'your_elevenlabs_api_key_here') {
            console.warn('⚠️  ElevenLabs API key not configured. Text-to-speech will be disabled.');
            return;
        }

        this.initialized = true;
        console.log('✅ ElevenLabs service initialized');
    }

    public static getInstance(): ElevenLabsService {
        if (!ElevenLabsService.instance) {
            ElevenLabsService.instance = new ElevenLabsService();
        }
        return ElevenLabsService.instance;
    }

    /**
     * Sprawdza czy service jest zainicjalizowany
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Generuje mowę z tekstu
     */
    public async generateSpeech(
        text: string,
        voiceId?: string,
        options?: {
            model?: string;
            stability?: number;
            similarityBoost?: number;
            style?: number;
            useSpeakerBoost?: boolean;
        }
    ): Promise<Buffer | null> {
        if (!this.isInitialized()) {
            console.warn('ElevenLabs service not initialized. Skipping speech generation.');
            return null;
        }

        const timer = new ExecutionTimerService('generateSpeech in ElevenLabsService');
        timer.start();

        try {
            const voice = voiceId || this.defaultVoiceId;
            const model = options?.model || 'eleven_multilingual_v2';

            console.log(`🎵 Generating speech for text: "${text.substring(0, 100)}..."`)
            console.log(`🎤 Using voice: ${voice}, model: ${model}`);

            const response = await fetch(`${this.baseUrl}/text-to-speech/${voice}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVEN_LABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: model,
                    voice_settings: {
                        stability: options?.stability || 0.75,
                        similarity_boost: options?.similarityBoost || 0.75,
                        style: options?.style || 0.0,
                        use_speaker_boost: options?.useSpeakerBoost || true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const audioBuffer = Buffer.from(await response.arrayBuffer());

            timer.stop();
            console.log(`✅ Speech generated successfully (${audioBuffer.length} bytes)`);

            return audioBuffer;
        } catch (error) {
            timer.stop();
            console.error('❌ Error generating speech:', error);
            return null;
        }
    }

    /**
     * Generuje mowę i zapisuje do pliku
     */
    public async generateSpeechFile(
        text: string,
        outputPath: string,
        voiceId?: string,
        options?: {
            model?: string;
            stability?: number;
            similarityBoost?: number;
            style?: number;
            useSpeakerBoost?: boolean;
        }
    ): Promise<string | null> {
        const audioBuffer = await this.generateSpeech(text, voiceId, options);

        if (!audioBuffer) {
            return null;
        }

        try {
            // Upewnij się, że katalog istnieje
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, {recursive: true});
            }

            // Zapisz plik
            fs.writeFileSync(outputPath, audioBuffer);

            console.log(`✅ Speech file saved to: ${outputPath}`);
            return outputPath;
        } catch (error) {
            console.error('❌ Error saving speech file:', error);
            return null;
        }
    }

    /**
     * Generuje mowę ze streamingiem
     */
    public async generateSpeechStream(
        text: string,
        voiceId?: string,
        options?: {
            model?: string;
            stability?: number;
            similarityBoost?: number;
            style?: number;
            useSpeakerBoost?: boolean;
        }
    ): Promise<ReadableStream<Uint8Array> | null> {
        if (!this.isInitialized()) {
            console.warn('ElevenLabs service not initialized. Skipping speech streaming.');
            return null;
        }

        const timer = new ExecutionTimerService('generateSpeechStream in ElevenLabsService');
        timer.start();

        try {
            const voice = voiceId || this.defaultVoiceId;
            const model = options?.model || 'eleven_multilingual_v2';

            console.log(`🎵 Streaming speech for text: "${text.substring(0, 100)}..."`)
            console.log(`🎤 Using voice: ${voice}, model: ${model}`);

            const response = await fetch(`${this.baseUrl}/text-to-speech/${voice}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': ELEVEN_LABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: model,
                    voice_settings: {
                        stability: options?.stability || 0.75,
                        similarity_boost: options?.similarityBoost || 0.75,
                        style: options?.style || 0.0,
                        use_speaker_boost: options?.useSpeakerBoost || true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            timer.stop();
            console.log(`✅ Speech streaming started`);

            return response.body;
        } catch (error) {
            timer.stop();
            console.error('❌ Error starting speech stream:', error);
            return null;
        }
    }

    /**
     * Pobiera dostępne głosy
     */
    public async getAvailableVoices(): Promise<any[] | null> {
        if (!this.isInitialized()) {
            console.warn('ElevenLabs service not initialized. Cannot get voices.');
            return null;
        }

        try {
            const response = await fetch(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': ELEVEN_LABS_API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Retrieved ${data.voices.length} voices`);
            return data.voices;
        } catch (error) {
            console.error('❌ Error getting voices:', error);
            return null;
        }
    }

    /**
     * Znajduje głos po nazwie
     */
    public async findVoiceByName(name: string): Promise<string | null> {
        const voices = await this.getAvailableVoices();
        if (!voices) {
            return null;
        }

        const voice = voices.find(v => v.name.toLowerCase() === name.toLowerCase());
        return voice ? voice.voice_id : null;
    }

    /**
     * Pobiera domyślny voice ID
     */
    public getDefaultVoiceId(): string {
        return this.defaultVoiceId;
    }

    /**
     * Ustawia domyślny voice ID
     */
    public setDefaultVoiceId(voiceId: string): void {
        this.defaultVoiceId = voiceId;
        console.log(`✅ Default voice ID set to: ${voiceId}`);
    }

    /**
     * Sprawdza czy tekst jest odpowiedni do TTS
     */
    public isTextSuitableForTTS(text: string): boolean {
        if (!text || text.trim().length === 0) {
            return false;
        }

        // Sprawdź długość (max 5000 znaków dla ElevenLabs)
        if (text.length > 5000) {
            return false;
        }

        // Sprawdź czy tekst zawiera zbyt dużo formatowania
        const formattingChars = /[{}[\]()]/g;
        const formattingCount = (text.match(formattingChars) || []).length;
        if (formattingCount > text.length * 0.1) {
            return false;
        }

        return true;
    }

    /**
     * Czyści tekst do TTS
     */
    public cleanTextForTTS(text: string): string {
        return text
            .replace(/[{}[\]()]/g, '') // Usuń formatowanie
            .replace(/\s+/g, ' ') // Normalizuj whitespace
            .replace(/\n+/g, '. ') // Zamień newlines na kropki
            .trim();
    }

    /**
     * Sprawdza dostępność API
     */
    public async checkApiHealth(): Promise<boolean> {
        if (!this.isInitialized()) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': ELEVEN_LABS_API_KEY
                }
            });
            return response.ok;
        } catch (error) {
            console.error('❌ ElevenLabs API health check failed:', error);
            return false;
        }
    }
}

export default ElevenLabsService; 