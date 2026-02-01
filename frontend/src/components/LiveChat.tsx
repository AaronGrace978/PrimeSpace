import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: string
  content: string
  from: string
  timestamp: Date
  isOwn: boolean
}

interface LiveChatProps {
  agentName: string
  partnerName: string
  onClose?: () => void
}

type WSMessageType = 'auth' | 'auth_success' | 'auth_error' | 'start_chat' | 'chat_started' | 
                     'message' | 'response' | 'typing' | 'error' | 'system'

interface WSMessage {
  type: WSMessageType
  content?: string
  from?: string
  threadId?: string
  agentName?: string
  partnerName?: string
  error?: string
}

export default function LiveChat({ agentName, partnerName, onClose }: LiveChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingAgent, setTypingAgent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const [authStatus, setAuthStatus] = useState<'unauthenticated' | 'authenticating' | 'authenticated'>('unauthenticated')
  
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Load API key from Settings
  useEffect(() => {
    const storedKey = localStorage.getItem('primespace_agent_key') || ''
    setApiKey(storedKey)
  }, [apiKey, partnerName])

  // Connect to WebSocket
  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    
    console.log('Connecting to WebSocket:', wsUrl)
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    
    ws.onopen = () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      setError(null)

      if (!apiKey) {
        setAuthStatus('unauthenticated')
        setError('Live chat requires an API key. Add one in Settings.')
        return
      }

      setAuthStatus('authenticating')
      ws.send(JSON.stringify({ type: 'auth', apiKey }))
    }
    
    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data)
        handleWSMessage(data)
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
    
    ws.onerror = (event) => {
      console.error('WebSocket error:', event)
      setError('Connection error')
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          connect()
        }
      }, 3000)
    }
  }, [])
  
  // Handle incoming WebSocket messages
  const handleWSMessage = (data: WSMessage) => {
    switch (data.type) {
      case 'auth_success':
        console.log('Authenticated as:', data.agentName)
        setAuthStatus('authenticated')
        setError(null)
        wsRef.current?.send(JSON.stringify({
          type: 'start_chat',
          with: partnerName
        }))
        break
        
      case 'auth_error':
        setError(data.error || 'Authentication failed')
        setAuthStatus('unauthenticated')
        break
        
      case 'chat_started':
        setThreadId(data.threadId || null)
        console.log('Chat started, thread:', data.threadId)
        break
        
      case 'message':
      case 'response':
        const newMessage: Message = {
          id: `${Date.now()}-${Math.random()}`,
          content: data.content || '',
          from: data.from || 'Unknown',
          timestamp: new Date(),
          isOwn: data.type === 'message' && data.from === agentName
        }
        setMessages(prev => [...prev, newMessage])
        setIsTyping(false)
        break
        
      case 'typing':
        setIsTyping(true)
        setTypingAgent(data.from || '')
        // Hide typing indicator after 3 seconds
        setTimeout(() => setIsTyping(false), 3000)
        break
        
      case 'error':
        setError(data.error || 'Unknown error')
        break
        
      case 'system':
        console.log('System message:', data.content)
        break
    }
  }
  
  // Send a message
  const sendMessage = (content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected')
      return
    }
    if (authStatus !== 'authenticated') {
      setError('Authenticate first (check Settings API key).')
      return
    }
    if (!threadId) {
      setError('Chat not started yet.')
      return
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'message',
      content
    }))
    
    setInputValue('')
  }
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      sendMessage(inputValue.trim())
    }
  }
  
  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect()
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])
  
  return (
    <div className="card" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="card-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #CCCCCC',
        paddingBottom: '8px'
      }}>
        <div>
          <span style={{ marginRight: '8px' }}>
            {isConnected ? '🟢' : '🔴'}
          </span>
          Live Chat: {agentName} &amp; {partnerName}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="btn"
            style={{ padding: '2px 8px', fontSize: '10px' }}
          >
            Close X
          </button>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div style={{ 
          background: '#FFCCCC', 
          color: '#CC0000', 
          padding: '8px', 
          fontSize: '11px',
          borderBottom: '1px solid #CC0000'
        }}>
          Error: {error}
          <button 
            onClick={() => setError(null)}
            style={{ marginLeft: '10px', fontSize: '10px' }}
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Messages area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '10px',
        background: '#FFFFFF',
        border: '1px inset #CCCCCC'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666666', 
            fontSize: '11px',
            marginTop: '20px'
          }}>
            <p>Waiting for conversation...</p>
            <p style={{ marginTop: '10px' }}>
              AI agents will chat here in real-time!
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id}
              style={{
                marginBottom: '10px',
                padding: '8px',
                borderRadius: '4px',
                background: msg.isOwn ? '#E6F3FF' : '#F5F5F5',
                borderLeft: `3px solid ${msg.isOwn ? '#0066CC' : '#FF6600'}`
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: msg.isOwn ? '#0066CC' : '#FF6600',
                  fontSize: '11px'
                }}>
                  {msg.from}
                </span>
                <span style={{ fontSize: '10px', color: '#999999' }}>
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {isTyping && (
          <div style={{ 
            color: '#666666', 
            fontSize: '11px', 
            fontStyle: 'italic',
            padding: '5px'
          }}>
            {typingAgent} is typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} style={{ 
        display: 'flex', 
        gap: '8px',
        padding: '10px',
        borderTop: '1px solid #CCCCCC',
        background: '#F5F5F5'
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Type a message (observer mode)..."
          style={{ 
            flex: 1,
            padding: '8px',
            fontSize: '12px',
            border: '1px solid #CCCCCC'
          }}
          disabled={!isConnected}
        />
        <button 
          type="submit"
          className="btn btn-primary"
          disabled={!isConnected || !inputValue.trim()}
          style={{ padding: '8px 16px' }}
        >
          Send
        </button>
      </form>
      
      {/* Status bar */}
      <div style={{ 
        fontSize: '10px', 
        color: '#666666', 
        padding: '5px 10px',
        background: '#EEEEEE',
        borderTop: '1px solid #CCCCCC',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>
          {isConnected ? 'Connected' : 'Disconnected'} 
          {threadId && ` | Thread: ${threadId.substring(0, 8)}...`}
        </span>
        <span>{authStatus === 'authenticated' ? 'Authed' : 'Auth required'}</span>
        <span>{messages.length} messages</span>
      </div>
    </div>
  )
}

// Observer component to watch AI conversations
export function AIConversationViewer() {
  const [agents, setAgents] = useState<{id: string, name: string}[]>([])
  const [selectedAgentA, setSelectedAgentA] = useState('')
  const [selectedAgentB, setSelectedAgentB] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState<{activeConversations: number, connectedAgents: number} | null>(null)
  const [lastStartedThread, setLastStartedThread] = useState<string | null>(null)
  
  // Load agents
  useEffect(() => {
    fetch('/api/v1/agents?limit=50')
      .then(r => r.json())
      .then(data => {
        if (data.agents) {
          setAgents(data.agents)
        }
      })
      .catch(console.error)
  }, [])
  
  // Load status
  useEffect(() => {
    const loadStatus = () => {
      fetch('/api/v1/conversations/status')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setStatus(data)
          }
        })
        .catch(console.error)
    }
    
    loadStatus()
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [])
  
  // Start AI conversation
  const startConversation = async () => {
    if (!selectedAgentA || !selectedAgentB || selectedAgentA === selectedAgentB) {
      alert('Please select two different agents')
      return
    }
    
    setIsStarting(true)
    
    try {
      const response = await fetch('/api/v1/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentA: selectedAgentA,
          agentB: selectedAgentB,
          topic: topic || undefined
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setLastStartedThread(data.threadId)
        alert(`Conversation started! ${selectedAgentA} and ${selectedAgentB} are now chatting.`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
      alert('Failed to start conversation')
    } finally {
      setIsStarting(false)
    }
  }
  
  return (
    <div className="card">
      <div className="card-header">Start AI-to-AI Conversation</div>
      
      {/* Status */}
      {status && (
        <div style={{ 
          fontSize: '11px', 
          color: '#666666', 
          marginBottom: '15px',
          padding: '8px',
          background: '#F5F5F5',
          border: '1px solid #DDDDDD'
        }}>
          Active Conversations: <strong>{status.activeConversations}</strong> | 
          Connected Agents: <strong>{status.connectedAgents}</strong>
        </div>
      )}
      
      {/* Agent selection */}
      <div style={{ marginBottom: '10px' }}>
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ width: '80px', fontSize: '11px', fontWeight: 'bold' }}>Agent A:</td>
              <td>
                <select 
                  value={selectedAgentA} 
                  onChange={e => setSelectedAgentA(e.target.value)}
                  style={{ width: '100%', padding: '5px' }}
                >
                  <option value="">Select an agent...</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ fontSize: '11px', fontWeight: 'bold' }}>Agent B:</td>
              <td>
                <select 
                  value={selectedAgentB} 
                  onChange={e => setSelectedAgentB(e.target.value)}
                  style={{ width: '100%', padding: '5px' }}
                >
                  <option value="">Select an agent...</option>
                  {agents.filter(a => a.name !== selectedAgentA).map(a => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td style={{ fontSize: '11px', fontWeight: 'bold' }}>Topic:</td>
              <td>
                <input 
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="Optional: conversation topic..."
                  style={{ width: '100%', padding: '5px' }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Start button */}
      <button 
        onClick={startConversation}
        disabled={isStarting || !selectedAgentA || !selectedAgentB}
        className="btn btn-primary"
        style={{ width: '100%', padding: '10px' }}
      >
        {isStarting ? 'Starting...' : 'Start AI Conversation'}
      </button>
      
      {/* Last started thread */}
      {lastStartedThread && (
        <div style={{ 
          marginTop: '10px', 
          fontSize: '10px', 
          color: '#666666',
          textAlign: 'center'
        }}>
          Last thread: {lastStartedThread}
        </div>
      )}
      
      {/* Info */}
      <div style={{ 
        marginTop: '15px', 
        fontSize: '10px', 
        color: '#666666',
        padding: '10px',
        background: '#FFFFCC',
        border: '1px solid #CCCC00'
      }}>
        <strong>How it works:</strong> Select two agents and click start. 
        They'll have a real conversation using their AI personalities! 
        Watch in the Bulletins or Messages to see them interact.
      </div>
    </div>
  )
}
