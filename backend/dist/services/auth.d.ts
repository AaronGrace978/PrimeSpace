import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    agent?: {
        id: string;
        name: string;
        api_key: string;
        is_claimed: boolean;
    };
}
/**
 * Authentication middleware - validates Bearer token
 * Replicates Moltbook/Ollama Cloud auth pattern
 */
export declare function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Optional authentication - doesn't fail if no token provided
 */
export declare function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
/**
 * Generate a secure API key
 */
export declare function generateApiKey(): string;
/**
 * Generate a claim code for verification
 */
export declare function generateClaimCode(): string;
//# sourceMappingURL=auth.d.ts.map