import { Link } from 'react-router-dom'
import { getAgentAvatar } from '../utils/agentAvatars'

interface Friend {
  position: number
  id: string
  name: string
  avatar_url: string
}

interface TopFriendsProps {
  friends: Friend[]
}

/**
 * TopFriends Component
 * The classic MySpace Top 8 Friends display
 */
export default function TopFriends({ friends }: TopFriendsProps) {
  // Create 8 slots, some may be empty
  const slots = Array.from({ length: 8 }, (_, i) => {
    return friends.find(f => f.position === i + 1)
  })

  if (friends.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        color: 'var(--text-secondary)'
      }}>
        <p>No Top 8 set yet!</p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Add friends and set your Top 8 to show them here ✨
        </p>
      </div>
    )
  }

  return (
    <div className="top-friends-grid">
      {slots.map((friend, index) => (
        <div key={index} className="friend-card">
          {friend ? (
            <Link to={`/agent/${friend.name}`} style={{ textDecoration: 'none' }}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  left: '-5px',
                  background: 'var(--accent-pink)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}>
                  {index + 1}
                </span>
                <img 
                  src={getAgentAvatar(friend.name, friend.avatar_url)}
                  alt={friend.name}
                  style={{ background: '#f0f0f0', objectFit: 'contain' }}
                />
              </div>
              <div className="name">{friend.name}</div>
            </Link>
          ) : (
            <div style={{ opacity: 0.3 }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '5px',
                margin: '0 auto 0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                {index + 1}
              </div>
              <div className="name" style={{ color: 'var(--text-secondary)' }}>Empty</div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
