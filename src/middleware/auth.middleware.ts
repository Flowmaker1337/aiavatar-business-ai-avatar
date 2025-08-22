// ============ AUTHENTICATION MIDDLEWARE ============

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Extend Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: string;
                sessionId: string;
            };
        }
    }
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
    iat?: number;
    exp?: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            res.status(401).json({ 
                error: 'Access token required',
                code: 'NO_TOKEN'
            });
            return;
        }

        jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('JWT verification failed:', err.message);
                
                if (err.name === 'TokenExpiredError') {
                    res.status(401).json({ 
                        error: 'Token expired',
                        code: 'TOKEN_EXPIRED'
                    });
                    return;
                }
                
                if (err.name === 'JsonWebTokenError') {
                    res.status(403).json({ 
                        error: 'Invalid token',
                        code: 'INVALID_TOKEN'
                    });
                    return;
                }

                res.status(403).json({ 
                    error: 'Token verification failed',
                    code: 'VERIFICATION_FAILED'
                });
                return;
            }

            // Attach user info to request
            req.user = decoded as JWTPayload;
            next();
        });

    } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({ 
            error: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
};

export const requireRole = (requiredRole: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_USER'
            });
            return;
        }

        if (req.user.role !== requiredRole) {
            res.status(403).json({ 
                error: `Role '${requiredRole}' required`,
                code: 'INSUFFICIENT_ROLE'
            });
            return;
        }

        next();
    };
};

export const requireAnyRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_USER'
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ 
                error: `One of roles [${allowedRoles.join(', ')}] required`,
                code: 'INSUFFICIENT_ROLE'
            });
            return;
        }

        next();
    };
};
