import {Request, Response} from 'express';
import path from 'path';
import KnowledgePreparationEngine from '../services/knowledge-prepare-engine.service';

/**
 * Knowledge Preparation Controller
 * Endpoints do przetwarzania materiałów szkoleniowych
 */
class KnowledgePreparationController {

    /**
     * POST /api/knowledge/process
     * Przetwarza plik szkoleniowy na flows metodyczne
     */
    public async processTrainingFile(req: Request, res: Response): Promise<void> {
        try {
            const {filePath, fileType = 'json', uploadToVector = false, saveOutput = true} = req.body;

            if (!filePath) {
                res.status(400).json({
                    error: 'Missing required parameter: filePath'
                });
                return;
            }

            console.log(`📚 KPE Controller: Processing training file: ${filePath}`);

            const kpe = KnowledgePreparationEngine.getInstance();

            // Przetwarzanie materiału
            const processedContent = await kpe.processTrainingMaterial(filePath, fileType);

            // Opcjonalny upload do bazy wektorowej
            if (uploadToVector) {
                console.log('📤 KPE Controller: Uploading to vector database...');
                await kpe.uploadToVectorDatabase(processedContent.vectorChunks);
            }

            // Opcjonalny zapis przetworzonej treści
            if (saveOutput) {
                const outputPath = path.join(path.dirname(filePath), `processed_${path.basename(filePath)}`);
                await kpe.saveProcessedContent(processedContent, outputPath);
            }

            // Podsumowanie wyników
            const summary = {
                success: true,
                processing: {
                    courseId: processedContent.originalCourse.courseId,
                    courseName: processedContent.originalCourse.courseName,
                    totalLessons: processedContent.originalCourse.totalLessons,
                    chunksProcessed: processedContent.metadata.chunksProcessed,
                    vectorChunksGenerated: processedContent.metadata.vectorChunksCreated,
                    processingTime: `${processedContent.metadata.processingTime}ms`
                },
                flows: {
                    theory_introduction: processedContent.flowMapping.theory_introduction_flow.length,
                    guided_practice: processedContent.flowMapping.guided_practice_flow.length,
                    question_answer: processedContent.flowMapping.question_answer_flow.length,
                    independent_practice: processedContent.flowMapping.independent_practice_flow.length,
                    assessment: processedContent.flowMapping.assessment_flow.length,
                    summary_reflection: processedContent.flowMapping.summary_reflection_flow.length
                },
                actions_taken: {
                    uploaded_to_vector_db: uploadToVector,
                    saved_processed_file: saveOutput
                }
            };

            res.status(200).json(summary);

        } catch (error) {
            console.error('❌ KPE Controller: Processing failed:', error);
            res.status(500).json({
                error: 'Training file processing failed',
                details: (error as Error).message
            });
        }
    }

    /**
     * GET /api/knowledge/flows/:courseId
     * Pobiera przetworzone flows dla kursu
     */
    public async getProcessedFlows(req: Request, res: Response): Promise<void> {
        try {
            const {courseId} = req.params;
            const {flow} = req.query;

            if (!courseId) {
                res.status(400).json({error: 'Course ID is required'});
                return;
            }

            // TODO: Implementacja pobierania z bazy lub cache
            // Na razie zwracamy przykładowe dane
            const mockFlows = {
                courseId,
                flows: {
                    theory_introduction: [
                        {
                            lessonId: 'lesson-1',
                            content: 'Przykładowa teoria...',
                            learningObjective: 'Zrozumienie podstaw',
                            estimatedTime: 5
                        }
                    ],
                    guided_practice: [],
                    question_answer: [],
                    independent_practice: [],
                    assessment: [],
                    summary_reflection: []
                }
            };

            if (flow && (mockFlows.flows as any)[flow as string]) {
                res.status(200).json({
                    courseId,
                    flow,
                    content: (mockFlows.flows as any)[flow as string]
                });
            } else {
                res.status(200).json(mockFlows);
            }

        } catch (error) {
            console.error('❌ KPE Controller: Get flows failed:', error);
            res.status(500).json({
                error: 'Failed to retrieve processed flows',
                details: (error as Error).message
            });
        }
    }

    /**
     * POST /api/knowledge/test-12archetypes
     * Test endpoint dla szkolenia 12 Archetypów
     */
    public async test12Archetypes(req: Request, res: Response): Promise<void> {
        try {
            console.log('🧪 KPE Controller: Testing 12 Archetypes processing...');

            const filePath = path.resolve(process.cwd(), '12archetypow.json');
            const kpe = KnowledgePreparationEngine.getInstance();

            // Przetwarzanie pliku 12 Archetypów
            const processedContent = await kpe.processTrainingMaterial(filePath, 'json');

            // Analiza wyników
            const flowAnalysis = Object.entries(processedContent.flowMapping).map(([flowType, contents]) => ({
                flow: flowType,
                contentPieces: contents.length,
                totalCharacters: contents.reduce((sum: number, content: any) => sum + content.content.length, 0),
                lessons_covered: [...new Set(contents.map((c: any) => c.lessonId))].length,
                sample_content: contents[0]?.content.substring(0, 200) + '...' || 'No content'
            }));

            const response = {
                success: true,
                test_results: {
                    course_info: {
                        id: processedContent.originalCourse.courseId,
                        name: processedContent.originalCourse.courseName,
                        lessons: processedContent.originalCourse.totalLessons
                    },
                    processing_stats: processedContent.metadata,
                    flow_analysis: flowAnalysis,
                    sample_vector_chunks: processedContent.vectorChunks.slice(0, 3).map(chunk => ({
                        id: chunk.id,
                        flow: chunk.metadata.flow,
                        type: chunk.metadata.type,
                        keywords: chunk.metadata.keywords,
                        content_preview: chunk.content.substring(0, 150) + '...'
                    }))
                }
            };

            res.status(200).json(response);

        } catch (error) {
            console.error('❌ KPE Controller: 12 Archetypes test failed:', error);
            res.status(500).json({
                error: '12 Archetypes test failed',
                details: (error as Error).message
            });
        }
    }

    /**
     * GET /api/knowledge/health
     * Health check dla KPE
     */
    public async healthCheck(req: Request, res: Response): Promise<void> {
        try {
            const kpe = KnowledgePreparationEngine.getInstance();

            res.status(200).json({
                service: 'Knowledge Preparation Engine',
                status: 'healthy',
                version: '1.0.0',
                capabilities: [
                    'JSON transcript processing',
                    'AI content analysis',
                    'Methodological flow mapping',
                    'Vector chunk generation',
                    'Multiple file format support (planned)'
                ],
                supported_formats: ['json'],
                planned_formats: ['pdf', 'docx', 'csv', 'md']
            });

        } catch (error) {
            res.status(500).json({
                service: 'Knowledge Preparation Engine',
                status: 'unhealthy',
                error: (error as Error).message
            });
        }
    }
}

export default new KnowledgePreparationController();