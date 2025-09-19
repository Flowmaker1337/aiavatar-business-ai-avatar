import fs from 'fs';
import path from 'path';
import {KnowledgeFile} from '../models/types';
import vectorDatabaseService from './vector-database.service';
import openAIService from './openai.service';

/**
 * KnowledgeFileProcessor - przetwarza uploaded pliki na RAG vectors
 * Obsługuje PDF, CSV, MD, TXT, DOCX
 */
class KnowledgeFileProcessor {
    private static instance: KnowledgeFileProcessor;
    private uploadDir: string;

    private constructor() {
        this.uploadDir = path.resolve(__dirname, '../../uploads');

        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, {recursive: true});
        }
    }

    public static getInstance(): KnowledgeFileProcessor {
        if (!KnowledgeFileProcessor.instance) {
            KnowledgeFileProcessor.instance = new KnowledgeFileProcessor();
        }
        return KnowledgeFileProcessor.instance;
    }

    /**
     * Przetwarza pojedynczy plik knowledge na vectors
     */
    public async processKnowledgeFile(
        file: KnowledgeFile,
        avatarId: string,
        fileBuffer?: Buffer
    ): Promise<{ success: boolean; vectorCount: number; error?: string }> {
        try {
            console.log(`📁 Processing knowledge file: ${file.name} for avatar: ${avatarId}`);

            // Extract text content from file
            let textContent: string;
            if (fileBuffer) {
                textContent = await this.extractTextFromBuffer(file, fileBuffer);
            } else {
                // Try to read from upload directory
                const filePath = path.join(this.uploadDir, file.id);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found: ${filePath}`);
                }
                const buffer = fs.readFileSync(filePath);
                textContent = await this.extractTextFromBuffer(file, buffer);
            }

            if (!textContent || textContent.trim().length === 0) {
                throw new Error('No text content extracted from file');
            }

            console.log(`📝 Extracted ${textContent.length} characters from ${file.name}`);

            // Split text into chunks
            const chunks = this.splitTextIntoChunks(textContent, 1000, 200); // 1000 chars with 200 overlap
            console.log(`🔪 Split into ${chunks.length} chunks`);

            // Generate embeddings and store in vector DB
            const vectorCount = await this.storeChunksAsVectors(chunks, file, avatarId);

            console.log(`✅ Processed ${file.name}: ${vectorCount} vectors stored`);
            return {success: true, vectorCount};

        } catch (error: any) {
            console.error(`❌ Error processing knowledge file ${file.name}:`, error);
            return {success: false, vectorCount: 0, error: error.message};
        }
    }

    /**
     * Przetwarza wszystkie pliki knowledge dla avatara
     */
    public async processAllKnowledgeFiles(
        files: KnowledgeFile[],
        avatarId: string
    ): Promise<{ totalVectors: number; processedFiles: number; errors: string[] }> {
        let totalVectors = 0;
        let processedFiles = 0;
        const errors: string[] = [];

        for (const file of files) {
            const result = await this.processKnowledgeFile(file, avatarId);
            if (result.success) {
                totalVectors += result.vectorCount;
                processedFiles++;
            } else {
                errors.push(`${file.name}: ${result.error}`);
            }
        }

        console.log(`📊 Processed ${processedFiles}/${files.length} knowledge files for avatar ${avatarId}`);
        console.log(`📊 Total vectors: ${totalVectors}, Errors: ${errors.length}`);

        return {totalVectors, processedFiles, errors};
    }

    /**
     * Zapisuje plik na dysk
     */
    public async saveFileToUploadDir(file: KnowledgeFile, buffer: Buffer): Promise<string> {
        const filePath = path.join(this.uploadDir, file.id);
        fs.writeFileSync(filePath, buffer);
        console.log(`💾 Saved file to: ${filePath}`);
        return filePath;
    }

    /**
     * Usuwa plik z dysku
     */
    public async deleteFileFromUploadDir(fileId: string): Promise<void> {
        const filePath = path.join(this.uploadDir, fileId);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Deleted file: ${filePath}`);
        }
    }

    // ============ PRIVATE METHODS ============

    /**
     * Ekstraktuje tekst z buffer na podstawie typu pliku
     */
    private async extractTextFromBuffer(file: KnowledgeFile, buffer: Buffer): Promise<string> {
        const extension = path.extname(file.name).toLowerCase();

        switch (extension) {
            case '.txt':
            case '.md':
                return buffer.toString('utf-8');

            case '.csv':
                return this.processCsvContent(buffer.toString('utf-8'));

            case '.pdf':
                return await this.extractTextFromPdf(buffer);

            case '.docx':
                return await this.extractTextFromDocx(buffer);

            default:
                throw new Error(`Unsupported file type: ${extension}`);
        }
    }

    /**
     * Przetwarza zawartość CSV na czytelny tekst
     */
    private processCsvContent(csvContent: string): string {
        const lines = csvContent.split('\n');
        if (lines.length === 0) return '';

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const processedLines = [`Headers: ${headers.join(', ')}`];

        for (let i = 1; i < lines.length && i <= 100; i++) { // Limit to 100 rows
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length === headers.length) {
                const row = headers.map((header, idx) => `${header}: ${values[idx]}`).join(', ');
                processedLines.push(`Row ${i}: ${row}`);
            }
        }

        return processedLines.join('\n');
    }

    /**
     * Ekstraktuje tekst z PDF (placeholder - wymagałby pdf-parse)
     */
    private async extractTextFromPdf(buffer: Buffer): Promise<string> {
        // TODO: Implement PDF text extraction using pdf-parse or similar
        // For now, return placeholder
        console.warn('⚠️ PDF text extraction not implemented yet');
        return `PDF file content placeholder. File size: ${buffer.length} bytes`;
    }

    /**
     * Ekstraktuje tekst z DOCX (placeholder - wymagałby mammoth)
     */
    private async extractTextFromDocx(buffer: Buffer): Promise<string> {
        // TODO: Implement DOCX text extraction using mammoth or similar
        // For now, return placeholder
        console.warn('⚠️ DOCX text extraction not implemented yet');
        return `DOCX file content placeholder. File size: ${buffer.length} bytes`;
    }

    /**
     * Dzieli tekst na chunks z overlap
     */
    private splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
        const chunks: string[] = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            const chunk = text.substring(start, end);

            if (chunk.trim().length > 0) {
                chunks.push(chunk.trim());
            }

            // Move forward by chunkSize minus overlap
            start = end - overlap;
            if (start >= text.length) break;
        }

        return chunks;
    }

    /**
     * Przechowuje chunks jako vectors w bazie
     */
    private async storeChunksAsVectors(
        chunks: string[],
        file: KnowledgeFile,
        avatarId: string
    ): Promise<number> {
        let vectorCount = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Generate embedding
            const embedding = await openAIService.generateEmbeddings(chunk);

            // Create vector ID
            const vectorId = `${avatarId}_${file.id}_chunk_${i}`;

            // Metadata (matching VectorData interface requirements)
            const metadata = {
                category: 'knowledge_file',
                topic: file.name,
                text: chunk,
                text_length: chunk.length,
                token_count: Math.ceil(chunk.length / 4), // Rough estimate
                avatar_id: avatarId,
                content_hash: `${file.id}_${i}`,
                created_at: new Date().toISOString(),
                // Custom fields
                file_id: file.id,
                file_name: file.name,
                file_type: file.file_type,
                chunk_index: i,
                uploaded_at: file.uploaded_at,
                source: 'knowledge_file'
            };

            // Store in vector database
            await vectorDatabaseService.upsertVectors([{
                id: vectorId,
                values: embedding,
                metadata
            }]);

            vectorCount++;
        }

        return vectorCount;
    }
}

export default KnowledgeFileProcessor;
