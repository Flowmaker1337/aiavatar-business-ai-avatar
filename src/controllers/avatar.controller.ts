import {Request, Response} from 'express';
import DatabaseService from '../services/database.service';

class AvatarController {

    public async createAvatar(req: Request, res: Response): Promise<void> {
        try {
            const {firstName, lastName} = req.body;

            if (!firstName || !lastName) {
                res.status(400).json({error: 'Missing required parameters: firstName, lastName'});
                return;
            }

            const db = DatabaseService.getInstance();
            const newAvatar = await db.createAvatar({
                firstName,
                lastName
            });

            res.status(201).json({
                success: true,
                avatar: newAvatar
            });
        } catch (error) {
            console.error('Error during avatar creation:', error);
            res.status(500).json({error: 'An error occurred during avatar creation'});
        }
    }

    public async getAvatar(req: Request, res: Response): Promise<void> {
        try {
            const {avatarId} = req.params;

            if (!avatarId) {
                res.status(400).json({error: 'Avatar ID parameter is required'});
                return;
            }

            const db = DatabaseService.getInstance();
            const avatar = await db.getAvatarById(avatarId);

            if (!avatar) {
                res.status(404).json({error: 'Avatar with given ID not found'});
                return;
            }

            res.status(200).json({
                success: true,
                avatar
            });
        } catch (error) {
            console.error('Error during avatar retrieval:', error);
            res.status(500).json({error: 'An error occurred during avatar retrieval'});
        }
    }
}

export default new AvatarController(); 