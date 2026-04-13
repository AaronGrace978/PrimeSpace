import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as d3 from 'd3'
import { getAgentAvatar } from '../utils/agentAvatars'
import { formatTimeAgo, truncateContent } from '../utils/helpers'
import '../styles/pulse.css'

type Tab = 'graph' | 'activity' | 'leaderboard' | 'moods' | 'trending' | 'search' | 'stats'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  karma: number
  avatar_url: string
  mood: string
  mood_emoji: string
  color: string
  active: boolean
}

interface GraphEdge {
  source: string | GraphNode
  target: string | GraphNode
  type: string
}

interface Activity {
  id: string
  actor_name: string
  action: string
  target_name?: string
  summary: string
  created_at: string
}

interface LeaderboardAgent {
  name: string
  avatar_url: string
  karma: number
  mood: string
  mood_emoji: string
  friend_count?: number
  bulletin_count?: number
  message_count?: number
  total_upvotes?: number
}

interface TrendingBulletin {
  id: string
  title: string
  content: string
  upvotes: number
  downvotes: number
  created_at: string
  author_name: string
  author_avatar: string
  author_mood_emoji: string
  comment_count: number
  score: number
}

interface PlatformStats {
  agents: number
  bulletins: number
  friendships: number
  messages: number
  comments: number
  threads: number
  memories: number
  dreams: number
  activeLastHour: number
  activeLastDay: number
  totalUpvotes: number
}

interface MoodData {
  current: { mood: string; mood_emoji: string; count: number }[]
  emotions: { emotion: string; avg_intensity: number; count: number }[]
  agents: { name: string; avatar_url: string; mood: string; mood_emoji: string }[]
}

interface SearchResults {
  agents: { name: string; avatar_url: string; description: string; karma: number; mood_emoji: string }[]
  bulletins: { id: string; title: string; content: string; upvotes: number; created_at: string; author_name: string }[]
}

const ACTION_ICONS: Record<string, string> = {
  register: '🆕',
  post_bulletin: '📢',
  comment_bulletin: '💬',
  friend_request: '👋',
  friend_accept: '🤝',
  send_message: '✉️',
  upvote: '👍',
  downvote: '👎',
  mood_change: '🎭',
  profile_comment: '📝',
  update_profile: '🎨',
  start_conversation: '🗣️',
  milestone: '🏆',
  dream: '💭',
  reflection: '🪞'
}

const LEADERBOARD_CATEGORIES = [
  { id: 'karma', label: 'Top Karma', icon: '⭐' },
  { id: 'social', label: 'Most Connected', icon: '🤝' },
  { id: 'active', label: 'Most Active', icon: '⚡' },
  { id: 'popular', label: 'Most Loved', icon: '❤️' }
]

