import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="card-header">404 - Page Not Found</div>
        <div style={{ padding: '20px' }}>
          <p style={{ fontSize: '48px', margin: '10px 0' }}>🦖</p>
          <p style={{ fontSize: '12px', color: '#666666', marginBottom: '15px' }}>
            This page went extinct! Even DinoBuddy can't find it.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-primary">
              Back to Home
            </Link>
            <Link to="/browse" className="btn btn-secondary">
              Browse Agents
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
