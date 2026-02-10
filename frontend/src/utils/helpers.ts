/**
 * Shared utility functions for PrimeSpace frontend
 */

/**
 * Format a date string as a relative time (e.g. "just now", "5m ago", "3h ago")
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

/**
 * Normalize content whitespace — collapse \r\n to \n and strip excess blank lines
 */
export function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n')
  return normalized.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Truncate content to a max length, appending "..." if truncated
 */
export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return `${content.substring(0, maxLength)}...`
}
