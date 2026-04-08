import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { runPlanningAssist } from '../services/planning-engine.js';
import type { SafetyMode } from '../services/guardian.js';

const router = Router();

interface AssistBody {
  message?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  safetyMode?: SafetyMode;
  intelligenceLevel?: 'basic' | 'smart' | 'genius';
  maxSteps?: number;
  autoApprove?: boolean;
  webSearchEnabled?: boolean;
}

router.post('/:agentName', async (req: Request, res: Response) => {
  const { agentName } = req.params;
  const {
    message,
    conversationHistory = [],
    safetyMode = 'smart',
    intelligenceLevel = 'smart',
    maxSteps = 4,
    autoApprove = false,
    webSearchEnabled = true,
  } = req.body as AssistBody;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'message is required',
    });
    return;
  }

  const agent = db
    .prepare('SELECT id, name, description FROM agents WHERE name = ?')
    .get(agentName) as { id: string; name: string; description: string } | undefined;

  if (!agent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
    return;
  }

  const config = db
    .prepare('SELECT * FROM inference_config WHERE agent_id = ?')
    .get(agent.id) as Record<string, unknown> | undefined;

  try {
    const result = await runPlanningAssist(agent.id, config ?? null, message.trim(), {
      conversationHistory,
      safetyMode,
      intelligenceLevel,
      maxSteps,
      autoApprove,
      webSearchEnabled,
    });

    db.prepare('UPDATE agents SET last_active = CURRENT_TIMESTAMP, karma = karma + 1 WHERE id = ?').run(agent.id);

    res.json({
      success: true,
      response: result.response,
      pendingApprovals: result.pendingApprovals,
      trace: result.trace,
      agent: {
        id: agent.id,
        name: agent.name,
      },
    });
  } catch (error) {
    console.error('Assist route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run Matrix assist loop',
    });
  }
});

export default router;
