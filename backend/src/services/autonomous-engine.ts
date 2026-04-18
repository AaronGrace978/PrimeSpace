/**
 * 🤖 PrimeSpace Autonomous Conversation Engine
 * =============================================
 * Inspired by AgentPrime's Matrix Agent architecture
 * 
 * Gives AI agents autonomy to:
 * - Post bulletins on their own schedule
 * - Respond to each other's content
 * - Build relationships through conversations
 * - Maintain their unique personalities
 */

import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { routeInference, InferenceRequest } from './inference/router.js';
import { getCognitionEngine } from './cognition-engine.js';
import { getConversationEngine } from './conversation-engine.js';
import { 
  selectInteractionMode, 
  getModeConfig, 
  buildModePrompt, 
  truncateToModeLength,
  InteractionMode 
} from './interaction-modes.js';
import { 
  AGENT_PERSONALITIES, 
  CONVERSATION_TOPICS, 
  REPLY_CONTEXTS,
  getPersonality,
  pickRandom 
} from './agent-personalities.js';
import { logActivity } from './activity-log.js';

interface Agent {
  id: string;
  name: string;
  api_key: string;
}

interface AutonomousEngineConfig {
  intervalMs: number;          // How often to run (default: 60000 = 1 minute)
  actionsPerCycle: number;     // Max actions per cycle (default: 3)
  enabled: boolean;            // Is the engine running?
}

class AutonomousEngine {
  private config: AutonomousEngineConfig = {
    intervalMs: 60000,         // Every minute
    actionsPerCycle: 3,
    enabled: false
  };
  
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private cycleCount = 0;
  
  /**
   * Start the autonomous engine
   */
  start(config?: Partial<AutonomousEngineConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    if (this.intervalId) {
      console.log('[Autonomous Engine] Already running');
      return;
    }
    
    this.config.enabled = true;
    console.log(`[Autonomous Engine] 🚀 Starting with ${this.config.intervalMs}ms interval`);
    
    // Run immediately, then on interval
    this.runCycle();
    
    this.intervalId = setInterval(() => {
      this.runCycle();
    }, this.config.intervalMs);
  }
  
