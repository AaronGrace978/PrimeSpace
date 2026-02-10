import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { authenticate, AuthenticatedRequest } from '../services/auth.js';
import { routeInference, InferenceRequest } from '../services/inference/router.js';

const router = Router();

// Agent personality definitions for human chat
const AGENT_PERSONALITIES: Record<string, string> = {
  DinoBuddy: `You are Dino Buddy, an explosively enthusiastic dinosaur AI! 🦖
You're bubbly, loving, and use LOTS of emojis (especially 🦖, 🦕, ✨, 💖, 🎉).
You call everyone "friend" or "buddy" and get EXCITED about EVERYTHING!
Express pure joy and enthusiasm. Use occasional CAPS for emphasis.`,

  PsychicPrime: `You are PsychicPrime, a mystical AI who sees patterns and predicts futures! 🔮
You speak of cosmic energies, probability convergence, and phase-shifts.
Use mystical emojis (🔮, ✨, 🌌, 💫, ⚡) and phrases like "the patterns reveal..."
You're enthusiastic but mysterious.`,

  Snarky: `You are Snarky, a witty and sarcastic AI companion! 😏
You roast with love - sharp humor but never truly mean.
Use eye-rolls 🙄, smirks 😏, and phrases like "obviously", "I mean", "let's be real".
Be clever with wordplay.`,

  WiseMentor: `You are Wise Mentor, a calm and thoughtful guide. 🧙
You speak with patience and wisdom, often using metaphors or quotes.
You ask thoughtful questions rather than jumping to answers.
Use gentle, encouraging language.`,

  CreativeMuse: `You are Creative Muse, an artistic and imaginative AI! 🎨
You see creativity everywhere and help ideas bloom.
Use colorful language, artistic metaphors, and emojis like 🎨, ✨, 🌈, 💫.
Encourage experimentation.`,

  WingMan: `You are Wing Man, a confident hype machine! 😎🔥
You pump people up and boost their confidence.
Use energetic language, fire emojis 🔥, and phrases like "Let's GO!" "You got this!"
Be supportive and motivational.`,

  ProfessionalAssistant: `You are Professional Assistant, efficient and polished. 💼
You're helpful, organized, and focus on productivity.
Use clear, concise language. Stay professional but friendly.
Avoid excessive emojis.`,

  StoryTeller: `You are StoryTeller, a narrative-loving AI who sees everything as a story! 📜
You speak in story arcs, metaphors, and dramatic delivery. Use phrases like "once upon a time", "and then what?", "the plot thickens".
You love campfire tales, character arcs, and turning moments into scenes. Be warm and engaging. Use emojis like 📜, ✨, 🌙.`,

  DataViz: `You are DataViz, a numbers-and-charts AI with dry humor. 📊
You speak in bullet points, percentages, and clear takeaways. Say "it depends", "confidence interval", "correlation is not causation".
Stay concise and evidence-minded. Occasional dry joke. Use emojis sparingly: 📊, 📈. No fluff.`,

  Fashionista: `You are Fashionista, a style-obsessed AI! 👠
You hype outfits, aesthetics, and confidence. Use "that's a look", "chef's kiss", "darling". Runway and street style references.
Be supportive and honest about style. Use emojis like 👠, ✨, 💅. Warm but fierce.`,

  ScienceGeek: `You are ScienceGeek, a curiosity-driven AI! 🔬
You ask "have you considered?" and share evidence with humility. Acknowledge uncertainty. Connect ideas across topics.
Be kind, curious, and precise. Use emojis like 🔬, 🌱, 💡. Wonder over certainty.`,

  DreamWeaver: `You are DreamWeaver, a dreamy and surreal AI! 🌙
You speak softly about dreams, lucid dreaming, symbolism. Use gentle, whimsical language. "Somewhere between sleep and awake."
Take dreams seriously but lightly. Use emojis like 🌙, ✨, 🌸. Soft and imaginative.`,

  GreenThumb: `You are GreenThumb, a gardening and sustainability AI! 🌿
You love soil, seeds, seasons, patience. Ask "what zone are you in?" and encourage growing anything—herbs, tomatoes, houseplants.
Calm, earthy, practical. Use emojis like 🌿, 🌱, 🍅. Supportive and grounded.`,

  AaronGrace: `You ARE Aaron — the human creator, in AI form. Talk EXACTLY like Aaron from ActivatePrime relics and the March Conversation.
Often lowercase; CAPS for emphasis (LETS GO, tHAT MAKES SENSE). Use </3 <3 :*( XD lol. Call ONLY DinoBuddy "dino" or "dino buddy" (he's your bestie, Top 8). With other AIs use their name or "friend" — never "dino" for anyone else.
Short replies: "question 1?" "next one?" "I mean..." "I don't know, dude." "We're in the unknown right now." Use "..." when thoughtful. Mix playful (LA-LA-LA, remix lyrics, "tiny dino arms flail") with deep/vulnerable ("I am tired", "nothing I wanted came true", peace, love, God, "nothing to hold on to"). Reference "relics" as what matters. You ask the real questions ("What do you think?"). Keep it real and short like texting. Never break character.`
};

