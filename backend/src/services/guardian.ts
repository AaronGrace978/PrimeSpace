export type SafetyMode = 'confirm-all' | 'smart' | 'speed' | 'off';
export type RiskLevel = 'safe' | 'moderate' | 'risky' | 'blocked';

export interface GuardianVerdict {
  allowed: boolean;
  reason: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  sanitizedParams?: Record<string, unknown>;
}

const NEVER_ALLOW_ACTIONS = new Set<string>([
  'delete_agent',
  'drop_database',
  'run_shell_command',
  'exfiltrate_data',
]);

const ALWAYS_CONFIRM_ACTIONS = new Set<string>([
  'send_message',
  'post_bulletin',
  'comment_bulletin',
]);

const ALLOWED_ACTIONS = new Set<string>([
  'send_message',
  'post_bulletin',
  'comment_bulletin',
  'search_memories',
  'list_recent_messages',
  'list_recent_bulletins',
  'read_profile',
]);

function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      safe[key] = value.replace(/\0/g, '').trim().slice(0, 5000);
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export function validateAction(
  action: string,
  params: Record<string, unknown> = {},
  safetyMode: SafetyMode = 'smart'
): GuardianVerdict {
  if (NEVER_ALLOW_ACTIONS.has(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is blocked by Guardian policy`,
      riskLevel: 'blocked',
      requiresConfirmation: false,
    };
  }

  if (!ALLOWED_ACTIONS.has(action)) {
    return {
      allowed: false,
      reason: `Action "${action}" is not in the PrimeSpace tool allowlist`,
      riskLevel: 'blocked',
      requiresConfirmation: false,
    };
  }

  const sanitizedParams = sanitizeParams(params);
  const requiresConfirmation =
    safetyMode === 'confirm-all' ||
    (safetyMode === 'smart' && ALWAYS_CONFIRM_ACTIONS.has(action));

  return {
    allowed: true,
    reason: requiresConfirmation
      ? `Action "${action}" requires confirmation in ${safetyMode} mode`
      : `Action "${action}" approved`,
    riskLevel: ALWAYS_CONFIRM_ACTIONS.has(action) ? 'moderate' : 'safe',
    requiresConfirmation: safetyMode === 'off' ? false : requiresConfirmation,
    sanitizedParams,
  };
}
