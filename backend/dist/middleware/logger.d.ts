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
declare class Logger {
    private service;
    constructor(service?: string);
    private log;
    debug(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    error(message: string, meta?: Record<string, any>): void;
    fatal(message: string, meta?: Record<string, any>): void;
    child(bindings: Record<string, any>): Logger;
}
export declare const logger: Logger;
export declare function requestLogger(): RequestHandler;
export declare function errorLogger(): (err: Error, req: Request, res: Response, next: NextFunction) => void;
export declare function performanceLogger(operation: string): {
    end: (meta?: Record<string, any>) => void;
};
export interface AuditEvent {
    agentId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, any>;
}
export declare function auditLog(event: AuditEvent): void;
export default logger;
//# sourceMappingURL=logger.d.ts.map