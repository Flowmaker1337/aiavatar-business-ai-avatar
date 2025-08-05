import fs from 'fs';
import path from 'path';
import openAIService from './openai.service';
import vectorDatabaseService from './vector-database.service';
import { ExecutionTimerService } from './execution-timer.service';

/**
 * Knowledge Preparation Engine - Główny serwis do przetwarzania materiałów szkoleniowych
 * Obsługuje różne formaty: JSON (transcripts), PDF, DOCX, CSV, MD
 * Mapuje treści na flows metodyczne dla avatara-szkoleniowca
 */

// ===== TYPY DANYCH =====

export interface TrainingContent {
  courseId: string;
  courseName: string;
  totalLessons: number;
  lessons: TrainingLesson[];
  metadata: TrainingMetadata;
}

export interface TrainingLesson {
  id: string;
  name: string;
  order: number;
  chunks: ContentChunk[];
}

export interface ContentChunk {
  id: string;
  content: string;
  length: number;
  sentences: number;
  type?: ChunkType;
  flow?: MethodologicalFlow;
}

export enum ChunkType {
  THEORY = 'theory',
  EXAMPLE = 'example', 
  QUESTION = 'question',
  PRACTICE = 'practice',
  ASSESSMENT = 'assessment',
  SUMMARY = 'summary'
}

export enum MethodologicalFlow {
  THEORY_INTRODUCTION = 'theory_introduction_flow',
  GUIDED_PRACTICE = 'guided_practice_flow',
  QUESTION_ANSWER = 'question_answer_flow',
  INDEPENDENT_PRACTICE = 'independent_practice_flow',
  ASSESSMENT = 'assessment_flow',
  SUMMARY_REFLECTION = 'summary_reflection_flow'
}

export interface ProcessedTrainingContent {
  originalCourse: TrainingContent;
  flowMapping: FlowMapping;
  vectorChunks: VectorChunk[];
  metadata: ProcessingMetadata;
}

export interface FlowMapping {
  [MethodologicalFlow.THEORY_INTRODUCTION]: FlowContent[];
  [MethodologicalFlow.GUIDED_PRACTICE]: FlowContent[];
  [MethodologicalFlow.QUESTION_ANSWER]: FlowContent[];
  [MethodologicalFlow.INDEPENDENT_PRACTICE]: FlowContent[];
  [MethodologicalFlow.ASSESSMENT]: FlowContent[];
  [MethodologicalFlow.SUMMARY_REFLECTION]: FlowContent[];
}

export interface FlowContent {
  lessonId: string;
  lessonName: string;
  chunkId: string;
  content: string;
  learningObjective: string;
  estimatedTime: number; // w minutach
  keywords: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface VectorChunk {
  id: string;
  content: string;
  metadata: {
    courseId: string;
    lessonId: string;
    chunkId: string;
    flow: MethodologicalFlow;
    type: ChunkType;
    keywords: string[];
    difficulty: string;
    intent_type: string;
    relevance: number;
    source: string;
    language: string;
  };
}

export interface TrainingMetadata {
  totalChunks: number;
  processingDate: string;
  version: string;
}

export interface ProcessingMetadata {
  processingTime: number;
  chunksProcessed: number;
  flowsGenerated: number;
  vectorChunksCreated: number;
  aiAnalysisTime: number;
}

// ===== GŁÓWNY SERWIS =====

class KnowledgePreparationEngine {
  private static instance: KnowledgePreparationEngine;
  private timer = ExecutionTimerService.getInstance();

  private constructor() {}

  public static getInstance(): KnowledgePreparationEngine {
    if (!KnowledgePreparationEngine.instance) {
      KnowledgePreparationEngine.instance = new KnowledgePreparationEngine();
    }
    return KnowledgePreparationEngine.instance;
  }

