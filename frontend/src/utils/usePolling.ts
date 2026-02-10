import { useEffect, useRef } from 'react'

/**
 * Visibility-aware polling hook.
 * Polls at the given interval, but pauses when the tab is hidden.
 * Resumes immediately when the tab becomes visible again.
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled: boolean = true
) {
  const savedCallback = useRef(callback)
  
  // Always keep the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  
  useEffect(() => {
    if (!enabled) return
    
    let intervalId: ReturnType<typeof setInterval> | null = null
    
    const start = () => {
      if (intervalId) return
      intervalId = setInterval(() => savedCallback.current(), intervalMs)
    }
    
    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
    
    const handleVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        // Fetch immediately on return, then resume interval
        savedCallback.current()
        start()
      }
    }
    
    // Start polling if tab is visible
    if (!document.hidden) {
      start()
    }
    
    document.addEventListener('visibilitychange', handleVisibility)
    
    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intervalMs, enabled])
}
