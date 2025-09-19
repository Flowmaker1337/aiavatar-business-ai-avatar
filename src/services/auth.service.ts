import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import ExtendedDatabaseService from './extended-database.service';
import {UserAccount, UserSession, UserRole} from '../models/auth-types';

export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    sessionId: string;
    iat?: number;
    exp?: number;
}

// AuthenticatedRequest is now defined in middleware/auth.middleware.ts

class AuthService {
    private static instance: AuthService;
    private jwtSecret: string;
    private jwtExpiresIn: string;
    private refreshTokenExpiresIn: string;
    private db: ExtendedDatabaseService;

    private constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
        this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
        this.db = ExtendedDatabaseService.getInstance();
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    // ============ TOKEN MANAGEMENT ============

    public generateTokens(user: UserAccount, sessionId: string): { accessToken: string; refreshToken: string } {
        const payload: JWTPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            sessionId
        };

        const accessToken = jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(
            {userId: user.id, sessionId, type: 'refresh'},
            this.jwtSecret,
            {expiresIn: this.refreshTokenExpiresIn} as jwt.SignOptions
        );

        return {accessToken, refreshToken};
    }

    public verifyToken(token: string): JWTPayload | null {
        try {
            const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
            return payload;
        } catch (error) {
            console.log('JWT verification failed:', error);
            return null;
        }
    }

    public verifyRefreshToken(token: string): { userId: string; sessionId: string } | null {
        try {
            const payload = jwt.verify(token, this.jwtSecret) as any;
            if (payload.type !== 'refresh') {
                return null;
            }
            return {userId: payload.userId, sessionId: payload.sessionId};
        } catch (error) {
            console.log('Refresh token verification failed:', error);
            return null;
        }
    }

    // ============ AUTHENTICATION ============

    public async login(email: string, password: string, ipAddress: string, userAgent: string): Promise<{
        user: UserAccount;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    } | null> {
        try {
            // Validate user credentials
            const user = await this.db.validateUserPassword(email, password);
            if (!user) {
                return null;
            }

            // Check if user is active
            if (user.status !== 'active') {
                throw new Error('User account is not active');
            }

            // Calculate expiration time
            const expiresAt = new Date();
            const expiresInMs = this.parseExpirationTime(this.jwtExpiresIn);
            expiresAt.setTime(expiresAt.getTime() + expiresInMs);

            // Generate tokens
            const sessionId = 'temp-session-id'; // Will be replaced after session creation
            const {accessToken, refreshToken} = this.generateTokens(user, sessionId);

            // Create session in database
            const session = await this.db.createSession(
                user.id,
                accessToken,
                refreshToken,
                expiresAt,
                ipAddress,
                userAgent
            );

            // Regenerate tokens with actual session ID
            const finalTokens = this.generateTokens(user, session.id);

            // Update session with final token
            await this.db.getDatabase().collection('user_sessions').updateOne(
                {id: session.id},
                {$set: {token: finalTokens.accessToken, refresh_token: finalTokens.refreshToken}}
            );

            // Update last login
            await this.db.getDatabase().collection('user_accounts').updateOne(
                {id: user.id},
                {$set: {last_login: new Date()}}
            );

            // Log successful login
            await this.db.logAction(
                user.id,
                'login',
                'users',
                user.id,
                {email: user.email},
                ipAddress,
                userAgent,
                true
            );

            return {
                user,
                accessToken: finalTokens.accessToken,
                refreshToken: finalTokens.refreshToken,
                expiresAt
            };

        } catch (error) {
            console.error('Login error:', error);

            // Log failed login attempt if we have the email
            if (email) {
                await this.db.logAction(
                    'anonymous',
                    'login_failed',
                    'users',
                    email,
                    {error: error instanceof Error ? error.message : 'Unknown error'},
                    ipAddress,
                    userAgent,
                    false,
                    error instanceof Error ? error.message : 'Unknown error'
                );
            }

            return null;
        }
    }

    public async register(userData: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        role?: UserRole;
    }, ipAddress: string, userAgent: string): Promise<{
        user: UserAccount;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    }> {
        try {
            // Check if user already exists
            const existingUser = await this.db.getUserByEmail(userData.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Create new user
            const user = await this.db.createUser({
                email: userData.email,
                password: userData.password,
                first_name: userData.first_name,
                last_name: userData.last_name,
                role: userData.role || 'user'
            });

            // Log registration
            await this.db.logAction(
                user.id,
                'register',
                'users',
                user.id,
                {email: user.email},
                ipAddress,
                userAgent,
                true
            );

            // Auto-login after registration
            const loginResult = await this.login(userData.email, userData.password, ipAddress, userAgent);
            if (!loginResult) {
                throw new Error('Failed to auto-login after registration');
            }

            return loginResult;

        } catch (error) {
            console.error('Registration error:', error);

            // Log failed registration
            await this.db.logAction(
                'anonymous',
                'register_failed',
                'users',
                userData.email,
                {error: error instanceof Error ? error.message : 'Unknown error'},
                ipAddress,
                userAgent,
                false,
                error instanceof Error ? error.message : 'Unknown error'
            );

            throw error;
        }
    }

    public async logout(sessionId: string, userId: string, ipAddress: string, userAgent: string): Promise<boolean> {
        try {
            // Invalidate session
            const success = await this.db.invalidateSession(sessionId);

            // Log logout
            await this.db.logAction(
                userId,
                'logout',
                'users',
                userId,
                {sessionId},
                ipAddress,
                userAgent,
                success
            );

            return success;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    public async refreshToken(refreshToken: string, ipAddress: string, userAgent: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    } | null> {
        try {
            // Verify refresh token
            const refreshPayload = this.verifyRefreshToken(refreshToken);
            if (!refreshPayload) {
                return null;
            }

            // Get session
            const session = await this.db.getDatabase().collection('user_sessions').findOne({
                id: refreshPayload.sessionId,
                is_active: true
            });

            if (!session || session.refresh_token !== refreshToken) {
                return null;
            }

            // Get user
            const user = await this.db.getUserById(refreshPayload.userId);
            if (!user || user.status !== 'active') {
                return null;
            }

            // Generate new tokens
            const newTokens = this.generateTokens(user, session.id);

            // Calculate new expiration
            const expiresAt = new Date();
            const expiresInMs = this.parseExpirationTime(this.jwtExpiresIn);
            expiresAt.setTime(expiresAt.getTime() + expiresInMs);

            // Update session
            await this.db.getDatabase().collection('user_sessions').updateOne(
                {id: session.id},
                {
                    $set: {
                        token: newTokens.accessToken,
                        refresh_token: newTokens.refreshToken,
                        expires_at: expiresAt,
                        last_activity: new Date()
                    }
                }
            );

            return {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                expiresAt
            };

        } catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    }

    // ============ MIDDLEWARE ============
    // Note: These middleware methods are deprecated - use middleware/auth.middleware.ts instead

    /*
    public authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Authentication token required' });
          return;
        }

        const token = authHeader.substring(7);
        const payload = this.verifyToken(token);

        if (!payload) {
          res.status(401).json({ error: 'Invalid or expired token' });
          return;
        }

        // Get session
        const session = await this.db.getSessionByToken(token);
        if (!session || !session.is_active) {
          res.status(401).json({ error: 'Session not found or inactive' });
          return;
        }

        // Get user
        const user = await this.db.getUserById(payload.userId);
        if (!user || user.status !== 'active') {
          res.status(401).json({ error: 'User not found or inactive' });
          return;
        }

        // Update last activity
        await this.db.getDatabase().collection('user_sessions').updateOne(
          { id: session.id },
          { $set: { last_activity: new Date() } }
        );

        // Attach user and session to request
        req.user = user;
        req.session = session;

        next();
      } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };

    public authorize = (roles: UserRole[]) => {
      return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        if (!roles.includes(req.user.role)) {
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }

        next();
      };
    };

    public optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          next();
          return;
        }

        const token = authHeader.substring(7);
        const payload = this.verifyToken(token);

        if (payload) {
          const session = await this.db.getSessionByToken(token);
          if (session && session.is_active) {
            const user = await this.db.getUserById(payload.userId);
            if (user && user.status === 'active') {
              req.user = user;
              req.session = session;
            }
          }
        }

        next();
      } catch (error) {
        console.error('Optional auth middleware error:', error);
        next();
      }
    };

    // ============ UTILITY METHODS ============

    private parseExpirationTime(expiresIn: string): number {
      const unit = expiresIn.slice(-1);
      const value = parseInt(expiresIn.slice(0, -1));

      switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000; // Default 1 hour
      }
    }

    public async getUserPermissions(userId: string): Promise<string[]> {
      // This would be implemented based on your permission system
      // For now, return basic permissions based on role
      const user = await this.db.getUserById(userId);
      if (!user) return [];

      if (user.role === 'admin') {
        return [
          'create_avatar', 'read_own_avatars', 'update_own_avatars', 'delete_own_avatars',
          'manage_all_users', 'view_system_analytics', 'create_demo_avatars',
          'read_all_avatars', 'update_all_avatars', 'delete_all_avatars'
        ];
      } else {
        return [
          'create_avatar', 'read_own_avatars', 'update_own_avatars', 'delete_own_avatars'
        ];
      }
    }

    public hasPermission(userPermissions: string[], requiredPermission: string): boolean {
      return userPermissions.includes(requiredPermission);
    }
    */

    // ============ UTILITY METHODS ============

    private parseExpirationTime(expiresIn: string): number {
        const unit = expiresIn.slice(-1);
        const value = parseInt(expiresIn.slice(0, -1));

        switch (unit) {
            case 's':
                return value * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            default:
                return 60 * 60 * 1000; // Default 1 hour
        }
    }
}

export default AuthService;
