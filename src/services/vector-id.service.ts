import {v4 as uuidv4, v5 as uuidv5} from 'uuid';

/**
 * Service for managing vector database IDs
 * Generates standard UUID format for all vector databases (Pinecone, Qdrant, etc.)
 * Provides both unique and content-based ID generation with deduplication support
 */
class VectorIdService {
    // UUID namespace for generating consistent UUIDs from content
    private static readonly CONTENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    private static readonly AVATAR_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

    /**
     * Generate unique UUID for vector database
     * Creates completely unique UUID for each call (UUID v4)
     * @returns Standard UUID string
     */
    public generateUniqueId(): string {
        return uuidv4();
    }

    /**
     * Generate deterministic UUID based only on content (for deduplication)
     * Same content will always produce the same UUID
     * @param category - Content category
     * @param topic - Content topic
     * @param text - Content text
     * @returns Deterministic UUID string
     */
    public generateContentBasedId(category: string, topic: string, text: string): string {
        // Create deterministic content string
        const contentString = `${category}|${topic}|${text}`;

        // Generate UUID v5 from content (deterministic)
        return uuidv5(contentString, VectorIdService.CONTENT_NAMESPACE);
    }

    /**
     * Generate UUID specifically for avatar-scoped content
     * @param category - Content category
     * @param topic - Content topic
     * @param text - Content text
     * @param avatarId - Avatar identifier
     * @returns Avatar-scoped deterministic UUID
     */
    public generateAvatarScopedId(category: string, topic: string, text: string, avatarId: string): string {
        // Create avatar-scoped content string
        const contentString = `${avatarId}|${category}|${topic}|${text}`;

        // Generate UUID v5 from avatar-scoped content (deterministic)
        return uuidv5(contentString, VectorIdService.AVATAR_NAMESPACE);
    }

    /**
     * Check if two pieces of content would have the same content-based UUID
     * @param content1 - First content object
     * @param content2 - Second content object
     * @returns True if content is identical
     */
    public isContentIdentical(
        content1: { category: string; topic: string; text: string },
        content2: { category: string; topic: string; text: string }
    ): boolean {
        const uuid1 = this.generateContentBasedId(content1.category, content1.topic, content1.text);
        const uuid2 = this.generateContentBasedId(content2.category, content2.topic, content2.text);
        return uuid1 === uuid2;
    }

    /**
     * Generate batch of unique UUIDs for multiple content items
     * Ensures no duplicates within the batch using content-based deduplication
     * @param contentItems - Array of content items
     * @returns Array of unique UUIDs
     */
    public generateBatchIds(contentItems: Array<{ category: string; topic: string; text: string }>): string[] {
        const ids: string[] = [];
        const contentUuids = new Set<string>();

        for (const item of contentItems) {
            const contentUuid = this.generateContentBasedId(item.category, item.topic, item.text);

            // Check for duplicates within batch
            if (contentUuids.has(contentUuid)) {
                console.warn(`Duplicate content detected in batch: ${item.topic}`);
                continue; // Skip duplicate content
            }

            contentUuids.add(contentUuid);
            // For batch processing, use unique UUID v4 to avoid conflicts with existing data
            ids.push(this.generateUniqueId());
        }

        return ids;
    }

    /**
     * Validate UUID format
     * @param id - UUID to validate
     * @returns True if ID is valid UUID format
     */
    public isValidId(id: string): boolean {
        // Standard UUID v4/v5 format validation
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidPattern.test(id);
    }

    /**
     * Check if a UUID was generated from specific content
     * @param uuid - UUID to check
     * @param category - Content category
     * @param topic - Content topic
     * @param text - Content text
     * @returns True if UUID matches content-based generation
     */
    public isContentBasedUuid(uuid: string, category: string, topic: string, text: string): boolean {
        const expectedUuid = this.generateContentBasedId(category, topic, text);
        return uuid === expectedUuid;
    }
}

export default new VectorIdService(); 