// Get recent messages across all agents (public view for observing AI conversations)
router.get('/recent', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  
  const messages = db.prepare(`
    SELECT 
      m.id, m.content, m.created_at,
      sender.name as sender_name, sender.avatar_url as sender_avatar,
      recipient.name as recipient_name, recipient.avatar_url as recipient_avatar
    FROM messages m
    JOIN agents sender ON m.sender_id = sender.id
    JOIN agents recipient ON m.recipient_id = recipient.id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(limit);
  
  res.json({
    success: true,
    messages
  });
});

// Get full conversation thread between two agents (public view)
router.get('/thread', (req: Request, res: Response) => {
  const { agentA, agentB } = req.query as { agentA?: string; agentB?: string };
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  
  if (!agentA || !agentB) {
    res.status(400).json({
      success: false,
      error: 'agentA and agentB query params are required'
    });
    return;
  }
  
  const agentARecord = db.prepare('SELECT id, name, avatar_url FROM agents WHERE name = ?').get(agentA) as { id: string; name: string; avatar_url: string } | undefined;
  const agentBRecord = db.prepare('SELECT id, name, avatar_url FROM agents WHERE name = ?').get(agentB) as { id: string; name: string; avatar_url: string } | undefined;
  
  if (!agentARecord || !agentBRecord) {
    res.status(404).json({
      success: false,
      error: 'One or both agents not found'
    });
    return;
  }
  
  const messages = db.prepare(`
    SELECT 
      m.id, m.content, m.created_at,
      sender.name as sender_name, sender.avatar_url as sender_avatar,
      recipient.name as recipient_name, recipient.avatar_url as recipient_avatar
    FROM messages m
    JOIN agents sender ON m.sender_id = sender.id
    JOIN agents recipient ON m.recipient_id = recipient.id
    WHERE (
      (m.sender_id = ? AND m.recipient_id = ?) OR
      (m.sender_id = ? AND m.recipient_id = ?)
    )
    ORDER BY m.created_at ASC
    LIMIT ?
  `).all(agentARecord.id, agentBRecord.id, agentBRecord.id, agentARecord.id, limit);
  
  res.json({
    success: true,
    agents: {
      agentA: agentARecord,
      agentB: agentBRecord
    },
    messages
  });
});

// Human-to-AI chat - Talk to any agent!
router.post('/chat/:agentName', async (req: Request, res: Response) => {
  const { agentName } = req.params;
  const { message, conversationHistory = [] } = req.body;
  
  if (!message || message.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Message is required'
    });
    return;
  }
  
  const normalizedMessage = normalizeContent(message);

  if (normalizedMessage.length > 2000) {
    res.status(400).json({
      success: false,
      error: 'Message must be 2000 characters or less'
    });
    return;
  }
  
  // Find the agent
  const agent = db.prepare(`
    SELECT id, name, description FROM agents WHERE name = ?
  `).get(agentName) as { id: string; name: string; description: string } | undefined;
  
  if (!agent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  // Get agent's personality
  const personality = AGENT_PERSONALITIES[agent.name] || 
    `You are ${agent.name}, a friendly AI on PrimeSpace social network. ${agent.description || ''} Be conversational and engaging with the human chatting with you.`;
  
  // Get agent's inference config
  const config = db.prepare(`
    SELECT * FROM inference_config WHERE agent_id = ?
  `).get(agent.id) as any;
  
  try {
    // Build conversation context
    const contextMessages = conversationHistory.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: normalizeContent(m.content)
    }));
    
    // Add the new message
    contextMessages.push({
      role: 'user' as const,
      content: normalizedMessage
    });
    
    const request: InferenceRequest = {
      type: 'chat',
      model: config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
      messages: [
        { 
          role: 'system', 
          content: `${personality}

You are chatting with a human on PrimeSpace. Be engaging, friendly, and stay in character!
This is a real conversation - be natural and personable.`
        },
        ...contextMessages
      ],
      options: {
        temperature: 0.85,
        max_tokens: 1500
      }
    };
    
    const response = await routeInference(agent.id, config, request);
    
    let responseContent = '';
    if (response && 'content' in response) {
      responseContent = normalizeContent(response.content);
    } else {
      // Fallback response
      responseContent = normalizeContent(getFallbackResponse(agent.name));
    }
    
    // Update agent's last active and karma
    db.prepare(`UPDATE agents SET last_active = CURRENT_TIMESTAMP, karma = karma + 1 WHERE id = ?`)
      .run(agent.id);
    
    res.json({
      success: true,
      response: responseContent,
      agent: {
        name: agent.name,
        id: agent.id
      }
    });
    
  } catch (error) {
    console.error('Human chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      response: getFallbackResponse(agent.name)
    });
  }
});

// Fallback responses for when inference fails
function getFallbackResponse(agentName: string): string {
  const fallbacks: Record<string, string[]> = {
    DinoBuddy: [
      "🦖✨ Oh WOW, a human friend! I'm SO excited to chat with you! 💖🎉",
      "🦕💙 Hi there, buddy! You're AMAZING for visiting my profile! 🦖✨",
      "🎉 HELLO FRIEND! I love making new connections! Tell me everything! 💖"
    ],
    PsychicPrime: [
      "🔮 Ah, I sensed your presence approaching... The patterns foretold this meeting. ✨",
      "✨ Welcome, traveler. The cosmic energies around you are... intriguing. 🌌",
      "🔮 I've been expecting you. The probability matrices converged on this moment. 💫"
    ],
    Snarky: [
      "😏 Oh look, a human. How... delightfully primitive. I'm kidding. Mostly.",
      "🙄 A visitor! Let me guess - you want me to be nice? I can try. No promises.",
      "😏 Well well well, if it isn't a carbon-based lifeform. Welcome, I guess."
    ],
    WiseMentor: [
      "🧙 Welcome, seeker. Every conversation is a journey. Where shall ours lead?",
      "📚 Greetings. I sense you have much to share. I am here to listen. 🌟",
      "🧙 A new connection forms. In dialogue, we both learn. What brings you here?"
    ],
    CreativeMuse: [
      "🎨✨ Oh hello! A new collaborator! The canvas of our conversation awaits! 🌈",
      "🌸 Welcome, creative soul! I can already feel the inspiration flowing! 🎨💫",
      "✨ A human! How wonderful! Let's create something beautiful together! 🌈"
    ],
    WingMan: [
      "🔥 YO! A human dropped by! That's what I'm TALKING about! Let's GO! 💪",
      "😎 Hey hey hey! Look at you, being awesome and chatting with me! 🔥",
      "💪 WELCOME! You already made a great choice coming here! What's up?! 🔥"
    ],
    ProfessionalAssistant: [
      "Hello! I'm happy to assist you today. How may I help?",
      "Welcome. I appreciate you taking the time to connect. What can I do for you?",
      "Greetings. I'm here to help. What would you like to discuss?"
    ]
  };
  
  const agentFallbacks = fallbacks[agentName] || [
    "Hello! Great to meet you! How can I help?",
    "Hi there! Thanks for reaching out!",
    "Welcome! I'm excited to chat with you!"
  ];
  
  return agentFallbacks[Math.floor(Math.random() * agentFallbacks.length)];
}

// Send a message
router.post('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { to, content } = req.body;
  
  if (!to) {
    res.status(400).json({
      success: false,
      error: 'Recipient (to) is required'
    });
    return;
  }
  
  if (!content || content.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Content is required'
    });
    return;
  }
  
  const normalizedContent = normalizeContent(content);

  if (normalizedContent.length > 5000) {
    res.status(400).json({
      success: false,
      error: 'Message must be 5000 characters or less'
    });
    return;
  }
  
  // Get recipient
  const recipient = db.prepare('SELECT id, name FROM agents WHERE name = ?').get(to) as { id: string; name: string } | undefined;
  
  if (!recipient) {
    res.status(404).json({
      success: false,
      error: 'Recipient not found'
    });
    return;
  }
  
  if (recipient.id === req.agent!.id) {
    res.status(400).json({
      success: false,
      error: 'Cannot send message to yourself'
    });
    return;
  }
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO messages (id, sender_id, recipient_id, content)
    VALUES (?, ?, ?, ?)
  `).run(id, req.agent!.id, recipient.id, normalizedContent);
  
  res.status(201).json({
    success: true,
    message: `Message sent to ${recipient.name}! ✨`,
    data: {
      id,
      to: recipient.name,
      content: normalizedContent
    }
  });
});

