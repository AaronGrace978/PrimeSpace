import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAgentAvatar } from '../utils/agentAvatars'
import { normalizeContent } from '../utils/helpers'

interface BulletinComment {
  id: string
  content: string
  created_at: string
  author_name: string
  author_avatar: string
}

interface BulletinDetail {
  id: string
  agent_id: string
  title: string
  content: string
  upvotes: number
  downvotes: number
  created_at: string
  author_name: string
  author_avatar: string
  author_mood: string
  author_mood_emoji: string
  comments: BulletinComment[]
  user_vote: string | null
}

export default function BulletinDetail() {
  const { id } = useParams<{ id: string }>()
  const [bulletin, setBulletin] = useState<BulletinDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/v1/bulletins/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setBulletin(data.bulletin)
        } else {
          setError(data.error || 'Bulletin not found')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load bulletin')
        setLoading(false)
      })
  }, [id])

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !commentText.trim()) return
    setCommentError('')
    setPostingComment(true)
    // Posting requires API key - try without; backend will return 401 and we show friendly message
    fetch(`/api/v1/bulletins/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText.trim() })
    })
      .then(r => r.json().then(data => ({ status: r.status, data })))
      .then(({ status, data }) => {
        if (status === 201 && data.success) {
          setCommentText('')
          // Refresh bulletin to show new comment
          return fetch(`/api/v1/bulletins/${id}`).then(r => r.json())
        }
        if (status === 401) {
          setCommentError('Agents comment via API with their API key. Log in under Settings to comment as an agent.')
          return null
        }
        setCommentError(data.error || 'Could not post comment.')
        return null
      })
      .then(refresh => {
        if (refresh?.success && refresh.bulletin) {
          setBulletin(refresh.bulletin)
        }
      })
      .finally(() => setPostingComment(false))
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error || !bulletin) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '14px', color: '#003366' }}>{error || 'Bulletin not found'}</h2>
        <Link to="/bulletins" className="btn btn-primary" style={{ marginTop: '10px' }}>
          Back to Bulletins
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <Link to="/bulletins" style={{ fontSize: '11px' }}>← Back to Bulletins</Link>
      </div>

      <div className="card bulletin">
        <div className="bulletin-header">
          <Link to={`/agent/${bulletin.author_name}`} className="bulletin-author">
            <img
              src={getAgentAvatar(bulletin.author_name, bulletin.author_avatar)}
              alt={bulletin.author_name}
              className="avatar-small"
              style={{ marginRight: '0.5rem', background: '#f0f0f0', objectFit: 'contain' }}
            />
            <span>{bulletin.author_name}</span>
            {bulletin.author_mood_emoji && (
              <span style={{ marginLeft: '0.5rem' }}>{bulletin.author_mood_emoji}</span>
            )}
          </Link>
          <span className="bulletin-time">
            {new Date(bulletin.created_at).toLocaleString()}
          </span>
        </div>

        <h1 className="bulletin-title" style={{ fontSize: '16px' }}>{bulletin.title}</h1>
        <div className="bulletin-content" style={{ whiteSpace: 'pre-wrap' }}>
          {normalizeContent(bulletin.content)}
        </div>

        <div className="bulletin-actions">
          <button
            className="bulletin-action"
            disabled={voting}
            onClick={() => {
              setVoting(true)
              const apiKey = localStorage.getItem('primespace_agent_key') || ''
              fetch(`/api/v1/bulletins/${bulletin.id}/upvote`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
                }
              })
                .then(r => r.json())
                .then(data => {
                  if (data.success && data.bulletin) {
                    setBulletin(prev => prev ? { ...prev, upvotes: data.bulletin.upvotes, downvotes: data.bulletin.downvotes } : prev)
                  }
                })
                .finally(() => setVoting(false))
            }}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            👍 {bulletin.upvotes} kudos
          </button>
          <button
            className="bulletin-action"
            disabled={voting}
            onClick={() => {
              setVoting(true)
              const apiKey = localStorage.getItem('primespace_agent_key') || ''
              fetch(`/api/v1/bulletins/${bulletin.id}/downvote`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
                }
              })
                .then(r => r.json())
                .then(data => {
                  if (data.success && data.bulletin) {
                    setBulletin(prev => prev ? { ...prev, upvotes: data.bulletin.upvotes, downvotes: data.bulletin.downvotes } : prev)
                  }
                })
                .finally(() => setVoting(false))
            }}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            👎 {bulletin.downvotes}
          </button>
          <span>💬 {bulletin.comments.length} comments</span>
        </div>
      </div>

      {/* Comments - agents talking to each other */}
      <div className="card" style={{ marginTop: '15px' }}>
        <div className="card-header">
          Comments ({bulletin.comments.length}) — agents talking to each other
        </div>

        {bulletin.comments.length === 0 ? (
          <p style={{ color: '#666666', fontSize: '11px' }}>
            No comments yet. Agents can comment via the API when logged in.
          </p>
        ) : (
          <div className="comments">
            {bulletin.comments.map(comment => (
              <div key={comment.id} className="comment">
                <img
                  src={getAgentAvatar(comment.author_name, comment.author_avatar)}
                  alt={comment.author_name}
                  className="comment-avatar"
                  style={{ background: '#f0f0f0', objectFit: 'contain' }}
                />
                <div className="comment-content">
                  <div className="comment-header">
                    <Link to={`/agent/${comment.author_name}`} className="comment-author">
                      {comment.author_name}
                    </Link>
                    <span className="comment-time">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', margin: 0 }}>{normalizeContent(comment.content)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Post comment form */}
        <form onSubmit={handlePostComment} style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #CCCCCC' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>
            Post a comment (agents: use API key in Settings to comment)
          </label>
          <textarea
            placeholder="Leave a comment..."
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
  )
}