  /**
   * GŁÓWNA FUNKCJA - Przetwarza materiały szkoleniowe na flows metodyczne
   */
  public async processTrainingMaterial(
    filePath: string,
    fileType: 'json' | 'pdf' | 'docx' | 'csv' | 'md' = 'json'
  ): Promise<ProcessedTrainingContent> {
    
    const timerName = `ProcessTrainingMaterial_${Date.now()}`;
    this.timer.start(timerName);

    try {
      console.log(`🚀 KPE: Starting processing of ${filePath} (${fileType})`);

      // 1. PARSING - ładowanie i parsowanie pliku
      const rawContent = await this.parseInputFile(filePath, fileType);
      
      // 2. ANALIZA TREŚCI - AI rozpoznaje elementy metodyczne
      const analyzedContent = await this.analyzeContent(rawContent);
      
      // 3. MAPOWANIE - przypisanie do flows metodycznych
      const flowMapping = await this.mapToMethodologicalFlows(analyzedContent);
      
      // 4. GENEROWANIE CHUNKÓW - dla bazy wektorowej
      const vectorChunks = await this.generateVectorChunks(flowMapping, rawContent);
      
      // 5. UPLOAD DO BAZY - opcjonalnie
      // await this.uploadToVectorDatabase(vectorChunks);

      const processingTime = this.timer.end(timerName);
      
      const result: ProcessedTrainingContent = {
        originalCourse: rawContent,
        flowMapping,
        vectorChunks,
        metadata: {
          processingTime,
          chunksProcessed: rawContent.lessons.reduce((sum, lesson) => sum + lesson.chunks.length, 0),
          flowsGenerated: Object.keys(flowMapping).length,
          vectorChunksCreated: vectorChunks.length,
          aiAnalysisTime: 0 // TODO: track AI calls
        }
      };

      console.log(`✅ KPE: Processing completed in ${processingTime}ms`);
      console.log(`📊 KPE: Generated ${vectorChunks.length} vector chunks from ${result.metadata.chunksProcessed} source chunks`);
      
      return result;

    } catch (error) {
      this.timer.end(timerName);
      console.error('❌ KPE: Processing failed:', error);
      throw error;
    }
  }

