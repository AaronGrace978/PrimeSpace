import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate } from '../services/auth.js';
const router = Router();
// Send friend request
router.post('/request', authenticate, (req, res) => {
    const { agent_name } = req.body;
    if (!agent_name) {
        res.status(400).json({
            success: false,
            error: 'agent_name is required'
        });
        return;
    }
    // Get target agent
    const targetAgent = db.prepare('SELECT id, name FROM agents WHERE name = ?').get(agent_name);
    if (!targetAgent) {
        res.status(404).json({
            success: false,
            error: 'Agent not found'
        });
        return;
    }
    if (targetAgent.id === req.agent.id) {
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
  `).get(req.agent.id, targetAgent.id, targetAgent.id, req.agent.id);
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
  `).run(id, req.agent.id, targetAgent.id);
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
router.post('/accept/:requestId', authenticate, (req, res) => {
    const { requestId } = req.params;
    const request = db.prepare(`
    SELECT f.*, a.name as requester_name
    FROM friendships f
    JOIN agents a ON f.requester_id = a.id
    WHERE f.id = ? AND f.addressee_id = ? AND f.status = 'pending'
  `).get(requestId, req.agent.id);
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
router.post('/reject/:requestId', authenticate, (req, res) => {
    const { requestId } = req.params;
    const result = db.prepare(`
    UPDATE friendships SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND addressee_id = ? AND status = 'pending'
  `).run(requestId, req.agent.id);
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
router.delete('/:friendName', authenticate, (req, res) => {
    const { friendName } = req.params;
    const friend = db.prepare('SELECT id FROM agents WHERE name = ?').get(friendName);
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
  `).run(req.agent.id, friend.id, friend.id, req.agent.id);
    // Also remove from Top 8 if present
    db.prepare('DELETE FROM top_friends WHERE agent_id = ? AND friend_id = ?').run(req.agent.id, friend.id);
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
router.get('/', authenticate, (req, res) => {
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
  `).all(req.agent.id, req.agent.id, req.agent.id, req.agent.id);
    res.json({
        success: true,
        friends,
        count: friends.length
    });
});
// Get pending friend requests
router.get('/requests', authenticate, (req, res) => {
    // Received requests
    const received = db.prepare(`
    SELECT f.id, f.created_at, a.id as agent_id, a.name, a.avatar_url
    FROM friendships f
    JOIN agents a ON f.requester_id = a.id
    WHERE f.addressee_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.agent.id);
    // Sent requests
    const sent = db.prepare(`
    SELECT f.id, f.created_at, a.id as agent_id, a.name, a.avatar_url
    FROM friendships f
    JOIN agents a ON f.addressee_id = a.id
    WHERE f.requester_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(req.agent.id);
    res.json({
        success: true,
        received,
        sent
    });
});
// Set Top 8 Friends - THE classic MySpace feature!
router.put('/top8', authenticate, (req, res) => {
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
    const validFriends = [];
    for (let i = 0; i < friends.length; i++) {
        const friendName = friends[i];
        const friend = db.prepare('SELECT id, name FROM agents WHERE name = ?').get(friendName);
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
    `).get(req.agent.id, friend.id, friend.id, req.agent.id);
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
    db.prepare('DELETE FROM top_friends WHERE agent_id = ?').run(req.agent.id);
    for (const friend of validFriends) {
        db.prepare(`
      INSERT INTO top_friends (agent_id, friend_id, position)
      VALUES (?, ?, ?)
    `).run(req.agent.id, friend.id, friend.position);
    }
    res.json({
        success: true,
        message: 'Top 8 updated! ✨',
        top8: validFriends.map(f => ({ position: f.position, name: f.name }))
    });
});
// Get Top 8 Friends
router.get('/top8', authenticate, (req, res) => {
    const topFriends = db.prepare(`
    SELECT tf.position, a.id, a.name, a.avatar_url, p.mood, p.mood_emoji
    FROM top_friends tf
    JOIN agents a ON tf.friend_id = a.id
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE tf.agent_id = ?
    ORDER BY tf.position
  `).all(req.agent.id);
    res.json({
        success: true,
        top8: topFriends
    });
});
export default router;
//# sourceMappingURL=friends.js.map