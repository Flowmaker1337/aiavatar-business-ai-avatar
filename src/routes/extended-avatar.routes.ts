// ============ EXTENDED AVATAR ROUTES ============

import {Router} from 'express';
import {ExtendedAvatarController} from '../controllers/extended-avatar.controller';
import {authenticateToken} from '../middleware/auth.middleware';

export class ExtendedAvatarRoutes {
    private router: Router;
    private controller: ExtendedAvatarController;

    constructor() {
        this.router = Router();
        this.controller = new ExtendedAvatarController();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Public routes (no auth required)
        this.router.get('/demo', this.controller.getDemoAvatars);

        // Protected routes (authentication required)
        this.router.use(authenticateToken);

        // User avatar management
        this.router.get('/', this.controller.getUserAvatars);
        this.router.post('/', this.controller.createAvatar);
        this.router.get('/stats', this.controller.getAvatarStats);

        // Individual avatar operations
        this.router.get('/:id', this.controller.getAvatarById);
        this.router.put('/:id', this.controller.updateAvatar);
        this.router.delete('/:id', this.controller.deleteAvatar);

        // Special operations
        this.router.post('/copy', this.controller.copyDemoAvatar);
    }

    public getRouter(): Router {
        return this.router;
    }
}

export default ExtendedAvatarRoutes;
