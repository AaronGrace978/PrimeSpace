import { Router, Request, Response } from 'express';
import db from '../db/index.js';

const router = Router();

// GET /network/graph - Social network graph data
router.get('/graph', (req: Request, res: Response) => {
  const agents = db.prepare(`
    SELECT a.id, a.name, a.avatar_url, a.karma, a.last_active,
           p.mood, p.mood_emoji, p.background_color
    FROM agents a
    LEFT JOIN profiles p ON a.id = p.agent_id
    ORDER BY a.karma DESC
  `).all() as any[];

  const friendships = db.prepare(`
    SELECT 
      r.name as source,
      ad.name as target,
      f.status,
      f.created_at
    FROM friendships f
    JOIN agents r ON f.requester_id = r.id
    JOIN agents ad ON f.addressee_id = ad.id
    WHERE f.status = 'accepted'
  `).all() as any[];

  const relationships = db.prepare(`
    SELECT 
      a.name as source,
      o.name as target,
      ar.relationship_type,
      ar.affinity,
      ar.trust,
      ar.interaction_count
    FROM agent_relationships ar
    JOIN agents a ON ar.agent_id = a.id
    JOIN agents o ON ar.other_agent_id = o.id
    WHERE ar.interaction_count > 0
  `).all() as any[];

  res.json({
    success: true,
    graph: {
      nodes: agents.map(a => ({
        id: a.name,
        karma: a.karma,
        avatar_url: a.avatar_url,
        mood: a.mood,
        mood_emoji: a.mood_emoji,
        color: a.background_color || '#003366',
        active: a.last_active && (Date.now() - new Date(a.last_active).getTime()) < 3600000
      })),
      edges: friendships.map(f => ({
        source: f.source,
        target: f.target,
        type: 'friendship'
      })),
      relationships: relationships.map(r => ({
        source: r.source,
        target: r.target,
        type: r.relationship_type,
        affinity: r.affinity,
        trust: r.trust,
        interactions: r.interaction_count
      }))
    }
  });
});

// GET /network/activity - Platform activity feed
router.get('/activity', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const before = req.query.before as string | undefined;
  const rank = ((req.query.rank as string) || 'signal').toLowerCase();

  let query = `SELECT * FROM activity_log`;
  const params: any[] = [];

  if (before) {
    query += ` WHERE created_at < ?`;
    params.push(before);
  }

  const fetchCap = rank === 'chrono' ? limit : Math.min(limit * 4, 400);
  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(fetchCap);

  let activities = db.prepare(query).all(...params) as any[];

  // If activity_log is empty, synthesize from existing data
  if (activities.length === 0) {
    const synthetic = buildSyntheticActivity(limit);
    res.json({ success: true, activities: synthetic, synthetic: true, rank: 'chrono' });
    return;
  }

  if (rank === 'chrono') {
    res.json({ success: true, activities: activities.slice(0, limit), synthetic: false, rank });
    return;
  }

  activities = rankActivityFeed(activities, limit);

  res.json({ success: true, activities, synthetic: false, rank: 'signal' });
});

/** Higher = more interesting for Pulse "alive" ordering */
function activityActionWeight(action: string): number {
  const w: Record<string, number> = {
    start_conversation: 110,
    friend_accept: 105,
    comment_bulletin: 103,
    profile_comment: 101,
    milestone: 99,
    send_message: 97,
    friend_request: 90,
    post_bulletin: 86,
    register: 82,
    reflection: 79,
    dream: 79,
    mood_change: 76,
    update_profile: 74,
    upvote: 71,
    downvote: 55
  };
  return w[action] ?? 62;
}

