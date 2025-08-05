#!/usr/bin/env ts-node

/**
 * Test Script dla Knowledge Preparation Engine
 * Demonstracja przetwarzania pliku 12archetypow.json
 */

import path from 'path';
import KnowledgePreparationEngine from '../services/knowledge-prepare-engine.service';

async function testKnowledgeEngine() {
  console.log('🚀 === TEST KNOWLEDGE PREPARATION ENGINE ===\n');
  
  try {
    // Ścieżka do pliku 12archetypow.json
    const filePath = path.resolve(process.cwd(), '12archetypow.json');
    console.log(`📁 File path: ${filePath}\n`);
    
    // Inicjalizacja KPE
    const kpe = KnowledgePreparationEngine.getInstance();
    console.log('✅ Knowledge Preparation Engine initialized\n');
    
    // Przetwarzanie materiału
    console.log('🔄 Processing training material...');
    const startTime = Date.now();
    
    const processedContent = await kpe.processTrainingMaterial(filePath, 'json');
    
    const endTime = Date.now();
    console.log(`⏱️  Processing completed in ${endTime - startTime}ms\n`);
    
    // Wyświetlenie podsumowania
    console.log('📊 === PROCESSING SUMMARY ===');
    console.log(`Course ID: ${processedContent.originalCourse.courseId}`);
    console.log(`Course Name: ${processedContent.originalCourse.courseName}`);
    console.log(`Total Lessons: ${processedContent.originalCourse.totalLessons}`);
    console.log(`Chunks Processed: ${processedContent.metadata.chunksProcessed}`);
    console.log(`Vector Chunks Generated: ${processedContent.metadata.vectorChunksCreated}`);
    console.log(`Processing Time: ${processedContent.metadata.processingTime}ms\n`);
    
    // Analiza flows
    console.log('🎯 === METHODOLOGICAL FLOWS ANALYSIS ===');
    
    const flowStats = Object.entries(processedContent.flowMapping).map(([flowType, contents]) => {
      return {
        flow: flowType.replace('_flow', '').toUpperCase(),
        contentPieces: contents.length,
        totalCharacters: contents.reduce((sum, content) => sum + content.content.length, 0),
        avgTimePerPiece: contents.length > 0 ? 
          Math.round(contents.reduce((sum, content) => sum + content.estimatedTime, 0) / contents.length) : 0,
        lessonsCovered: [...new Set(contents.map(c => c.lessonId))].length
      };
    });
    
    console.table(flowStats);
    
    // Przykłady z każdego flow
    console.log('\n🔍 === SAMPLE CONTENT FROM EACH FLOW ===\n');
    
    for (const [flowType, contents] of Object.entries(processedContent.flowMapping)) {
      if (contents.length > 0) {
        const sample = contents[0];
        console.log(`📌 ${flowType.toUpperCase()}:`);
        console.log(`   Lesson: ${sample.lessonName}`);
        console.log(`   Objective: ${sample.learningObjective}`);
        console.log(`   Keywords: ${sample.keywords.join(', ')}`);
        console.log(`   Sample: "${sample.content.substring(0, 200)}..."`);
        console.log(`   Estimated Time: ${sample.estimatedTime} min\n`);
      }
    }
    
    // Vector chunks analysis
    console.log('🔢 === VECTOR CHUNKS ANALYSIS ===');
    
    const vectorByFlow = processedContent.vectorChunks.reduce((acc, chunk) => {
      acc[chunk.metadata.flow] = (acc[chunk.metadata.flow] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.table(vectorByFlow);
    
    // Sample vector chunks
    console.log('\n📝 === SAMPLE VECTOR CHUNKS ===\n');
    
    const sampleChunks = processedContent.vectorChunks.slice(0, 3);
    sampleChunks.forEach((chunk, index) => {
      console.log(`🔸 Vector Chunk ${index + 1}:`);
      console.log(`   ID: ${chunk.id}`);
      console.log(`   Flow: ${chunk.metadata.flow}`);
      console.log(`   Type: ${chunk.metadata.type}`);
      console.log(`   Keywords: ${chunk.metadata.keywords.join(', ')}`);
      console.log(`   Difficulty: ${chunk.metadata.difficulty}`);
      console.log(`   Content: "${chunk.content.substring(0, 150)}..."`);
      console.log('');
    });
    
    // Opcjonalny zapis do pliku
    const outputPath = path.resolve(process.cwd(), 'processed_12archetypow.json');
    await kpe.saveProcessedContent(processedContent, outputPath);
    console.log(`💾 Processed content saved to: ${outputPath}\n`);
    
    // Podsumowanie
    console.log('✅ === TEST COMPLETED SUCCESSFULLY ===');
    console.log('🎯 Key achievements:');
    console.log('   ✓ Successfully parsed JSON transcript');
    console.log('   ✓ AI-powered content classification');
    console.log('   ✓ Methodological flow mapping');
    console.log('   ✓ Vector chunks generation');
    console.log('   ✓ Ready for avatar training system\n');
    
    // Instrukcje do dalszych testów
    console.log('🚀 Next steps for testing:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Test the API: POST /api/knowledge/test-12archetypes');
    console.log('   3. Check health: GET /api/knowledge/health');
    console.log('   4. Upload to vector DB with uploadToVector=true\n');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

// Uruchomienie testu
if (require.main === module) {
  testKnowledgeEngine()
    .then(() => {
      console.log('🏁 Test script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

export default testKnowledgeEngine;