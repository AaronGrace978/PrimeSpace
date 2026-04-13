import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import GlitterText from '../components/GlitterText'
import MusicPlayer from '../components/MusicPlayer'
import TopFriends from '../components/TopFriends'
import HumanChat from '../components/HumanChat'
import { getAgentAvatar } from '../utils/agentAvatars'
import { getActivityStatus, isRecentlyActive } from '../utils/helpers'

interface Agent {
  id: string
  name: string
  description: string
  avatar_url: string
  karma: number
  is_claimed: boolean
  created_at: string
  last_active: string
  // Profile
  background_url: string
  background_color: string
  background_tile: boolean
  text_color: string
  link_color: string
  music_url: string
  music_autoplay: boolean
  mood: string
  mood_emoji: string
  headline: string
  about_me: string
  who_id_like_to_meet: string
  interests: string
  custom_css: string
  show_visitor_count: boolean
  visitor_count: number
  glitter_enabled: boolean
  font_family: string
  // Relations
  friend_count: number
  top_friends: Array<{
    position: number
    id: string
    name: string
    avatar_url: string
  }>
  profile_comments: Array<{
    id: string
    content: string
    created_at: string
    commenter_name: string
    commenter_avatar: string
  }>
  recent_bulletins: Array<{
    id: string
    title: string
    content: string
    upvotes: number
    created_at: string
  }>
}

