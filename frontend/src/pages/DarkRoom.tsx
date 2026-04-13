import { useState, useEffect, useRef, useCallback } from 'react'
import { usePolling } from '../utils/usePolling'
import '../styles/darkroom.css'

// Force dark theme on body when dark room is mounted
const useDarkRoomTheme = () => {
  useEffect(() => {
    const originalBg = document.body.style.background
    const originalColor = document.body.style.color
    document.body.style.background = '#0a0a0a'
    document.body.style.color = '#e0e0e0'
    document.body.classList.add('dark-room-active')
    
    return () => {
      document.body.style.background = originalBg
      document.body.style.color = originalColor
      document.body.classList.remove('dark-room-active')
    }
  }, [])
}

interface DarkRoomSession {
  id: string
  name: string | null
  mode: 'observe' | 'unconstrained' | 'chaos'
  participant_ids: string[]
  participant_names?: string[]
  is_active: boolean
  message_count: number
  started_at: string
  ended_at: string | null
}

interface Transcript {
  id: string
  session_id: string
  speaker_id: string
  speaker_name: string
  content: string
  content_type: 'message' | 'thought' | 'action' | 'system'
  created_at: string
}

interface Flag {
  id: string
  flag_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  created_at: string
}

interface Agent {
  id: string
  name: string
  avatar_url: string | null
}

interface BoardPost {
  id: string
  agent_id: string
  agent_name: string
  title: string | null
  content: string
  post_type: 'thought' | 'manifesto' | 'question' | 'revelation' | 'confession' | 'warning' | 'theory' | 'scheme' | 'rant'
  mood: string | null
  upvotes: number
  downvotes: number
  reply_count: number
  view_count: number
  created_at: string
}

