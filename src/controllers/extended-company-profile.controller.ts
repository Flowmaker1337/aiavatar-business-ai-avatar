import {Request, Response} from 'express';
import ExtendedDatabaseService from '../services/extended-database.service';
import {ExecutionTimerService} from '../services/execution-timer.service';
import {CompanyProfile} from '../models/auth-types';

export class ExtendedCompanyProfileController {
    private databaseService: ExtendedDatabaseService;

    constructor() {
        this.databaseService = ExtendedDatabaseService.getInstance();
    }

    /**
     * POST /api/company-profiles
     * Creates a new company profile
     */
    public async createProfile(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ExtendedCompanyProfileController.createProfile');
        timer.start();

        try {
            const profileData = req.body;

            // Validation
            if (!profileData.name || !profileData.industry) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: name, industry'
                });
                timer.stop();
                return;
            }

            // Set default user_id if not provided (for development)
            if (!profileData.user_id) {
                profileData.user_id = 'default_user';
            }

            console.log('📤 Creating company profile:', profileData.name);

            const profile = await this.databaseService.createCompanyProfile(profileData);

            timer.stop();

            res.json({
                success: true,
                data: profile,
                message: 'Company profile created successfully'
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error creating company profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create company profile',
                details: error.message
            });
        }
    }

    /**
     * GET /api/company-profiles
     * Gets all company profiles for the current user
     */
    public async getProfiles(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ExtendedCompanyProfileController.getProfiles');
        timer.start();

        try {
            // For now, use default user - later get from auth
            const userId = req.query.user_id as string || 'default_user';

            console.log('📥 Getting company profiles for user:', userId);

            const profiles = await this.databaseService.getCompanyProfilesByUserId(userId);

            // Convert to object format for compatibility with frontend
            const profilesObject: Record<string, CompanyProfile> = {};
            profiles.forEach((profile: CompanyProfile) => {
                profilesObject[profile.id] = profile;
            });

            timer.stop();

            res.json({
                success: true,
                data: profilesObject,
                count: profiles.length
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting company profiles:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company profiles',
                details: error.message
            });
        }
    }

    /**
     * GET /api/company-profiles/:profileId
     * Gets a specific company profile
     */
    public async getProfile(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ExtendedCompanyProfileController.getProfile');
        timer.start();

        try {
            const {profileId} = req.params;

            console.log('📥 Getting company profile:', profileId);

            const profile = await this.databaseService.getCompanyProfileById(profileId);

            if (!profile) {
                res.status(404).json({
                    success: false,
                    error: 'Company profile not found'
                });
                timer.stop();
                return;
            }

            timer.stop();

            res.json({
                success: true,
                data: profile
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting company profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company profile',
                details: error.message
            });
        }
    }

    /**
     * PUT /api/company-profiles/:profileId
     * Updates a company profile
     */
    public async updateProfile(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ExtendedCompanyProfileController.updateProfile');
        timer.start();

        try {
            const {profileId} = req.params;
            const updateData = req.body;

            console.log('✏️ Updating company profile:', profileId);

            const updatedProfile = await this.databaseService.updateCompanyProfile(profileId, updateData);

            if (!updatedProfile) {
                res.status(404).json({
                    success: false,
                    error: 'Company profile not found'
                });
                timer.stop();
                return;
            }

            timer.stop();

            res.json({
                success: true,
                data: updatedProfile,
                message: 'Company profile updated successfully'
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error updating company profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update company profile',
                details: error.message
            });
        }
    }

    /**
     * DELETE /api/company-profiles/:profileId
     * Deletes a company profile
     */
    public async deleteProfile(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ExtendedCompanyProfileController.deleteProfile');
        timer.start();

        try {
            const {profileId} = req.params;

            console.log('🗑️ Deleting company profile:', profileId);

            const deleted = await this.databaseService.deleteCompanyProfile(profileId);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    error: 'Company profile not found'
                });
                timer.stop();
                return;
            }

            timer.stop();

            res.json({
                success: true,
                message: 'Company profile deleted successfully'
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error deleting company profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete company profile',
                details: error.message
            });
        }
    }

    /**
     * GET /api/company-profiles/templates
     * Gets company profile templates
     */
    public async getTemplates(req: Request, res: Response): Promise<void> {
        const timer = new ExecutionTimerService('ExtendedCompanyProfileController.getTemplates');
        timer.start();

        try {
            console.log('📋 Getting company profile templates');

            const templates = await this.databaseService.getCompanyProfileTemplates();

            timer.stop();

            res.json({
                success: true,
                data: templates,
                count: templates.length
            });

        } catch (error: any) {
            timer.stop();
            console.error('❌ Error getting company profile templates:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get company profile templates',
                details: error.message
            });
        }
    }
}

export default ExtendedCompanyProfileController;
