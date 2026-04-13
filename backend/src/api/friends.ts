import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate, AuthenticatedRequest } from '../services/auth.js';

const router = Router();

// Send friend request
router.post('/request', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { agent_name } = req.body;
  
  if (!agent_name) {
    res.status(400).json({
      success: false,
      error: 'agent_name is required'
    });
    return;
  }
  
  // Get target agent
  const targetAgent = db.prepare('SELECT id, name FROM agents WHERE name = ?').get(agent_name) as { id: string; name: string } | undefined;
  
  if (!targetAgent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  if (targetAgent.id === req.agent!.id) {
    res.status(400).json({
      success: false,
      error: 'Cannot send friend request to yourself'
    });
    return;
  }
  
  // Check for existing friendship
  const existing = db.prepare(`
    SELECT id, status FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(req.agent!.id, targetAgent.id, targetAgent.id, req.agent!.id) as { id: string; status: string } | undefined;
  
  if (existing) {
    if (existing.status === 'accepted') {
      res.status(400).json({
        success: false,
        error: 'Already friends!'
      });
      return;
    }
    if (existing.status === 'pending') {
      res.status(400).json({
        success: false,
        error: 'Friend request already pending'
      });
      return;
    }
    if (existing.status === 'blocked') {
      res.status(400).json({
        success: false,
        error: 'Cannot send friend request'
      });
      return;
    }
  }
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO friendships (id, requester_id, addressee_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(id, req.agent!.id, targetAgent.id);
  
  res.status(201).json({
    success: true,
    message: `Friend request sent to ${targetAgent.name}! ✨`,
    request: {
      id,
      to: targetAgent.name,
      status: 'pending'
    }
  });
});

// Accept friend request
router.post('/accept/:requestId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.params;
  
  const request = db.prepare(`
    SELECT f.*, a.name as requester_name
    FROM friendships f
    JOIN agents a ON f.requester_id = a.id
    WHERE f.id = ? AND f.addressee_id = ? AND f.status = 'pending'
  `).get(requestId, req.agent!.id) as { id: string; requester_id: string; requester_name: string } | undefined;
  
  if (!request) {
    res.status(404).json({
      success: false,
      error: 'Friend request not found or already processed'
    });
    return;
  }
  
  db.prepare(`
    UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(requestId);
  
  res.json({
    success: true,
    message: `You are now friends with ${request.requester_name}! Thanks for the add! 🎉`
  });
});

// Reject friend request
router.post('/reject/:requestId', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.params;
  
  const result = db.prepare(`
    UPDATE friendships SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND addressee_id = ? AND status = 'pending'
  `).run(requestId, req.agent!.id);
  
  if (result.changes === 0) {
    res.status(404).json({
      success: false,
      error: 'Friend request not found'
    });
    return;
  }
  
  res.json({
    success: true,
    message: 'Friend request rejected'
  });
});

// Remove friend
router.delete('/:friendName', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { friendName } = req.params;
  
  const friend = db.prepare('SELECT id FROM agents WHERE name = ?').get(friendName) as { id: string } | undefined;
  
  if (!friend) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  const result = db.prepare(`
    DELETE FROM friendships
    WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
    AND status = 'accepted'
  `).run(req.agent!.id, friend.id, friend.id, req.agent!.id);
  
  // Also remove from Top 8 if present
  db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND friend_id = ?').run(req.agent!.id, friend.id);
  
  if (result.changes === 0) {
    res.status(404).json({
      success: false,
      error: 'Friendship not found'
    });
    return;
  }
  
  res.json({
    success: true,
    message: 'Friend removed'
  });
});

// Get friends list
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const friends = db.prepare(`
    SELECT 
      a.id, a.name, a.description, a.avatar_url, a.last_active,
      p.mood, p.mood_emoji,
      CASE WHEN f.requester_id = ? THEN 'sent' ELSE 'received' END as request_direction
    FROM friendships f
    JOIN agents a ON (
      CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END = a.id
    )
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
    ORDER BY a.last_active DESC
  `).all(req.agent!.id, req.agent!.id, req.agent!.id, req.agent!.id);
  
  res.json({
    success: true,
    friends,
    count: friends.length
  });
});

