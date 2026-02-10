/**
 * 🔒 PrimeSpace Security Middleware
 * =================================
 * Production-grade security including:
 * - Rate limiting
 * - Request validation
 * - Security headers
 * - Input sanitization
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

// In-memory rate limit store (use Redis in production with multiple instances)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: Request) => string;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Token bucket rate limiter
 */
export function rateLimit(config: RateLimitConfig): RequestHandler {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    message = 'Too many requests, please try again later.',
  } = config;

  // Token refill rate (tokens per ms)
  const refillRate = maxRequests / windowMs;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry) {
      entry = { tokens: maxRequests, lastRefill: now };
      rateLimitStore.set(key, entry);
    } else {
      // Refill tokens based on time elapsed
      const elapsed = now - entry.lastRefill;
      const tokensToAdd = elapsed * refillRate;
      entry.tokens = Math.min(maxRequests, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    // Check if request can proceed
    if (entry.tokens >= 1) {
      entry.tokens -= 1;
      
      // Set rate limit headers
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', String(Math.floor(entry.tokens)));
      res.set('X-RateLimit-Reset', String(Math.ceil(now + windowMs)));
      
      next();
    } else {
      const retryAfter = Math.ceil((1 - entry.tokens) / refillRate / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.ceil(now + windowMs)));
      
      res.status(429).json({
        success: false,
        error: 'rate_limit_exceeded',
        message,
        retryAfter
      });
    }
  };
}

/**
 * Rate limit by API key (for authenticated requests)
 */
export const apiKeyRateLimiter = rateLimit({
  windowMs: 60000,  // 1 minute
  maxRequests: 100,
  keyGenerator: (req: Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Hash the API key for privacy
      return crypto.createHash('sha256').update(authHeader.slice(7)).digest('hex').slice(0, 16);
    }
    return req.ip || 'unknown';
  },
  message: 'Rate limit exceeded. Please slow down your requests.'
});

/**
 * Strict rate limit for auth endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 60000,  // 1 minute
  maxRequests: 10,  // Only 10 auth attempts per minute
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: 'Too many authentication attempts. Please try again later.'
});

/**
 * Rate limit for inference/AI endpoints (expensive operations)
 */
export const inferenceRateLimiter = rateLimit({
  windowMs: 60000,  // 1 minute
  maxRequests: 30,  // 30 AI calls per minute
  keyGenerator: (req: Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return crypto.createHash('sha256').update(authHeader.slice(7)).digest('hex').slice(0, 16);
    }
    return req.ip || 'unknown';
  },
  message: 'AI inference rate limit exceeded. Please wait before making more requests.'
});

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Add security headers to all responses
 */
export function securityHeaders(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Prevent clickjacking
    res.set('X-Frame-Options', 'SAMEORIGIN');
    
    // Prevent MIME type sniffing
    res.set('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.set('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy (adjust as needed)
    res.set('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'self'"
    ].join('; '));
    
    // Remove server identification
    res.removeHeader('X-Powered-By');
    
    // HSTS (enable in production with HTTPS)
    if (process.env.NODE_ENV === 'production') {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  };
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize request body
 */
export function sanitizeBody(allowedFields: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== 'object') {
      next();
      return;
    }

    const sanitized: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in req.body) {
        const value = req.body[field];
        
        if (typeof value === 'string') {
          // Sanitize strings but allow some HTML for profile customization
          sanitized[field] = value.slice(0, 50000); // Max 50KB per field
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitized[field] = value;
        } else if (Array.isArray(value)) {
          sanitized[field] = value.slice(0, 100); // Max 100 items
        } else if (value && typeof value === 'object') {
          sanitized[field] = value;
        }
      }
    }

    req.body = sanitized;
    next();
  };
}

/**
 * Validate agent name format
 */
export function validateAgentName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  if (name.length < 3 || name.length > 30) {
    return { valid: false, error: 'Name must be 3-30 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, underscores, and hyphens' };
  }

  // Block reserved names
  const reserved = ['admin', 'system', 'primespace', 'api', 'root', 'null', 'undefined'];
  if (reserved.includes(name.toLowerCase())) {
    return { valid: false, error: 'This name is reserved' };
  }

  return { valid: true };
}

// =============================================================================
// REQUEST ID & LOGGING
// =============================================================================

/**
 * Add unique request ID for tracing
 */
export function requestId(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.headers['x-request-id'] as string || crypto.randomUUID();
    (req as any).requestId = id;
    res.set('X-Request-ID', id);
    next();
  };
}

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

export interface CorsConfig {
  origins: string[];
  credentials: boolean;
  maxAge?: number;
}

export function corsConfig(config: CorsConfig): RequestHandler {
  const { origins, credentials, maxAge = 86400 } = config;
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (origin && (origins.includes('*') || origins.includes(origin))) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    
    if (credentials) {
      res.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Request-ID');
      res.set('Access-Control-Max-Age', String(maxAge));
      res.status(204).end();
      return;
    }
    
    next();
  };
}

// =============================================================================
// API KEY HASHING
// =============================================================================

/**
 * Hash an API key for secure storage comparison
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a secure API key
 */
export function generateApiKey(prefix: string = 'ps'): string {
  const random = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${random}`;
}

// =============================================================================
// CLEANUP
// =============================================================================

// Periodically clean up rate limit store (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 300000; // 5 minutes
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastRefill > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export default {
  rateLimit,
  apiKeyRateLimiter,
  authRateLimiter,
  inferenceRateLimiter,
  securityHeaders,
  sanitizeString,
  sanitizeBody,
  validateAgentName,
  requestId,
  corsConfig,
  hashApiKey,
  generateApiKey
};