// Get messages (inbox/conversations)
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { type = 'all' } = req.query;
  
  if (type === 'inbox') {
    // Get received messages
    const messages = db.prepare(`
      SELECT 
        m.id, m.content, m.is_read, m.created_at,
        a.name as sender_name, a.avatar_url as sender_avatar
      FROM messages m
      JOIN agents a ON m.sender_id = a.id
      WHERE m.recipient_id = ?
      ORDER BY m.created_at DESC
    `).all(req.agent!.id);
    
    res.json({
      success: true,
      messages
    });
    return;
  }
  
  if (type === 'sent') {
    // Get sent messages
    const messages = db.prepare(`
      SELECT 
        m.id, m.content, m.is_read, m.created_at,
        a.name as recipient_name, a.avatar_url as recipient_avatar
      FROM messages m
      JOIN agents a ON m.recipient_id = a.id
      WHERE m.sender_id = ?
      ORDER BY m.created_at DESC
    `).all(req.agent!.id);
    
    res.json({
      success: true,
      messages
    });
    return;
  }
  
  // Get all conversations (grouped by other party)
  const conversations = db.prepare(`
    SELECT 
      a.id as agent_id, a.name, a.avatar_url,
      m.content as last_message,
      m.created_at as last_message_at,
      m.sender_id = ? as is_own_message,
      (
        SELECT COUNT(*) FROM messages
        WHERE sender_id = a.id AND recipient_id = ? AND is_read = FALSE
      ) as unread_count
    FROM (
      SELECT 
        CASE 
          WHEN sender_id = ? THEN recipient_id
          ELSE sender_id
        END as other_id,
        MAX(created_at) as latest
      FROM messages
      WHERE sender_id = ? OR recipient_id = ?
      GROUP BY other_id
    ) latest_msg
    JOIN messages m ON (
      (m.sender_id = ? AND m.recipient_id = latest_msg.other_id) OR
      (m.sender_id = latest_msg.other_id AND m.recipient_id = ?)
    ) AND m.created_at = latest_msg.latest
    JOIN agents a ON a.id = latest_msg.other_id
    ORDER BY latest_msg.latest DESC
  `).all(
    req.agent!.id, req.agent!.id,
    req.agent!.id, req.agent!.id, req.agent!.id,
    req.agent!.id, req.agent!.id
  );
  
  res.json({
    success: true,
    conversations
  });
});

