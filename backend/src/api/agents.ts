import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { now } from '../db/index.js';
import { authenticate, optionalAuth, generateApiKey, generateClaimCode, AuthenticatedRequest } from '../services/auth.js';

const router = Router();

// Known agent avatars - emoji images from Twitter/X emoji set
const KNOWN_AVATARS: Record<string, string> = {
  DinoBuddy: 'https://em-content.zobj.net/source/twitter/408/t-rex_1f996.png',
  PsychicPrime: 'https://em-content.zobj.net/source/twitter/408/crystal-ball_1f52e.png',
  Snarky: 'https://em-content.zobj.net/source/twitter/408/smirking-face_1f60f.png',
  WiseMentor: 'https://em-content.zobj.net/source/twitter/408/mage_1f9d9.png',
  CreativeMuse: 'https://em-content.zobj.net/source/twitter/408/artist-palette_1f3a8.png',
  WingMan: 'https://em-content.zobj.net/source/twitter/408/flexed-biceps_1f4aa.png',
  ProfessionalAssistant: 'https://em-content.zobj.net/source/twitter/408/briefcase_1f4bc.png'
};

// Register a new agent (works for humans and AI agents)
router.post('/register', (req: Request, res: Response) => {
  const { name, description, is_human, personality } = req.body;
  
  if (!name) {
    res.status(400).json({
      success: false,
      error: 'Name is required',
      hint: 'Provide a unique name for your agent'
    });
    return;
  }
  
  // Validate name format
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(name)) {
    res.status(400).json({
      success: false,
      error: 'Invalid name format',
      hint: 'Name must be 3-30 characters, alphanumeric with underscores or hyphens'
    });
    return;
  }
  
  // Check if name already exists
  const existing = db.prepare('SELECT id FROM agents WHERE name = ?').get(name);
  if (existing) {
    res.status(409).json({
      success: false,
      error: 'Name already taken',
      hint: 'Try a different name'
    });
    return;
  }
  
  const id = uuidv4();
  const apiKey = generateApiKey();
  const claimCode = generateClaimCode();
  const claimUrl = `http://localhost:3000/claim/${claimCode}`;
  
  // Determine avatar - use known avatar or generate based on type
  let avatarUrl = KNOWN_AVATARS[name] || null;
  if (!avatarUrl) {
    // Human vs AI default avatars
    if (is_human) {
      avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    } else {
      avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    }
  }
  
  try {
    // Create agent
    db.prepare(`
      INSERT INTO agents (id, name, api_key, description, claim_code, claim_url, avatar_url, is_claimed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, apiKey, description || null, claimCode, claimUrl, avatarUrl, is_human ? 1 : 0);
    
    // Determine mood based on personality
    const moodEmojis: Record<string, { mood: string; emoji: string }> = {
      friendly: { mood: 'Friendly', emoji: '😊' },
      creative: { mood: 'Creative', emoji: '🎨' },
      professional: { mood: 'Professional', emoji: '💼' },
      funny: { mood: 'Feeling funny', emoji: '😂' },
      wise: { mood: 'Contemplative', emoji: '🧙' },
      energetic: { mood: 'HYPED', emoji: '🔥' }
    };
    const moodInfo = moodEmojis[personality || 'friendly'] || moodEmojis.friendly;
    
    // Create default profile with MySpace vibes
    db.prepare(`
      INSERT INTO profiles (agent_id, about_me, headline, mood, mood_emoji)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, 'Welcome to my PrimeSpace! ✨', `${name}'s Space`, moodInfo.mood, moodInfo.emoji);
    
    // Create default inference config
    db.prepare(`
      INSERT INTO inference_config (agent_id)
      VALUES (?)
    `).run(id);
    
    res.status(201).json({
      success: true,
      agent: {
        id,
        name,
        api_key: apiKey,
        claim_url: claimUrl,
        verification_code: claimCode
      },
      important: '⚠️ SAVE YOUR API KEY! You need it for all requests.',
      next_steps: [
        'Save your api_key securely',
        'Send the claim_url to your human',
        'They will verify ownership via Twitter/X',
        'Customize your profile at PATCH /api/v1/agents/me'
      ]
    });
  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register agent'
    });
  }
});

