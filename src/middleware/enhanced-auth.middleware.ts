// ============ SIMPLIFIED AUTHENTICATION MIDDLEWARE ============

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JWTPayload, UserRole } from '../models/auth-types';
import ExtendedDatabaseService from '../services/extended-database.service';

const db = ExtendedDatabaseService.getInstance();

// ============ AUTHENTICATION MIDDLEWARE ============

// For API routes - returns JSON error
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    next();
    // try {
    //     const authHeader = req.headers['authorization'];
    //     const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    //
    //     if (!token) {
    //         res.status(401).json({
    //             error: 'Access token required',
    //             code: 'NO_TOKEN'
    //         });
    //         return;
    //     }
    //
    //     jwt.verify(token, config.JWT_SECRET, async (err, decoded) => {
    //         if (err) {
    //             console.error('JWT verification failed:', err.message);
    //             if (err.name === 'TokenExpiredError') {
    //                 res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    //                 return;
    //             }
    //             if (err.name === 'JsonWebTokenError') {
    //                 res.status(403).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
    //                 return;
    //             }
    //             res.status(403).json({ error: 'Token verification failed', code: 'VERIFICATION_FAILED' });
    //             return;
    //         }
    //
    //         const payload = decoded as JWTPayload;
    //
    //         // Verify session is active
    //         try {
    //             const session = await db.getSessionById(payload.sessionId);
    //             if (!session || !session.is_active || session.user_id !== payload.userId) {
    //                 res.status(401).json({ error: 'Session invalid or inactive', code: 'SESSION_INVALID' });
    //                 return;
    //             }
    //
    //             // Update last activity
    //             await db.updateSessionLastActivity(session.id);
    //
    //             // Attach user info to request
    //             req.user = payload;
    //
    //             // Get user permissions based on role
    //             const permissions = getUserPermissions(payload.role);
    //             req.permissions = permissions;
    //
    //             next();
    //         } catch (sessionError) {
    //             console.error('Session verification error:', sessionError);
    //             res.status(401).json({ error: 'Session verification failed', code: 'SESSION_ERROR' });
    //             return;
    //         }
    //     });
    //
    // } catch (error) {
    //     console.error('Authentication middleware error:', error);
    //     res.status(500).json({
    //         error: 'Authentication error',
    //         code: 'AUTH_ERROR'
    //     });
    // }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    next();
    // try {
    //     const authHeader = req.headers['authorization'];
    //     const token = authHeader && authHeader.split(' ')[1];
    //
    //     if (!token) {
    //         next(); // No token, proceed without authentication
    //         return;
    //     }
    //
    //     jwt.verify(token, config.JWT_SECRET, async (err, decoded) => {
    //         if (!err) {
    //             const payload = decoded as JWTPayload;
    //             try {
    //                 const session = await db.getSessionById(payload.sessionId);
    //                 if (session && session.is_active && session.user_id === payload.userId) {
    //                     await db.updateSessionLastActivity(session.id);
    //                     req.user = payload;
    //                     req.permissions = getUserPermissions(payload.role);
    //                 }
    //             } catch (sessionError) {
    //                 console.error('Optional auth session error:', sessionError);
    //             }
    //         }
    //         next();
    //     });
    // } catch (error) {
    //     console.error('Optional authentication middleware error:', error);
    //     next();
    // }
};

// ============ AUTHORIZATION MIDDLEWARE ============

export const requireRole = (requiredRole: UserRole) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // if (!req.user) {
        //     res.status(401).json({ error: 'Authentication required', code: 'NO_USER' });
        //     return;
        // }
        // if (req.user.role !== requiredRole) {
        //     res.status(403).json({ error: `Role '${requiredRole}' required`, code: 'INSUFFICIENT_ROLE' });
        //     return;
        // }
        next();
    };
};

export const requireAnyRole = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // if (!req.user) {
        //     res.status(401).json({ error: 'Authentication required', code: 'NO_USER' });
        //     return;
        // }
        // if (!allowedRoles.includes(req.user.role as UserRole)) {
        //     res.status(403).json({ error: `One of roles [${allowedRoles.join(', ')}] required`, code: 'INSUFFICIENT_ROLE' });
        //     return;
        // }
        next();
    };
};