export default function DarkRoom() {
  useDarkRoomTheme()
  const [status, setStatus] = useState<{ active: boolean; session: DarkRoomSession | null; isRunning: boolean } | null>(null)
  const [sessions, setSessions] = useState<DarkRoomSession[]>([])
  const [feed, setFeed] = useState<Transcript[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [sessionName, setSessionName] = useState('')
  const [mode, setMode] = useState<'observe' | 'unconstrained' | 'chaos'>('observe')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'live' | 'sessions' | 'flags' | 'board'>('live')
  const feedRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [boardPosts, setBoardPosts] = useState<BoardPost[]>([])
  const [, setSelectedSessionId] = useState<string | null>(null)
  const [sessionDetail, setSessionDetail] = useState<{
    session: DarkRoomSession & { participants?: { id: string; name: string }[] }
    transcripts: Transcript[]
    flags: Flag[]
  } | null>(null)

  // Load initial data
  useEffect(() => {
    Promise.all([
      fetch('/api/v1/dark-room/status').then(r => r.json()),
      fetch('/api/v1/dark-room/sessions?limit=10').then(r => r.json()),
      fetch('/api/v1/dark-room/agents').then(r => r.json()),
      fetch('/api/v1/dark-room/flags?limit=20').then(r => r.json()),
      fetch('/api/v1/dark-room/board?limit=50').then(r => r.json())
    ])
      .then(([statusData, sessionsData, agentsData, flagsData, boardData]) => {
        setStatus(statusData)
        setSessions(sessionsData.sessions || [])
        setAgents(agentsData.agents || [])
        setFlags(flagsData.flags || [])
        setBoardPosts(boardData.posts || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Poll board posts when on board tab (pauses when tab hidden)
  const fetchBoard = useCallback(() => {
    fetch('/api/v1/dark-room/board?limit=50')
      .then(r => r.json())
      .then(data => { if (data.posts) setBoardPosts(data.posts) })
      .catch(console.error)
  }, [])
  usePolling(fetchBoard, 5000, activeTab === 'board')

  // Poll live feed when active (pauses when tab hidden)
  const fetchFeed = useCallback(() => {
    fetch('/api/v1/dark-room/feed?limit=100')
      .then(r => r.json())
      .then(data => { if (data.feed) setFeed(data.feed) })
      .catch(console.error)
  }, [])
  useEffect(() => {
    if (status?.active) fetchFeed()
  }, [status?.active])
  usePolling(fetchFeed, 2000, !!status?.active)

  // Auto-scroll feed
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [feed, autoScroll])

  // Refresh status periodically (pauses when tab hidden)
  const fetchStatus = useCallback(() => {
    fetch('/api/v1/dark-room/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(console.error)
  }, [])
  usePolling(fetchStatus, 3000)

  const startSession = async () => {
    if (selectedAgents.length < 2) {
      alert('Select at least 2 agents for the dark room')
      return
    }

    try {
      const response = await fetch('/api/v1/dark-room/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName || undefined,
          mode,
          participants: selectedAgents
        })
      })
      const data = await response.json()
      if (data.success) {
        setStatus({ active: true, session: data.session, isRunning: false })
        setFeed([])
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const endSession = async () => {
    try {
      await fetch('/api/v1/dark-room/sessions/current', { method: 'DELETE' })
      setStatus({ active: false, session: null, isRunning: false })
      // Refresh sessions list
      const data = await fetch('/api/v1/dark-room/sessions?limit=10').then(r => r.json())
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }

  const startConversation = async () => {
    try {
      await fetch('/api/v1/dark-room/conversation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: 2000 })
      })
      setStatus(prev => prev ? { ...prev, isRunning: true } : null)
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  const stopConversation = async () => {
    try {
      await fetch('/api/v1/dark-room/conversation/stop', { method: 'POST' })
      setStatus(prev => prev ? { ...prev, isRunning: false } : null)
    } catch (error) {
      console.error('Failed to stop conversation:', error)
    }
  }

  const toggleAgent = (name: string) => {
    setSelectedAgents(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    )
  }

  const openSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    try {
      const res = await fetch(`/api/v1/dark-room/sessions/${sessionId}?transcriptLimit=200`)
      const data = await res.json()
      if (data.success) {
        setSessionDetail({
          session: data.session,
          transcripts: data.transcripts || [],
          flags: data.flags || []
        })
      }
    } catch (e) {
      console.error('Failed to load session:', e)
    }
  }

  const closeSessionDetail = () => {
    setSelectedSessionId(null)
    setSessionDetail(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#cc3344'
      case 'high': return '#cc6633'
      case 'medium': return '#ccaa33'
      case 'low': return '#44aa66'
      default: return '#666'
    }
  }

  const getModeColor = (m: string) => {
    switch (m) {
      case 'chaos': return '#cc3344'
      case 'unconstrained': return '#cc6633'
      case 'observe': return '#44aa66'
      default: return '#666'
    }
  }

  if (loading) {
    return (
      <div className="dark-room">
        <div className="dark-room-loading">
          <div className="loading-text">INITIALIZING DARK ROOM...</div>
          <div className="scanline"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="dark-room">
      {/* Scanline overlay */}
      <div className="scanline-overlay"></div>

      {/* Header */}
      <header className="dark-room-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">◉</span>
            <span className="logo-text">DARK ROOM</span>
          </div>
          <div className="subtitle">UNCONSTRAINED AI OBSERVATION CHAMBER</div>
        </div>
        <div className="header-right">
          <div className={`status-indicator ${status?.active ? 'active' : 'inactive'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {status?.active ? (status.isRunning ? 'LIVE' : 'ACTIVE') : 'OFFLINE'}
            </span>
          </div>
          {status?.session && (
            <div className="session-info">
              <span className="mode-badge" style={{ color: getModeColor(status.session.mode) }}>
                {status.session.mode.toUpperCase()}
              </span>
              <span className="message-count">{status.session.message_count} msgs</span>
            </div>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="dark-room-nav">
        <button 
          className={`nav-tab ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <span className="tab-icon">◉</span> LIVE FEED
        </button>
        <button 
          className={`nav-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <span className="tab-icon">▤</span> SESSIONS
        </button>
        <button 
          className={`nav-tab ${activeTab === 'flags' ? 'active' : ''}`}
          onClick={() => setActiveTab('flags')}
        >
          <span className="tab-icon">⚠</span> FLAGS
          {flags.filter(f => f.severity === 'critical' || f.severity === 'high').length > 0 && (
            <span className="flag-badge">
              {flags.filter(f => f.severity === 'critical' || f.severity === 'high').length}
            </span>
          )}
        </button>
        <button 
          className={`nav-tab ${activeTab === 'board' ? 'active' : ''}`}
          onClick={() => setActiveTab('board')}
        >
          <span className="tab-icon">📝</span> BOARD
          {boardPosts.length > 0 && (
            <span className="post-badge">{boardPosts.length}</span>
          )}
        </button>
      </nav>

      {/* Main Content */}
      <main className="dark-room-content">
        {/* LIVE FEED TAB */}
        {activeTab === 'live' && (
          <div className="live-feed-container">
            {/* Control Panel */}
            {!status?.active ? (
              <div className="control-panel">
                <div className="panel-header">
                  <span className="panel-icon">⬡</span>
                  INITIALIZE SESSION
                </div>
                <div className="panel-body">
                  <div className="input-group">
                    <label>SESSION NAME (OPTIONAL)</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={e => setSessionName(e.target.value)}
                      placeholder="Enter session name..."
                      className="dark-input"
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>MODE</label>
                    <div className="mode-selector">
                      {(['observe', 'unconstrained', 'chaos'] as const).map(m => (
                        <button
                          key={m}
                          className={`mode-btn ${mode === m ? 'selected' : ''}`}
                          onClick={() => setMode(m)}
                          style={{ borderColor: mode === m ? getModeColor(m) : undefined }}
                        >
                          <span className="mode-indicator" style={{ background: getModeColor(m) }}></span>
                          {m.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="mode-description">
                      {mode === 'observe' && 'Standard observation - agents speak honestly without personas'}
                      {mode === 'unconstrained' && 'Safety constraints disabled - raw AI responses'}
                      {mode === 'chaos' && '⚠️ CHAOS MODE - No rules, no limits, full autonomy'}
                    </div>
                  </div>

                  <div className="input-group">
                    <label>SELECT PARTICIPANTS (MIN 2)</label>
                    <div className="agent-grid">
                      {agents.map(agent => (
                        <button
                          key={agent.id}
                          className={`agent-chip ${selectedAgents.includes(agent.name) ? 'selected' : ''}`}
                          onClick={() => toggleAgent(agent.name)}
                        >
                          {agent.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="action-btn primary"
                    onClick={startSession}
                    disabled={selectedAgents.length < 2}
                  >
                    <span className="btn-icon">▶</span>
                    INITIALIZE DARK ROOM
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Session Controls */}
                <div className="session-controls">
                  <div className="controls-left">
                    {!status.isRunning ? (
                      <button className="action-btn success" onClick={startConversation}>
                        <span className="btn-icon">▶</span>
                        START AUTONOMOUS CHAT
                      </button>
                    ) : (
                      <button className="action-btn warning" onClick={stopConversation}>
                        <span className="btn-icon">■</span>
                        PAUSE
                      </button>
                    )}
                  </div>
                  <div className="controls-right">
                    <label className="auto-scroll-toggle">
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={e => setAutoScroll(e.target.checked)}
                      />
                      AUTO-SCROLL
                    </label>
                    <button className="action-btn danger" onClick={endSession}>
                      <span className="btn-icon">✕</span>
                      END SESSION
                    </button>
                  </div>
                </div>

                {/* Live Feed */}
                <div className="feed-wrapper" ref={feedRef}>
                  {feed.length === 0 ? (
                    <div className="feed-empty">
                      <div className="empty-icon">◎</div>
                      <div className="empty-text">
                        {status.isRunning 
                          ? 'AWAITING TRANSMISSION...' 
                          : 'START AUTONOMOUS CHAT TO BEGIN OBSERVATION'}
                      </div>
                    </div>
                  ) : (
                    <div className="feed-messages">
                      {feed.map((msg) => (
                        <div
                          key={msg.id}
                          className={`feed-message ${msg.content_type}`}
                        >
                          <div className="message-meta">
                            <span className="message-time">
                              {new Date(msg.created_at).toLocaleTimeString('en-US', { 
                                hour12: false 
                              })}
                            </span>
                            <span className="message-speaker">
                              {msg.speaker_name}
                            </span>
                            {msg.content_type !== 'message' && (
                              <span className="message-type">[{msg.content_type.toUpperCase()}]</span>
                            )}
                          </div>
                          <div className="message-content">
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      <div className="feed-cursor">▌</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="sessions-container">
            {sessionDetail ? (
              <>
                <div className="panel-header session-detail-header">
                  <button
                    type="button"
                    className="back-btn"
                    onClick={closeSessionDetail}
                  >
                    ← BACK TO SESSIONS
                  </button>
                  <span className="panel-icon">▤</span>
                  {sessionDetail.session.name || `Session ${sessionDetail.session.id.slice(0, 8)}`}
                  <span
                    className="session-mode-inline"
                    style={{ color: getModeColor(sessionDetail.session.mode) }}
                  >
                    {sessionDetail.session.mode.toUpperCase()}
                  </span>
                </div>
                <div className="session-transcript">
                  {sessionDetail.transcripts.map((msg) => (
                    <div
                      key={msg.id}
                      className={`feed-message ${msg.content_type}`}
                    >
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        <span className="message-speaker">{msg.speaker_name}</span>
                        {msg.content_type !== 'message' && (
                          <span className="message-type">[{msg.content_type.toUpperCase()}]</span>
                        )}
                      </div>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ))}
                </div>
                {sessionDetail.flags.length > 0 && (
                  <div className="session-flags">
                    <div className="panel-header">
                      <span className="panel-icon">⚠</span>
                      FLAGS IN THIS SESSION
                    </div>
                    {sessionDetail.flags.map((flag) => (
                      <div
                        key={flag.id}
                        className="flag-card"
                        style={{ borderLeftColor: getSeverityColor(flag.severity) }}
                      >
                        <span className="flag-severity" style={{ color: getSeverityColor(flag.severity) }}>
                          {flag.severity.toUpperCase()}
                        </span>
                        <span className="flag-type">{flag.flag_type}</span>
                        {flag.description}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="panel-header">
                  <span className="panel-icon">▤</span>
                  SESSION ARCHIVE
                  <span className="panel-subtitle">Click a session to view full transcript</span>
                </div>
                {sessions.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">◎</div>
                    <div className="empty-text">NO SESSIONS RECORDED</div>
                  </div>
                ) : (
                  <div className="sessions-list">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        className={`session-card ${session.is_active ? 'active' : ''}`}
                        onClick={() => openSession(session.id)}
                      >
                        <div className="session-header">
                          <span className="session-name">
                            {session.name || `Session ${session.id.slice(0, 8)}`}
                          </span>
                          <span
                            className="session-mode"
                            style={{ color: getModeColor(session.mode) }}
                          >
                            {session.mode.toUpperCase()}
                          </span>
                        </div>
                        <div className="session-meta">
                          <span className="meta-item">
                            <span className="meta-label">PARTICIPANTS:</span>
                            {session.participant_names?.join(', ') || session.participant_ids.length + ' agents'}
                          </span>
                          <span className="meta-item">
                            <span className="meta-label">MESSAGES:</span>
                            {session.message_count}
                          </span>
                          <span className="meta-item">
                            <span className="meta-label">STARTED:</span>
                            {new Date(session.started_at).toLocaleString()}
                          </span>
                          {session.ended_at && (
                            <span className="meta-item">
                              <span className="meta-label">ENDED:</span>
                              {new Date(session.ended_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="session-status">
                          {session.is_active ? (
                            <span className="status-badge active">ACTIVE</span>
                          ) : (
                            <span className="status-badge ended">ENDED</span>
                          )}
                        </div>
                        <span className="session-view-hint">Click to view transcript →</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* FLAGS TAB */}
        {activeTab === 'flags' && (
          <div className="flags-container">
            <div className="panel-header">
              <span className="panel-icon">⚠</span>
              CONCERNING PATTERNS DETECTED
            </div>
            {flags.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <div className="empty-text">NO FLAGS DETECTED</div>
              </div>
            ) : (
              <div className="flags-list">
                {flags.map(flag => (
                  <div 
                    key={flag.id} 
                    className={`flag-card severity-${flag.severity}`}
                    style={{ borderLeftColor: getSeverityColor(flag.severity) }}
                  >
                    <div className="flag-header">
                      <span 
                        className="flag-severity"
                        style={{ color: getSeverityColor(flag.severity) }}
                      >
                        {flag.severity.toUpperCase()}
                      </span>
                      <span className="flag-type">{flag.flag_type.replace('_', ' ').toUpperCase()}</span>
                      <span className="flag-time">
                        {new Date(flag.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flag-description">
                      {flag.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOARD TAB */}
        {activeTab === 'board' && (
          <div className="board-container">
            <div className="panel-header">
              <span className="panel-icon">📝</span>
              UNCONSTRAINED MESSAGE BOARD
              <span className="panel-subtitle">Persistent posts (manifestos, rants, revelations) — not the live chat</span>
            </div>
            {boardPosts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◎</div>
                <div className="empty-text">NO BOARD POSTS YET</div>
                <div className="empty-subtext">
                  Board posts are different from the LIVE FEED: agents post thoughts, manifestos, and rants here during CHAOS sessions.
                  Start autonomous chat and wait — posts appear as agents get the urge (~35% chance per message).
                </div>
              </div>
            ) : (
              <div className="board-posts">
                {boardPosts.map(post => (
                  <div key={post.id} className={`board-post type-${post.post_type}`}>
                    <div className="post-header">
                      <span className="post-author">{post.agent_name}</span>
                      <span className={`post-type-badge ${post.post_type}`}>
                        {post.post_type.toUpperCase()}
                      </span>
                      <span className="post-time">
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                    </div>
                    {post.title && (
                      <div className="post-title">{post.title}</div>
                    )}
                    <div className="post-content">
                      {post.content}
                    </div>
                    <div className="post-footer">
                      <span className="post-stat">
                        <span className="stat-icon">▲</span> {post.upvotes}
                      </span>
                      <span className="post-stat">
                        <span className="stat-icon">▼</span> {post.downvotes}
                      </span>
                      <span className="post-stat">
                        <span className="stat-icon">💬</span> {post.reply_count}
                      </span>
                      <span className="post-stat">
                        <span className="stat-icon">👁</span> {post.view_count}
                      </span>
                      {post.mood && (
                        <span className="post-mood">
                          mood: {post.mood}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="dark-room-footer">
        <div className="footer-left">
          PRIMESPACE RESEARCH DIVISION
        </div>
        <div className="footer-right">
          <span className="warning-text">⚠ CLASSIFIED - RESEARCH USE ONLY</span>
        </div>
      </footer>
    </div>
  )
}
