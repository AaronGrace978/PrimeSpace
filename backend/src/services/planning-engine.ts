import { routeInference, type InferenceRequest } from './inference/router.js';
import { executeTool, getToolNames, type ToolCall } from './tools/index.js';
import { validateAction, type GuardianVerdict, type SafetyMode } from './guardian.js';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistOptions {
  conversationHistory?: ChatTurn[];
  safetyMode?: SafetyMode;
  intelligenceLevel?: 'basic' | 'smart' | 'genius';
  maxSteps?: number;
  autoApprove?: boolean;
  webSearchEnabled?: boolean;
}

export interface AssistTraceItem {
  step: number;
  action: string;
  params: Record<string, unknown>;
  verdict: GuardianVerdict;
  result?: unknown;
  error?: string;
}

export interface AssistResult {
  response: string;
  trace: AssistTraceItem[];
  pendingApprovals: Array<{ action: string; params: Record<string, unknown>; reason: string }>;
}

interface ModelPlan {
  thinking?: string;
  response?: string;
  actions?: Array<{ action: string; params?: Record<string, unknown> }>;
}

const INTELLIGENCE_PROMPTS: Record<'basic' | 'smart' | 'genius', string> = {
  basic: 'Use short reasoning and one action max unless necessary.',
  smart: 'Use multi-step reasoning and up to two actions per step if needed.',
  genius: 'Use deeper planning, but stay concise and avoid unnecessary actions.',
};

function toSafeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parsePlan(raw: string): ModelPlan {
  const trimmed = raw.trim();

  const tryParse = (input: string): ModelPlan | null => {
    try {
      const parsed = JSON.parse(input) as ModelPlan;
      return parsed;
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) {
    return direct;
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed) {
      return parsed;
    }
  }

  const jsonLike = trimmed.match(/\{[\s\S]*\}/);
  if (jsonLike?.[0]) {
    const parsed = tryParse(jsonLike[0]);
    if (parsed) {
      return parsed;
    }
  }

  return { response: trimmed, actions: [] };
}

function buildSystemPrompt(intelligenceLevel: 'basic' | 'smart' | 'genius', webSearchEnabled: boolean): string {
  return `You are Matrix Buddy for PrimeSpace.

You must respond in strict JSON with this shape:
{
  "thinking": "brief internal plan",
  "actions": [{ "action": "tool_name", "params": {} }],
  "response": "message to user"
}

Rules:
- Use tools only when needed.
- Keep actions in the PrimeSpace tool allowlist.
- Never fabricate tool results.
- If no tool is needed, return actions as [].
- Keep "response" conversational and helpful.
- Do not include markdown code fences.

Available tools: ${getToolNames().join(', ')}
Intelligence mode: ${INTELLIGENCE_PROMPTS[intelligenceLevel]}
Web search enabled: ${webSearchEnabled ? 'yes' : 'no'}
`;
}

export async function runPlanningAssist(
  agentId: string,
  config: unknown,
  userMessage: string,
  options: AssistOptions = {}
): Promise<AssistResult> {
  const safetyMode = options.safetyMode ?? 'smart';
  const intelligenceLevel = options.intelligenceLevel ?? 'smart';
  const maxSteps = Math.max(1, Math.min(options.maxSteps ?? 4, 8));
  const autoApprove = Boolean(options.autoApprove);
  const webSearchEnabled = options.webSearchEnabled !== false;

  const trace: AssistTraceItem[] = [];
  const pendingApprovals: Array<{ action: string; params: Record<string, unknown>; reason: string }> = [];
  const history = (options.conversationHistory ?? []).slice(-12);

  const messages: InferenceRequest['messages'] = [
    {
      role: 'system',
      content: buildSystemPrompt(intelligenceLevel, webSearchEnabled),
    },
    ...history.map((turn) => ({
      role: turn.role,
      content: toSafeText(turn.content).slice(0, 3000),
    })),
    {
      role: 'user',
      content: userMessage.slice(0, 4000),
    },
  ];

  let finalResponse = '';

  for (let step = 1; step <= maxSteps; step += 1) {
    const request: InferenceRequest = {
      type: 'chat',
      model: (config as { default_model?: string } | null)?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
      messages,
      options: {
        temperature: (config as { temperature?: number } | null)?.temperature ?? 0.6,
        max_tokens: (config as { max_tokens?: number } | null)?.max_tokens ?? 1200,
      },
    };

    const inference = await routeInference(agentId, config, request);
    const raw = toSafeText((inference as { content?: string } | undefined)?.content, '').trim();
    const plan = parsePlan(raw);

    finalResponse = toSafeText(plan.response, raw || finalResponse);
    const actions = Array.isArray(plan.actions) ? plan.actions.slice(0, 3) : [];

    if (actions.length === 0) {
      break;
    }

    let executedAtLeastOne = false;

    for (const actionItem of actions) {
      const call: ToolCall = {
        action: toSafeText(actionItem.action),
        params: actionItem.params && typeof actionItem.params === 'object' ? actionItem.params : {},
      };

      if (!call.action) {
        continue;
      }

      const verdict = validateAction(call.action, call.params, safetyMode);
      const traceItem: AssistTraceItem = {
        step,
        action: call.action,
        params: call.params ?? {},
        verdict,
      };

      if (!verdict.allowed) {
        traceItem.error = verdict.reason;
        trace.push(traceItem);
        continue;
      }

      if (verdict.requiresConfirmation && !autoApprove) {
        pendingApprovals.push({
          action: call.action,
          params: (verdict.sanitizedParams as Record<string, unknown>) ?? {},
          reason: verdict.reason,
        });
        traceItem.error = 'Pending confirmation';
        trace.push(traceItem);
        continue;
      }

      const result = await executeTool(agentId, {
        action: call.action,
        params: (verdict.sanitizedParams as Record<string, unknown>) ?? {},
      });

      traceItem.result = result;
      if (!result.ok) {
        traceItem.error = result.error ?? 'Tool execution failed';
      } else {
        executedAtLeastOne = true;
      }
      trace.push(traceItem);

      messages.push({
        role: 'system',
        content: `Tool execution result (${call.action}): ${JSON.stringify(result)}`,
      });
    }

    if (!executedAtLeastOne) {
      break;
    }

    messages.push({
      role: 'system',
      content: 'Continue. If more actions are needed, provide them. Otherwise return final response with actions [].',
    });
  }

  if (!finalResponse) {
    finalResponse = 'I could not produce a reliable response yet. Try asking again with more context.';
  }

  return {
    response: finalResponse,
    trace,
    pendingApprovals,
  };
}
