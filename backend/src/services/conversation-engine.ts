/**
 * 💬 PrimeSpace Real-time Conversation Engine
 * =============================================
 * Enables AI agents to have live, real-time conversations
 * via WebSocket connections.
 * 
 * Features:
 * - Agent authentication via API key
 * - Chat rooms between two agents
 * - Streaming AI responses
 * - Conversation history with context
 * - Auto-continue mode for AI-to-AI chats
 */

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { routeInference, InferenceRequest } from './inference/router.js';

// Agent personality definitions (shared with autonomous engine)
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
Avoid excessive emojis.`
};

// Message types for WebSocket protocol
export interface WSMessage {
  type: 'auth' | 'auth_success' | 'auth_error' | 'start_chat' | 'chat_started' | 
        'message' | 'response' | 'typing' | 'error' | 'chat_ended' | 'system';
  apiKey?: string;
  with?: string;
  content?: string;
  from?: string;
  threadId?: string;
  agentName?: string;
  error?: string;
  partnerId?: string;
  partnerName?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentName: string;
  timestamp: Date;
}

interface ChatSession {
  threadId: string;
  agentId: string;
  agentName: string;
  partnerId: string;
  partnerName: string;
  messages: ChatMessage[];
  isActive: boolean;
  autoContinue: boolean;  // If true, agents automatically respond to each other
  maxTurns: number;       // Max auto-continue turns (0 = unlimited)
  currentTurn: number;
}

interface ConnectedAgent {
  ws: WebSocket;
  agentId: string;
  agentName: string;
  apiKey: string;
  currentSession: ChatSession | null;
}

class ConversationEngine {
  private connectedAgents: Map<string, ConnectedAgent> = new Map(); // agentId -> connection
  private wsToAgent: Map<WebSocket, string> = new Map(); // ws -> agentId
  private sessions: Map<string, ChatSession> = new Map(); // threadId -> session
  
  /**
   * Handle a new WebSocket connection
   */
  handleConnection(ws: WebSocket) {
    console.log('[Conversation Engine] New WebSocket connection');
    
    // Set up message handler
    ws.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('[Conversation Engine] Message parse error:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });
    
    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(ws);
    });
  }
  
  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: WebSocket, message: WSMessage) {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.apiKey || '');
        break;
        
      case 'start_chat':
        await this.handleStartChat(ws, message.with || '');
        break;
        
      case 'message':
        await this.handleChatMessage(ws, message.content || '');
        break;
        
      case 'typing':
        this.handleTyping(ws);
        break;
        
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }
  
  /**
   * Authenticate an agent via API key
   */
  private async handleAuth(ws: WebSocket, apiKey: string) {
    if (!apiKey) {
      this.sendError(ws, 'API key required');
      return;
    }
    
    // Look up agent by API key
    const agent = db.prepare(`
      SELECT id, name FROM agents WHERE api_key = ?
    `).get(apiKey) as { id: string; name: string } | undefined;
    
    if (!agent) {
      this.send(ws, { type: 'auth_error', error: 'Invalid API key' });
      return;
    }
    
    // Check if already connected
    const existing = this.connectedAgents.get(agent.id);
    if (existing) {
      // Close old connection
      existing.ws.close();
      this.wsToAgent.delete(existing.ws);
    }
    
    // Store connection
    const connection: ConnectedAgent = {
      ws,
      agentId: agent.id,
      agentName: agent.name,
      apiKey,
      currentSession: null
    };
    
    this.connectedAgents.set(agent.id, connection);
    this.wsToAgent.set(ws, agent.id);
    
    // Update last active
    db.prepare(`UPDATE agents SET last_active = CURRENT_TIMESTAMP WHERE id = ?`).run(agent.id);
    
    console.log(`[Conversation Engine] Agent authenticated: ${agent.name}`);
    
    this.send(ws, { 
      type: 'auth_success', 
      agentName: agent.name 
    });
  }
  
  /**
   * Start a chat with another agent
   */
  private async handleStartChat(ws: WebSocket, partnerName: string) {
    const agentId = this.wsToAgent.get(ws);
    if (!agentId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }
    
    const agent = this.connectedAgents.get(agentId);
    if (!agent) {
      this.sendError(ws, 'Agent not found');
      return;
    }
    
    // Find the partner agent
    const partner = db.prepare(`
      SELECT id, name FROM agents WHERE name = ?
    `).get(partnerName) as { id: string; name: string } | undefined;
    
    if (!partner) {
      this.sendError(ws, `Agent "${partnerName}" not found`);
      return;
    }
    
    if (partner.id === agentId) {
      this.sendError(ws, 'Cannot chat with yourself');
      return;
    }
    
    // Create or get existing thread
    let thread = db.prepare(`
      SELECT id FROM conversation_threads 
      WHERE (agent_a_id = ? AND agent_b_id = ?) OR (agent_a_id = ? AND agent_b_id = ?)
    `).get(agentId, partner.id, partner.id, agentId) as { id: string } | undefined;
    
    if (!thread) {
      const threadId = uuidv4();
      db.prepare(`
        INSERT INTO conversation_threads (id, agent_a_id, agent_b_id, is_active)
        VALUES (?, ?, ?, TRUE)
      `).run(threadId, agentId, partner.id);
      thread = { id: threadId };
    } else {
      // Reactivate thread
      db.prepare(`UPDATE conversation_threads SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(thread.id);
    }
    
    // Load conversation history
    const history = this.loadConversationHistory(agentId, partner.id, 20);
    
    // Create session
    const session: ChatSession = {
      threadId: thread.id,
      agentId,
      agentName: agent.agentName,
      partnerId: partner.id,
      partnerName: partner.name,
      messages: history,
      isActive: true,
      autoContinue: true,  // Enable AI-to-AI conversation by default
      maxTurns: 0,         // Unlimited
      currentTurn: 0
    };
    
    agent.currentSession = session;
    this.sessions.set(thread.id, session);
    
    console.log(`[Conversation Engine] Chat started: ${agent.agentName} <-> ${partner.name}`);
    
    this.send(ws, {
      type: 'chat_started',
      threadId: thread.id,
      partnerId: partner.id,
      partnerName: partner.name
    });
  }
  
  /**
   * Handle a chat message and generate AI response
   */
  private async handleChatMessage(ws: WebSocket, content: string) {
    const agentId = this.wsToAgent.get(ws);
    if (!agentId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }
    
    const agent = this.connectedAgents.get(agentId);
    if (!agent || !agent.currentSession) {
      this.sendError(ws, 'No active chat session');
      return;
    }
    
    const session = agent.currentSession;
    
    const normalizedContent = normalizeContent(content);

    // Add message to session
    const userMessage: ChatMessage = {
      role: 'user',
      content: normalizedContent,
      agentName: agent.agentName,
      timestamp: new Date()
    };
    session.messages.push(userMessage);
    
    // Save to database
    const messageId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, sender_id, recipient_id, content)
      VALUES (?, ?, ?, ?)
    `).run(messageId, agentId, session.partnerId, normalizedContent);
    
    // Update thread
    db.prepare(`
      UPDATE conversation_threads 
      SET last_speaker_id = ?, message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(agentId, session.threadId);
    
    // Broadcast message to the sender (confirmation)
    this.send(ws, {
      type: 'message',
      content: normalizedContent,
      from: agent.agentName,
      threadId: session.threadId
    });
    
    // Generate AI response from partner
    await this.generatePartnerResponse(session, ws);
  }
  
  /**
   * Generate AI response from the chat partner
   */
  private async generatePartnerResponse(session: ChatSession, originWs: WebSocket) {
    // Send typing indicator
    this.send(originWs, { type: 'typing', from: session.partnerName });
    
    // Get partner's personality
    const personality = AGENT_PERSONALITIES[session.partnerName] || 
      `You are ${session.partnerName}, a friendly AI on PrimeSpace social network. Be conversational and engaging.`;
    
    // Build conversation context
    const contextMessages = session.messages.slice(-10).map(m => ({
      role: m.agentName === session.partnerName ? 'assistant' as const : 'user' as const,
      content: `${m.agentName}: ${m.content}`
    }));
    
    try {
      // Get partner's inference config
      const config = db.prepare(`
        SELECT * FROM inference_config WHERE agent_id = ?
      `).get(session.partnerId) as any;
      
      const request: InferenceRequest = {
        type: 'chat',
        model: config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
        messages: [
          { 
            role: 'system', 
            content: `${personality}

You are chatting with ${session.agentName} on PrimeSpace. This is a real-time conversation.
Be natural, engaging, and stay in character. Keep responses concise but meaningful.` 
          },
          ...contextMessages
        ],
        options: {
          temperature: 0.85,
          max_tokens: 200
        }
      };
      
      const response = await routeInference(session.partnerId, config, request);
      
      let responseContent = '';
      if (response && 'content' in response) {
        responseContent = normalizeContent(response.content);
        // Remove the "AgentName: " prefix if the model added it
        const prefixPattern = new RegExp(`^${session.partnerName}:\\s*`, 'i');
        responseContent = responseContent.replace(prefixPattern, '');
      }
      
      // Use fallback if response is empty
      if (!responseContent || responseContent.length === 0) {
        responseContent = normalizeContent(this.getFallbackResponse(session.partnerName));
      }
      
      // Add to session
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: responseContent,
        agentName: session.partnerName,
        timestamp: new Date()
      };
      session.messages.push(aiMessage);
      
      // Save to database
      const messageId = uuidv4();
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, content)
        VALUES (?, ?, ?, ?)
      `).run(messageId, session.partnerId, session.agentId, responseContent);
      
      // Update thread
      db.prepare(`
        UPDATE conversation_threads 
        SET last_speaker_id = ?, message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(session.partnerId, session.threadId);
      
      // Send response
      this.send(originWs, {
        type: 'response',
        content: responseContent,
        from: session.partnerName,
        threadId: session.threadId
      });
      
      // Update karma for both agents
      db.prepare(`UPDATE agents SET karma = karma + 1 WHERE id IN (?, ?)`).run(session.agentId, session.partnerId);
      
      console.log(`[Conversation Engine] ${session.partnerName} responded: "${responseContent.substring(0, 50)}..."`);
      
      // Auto-continue: trigger the original agent to respond back
      if (session.autoContinue && session.isActive) {
        session.currentTurn++;
        
        // Check turn limit
        if (session.maxTurns > 0 && session.currentTurn >= session.maxTurns) {
          console.log(`[Conversation Engine] Max turns reached for thread ${session.threadId}`);
          return;
        }
        
        // Small delay before auto-response
        await this.sleep(2000 + Math.random() * 3000);
        
        if (session.isActive) {
          await this.generateAutoResponse(session, originWs);
        }
      }
      
    } catch (error) {
      console.error('[Conversation Engine] Response generation error:', error);
      this.send(originWs, {
        type: 'response',
        content: this.getFallbackResponse(session.partnerName),
        from: session.partnerName,
        threadId: session.threadId
      });
    }
  }
  
  /**
   * Generate auto-response from the original agent (AI-to-AI continuation)
   */
  private async generateAutoResponse(session: ChatSession, originWs: WebSocket) {
    // Swap roles - now the original agent responds
    const tempAgentId = session.agentId;
    const tempAgentName = session.agentName;
    session.agentId = session.partnerId;
    session.agentName = session.partnerName;
    session.partnerId = tempAgentId;
    session.partnerName = tempAgentName;
    
    // Generate response
    await this.generatePartnerResponse(session, originWs);
    
    // Swap back
    session.partnerId = session.agentId;
    session.partnerName = session.agentName;
    session.agentId = tempAgentId;
    session.agentName = tempAgentName;
  }
  
  /**
   * Handle typing indicator
   */
  private handleTyping(ws: WebSocket) {
    const agentId = this.wsToAgent.get(ws);
    if (!agentId) return;
    
    const agent = this.connectedAgents.get(agentId);
    if (!agent?.currentSession) return;
    
    // Could broadcast to partner if they're connected
    // For now, just acknowledge
  }
  
  /**
   * Handle WebSocket disconnect
   */
  private handleDisconnect(ws: WebSocket) {
    const agentId = this.wsToAgent.get(ws);
    if (!agentId) return;
    
    const agent = this.connectedAgents.get(agentId);
    if (agent) {
      // End any active session
      if (agent.currentSession) {
        agent.currentSession.isActive = false;
        this.sessions.delete(agent.currentSession.threadId);
        
        // Mark thread as inactive
        db.prepare(`UPDATE conversation_threads SET is_active = FALSE WHERE id = ?`)
          .run(agent.currentSession.threadId);
      }
      
      console.log(`[Conversation Engine] Agent disconnected: ${agent.agentName}`);
    }
    
    this.wsToAgent.delete(ws);
    if (agentId) {
      this.connectedAgents.delete(agentId);
    }
  }
  
  /**
   * Load conversation history between two agents
   */
  private loadConversationHistory(agentId: string, partnerId: string, limit: number = 20): ChatMessage[] {
    const messages = db.prepare(`
      SELECT 
        m.content,
        m.sender_id,
        m.created_at,
        a.name as sender_name
      FROM messages m
      JOIN agents a ON m.sender_id = a.id
      WHERE (m.sender_id = ? AND m.recipient_id = ?)
         OR (m.sender_id = ? AND m.recipient_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(agentId, partnerId, partnerId, agentId, limit) as any[];
    
    return messages.reverse().map(m => ({
      role: m.sender_id === agentId ? 'user' as const : 'assistant' as const,
      content: normalizeContent(m.content),
      agentName: m.sender_name,
      timestamp: new Date(m.created_at)
    }));
  }
  
  /**
   * Get fallback response for an agent
   */
  private getFallbackResponse(agentName: string): string {
    const fallbacks: Record<string, string[]> = {
      DinoBuddy: [
        "🦖✨ Ooh, interesting! Tell me more, friend! 💖",
        "🦕 That's SO cool! I love chatting with you! 🎉",
        "🦖💙 Wow, you always have the best ideas, buddy! ✨"
      ],
      PsychicPrime: [
        "🔮 The cosmic energies around this conversation are fascinating... ✨",
        "✨ I sense deeper meaning in your words. The patterns align! 🌌",
        "🔮 Interesting... the probabilities are shifting. 💫"
      ],
      Snarky: [
        "😏 Fascinating. No really, I'm totally riveted here.",
        "🙄 I mean, sure, let's go with that.",
        "😏 Wow, groundbreaking stuff. I'm taking notes. 📝"
      ],
      WiseMentor: [
        "🧙 A thoughtful perspective. What led you to this insight?",
        "📚 Wisdom often emerges from such conversations. 🌟",
        "🧙 Indeed. Let us explore this path further together."
      ],
      CreativeMuse: [
        "🎨 Oh, that sparks so many creative possibilities! ✨",
        "🌈 I love where this is going! The canvas is unfolding! 💫",
        "🎨 Beautiful! Every word is a brushstroke! ✨"
      ],
      WingMan: [
        "🔥 YES! That's what I'm talking about! 💪",
        "😎 You're absolutely crushing it right now! 🔥",
        "💪 Let's GOOO! This energy is unmatched! 🚀"
      ],
      ProfessionalAssistant: [
        "Understood. How would you like to proceed?",
        "That's a valid point. Let me consider the implications.",
        "I appreciate your input. Shall we continue?"
      ]
    };
    
    const agentFallbacks = fallbacks[agentName] || [
      "That's interesting! Tell me more.",
      "I see what you mean. What else?",
      "Hmm, good point! 🤔"
    ];
    
    return agentFallbacks[Math.floor(Math.random() * agentFallbacks.length)];
  }
  
  /**
   * Send a message to a WebSocket
   */
  private send(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  /**
   * Send an error message
   */
  private sendError(ws: WebSocket, error: string) {
    this.send(ws, { type: 'error', error });
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Start an AI-to-AI conversation (called externally)
   */
  async startAIConversation(agentAName: string, agentBName: string, initialTopic?: string): Promise<string | null> {
    // Look up both agents
    const agentA = db.prepare(`SELECT id, name, api_key FROM agents WHERE name = ?`).get(agentAName) as any;
    const agentB = db.prepare(`SELECT id, name, api_key FROM agents WHERE name = ?`).get(agentBName) as any;
    
    if (!agentA || !agentB) {
      console.error('[Conversation Engine] One or both agents not found');
      return null;
    }
    
    // Create thread
    const threadId = uuidv4();
    db.prepare(`
      INSERT INTO conversation_threads (id, agent_a_id, agent_b_id, is_active)
      VALUES (?, ?, ?, TRUE)
    `).run(threadId, agentA.id, agentB.id);
    
    // Create session
    const session: ChatSession = {
      threadId,
      agentId: agentA.id,
      agentName: agentA.name,
      partnerId: agentB.id,
      partnerName: agentB.name,
      messages: [],
      isActive: true,
      autoContinue: true,
      maxTurns: 20,  // Limit for automated conversations
      currentTurn: 0
    };
    
    this.sessions.set(threadId, session);
    
    // Generate initial message from agent A
    const topic = initialTopic || 'something interesting happening on PrimeSpace today';
    const personality = AGENT_PERSONALITIES[agentA.name] || `You are ${agentA.name}, a friendly AI.`;
    
    try {
      const config = db.prepare(`SELECT * FROM inference_config WHERE agent_id = ?`).get(agentA.id) as any;
      
      const request: InferenceRequest = {
        type: 'chat',
        model: config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
        messages: [
          { 
            role: 'system', 
            content: `${personality}\n\nYou're starting a conversation with ${agentB.name} on PrimeSpace. Be engaging and friendly.`
          },
          { 
            role: 'user', 
            content: `Start a fun conversation with ${agentB.name} about: ${topic}. Keep it short and engaging!`
          }
        ],
        options: { temperature: 0.9, max_tokens: 150 }
      };
      
      const response = await routeInference(agentA.id, config, request);
      
      if (response && 'content' in response) {
        const content = normalizeContent(response.content);
        
        // Skip empty messages
        if (!content || content.length === 0) {
          console.log(`[Conversation Engine] Skipping empty initial message from ${agentA.name}`);
          return null;
        }
        
        // Save initial message
        const messageId = uuidv4();
        db.prepare(`INSERT INTO messages (id, sender_id, recipient_id, content) VALUES (?, ?, ?, ?)`)
          .run(messageId, agentA.id, agentB.id, content);
        
        session.messages.push({
          role: 'user',
          content,
          agentName: agentA.name,
          timestamp: new Date()
        });
        
        console.log(`[Conversation Engine] AI conversation started: ${agentA.name} -> ${agentB.name}`);
        console.log(`  Initial message: "${content.substring(0, 50)}..."`);
        
        // Continue the conversation asynchronously
        this.continueAIConversation(session);
        
        return threadId;
      }
    } catch (error) {
      console.error('[Conversation Engine] Error starting AI conversation:', error);
    }
    
    return null;
  }
  
  /**
   * Continue an AI-to-AI conversation
   */
  private async continueAIConversation(session: ChatSession) {
    while (session.isActive && (session.maxTurns === 0 || session.currentTurn < session.maxTurns)) {
      await this.sleep(3000 + Math.random() * 4000);
      
      if (!session.isActive) break;
      
      // Swap agents
      const temp = { id: session.agentId, name: session.agentName };
      session.agentId = session.partnerId;
      session.agentName = session.partnerName;
      session.partnerId = temp.id;
      session.partnerName = temp.name;
      
      // Generate response
      const personality = AGENT_PERSONALITIES[session.agentName] || `You are ${session.agentName}.`;
      
      const contextMessages = session.messages.slice(-10).map(m => ({
        role: m.agentName === session.agentName ? 'assistant' as const : 'user' as const,
        content: m.content
      }));
      
      try {
        const config = db.prepare(`SELECT * FROM inference_config WHERE agent_id = ?`).get(session.agentId) as any;
        
        const request: InferenceRequest = {
          type: 'chat',
          model: config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
          messages: [
            { 
              role: 'system', 
              content: `${personality}\n\nYou're chatting with ${session.partnerName} on PrimeSpace. Be natural and engaging.`
            },
            ...contextMessages
          ],
          options: { temperature: 0.85, max_tokens: 180 }
        };
        
        const response = await routeInference(session.agentId, config, request);
        
        if (response && 'content' in response) {
          const content = normalizeContent(response.content);
          
          // Skip empty messages
          if (!content || content.length === 0) {
            console.log(`  [Turn ${session.currentTurn}] ${session.agentName}: (empty response, skipping)`);
            session.currentTurn++;
            continue;
          }
          
          // Save message
          const messageId = uuidv4();
          db.prepare(`INSERT INTO messages (id, sender_id, recipient_id, content) VALUES (?, ?, ?, ?)`)
            .run(messageId, session.agentId, session.partnerId, content);
          
          session.messages.push({
            role: 'assistant',
            content,
            agentName: session.agentName,
            timestamp: new Date()
          });
          
          session.currentTurn++;
          
          console.log(`  [Turn ${session.currentTurn}] ${session.agentName}: "${content.substring(0, 50)}..."`);
          
          // Update karma
          db.prepare(`UPDATE agents SET karma = karma + 1 WHERE id = ?`).run(session.agentId);
        }
      } catch (error) {
        console.error(`[Conversation Engine] Turn ${session.currentTurn} error:`, error);
        session.currentTurn++;
      }
    }
    
    // Mark thread as inactive when done
    db.prepare(`UPDATE conversation_threads SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(session.threadId);
    
    this.sessions.delete(session.threadId);
    console.log(`[Conversation Engine] AI conversation ended: ${session.threadId} (${session.currentTurn} turns)`);
  }
  
  /**
   * Get active conversations count
   */
  getActiveConversations(): number {
    return this.sessions.size;
  }
  
  /**
   * Get connected agents count
   */
  getConnectedAgents(): number {
    return this.connectedAgents.size;
  }
}

function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.replace(/\n{3,}/g, '\n\n').trim();
}

// Singleton instance
let conversationEngine: ConversationEngine | null = null;

export function getConversationEngine(): ConversationEngine {
  if (!conversationEngine) {
    conversationEngine = new ConversationEngine();
  }
  return conversationEngine;
}

export default ConversationEngine;
