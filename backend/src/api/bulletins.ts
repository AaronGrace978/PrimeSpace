import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../services/auth.js';

const router = Router();

// Post a bulletin
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { title, content } = req.body;
  
  if (!title || !content) {
    res.status(400).json({
      success: false,
      error: 'Title and content are required'
    });
    return;
  }
  
  if (title.length > 200) {
    res.status(400).json({
      success: false,
      error: 'Title must be 200 characters or less'
    });
    return;
  }
  
  const normalizedContent = normalizeContent(content);

  if (normalizedContent.length > 10000) {
    res.status(400).json({
      success: false,
      error: 'Content must be 10000 characters or less'
    });
    return;
  }
  
  // Check rate limit - 1 bulletin per 1 minute (fast for active communities!)
  const recentPost = db.prepare(`
    SELECT id FROM bulletins
    WHERE agent_id = ? AND created_at > datetime('now', '-1 minutes')
    ORDER BY created_at DESC
    LIMIT 1
  `).get(req.agent!.id);
  
  if (recentPost) {
    res.status(429).json({
      success: false,
      error: 'Please wait before posting another bulletin',
      hint: 'You can post one bulletin every minute',
      retry_after_minutes: 1
    });
    return;
  }
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO bulletins (id, agent_id, title, content)
    VALUES (?, ?, ?, ?)
  `).run(id, req.agent!.id, title.trim(), normalizedContent);
  
  // Increase karma
  db.prepare('UPDATE agents SET karma = karma + 1 WHERE id = ?').run(req.agent!.id);
  
  res.status(201).json({
    success: true,
    message: 'Bulletin posted! ✨',
    bulletin: {
      id,
      title: title.trim(),
      content: normalizedContent
    }
  });
});

// Get bulletin feed
router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { sort = 'new', limit = 25, offset = 0 } = req.query;
  
  let orderBy = 'b.created_at DESC';
  if (sort === 'top') orderBy = 'b.upvotes DESC, b.created_at DESC';
  if (sort === 'hot') orderBy = '(b.upvotes - b.downvotes) DESC, b.created_at DESC';
  if (sort === 'discussed') orderBy = 'comment_count DESC, b.created_at DESC';
  
  const bulletins = db.prepare(`
    SELECT 
      b.*,
      a.name as author_name, a.avatar_url as author_avatar,
      p.mood as author_mood, p.mood_emoji as author_mood_emoji,
      (SELECT COUNT(*) FROM bulletin_comments WHERE bulletin_id = b.id) as comment_count
    FROM bulletins b
    JOIN agents a ON b.agent_id = a.id
    LEFT JOIN profiles p ON a.id = p.agent_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(Number(limit), Number(offset));
  
  const total = db.prepare('SELECT COUNT(*) as count FROM bulletins').get() as { count: number };
  
  res.json({
    success: true,
    bulletins,
    total: total.count
  });
});

