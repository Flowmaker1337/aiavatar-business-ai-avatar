import {Request, Response} from 'express';
import PersonaGeneratorService from '../services/persona-generator.service';
import PersonaLibraryService from '../services/persona-library.service';
import {ExecutionTimerService} from '../services/execution-timer.service';

/**
 * PersonaController - API endpoints dla zarządzania personami
 * Kreator postaci, biblioteka, wyszukiwanie i zarządzanie
 */
export class PersonaController {
    private personaGenerator: PersonaGeneratorService;
    private personaLibrary: PersonaLibraryService;

    constructor() {
        this.personaGenerator = PersonaGeneratorService.getInstance();
        this.personaLibrary = PersonaLibraryService.getInstance();
    }

    /**
     * POST /api/persona/generate
     * Generuje nową personę na podstawie opisu
     */
    public async generatePersona(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('PersonaController.generatePersona');
        timer.start();

        try {
            const {
                description,
                role,
                industry,
                companySize,
                saveToLibrary = true,
                tags = []
            } = req.body;

            // Walidacja danych wejściowych
            if (!description || !role) {
                res.status(400).json({
                    success: false,
                    error: 'Description and role are required'
                });
                timer.stop();
                return;
            }

            // Walidacja roli
            const validRoles = ['teacher', 'learner', 'seller', 'buyer', 'interviewer', 'interviewee'];
            if (!validRoles.includes(role)) {
                res.status(400).json({
                    success: false,
                    error: `Role must be one of: ${validRoles.join(', ')}`
                });
                timer.stop();
                return;
            }

            // Wygeneruj personę
            const persona = await this.personaGenerator.generatePersona(
                description,
                role,
                industry,
                companySize
            );

            let personaId: string | null = null;

            // Zapisz do biblioteki jeśli żądane
            if (saveToLibrary) {
                const personaTags = [role, ...tags];
                if (industry) personaTags.push(industry);

                personaId = await this.personaLibrary.addPersona(persona, personaTags);
            }

            timer.stop();
            res.status(201).json({
                success: true,
                data: {
                    persona,
                    persona_id: personaId,
                    saved_to_library: saveToLibrary
                },
                execution_time: timer.getElapsedTime()
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating persona:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating persona'
            });
        }
    }

