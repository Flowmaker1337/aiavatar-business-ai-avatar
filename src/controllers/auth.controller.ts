import { Request, Response } from 'express';
import AuthService, { AuthenticatedRequest } from '../services/auth.service';
import ExtendedDatabaseService from '../services/extended-database.service';
import { UserRole } from '../models/auth-types';

class AuthController {
  private authService: AuthService;
  private db: ExtendedDatabaseService;

  constructor() {
    this.authService = AuthService.getInstance();
    this.db = ExtendedDatabaseService.getInstance();
  }

  // ============ AUTHENTICATION ENDPOINTS ============

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, first_name, last_name, role } = req.body;

      // Validation
      if (!email || !password || !first_name || !last_name) {
        res.status(400).json({
          success: false,
          error: 'Email, password, first_name, and last_name are required'
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      // Role validation (only admin can create admin users)
      let userRole: UserRole = 'user';
      if (role === 'admin') {
        // For now, allow admin creation - in production, this should be restricted
        userRole = 'admin';
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await this.authService.register({
        email,
        password,
        first_name,
        last_name,
        role: userRole
      }, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            role: result.user.role,
            created_at: result.user.created_at
          },
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_at: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await this.authService.login(email, password, ipAddress, userAgent);

      if (!result) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            role: result.user.role,
            last_login: result.user.last_login,
            preferences: result.user.preferences
          },
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_at: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  };

  public logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.session) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const success = await this.authService.logout(
        req.session.id,
        req.user.id,
        ipAddress,
        userAgent
      );

      if (success) {
        res.json({
          success: true,
          message: 'Logged out successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Logout failed'
        });
      }

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }
  };

  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
        return;
      }

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const result = await this.authService.refreshToken(refresh_token, ipAddress, userAgent);

      if (!result) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_at: result.expiresAt
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Token refresh failed'
      });
    }
  };

  // ============ USER PROFILE ENDPOINTS ============

  public getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      // Get user permissions
      const permissions = await this.authService.getUserPermissions(req.user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            email: req.user.email,
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            role: req.user.role,
            status: req.user.status,
            created_at: req.user.created_at,
            last_login: req.user.last_login,
            profile: req.user.profile,
            preferences: req.user.preferences,
            subscription: req.user.subscription
          },
          permissions
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile'
      });
    }
  };

  public updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { first_name, last_name, profile, preferences } = req.body;
      const updates: any = { updated_at: new Date() };

      if (first_name) updates.first_name = first_name;
      if (last_name) updates.last_name = last_name;
      if (profile) updates.profile = { ...req.user.profile, ...profile };
      if (preferences) updates.preferences = { ...req.user.preferences, ...preferences };

      await this.db.getDatabase().collection('user_accounts').updateOne(
        { id: req.user.id },
        { $set: updates }
      );

      // Log profile update
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      await this.db.logAction(
        req.user.id,
        'update_profile',
        'users',
        req.user.id,
        { updated_fields: Object.keys(updates) },
        ipAddress,
        userAgent,
        true
      );

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  };

  public changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
        return;
      }

      if (new_password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long'
        });
        return;
      }

      // Verify current password
      const validUser = await this.db.validateUserPassword(req.user.email, current_password);
      if (!validUser) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
        return;
      }

      // Hash new password
      const bcrypt = require('bcrypt');
      const newPasswordHash = await bcrypt.hash(new_password, 10);

      // Update password
      await this.db.getDatabase().collection('user_accounts').updateOne(
        { id: req.user.id },
        { $set: { password_hash: newPasswordHash, updated_at: new Date() } }
      );

      // Log password change
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      await this.db.logAction(
        req.user.id,
        'change_password',
        'users',
        req.user.id,
        {},
        ipAddress,
        userAgent,
        true
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  };

  // ============ ADMIN ENDPOINTS ============

  public getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const users = await this.db.getDatabase().collection('user_accounts')
        .find({}, { 
          projection: { 
            password_hash: 0  // Exclude password hash from response
          } 
        })
        .toArray();

      res.json({
        success: true,
        data: users
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users'
      });
    }
  };

  public updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const { userId } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive', 'suspended'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be active, inactive, or suspended'
        });
        return;
      }

      const result = await this.db.getDatabase().collection('user_accounts').updateOne(
        { id: userId },
        { $set: { status, updated_at: new Date() } }
      );

      if (result.matchedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Log status change
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      
      await this.db.logAction(
        req.user.id,
        'update_user_status',
        'users',
        userId,
        { new_status: status },
        ipAddress,
        userAgent,
        true
      );

      res.json({
        success: true,
        message: 'User status updated successfully'
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }
  };

  // ============ UTILITY ENDPOINTS ============

  public validateToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // This endpoint is protected by the authenticate middleware
    // If we reach here, the token is valid
    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role
        }
      }
    });
  };
}

export default AuthController;
