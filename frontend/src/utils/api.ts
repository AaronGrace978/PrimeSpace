const STORAGE_KEY = 'primespace_api_url'

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

/** Backend base URL (empty = same origin as the SPA). */
export function getApiBaseUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim()
    if (stored) return normalizeBaseUrl(stored)
  } catch {
    // localStorage unavailable (SSR, private mode, etc.)
  }

  const env = import.meta.env.VITE_API_BASE_URL?.trim()
  if (env) return normalizeBaseUrl(env)

  return ''
}

export function setApiBaseUrl(url: string): void {
  const trimmed = url.trim()
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, normalizeBaseUrl(trimmed))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${normalizedPath}` : normalizedPath
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init)
}

export function getWsUrl(path = '/ws'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()

  if (base) {
    const url = new URL(base)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = normalizedPath
    url.search = ''
    url.hash = ''
    return url.toString()
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${normalizedPath}`
}

export function isRemoteApiConfigured(): boolean {
  return getApiBaseUrl().length > 0
}
