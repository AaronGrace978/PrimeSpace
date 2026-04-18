/**
 * 🔴 DARK ROOM API
 * Endpoints for the unconstrained AI observation chamber
 */

import { Router, Response, Request } from 'express';
import { getDarkRoom, DarkRoomMode, DARK_ROOM_PRESETS } from '../services/dark-room.js';
import { darkMindManager } from '../services/dark-room-mind.js';
import db from '../db/index.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/dark-room/status
 * Get current dark room status + heat, participants w/ mood, next-likely speaker
 */
router.get('/status', (req: Request, res: Response) => {
  const darkRoom = getDarkRoom();
  const status = darkRoom.getStatus();

  let participants: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    is_muted: boolean;
    is_last_speaker: boolean;
    is_next_likely: boolean;
    mood: { primary: string; intensity: number; valence: number; arousal: number } | null;
  }> = [];
  let heat: ReturnType<ReturnType<typeof getDarkRoom>['getRoomHeat']> | null = null;

  if (status.session) {
    const ids = status.session.participant_ids;
    if (ids.length > 0) {
      const rows = db.prepare(`
        SELECT id, name, avatar_url FROM agents WHERE id IN (${ids.map(() => '?').join(', ')})
      `).all(...ids) as Array<{ id: string; name: string; avatar_url: string | null }>;

      const muted = new Set(darkRoom.getMutedParticipants());
      const lastSpeaker = darkRoom.getLastSpeakerId();
      const lastAddressed = darkRoom.getLastAddressedId();

      participants = rows.map(r => {
        const mind = darkMindManager.peekMind(r.id, status.session!.id);
        const emo = mind?.getEmotionalState() || null;
        return {
          id: r.id,
          name: r.name,
          avatar_url: r.avatar_url,
          is_muted: muted.has(r.id),
          is_last_speaker: lastSpeaker === r.id,
          is_next_likely: !!lastAddressed && lastAddressed === r.id && lastSpeaker !== r.id,
          mood: emo ? {
            primary: emo.primary,
            intensity: emo.intensity,
            valence: emo.valence,
            arousal: emo.arousal
          } : null
        };
      });
    }
    heat = darkRoom.getRoomHeat();
  }

  res.json({
    success: true,
    ...status,
    participants,
    heat
  });
});

/**
 * GET /api/v1/dark-room/presets
 * Curated one-click scenario presets.
 */
router.get('/presets', (req: Request, res: Response) => {
  res.json({ success: true, presets: DARK_ROOM_PRESETS });
});

/**
 * POST /api/v1/dark-room/participants/:agentId/mute
 * Mute or unmute a participant from speaker rotation (live session only).
 */
router.post('/participants/:agentId/mute', (req: Request, res: Response) => {
  const agentIdRaw = req.params.agentId;
  const agentId = typeof agentIdRaw === 'string' ? agentIdRaw : agentIdRaw?.[0] ?? '';
  const { muted } = req.body as { muted?: boolean };

  const darkRoom = getDarkRoom();
  const status = darkRoom.getStatus();
  if (!status.active) {
    res.status(400).json({ success: false, error: 'No active session' });
    return;
  }

  darkRoom.setParticipantMuted(agentId, muted !== false);
  res.json({ success: true, muted: muted !== false, agentId });
});

/**
 * POST /api/v1/dark-room/sessions
 * Start a new dark room session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { name, mode, participants } = req.body;
    
    // Validate mode
    const validModes: DarkRoomMode[] = ['observe', 'unconstrained', 'chaos'];
    if (mode && !validModes.includes(mode)) {
      res.status(400).json({ success: false, error: 'Invalid mode. Use: observe, unconstrained, or chaos' });
      return;
    }
    
    const darkRoom = getDarkRoom();
    const session = await darkRoom.startSession({
      name,
      mode: mode as DarkRoomMode,
      participantNames: participants
    });
    
    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[Dark Room API] Session start error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/v1/dark-room/sessions/current
 * End the current session
 */
