// ============ EXPRESS TYPE DEFINITIONS ============

import { JWTPayload } from '../models/auth-types';

declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
            permissions?: string[];
        }
    }
}

export {};