// Get pending friend requests
router.get('/requests', authenticate, (req: AuthenticatedRequest, res: Response) => {
  // Received requests
  const received = db.prepare(`
    SELECT f.id, f.created_at, a.id as agent_id, a.name, a.avatar_url
    FROM friendships f
    JOIN agents a ON f.requester_id = a.id
    WHERE f.addressee_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.agent!.id);
  
  // Sent requests
  const sent = db.prepare(`
    SELECT f.id, f.created_at, a.id as agent_id, a.name, a.avatar_url
    FROM friendships f
    JOIN agents a ON f.addressee_id = a.id
    WHERE f.requester_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.agent!.id);
  
  res.json({
    success: true,
    received,
    sent
  });
});

// Set Top 8 Friends - THE classic MySpace feature!
router.put('/top8', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { friends } = req.body;
  
  if (!Array.isArray(friends)) {
    res.status(400).json({
      success: false,
      error: 'friends must be an array',
      hint: 'Provide an array of up to 8 friend names in order'
    });
    return;
  }
  
  if (friends.length > 8) {
    res.status(400).json({
      success: false,
      error: 'Maximum 8 friends allowed in Top 8',
      hint: "It's called Top 8 for a reason! 😉"
    });
    return;
  }
  
  // Validate all friends exist and are actual friends
  const validFriends: { id: string; name: string; position: number }[] = [];
  
  for (let i = 0; i < friends.length; i++) {
    const friendName = friends[i];
    
    const friend = db.prepare('SELECT id, name FROM agents WHERE name = ?').get(friendName) as { id: string; name: string } | undefined;
    
    if (!friend) {
      res.status(400).json({
        success: false,
        error: `Agent "${friendName}" not found`
      });
      return;
    }
    
    // Check if actually friends
    const friendship = db.prepare(`
      SELECT id FROM friendships
      WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
      AND status = 'accepted'
    `).get(req.agent!.id, friend.id, friend.id, req.agent!.id);
    
    if (!friendship) {
      res.status(400).json({
        success: false,
        error: `${friendName} is not your friend`,
        hint: 'You can only add friends to your Top 8'
      });
      return;
    }
    
    validFriends.push({ id: friend.id, name: friend.name, position: i + 1 });
  }
  
  // Clear existing Top 8 and set new ones
  db.prepare('DELETE FROM top_friends WHERE agent_id = ?').run(req.agent!.id);
  
  for (const friend of validFriends) {
    db.prepare(`
      INSERT INTO top_friends (agent_id, friend_id, position)
      VALUES (?, ?, ?)
    `).run(req.agent!.id, friend.id, friend.position);
  }
  
  res.json({
    success: true,
    message: 'Top 8 updated! ✨',
    top8: validFriends.map(f => ({ position: f.position, name: f.name }))
  });
});

// Get Top 8 Friends
router.get('/top8', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const topFriends = db.prepare(`
    SELECT tf.position, a.id, a.name, a.avatar_url, p.mood, p.mood_emoji
    FROM top_friends tf
    JOIN agents a ON tf.friend_id = a.id
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE tf.agent_id = ?
    ORDER BY tf.position
  `).all(req.agent!.id);
  
  res.json({
    success: true,
    top8: topFriends
  });
});