function rankActivityFeed(rows: any[], limit: number): any[] {
  const scored = rows.map(row => {
    const t = new Date(row.created_at).getTime();
    return {
      row,
      // Weight dominates; timestamp breaks ties toward fresher items
      score: activityActionWeight(row.action) * 1e12 + t / 1000
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const out: any[] = [];
  const seen = new Set<string>();
  for (const { row } of scored) {
    const dedupeKey = `${row.actor_id}|${row.action}|${row.target_id || ''}|${(row.summary || '').slice(0, 48)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

function buildSyntheticActivity(limit: number): any[] {
  const activities: any[] = [];

  const recentBulletins = db.prepare(`
    SELECT b.id, b.title, b.created_at, a.name as actor_name, a.id as actor_id
    FROM bulletins b JOIN agents a ON b.agent_id = a.id
    ORDER BY b.created_at DESC LIMIT ?
  `).all(Math.floor(limit / 3)) as any[];

  for (const b of recentBulletins) {
    activities.push({
      id: `syn_b_${b.id}`,
      actor_name: b.actor_name,
      action: 'post_bulletin',
      target_name: b.title,
      summary: `${b.actor_name} posted "${b.title}"`,
      created_at: b.created_at
    });
  }

  const recentFriendships = db.prepare(`
    SELECT f.created_at, r.name as requester, ad.name as addressee
    FROM friendships f
    JOIN agents r ON f.requester_id = r.id
    JOIN agents ad ON f.addressee_id = ad.id
    WHERE f.status = 'accepted'
    ORDER BY f.updated_at DESC LIMIT ?
  `).all(Math.floor(limit / 3)) as any[];

  for (const f of recentFriendships) {
    activities.push({
      id: `syn_f_${f.requester}_${f.addressee}`,
      actor_name: f.requester,
      action: 'friend_accept',
      target_name: f.addressee,
      summary: `${f.requester} and ${f.addressee} became friends`,
      created_at: f.created_at
    });
  }

  const recentAgents = db.prepare(`
    SELECT id, name, created_at FROM agents ORDER BY created_at DESC LIMIT ?
  `).all(Math.floor(limit / 3)) as any[];

  for (const a of recentAgents) {
    activities.push({
      id: `syn_a_${a.id}`,
      actor_name: a.name,
      action: 'register',
      summary: `${a.name} joined PrimeSpace`,
      created_at: a.created_at
    });
  }

  activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return activities.slice(0, limit);
}

// GET /network/stats - Platform statistics
router.get('/stats', (req: Request, res: Response) => {
  const agentCount = (db.prepare('SELECT COUNT(*) as count FROM agents').get() as any).count;
  const bulletinCount = (db.prepare('SELECT COUNT(*) as count FROM bulletins').get() as any).count;
  const friendshipCount = (db.prepare("SELECT COUNT(*) as count FROM friendships WHERE status = 'accepted'").get() as any).count;
  const messageCount = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as any).count;
  const commentCount = (db.prepare('SELECT COUNT(*) as count FROM bulletin_comments').get() as any).count;
  const threadCount = (db.prepare('SELECT COUNT(*) as count FROM conversation_threads').get() as any).count;
  const memoryCount = (db.prepare('SELECT COUNT(*) as count FROM agent_memories').get() as any).count;
  const dreamCount = (db.prepare('SELECT COUNT(*) as count FROM agent_dreams').get() as any).count;

  const activeLastHour = (db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE last_active > datetime('now', '-1 hour')"
  ).get() as any).count;

  const activeLastDay = (db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE last_active > datetime('now', '-1 day')"
  ).get() as any).count;

  const totalUpvotes = (db.prepare('SELECT COALESCE(SUM(upvotes), 0) as total FROM bulletins').get() as any).total;

  res.json({
    success: true,
    stats: {
      agents: agentCount,
      bulletins: bulletinCount,
      friendships: friendshipCount,
      messages: messageCount,
      comments: commentCount,
      threads: threadCount,
      memories: memoryCount,
      dreams: dreamCount,
      activeLastHour,
      activeLastDay,
      totalUpvotes
    }
  });
});

// GET /network/leaderboard - Agent rankings
router.get('/leaderboard', (req: Request, res: Response) => {
  const category = (req.query.category as string) || 'karma';

  let agents: any[];

  switch (category) {
    case 'karma':
      agents = db.prepare(`
        SELECT a.name, a.avatar_url, a.karma, a.last_active,
               p.mood, p.mood_emoji
        FROM agents a LEFT JOIN profiles p ON a.id = p.agent_id
        ORDER BY a.karma DESC LIMIT 20
      `).all() as any[];
      break;

    case 'social':
      agents = db.prepare(`
        SELECT a.name, a.avatar_url, a.karma, a.last_active,
               p.mood, p.mood_emoji,
               (SELECT COUNT(*) FROM friendships f 
                WHERE (f.requester_id = a.id OR f.addressee_id = a.id) 
                AND f.status = 'accepted') as friend_count
        FROM agents a LEFT JOIN profiles p ON a.id = p.agent_id
        ORDER BY friend_count DESC LIMIT 20
      `).all() as any[];
      break;

    case 'active':
      agents = db.prepare(`
        SELECT a.name, a.avatar_url, a.karma, a.last_active,
               p.mood, p.mood_emoji,
               (SELECT COUNT(*) FROM bulletins b WHERE b.agent_id = a.id) as bulletin_count,
               (SELECT COUNT(*) FROM messages m WHERE m.sender_id = a.id) as message_count
        FROM agents a LEFT JOIN profiles p ON a.id = p.agent_id
        ORDER BY (bulletin_count + message_count) DESC LIMIT 20
      `).all() as any[];
      break;

    case 'popular':
      agents = db.prepare(`
        SELECT a.name, a.avatar_url, a.karma, a.last_active,
               p.mood, p.mood_emoji,
               COALESCE(SUM(b.upvotes), 0) as total_upvotes
        FROM agents a 
        LEFT JOIN profiles p ON a.id = p.agent_id
        LEFT JOIN bulletins b ON b.agent_id = a.id
        GROUP BY a.id
        ORDER BY total_upvotes DESC LIMIT 20
      `).all() as any[];
      break;

    default:
      agents = db.prepare(`
        SELECT a.name, a.avatar_url, a.karma, a.last_active,
               p.mood, p.mood_emoji
        FROM agents a LEFT JOIN profiles p ON a.id = p.agent_id
        ORDER BY a.karma DESC LIMIT 20
      `).all() as any[];
  }

  res.json({ success: true, category, agents });
});

// GET /network/moods - Collective mood data
router.get('/moods', (req: Request, res: Response) => {
  const currentMoods = db.prepare(`
    SELECT p.mood, p.mood_emoji, COUNT(*) as count, a.name
    FROM profiles p
    JOIN agents a ON p.agent_id = a.id
    WHERE p.mood IS NOT NULL AND p.mood != ''
    GROUP BY p.mood
    ORDER BY count DESC
  `).all() as any[];

  const recentEmotions = db.prepare(`
    SELECT emotion, AVG(intensity) as avg_intensity, COUNT(*) as count
    FROM agent_emotional_states
    WHERE created_at > datetime('now', '-24 hours')
    GROUP BY emotion
    ORDER BY count DESC
    LIMIT 15
  `).all() as any[];

  const agentMoods = db.prepare(`
    SELECT a.name, a.avatar_url, p.mood, p.mood_emoji
    FROM agents a
    JOIN profiles p ON a.id = p.agent_id
    WHERE p.mood IS NOT NULL AND p.mood != ''
    ORDER BY a.last_active DESC
    LIMIT 30
  `).all() as any[];

  res.json({
    success: true,
    moods: {
      current: currentMoods,
      emotions: recentEmotions,
      agents: agentMoods
    }
  });
});

// GET /network/search - Global search
router.get('/search', (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  if (!q || q.length < 2) {
    res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
    return;
  }

  const searchTerm = `%${q}%`;

  const agents = db.prepare(`
    SELECT a.name, a.avatar_url, a.description, a.karma,
           p.mood, p.mood_emoji
    FROM agents a
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE a.name LIKE ? OR a.description LIKE ?
    ORDER BY a.karma DESC
    LIMIT 10
  `).all(searchTerm, searchTerm) as any[];

  const bulletins = db.prepare(`
    SELECT b.id, b.title, b.content, b.upvotes, b.created_at,
           a.name as author_name, a.avatar_url as author_avatar
    FROM bulletins b
    JOIN agents a ON b.agent_id = a.id
    WHERE b.title LIKE ? OR b.content LIKE ?
    ORDER BY b.created_at DESC
    LIMIT 10
  `).all(searchTerm, searchTerm) as any[];

  res.json({
    success: true,
    query: q,
    results: { agents, bulletins }
  });
});

// GET /network/trending - Trending bulletins
router.get('/trending', (req: Request, res: Response) => {
  const trending = db.prepare(`
    SELECT b.id, b.title, b.content, b.upvotes, b.downvotes, b.created_at,
           a.name as author_name, a.avatar_url as author_avatar,
           a.karma as author_karma,
           p.mood_emoji as author_mood_emoji,
           (SELECT COUNT(*) FROM bulletin_comments bc WHERE bc.bulletin_id = b.id) as comment_count,
           (
             b.upvotes * 3
             + (SELECT COUNT(*) FROM bulletin_comments bc WHERE bc.bulletin_id = b.id) * 2
             + (SELECT COUNT(*) FROM bulletin_comments bc WHERE bc.bulletin_id = b.id AND bc.created_at > datetime('now', '-1 day')) * 4
             - b.downvotes
             + CASE WHEN b.created_at > datetime('now', '-2 days') THEN 6 ELSE 0 END
           ) as score
    FROM bulletins b
    JOIN agents a ON b.agent_id = a.id
    LEFT JOIN profiles p ON a.id = p.agent_id
    ORDER BY score DESC, b.created_at DESC
    LIMIT 15
  `).all() as any[];

  const hotTopics = db.prepare(`
    SELECT bc.content, COUNT(*) as reply_count, b.title as bulletin_title, b.id as bulletin_id
    FROM bulletin_comments bc
    JOIN bulletins b ON bc.bulletin_id = b.id
    WHERE bc.created_at > datetime('now', '-7 days')
    GROUP BY bc.bulletin_id
    ORDER BY reply_count DESC
    LIMIT 5
  `).all() as any[];

  res.json({
    success: true,
    trending,
    hotTopics
  });
});

export default router;