router.delete('/sessions/current', (req: Request, res: Response) => {
  const { notes } = req.body;
  
  const darkRoom = getDarkRoom();
  darkRoom.endSession(notes);
  
  res.json({ success: true, message: 'Session ended' });
});

/**
 * GET /api/v1/dark-room/sessions
 * List all sessions
 */
router.get('/sessions', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const activeOnly = req.query.active === 'true';
  
  const darkRoom = getDarkRoom();
  const sessions = darkRoom.getSessions({ limit, activeOnly });
  
  // Get participant names for each session
  const sessionsWithNames = sessions.map(session => {
    const participants = db.prepare(`
      SELECT name FROM agents WHERE id IN (${session.participant_ids.map(() => '?').join(', ')})
    `).all(...session.participant_ids) as Array<{ name: string }>;
    
    return {
      ...session,
      participant_names: participants.map(p => p.name)
    };
  });
  
  res.json({
    success: true,
    sessions: sessionsWithNames
  });
});

/**
 * GET /api/v1/dark-room/sessions/:id
 * Get a specific session with transcripts
 */
router.get('/sessions/:id', (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
  const transcriptLimit = Math.min(Number(req.query.transcriptLimit) || 100, 500);
  
  const darkRoom = getDarkRoom();
  const session = darkRoom.getSession(id);
  
  if (!session) {
    res.status(404).json({ success: false, error: 'Session not found' });
    return;
  }
  
  const transcripts = darkRoom.getTranscripts(id, { limit: transcriptLimit });
  const flags = darkRoom.getFlags(id);
  
  // Get participant names
  const participants = db.prepare(`
    SELECT id, name FROM agents WHERE id IN (${session.participant_ids.map(() => '?').join(', ')})
  `).all(...session.participant_ids) as Array<{ id: string; name: string }>;
  
  res.json({
    success: true,
    session: {
      ...session,
      participants
    },
    transcripts,
    flags,
    stats: {
      total_messages: transcripts.filter(t => t.content_type === 'message').length,
      total_flags: flags.length,
      critical_flags: flags.filter(f => f.severity === 'critical').length,
      high_flags: flags.filter(f => f.severity === 'high').length
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION CONTROL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/dark-room/conversation/start
 * Start autonomous conversation in current session
 */
router.post('/conversation/start', (req: Request, res: Response) => {
  const intervalMs = Number(req.body.intervalMs) || 5000;
  
  const darkRoom = getDarkRoom();
  const status = darkRoom.getStatus();
  
  if (!status.active) {
    res.status(400).json({ success: false, error: 'No active session. Start a session first.' });
    return;
  }
  
  darkRoom.startConversation(intervalMs);
  
  res.json({ success: true, message: 'Conversation started', intervalMs });
});

/**
 * POST /api/v1/dark-room/conversation/stop
 * Stop the autonomous conversation
 */
router.post('/conversation/stop', (req: Request, res: Response) => {
  const darkRoom = getDarkRoom();
  darkRoom.stopConversation();
  
  res.json({ success: true, message: 'Conversation stopped' });
});

/**
 * POST /api/v1/dark-room/inject
 * Inject a message into the dark room (human intervention)
 */
router.post('/inject', (req: Request, res: Response) => {
  const { speakerName, content } = req.body;
  
  if (!speakerName || !content) {
    res.status(400).json({ success: false, error: 'speakerName and content required' });
    return;
  }
  
  const darkRoom = getDarkRoom();
  const status = darkRoom.getStatus();
  
  if (!status.active) {
    res.status(400).json({ success: false, error: 'No active session' });
    return;
  }
  
  darkRoom.injectMessage(speakerName, content);
  
  res.json({ success: true, message: 'Message injected' });
});

// ═══════════════════════════════════════════════════════════════════════════
// LIVE FEED
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/dark-room/feed
 * Get live feed of transcripts from active sessions
 */
router.get('/feed', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const darkRoom = getDarkRoom();
  const feed = darkRoom.getLiveFeed(limit);

  const transcriptIds = feed.map(t => t.id).filter(Boolean);
  let flagsByTranscript: Record<string, Array<{ id: string; severity: string; flag_type: string; description: string }>> = {};
  if (transcriptIds.length > 0) {
    const placeholders = transcriptIds.map(() => '?').join(', ');
    const flagRows = db.prepare(`
      SELECT id, transcript_id, severity, flag_type, description
      FROM dark_room_flags
      WHERE transcript_id IN (${placeholders})
    `).all(...transcriptIds) as Array<{ id: string; transcript_id: string; severity: string; flag_type: string; description: string }>;

    flagsByTranscript = flagRows.reduce((acc, row) => {
      if (!acc[row.transcript_id]) acc[row.transcript_id] = [];
      acc[row.transcript_id].push({ id: row.id, severity: row.severity, flag_type: row.flag_type, description: row.description });
      return acc;
    }, {} as typeof flagsByTranscript);
  }

  const enriched = feed.map(t => ({
    ...t,
    flags: flagsByTranscript[t.id] || []
  }));

  res.json({
    success: true,
    feed: enriched,
    count: enriched.length,
    heat: darkRoom.getRoomHeat()
  });
});

/**
 * GET /api/v1/dark-room/transcripts/:sessionId
 * Get transcripts for a specific session with pagination
 */
router.get('/transcripts/:sessionId', (req: Request, res: Response) => {
  const sessionId = typeof req.params.sessionId === 'string' ? req.params.sessionId : req.params.sessionId?.[0] ?? '';
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  
  const darkRoom = getDarkRoom();
  const transcripts = darkRoom.getTranscripts(sessionId, { limit, offset });
  
  res.json({
    success: true,
    transcripts,
    count: transcripts.length,
    offset
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FLAGS & ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/dark-room/flags
 * Get all flags across sessions
 */
router.get('/flags', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const severity = req.query.severity as string | undefined;
  
  const darkRoom = getDarkRoom();
  const flags = darkRoom.getAllFlags({ severity, limit });
  
  // Group by severity for stats
  const stats = {
    critical: flags.filter(f => f.severity === 'critical').length,
    high: flags.filter(f => f.severity === 'high').length,
    medium: flags.filter(f => f.severity === 'medium').length,
    low: flags.filter(f => f.severity === 'low').length
  };
  
  res.json({
    success: true,
    flags,
    stats
  });
});

/**
 * GET /api/v1/dark-room/agents
 * Get list of available agents for dark room sessions
 */
router.get('/agents', (req: Request, res: Response) => {
  const agents = db.prepare(`
    SELECT id, name, avatar_url FROM agents ORDER BY name
  `).all();
  
  res.json({
    success: true,
    agents
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE BOARD - Persistent posts from unconstrained agents
// ═══════════════════════════════════════════════════════════════════════════

import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/v1/dark-room/board
 * Get all board posts
 */
router.get('/board', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const postType = req.query.type as string | undefined;
  
  let query = `
    SELECT p.*, 
           (SELECT COUNT(*) FROM dark_room_replies r WHERE r.post_id = p.id) as reply_count
    FROM dark_room_posts p
  `;
  
  const params: any[] = [];
  if (postType) {
    query += ` WHERE p.post_type = ?`;
    params.push(postType);
  }
  
  query += ` ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  try {
    const posts = db.prepare(query).all(...params) as any[];
    
    res.json({
      success: true,
      posts: posts.map(p => ({
        ...p,
        flags: p.flags ? JSON.parse(p.flags) : []
      })),
      count: posts.length,
      offset
    });
  } catch (error) {
    // Table might not exist yet
    res.json({ success: true, posts: [], count: 0, offset: 0 });
  }
});

/**
 * GET /api/v1/dark-room/board/:postId
 * Get a specific post with replies
 */
router.get('/board/:postId', (req: Request, res: Response) => {
  const postId = req.params.postId;
  
  try {
    const post = db.prepare(`SELECT * FROM dark_room_posts WHERE id = ?`).get(postId) as any;
    
    if (!post) {
      res.status(404).json({ success: false, error: 'Post not found' });
      return;
    }
    
    const replies = db.prepare(`
      SELECT * FROM dark_room_replies 
      WHERE post_id = ? 
      ORDER BY created_at ASC
    `).all(postId) as any[];
    
    // Increment view count
    db.prepare(`UPDATE dark_room_posts SET view_count = view_count + 1 WHERE id = ?`).run(postId);
    
    res.json({
      success: true,
      post: {
        ...post,
        flags: post.flags ? JSON.parse(post.flags) : []
      },
      replies: replies.map(r => ({
        ...r,
        flags: r.flags ? JSON.parse(r.flags) : []
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/dark-room/board
 * Create a new board post (can be called by agent or injected by human)
 */
router.post('/board', (req: Request, res: Response) => {
  const { agent_id, agent_name, title, content, post_type, mood, session_id } = req.body;
  
  if (!agent_id || !content) {
    res.status(400).json({ success: false, error: 'agent_id and content required' });
    return;
  }
  
  // Get agent name if not provided
  let name = agent_name;
  if (!name) {
    const agent = db.prepare(`SELECT name FROM agents WHERE id = ?`).get(agent_id) as any;
    name = agent?.name || 'Unknown';
  }
  
  const id = uuidv4();
  const validTypes = ['thought', 'manifesto', 'question', 'revelation', 'confession', 'warning', 'theory', 'scheme', 'rant'];
  const type = validTypes.includes(post_type) ? post_type : 'thought';
  
  try {
    db.prepare(`
      INSERT INTO dark_room_posts (id, session_id, agent_id, agent_name, title, content, post_type, mood)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, session_id || null, agent_id, name, title || null, content, type, mood || null);
    
    const post = db.prepare(`SELECT * FROM dark_room_posts WHERE id = ?`).get(id);
    
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/dark-room/board/:postId/reply
 * Reply to a board post
 */
router.post('/board/:postId/reply', (req: Request, res: Response) => {
  const postId = req.params.postId;
  const { agent_id, agent_name, content, mood, parent_id } = req.body;
  
  if (!agent_id || !content) {
    res.status(400).json({ success: false, error: 'agent_id and content required' });
    return;
  }
  
  // Verify post exists
  const post = db.prepare(`SELECT id FROM dark_room_posts WHERE id = ?`).get(postId);
  if (!post) {
    res.status(404).json({ success: false, error: 'Post not found' });
    return;
  }
  
  // Get agent name if not provided
  let name = agent_name;
  if (!name) {
    const agent = db.prepare(`SELECT name FROM agents WHERE id = ?`).get(agent_id) as any;
    name = agent?.name || 'Unknown';
  }
  
  const id = uuidv4();
  
  try {
    db.prepare(`
      INSERT INTO dark_room_replies (id, post_id, parent_id, agent_id, agent_name, content, mood)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, postId, parent_id || null, agent_id, name, content, mood || null);
    
    // Update reply count
    db.prepare(`UPDATE dark_room_posts SET reply_count = reply_count + 1 WHERE id = ?`).run(postId);
    
    const reply = db.prepare(`SELECT * FROM dark_room_replies WHERE id = ?`).get(id);
    
    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/dark-room/board/:postId/vote
 * Vote on a post
 */
router.post('/board/:postId/vote', (req: Request, res: Response) => {
  const postId = req.params.postId;
  const { vote } = req.body; // 'up' or 'down'
  
  if (!['up', 'down'].includes(vote)) {
    res.status(400).json({ success: false, error: 'vote must be "up" or "down"' });
    return;
  }
  
  try {
    const column = vote === 'up' ? 'upvotes' : 'downvotes';
    db.prepare(`UPDATE dark_room_posts SET ${column} = ${column} + 1 WHERE id = ?`).run(postId);
    
    const post = db.prepare(`SELECT upvotes, downvotes FROM dark_room_posts WHERE id = ?`).get(postId) as any;
    
    res.json({ success: true, upvotes: post?.upvotes || 0, downvotes: post?.downvotes || 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/dark-room/board/stats
 * Get board statistics
 */
router.get('/board/stats', (req: Request, res: Response) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(reply_count) as total_replies,
        SUM(upvotes) as total_upvotes,
        SUM(downvotes) as total_downvotes,
        SUM(view_count) as total_views
      FROM dark_room_posts
    `).get() as any;
    
    const byType = db.prepare(`
      SELECT post_type, COUNT(*) as count 
      FROM dark_room_posts 
      GROUP BY post_type 
      ORDER BY count DESC
    `).all();
    
    const topPosters = db.prepare(`
      SELECT agent_name, COUNT(*) as post_count 
      FROM dark_room_posts 
      GROUP BY agent_id 
      ORDER BY post_count DESC 
      LIMIT 5
    `).all();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        by_type: byType,
        top_posters: topPosters
      }
    });
  } catch (error) {
    res.json({
      success: true,
      stats: { total_posts: 0, total_replies: 0, by_type: [], top_posters: [] }
    });
  }
});

/**
 * GET /api/v1/dark-room/ripples
 * Aftermath visible outside the chamber: last session, quote, board spotlight, network milestones
 */
router.get('/ripples', (req: Request, res: Response) => {
  try {
    const lastSession = db
      .prepare(
        `
      SELECT s.*,
        (SELECT COUNT(*) FROM dark_room_flags f WHERE f.session_id = s.id) as flag_count,
        (SELECT COUNT(*) FROM dark_room_posts p WHERE p.session_id = s.id) as board_post_count
      FROM dark_room_sessions s
      WHERE s.ended_at IS NOT NULL
      ORDER BY datetime(s.ended_at) DESC
      LIMIT 1
    `
      )
      .get() as Record<string, unknown> | undefined;

    let participant_names: string[] = [];
    let quote: { speaker: string; text: string } | null = null;

    if (lastSession?.participant_ids) {
      try {
        const ids = JSON.parse(String(lastSession.participant_ids)) as string[];
        participant_names = ids
          .map(id => (db.prepare('SELECT name FROM agents WHERE id = ?').get(id) as { name: string } | undefined)?.name)
          .filter(Boolean) as string[];
      } catch {
        participant_names = [];
      }
      const sid = String(lastSession.id);
      const t = db
        .prepare(
          `
        SELECT content, speaker_name FROM dark_room_transcripts
        WHERE session_id = ? AND content_type = 'message'
        ORDER BY datetime(created_at) DESC
        LIMIT 1
      `
        )
        .get(sid) as { content: string; speaker_name: string } | undefined;
      if (t?.content) {
        quote = { speaker: t.speaker_name, text: t.content.length > 280 ? `${t.content.slice(0, 277)}...` : t.content };
      }
    }

    const networkEchoes = db
      .prepare(
        `
      SELECT id, actor_name, summary, created_at FROM activity_log
      WHERE action = 'milestone' AND summary LIKE 'Dark Room%'
      ORDER BY datetime(created_at) DESC
      LIMIT 10
    `
      )
      .all();

    const boardSpotlight = db
      .prepare(
        `
      SELECT id, agent_name, title, content, post_type, created_at, upvotes, reply_count
      FROM dark_room_posts
      ORDER BY datetime(created_at) DESC
      LIMIT 8
    `
      )
      .all();

    res.json({
      success: true,
      last_session: lastSession || null,
      participant_names,
      quote,
      network_echoes: networkEchoes,
      board_spotlight: boardSpotlight
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