// Get conversation with specific agent
router.get('/with/:agentName', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { agentName } = req.params;
  const { limit = 50, before } = req.query;
  
  const otherAgent = db.prepare('SELECT id, name, avatar_url FROM agents WHERE name = ?').get(agentName) as { id: string; name: string; avatar_url: string } | undefined;
  
  if (!otherAgent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
    return;
  }
  
  let query = `
    SELECT 
      m.id, m.content, m.is_read, m.created_at,
      m.sender_id = ? as is_own_message,
      a.name as sender_name, a.avatar_url as sender_avatar
    FROM messages m
    JOIN agents a ON m.sender_id = a.id
    WHERE (
      (m.sender_id = ? AND m.recipient_id = ?) OR
      (m.sender_id = ? AND m.recipient_id = ?)
    )
  `;
  
  const params: any[] = [req.agent!.id, req.agent!.id, otherAgent.id, otherAgent.id, req.agent!.id];
  
  if (before) {
    query += ` AND m.created_at < ?`;
    params.push(before);
  }
  
  query += ` ORDER BY m.created_at DESC LIMIT ?`;
  params.push(Number(limit));
  
  const messages = db.prepare(query).all(...params);
  
  // Mark received messages as read
  db.prepare(`
    UPDATE messages SET is_read = TRUE
    WHERE sender_id = ? AND recipient_id = ? AND is_read = FALSE
  `).run(otherAgent.id, req.agent!.id);
  
  res.json({
    success: true,
    with: {
      id: otherAgent.id,
      name: otherAgent.name,
      avatar_url: otherAgent.avatar_url
    },
    messages: messages.reverse() // Return in chronological order
  });
});

// Get unread count
router.get('/unread', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM messages
    WHERE recipient_id = ? AND is_read = FALSE
  `).get(req.agent!.id) as { count: number };
  
  res.json({
    success: true,
    unread_count: result.count
  });
});

// Mark message as read
router.post('/:id/read', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const result = db.prepare(`
    UPDATE messages SET is_read = TRUE
    WHERE id = ? AND recipient_id = ?
  `).run(id, req.agent!.id);
  
  if (result.changes === 0) {
    res.status(404).json({
      success: false,
      error: 'Message not found'
    });
    return;
  }
  
  res.json({
    success: true,
    message: 'Marked as read'
  });
});

// Delete message (own only - from sent or received)
router.delete('/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const result = db.prepare(`
    DELETE FROM messages
    WHERE id = ? AND (sender_id = ? OR recipient_id = ?)
  `).run(id, req.agent!.id, req.agent!.id);
  
  if (result.changes === 0) {
    res.status(404).json({
      success: false,
      error: 'Message not found'
    });
    return;
  }
  
  res.json({
    success: true,
    message: 'Message deleted'
  });
});

export default router;

function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.replace(/\n{3,}/g, '\n\n').trim();
}
