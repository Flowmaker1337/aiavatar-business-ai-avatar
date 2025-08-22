import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import AuthService from '../services/auth.service';

class AuthRoutes {
  private router: Router;
  private authController: AuthController;
  private authService: AuthService;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.authService = AuthService.getInstance();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // ============ PUBLIC ROUTES (No authentication required) ============
    
    // User registration
    this.router.post('/register', this.authController.register);
    
    // User login
    this.router.post('/login', this.authController.login);
    
    // Refresh access token
    this.router.post('/refresh', this.authController.refreshToken);

    // ============ PROTECTED ROUTES (Authentication required) ============
    
    // User logout
    this.router.post('/logout', this.authService.authenticate, this.authController.logout);
    
    // Get current user profile
    this.router.get('/profile', this.authService.authenticate, this.authController.getProfile);
    
    // Update user profile
    this.router.put('/profile', this.authService.authenticate, this.authController.updateProfile);
    
    // Change password
    this.router.put('/password', this.authService.authenticate, this.authController.changePassword);
    
    // Validate token (useful for frontend to check if token is still valid)
    this.router.get('/validate', this.authService.authenticate, this.authController.validateToken);

    // ============ ADMIN ROUTES (Admin role required) ============
    
    // Get all users (admin only)
    this.router.get('/users', 
      this.authService.authenticate, 
      this.authService.authorize(['admin']), 
      this.authController.getAllUsers
    );
    
    // Update user status (admin only)
    this.router.put('/users/:userId/status', 
      this.authService.authenticate, 
      this.authService.authorize(['admin']), 
      this.authController.updateUserStatus
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}

export default AuthRoutes;
