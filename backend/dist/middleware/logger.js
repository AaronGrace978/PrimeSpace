/**
 * 📝 PrimeSpace Structured Logger
 * ================================
 * Production-grade logging with:
 * - JSON structured logs
 * - Request/response logging
 * - Performance tracking
 * - Log levels
 */
const LOG_LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50
};
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || LOG_LEVELS.info;
class Logger {
    service;
    constructor(service = 'primespace') {
        this.service = service;
    }
    log(level, message, meta = {}) {
        if (LOG_LEVELS[level] < currentLevel)
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            service: this.service,
            ...meta
        };
        // In production, output JSON for log aggregators
        if (process.env.NODE_ENV === 'production') {
            console.log(JSON.stringify(entry));
        }
        else {
            // In development, use pretty formatting
            const levelColors = {
                debug: '\x1b[90m', // Gray
                info: '\x1b[36m', // Cyan
                warn: '\x1b[33m', // Yellow
                error: '\x1b[31m', // Red
                fatal: '\x1b[35m' // Magenta
            };
            const reset = '\x1b[0m';
            const color = levelColors[level];
            const metaStr = Object.keys(meta).length > 0
                ? ` ${JSON.stringify(meta)}`
                : '';
            console.log(`${color}[${level.toUpperCase()}]${reset} ` +
                `${entry.timestamp} ` +
                `${message}${metaStr}`);
        }
    }
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    error(message, meta) {
        this.log('error', message, meta);
    }
    fatal(message, meta) {
        this.log('fatal', message, meta);
    }
    child(bindings) {
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
export function requestLogger() {
    return (req, res, next) => {
        const startTime = Date.now();
        const requestId = req.requestId || 'unknown';
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
        res.send = function (body) {
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
export function errorLogger() {
    return (err, req, res, next) => {
        const requestId = req.requestId || 'unknown';
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
export function performanceLogger(operation) {
    const startTime = Date.now();
    return {
        end: (meta) => {
            const duration = Date.now() - startTime;
            logger.debug(`${operation} completed`, { duration, ...meta });
        }
    };
}
export function auditLog(event) {
    logger.info('Audit event', {
        audit: true,
        ...event
    });
}
export default logger;
//# sourceMappingURL=logger.js.map