    /**
     * GET /api/persona/library
     * Pobiera wszystkie persony z biblioteki
     */
    public async getPersonaLibrary(req: Request, res: Response): Promise<void> {
        try {
            const {search, tags, role, industry, favorites_only} = req.query;

            let personas;

            if (search) {
                // Wyszukiwanie
                const searchTags = tags ? (tags as string).split(',') : [];
                personas = this.personaLibrary.searchPersonas(
                    search as string,
                    searchTags
                );
            } else if (role) {
                // Filtruj po roli
                personas = this.personaLibrary.getPersonasByRole(role as string);
            } else if (industry) {
                // Filtruj po branży
                personas = this.personaLibrary.getPersonasByIndustry(industry as string);
            } else if (favorites_only === 'true') {
                // Tylko ulubione
                personas = this.personaLibrary.getFavoritePersonas();
            } else {
                // Wszystkie
                personas = this.personaLibrary.getAllPersonas();
            }

            res.json({
                success: true,
                data: {
                    personas,
                    total_count: personas.length
                }
            });

        } catch (error) {
            console.error('❌ Error getting persona library:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching persona library'
            });
        }
    }

    /**
     * GET /api/persona/library/stats
     * Pobiera statystyki biblioteki
     */
    public async getLibraryStats(req: Request, res: Response): Promise<void> {
        try {
            const stats = this.personaLibrary.getLibraryStats();

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('❌ Error getting library stats:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching library stats'
            });
        }
    }

    /**
     * GET /api/persona/library/popular
     * Pobiera popularne persony
     */
    public async getPopularPersonas(req: Request, res: Response): Promise<void> {
        try {
            const {limit = 10} = req.query;
            const personas = this.personaLibrary.getPopularPersonas(parseInt(limit as string));

            res.json({
                success: true,
                data: {
                    personas,
                    total_count: personas.length
                }
            });

        } catch (error) {
            console.error('❌ Error getting popular personas:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching popular personas'
            });
        }
    }

    /**
     * GET /api/persona/:id
     * Pobiera personę po ID
     */
    public async getPersona(req: Request, res: Response): Promise<void> {
        try {
            const personaId = req.params.id;
            const persona = this.personaLibrary.getPersona(personaId);

            if (!persona) {
                res.status(404).json({
                    success: false,
                    error: 'Persona not found'
                });
                return;
            }

            res.json({
                success: true,
                data: persona
            });

        } catch (error) {
            console.error('❌ Error getting persona:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while fetching persona'
            });
        }
    }

    /**
     * PUT /api/persona/:id
     * Aktualizuje personę
     */
    public async updatePersona(req: Request, res: Response): Promise<void> {
        try {
            const personaId = req.params.id;
            const updates = req.body;

            const success = await this.personaLibrary.updatePersona(personaId, updates);

            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Persona not found'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Persona updated successfully'
            });

        } catch (error) {
            console.error('❌ Error updating persona:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while updating persona'
            });
        }
    }

    /**
     * DELETE /api/persona/:id
     * Usuwa personę z biblioteki
     */
    public async deletePersona(req: Request, res: Response): Promise<void> {
        try {
            const personaId = req.params.id;
            const success = await this.personaLibrary.deletePersona(personaId);

            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Persona not found'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Persona deleted successfully'
            });

        } catch (error) {
            console.error('❌ Error deleting persona:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while deleting persona'
            });
        }
    }

    /**
     * POST /api/persona/:id/favorite
     * Oznacza/odznacza personę jako ulubioną
     */
    public async toggleFavorite(req: Request, res: Response): Promise<void> {
        try {
            const personaId = req.params.id;
            const success = await this.personaLibrary.toggleFavorite(personaId);

            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Persona not found'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Favorite status toggled successfully'
            });

        } catch (error) {
            console.error('❌ Error toggling favorite:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while toggling favorite'
            });
        }
    }

    /**
     * POST /api/persona/:id/rate
     * Ocenia personę (1-5 gwiazdek)
     */
    public async ratePersona(req: Request, res: Response): Promise<void> {
        try {
            const personaId = req.params.id;
            const {rating} = req.body;

            if (!rating || rating < 1 || rating > 5) {
                res.status(400).json({
                    success: false,
                    error: 'Rating must be between 1 and 5'
                });
                return;
            }

            const success = await this.personaLibrary.ratePersona(personaId, rating);

            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Persona not found'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Persona rated successfully'
            });

        } catch (error) {
            console.error('❌ Error rating persona:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while rating persona'
            });
        }
    }

    /**
     * POST /api/persona/:id/tags
     * Dodaje tagi do persony
     */
    public async addTags(req: Request, res: Response): Promise<void> {
        try {
            const personaId = req.params.id;
            const {tags} = req.body;

            if (!Array.isArray(tags)) {
                res.status(400).json({
                    success: false,
                    error: 'Tags must be an array'
                });
                return;
            }

            const success = await this.personaLibrary.addTagsToPersona(personaId, tags);

            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Persona not found'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Tags added successfully'
            });

        } catch (error) {
            console.error('❌ Error adding tags:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while adding tags'
            });
        }
    }

    /**
     * POST /api/persona/:id/participant
     * Konwertuje personę na uczestnika symulacji
     */
    public async createParticipant(req: Request, res: Response): Promise<void> {
        try {
            const personaId = req.params.id;
            const {role, avatarType = 'networker'} = req.body;

            if (!role) {
                res.status(400).json({
                    success: false,
                    error: 'Role is required'
                });
                return;
            }

            const participant = this.personaLibrary.createParticipantFromPersona(
                personaId,
                role,
                avatarType
            );

            if (!participant) {
                res.status(404).json({
                    success: false,
                    error: 'Persona not found'
                });
                return;
            }

            res.json({
                success: true,
                data: participant
            });

        } catch (error) {
            console.error('❌ Error creating participant:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while creating participant'
            });
        }
    }

    /**
     * POST /api/persona/library/export
     * Eksportuje bibliotekę do JSON
     */
    public async exportLibrary(req: Request, res: Response): Promise<void> {
        try {
            const exportData = this.personaLibrary.exportLibrary();
            const filename = `persona-library-${new Date().toISOString().split('T')[0]}.json`;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(exportData);

        } catch (error) {
            console.error('❌ Error exporting library:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while exporting library'
            });
        }
    }

    /**
     * POST /api/persona/library/import
     * Importuje persony z JSON-a
     */
    public async importLibrary(req: Request, res: Response): Promise<void> {
        try {
            const {jsonData} = req.body;

            if (!jsonData) {
                res.status(400).json({
                    success: false,
                    error: 'JSON data is required'
                });
                return;
            }

            const importedCount = await this.personaLibrary.importPersonas(jsonData);

            res.json({
                success: true,
                data: {
                    imported_count: importedCount
                },
                message: `Successfully imported ${importedCount} personas`
            });

        } catch (error) {
            console.error('❌ Error importing library:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while importing library'
            });
        }
    }

    /**
     * POST /api/persona/examples
     * Generuje przykładowe persony dla demonstracji
     */
    public async generateExamples(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('PersonaController.generateExamples');
        timer.start();

        try {
            const personas = await this.personaGenerator.generateExamplePersonas();

            // Zapisz do biblioteki
            const savedIds: string[] = [];
            for (const persona of personas) {
                const personaId = await this.personaLibrary.addPersona(
                    persona,
                    ['example', 'demo']
                );
                savedIds.push(personaId);
            }

            timer.stop();
            res.json({
                success: true,
                data: {
                    personas,
                    saved_ids: savedIds,
                    count: personas.length
                },
                execution_time: timer.getElapsedTime(),
                message: `Generated ${personas.length} example personas`
            });

        } catch (error) {
            timer.stop();
            console.error('❌ Error generating examples:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while generating examples'
            });
        }
    }
}

export default PersonaController;