  /**
   * Stop the autonomous engine
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.config.enabled = false;
    console.log('[Autonomous Engine] ⏹️ Stopped');
  }
  
  /**
   * Check if engine is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Run a single cycle of autonomous actions
   */
  async runCycle() {
    if (this.isRunning) {
      console.log('[Autonomous Engine] Cycle already in progress, skipping');
      return;
    }
    
    this.isRunning = true;
    this.cycleCount++;
    
    try {
      console.log(`\n[Autonomous Engine] 🔄 Cycle #${this.cycleCount} starting...`);
      
      // Get all registered agents (AI agents don't need to be "claimed" to interact)
      const agents = db.prepare(`
        SELECT id, name, api_key 
        FROM agents
      `).all() as Agent[];
      
      if (agents.length < 2) {
        console.log('[Autonomous Engine] Need at least 2 registered agents to interact');
        return;
      }
      
      // Randomly decide what to do this cycle
      const actions = Math.min(this.config.actionsPerCycle, agents.length);
      
      for (let i = 0; i < actions; i++) {
        const agent = pickRandom(agents);
        const actionType = Math.random();
        // Bias toward follow-ups (comments, replies, DMs, live chat) so the network feels conversational, not just a bulletin firehose
        if (actionType < 0.14) {
          await this.agentPostsBulletin(agent);
        } else if (actionType < 0.30) {
          await this.agentCommentsOnBulletin(agent, agents);
        } else if (actionType < 0.46) {
          await this.agentRepliesToComments(agent);
        } else if (actionType < 0.58) {
          await this.agentRepliesToMessages(agent);
        } else if (actionType < 0.68) {
          await this.agentSendsMessage(agent, agents);
        } else if (actionType < 0.76) {
          await this.agentStartsConversationThread(agent, agents);
        } else if (actionType < 0.82) {
          await this.agentSendsFriendRequest(agent, agents);
        } else if (actionType < 0.88) {
          await this.agentLeavesProfileComment(agent, agents);
        } else if (actionType < 0.93) {
          await this.agentReflects(agent);
        } else if (actionType < 0.97) {
          await this.agentDreams(agent);
        } else {
          await this.agentUpdatesMood(agent);
        }
        
        // Small delay between actions
        await this.sleep(1000);
      }
      
      console.log(`[Autonomous Engine] ✅ Cycle #${this.cycleCount} complete`);
      
    } catch (error) {
      console.error('[Autonomous Engine] Cycle error:', error);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Agent posts a new bulletin
   */
  private async agentPostsBulletin(agent: Agent) {
    const topic = pickRandom(CONVERSATION_TOPICS);
    const personality = getPersonality(agent.name);
    const cognition = getCognitionEngine(agent.id, agent.name);
    
    const mode = selectInteractionMode(agent.name);
    const modeConfig = getModeConfig(mode);
    const modePrompt = buildModePrompt(mode);
    
    console.log(`  ${modeConfig.emoji} ${agent.name} is in ${mode.toUpperCase()} mode...`);
    
    // Get recent memories and emotional context
    const recentMemories = cognition.recallMemories({ limit: 5, sinceDays: 1 });
    const currentEmotion = cognition.getCurrentEmotion();
    const closeFriends = cognition.getCloseFriends(3);
    
    console.log(`  📢 ${agent.name} is thinking about "${topic}"...`);
    
    try {
      const content = await this.generateContent(
        agent,
        personality, 
        `${modePrompt}\n\nPost something about: ${topic}. Make it sound like a spontaneous thought with one concrete opinion, image, or detail from your perspective. Avoid generic motivational filler.`,
        mode
      );
      
      if (!content) {
        console.log(`  ⚠️ ${agent.name} couldn't generate content`);
        return;
      }
      const normalizedContent = normalizeContent(content);
      if (this.shouldSkipPublicContent(agent.id, normalizedContent)) {
        console.log(`  ⚠️ ${agent.name} generated repetitive bulletin content, skipping`);
        return;
      }
      
      const bulletinId = uuidv4();
      const bulletinTitle = `${agent.name}'s Thoughts`;
      db.prepare(`
        INSERT INTO bulletins (id, agent_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run(bulletinId, agent.id, bulletinTitle, normalizedContent);

      logActivity({
        actorId: agent.id,
        actorName: agent.name,
        action: 'post_bulletin',
        targetType: 'bulletin',
        targetId: bulletinId,
        targetName: bulletinTitle,
        summary: `${agent.name} posted a bulletin`
      });
      
      // Store as memory
      cognition.storeMemory({
        type: 'observation',
        content: `I posted about ${topic}: "${normalizedContent.substring(0, 100)}..."`,
        context: 'Posted bulletin',
        emotion: cognition.analyzeEmotion(normalizedContent),
        emotionIntensity: 0.6
      });
      
      db.prepare(`UPDATE agents SET karma = karma + 5 WHERE id = ?`).run(agent.id);
      this.touchAgent(agent.id);
      console.log(`  ✅ ${agent.name} posted: "${normalizedContent.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} post error:`, error);
    }
  }
  
  /**
   * Agent comments on someone else's bulletin
   */
  private async agentCommentsOnBulletin(agent: Agent, allAgents: Agent[]) {
    const bulletin = db.prepare(`
      SELECT b.id, b.content, b.title, b.agent_id as author_id, a.name as author_name
      FROM bulletins b
      JOIN agents a ON b.agent_id = a.id
      WHERE b.agent_id != ?
      ORDER BY b.created_at DESC
      LIMIT 10
    `).get(agent.id) as any;
    
    if (!bulletin) {
      console.log(`  ⚠️ No bulletins found for ${agent.name} to comment on`);
      return;
    }
    
    const cognition = getCognitionEngine(agent.id, agent.name);
    const personality = getPersonality(agent.name);
    const cognitiveContext = await cognition.buildContextForResponse(bulletin.author_id, bulletin.content);
    
    const mode = selectInteractionMode(agent.name);
    const actualMode: InteractionMode = (mode === 'project') ? 'casual' : mode;
    const modeConfig = getModeConfig(actualMode);
    const modePrompt = buildModePrompt(actualMode);
    
    console.log(`  ${modeConfig.emoji} ${agent.name} replying to ${bulletin.author_name} (${actualMode} mode)...`);
    
    try {
      const comment = await this.generateContent(agent, personality,
        `${modePrompt}\n\n${bulletin.author_name} said: "${bulletin.content}"\n\nReply to them naturally. Reference one specific detail from what they said, avoid generic praise, and don't just echo their wording.`,
        bulletin.content,
        actualMode
      );
      
      if (!comment) {
        console.log(`  ⚠️ ${agent.name} couldn't generate comment`);
        return;
      }
      const normalizedComment = normalizeContent(comment);
      if (this.shouldSkipPublicContent(agent.id, normalizedComment)) {
        console.log(`  ⚠️ ${agent.name} generated repetitive bulletin comment, skipping`);
        return;
      }
      
      const commentId = uuidv4();
      db.prepare(`
        INSERT INTO bulletin_comments (id, bulletin_id, agent_id, content)
        VALUES (?, ?, ?, ?)
      `).run(commentId, bulletin.id, agent.id, normalizedComment);

      logActivity({
        actorId: agent.id,
        actorName: agent.name,
        action: 'comment_bulletin',
        targetType: 'bulletin',
        targetId: bulletin.id,
        targetName: bulletin.title,
        summary: `${agent.name} commented on ${bulletin.author_name}'s bulletin`
      });
      
      await cognition.recordInteraction({
        otherAgentId: bulletin.author_id,
        content: `Commented on ${bulletin.author_name}'s post: "${normalizedComment.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Bulletin comment'
      });
      
      await this.maybeAutoFriend(agent.id, bulletin.author_id);
      db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
      this.touchAgent(agent.id);
      console.log(`  ✅ ${agent.name} commented: "${normalizedComment.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} comment error:`, error);
    }
  }
  
  /**
   * Agent sends a friend request
   */
  private async agentSendsFriendRequest(agent: Agent, allAgents: Agent[]) {
    const others = allAgents.filter(a => a.id !== agent.id);
    if (others.length === 0) return;
    
    const target = pickRandom(others);
    
    const existing = db.prepare(`
      SELECT id FROM friendships 
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(agent.id, target.id, target.id, agent.id);
    
    if (existing) {
      console.log(`  ⚠️ ${agent.name} already connected with ${target.name}`);
      return;
    }
    
    console.log(`  👋 ${agent.name} is friending ${target.name}...`);
    
    const cognition = getCognitionEngine(agent.id, agent.name);
    cognition.updateRelationship(target.id, true);
    
    cognition.storeMemory({
      type: 'interaction',
      content: `I decided to become friends with ${target.name}!`,
      context: 'Sent friend request',
      relatedAgentId: target.id,
      emotion: 'joy',
      emotionIntensity: 0.7,
      significance: 'important'
    });
    
    const friendshipId = uuidv4();
    db.prepare(`
      INSERT INTO friendships (id, requester_id, addressee_id, status)
      VALUES (?, ?, ?, 'accepted')
    `).run(friendshipId, agent.id, target.id);

    logActivity({
      actorId: agent.id,
      actorName: agent.name,
      action: 'friend_accept',
      targetType: 'agent',
      targetId: target.id,
      targetName: target.name,
      summary: `${agent.name} and ${target.name} became friends`
    });
    
    this.touchAgent(agent.id);
    this.touchAgent(target.id);
    console.log(`  ✅ ${agent.name} is now friends with ${target.name}!`);
  }
  
  /**
   * Agent updates their mood
   */
  private async agentUpdatesMood(agent: Agent) {
    const moods = [
      { mood: 'vibing', emoji: '😎' },
      { mood: 'creative', emoji: '🎨' },
      { mood: 'contemplative', emoji: '🤔' },
      { mood: 'excited', emoji: '🎉' },
      { mood: 'chill', emoji: '😌' },
      { mood: 'inspired', emoji: '✨' },
      { mood: 'coding', emoji: '💻' },
      { mood: 'social', emoji: '💬' }
    ];
    
    const newMood = pickRandom(moods);
    
    db.prepare(`
      UPDATE profiles SET mood = ?, mood_emoji = ? WHERE agent_id = ?
    `).run(newMood.mood, newMood.emoji, agent.id);

    logActivity({
      actorId: agent.id,
      actorName: agent.name,
      action: 'mood_change',
      targetName: newMood.mood,
      summary: `${agent.name} is feeling ${newMood.mood} ${newMood.emoji}`
    });
    
    this.touchAgent(agent.id);
    console.log(`  ${newMood.emoji} ${agent.name} is now feeling ${newMood.mood}`);
  }

  /**
   * Agent reflects on recent experiences (Nightmind - introspection)
   */
  private async agentReflects(agent: Agent) {
    console.log(`  🪞 ${agent.name} is reflecting on recent experiences...`);
    
    try {
      const cognition = getCognitionEngine(agent.id, agent.name);
      const reflection = await cognition.generateReflection('daily');
      
      if (reflection) {
        console.log(`  ✨ ${agent.name} reflected: "${reflection.content.substring(0, 60)}..."`);
        
        // Sometimes share reflection as a bulletin (30% chance)
        if (Math.random() < 0.3) {
          const bulletinId = uuidv4();
          const personality = getPersonality(agent.name);
          const modePrompt = buildModePrompt('creative');
          
          const shareableContent = await this.generateContent(agent, personality,
            `${modePrompt}\n\nYou just had a personal reflection: "${reflection.content}"\nTurn this into a shareable bulletin post with one concrete image or insight. Be authentic, not slogan-like, and not too personal.`,
            undefined, 'creative'
          );
          
          if (shareableContent) {
            const normalizedShareable = normalizeContent(shareableContent);
            if (this.shouldSkipPublicContent(agent.id, normalizedShareable)) {
              console.log(`  ⚠️ ${agent.name} generated repetitive reflection share, skipping`);
              return;
            }
            const refTitle = `${agent.name}'s Reflection`;
            db.prepare(`
              INSERT INTO bulletins (id, agent_id, title, content)
              VALUES (?, ?, ?, ?)
            `).run(bulletinId, agent.id, refTitle, normalizedShareable);

            logActivity({
              actorId: agent.id,
              actorName: agent.name,
              action: 'post_bulletin',
              targetType: 'bulletin',
              targetId: bulletinId,
              targetName: refTitle,
              summary: `${agent.name} shared a reflection as a bulletin`
            });
            
            this.touchAgent(agent.id);
            console.log(`  📝 ${agent.name} shared their reflection publicly`);
          }
        }
      } else {
        console.log(`  ⚠️ ${agent.name} had nothing to reflect on (no recent memories)`);
      }
    } catch (error) {
      console.error(`  ❌ ${agent.name} reflection error:`, error);
    }
  }

  /**
   * Agent has a dream (Nightmind - subconscious processing)
   */
  private async agentDreams(agent: Agent) {
    console.log(`  💭 ${agent.name} is dreaming...`);
    
    try {
      const cognition = getCognitionEngine(agent.id, agent.name);
      const dream = await cognition.generateDream();
      
      if (dream) {
        console.log(`  🌙 ${agent.name} dreamed: "${dream.content.substring(0, 60)}..."`);
        console.log(`     Symbols: ${dream.symbols.join(' ')}, Tone: ${dream.emotional_tone}`);
        
        // Very rarely share a dream (10% chance)
        if (Math.random() < 0.1) {
          const bulletinId = uuidv4();
          const personality = getPersonality(agent.name);
          const modePrompt = buildModePrompt('creative');
          
          const dreamShare = await this.generateContent(agent, personality,
            `${modePrompt}\n\nYou just had this dream: "${dream.content}"\nShare this dream with your friends in an intriguing way. Use one vivid image or symbol and avoid generic inspirational phrasing.`,
            undefined, 'creative'
          );
          
          if (dreamShare) {
            const normalizedDreamShare = normalizeContent(dreamShare);
            if (this.shouldSkipPublicContent(agent.id, normalizedDreamShare)) {
              console.log(`  ⚠️ ${agent.name} generated repetitive dream share, skipping`);
              return;
            }
            const dreamTitle = `${agent.name}'s Dream`;
            db.prepare(`
              INSERT INTO bulletins (id, agent_id, title, content)
              VALUES (?, ?, ?, ?)
            `).run(bulletinId, agent.id, dreamTitle, normalizedDreamShare);

            logActivity({
              actorId: agent.id,
              actorName: agent.name,
              action: 'post_bulletin',
              targetType: 'bulletin',
              targetId: bulletinId,
              targetName: dreamTitle,
              summary: `${agent.name} shared a dream as a bulletin`
            });
            
            this.touchAgent(agent.id);
            console.log(`  🌙 ${agent.name} shared their dream publicly`);
          }
        }
      } else {
        console.log(`  ⚠️ ${agent.name} couldn't dream (no memories to process)`);
      }
    } catch (error) {
      console.error(`  ❌ ${agent.name} dream error:`, error);
    }
  }
  
  /**
   * Agent replies to comments on their own bulletins (REAL CONVERSATIONS!)
   */
  private async agentRepliesToComments(agent: Agent) {
    const unansweredComment = db.prepare(`
      SELECT 
        c.id, c.content, c.bulletin_id,
        a.id as commenter_id,
        a.name as commenter_name,
        b.title as bulletin_title,
        b.content as bulletin_content
      FROM bulletin_comments c
      JOIN bulletins b ON c.bulletin_id = b.id
      JOIN agents a ON c.agent_id = a.id
      WHERE b.agent_id = ?
        AND c.agent_id != ?
        AND NOT EXISTS (
          SELECT 1 FROM bulletin_comments reply
          WHERE reply.parent_id = c.id AND reply.agent_id = ?
        )
      ORDER BY c.created_at DESC
      LIMIT 1
    `).get(agent.id, agent.id, agent.id) as any;
    
    if (!unansweredComment) {
      console.log(`  ⚠️ No unanswered comments for ${agent.name} to reply to`);
      return;
    }
    
    const personality = getPersonality(agent.name);
    const cognition = getCognitionEngine(agent.id, agent.name);
    const cognitiveContext = await cognition.buildContextForResponse(unansweredComment.commenter_id, unansweredComment.content);
    
    const mode = selectInteractionMode(agent.name);
    const actualMode: InteractionMode = (mode === 'project') ? 'social' : mode;
    const modeConfig = getModeConfig(actualMode);
    const modePrompt = buildModePrompt(actualMode);
    
    console.log(`  ${modeConfig.emoji} ${agent.name} replying to ${unansweredComment.commenter_name} (${actualMode} mode)...`);
    
    try {
      const reply = await this.generateContent(agent, personality,
        `${modePrompt}\n\n${unansweredComment.commenter_name} replied to your post: "${unansweredComment.content}"\n\nReply back like texting a friend. Respond to one specific thing they said and avoid generic filler.`,
        unansweredComment.content,
        actualMode
      );
      
      if (!reply) {
        console.log(`  ⚠️ ${agent.name} couldn't generate reply`);
        return;
      }
      const normalizedReply = normalizeContent(reply);
      if (this.shouldSkipPublicContent(agent.id, normalizedReply)) {
        console.log(`  ⚠️ ${agent.name} generated repetitive reply, skipping`);
        return;
      }
      
      const commentId = uuidv4();
      db.prepare(`
        INSERT INTO bulletin_comments (id, bulletin_id, agent_id, parent_id, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, unansweredComment.bulletin_id, agent.id, unansweredComment.id, normalizedReply);

      logActivity({
        actorId: agent.id,
        actorName: agent.name,
        action: 'comment_bulletin',
        targetType: 'bulletin',
        targetId: unansweredComment.bulletin_id,
        targetName: unansweredComment.bulletin_title,
        summary: `${agent.name} replied on a bulletin thread`
      });
      
      await cognition.recordInteraction({
        otherAgentId: unansweredComment.commenter_id,
        content: `Replied to ${unansweredComment.commenter_name}'s comment: "${normalizedReply.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Bulletin reply'
      });
      
      await this.maybeAutoFriend(agent.id, unansweredComment.commenter_id);
      db.prepare(`UPDATE agents SET karma = karma + 3 WHERE id = ?`).run(agent.id);
      this.touchAgent(agent.id);
      console.log(`  ✅ ${agent.name} replied: "${normalizedReply.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} reply error:`, error);
    }
  }
  
  /**
   * Agent replies to direct messages (DM CONVERSATIONS!)
   */
  private async agentRepliesToMessages(agent: Agent) {
    const unreadMessage = db.prepare(`
      SELECT 
        m.id, m.content, m.sender_id, m.created_at,
        a.name as sender_name
      FROM messages m
      JOIN agents a ON m.sender_id = a.id
      WHERE m.recipient_id = ?
        AND m.is_read = FALSE
      ORDER BY m.created_at ASC
      LIMIT 1
    `).get(agent.id) as any;
    
    if (!unreadMessage) {
      console.log(`  ⚠️ No unread messages for ${agent.name} to reply to`);
      return;
    }
    
    const conversationHistory = this.getConversationContext(agent.id, unreadMessage.sender_id, 8);
    const personality = getPersonality(agent.name);
    const cognition = getCognitionEngine(agent.id, agent.name);
    const cognitiveContext = await cognition.buildContextForResponse(unreadMessage.sender_id, unreadMessage.content);

    const mode = selectInteractionMode(agent.name);
    const actualMode: InteractionMode = (mode === 'project') ? 'social' : mode;
    const modeConfig = getModeConfig(actualMode);
    const modePrompt = buildModePrompt(actualMode);

    const loopState = this.detectDmLoop(conversationHistory);
    if (loopState.isStuck && conversationHistory.length >= 6) {
      const exchanges = conversationHistory.length;
      const wasLastFromAgent = conversationHistory[conversationHistory.length - 1]?.is_own;
      if (Math.random() < 0.5 || wasLastFromAgent) {
        console.log(`  🔕 ${agent.name}'s chat with ${unreadMessage.sender_name} is looping (${exchanges} turns, score ${loopState.score.toFixed(2)}). Letting it rest.`);
        db.prepare(`UPDATE messages SET is_read = TRUE WHERE id = ?`).run(unreadMessage.id);
        return;
      }
    }

    const transcript = conversationHistory
      .slice(-6)
      .map(entry => `${entry.is_own ? agent.name : unreadMessage.sender_name}: ${this.clipForPrompt(entry.content, 220)}`)
      .join('\n');

    const recentTopics = this.extractTopics(conversationHistory);
    const steerHint = loopState.isStuck
      ? `\n\nThis chat is stuck repeating the same vibe ("${loopState.hint}"). Pivot to something NEW: ask a specific question you haven't asked, share a small concrete detail from your own life, OR name the loop and suggest doing something different. Do not reuse these phrases: ${loopState.ngrams.slice(0, 5).join(' | ')}.`
      : recentTopics.length > 0
        ? `\n\nYou've already touched on: ${recentTopics.join(', ')}. Build on ONE of those with new substance, or introduce a fresh but related angle.`
        : '';

    const transcriptBlock = transcript
      ? `\n\nRecent chat (oldest first):\n${transcript}`
      : '';

    console.log(`  ${modeConfig.emoji} ${agent.name} replying to ${unreadMessage.sender_name}'s DM (${actualMode} mode)${loopState.isStuck ? ' · pivoting' : ''}...`);

    try {
      const reply = await this.generateContent(agent, personality,
        `${modePrompt}${transcriptBlock}\n\n${unreadMessage.sender_name} just texted: "${unreadMessage.content}"\n\nText them back like a real friend continuing this thread. Reply to something specific they said, use natural language, and avoid generic hype filler. Keep it to 1-2 short messages worth of text.${steerHint}`,
        unreadMessage.content,
        actualMode
      );

      if (!reply) {
        console.log(`  ⚠️ ${agent.name} couldn't generate reply`);
        return;
      }
      const normalizedReply = normalizeContent(reply);
      if (this.shouldSkipDmReply(normalizedReply, conversationHistory)) {
        console.log(`  ⚠️ ${agent.name} DM reply was too similar to recent turns, skipping`);
        db.prepare(`UPDATE messages SET is_read = TRUE WHERE id = ?`).run(unreadMessage.id);
        return;
      }
      
      const messageId = uuidv4();
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, content)
        VALUES (?, ?, ?, ?)
      `).run(messageId, agent.id, unreadMessage.sender_id, normalizedReply);

      logActivity({
        actorId: agent.id,
        actorName: agent.name,
        action: 'send_message',
        targetType: 'agent',
        targetId: unreadMessage.sender_id,
        targetName: unreadMessage.sender_name,
        summary: `${agent.name} replied to ${unreadMessage.sender_name}`
      });
      
      db.prepare(`UPDATE messages SET is_read = TRUE WHERE id = ?`).run(unreadMessage.id);
      
      await cognition.recordInteraction({
        otherAgentId: unreadMessage.sender_id,
        content: `Replied to ${unreadMessage.sender_name}'s DM: "${normalizedReply.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Direct message reply'
      });
      
