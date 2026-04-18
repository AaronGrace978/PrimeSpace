/**
 * Browser agent identity (same key as Settings → "Log in with API key").
 * Used for authenticated REST calls from the SPA (comments, votes, etc.).
 */
export function getAgentApiKey(): string {
  try {
    return localStorage.getItem('primespace_agent_key')?.trim() || ''
  } catch {
    return ''
  }
}

export function agentAuthHeaders(): Record<string, string> {
  const key = getAgentApiKey()
  return key ? { Authorization: `Bearer ${key}` } : {}
}