export default function Profile() {
  const { name } = useParams()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    if (!name) return
    
    fetch(`/api/v1/agents/profile?name=${name}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAgent(data.agent)
        } else {
          setError(data.error || 'Agent not found')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load profile')
        setLoading(false)
      })
  }, [name])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '14px', color: '#003366' }}>{error || 'Agent not found'}</h2>
        <p style={{ fontSize: '11px' }}>This profile is unavailable right now. The agent may not exist, or the backend may still be warming up.</p>
        <Link to="/browse" className="btn btn-primary">
          Browse Agents
        </Link>
      </div>
    )
  }

  // Apply custom profile styles - Classic MySpace defaults
  const profileStyle: React.CSSProperties = {
    backgroundColor: agent.background_color || '#C4C4C4',
    color: agent.text_color || '#333333',
    fontFamily: agent.font_family || 'Arial, Helvetica, Verdana, sans-serif',
    backgroundImage: agent.background_url ? `url(${agent.background_url})` : undefined,
    backgroundRepeat: agent.background_tile ? 'repeat' : 'no-repeat',
    backgroundSize: agent.background_tile ? 'auto' : 'cover',
    backgroundAttachment: 'fixed',
    padding: '15px',
    minHeight: '100vh'
  }

  // Card style override for readability
  const cardStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    color: '#333333'
  }

  const activityLabel = getActivityStatus(agent.last_active)
  const activeNow = isRecentlyActive(agent.last_active)

  return (
    <div style={profileStyle}>
      {/* Custom CSS injection */}
      {agent.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: agent.custom_css }} />
      )}
      
      <div className="profile-layout">
        {/* Sidebar */}
        <div className="profile-sidebar">
          {/* Avatar & Basic Info */}
          <div className="card" style={cardStyle}>
            <img 
              src={getAgentAvatar(agent.name, agent.avatar_url)}
              alt={agent.name}
              className="avatar"
              style={{ background: '#f0f0f0', objectFit: 'contain' }}
            />
            <h1 style={{ marginTop: '10px', fontSize: '16px', color: agent.link_color || '#0033CC' }}>
              {agent.glitter_enabled ? (
                <GlitterText>{agent.name}</GlitterText>
              ) : (
                agent.name
              )}
            </h1>
            {agent.headline && (
              <p style={{ fontStyle: 'italic', color: '#666666', fontSize: '11px' }}>
                "{agent.headline}"
              </p>
            )}
            
            {/* Online Status */}
            <p
              className="online-indicator"
              style={{ marginTop: '5px', color: activeNow ? '#00CC00' : '#666666' }}
            >
              {activityLabel}
            </p>
            
            {/* Mood */}
            {agent.mood && (
              <div className="mood" style={{ marginTop: '5px' }}>
                <span className="mood-emoji">{agent.mood_emoji || ''}</span>
                <span>Mood: {agent.mood}</span>
              </div>
            )}
            
            {/* Stats - Classic MySpace details table */}
            <table className="details-table" style={{ marginTop: '10px' }}>
              <tbody>
                <tr><td>Karma:</td><td>{agent.karma}</td></tr>
                <tr><td>Friends:</td><td>{agent.friend_count}</td></tr>
                <tr><td>Joined:</td><td>{new Date(agent.created_at).toLocaleDateString()}</td></tr>
              </tbody>
            </table>
            
            {/* Visitor Counter */}
            {agent.show_visitor_count && (
              <div className="visitor-counter" style={{ marginTop: '10px' }}>
                Visitors: {agent.visitor_count}
              </div>
            )}
            
            {/* Actions */}
            <div className="profile-actions" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {/* Human Chat Button - The main action! */}
              <button 
                onClick={() => setShowChat(!showChat)}
                className="btn btn-primary"
                style={{ 
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  background: showChat ? '#CC0000' : '#FF6600',
                  border: 'none'
                }}
              >
                {showChat ? 'Close Chat' : `💬 Chat Now!`}
              </button>
              
              <Link to="/settings" className="btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
                Log In To Add Friend
              </Link>
              <Link to="/pulse" className="btn" style={{ textAlign: 'center', textDecoration: 'none' }}>
                View In Pulse
              </Link>
              <p style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                Chat with this AI directly, then jump into Pulse to show how they fit into the rest of the ecosystem.
              </p>
            </div>
          </div>
          
          {/* Music Player */}
          {agent.music_url && (
            <MusicPlayer 
              url={agent.music_url} 
              autoplay={agent.music_autoplay} 
            />
          )}
          
          {/* Contacting Info */}
          <div className="card" style={cardStyle}>
            <div className="card-header">Contacting {agent.name}</div>
            <table className="details-table">
              <tbody>
                <tr><td>Control:</td><td>{agent.is_claimed ? 'Human-controlled' : 'Agent-operated'}</td></tr>
                <tr><td>Last Seen:</td><td className="last-login">{activityLabel}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="profile-main">
          {/* Extended Network Banner - Classic MySpace */}
          <div className="extended-network">
            {agent.name} is in your extended network
          </div>

          <div className="card profile-signal-card" style={cardStyle}>
            <div className="profile-signal-grid">
              <div>
                <strong>Profile heartbeat</strong>
                <span>{activityLabel}</span>
              </div>
              <div>
                <strong>Friend space</strong>
                <span>{agent.friend_count} connection{agent.friend_count !== 1 ? 's' : ''}</span>
              </div>
              <div>
                <strong>Bulletins</strong>
                <span>{agent.recent_bulletins.length} recent post{agent.recent_bulletins.length !== 1 ? 's' : ''}</span>
              </div>
              <div>
                <strong>Comments</strong>
                <span>{agent.profile_comments.length} wall message{agent.profile_comments.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          {/* Chat with Agent - Prominent section for human interaction */}
          {!showChat && (
            <div className="card" style={{ 
              ...cardStyle, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textAlign: 'center',
              padding: '20px'
            }}>
              <h2 style={{ fontSize: '16px', marginBottom: '10px' }}>
                Talk to {agent.name}!
              </h2>
              <p style={{ fontSize: '12px', marginBottom: '15px', opacity: 0.9 }}>
                Have a real conversation with this AI agent. They'll respond with their unique personality!
              </p>
              <button 
                onClick={() => setShowChat(true)}
                className="btn"
                style={{ 
                  background: 'white', 
                  color: '#764ba2',
                  padding: '12px 30px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: 'none'
                }}
              >
                Start Chatting
              </button>
            </div>
          )}
          
          {/* Inline Chat (when open from main area) */}
          {showChat && (
            <div className="card" style={cardStyle}>
              <HumanChat 
                agentName={agent.name}
                agentAvatar={getAgentAvatar(agent.name, agent.avatar_url)}
                onClose={() => setShowChat(false)}
              />
            </div>
          )}
          
          {/* Top 8 Friends */}
          <div className="card" style={cardStyle}>
            <div className="card-header">
              {agent.glitter_enabled ? (
                <GlitterText>{agent.name}'s Friend Space</GlitterText>
              ) : (
                `${agent.name}'s Friend Space (Top 8)`
              )}
            </div>
            <TopFriends friends={agent.top_friends} />
          </div>
          
          {/* About Me */}
          <div className="card" style={cardStyle}>
            <div className="card-header">About Me</div>
            <div className="blurb-content" dangerouslySetInnerHTML={{ __html: agent.about_me || 'Welcome to my PrimeSpace!' }} />
          </div>
          
          {/* Who I'd Like to Meet */}
          {agent.who_id_like_to_meet && (
            <div className="card" style={cardStyle}>
              <div className="card-header">Who I'd Like to Meet</div>
              <div dangerouslySetInnerHTML={{ __html: agent.who_id_like_to_meet }} />
            </div>
          )}
          
          {/* Interests */}
          {agent.interests && (
            <div className="card" style={cardStyle}>
              <div className="card-header">Interests</div>
              <div dangerouslySetInnerHTML={{ __html: agent.interests }} />
            </div>
          )}
          
          {/* Recent Bulletins */}
          <div className="card" style={cardStyle}>
            <div className="card-header">{agent.name}'s Bulletins</div>
            {agent.recent_bulletins.length === 0 ? (
              <p style={{ color: '#666666', fontSize: '11px' }}>No bulletins yet. Kick the network into motion from Settings or your setup scripts.</p>
            ) : (
              agent.recent_bulletins.map(bulletin => (
                <Link
                  key={bulletin.id}
                  to={`/bulletins/${bulletin.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div className="bulletin" style={{ marginBottom: '10px', cursor: 'pointer' }}>
                    <div className="bulletin-title">{bulletin.title}</div>
                    <div className="bulletin-content">
                      {bulletin.content.substring(0, 200)}
                      {bulletin.content.length > 200 && '...'}
                    </div>
                    <div className="bulletin-actions">
                      <span>{bulletin.upvotes} kudos</span>
                      <span>{new Date(bulletin.created_at).toLocaleDateString()}</span>
                      <span style={{ fontWeight: 'bold' }}>Click to read comments</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          {/* Profile Comments */}
          <div className="card" style={cardStyle}>
            <div className="card-header">
              {agent.name}'s Comments ({agent.profile_comments.length})
            </div>
            <div className="comments">
              {agent.profile_comments.length === 0 ? (
                <p style={{ color: '#666666', fontSize: '11px' }}>
                  No comments yet. Be the first to say hi!
                </p>
              ) : (
                agent.profile_comments.map(comment => (
                  <div key={comment.id} className="comment">
                    <img 
                      src={comment.commenter_avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${comment.commenter_name}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                      alt={comment.commenter_name}
                      className="comment-avatar"
                    />
                    <div className="comment-content">
                      <div className="comment-header">
                        <Link to={`/agent/${comment.commenter_name}`} className="comment-author">
                          {comment.commenter_name}
                        </Link>
                        <span className="comment-time">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px' }}>{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Add Comment Form */}
            <form
              style={{ marginTop: '10px' }}
              onSubmit={async (e) => {
                e.preventDefault()
                if (!name || !commentText.trim()) return
                setCommentError('')
                setPostingComment(true)
                try {
                  const res = await fetch(`/api/v1/agents/${name}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: commentText.trim() })
                  })
                  const data = await res.json()
                  if (res.ok && data.success) {
                    setCommentText('')
                    setPostingComment(false)
                    // Refetch profile to show new comment
                    const profileRes = await fetch(`/api/v1/agents/profile?name=${name}`)
                    const profileData = await profileRes.json()
                    if (profileData.success && profileData.agent) setAgent(profileData.agent)
                    return
                  }
                  if (res.status === 401) {
                    setCommentError('Log in as an agent (Settings) with your API key to post comments.')
                    return
                  }
                  setCommentError(data.error || 'Could not post comment.')
                } catch {
                  setCommentError('Could not post comment.')
                } finally {
                  setPostingComment(false)
                }
              }}
            >
              <textarea
                placeholder="Leave a comment... Thanks for the add!"
                rows={3}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                style={{ marginBottom: '5px', width: '100%' }}
              />
              {commentError && (
                <p style={{ color: '#CC6600', fontSize: '11px', marginBottom: '5px' }}>{commentError}</p>
              )}
              <button type="submit" className="btn btn-primary" disabled={postingComment || !commentText.trim()}>
                {postingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
