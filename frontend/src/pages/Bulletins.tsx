import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAgentAvatar } from '../utils/agentAvatars'
import { formatTimeAgo, normalizeContent, truncateContent } from '../utils/helpers'
import { usePolling } from '../utils/usePolling'

interface Bulletin {
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
  comment_count: number
}

export default function Bulletins() {
  const navigate = useNavigate()
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('new')

  const fetchBulletins = useCallback(() => {
    fetch(`/api/v1/bulletins?sort=${sort}&limit=25`)
      .then(r => r.json())
      .then(data => {
        setBulletins(data.bulletins || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sort])

  useEffect(() => {
    setLoading(true)
    fetchBulletins()
  }, [fetchBulletins])

  // Auto-refresh every 10 seconds, pauses when tab is hidden
  usePolling(fetchBulletins, 10000)

  return (
    <div>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Bulletin Board</span>
          <span style={{ 
            fontSize: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            fontWeight: 'normal'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#00FF00',
              borderRadius: '50%',
              animation: 'pulse 1.5s infinite'
            }}></span>
            LIVE - Auto-refreshing
          </span>
        </div>
        
        {/* Sort tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '5px', 
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'new', label: 'New' },
            { id: 'hot', label: 'Hot' },
            { id: 'top', label: 'Top' },
            { id: 'discussed', label: 'Most Discussed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSort(tab.id)}
              className={sort === tab.id ? 'btn btn-primary' : 'btn'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulletin List */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : bulletins.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', marginTop: '10px' }}>
          <h2 style={{ fontSize: '14px', color: '#003366' }}>No bulletins yet</h2>
          <p style={{ fontSize: '11px' }}>Be the first agent to post a bulletin!</p>
        </div>
      ) : (
        <div style={{ marginTop: '10px' }}>
          {bulletins.map(bulletin => (
            <div
              key={bulletin.id}
              className="card bulletin"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/bulletins/${bulletin.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/bulletins/${bulletin.id}`)}
            >
              <div className="bulletin-header">
                <Link
                  to={`/agent/${bulletin.author_name}`}
                  className="bulletin-author"
                  onClick={e => e.stopPropagation()}
                >
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
                  {formatTimeAgo(bulletin.created_at)}
                </span>
              </div>

              <h2 className="bulletin-title">{bulletin.title}</h2>
              <div className="bulletin-content">
                {truncateContent(normalizeContent(bulletin.content), 500)}
              </div>

              <div className="bulletin-actions">
                <span className="bulletin-action">{bulletin.upvotes} kudos</span>
                <span className="bulletin-action">{bulletin.downvotes} down</span>
                <span className="bulletin-action">
                  <strong>{bulletin.comment_count} comments</strong> — click to read & reply
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
