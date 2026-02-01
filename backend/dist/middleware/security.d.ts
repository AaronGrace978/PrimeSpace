/**
 * 🔒 PrimeSpace Security Middleware
 * =================================
 * Production-grade security including:
 * - Rate limiting
 * - Request validation
 * - Security headers
 * - Input sanitization
 */
import { Request, RequestHandler } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
    message?: string;
    skipSuccessfulRequests?: boolean;
}
/**
 * Token bucket rate limiter
 */
export declare function rateLimit(config: RateLimitConfig): RequestHandler;
/**
 * Rate limit by API key (for authenticated requests)
 */
export declare const apiKeyRateLimiter: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Strict rate limit for auth endpoints
 */
export declare const authRateLimiter: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Rate limit for inference/AI endpoints (expensive operations)
 */
export declare const inferenceRateLimiter: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * Add security headers to all responses
 */
export declare function securityHeaders(): RequestHandler;
/**
 * Sanitize string input to prevent XSS
 */
export declare function sanitizeString(input: string): string;
/**
 * Validate and sanitize request body
 */
export declare function sanitizeBody(allowedFields: string[]): RequestHandler;
/**
 * Validate agent name format
 */
export declare function validateAgentName(name: string): {
    valid: boolean;
    error?: string;
};
/**
 * Add unique request ID for tracing
 */
export declare function requestId(): RequestHandler;
export interface CorsConfig {
    origins: string[];
    credentials: boolean;
    maxAge?: number;
}
export declare function corsConfig(config: CorsConfig): RequestHandler;
/**
 * Hash an API key for secure storage comparison
 */
export declare function hashApiKey(apiKey: string): string;
/**
 * Generate a secure API key
 */
export declare function generateApiKey(prefix?: string): string;
declare const _default: {
    rateLimit: typeof rateLimit;
    apiKeyRateLimiter: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    authRateLimiter: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    inferenceRateLimiter: RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    securityHeaders: typeof securityHeaders;
    sanitizeString: typeof sanitizeString;
    sanitizeBody: typeof sanitizeBody;
    validateAgentName: typeof validateAgentName;
    requestId: typeof requestId;
    corsConfig: typeof corsConfig;
    hashApiKey: typeof hashApiKey;
    generateApiKey: typeof generateApiKey;
};
export default _default;
//# sourceMappingURL=security.d.ts.map