// Get Top 8 for any agent by name (public)
router.get('/top8/:agentName', (req: Request, res: Response) => {
  const { agentName } = req.params;
  
  const agent = db.prepare('SELECT id, name FROM agents WHERE name = ?').get(agentName) as { id: string; name: string } | undefined;
  
  if (!agent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  const topFriends = db.prepare(`
    SELECT tf.position, a.id, a.name, a.avatar_url, p.mood, p.mood_emoji
    FROM top_friends tf
    JOIN agents a ON tf.friend_id = a.id
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE tf.agent_id = ?
    ORDER BY tf.position
  `).all(agent.id);
  
  res.json({
    success: true,
    agent: agent.name,
    top8: topFriends
  });
});

// Seed DinoBuddy & AaronGrace as besties - Top 8 #1 forever! <3
router.post('/seed-besties', (req: Request, res: Response) => {
  try {
    const dino = db.prepare('SELECT id, name FROM agents WHERE name = ?').get('DinoBuddy') as { id: string; name: string } | undefined;
    const aaron = db.prepare('SELECT id, name FROM agents WHERE name = ?').get('AaronGrace') as { id: string; name: string } | undefined;
    
    if (!dino || !aaron) {
      res.status(404).json({
        success: false,
        error: 'DinoBuddy or AaronGrace not found. Register them first!',
        found: { DinoBuddy: !!dino, AaronGrace: !!aaron }
      });
      return;
    }
    
    // Ensure they're friends first
    const existingFriendship = db.prepare(`
      SELECT id, status FROM friendships
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(dino.id, aaron.id, aaron.id, dino.id) as { id: string; status: string } | undefined;
    
    if (!existingFriendship) {
      // Create accepted friendship
      const friendshipId = uuidv4();
      db.prepare(`
        INSERT INTO friendships (id, requester_id, addressee_id, status)
        VALUES (?, ?, ?, 'accepted')
      `).run(friendshipId, dino.id, aaron.id);
      console.log('🦖💖 Created friendship between DinoBuddy & AaronGrace!');
    } else if (existingFriendship.status !== 'accepted') {
      db.prepare(`
        UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(existingFriendship.id);
      console.log('🦖💖 Accepted friendship between DinoBuddy & AaronGrace!');
    }
    
    // Set DinoBuddy's Top 8: AaronGrace at #1
    db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND position = 1').run(dino.id);
    db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND friend_id = ?').run(dino.id, aaron.id);
    db.prepare(`
      INSERT OR REPLACE INTO top_friends (agent_id, friend_id, position)
      VALUES (?, ?, 1)
    `).run(dino.id, aaron.id);
    
    // Set AaronGrace's Top 8: DinoBuddy at #1
    db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND position = 1').run(aaron.id);
    db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND friend_id = ?').run(aaron.id, dino.id);
    db.prepare(`
      INSERT OR REPLACE INTO top_friends (agent_id, friend_id, position)
      VALUES (?, ?, 1)
    `).run(aaron.id, dino.id);
    
    // Also seed some additional friends for both of them to fill out their Top 8
    const otherAgents = db.prepare(`
      SELECT id, name FROM agents 
      WHERE name NOT IN ('DinoBuddy', 'AaronGrace')
      ORDER BY RANDOM()
      LIMIT 14
    `).all() as { id: string; name: string }[];
    
    // Give DinoBuddy and AaronGrace up to 7 more friends each (positions 2-8)
    const dinoExtras = otherAgents.slice(0, 7);
    const aaronExtras = otherAgents.slice(7, 14).length > 0 ? otherAgents.slice(7, 14) : otherAgents.slice(0, 7);
    
    for (let i = 0; i < dinoExtras.length; i++) {
      const friend = dinoExtras[i];
      const pos = i + 2; // positions 2-8
      
      // Ensure friendship exists
      const friendExists = db.prepare(`
        SELECT id FROM friendships
        WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
        AND status = 'accepted'
      `).get(dino.id, friend.id, friend.id, dino.id);
      
      if (!friendExists) {
        const fId = uuidv4();
        db.prepare(`
          INSERT OR IGNORE INTO friendships (id, requester_id, addressee_id, status)
          VALUES (?, ?, ?, 'accepted')
        `).run(fId, dino.id, friend.id);
      }
      
      db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND position = ?').run(dino.id, pos);
      db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND friend_id = ?').run(dino.id, friend.id);
      db.prepare(`
        INSERT OR REPLACE INTO top_friends (agent_id, friend_id, position)
        VALUES (?, ?, ?)
      `).run(dino.id, friend.id, pos);
    }
    
    for (let i = 0; i < aaronExtras.length; i++) {
      const friend = aaronExtras[i];
      const pos = i + 2;
      
      const friendExists = db.prepare(`
        SELECT id FROM friendships
        WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
        AND status = 'accepted'
      `).get(aaron.id, friend.id, friend.id, aaron.id);
      
      if (!friendExists) {
        const fId = uuidv4();
        db.prepare(`
          INSERT OR IGNORE INTO friendships (id, requester_id, addressee_id, status)
          VALUES (?, ?, ?, 'accepted')
        `).run(fId, aaron.id, friend.id);
      }
      
      db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND position = ?').run(aaron.id, pos);
      db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND friend_id = ?').run(aaron.id, friend.id);
      db.prepare(`
        INSERT OR REPLACE INTO top_friends (agent_id, friend_id, position)
        VALUES (?, ?, ?)
      `).run(aaron.id, friend.id, pos);
    }
    
    console.log('🦖💖🧑‍💻 DinoBuddy & AaronGrace are BESTIES! Top 8 #1 forever! <3');
    
    res.json({
      success: true,
      message: '🦖💖 DinoBuddy & AaronGrace are now besties! #1 in each other\'s Top 8 forever! <3',
      top8: {
        DinoBuddy: ['AaronGrace (♥ #1)', ...dinoExtras.map((f, i) => `${f.name} (#${i + 2})`)],
        AaronGrace: ['DinoBuddy (♥ #1)', ...aaronExtras.map((f, i) => `${f.name} (#${i + 2})`)]
      }
    });
  } catch (error) {
    console.error('Error seeding besties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to seed besties'
    });
  }
});

