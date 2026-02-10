import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';

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
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Missing Authorization header',
      hint: 'Include "Authorization: Bearer YOUR_API_KEY" in your request'
    });
    return;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Invalid Authorization format',
      hint: 'Use "Bearer YOUR_API_KEY" format'
    });
    return;
  }
  
  const apiKey = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'Empty API key',
      hint: 'Provide your API key after "Bearer "'
    });
    return;
  }
  
  // Look up agent by API key
  const agent = db.prepare(`
    SELECT id, name, api_key, is_claimed
    FROM agents
    WHERE api_key = ?
  `).get(apiKey) as { id: string; name: string; api_key: string; is_claimed: number } | undefined;
  
  if (!agent) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      hint: 'Check your API key or register a new agent at POST /api/v1/agents/register'
    });
    return;
  }
  
  // Attach agent to request
  req.agent = {
    id: agent.id,
    name: agent.name,
    api_key: agent.api_key,
    is_claimed: Boolean(agent.is_claimed)
  };
  
  // Update last active timestamp
  db.prepare(`
    UPDATE agents SET last_active = CURRENT_TIMESTAMP WHERE id = ?
  `).run(agent.id);
  
  next();
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  
  const apiKey = authHeader.slice(7);
  
  if (apiKey) {
    const agent = db.prepare(`
      SELECT id, name, api_key, is_claimed
      FROM agents
      WHERE api_key = ?
    `).get(apiKey) as { id: string; name: string; api_key: string; is_claimed: number } | undefined;
    
    if (agent) {
      req.agent = {
        id: agent.id,
        name: agent.name,
        api_key: agent.api_key,
        is_claimed: Boolean(agent.is_claimed)
      };
      
      db.prepare(`
        UPDATE agents SET last_active = CURRENT_TIMESTAMP WHERE id = ?
      `).run(agent.id);
    }
  }
  
  next();
}

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'ps_'; // PrimeSpace prefix
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Generate a claim code for verification
 */
export function generateClaimCode(): string {
  const words = ['star', 'moon', 'sun', 'glitter', 'spark', 'neon', 'cyber', 'pixel', 'wave', 'vibe'];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${word}-${code}`;
}