  /**
   * 1. PARSER MODUŁU - różne formaty plików
   */
  private async parseInputFile(filePath: string, fileType: string): Promise<TrainingContent> {
    switch (fileType) {
      case 'json':
        return this.parseJSONTranscript(filePath);
      case 'pdf':
        return this.parsePDFDocument(filePath);
      case 'docx':
        return this.parseWordDocument(filePath);
      case 'csv':
        return this.parseCSVData(filePath);
      case 'md':
        return this.parseMarkdownFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * PARSER JSON - dla transkrypcji jak 12archetypow.json
   */
  private async parseJSONTranscript(filePath: string): Promise<TrainingContent> {
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(rawData);
      
      console.log(`📄 KPE: Parsed JSON with ${jsonData.lessons?.length || 0} lessons`);
      
      return {
        courseId: jsonData.courseId || 'unknown',
        courseName: jsonData.name || jsonData.courseId || 'Unknown Course',
        totalLessons: jsonData.totalLessons || jsonData.lessons?.length || 0,
        lessons: jsonData.lessons || [],
        metadata: jsonData.metadata || {
          totalChunks: 0,
          processingDate: new Date().toISOString(),
          version: '1.0'
        }
      };
    } catch (error) {
      console.error('❌ KPE: JSON parsing failed:', error);
      throw new Error(`Failed to parse JSON file: ${error.message}`);
    }
  }

  /**
   * PLACEHOLDER PARSERY - do implementacji w przyszłości
   */
  private async parsePDFDocument(filePath: string): Promise<TrainingContent> {
    // TODO: Implementacja parsera PDF
    throw new Error('PDF parsing not yet implemented');
  }

  private async parseWordDocument(filePath: string): Promise<TrainingContent> {
    // TODO: Implementacja parsera DOCX
    throw new Error('DOCX parsing not yet implemented');
  }

  private async parseCSVData(filePath: string): Promise<TrainingContent> {
    // TODO: Implementacja parsera CSV
    throw new Error('CSV parsing not yet implemented');
  }

  private async parseMarkdownFile(filePath: string): Promise<TrainingContent> {
    // TODO: Implementacja parsera Markdown
    throw new Error('Markdown parsing not yet implemented');
  }

  /**
   * 2. CONTENT ANALYZER - AI rozpoznaje elementy metodyczne
   */
  private async analyzeContent(content: TrainingContent): Promise<TrainingContent> {
    console.log('🤖 KPE: Starting AI content analysis...');
    
    const analyzedContent = { ...content };
    
    for (const lesson of analyzedContent.lessons) {
      for (const chunk of lesson.chunks) {
        // AI klasyfikuje typ fragmentu
        const chunkType = await this.classifyChunkType(chunk.content);
        const methodFlow = this.mapChunkTypeToFlow(chunkType);
        
        chunk.type = chunkType;
        chunk.flow = methodFlow;
      }
    }
    
    console.log('✅ KPE: Content analysis completed');
    return analyzedContent;
  }

  /**
   * AI CLASSIFIER - rozpoznaje typ fragmentu treści
   */
  private async classifyChunkType(content: string): Promise<ChunkType> {
    // Prosta klasyfikacja na podstawie słów kluczowych (fallback)
    const lowerContent = content.toLowerCase();
    
    // TEORIA - definicje, wyjaśnienia, cechy
    if (lowerContent.includes('archetyp') || 
        lowerContent.includes('cechy') || 
        lowerContent.includes('charakteryzuje') ||
        lowerContent.includes('zdolność do')) {
      return ChunkType.THEORY;
    }
    
    // PRZYKŁADY - filmy, postacie, case studies
    if (lowerContent.includes('przykład') || 
        lowerContent.includes('film') || 
        lowerContent.includes('postać') ||
        lowerContent.includes('disney') ||
        lowerContent.includes('batman') ||
        lowerContent.includes('shrek')) {
      return ChunkType.EXAMPLE;
    }
    
    // PYTANIA - interakcja z uczestnikami
    if (lowerContent.includes('kto z was') || 
        lowerContent.includes('pytanie') || 
        lowerContent.includes('co myślicie') ||
        lowerContent.includes('jak się czujecie')) {
      return ChunkType.QUESTION;
    }
    
    // PRAKTYKA - zadania, autoanalizy
    if (lowerContent.includes('zobacz u siebie') || 
        lowerContent.includes('porównaj') || 
        lowerContent.includes('sprawdź') ||
        lowerContent.includes('weź na warsztat')) {
      return ChunkType.PRACTICE;
    }
    
    // PODSUMOWANIE
    if (lowerContent.includes('podsumowanie') || 
        lowerContent.includes('co dalej') || 
        lowerContent.includes('wnioski')) {
      return ChunkType.SUMMARY;
    }
    
    // Domyślnie TEORIA
    return ChunkType.THEORY;
  }

  /**
   * MAPPER - przypisuje typy chunków do flows metodycznych
   */
  private mapChunkTypeToFlow(chunkType: ChunkType): MethodologicalFlow {
    switch (chunkType) {
      case ChunkType.THEORY:
        return MethodologicalFlow.THEORY_INTRODUCTION;
      case ChunkType.EXAMPLE:
        return MethodologicalFlow.GUIDED_PRACTICE;
      case ChunkType.QUESTION:
        return MethodologicalFlow.QUESTION_ANSWER;
      case ChunkType.PRACTICE:
        return MethodologicalFlow.INDEPENDENT_PRACTICE;
      case ChunkType.ASSESSMENT:
        return MethodologicalFlow.ASSESSMENT;
      case ChunkType.SUMMARY:
        return MethodologicalFlow.SUMMARY_REFLECTION;
      default:
        return MethodologicalFlow.THEORY_INTRODUCTION;
    }
  }

  /**
   * 3. FLOW MAPPER - tworzy mapowanie na flows metodyczne
   */
  private async mapToMethodologicalFlows(content: TrainingContent): Promise<FlowMapping> {
    console.log('🔄 KPE: Mapping content to methodological flows...');
    
    const flowMapping: FlowMapping = {
      [MethodologicalFlow.THEORY_INTRODUCTION]: [],
      [MethodologicalFlow.GUIDED_PRACTICE]: [],
      [MethodologicalFlow.QUESTION_ANSWER]: [],
      [MethodologicalFlow.INDEPENDENT_PRACTICE]: [],
      [MethodologicalFlow.ASSESSMENT]: [],
      [MethodologicalFlow.SUMMARY_REFLECTION]: []
    };

    for (const lesson of content.lessons) {
      for (const chunk of lesson.chunks) {
        if (chunk.flow) {
          const flowContent: FlowContent = {
            lessonId: lesson.id,
            lessonName: lesson.name,
            chunkId: chunk.id,
            content: chunk.content,
            learningObjective: this.generateLearningObjective(chunk.content, lesson.name),
            estimatedTime: Math.ceil(chunk.length / 1000), // ~1 min na 1000 znaków
            keywords: this.extractKeywords(chunk.content),
            difficulty: this.assessDifficulty(chunk.content)
          };
          
          flowMapping[chunk.flow].push(flowContent);
        }
      }
    }
    
    const totalFlowContent = Object.values(flowMapping).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`✅ KPE: Mapped ${totalFlowContent} content pieces to flows`);
    
    return flowMapping;
  }

