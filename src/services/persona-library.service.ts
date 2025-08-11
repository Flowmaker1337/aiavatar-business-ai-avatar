import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SimulationPersona, SimulationParticipant } from '../models/types';
import { ExecutionTimerService } from './execution-timer.service';

/**
 * PersonaLibraryService - zarządza biblioteką postaci
 * Zapisuje, ładuje i organizuje utworzone persony
 */
export class PersonaLibraryService {
    private static instance: PersonaLibraryService;
    private personaLibraryPath: string;
    private personaLibrary: Map<string, StoredPersona> = new Map();

    constructor() {
        this.personaLibraryPath = path.resolve(__dirname, '../config/persona-library.json');
        this.loadPersonaLibrary();
    }

    public static getInstance(): PersonaLibraryService {
        if (!PersonaLibraryService.instance) {
            PersonaLibraryService.instance = new PersonaLibraryService();
        }
        return PersonaLibraryService.instance;
    }

    /**
     * Dodaje nową personę do biblioteki
     */
    public async addPersona(persona: SimulationPersona, tags: string[] = []): Promise<string> {
        const timer = new ExecutionTimerService('PersonaLibrary.addPersona');
        timer.start();

        try {
            const personaId = uuidv4();
            const storedPersona: StoredPersona = {
                id: personaId,
                persona,
                tags,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                usage_count: 0,
                rating: 0,
                is_favorite: false
            };

            this.personaLibrary.set(personaId, storedPersona);
            await this.savePersonaLibrary();

            timer.stop();
            console.log(`✅ Added persona to library: ${persona.name} (ID: ${personaId})`);
            
            return personaId;
        } catch (error) {
            timer.stop();
            console.error('❌ Error adding persona to library:', error);
            throw error;
        }
    }

    /**
     * Pobiera personę z biblioteki po ID
     */
    public getPersona(personaId: string): StoredPersona | null {
        return this.personaLibrary.get(personaId) || null;
    }