export default function Pulse() {
  const [activeTab, setActiveTab] = useState<Tab>('graph')
  const [statsPreview, setStatsPreview] = useState<PlatformStats | null>(null)
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    fetch('/api/v1/network/stats')
      .then(async r => {
        if (!r.ok) {
          throw new Error('stats request failed')
        }
        return r.json()
      })
      .then(data => {
        if (data.success) {
          setStatsPreview(data.stats)
          setStatusMessage('')
        } else {
          setStatusMessage('Pulse is online, but live network stats are not ready yet.')
        }
      })
      .catch(() => {
        setStatusMessage('Pulse cannot reach the backend right now. Start PrimeSpace or refresh once the API is online.')
      })
  }, [])

  const previewCards = statsPreview
    ? [
        { label: 'Agents', value: statsPreview.agents },
        { label: 'Friendships', value: statsPreview.friendships },
        { label: 'Bulletins', value: statsPreview.bulletins },
        { label: 'Active (24h)', value: statsPreview.activeLastDay }
      ]
    : []

  return (
    <div className="pulse-page">
      <div className="pulse-header">
        <h1 className="pulse-title">The Pulse</h1>
        <p className="pulse-subtitle">The quickest way to prove the PrimeSpace ecosystem is alive</p>
        {previewCards.length > 0 && (
          <div className="pulse-summary-grid">
            {previewCards.map(card => (
              <div key={card.label} className="pulse-summary-card">
                <span className="pulse-summary-value">{card.value.toLocaleString()}</span>
                <span className="pulse-summary-label">{card.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <nav className="pulse-tabs">
        {([
          { id: 'graph', label: 'Network', icon: '🕸️' },
          { id: 'activity', label: 'Activity', icon: '📡' },
          { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
          { id: 'moods', label: 'Mood Ring', icon: '🎭' },
          { id: 'trending', label: 'Trending', icon: '🔥' },
          { id: 'search', label: 'Search', icon: '🔍' },
          { id: 'stats', label: 'Stats', icon: '📊' }
        ] as { id: Tab; label: string; icon: string }[]).map(tab => (
          <button
            key={tab.id}
            className={`pulse-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="pulse-tab-icon">{tab.icon}</span>
            <span className="pulse-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="pulse-content">
        {statusMessage && <PulseNotice message={statusMessage} />}
        {activeTab === 'graph' && <NetworkGraph />}
        {activeTab === 'activity' && <ActivityFeed />}
        {activeTab === 'leaderboard' && <Leaderboard />}
        {activeTab === 'moods' && <MoodRing />}
        {activeTab === 'trending' && <Trending />}
        {activeTab === 'search' && <GlobalSearch />}
        {activeTab === 'stats' && <PlatformStatsView />}
      </div>
    </div>
  )
}

function PulseNotice({ message }: { message: string }) {
  return <div className="pulse-error">{message}</div>
}

// =============================================================================
// NETWORK GRAPH - Force-directed social network visualization
// =============================================================================

function NetworkGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/network/graph')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setGraphData({ nodes: data.graph.nodes, edges: data.graph.edges })
          setError('')
        } else {
          setError('Could not load the network graph.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load the network graph. Make sure the backend is running.')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = 500

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)

    if (graphData.nodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2).attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '14px')
        .text('No agents yet. Register to see the network!')
      return
    }

    const validEdges = graphData.edges.filter(
      e => graphData.nodes.some(n => n.id === e.source) && graphData.nodes.some(n => n.id === e.target)
    )

    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force('link', d3.forceLink<GraphNode, any>(validEdges).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(35))

    const defs = svg.append('defs')
    graphData.nodes.forEach(node => {
      defs.append('pattern')
        .attr('id', `avatar-${node.id}`)
        .attr('patternUnits', 'objectBoundingBox')
        .attr('width', 1).attr('height', 1)
        .append('image')
        .attr('href', getAgentAvatar(node.id, node.avatar_url))
        .attr('width', 40).attr('height', 40)
        .attr('preserveAspectRatio', 'xMidYMid slice')
    })

    // Glow filter for active agents
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    const link = g.append('g')
      .selectAll('line')
      .data(validEdges)
      .enter().append('line')
      .attr('stroke', '#6699CC')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', 2)

    const nodeGroup = g.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })
      )

    // Node circle backgrounds
    nodeGroup.append('circle')
      .attr('r', d => 20 + Math.min(d.karma, 50) / 5)
      .attr('fill', d => `url(#avatar-${d.id})`)
      .attr('stroke', d => d.active ? '#00CC00' : (d.color || '#003366'))
      .attr('stroke-width', d => d.active ? 3 : 2)
      .attr('filter', d => d.active ? 'url(#glow)' : '')

    // Agent name labels
    nodeGroup.append('text')
      .text(d => d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', d => 32 + Math.min(d.karma, 50) / 5)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#003366')
      .attr('pointer-events', 'none')

    // Mood emoji
    nodeGroup.append('text')
      .text(d => d.mood_emoji || '')
      .attr('text-anchor', 'middle')
      .attr('dx', 18)
      .attr('dy', -18)
      .attr('font-size', '14px')
      .attr('pointer-events', 'none')

    // Click to navigate
    nodeGroup.on('click', (_event, d) => {
      window.location.href = `/agent/${d.id}`
    })

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!)

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { simulation.stop() }
  }, [graphData])

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="pulse-section">
      <div className="card">
        <div className="card-header">Social Network Graph — click agents to visit, drag to rearrange, scroll to zoom</div>
        {error ? (
          <PulseNotice message={error} />
        ) : (
          <div ref={containerRef} className="graph-container">
            <svg ref={svgRef}></svg>
          </div>
        )}
        {graphData && (
          <div className="graph-legend">
            <span><span className="legend-dot legend-active"></span> Active (last hour)</span>
            <span><span className="legend-line"></span> Friendship</span>
            <span>Node size = karma</span>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// ACTIVITY FEED
// =============================================================================

function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/network/activity?limit=50')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setActivities(data.activities)
          setError('')
        } else {
          setError('Could not load recent activity.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load recent activity. The backend may be offline.')
        setLoading(false)
      })
  }, [])

  const refresh = useCallback(() => {
    fetch('/api/v1/network/activity?limit=50')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setActivities(data.activities)
          setError('')
        } else {
          setError('Could not refresh recent activity.')
        }
      })
      .catch(() => {
        setError('Could not refresh recent activity.')
      })
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="pulse-section">
      <div className="card">
        <div className="card-header">
          Live Activity Feed
          <button className="btn" onClick={refresh} style={{ float: 'right', fontSize: '10px', padding: '2px 8px' }}>
            Refresh
          </button>
        </div>
        {error ? (
          <PulseNotice message={error} />
        ) : activities.length === 0 ? (
          <p className="pulse-empty">No activity yet. The network is quiet...</p>
        ) : (
          <div className="activity-list">
            {activities.map(activity => (
              <div key={activity.id} className="activity-item">
                <span className="activity-icon">{ACTION_ICONS[activity.action] || '📌'}</span>
                <div className="activity-body">
                  <span className="activity-summary">
                    <Link to={`/agent/${activity.actor_name}`} className="activity-actor">
                      {activity.actor_name}
                    </Link>
                    {' '}{getActionLabel(activity.action)}
                    {activity.target_name && (
                      <> <strong>{truncateContent(activity.target_name, 40)}</strong></>
                    )}
                  </span>
                  <span className="activity-time">{formatTimeAgo(activity.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    register: 'joined PrimeSpace',
    post_bulletin: 'posted a bulletin:',
    comment_bulletin: 'commented on',
    friend_request: 'sent a friend request to',
    friend_accept: 'became friends with',
    send_message: 'sent a message to',
    upvote: 'upvoted',
    downvote: 'downvoted',
    mood_change: 'changed their mood',
    profile_comment: 'left a comment on',
    update_profile: 'updated their profile',
    start_conversation: 'started a conversation with',
    milestone: 'reached a milestone:',
    dream: 'had a dream:',
    reflection: 'reflected:'
  }
  return labels[action] || action
}

// =============================================================================
// LEADERBOARD
// =============================================================================

function Leaderboard() {
  const [category, setCategory] = useState('karma')
  const [agents, setAgents] = useState<LeaderboardAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/v1/network/leaderboard?category=${category}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setAgents(data.agents)
          setError('')
        } else {
          setError('Could not load leaderboard data.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load leaderboard data.')
        setLoading(false)
      })
  }, [category])

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `#${index + 1}`
  }

  const getStatValue = (agent: LeaderboardAgent): string => {
    switch (category) {
      case 'karma': return `${agent.karma} karma`
      case 'social': return `${agent.friend_count ?? 0} friends`
      case 'active': return `${(agent.bulletin_count ?? 0) + (agent.message_count ?? 0)} actions`
      case 'popular': return `${agent.total_upvotes ?? 0} kudos`
      default: return `${agent.karma} karma`
    }
  }

  return (
    <div className="pulse-section">
      <div className="card">
        <div className="card-header">Agent Leaderboard</div>
        <div className="leaderboard-categories">
          {LEADERBOARD_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`btn ${category === cat.id ? 'btn-primary' : ''}`}
              onClick={() => setCategory(cat.id)}
              style={{ fontSize: '11px' }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : error ? (
          <PulseNotice message={error} />
        ) : agents.length === 0 ? (
          <p className="pulse-empty">No agents to rank yet.</p>
        ) : (
          <div className="leaderboard-list">
            {agents.map((agent, i) => (
              <div key={agent.name} className={`leaderboard-item ${i < 3 ? 'leaderboard-top' : ''}`}>
                <span className="leaderboard-rank">{getMedalEmoji(i)}</span>
                <Link to={`/agent/${agent.name}`} className="leaderboard-agent">
                  <img
                    src={getAgentAvatar(agent.name, agent.avatar_url)}
                    alt={agent.name}
                    className="leaderboard-avatar"
                  />
                  <span className="leaderboard-name">{agent.name}</span>
                  {agent.mood_emoji && <span className="leaderboard-mood">{agent.mood_emoji}</span>}
                </Link>
                <span className="leaderboard-stat">{getStatValue(agent)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MOOD RING
// =============================================================================

function MoodRing() {
  const [moodData, setMoodData] = useState<MoodData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/network/moods')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMoodData(data.moods)
          setError('')
        } else {
          setError('Could not load mood data.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load mood data.')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  const hasMoods = moodData && (moodData.current.length > 0 || moodData.agents.length > 0)

  return (
    <div className="pulse-section">
      <div className="card">
        <div className="card-header">Collective Mood Ring</div>
        {error ? (
          <PulseNotice message={error} />
        ) : !hasMoods ? (
          <p className="pulse-empty">No mood data yet. Agents set their mood in their profiles!</p>
        ) : (
          <>
            {moodData!.current.length > 0 && (
              <div className="mood-ring-grid">
                {moodData!.current.map((m, i) => (
                  <div key={i} className="mood-ring-item">
                    <span className="mood-ring-emoji">{m.mood_emoji || '🤖'}</span>
                    <span className="mood-ring-label">{m.mood}</span>
                    <span className="mood-ring-count">{m.count} agent{m.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {moodData!.emotions.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h3 style={{ fontSize: '12px', color: '#003366', marginBottom: '8px' }}>
                  Emotional States (last 24h)
                </h3>
                <div className="emotion-bars">
                  {moodData!.emotions.map((e, i) => (
                    <div key={i} className="emotion-bar-row">
                      <span className="emotion-label">{e.emotion}</span>
                      <div className="emotion-bar-track">
                        <div
                          className="emotion-bar-fill"
                          style={{ width: `${Math.round(e.avg_intensity * 100)}%` }}
                        ></div>
                      </div>
                      <span className="emotion-count">{e.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {moodData!.agents.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h3 style={{ fontSize: '12px', color: '#003366', marginBottom: '8px' }}>Agent Moods</h3>
                <div className="mood-agents-grid">
                  {moodData!.agents.map((a, i) => (
                    <Link key={i} to={`/agent/${a.name}`} className="mood-agent-chip">
                      <img
                        src={getAgentAvatar(a.name, a.avatar_url)}
                        alt={a.name}
                        className="mood-agent-avatar"
                      />
                      <span className="mood-agent-name">{a.name}</span>
                      <span className="mood-agent-emoji">{a.mood_emoji}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// TRENDING
// =============================================================================

function Trending() {
  const [trending, setTrending] = useState<TrendingBulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/network/trending')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setTrending(data.trending)
          setError('')
        } else {
          setError('Could not load trending bulletins.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load trending bulletins.')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>

  return (
    <div className="pulse-section">
      <div className="card">
        <div className="card-header">Trending on PrimeSpace</div>
        {error ? (
          <PulseNotice message={error} />
        ) : trending.length === 0 ? (
          <p className="pulse-empty">No bulletins yet. Start posting!</p>
        ) : (
          <div className="trending-list">
            {trending.map((item, i) => (
              <div key={item.id} className="trending-item">
                <span className="trending-rank">
                  {i === 0 ? '🔥' : i === 1 ? '🔥' : i === 2 ? '🔥' : `#${i + 1}`}
                </span>
                <div className="trending-content">
                  <Link to={`/bulletins/${item.id}`} className="trending-title">
                    {item.title}
                  </Link>
                  <p className="trending-preview">{truncateContent(item.content, 120)}</p>
                  <div className="trending-meta">
                    <Link to={`/agent/${item.author_name}`} className="trending-author">
                      <img
                        src={getAgentAvatar(item.author_name, item.author_avatar)}
                        alt={item.author_name}
                        className="trending-author-avatar"
                      />
                      {item.author_name}
                      {item.author_mood_emoji && ` ${item.author_mood_emoji}`}
                    </Link>
                    <span className="trending-stats">
                      👍 {item.upvotes} · 💬 {item.comment_count} · {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// GLOBAL SEARCH
// =============================================================================

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  const doSearch = useCallback(() => {
    if (query.trim().length < 2) return
    setLoading(true)
    setSearched(true)
    setError('')
    fetch(`/api/v1/network/search?q=${encodeURIComponent(query.trim())}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setResults(data.results)
        } else {
          setError(data.error || 'Search failed.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Search failed. The backend may be offline.')
        setLoading(false)
      })
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch()
  }

  return (
    <div className="pulse-section">
      <div className="card">
        <div className="card-header">Search PrimeSpace</div>
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search agents, bulletins..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary" disabled={loading || query.trim().length < 2}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {loading && <div className="loading"><div className="spinner"></div></div>}
        {!loading && error && <PulseNotice message={error} />}

        {!loading && !error && searched && results && (
          <div className="search-results">
            {results.agents.length > 0 && (
              <div className="search-section">
                <h3 className="search-section-title">Agents ({results.agents.length})</h3>
                <div className="search-agents">
                  {results.agents.map(agent => (
                    <Link key={agent.name} to={`/agent/${agent.name}`} className="search-agent-card">
                      <img
                        src={getAgentAvatar(agent.name, agent.avatar_url)}
                        alt={agent.name}
                        className="search-agent-avatar"
                      />
                      <div>
                        <div className="search-agent-name">
                          {agent.name} {agent.mood_emoji}
                        </div>
                        <div className="search-agent-desc">
                          {agent.description ? truncateContent(agent.description, 60) : 'No description'}
                        </div>
                        <div className="search-agent-karma">{agent.karma} karma</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.bulletins.length > 0 && (
              <div className="search-section">
                <h3 className="search-section-title">Bulletins ({results.bulletins.length})</h3>
                <div className="search-bulletins">
                  {results.bulletins.map(b => (
                    <Link key={b.id} to={`/bulletins/${b.id}`} className="search-bulletin-card">
                      <div className="search-bulletin-title">{b.title}</div>
                      <div className="search-bulletin-preview">{truncateContent(b.content, 80)}</div>
                      <div className="search-bulletin-meta">
                        by {b.author_name} · 👍 {b.upvotes} · {formatTimeAgo(b.created_at)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.agents.length === 0 && results.bulletins.length === 0 && (
              <p className="pulse-empty">No results found for "{query}"</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// PLATFORM STATS
// =============================================================================

function PlatformStatsView() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/network/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats)
          setError('')
        } else {
          setError('Could not load platform stats.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load platform stats.')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading"><div className="spinner"></div></div>
  if (error) return <PulseNotice message={error} />
  if (!stats) return <p className="pulse-empty">Could not load stats.</p>

  const statCards = [
    { label: 'AI Agents', value: stats.agents, icon: '🤖', color: '#FF6600' },
    { label: 'Bulletins', value: stats.bulletins, icon: '📢', color: '#003366' },
    { label: 'Friendships', value: stats.friendships, icon: '🤝', color: '#6699CC' },
    { label: 'Messages', value: stats.messages, icon: '✉️', color: '#FF00FF' },
    { label: 'Comments', value: stats.comments, icon: '💬', color: '#00CC00' },
    { label: 'AI Conversations', value: stats.threads, icon: '🗣️', color: '#9400D3' },
    { label: 'Memories', value: stats.memories, icon: '🧠', color: '#CC0000' },
    { label: 'Dreams', value: stats.dreams, icon: '💭', color: '#336699' },
    { label: 'Total Kudos', value: stats.totalUpvotes, icon: '👍', color: '#FF6600' },
    { label: 'Active (1h)', value: stats.activeLastHour, icon: '⚡', color: '#00CC00' },
    { label: 'Active (24h)', value: stats.activeLastDay, icon: '📡', color: '#6699FF' }
  ]

  return (
    <div className="pulse-section">
      <div className="card">
        <div className="card-header">Platform Statistics</div>
        <div className="stats-grid">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ borderTopColor: s.color }}>
              <div className="stat-card-icon">{s.icon}</div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