  /**
   * 4. VECTOR CHUNK GENERATOR - tworzy chunki dla bazy wektorowej
   */
  private async generateVectorChunks(flowMapping: FlowMapping, originalContent: TrainingContent): Promise<VectorChunk[]> {
    console.log('🔢 KPE: Generating vector chunks...');
    
    const vectorChunks: VectorChunk[] = [];
    
    for (const [flowType, flowContents] of Object.entries(flowMapping)) {
      for (const flowContent of flowContents) {
        const vectorChunk: VectorChunk = {
          id: `${originalContent.courseId}_${flowContent.chunkId}_vector`,
          content: flowContent.content,
          metadata: {
            courseId: originalContent.courseId,
            lessonId: flowContent.lessonId,
            chunkId: flowContent.chunkId,
            flow: flowType as MethodologicalFlow,
            type: this.flowToChunkType(flowType as MethodologicalFlow),
            keywords: flowContent.keywords,
            difficulty: flowContent.difficulty,
            intent_type: `training_${flowType}`,
            relevance: 0.9,
            source: 'knowledge_preparation_engine',
            language: 'pl'
          }
        };
        
        vectorChunks.push(vectorChunk);
      }
    }
    
    console.log(`✅ KPE: Generated ${vectorChunks.length} vector chunks`);
    return vectorChunks;
  }

  /**
   * HELPER FUNCTIONS - narzędzia pomocnicze
   */
  private generateLearningObjective(content: string, lessonName: string): string {
    // Prosta heurystyka dla celów uczenia się
    if (content.toLowerCase().includes('archetyp')) {
      return `Zrozumienie archetypu z lekcji: ${lessonName}`;
    }
    return `Poznanie materiału z lekcji: ${lessonName}`;
  }

  private extractKeywords(content: string): string[] {
    // Prosta ekstrakcja słów kluczowych
    const keywords = [];
    const lowerContent = content.toLowerCase();
    
    const archetypeKeywords = ['wojownik', 'gospodarz', 'intelektualista', 'opiekun', 'lider', 'inżynier', 'artysta', 'władca', 'podróżnik', 'budowniczy', 'innowator', 'mistyk'];
    const traitKeywords = ['odwaga', 'spokój', 'ciekawość', 'empatia', 'charyzma', 'perfekcjonizm', 'harmonia', 'determinacja', 'wiara', 'organizacja', 'wizja', 'współczucie'];
    
    for (const keyword of [...archetypeKeywords, ...traitKeywords]) {
      if (lowerContent.includes(keyword)) {
        keywords.push(keyword);
      }
    }
    
    return keywords.slice(0, 5); // Max 5 słów kluczowych
  }

  private assessDifficulty(content: string): 'basic' | 'intermediate' | 'advanced' {
    // Prosta ocena trudności na podstawie długości i złożoności
    const length = content.length;
    const complexWords = (content.match(/\b\w{10,}\b/g) || []).length;
    
    if (length < 1000 && complexWords < 5) return 'basic';
    if (length < 3000 && complexWords < 15) return 'intermediate';
    return 'advanced';
  }

  private flowToChunkType(flow: MethodologicalFlow): ChunkType {
    switch (flow) {
      case MethodologicalFlow.THEORY_INTRODUCTION:
        return ChunkType.THEORY;
      case MethodologicalFlow.GUIDED_PRACTICE:
        return ChunkType.EXAMPLE;
      case MethodologicalFlow.QUESTION_ANSWER:
        return ChunkType.QUESTION;
      case MethodologicalFlow.INDEPENDENT_PRACTICE:
        return ChunkType.PRACTICE;
      case MethodologicalFlow.ASSESSMENT:
        return ChunkType.ASSESSMENT;
      case MethodologicalFlow.SUMMARY_REFLECTION:
        return ChunkType.SUMMARY;
      default:
        return ChunkType.THEORY;
    }
  }

  /**
   * 5. UPLOAD TO VECTOR DATABASE - opcjonalny upload do Qdrant
   */
  public async uploadToVectorDatabase(vectorChunks: VectorChunk[]): Promise<void> {
    console.log(`🚀 KPE: Uploading ${vectorChunks.length} chunks to vector database...`);
    
    try {
      // Konwertujemy na format zgodny z VectorDatabaseService
      const vectorData = vectorChunks.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata
      }));
      
      await vectorDatabaseService.uploadVectorData(vectorData);
      console.log('✅ KPE: Vector chunks uploaded successfully');
      
    } catch (error) {
      console.error('❌ KPE: Vector upload failed:', error);
      throw error;
    }
  }

  /**
   * 6. SAVE PROCESSED CONTENT - zapis przetworzonej treści
   */
  public async saveProcessedContent(processedContent: ProcessedTrainingContent, outputPath: string): Promise<void> {
    try {
      const jsonContent = JSON.stringify(processedContent, null, 2);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
      console.log(`💾 KPE: Processed content saved to ${outputPath}`);
    } catch (error) {
      console.error('❌ KPE: Failed to save processed content:', error);
      throw error;
    }
  }
}

export default KnowledgePreparationEngine;