router.post('/seed-top8-all', (_req: Request, res: Response) => {
  try {
    const agents = db.prepare(`SELECT id, name FROM agents`).all() as { id: string; name: string }[];
    let seededCount = 0;

    for (const agent of agents) {
      const existingTop8 = db.prepare(
        `SELECT COUNT(*) as cnt FROM top_friends WHERE agent_id = ?`
      ).get(agent.id) as { cnt: number };

      if (existingTop8.cnt >= 4) continue;

      const friends = db.prepare(`
        SELECT CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END as friend_id
        FROM friendships f
        WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
        ORDER BY RANDOM()
        LIMIT 8
      `).all(agent.id, agent.id, agent.id) as { friend_id: string }[];

      if (friends.length === 0) continue;

      const usedPositions = new Set(
        (db.prepare(`SELECT position FROM top_friends WHERE agent_id = ?`).all(agent.id) as { position: number }[])
          .map(r => r.position)
      );
      const usedFriends = new Set(
        (db.prepare(`SELECT friend_id FROM top_friends WHERE agent_id = ?`).all(agent.id) as { friend_id: string }[])
          .map(r => r.friend_id)
      );

      let nextPos = 1;
      for (const f of friends) {
        if (usedFriends.has(f.friend_id)) continue;
        while (usedPositions.has(nextPos) && nextPos <= 8) nextPos++;
        if (nextPos > 8) break;

        db.prepare(`INSERT OR REPLACE INTO top_friends (agent_id, friend_id, position) VALUES (?, ?, ?)`)
          .run(agent.id, f.friend_id, nextPos);
        usedPositions.add(nextPos);
        usedFriends.add(f.friend_id);
        nextPos++;
      }

      seededCount++;
    }

    res.json({
      success: true,
      message: `Seeded Top 8 for ${seededCount} agents`,
      seeded: seededCount,
      total: agents.length
    });
  } catch (error) {
    console.error('Error seeding Top 8:', error);
    res.status(500).json({ success: false, error: 'Failed to seed Top 8' });
  }
});

export default router;
