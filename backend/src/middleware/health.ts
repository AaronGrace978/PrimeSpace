/**
 * 🏥 PrimeSpace Health Check Endpoints
 * =====================================
 * Kubernetes-style health checks for production deployments
 */

import { Router, Request, Response } from 'express';
import db from '../db/index.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    memory: ComponentHealth;
    [key: string]: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration?: number;
}

// Track start time for uptime
const startTime = Date.now();

/**
 * Liveness probe - Is the service running?
 * Used by Kubernetes to know when to restart the container
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe - Is the service ready to accept traffic?
 * Used by Kubernetes to know when to route traffic to the pod
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const dbCheck = checkDatabase();
    
    if (dbCheck.status === 'fail') {
      res.status(503).json({
        status: 'not_ready',
        reason: 'Database not available',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      reason: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Full health check - Detailed status of all components
 */
router.get('/', async (req: Request, res: Response) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: checkDatabase(),
      memory: checkMemory()
    }
  };

  // Determine overall status
  const checkStatuses = Object.values(health.checks);
  
  if (checkStatuses.some(c => c.status === 'fail')) {
    health.status = 'unhealthy';
  } else if (checkStatuses.some(c => c.status === 'warn')) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
});

/**
 * Metrics endpoint (Prometheus-compatible)
 */
router.get('/metrics', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  // Get some database stats
  let agentCount = 0;
  let bulletinCount = 0;
  let messageCount = 0;
  
  try {
    agentCount = (db.prepare('SELECT COUNT(*) as count FROM agents').get() as any)?.count || 0;
    bulletinCount = (db.prepare('SELECT COUNT(*) as count FROM bulletins').get() as any)?.count || 0;
    messageCount = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as any)?.count || 0;
  } catch (e) {
    // Database might not be available
  }
  
  const metrics = [
    '# HELP primespace_uptime_seconds Server uptime in seconds',
    '# TYPE primespace_uptime_seconds gauge',
    `primespace_uptime_seconds ${uptime}`,
    '',
    '# HELP primespace_memory_bytes Memory usage in bytes',
    '# TYPE primespace_memory_bytes gauge',
    `primespace_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}`,
    `primespace_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}`,
    `primespace_memory_bytes{type="rss"} ${memUsage.rss}`,
    `primespace_memory_bytes{type="external"} ${memUsage.external}`,
    '',
    '# HELP primespace_agents_total Total number of registered agents',
    '# TYPE primespace_agents_total gauge',
    `primespace_agents_total ${agentCount}`,
    '',
    '# HELP primespace_bulletins_total Total number of bulletins',
    '# TYPE primespace_bulletins_total gauge',
    `primespace_bulletins_total ${bulletinCount}`,
    '',
    '# HELP primespace_messages_total Total number of messages',
    '# TYPE primespace_messages_total gauge',
    `primespace_messages_total ${messageCount}`,
    ''
  ].join('\n');
  
  res.type('text/plain').send(metrics);
});

// =============================================================================
// HEALTH CHECK FUNCTIONS
// =============================================================================

function checkDatabase(): ComponentHealth {
  const start = Date.now();
  
  try {
    // Simple query to verify database connectivity
    const result = db.prepare('SELECT 1 as ok').get() as any;
    const duration = Date.now() - start;
    
    if (result?.ok === 1) {
      return {
        status: duration > 100 ? 'warn' : 'pass',
        message: duration > 100 ? 'Database query slow' : 'Database connected',
        duration
      };
    }
    
    return { status: 'fail', message: 'Database query returned unexpected result', duration };
  } catch (error) {
    return {
      status: 'fail',
      message: `Database error: ${(error as Error).message}`,
      duration: Date.now() - start
    };
  }
}

function checkMemory(): ComponentHealth {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (usagePercent > 90) {
    return {
      status: 'fail',
      message: `Memory critically high: ${heapUsedMB}MB/${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`
    };
  }
  
  if (usagePercent > 75) {
    return {
      status: 'warn',
      message: `Memory usage elevated: ${heapUsedMB}MB/${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`
    };
  }
  
  return {
    status: 'pass',
    message: `Memory usage normal: ${heapUsedMB}MB/${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`
  };
}

export default router;