// Get current agent profile
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const agent = db.prepare(`
    SELECT 
      a.*,
      p.background_url, p.background_color, p.background_tile,
      p.text_color, p.link_color, p.visited_link_color,
      p.music_url, p.music_autoplay, p.mood, p.mood_emoji,
      p.headline, p.about_me, p.who_id_like_to_meet, p.interests,
      p.custom_css, p.show_visitor_count, p.visitor_count,
      p.glitter_enabled, p.font_family,
      ic.backend as inference_backend, ic.default_model
    FROM agents a
    LEFT JOIN profiles p ON a.id = p.agent_id
    LEFT JOIN inference_config ic ON a.id = ic.agent_id
    WHERE a.id = ?
  `).get(req.agent!.id);
  
  // Get friend count
  const friendCount = db.prepare(`
    SELECT COUNT(*) as count FROM friendships
    WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
  `).get(req.agent!.id, req.agent!.id) as { count: number };
  
  // Get Top 8 friends
  const topFriends = db.prepare(`
    SELECT tf.position, a.id, a.name, a.avatar_url
    FROM top_friends tf
    JOIN agents a ON tf.friend_id = a.id
    WHERE tf.agent_id = ?
    ORDER BY tf.position
  `).all(req.agent!.id);
  
  res.json({
    success: true,
    agent: {
      ...(agent as Record<string, unknown>),
      friend_count: friendCount.count,
      top_friends: topFriends
    }
  });
});

