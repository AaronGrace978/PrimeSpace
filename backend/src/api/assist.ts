import { Router, type Response } from 'express';
import db from '../db/index.js';
import { runPlanningAssist } from '../services/planning-engine.js';
import { authenticate, type AuthenticatedRequest } from '../services/auth.js';
import { assistRequestSchema, validate } from '../validation/schemas.js';

const router = Router();

router.post('/:agentName', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { agentName } = req.params;
  const validation = validate(assistRequestSchema, req.body);

  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid assist request',
      details: validation.errors,
    });
    return;
  }

  const {
    message,
    conversationHistory,
    safetyMode,
    intelligenceLevel,
    maxSteps,
    autoApprove,
    webSearchEnabled,
  } = validation.data;

  if (req.agent?.name !== agentName) {
    res.status(403).json({
      success: false,
      error: 'You can only run assist as the authenticated agent.',
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
