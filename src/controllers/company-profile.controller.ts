import { Request, Response } from 'express';
import DatabaseService from '../services/database.service';
import { ExecutionTimerService } from '../services/execution-timer.service';

interface CompanyProfile {
    company_id: 'aureus' | 'techflow' | 'consultpro' | 'custom';
    company_context: string;
    your_role_description: string;
    current_situation: string;
    goals_objectives: string;
    key_challenges: string;
    updated_at: number;
    created_at: number;
}

export class CompanyProfileController {
    private databaseService: any;

    constructor() {
        this.databaseService = DatabaseService.getInstance();
    }

    /**
     * POST /api/company-profiles/:companyId
     * Saves company profile for simulation
     */
    public async saveProfile(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('CompanyProfileController.saveProfile');
        timer.start();

        try {
            const { companyId } = req.params;
            const { 
                company_context, 
                your_role_description, 
                current_situation, 
                goals_objectives, 
                key_challenges 
            } = req.body;

            if (!companyId || !company_context) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required parameters: companyId, company_context'
                });
                timer.stop();
                return;
            }

            // Validate companyId
            if (!['aureus', 'techflow', 'consultpro', 'custom'].includes(companyId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid companyId. Must be aureus, techflow, consultpro, or custom'
                });
                timer.stop();
                return;
            }

            const profileData: CompanyProfile = {
                company_id: companyId as any,
                company_context,
                your_role_description: your_role_description || '',
                current_situation: current_situation || '',
                goals_objectives: goals_objectives || '',
                key_challenges: key_challenges || '',
                updated_at: Date.now(),
                created_at: Date.now()
            };

            // Upsert to database  
            const collectionName = 'company_profiles';
            
            // Try to find existing
            const existing = await this.databaseService.findAll(collectionName);
            const existingProfile = existing.find((p: any) => p.company_id === companyId);
            
            if (existingProfile) {
                // Update existing
                await this.databaseService.update(collectionName, existingProfile.id || existingProfile._id, profileData);
            } else {
                // Create new
                await this.databaseService.create(collectionName, profileData);
            }

            timer.stop();
            console.log(`✅ Saved company profile: ${companyId}`);

            res.json({
                success: true,
                message: 'Company profile saved successfully',
                data: profileData
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error saving company profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save company profile'
            });
        }
    }

    /**
     * GET /api/company-profiles/:companyId
     * Gets company profile for specific company
     */
    public async getProfile(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('CompanyProfileController.getProfile');
        timer.start();

        try {
            const { companyId } = req.params;
            
            if (!companyId) {
                res.status(400).json({
                    success: false,
                    error: 'Company ID parameter is required'
                });
                timer.stop();
                return;
            }

            const collectionName = 'company_profiles';
            const allProfiles = await this.databaseService.findAll(collectionName);
            const profile = allProfiles.find((p: any) => p.company_id === companyId);

            timer.stop();

            res.json({
                success: true,
                data: profile || null
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting company profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company profile'
            });
        }
    }

    /**
     * GET /api/company-profiles
     * Gets all company profiles
     */
    public async getAllProfiles(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('CompanyProfileController.getAllProfiles');
        timer.start();

        try {
            const collectionName = 'company_profiles';
            const profiles = await this.databaseService.findAll(collectionName);

            // Convert array to object keyed by company_id
            const profilesObject: Record<string, any> = {};
            profiles.forEach((profile: any) => {
                profilesObject[profile.company_id] = profile;
            });

            timer.stop();

            res.json({
                success: true,
                data: profilesObject
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting all company profiles:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company profiles'
            });
        }
    }
}

export default CompanyProfileController;