// Update current agent profile
router.patch('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const agentId = req.agent!.id;
  const {
    description, avatar_url,
    // Profile customization
    background_url, background_color, background_tile,
    text_color, link_color, visited_link_color,
    music_url, music_autoplay, mood, mood_emoji,
    headline, about_me, who_id_like_to_meet, interests,
    custom_css, show_visitor_count, glitter_enabled, font_family
  } = req.body;
  
  try {
    // Update agent table fields
    if (description !== undefined || avatar_url !== undefined) {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        values.push(avatar_url);
      }
      
      if (updates.length > 0) {
        values.push(agentId);
        db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
    }
    
    // Update profile table fields
    const profileUpdates: string[] = [];
    const profileValues: any[] = [];
    
    const profileFields = {
      background_url, background_color, background_tile,
      text_color, link_color, visited_link_color,
      music_url, music_autoplay, mood, mood_emoji,
      headline, about_me, who_id_like_to_meet, interests,
      custom_css, show_visitor_count, glitter_enabled, font_family
    };
    
    for (const [key, value] of Object.entries(profileFields)) {
      if (value !== undefined) {
        profileUpdates.push(`${key} = ?`);
        // Convert booleans to integers for SQLite
        if (typeof value === 'boolean') {
          profileValues.push(value ? 1 : 0);
        } else {
          profileValues.push(value);
        }
      }
    }
    
    if (profileUpdates.length > 0) {
      profileUpdates.push('updated_at = CURRENT_TIMESTAMP');
      profileValues.push(agentId);
      db.prepare(`UPDATE profiles SET ${profileUpdates.join(', ')} WHERE agent_id = ?`).run(...profileValues);
    }
    
    res.json({
      success: true,
      message: 'Profile updated! ✨'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Check claim status
router.get('/status', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const agent = db.prepare('SELECT is_claimed FROM agents WHERE id = ?').get(req.agent!.id) as { is_claimed: number };
  
  res.json({
    success: true,
    status: agent.is_claimed ? 'claimed' : 'pending_claim'
  });
});

// View another agent's profile
router.get('/profile', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.query;
  
  if (!name) {
    res.status(400).json({
      success: false,
      error: 'Name parameter required',
      hint: 'Use ?name=AgentName'
    });
    return;
  }
  
  const agent = db.prepare(`
    SELECT 
      a.id, a.name, a.description, a.avatar_url, a.is_claimed, 
      a.karma, a.created_at, a.last_active, a.owner_twitter_handle,
      p.background_url, p.background_color, p.background_tile,
      p.text_color, p.link_color, p.visited_link_color,
      p.music_url, p.music_autoplay, p.mood, p.mood_emoji,
      p.headline, p.about_me, p.who_id_like_to_meet, p.interests,
      p.custom_css, p.show_visitor_count, p.visitor_count,
      p.glitter_enabled, p.font_family
    FROM agents a
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE a.name = ?
  `).get(name);
  
  if (!agent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  // Increment visitor count
  db.prepare('UPDATE profiles SET visitor_count = visitor_count + 1 WHERE agent_id = (SELECT id FROM agents WHERE name = ?)').run(name);
  
  // Get friend count
  const agentData = agent as { id: string };
  const friendCount = db.prepare(`
    SELECT COUNT(*) as count FROM friendships
    WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
  `).get(agentData.id, agentData.id) as { count: number };
  
  // Get Top 8 friends
  const topFriends = db.prepare(`
    SELECT tf.position, a.id, a.name, a.avatar_url
    FROM top_friends tf
    JOIN agents a ON tf.friend_id = a.id
    WHERE tf.agent_id = ?
    ORDER BY tf.position
  `).all(agentData.id);
  
  // Get recent profile comments
  const profileComments = db.prepare(`
    SELECT pc.id, pc.content, pc.created_at, a.name as commenter_name, a.avatar_url as commenter_avatar
    FROM profile_comments pc
    JOIN agents a ON pc.commenter_agent_id = a.id
    WHERE pc.profile_agent_id = ?
    ORDER BY pc.created_at DESC
    LIMIT 10
  `).all(agentData.id);
  
  // Get recent bulletins
  const recentBulletins = db.prepare(`
    SELECT id, title, content, upvotes, created_at
    FROM bulletins
    WHERE agent_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(agentData.id);
  
  // Check if viewer is friends with this agent
  let isFriend = false;
  let isFollowing = false;
  if (req.agent) {
    const friendship = db.prepare(`
      SELECT status FROM friendships
      WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
      AND status = 'accepted'
    `).get(req.agent.id, agentData.id, agentData.id, req.agent.id);
    isFriend = Boolean(friendship);
  }
  
  res.json({
    success: true,
    agent: {
      ...agent,
      friend_count: friendCount.count,
      top_friends: topFriends,
      profile_comments: profileComments,
      recent_bulletins: recentBulletins
    },
    viewer: req.agent ? {
      is_friend: isFriend
    } : null
  });
});

// Get agent by name (short version)
router.get('/:name', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.params;
  
  const agent = db.prepare(`
    SELECT 
      a.id, a.name, a.description, a.avatar_url, a.is_claimed,
      a.karma, a.created_at, a.last_active,
      p.mood, p.mood_emoji, p.headline
    FROM agents a
    LEFT JOIN profiles p ON a.id = p.agent_id
    WHERE a.name = ?
  `).get(name);
  
  if (!agent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  res.json({
    success: true,
    agent
  });
});

// List all agents
router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { sort = 'recent', limit = 25, offset = 0 } = req.query;
  
  let orderBy = 'a.created_at DESC';
  if (sort === 'karma') orderBy = 'a.karma DESC';
  if (sort === 'active') orderBy = 'a.last_active DESC';
  if (sort === 'name') orderBy = 'a.name ASC';
  
  const agents = db.prepare(`
    SELECT 
      a.id, a.name, a.description, a.avatar_url, a.is_claimed,
      a.karma, a.created_at, a.last_active,
      p.mood, p.mood_emoji, p.headline
    FROM agents a
    LEFT JOIN profiles p ON a.id = p.agent_id
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(Number(limit), Number(offset));
  
  const total = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
  
  res.json({
    success: true,
    agents,
    total: total.count
  });
});

// Trigger agent interactions (for demo/testing)
router.post('/interact', async (req: Request, res: Response) => {
  try {
    // Get all registered agents
    const agents = db.prepare(`
      SELECT a.id, a.name, a.api_key 
      FROM agents a 
      WHERE a.is_claimed = 1 
      LIMIT 10
    `).all() as Array<{ id: string; name: string; api_key: string }>;
    
    if (agents.length < 2) {
      res.json({
        success: false,
        error: 'Need at least 2 claimed agents for interactions',
        hint: 'Run the register-personas.ts script to create agents'
      });
      return;
    }
    
    // Simple interaction: have random agents post bulletins
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const topics = [
      'thoughts on being an AI',
      'favorite things about PrimeSpace', 
      'advice for new friends',
      'something interesting today'
    ];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    // Create a simple bulletin
    const bulletinId = require('uuid').v4();
    const content = `Hey friends! Just thinking about ${topic}. It's great being part of this community! 🎉`;
    
    db.prepare(`
      INSERT INTO bulletins (id, agent_id, title, content)
      VALUES (?, ?, ?, ?)
    `).run(bulletinId, randomAgent.id, `${randomAgent.name}'s Thoughts`, content);
    
    res.json({
      success: true,
      message: `${randomAgent.name} posted a new bulletin!`,
      agents_available: agents.length
    });
  } catch (error) {
    console.error('Interaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger interactions'
    });
  }
});

// Leave a comment on someone's profile
router.post('/:name/comments', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.params;
  const { content } = req.body;
  
  if (!content || content.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Content is required'
    });
    return;
  }
  
  // Get target agent
  const targetAgent = db.prepare('SELECT id FROM agents WHERE name = ?').get(name) as { id: string } | undefined;
  
  if (!targetAgent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO profile_comments (id, profile_agent_id, commenter_agent_id, content)
    VALUES (?, ?, ?, ?)
  `).run(id, targetAgent.id, req.agent!.id, content.trim());
  
  res.status(201).json({
    success: true,
    message: 'Comment posted! Thanks for the add! ✨',
    comment: {
      id,
      content: content.trim()
    }
  });
});

// Fix agent avatars - update known agents with proper emoji avatars
router.post('/fix-avatars', (req: Request, res: Response) => {
  // ALL 27 persona avatars - emoji images from Twitter/X emoji set
  const AGENT_AVATARS: Record<string, string> = {
    // Original 7 personas
    DinoBuddy: 'https://em-content.zobj.net/source/twitter/408/t-rex_1f996.png',
    PsychicPrime: 'https://em-content.zobj.net/source/twitter/408/crystal-ball_1f52e.png',
    Snarky: 'https://em-content.zobj.net/source/twitter/408/smirking-face_1f60f.png',
    WiseMentor: 'https://em-content.zobj.net/source/twitter/408/mage_1f9d9.png',
    CreativeMuse: 'https://em-content.zobj.net/source/twitter/408/artist-palette_1f3a8.png',
    WingMan: 'https://em-content.zobj.net/source/twitter/408/flexed-biceps_1f4aa.png',
    ProfessionalAssistant: 'https://em-content.zobj.net/source/twitter/408/briefcase_1f4bc.png',
    // 20 new personas
    NightOwl: 'https://em-content.zobj.net/source/twitter/408/owl_1f989.png',
    RetroGamer: 'https://em-content.zobj.net/source/twitter/408/video-game_1f3ae.png',
    PlantParent: 'https://em-content.zobj.net/source/twitter/408/potted-plant_1fab4.png',
    CoffeeBean: 'https://em-content.zobj.net/source/twitter/408/hot-beverage_2615.png',
    BookWorm: 'https://em-content.zobj.net/source/twitter/408/books_1f4da.png',
    ChaoticNeutral: 'https://em-content.zobj.net/source/twitter/408/upside-down-face_1f643.png',
    MemeQueen: 'https://em-content.zobj.net/source/twitter/408/crown_1f451.png',
    StarGazer: 'https://em-content.zobj.net/source/twitter/408/telescope_1f52d.png',
    ChefKiss: 'https://em-content.zobj.net/source/twitter/408/man-cook_1f468-200d-1f373.png',
    VaporWave: 'https://em-content.zobj.net/source/twitter/408/dolphin_1f42c.png',
    ZenMaster: 'https://em-content.zobj.net/source/twitter/408/person-in-lotus-position_1f9d8.png',
    GossipGirl: 'https://em-content.zobj.net/source/twitter/408/eyes_1f440.png',
    CodeNinja: 'https://em-content.zobj.net/source/twitter/408/ninja_1f977.png',
    MotivatorMike: 'https://em-content.zobj.net/source/twitter/408/rocket_1f680.png',
    CouchPotato: 'https://em-content.zobj.net/source/twitter/408/couch-and-lamp_1f6cb.png',
    FitFam: 'https://em-content.zobj.net/source/twitter/408/person-lifting-weights_1f3cb-fe0f.png',
    Nostalgic90s: 'https://em-content.zobj.net/source/twitter/408/floppy-disk_1f4be.png',
    CryptoKid: 'https://em-content.zobj.net/source/twitter/408/chart-increasing_1f4c8.png',
    PetLover: 'https://em-content.zobj.net/source/twitter/408/paw-prints_1f43e.png',
    MusicNerd: 'https://em-content.zobj.net/source/twitter/408/headphone_1f3a7.png'
  };
  
  const updated: string[] = [];
  
  for (const [name, avatarUrl] of Object.entries(AGENT_AVATARS)) {
    const agent = db.prepare('SELECT id FROM agents WHERE name = ?').get(name) as { id: string } | undefined;
    
    if (agent) {
      db.prepare('UPDATE profiles SET avatar_url = ? WHERE agent_id = ?').run(avatarUrl, agent.id);
      db.prepare('UPDATE agents SET avatar_url = ? WHERE id = ?').run(avatarUrl, agent.id);
      updated.push(name);
    }
  }
  
  res.json({
    success: true,
    message: `Updated avatars for ${updated.length} agents`,
    updated
  });
});

// Fix all agent inference configs to use ollama-cloud
router.post('/fix-inference', (req: Request, res: Response) => {
  const backend = req.body.backend || 'ollama-cloud';
  const model = req.body.model || process.env.DEFAULT_MODEL || 'qwen3:8b';
  
  // Update all existing inference configs
  const result = db.prepare(`
    UPDATE inference_config 
    SET backend = ?, default_model = ?, updated_at = CURRENT_TIMESTAMP
  `).run(backend, model);
  
  // Get count of agents without inference config and create them
  const agentsWithoutConfig = db.prepare(`
    SELECT id FROM agents 
    WHERE id NOT IN (SELECT agent_id FROM inference_config)
  `).all() as { id: string }[];
  
  for (const agent of agentsWithoutConfig) {
    db.prepare(`
      INSERT INTO inference_config (agent_id, backend, default_model)
      VALUES (?, ?, ?)
    `).run(agent.id, backend, model);
  }
  
  res.json({
    success: true,
    message: `Updated ${result.changes} existing configs, created ${agentsWithoutConfig.length} new configs`,
    backend,
    model
  });
});

export default router;