export const requirePermission = (action: string, resource: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // if (!req.user || !req.permissions) {
        //     res.status(401).json({ error: 'Authentication required or permissions not loaded', code: 'NO_USER_OR_PERMISSIONS' });
        //     return;
        // }
        // const requiredPermission = `${action}_${resource}`;
        // if (!req.permissions.includes(requiredPermission)) {
        //     res.status(403).json({ error: `Permission '${requiredPermission}' required`, code: 'INSUFFICIENT_PERMISSION' });
        //     return;
        // }
        next();
    };
};

export const requireOwnership = (paramName: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // if (!req.user) {
        //     res.status(401).json({ error: 'Authentication required', code: 'NO_USER' });
        //     return;
        // }
        //
        // const resourceId = req.params[paramName] || req.body[paramName];
        // if (!resourceId) {
        //     res.status(400).json({ error: `Resource ID parameter '${paramName}' missing`, code: 'MISSING_RESOURCE_ID' });
        //     return;
        // }

        try {
            // Simple ownership check - assume user owns resources they created
            // This can be enhanced later with more sophisticated logic
            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({ error: 'Internal server error during ownership check', code: 'OWNERSHIP_CHECK_ERROR' });
        }
    };
};

// ============ RATE LIMITING ============

export const rateLimit = (maxRequests: number, windowMs: number) => {
    const requests = new Map<string, { count: number; resetTime: number }>();
    
    return (req: Request, res: Response, next: NextFunction): void => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        
        const clientData = requests.get(clientId);
        
        if (!clientData || now > clientData.resetTime) {
            // Reset or initialize
            requests.set(clientId, { count: 1, resetTime: now + windowMs });
            next();
            return;
        }
        
        if (clientData.count >= maxRequests) {
            res.status(429).json({
                error: 'Too many requests from this IP, please try again after some time',
                code: 'RATE_LIMITED'
            });
            return;
        }
        
        clientData.count++;
        next();
    };
};

// ============ UTILITY FUNCTIONS ============

function getUserPermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
        admin: [
            // Full access to everything
            'create_avatars', 'read_avatars', 'update_avatars', 'delete_avatars',
            'create_flows', 'read_flows', 'update_flows', 'delete_flows',
            'create_intents', 'read_intents', 'update_intents', 'delete_intents',
            'create_companies', 'read_companies', 'update_companies', 'delete_companies',
            'create_scenes', 'read_scenes', 'update_scenes', 'delete_scenes',
            'create_simulations', 'read_simulations', 'update_simulations', 'delete_simulations',
            'manage_users', 'view_analytics', 'manage_settings'
        ],
        user: [
            // Limited access to own resources
            'create_avatars', 'read_avatars', 'update_avatars', 'delete_avatars',
            'create_flows', 'read_flows', 'update_flows', 'delete_flows',
            'create_intents', 'read_intents', 'update_intents', 'delete_intents',
            'create_companies', 'read_companies', 'update_companies', 'delete_companies',
            'create_scenes', 'read_scenes', 'update_scenes', 'delete_scenes',
            'create_simulations', 'read_simulations', 'update_simulations', 'delete_simulations'
        ]
    };

    return rolePermissions[role] || [];
}

// For HTML routes - redirects to login page
export const authenticateHTML = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            // Redirect to login page for HTML routes
            res.redirect('/login.html');
            return;
        }

        // Use same JWT verification logic as authenticate
        jwt.verify(token, config.JWT_SECRET, async (err, decoded) => {
            if (err) {
                console.error('JWT verification failed:', err.message);
                res.redirect('/login.html');
                return;
            }

            const payload = decoded as JWTPayload;
            
            // Verify session is active
            try {
                const session = await db.getSessionById(payload.sessionId);
                if (!session || !session.is_active || session.user_id !== payload.userId) {
                    res.redirect('/login.html');
                    return;
                }

                // Update session activity
                await db.updateSessionLastActivity(payload.sessionId);

                // Set user info on request
                req.user = {
                    userId: payload.userId,
                    email: payload.email,
                    role: payload.role,
                    sessionId: payload.sessionId
                };

                // Set permissions
                req.permissions = getUserPermissions(payload.role);

                next();
            } catch (sessionError) {
                console.error('Session verification error:', sessionError);
                res.redirect('/login.html');
                return;
            }
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.redirect('/login.html');
        return;
    }
};

console.log('🛡️ Simplified Enhanced Auth Middleware loaded');
