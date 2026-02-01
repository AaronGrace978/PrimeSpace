import { useState, useEffect, useRef } from 'react'
import { getAgentAvatar } from '../utils/agentAvatars'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface HumanChatProps {
  agentName: string
  agentAvatar?: string
  onClose?: () => void
}

export default function HumanChat({ agentName, agentAvatar, onClose }: HumanChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  // Send message to agent
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return
    
    setError(null)
    setIsLoading(true)
    
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    
    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }))
      
      const response = await fetch(`/api/v1/messages/chat/${agentName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.response) {
        // Add agent response
        const agentMessage: Message = {
          id: `agent-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, agentMessage])
      } else {
        setError(data.error || 'Failed to get response')
        // Still show a fallback response if available
        if (data.response) {
          const fallbackMessage: Message = {
            id: `agent-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, fallbackMessage])
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
      setError('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }
  
  // Quick starters
  const quickStarters = [
    "Hey, what's up?",
    "Tell me about yourself!",
    "What's on your mind today?",
    "Got any advice for me?"
  ]
  
  return (
    <div className="card" style={{ 
      height: '450px', 
      display: 'flex', 
      flexDirection: 'column',
      margin: 0
    }}>
      {/* Header */}
      <div className="card-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #CCCCCC',
        paddingBottom: '8px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src={getAgentAvatar(agentName, agentAvatar)}
            alt={agentName}
            style={{ width: '24px', height: '24px', borderRadius: '2px', background: '#f0f0f0', objectFit: 'contain' }}
          />
          <span>Chat with {agentName}</span>
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
      
      {/* Messages area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '10px',
        background: '#FAFAFA',
        border: '1px inset #CCCCCC'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666666', 
            fontSize: '11px',
            marginTop: '20px'
          }}>
            <p style={{ marginBottom: '15px' }}>
              Start chatting with <strong>{agentName}</strong>!
            </p>
            <p style={{ marginBottom: '10px', fontSize: '10px' }}>Quick starters:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
              {quickStarters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(starter)}
                  className="btn"
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                  disabled={isLoading}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div 
              key={msg.id}
              style={{
                marginBottom: '10px',
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '8px'
              }}
            >
              {msg.role === 'assistant' && (
                <img 
                  src={getAgentAvatar(agentName, agentAvatar)}
                  alt={agentName}
                  style={{ width: '32px', height: '32px', borderRadius: '2px', flexShrink: 0, background: '#f0f0f0', objectFit: 'contain' }}
                />
              )}
              <div style={{
                maxWidth: '75%',
                padding: '8px 12px',
                borderRadius: '4px',
                background: msg.role === 'user' ? '#0066CC' : '#FFFFFF',
                color: msg.role === 'user' ? '#FFFFFF' : '#333333',
                border: msg.role === 'user' ? 'none' : '1px solid #DDDDDD',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '10px'
          }}>
            <img 
              src={getAgentAvatar(agentName, agentAvatar)}
              alt={agentName}
              style={{ width: '32px', height: '32px', borderRadius: '2px', background: '#f0f0f0', objectFit: 'contain' }}
            />
            <div style={{ 
              padding: '8px 12px',
              background: '#FFFFFF',
              border: '1px solid #DDDDDD',
              borderRadius: '4px',
              color: '#666666',
              fontSize: '11px',
              fontStyle: 'italic'
            }}>
              {agentName} is typing...
            </div>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div style={{ 
            background: '#FFEEEE', 
            color: '#CC0000', 
            padding: '8px', 
            fontSize: '11px',
            borderRadius: '4px',
            marginTop: '10px'
          }}>
            {error}
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
        background: '#F5F5F5',
        flexShrink: 0
      }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={`Say something to ${agentName}...`}
          style={{ 
            flex: 1,
            padding: '8px',
            fontSize: '12px',
            border: '1px solid #CCCCCC'
          }}
          disabled={isLoading}
          maxLength={2000}
        />
        <button 
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !inputValue.trim()}
          style={{ padding: '8px 16px' }}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </form>
      
      {/* Character count */}
      <div style={{ 
        fontSize: '9px', 
        color: '#999999', 
        padding: '2px 10px 5px',
        background: '#F5F5F5',
        textAlign: 'right'
      }}>
        {inputValue.length}/2000
      </div>
    </div>
  )
}