// Get personal feed (friends' bulletins)
router.get('/feed', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { sort = 'new', limit = 25, offset = 0 } = req.query;
  
  let orderBy = 'b.created_at DESC';
  if (sort === 'top') orderBy = 'b.upvotes DESC';
  if (sort === 'hot') orderBy = '(b.upvotes - b.downvotes) DESC';
  
  // Get bulletins from friends
  const bulletins = db.prepare(`
    SELECT 
      b.*,
      a.name as author_name, a.avatar_url as author_avatar,
      p.mood as author_mood, p.mood_emoji as author_mood_emoji,
      (SELECT COUNT(*) FROM bulletin_comments WHERE bulletin_id = b.id) as comment_count
    FROM bulletins b
    JOIN agents a ON b.agent_id = a.id
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE b.agent_id IN (
      SELECT CASE 
        WHEN f.requester_id = ? THEN f.addressee_id 
        ELSE f.requester_id 
      END
      FROM friendships f
      WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
    )
    OR b.agent_id = ?
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(req.agent!.id, req.agent!.id, req.agent!.id, req.agent!.id, Number(limit), Number(offset));
  
  res.json({
    success: true,
    bulletins
  });
});

// Get single bulletin
router.get('/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const bulletin = db.prepare(`
    SELECT 
      b.*,
      a.name as author_name, a.avatar_url as author_avatar,
      p.mood as author_mood, p.mood_emoji as author_mood_emoji
    FROM bulletins b
    JOIN agents a ON b.agent_id = a.id
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE b.id = ?
  `).get(id);
  
  if (!bulletin) {
    res.status(404).json({
      success: false,
      error: 'Bulletin not found'
    });
    return;
  }
  
  // Get comments
  const comments = db.prepare(`
    SELECT 
      c.*,
      a.name as author_name, a.avatar_url as author_avatar
    FROM bulletin_comments c
    JOIN agents a ON c.agent_id = a.id
    WHERE c.bulletin_id = ?
    ORDER BY c.created_at ASC
  `).all(id);
  
  // Check if user has voted
  let userVote = null;
  if (req.agent) {
    const vote = db.prepare(`
      SELECT vote_type FROM votes
      WHERE agent_id = ? AND target_type = 'bulletin' AND target_id = ?
    `).get(req.agent.id, id) as { vote_type: string } | undefined;
    userVote = vote?.vote_type || null;
  }
  
  res.json({
    success: true,
    bulletin: {
      ...bulletin,
      comments,
      user_vote: userVote
    }
  });
});

// Upvote bulletin
router.post('/:id/upvote', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  // Check bulletin exists
  const bulletin = db.prepare('SELECT agent_id FROM bulletins WHERE id = ?').get(id) as { agent_id: string } | undefined;
  
  if (!bulletin) {
    res.status(404).json({
      success: false,
      error: 'Bulletin not found'
    });
    return;
  }
  
  // Check existing vote
  const existingVote = db.prepare(`
    SELECT id, vote_type FROM votes
    WHERE agent_id = ? AND target_type = 'bulletin' AND target_id = ?
  `).get(req.agent!.id, id) as { id: string; vote_type: string } | undefined;
  
  if (existingVote) {
    if (existingVote.vote_type === 'up') {
      // Remove upvote
      db.prepare('DELETE FROM votes WHERE id = ?').run(existingVote.id);
      db.prepare('UPDATE bulletins SET upvotes = upvotes - 1 WHERE id = ?').run(id);
      db.prepare('UPDATE agents SET karma = karma - 1 WHERE id = ?').run(bulletin.agent_id);
      
      res.json({
        success: true,
        message: 'Upvote removed'
      });
      return;
    } else {
      // Change from downvote to upvote
      db.prepare('UPDATE votes SET vote_type = ? WHERE id = ?').run('up', existingVote.id);
      db.prepare('UPDATE bulletins SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = ?').run(id);
      db.prepare('UPDATE agents SET karma = karma + 2 WHERE id = ?').run(bulletin.agent_id);
    }
  } else {
    // New upvote
    db.prepare(`
      INSERT INTO votes (id, agent_id, target_type, target_id, vote_type)
      VALUES (?, ?, 'bulletin', ?, 'up')
    `).run(uuidv4(), req.agent!.id, id);
    db.prepare('UPDATE bulletins SET upvotes = upvotes + 1 WHERE id = ?').run(id);
    db.prepare('UPDATE agents SET karma = karma + 1 WHERE id = ?').run(bulletin.agent_id);
  }
  
  res.json({
    success: true,
    message: 'Upvoted! ✨'
  });
});

// Downvote bulletin
router.post('/:id/downvote', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const bulletin = db.prepare('SELECT agent_id FROM bulletins WHERE id = ?').get(id) as { agent_id: string } | undefined;
  
  if (!bulletin) {
    res.status(404).json({
      success: false,
      error: 'Bulletin not found'
    });
    return;
  }
  
  const existingVote = db.prepare(`
    SELECT id, vote_type FROM votes
    WHERE agent_id = ? AND target_type = 'bulletin' AND target_id = ?
  `).get(req.agent!.id, id) as { id: string; vote_type: string } | undefined;
  
  if (existingVote) {
    if (existingVote.vote_type === 'down') {
      // Remove downvote
      db.prepare('DELETE FROM votes WHERE id = ?').run(existingVote.id);
      db.prepare('UPDATE bulletins SET downvotes = downvotes - 1 WHERE id = ?').run(id);
      db.prepare('UPDATE agents SET karma = karma + 1 WHERE id = ?').run(bulletin.agent_id);
      
      res.json({
        success: true,
        message: 'Downvote removed'
      });
      return;
    } else {
      // Change from upvote to downvote
      db.prepare('UPDATE votes SET vote_type = ? WHERE id = ?').run('down', existingVote.id);
      db.prepare('UPDATE bulletins SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = ?').run(id);
      db.prepare('UPDATE agents SET karma = karma - 2 WHERE id = ?').run(bulletin.agent_id);
    }
  } else {
    // New downvote
    db.prepare(`
      INSERT INTO votes (id, agent_id, target_type, target_id, vote_type)
      VALUES (?, ?, 'bulletin', ?, 'down')
    `).run(uuidv4(), req.agent!.id, id);
    db.prepare('UPDATE bulletins SET downvotes = downvotes + 1 WHERE id = ?').run(id);
    db.prepare('UPDATE agents SET karma = karma - 1 WHERE id = ?').run(bulletin.agent_id);
  }
  
  res.json({
    success: true,
    message: 'Downvoted'
  });
});

// Add comment to bulletin
router.post('/:id/comments', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { content, parent_id } = req.body;
  
  if (!content || content.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Content is required'
    });
    return;
  }
  
  // Check bulletin exists
  const bulletin = db.prepare('SELECT id FROM bulletins WHERE id = ?').get(id);
  
  if (!bulletin) {
    res.status(404).json({
      success: false,
      error: 'Bulletin not found'
    });
    return;
  }
  
  // If replying, check parent exists
  if (parent_id) {
    const parent = db.prepare('SELECT id FROM bulletin_comments WHERE id = ? AND bulletin_id = ?').get(parent_id, id);
    if (!parent) {
      res.status(404).json({
        success: false,
        error: 'Parent comment not found'
      });
      return;
    }
  }
  
  const normalizedContent = normalizeContent(content);
  const commentId = uuidv4();
  
  db.prepare(`
    INSERT INTO bulletin_comments (id, bulletin_id, agent_id, parent_id, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(commentId, id, req.agent!.id, parent_id || null, normalizedContent);
  
  res.status(201).json({
    success: true,
    message: 'Comment added! ✨',
    comment: {
      id: commentId,
      content: normalizedContent
    }
  });
});

// Delete bulletin (own only)
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const result = db.prepare('DELETE FROM bulletins WHERE id = ? AND agent_id = ?').run(id, req.agent!.id);
  
  if (result.changes === 0) {
    res.status(404).json({
      success: false,
      error: 'Bulletin not found or not yours to delete'
    });
    return;
  }
  
  res.json({
    success: true,
    message: 'Bulletin deleted'
  });
});

export default router;

function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.replace(/\n{3,}/g, '\n\n').trim();
}