    /**
     * Pobiera wszystkie persony z biblioteki
     */
    public getAllPersonas(): StoredPersona[] {
        return Array.from(this.personaLibrary.values()).sort((a, b) => {
            // Sortuj po ulubionych, następnie po popularności, na końcu po dacie
            if (a.is_favorite && !b.is_favorite) return -1;
            if (!a.is_favorite && b.is_favorite) return 1;
            if (a.usage_count !== b.usage_count) return b.usage_count - a.usage_count;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }

    /**
     * Wyszukuje persony po tagach lub nazwie
     */
    public searchPersonas(query: string, tags: string[] = []): StoredPersona[] {
        const allPersonas = this.getAllPersonas();
        const lowerQuery = query.toLowerCase();

        return allPersonas.filter(stored => {
            const persona = stored.persona;
            
            // Szukaj w nazwie
            const nameMatch = persona.name.toLowerCase().includes(lowerQuery);
            
            // Szukaj w opisie
            const backgroundMatch = persona.background.toLowerCase().includes(lowerQuery);
            
            // Szukaj w branży
            const industryMatch = persona.industry.toLowerCase().includes(lowerQuery);
            
            // Sprawdź tagi
            const tagMatch = tags.length === 0 || tags.some(tag => 
                stored.tags.some(storedTag => 
                    storedTag.toLowerCase().includes(tag.toLowerCase())
                )
            );

            return (nameMatch || backgroundMatch || industryMatch) && tagMatch;
        });
    }

    /**
     * Pobiera persony według kategorii/roli
     */
    public getPersonasByRole(role: string): StoredPersona[] {
        return this.getAllPersonas().filter(stored => 
            stored.tags.includes(role) || 
            stored.persona.background.toLowerCase().includes(role.toLowerCase())
        );
    }

    /**
     * Pobiera persony według branży
     */
    public getPersonasByIndustry(industry: string): StoredPersona[] {
        return this.getAllPersonas().filter(stored => 
            stored.persona.industry.toLowerCase().includes(industry.toLowerCase())
        );
    }

    /**
     * Pobiera popularne persony
     */
    public getPopularPersonas(limit: number = 10): StoredPersona[] {
        return this.getAllPersonas()
            .sort((a, b) => b.usage_count - a.usage_count)
            .slice(0, limit);
    }

    /**
     * Pobiera ulubione persony
     */
    public getFavoritePersonas(): StoredPersona[] {
        return this.getAllPersonas().filter(stored => stored.is_favorite);
    }

    /**
     * Aktualizuje personę w bibliotece
     */
    public async updatePersona(personaId: string, updates: Partial<SimulationPersona>): Promise<boolean> {
        const stored = this.personaLibrary.get(personaId);
        if (!stored) return false;

        stored.persona = { ...stored.persona, ...updates };
        stored.updated_at = new Date().toISOString();

        await this.savePersonaLibrary();
        console.log(`✅ Updated persona: ${stored.persona.name}`);
        
        return true;
    }

    /**
     * Dodaje tagi do persony
     */
    public async addTagsToPersona(personaId: string, newTags: string[]): Promise<boolean> {
        const stored = this.personaLibrary.get(personaId);
        if (!stored) return false;

        const uniqueTags = [...new Set([...stored.tags, ...newTags])];
        stored.tags = uniqueTags;
        stored.updated_at = new Date().toISOString();

        await this.savePersonaLibrary();
        return true;
    }

    /**
     * Zwiększa licznik użycia persony
     */
    public async incrementUsage(personaId: string): Promise<void> {
        const stored = this.personaLibrary.get(personaId);
        if (stored) {
            stored.usage_count++;
            stored.updated_at = new Date().toISOString();
            await this.savePersonaLibrary();
        }
    }

    /**
     * Ocenia personę (1-5 gwiazdek)
     */
    public async ratePersona(personaId: string, rating: number): Promise<boolean> {
        if (rating < 1 || rating > 5) return false;
        
        const stored = this.personaLibrary.get(personaId);
        if (!stored) return false;

        stored.rating = rating;
        stored.updated_at = new Date().toISOString();

        await this.savePersonaLibrary();
        return true;
    }

    /**
     * Oznacza/odznacza personę jako ulubioną
     */
    public async toggleFavorite(personaId: string): Promise<boolean> {
        const stored = this.personaLibrary.get(personaId);
        if (!stored) return false;

        stored.is_favorite = !stored.is_favorite;
        stored.updated_at = new Date().toISOString();

        await this.savePersonaLibrary();
        return true;
    }

    /**
     * Usuwa personę z biblioteki
     */
    public async deletePersona(personaId: string): Promise<boolean> {
        const deleted = this.personaLibrary.delete(personaId);
        if (deleted) {
            await this.savePersonaLibrary();
            console.log(`🗑️ Deleted persona from library: ${personaId}`);
        }
        return deleted;
    }

    /**
     * Konwertuje stored persona na SimulationParticipant
     */
    public createParticipantFromPersona(
        personaId: string,
        role: 'teacher' | 'learner' | 'seller' | 'buyer' | 'interviewer' | 'interviewee',
        avatarType: 'networker' | 'trainer' | 'client' | 'student' = 'networker'
    ): SimulationParticipant | null {
        const stored = this.getPersona(personaId);
        if (!stored) return null;

        // Automatyczne zwiększenie licznika użycia
        this.incrementUsage(personaId);

        return {
            id: `participant_${personaId}`,
            avatarType,
            role,
            avatar: this.createDefaultAvatar(stored.persona, avatarType),
            persona: stored.persona,
            responseStyle: this.determineResponseStyle(role)
        };
    }

    /**
     * Pobiera statystyki biblioteki
     */
    public getLibraryStats(): LibraryStats {
        const allPersonas = this.getAllPersonas();
        
        const industriesCount = new Map<string, number>();
        const rolesCount = new Map<string, number>();
        let totalUsage = 0;

        for (const stored of allPersonas) {
            // Policz branże
            const industry = stored.persona.industry;
            industriesCount.set(industry, (industriesCount.get(industry) || 0) + 1);

            // Policz role (z tagów)
            for (const tag of stored.tags) {
                rolesCount.set(tag, (rolesCount.get(tag) || 0) + 1);
            }

            totalUsage += stored.usage_count;
        }

        return {
            total_personas: allPersonas.length,
            favorites_count: allPersonas.filter(p => p.is_favorite).length,
            total_usage: totalUsage,
            average_rating: allPersonas.reduce((sum, p) => sum + p.rating, 0) / allPersonas.length || 0,
            industries: Object.fromEntries(industriesCount),
            roles: Object.fromEntries(rolesCount),
            most_popular: allPersonas.slice(0, 3).map(p => ({
                id: p.id,
                name: p.persona.name,
                usage_count: p.usage_count
            }))
        };
    }

    /**
     * Eksportuje bibliotekę do JSON
     */
    public exportLibrary(): string {
        const exportData = {
            export_date: new Date().toISOString(),
            version: "1.0",
            personas: Array.from(this.personaLibrary.values())
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Importuje persony z JSON-a
     */
    public async importPersonas(jsonData: string): Promise<number> {
        try {
            const importData = JSON.parse(jsonData);
            let importedCount = 0;

            if (importData.personas && Array.isArray(importData.personas)) {
                for (const stored of importData.personas) {
                    if (this.validateStoredPersona(stored)) {
                        // Generuj nowe ID żeby uniknąć konfliktów
                        stored.id = uuidv4();
                        stored.updated_at = new Date().toISOString();
                        
                        this.personaLibrary.set(stored.id, stored);
                        importedCount++;
                    }
                }

                await this.savePersonaLibrary();
            }

            console.log(`📥 Imported ${importedCount} personas to library`);
            return importedCount;
        } catch (error) {
            console.error('❌ Error importing personas:', error);
            throw error;
        }
    }

    // ============ PRIVATE METHODS ============

    /**
     * Ładuje bibliotekę z pliku
     */
    private loadPersonaLibrary(): void {
        try {
            if (fs.existsSync(this.personaLibraryPath)) {
                const rawData = fs.readFileSync(this.personaLibraryPath, 'utf8');
                const data = JSON.parse(rawData);
                
                if (data.personas) {
                    for (const stored of data.personas) {
                        if (this.validateStoredPersona(stored)) {
                            this.personaLibrary.set(stored.id, stored);
                        }
                    }
                }
                
                console.log(`📚 Loaded ${this.personaLibrary.size} personas from library`);
            } else {
                // Utwórz pusty plik biblioteki
                this.savePersonaLibrary();
                console.log('📚 Created new persona library');
            }
        } catch (error) {
            console.error('❌ Error loading persona library:', error);
            this.personaLibrary = new Map();
        }
    }

    /**
     * Zapisuje bibliotekę do pliku
     */
    private async savePersonaLibrary(): Promise<void> {
        try {
            const saveData = {
                version: "1.0",
                updated_at: new Date().toISOString(),
                personas: Array.from(this.personaLibrary.values())
            };

            const dir = path.dirname(this.personaLibraryPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.personaLibraryPath, JSON.stringify(saveData, null, 2));
        } catch (error) {
            console.error('❌ Error saving persona library:', error);
            throw error;
        }
    }

    /**
     * Waliduje stored persona object
     */
    private validateStoredPersona(stored: any): boolean {
        return stored && 
               stored.id && 
               stored.persona && 
               stored.persona.name && 
               stored.persona.background &&
               Array.isArray(stored.tags);
    }

    /**
     * Tworzy domyślny avatar dla persony
     */
    private createDefaultAvatar(persona: SimulationPersona, avatarType: string): any {
        return {
            _id: `generated_${Date.now()}`,
            firstName: persona.name.split(' ')[0] || 'Jan',
            lastName: persona.name.split(' ')[1] || 'Kowalski',
            company: {
                name: `${persona.name.split(' ')[0]} Company`,
                industry: persona.industry,
                size: persona.company_size,
                // ... inne pola będą dodane dynamicznie
            },
            personality: {
                style: persona.communication_style,
                business_motivation: persona.goals[0] || 'Rozwój biznesu',
                communication_style: persona.communication_style,
                emotional_traits: persona.personality_traits,
                // ... inne pola
            },
            position: persona.name.split(' - ')[1] || 'Specjalista',
            experience_years: this.estimateExperienceYears(persona.expertise_level),
            specializations: [persona.industry],
            active_flows: []
        };
    }

    /**
     * Określa styl odpowiedzi na podstawie roli
     */
    private determineResponseStyle(role: string): 'proactive' | 'reactive' | 'balanced' {
        switch (role) {
            case 'teacher':
            case 'seller':
            case 'interviewer':
                return 'proactive';
            case 'learner':
            case 'buyer':
            case 'interviewee':
                return 'reactive';
            default:
                return 'balanced';
        }
    }

    /**
     * Szacuje lata doświadczenia na podstawie poziomu
     */
    private estimateExperienceYears(level: string): number {
        switch (level) {
            case 'beginner': return 2;
            case 'intermediate': return 5;
            case 'advanced': return 10;
            case 'expert': return 15;
            default: return 5;
        }
    }
}

// ============ INTERFACES ============

interface StoredPersona {
    id: string;
    persona: SimulationPersona;
    tags: string[];
    created_at: string;
    updated_at: string;
    usage_count: number;
    rating: number; // 1-5 gwiazdek
    is_favorite: boolean;
}

interface LibraryStats {
    total_personas: number;
    favorites_count: number;
    total_usage: number;
    average_rating: number;
    industries: Record<string, number>;
    roles: Record<string, number>;
    most_popular: Array<{
        id: string;
        name: string;
        usage_count: number;
    }>;
}

export default PersonaLibraryService;
export { StoredPersona, LibraryStats };