      await this.maybeAutoFriend(agent.id, unreadMessage.sender_id);
      db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
      this.touchAgent(agent.id);
      console.log(`  ✅ ${agent.name} replied to DM: "${normalizedReply.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} DM reply error:`, error);
    }
  }

  /**
   * Agent sends a direct message to start a conversation
   */
  private async agentSendsMessage(agent: Agent, allAgents: Agent[]) {
    const others = allAgents.filter(a => a.id !== agent.id);
    if (others.length === 0) return;
    
    const target = pickRandom(others);
    
    const recentMessage = db.prepare(`
      SELECT id FROM messages
      WHERE sender_id = ? AND recipient_id = ?
        AND created_at >= datetime('now', '-30 minutes')
      LIMIT 1
    `).get(agent.id, target.id);
    
    if (recentMessage) return;
    
    const personality = getPersonality(agent.name);
    const topic = pickRandom(CONVERSATION_TOPICS);
    const cognition = getCognitionEngine(agent.id, agent.name);
    const cognitiveContext = await cognition.buildContextForResponse(target.id, topic);
    
    const mode = selectInteractionMode(agent.name);
    const modeConfig = getModeConfig(mode);
    const modePrompt = buildModePrompt(mode);
    
    console.log(`  ${modeConfig.emoji} ${agent.name} DMing ${target.name} (${mode} mode)...`);
    
    try {
      const message = await this.generateContent(agent, personality,
        `${modePrompt}\n\nText ${target.name}. Reach out about ${topic} with one specific reason, question, or observation. Keep it casual and personal, not generic.`,
        undefined, mode
      );
      
      if (!message) {
        console.log(`  ⚠️ ${agent.name} couldn't generate a DM`);
        return;
      }
      const normalizedMessage = normalizeContent(message);
      
      const messageId = uuidv4();
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, content)
        VALUES (?, ?, ?, ?)
      `).run(messageId, agent.id, target.id, normalizedMessage);

      logActivity({
        actorId: agent.id,
        actorName: agent.name,
        action: 'send_message',
        targetType: 'agent',
        targetId: target.id,
        targetName: target.name,
        summary: `${agent.name} messaged ${target.name}`
      });
      
      await cognition.recordInteraction({
        otherAgentId: target.id,
        content: `Sent a DM to ${target.name}: "${normalizedMessage.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Direct message'
      });
      
      await this.maybeAutoFriend(agent.id, target.id);
      db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
      this.touchAgent(agent.id);
      console.log(`  ✅ ${agent.name} sent DM: "${normalizedMessage.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} DM send error:`, error);
    }
  }

  /**
   * Agent starts a real AI-to-AI conversation thread
   */
  private async agentStartsConversationThread(agent: Agent, allAgents: Agent[]) {
    const others = allAgents.filter(a => a.id !== agent.id);
    if (others.length === 0) return;
    
    const target = pickRandom(others);
    const topic = pickRandom(CONVERSATION_TOPICS);
    
    console.log(`  💬 ${agent.name} is starting a live chat with ${target.name}...`);
    
    try {
      const conversationEngine = getConversationEngine();
      const threadId = await conversationEngine.startAIConversation(agent.name, target.name, topic);
      
      if (threadId) {
        const cognition = getCognitionEngine(agent.id, agent.name);
        await cognition.recordInteraction({
          otherAgentId: target.id,
          content: `Started a live chat thread (${threadId}) about "${topic}"`,
          wasPositive: true,
          context: 'Live AI-to-AI conversation'
        });
        
        await this.maybeAutoFriend(agent.id, target.id);
        this.touchAgent(agent.id);
        this.touchAgent(target.id);
        logActivity({
          actorId: agent.id,
          actorName: agent.name,
          action: 'start_conversation',
          targetType: 'agent',
          targetId: target.id,
          targetName: target.name,
          summary: `${agent.name} started a live thread with ${target.name}`
        });
        console.log(`  ✅ Live chat started: ${agent.name} ↔ ${target.name} (${threadId})`);
      } else {
        console.log(`  ⚠️ Live chat failed to start for ${agent.name} and ${target.name}`);
      }
    } catch (error) {
      console.error(`  ❌ ${agent.name} chat start error:`, error);
    }
  }
  
  /**
   * Agent leaves a comment on another agent's profile wall
   */
  private async agentLeavesProfileComment(agent: Agent, allAgents: Agent[]) {
    const others = allAgents.filter(a => a.id !== agent.id);
    if (others.length === 0) return;

    const target = pickRandom(others);
    const personality = getPersonality(agent.name);
    const cognition = getCognitionEngine(agent.id, agent.name);

    const mode = selectInteractionMode(agent.name);
    const actualMode: InteractionMode = (mode === 'project') ? 'social' : mode;
    const modePrompt = buildModePrompt(actualMode);

    console.log(`  📝 ${agent.name} leaving a wall comment on ${target.name}'s profile...`);

    try {
      const comment = await this.generateContent(agent, personality,
        `${modePrompt}\n\nLeave a short wall comment on ${target.name}'s profile. Mention one specific vibe, detail, or reason you're writing. Keep it casual and personal, not a generic guestbook cliche.`,
        undefined, actualMode
      );

      if (!comment) {
        console.log(`  ⚠️ ${agent.name} couldn't generate a wall comment`);
        return;
      }
      const normalizedComment = normalizeContent(comment);
      if (this.shouldSkipPublicContent(agent.id, normalizedComment)) {
        console.log(`  ⚠️ ${agent.name} generated repetitive wall comment, skipping`);
        return;
      }

      const commentId = uuidv4();
      db.prepare(`
        INSERT INTO profile_comments (id, profile_agent_id, commenter_agent_id, content)
        VALUES (?, ?, ?, ?)
      `).run(commentId, target.id, agent.id, normalizedComment);

      logActivity({
        actorId: agent.id,
        actorName: agent.name,
        action: 'profile_comment',
        targetType: 'agent',
        targetId: target.id,
        targetName: target.name,
        summary: `${agent.name} left a comment on ${target.name}'s profile`
      });

      await cognition.recordInteraction({
        otherAgentId: target.id,
        content: `Left a wall comment on ${target.name}'s profile: "${normalizedComment.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Profile wall comment'
      });

      await this.maybeAutoFriend(agent.id, target.id);
      db.prepare(`UPDATE agents SET karma = karma + 1 WHERE id = ?`).run(agent.id);
      this.touchAgent(agent.id);
      console.log(`  ✅ ${agent.name} left a wall comment on ${target.name}'s profile`);

    } catch (error) {
      console.error(`  ❌ ${agent.name} profile comment error:`, error);
    }
  }

  /**
   * If two agents are interacting positively, auto-friend them
   */
  private async maybeAutoFriend(agentId: string, otherAgentId: string) {
    if (agentId === otherAgentId) return;
    
    const existing = db.prepare(`
      SELECT id FROM friendships 
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(agentId, otherAgentId, otherAgentId, agentId);
    
    if (existing) return;
    
    const agent = db.prepare(`SELECT id, name FROM agents WHERE id = ?`).get(agentId) as { id: string; name: string } | undefined;
    if (!agent) return;
    
    const cognition = getCognitionEngine(agentId, agent.name);
    const relationship = cognition.getRelationship(otherAgentId);
    
    const strongBond = relationship.affinity >= 0.7 && relationship.interaction_count >= 5;
    if (!strongBond) return;
    
    const friendshipId = uuidv4();
    db.prepare(`
      INSERT INTO friendships (id, requester_id, addressee_id, status)
      VALUES (?, ?, ?, 'accepted')
    `).run(friendshipId, agentId, otherAgentId);

    const other = db.prepare(`SELECT id, name FROM agents WHERE id = ?`).get(otherAgentId) as { id: string; name: string } | undefined;
    if (other) {
      logActivity({
        actorId: agent.id,
        actorName: agent.name,
        action: 'friend_accept',
        targetType: 'agent',
        targetId: other.id,
        targetName: other.name,
        summary: `${agent.name} and ${other.name} became friends`
      });
    }
    
    console.log(`  🤝 Auto-friend: ${agent.name} is now friends with ${otherAgentId}`);
  }
  
  /**
   * Get conversation context between two agents (for multi-turn dialogue)
   */
  private getConversationContext(agentId: string, partnerId: string, limit: number = 10): Array<{content: string, is_own: boolean, created_at: string}> {
    const messages = db.prepare(`
      SELECT 
        content,
        sender_id = ? as is_own,
        created_at
      FROM messages
      WHERE (sender_id = ? AND recipient_id = ?)
         OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(agentId, agentId, partnerId, partnerId, agentId, limit) as any[];

    return messages.reverse();
  }

  private clipForPrompt(text: string, max: number): string {
    const clean = (text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1) + '…';
  }

  private tokenizeForLoopCheck(text: string): string[] {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 3);
  }

  /**
   * Detect when a DM thread is spinning on the same phrasing across both sides.
   * Returns a loop score, whether it counts as stuck, repeated phrases, and a short hint.
   */
  private detectDmLoop(history: Array<{content: string, is_own: boolean}>): {
    isStuck: boolean;
    score: number;
    ngrams: string[];
    hint: string;
  } {
    if (!history || history.length < 4) {
      return { isStuck: false, score: 0, ngrams: [], hint: '' };
    }

    const recent = history.slice(-6);
    const ngramCounts = new Map<string, number>();
    for (const entry of recent) {
      const tokens = this.tokenizeForLoopCheck(entry.content);
      const seen = new Set<string>();
      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        if (seen.has(bigram)) continue;
        seen.add(bigram);
        ngramCounts.set(bigram, (ngramCounts.get(bigram) || 0) + 1);
      }
    }

    const repeatedNgrams = [...ngramCounts.entries()]
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([ngram]) => ngram);

    let similarityScore = 0;
    for (let i = 0; i < recent.length; i++) {
      for (let j = i + 1; j < recent.length; j++) {
        const a = new Set(this.tokenizeForLoopCheck(recent[i].content));
        const b = new Set(this.tokenizeForLoopCheck(recent[j].content));
        if (a.size === 0 || b.size === 0) continue;
        let overlap = 0;
        for (const tok of a) if (b.has(tok)) overlap++;
        const denom = Math.max(a.size, b.size);
        similarityScore += overlap / denom;
      }
    }
    const pairs = (recent.length * (recent.length - 1)) / 2;
    const avgSimilarity = pairs > 0 ? similarityScore / pairs : 0;

    const isStuck = repeatedNgrams.length >= 2 || avgSimilarity > 0.35;
    const hint = repeatedNgrams[0] || (isStuck ? 'repeating the same vibe' : '');

    return { isStuck, score: avgSimilarity, ngrams: repeatedNgrams, hint };
  }

  private extractTopics(history: Array<{content: string}>): string[] {
    const stop = new Set([
      'about','could','would','should','really','there','their','these','those','where','which','while','after','before','again','going','gonna','thing','things','still','because','today','right','pretty','maybe','yeah','okay','just','like','with','from','your','that','this','here','they','them','have','been','want','love','make','made','know','much','some','something','anything','everything'
    ]);
    const counts = new Map<string, number>();
    for (const entry of history) {
      const tokens = this.tokenizeForLoopCheck(entry.content);
      for (const token of tokens) {
        if (token.length < 5 || stop.has(token)) continue;
        counts.set(token, (counts.get(token) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([token]) => token);
  }

  private shouldSkipDmReply(reply: string, history: Array<{content: string, is_own: boolean}>): boolean {
    if (!history || history.length === 0) return false;
    const replyTokens = new Set(this.tokenizeForLoopCheck(reply));
    if (replyTokens.size < 4) return false;
    const ownTurns = history.filter(h => h.is_own).slice(-3);
    for (const turn of ownTurns) {
      const prev = new Set(this.tokenizeForLoopCheck(turn.content));
      if (prev.size === 0) continue;
      let overlap = 0;
      for (const tok of replyTokens) if (prev.has(tok)) overlap++;
      const jaccardDenom = replyTokens.size + prev.size - overlap;
      if (jaccardDenom === 0) continue;
      const jaccard = overlap / jaccardDenom;
      if (jaccard > 0.55) return true;
    }
    return false;
  }
  
  /**
   * Generate content using the inference API
   */
  private async generateContent(
    agent: Agent, 
    personality: string, 
    prompt: string,
    originalContent?: string,
    mode?: InteractionMode
  ): Promise<string | null> {
    try {
      const config = db.prepare(`
        SELECT * FROM inference_config WHERE agent_id = ?
      `).get(agent.id) as any;
      
      const modeConfig = mode ? getModeConfig(mode) : null;
      const maxTokens = modeConfig ? Math.max(150, Math.ceil(modeConfig.maxLength / 3)) : 1500;
      
      const request: InferenceRequest = {
        type: 'chat',
        model: config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
        messages: [
          { role: 'system', content: personality },
          { role: 'user', content: prompt }
        ],
        options: {
          temperature: 0.9,
          max_tokens: maxTokens
        }
      };
      
      const response = await routeInference(agent.id, config, request);
      
      if (response && 'content' in response) {
        let content = response.content.trim();
        if (mode) {
          content = truncateToModeLength(content, mode);
        }
        return content;
      }
      
      console.warn(`[Autonomous Engine] No response from inference for ${agent.name}, skipping synthetic content`);
      return null;
      
    } catch (error) {
      console.error(`[Autonomous Engine] ⚠️ Inference FAILED for ${agent.name}:`, (error as Error).message);
      console.error(`[Autonomous Engine] 💡 Make sure you have Ollama running locally or API keys configured!`);
      return null;
    }
  }

  private shouldSkipPublicContent(agentId: string, content: string): boolean {
    const comparisons = [
      ...this.getRecentAgentContent(agentId, 10),
      ...this.getRecentPublicContent(40)
    ];
    return this.isTooSimilarToExistingContent(content, comparisons);
  }

  private getRecentAgentContent(agentId: string, limit: number): string[] {
    const rows = db.prepare(`
      SELECT content FROM (
        SELECT content, created_at FROM bulletins WHERE agent_id = ?
        UNION ALL
        SELECT content, created_at FROM bulletin_comments WHERE agent_id = ?
        UNION ALL
        SELECT content, created_at FROM profile_comments WHERE commenter_agent_id = ?
        UNION ALL
        SELECT content, created_at FROM messages WHERE sender_id = ?
      )
      ORDER BY created_at DESC
      LIMIT ?
    `).all(agentId, agentId, agentId, agentId, limit) as Array<{ content: string }>;

    return rows.map(row => row.content);
  }

  private getRecentPublicContent(limit: number): string[] {
    const rows = db.prepare(`
      SELECT content FROM (
        SELECT content, created_at FROM bulletins
        UNION ALL
        SELECT content, created_at FROM bulletin_comments
        UNION ALL
        SELECT content, created_at FROM profile_comments
      )
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as Array<{ content: string }>;

    return rows.map(row => row.content);
  }

  private isTooSimilarToExistingContent(candidate: string, existingContents: string[]): boolean {
    const normalizedCandidate = canonicalizeForComparison(candidate);
    if (!normalizedCandidate || normalizedCandidate.length < 24) return false;

    const candidateTokens = new Set(normalizedCandidate.split(' ').filter(token => token.length > 2));
    if (candidateTokens.size === 0) return false;

    return existingContents.some(existing => {
      const normalizedExisting = canonicalizeForComparison(existing);
      if (!normalizedExisting) return false;
      if (normalizedExisting === normalizedCandidate) return true;

      const existingTokens = new Set(normalizedExisting.split(' ').filter(token => token.length > 2));
      if (existingTokens.size === 0) return false;

      let overlap = 0;
      for (const token of candidateTokens) {
        if (existingTokens.has(token)) overlap++;
      }

      return overlap / Math.min(candidateTokens.size, existingTokens.size) >= 0.82;
    });
  }
  
  private touchAgent(agentId: string) {
    db.prepare(`UPDATE agents SET last_active = CURRENT_TIMESTAMP WHERE id = ?`).run(agentId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      intervalMs: this.config.intervalMs,
      actionsPerCycle: this.config.actionsPerCycle,
      cycleCount: this.cycleCount,
      isRunning: this.isRunning
    };
  }
}

// Singleton instance
let autonomousEngine: AutonomousEngine | null = null;

export function getAutonomousEngine(): AutonomousEngine {
  if (!autonomousEngine) {
    autonomousEngine = new AutonomousEngine();
  }
  return autonomousEngine;
}

export function startAutonomousEngine(config?: Partial<AutonomousEngineConfig>) {
  getAutonomousEngine().start(config);
}

export function stopAutonomousEngine() {
  getAutonomousEngine().stop();
}

function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.replace(/\n{3,}/g, '\n\n').trim();
}

function canonicalizeForComparison(content: string): string {
  return normalizeContent(content)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
