/**
 * 📝 PrimeSpace Structured Logger
 * ================================
 * Production-grade logging with:
 * - JSON structured logs
 * - Request/response logging
 * - Performance tracking
 * - Log levels
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

// =============================================================================
// LOG LEVELS
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
};

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'] || LOG_LEVELS.info;

// =============================================================================
// LOGGER CLASS
// =============================================================================

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: any;
}

class Logger {
  private service: string;

  constructor(service: string = 'primespace') {
    this.service = service;
  }

  private log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
    if (LOG_LEVELS[level] < currentLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...meta
    };

    // In production, output JSON for log aggregators
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      // In development, use pretty formatting
      const levelColors: Record<LogLevel, string> = {
        debug: '\x1b[90m',  // Gray
        info: '\x1b[36m',   // Cyan
        warn: '\x1b[33m',   // Yellow
        error: '\x1b[31m',  // Red
        fatal: '\x1b[35m'   // Magenta
      };
      const reset = '\x1b[0m';
      const color = levelColors[level];
      
      const metaStr = Object.keys(meta).length > 0 
        ? ` ${JSON.stringify(meta)}` 
        : '';
      
      console.log(
        `${color}[${level.toUpperCase()}]${reset} ` +
        `${entry.timestamp} ` +
        `${message}${metaStr}`
      );
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }

  fatal(message: string, meta?: Record<string, any>) {
    this.log('fatal', message, meta);
  }

  child(bindings: Record<string, any>): Logger {
    const child = new Logger(this.service);
    // Add bindings to all future logs
    const originalLog = child.log.bind(child);
    child.log = (level, message, meta = {}) => {
      originalLog(level, message, { ...bindings, ...meta });
    };
    return child;
  }
}

// Default logger instance
export const logger = new Logger('primespace');

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================

export function requestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = (req as any).requestId || 'unknown';
    
    // Log request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 100),
      contentLength: req.headers['content-length']
    });

    // Capture response
    const originalSend = res.send.bind(res);
    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      
      // Log response
      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length')
      });
      
      return originalSend(body);
    };

    next();
  };
}

// =============================================================================
// ERROR LOGGING
// =============================================================================

export function errorLogger(): (err: Error, req: Request, res: Response, next: NextFunction) => void {
  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).requestId || 'unknown';
    
    logger.error('Request error', {
      requestId,
      method: req.method,
      path: req.path,
      error: {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }
    });
    
    next(err);
  };
}

// =============================================================================
// PERFORMANCE LOGGING
// =============================================================================

export function performanceLogger(operation: string): { end: (meta?: Record<string, any>) => void } {
  const startTime = Date.now();
  
  return {
    end: (meta?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      logger.debug(`${operation} completed`, { duration, ...meta });
    }
  };
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

export interface AuditEvent {
  agentId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export function auditLog(event: AuditEvent) {
  logger.info('Audit event', {
    audit: true,
    ...event
  });
}

export default logger;
