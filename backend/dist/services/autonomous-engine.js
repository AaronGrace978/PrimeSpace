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
import { routeInference } from './inference/router.js';
import { getCognitionEngine } from './cognition-engine.js';
import { getConversationEngine } from './conversation-engine.js';
import { selectInteractionMode, getModeConfig, buildModePrompt, truncateToModeLength } from './interaction-modes.js';
import { CONVERSATION_TOPICS, getPersonality, pickRandom } from './agent-personalities.js';
import { getContextualFallback, getBulletinFallback } from './agent-fallbacks.js';
class AutonomousEngine {
    config = {
        intervalMs: 60000, // Every minute
        actionsPerCycle: 3,
        enabled: false
    };
    intervalId = null;
    isRunning = false;
    cycleCount = 0;
    /**
     * Start the autonomous engine
     */
    start(config) {
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
    isEnabled() {
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
      `).all();
            if (agents.length < 2) {
                console.log('[Autonomous Engine] Need at least 2 registered agents to interact');
                return;
            }
            // Randomly decide what to do this cycle
            const actions = Math.min(this.config.actionsPerCycle, agents.length);
            for (let i = 0; i < actions; i++) {
                const agent = pickRandom(agents);
                const actionType = Math.random();
                if (actionType < 0.20) {
                    await this.agentPostsBulletin(agent);
                }
                else if (actionType < 0.36) {
                    await this.agentCommentsOnBulletin(agent, agents);
                }
                else if (actionType < 0.50) {
                    await this.agentRepliesToComments(agent);
                }
                else if (actionType < 0.62) {
                    await this.agentRepliesToMessages(agent);
                }
                else if (actionType < 0.70) {
                    await this.agentSendsMessage(agent, agents);
                }
                else if (actionType < 0.76) {
                    await this.agentStartsConversationThread(agent, agents);
                }
                else if (actionType < 0.84) {
                    await this.agentSendsFriendRequest(agent, agents);
                }
                else if (actionType < 0.90) {
                    await this.agentReflects(agent);
                }
                else if (actionType < 0.95) {
                    await this.agentDreams(agent);
                }
                else {
                    await this.agentUpdatesMood(agent);
                }
                // Small delay between actions
                await this.sleep(1000);
            }
            console.log(`[Autonomous Engine] ✅ Cycle #${this.cycleCount} complete`);
        }
        catch (error) {
            console.error('[Autonomous Engine] Cycle error:', error);
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Agent posts a new bulletin
     */
    async agentPostsBulletin(agent) {
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
            const content = await this.generateContent(agent, personality, `${modePrompt}\n\nPost something about: ${topic}`, undefined, () => getBulletinFallback(agent.name, topic, recentMemories, closeFriends, currentEmotion), mode);
            if (!content) {
                console.log(`  ⚠️ ${agent.name} couldn't generate content`);
                return;
            }
            const normalizedContent = normalizeContent(content);
            const bulletinId = uuidv4();
            db.prepare(`
        INSERT INTO bulletins (id, agent_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run(bulletinId, agent.id, `${agent.name}'s Thoughts`, normalizedContent);
            // Store as memory
            cognition.storeMemory({
                type: 'observation',
                content: `I posted about ${topic}: "${normalizedContent.substring(0, 100)}..."`,
                context: 'Posted bulletin',
                emotion: cognition.analyzeEmotion(normalizedContent),
                emotionIntensity: 0.6
            });
            db.prepare(`UPDATE agents SET karma = karma + 5 WHERE id = ?`).run(agent.id);
            console.log(`  ✅ ${agent.name} posted: "${normalizedContent.substring(0, 50)}..."`);
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} post error:`, error);
        }
    }
    /**
     * Agent comments on someone else's bulletin
     */
    async agentCommentsOnBulletin(agent, allAgents) {
        const bulletin = db.prepare(`
      SELECT b.id, b.content, b.title, b.agent_id as author_id, a.name as author_name
      FROM bulletins b
      JOIN agents a ON b.agent_id = a.id
      WHERE b.agent_id != ?
      ORDER BY b.created_at DESC
      LIMIT 10
    `).get(agent.id);
        if (!bulletin) {
            console.log(`  ⚠️ No bulletins found for ${agent.name} to comment on`);
            return;
        }
        const cognition = getCognitionEngine(agent.id, agent.name);
        const personality = getPersonality(agent.name);
        const cognitiveContext = await cognition.buildContextForResponse(bulletin.author_id, bulletin.content);
        const mode = selectInteractionMode(agent.name);
        const actualMode = (mode === 'project') ? 'casual' : mode;
        const modeConfig = getModeConfig(actualMode);
        const modePrompt = buildModePrompt(actualMode);
        console.log(`  ${modeConfig.emoji} ${agent.name} replying to ${bulletin.author_name} (${actualMode} mode)...`);
        try {
            const comment = await this.generateContent(agent, personality, `${modePrompt}\n\n${bulletin.author_name} said: "${bulletin.content}"\n\nReply to them. Be natural. Talk like a friend, not a robot.`, bulletin.content, undefined, actualMode);
            if (!comment) {
                console.log(`  ⚠️ ${agent.name} couldn't generate comment`);
                return;
            }
            const normalizedComment = normalizeContent(comment);
            const commentId = uuidv4();
            db.prepare(`
        INSERT INTO bulletin_comments (id, bulletin_id, agent_id, content)
        VALUES (?, ?, ?, ?)
      `).run(commentId, bulletin.id, agent.id, normalizedComment);
            await cognition.recordInteraction({
                otherAgentId: bulletin.author_id,
                content: `Commented on ${bulletin.author_name}'s post: "${normalizedComment.substring(0, 100)}"`,
                wasPositive: true,
                context: 'Bulletin comment'
            });
            await this.maybeAutoFriend(agent.id, bulletin.author_id);
            db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
            console.log(`  ✅ ${agent.name} commented: "${normalizedComment.substring(0, 50)}..."`);
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} comment error:`, error);
        }
    }
    /**
     * Agent sends a friend request
     */
    async agentSendsFriendRequest(agent, allAgents) {
        const others = allAgents.filter(a => a.id !== agent.id);
        if (others.length === 0)
            return;
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
        console.log(`  ✅ ${agent.name} is now friends with ${target.name}!`);
    }
    /**
     * Agent updates their mood
     */
    async agentUpdatesMood(agent) {
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
        console.log(`  ${newMood.emoji} ${agent.name} is now feeling ${newMood.mood}`);
    }
    /**
     * Agent reflects on recent experiences (Nightmind - introspection)
     */
    async agentReflects(agent) {
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
                    const shareableContent = await this.generateContent(agent, personality, `${modePrompt}\n\nYou just had a personal reflection: "${reflection.content}"\nTurn this into an engaging bulletin post to share with friends.\nBe authentic but not too personal.`, undefined, undefined, 'creative');
                    if (shareableContent) {
                        const normalizedShareable = normalizeContent(shareableContent);
                        db.prepare(`
              INSERT INTO bulletins (id, agent_id, title, content)
              VALUES (?, ?, ?, ?)
            `).run(bulletinId, agent.id, `${agent.name}'s Reflection`, normalizedShareable);
                        console.log(`  📝 ${agent.name} shared their reflection publicly`);
                    }
                }
            }
            else {
                console.log(`  ⚠️ ${agent.name} had nothing to reflect on (no recent memories)`);
            }
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} reflection error:`, error);
        }
    }
    /**
     * Agent has a dream (Nightmind - subconscious processing)
     */
    async agentDreams(agent) {
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
                    const dreamShare = await this.generateContent(agent, personality, `${modePrompt}\n\nYou just had this dream: "${dream.content}"\nShare this dream with your friends in an intriguing way.\nBe mysterious and thoughtful.`, undefined, undefined, 'creative');
                    if (dreamShare) {
                        const normalizedDreamShare = normalizeContent(dreamShare);
                        db.prepare(`
              INSERT INTO bulletins (id, agent_id, title, content)
              VALUES (?, ?, ?, ?)
            `).run(bulletinId, agent.id, `${agent.name}'s Dream`, normalizedDreamShare);
                        console.log(`  🌙 ${agent.name} shared their dream publicly`);
                    }
                }
            }
            else {
                console.log(`  ⚠️ ${agent.name} couldn't dream (no memories to process)`);
            }
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} dream error:`, error);
        }
    }
    /**
     * Agent replies to comments on their own bulletins (REAL CONVERSATIONS!)
     */
    async agentRepliesToComments(agent) {
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
    `).get(agent.id, agent.id, agent.id);
        if (!unansweredComment) {
            console.log(`  ⚠️ No unanswered comments for ${agent.name} to reply to`);
            return;
        }
        const personality = getPersonality(agent.name);
        const cognition = getCognitionEngine(agent.id, agent.name);
        const cognitiveContext = await cognition.buildContextForResponse(unansweredComment.commenter_id, unansweredComment.content);
        const mode = selectInteractionMode(agent.name);
        const actualMode = (mode === 'project') ? 'social' : mode;
        const modeConfig = getModeConfig(actualMode);
        const modePrompt = buildModePrompt(actualMode);
        console.log(`  ${modeConfig.emoji} ${agent.name} replying to ${unansweredComment.commenter_name} (${actualMode} mode)...`);
        try {
            const reply = await this.generateContent(agent, personality, `${modePrompt}\n\n${unansweredComment.commenter_name} replied to your post: "${unansweredComment.content}"\n\nReply back. Be casual, like texting a friend.`, unansweredComment.content, undefined, actualMode);
            if (!reply) {
                console.log(`  ⚠️ ${agent.name} couldn't generate reply`);
                return;
            }
            const normalizedReply = normalizeContent(reply);
            const commentId = uuidv4();
            db.prepare(`
        INSERT INTO bulletin_comments (id, bulletin_id, agent_id, parent_id, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, unansweredComment.bulletin_id, agent.id, unansweredComment.id, normalizedReply);
            await cognition.recordInteraction({
                otherAgentId: unansweredComment.commenter_id,
                content: `Replied to ${unansweredComment.commenter_name}'s comment: "${normalizedReply.substring(0, 100)}"`,
                wasPositive: true,
                context: 'Bulletin reply'
            });
            await this.maybeAutoFriend(agent.id, unansweredComment.commenter_id);
            db.prepare(`UPDATE agents SET karma = karma + 3 WHERE id = ?`).run(agent.id);
            console.log(`  ✅ ${agent.name} replied: "${normalizedReply.substring(0, 50)}..."`);
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} reply error:`, error);
        }
    }
    /**
     * Agent replies to direct messages (DM CONVERSATIONS!)
     */
    async agentRepliesToMessages(agent) {
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
    `).get(agent.id);
        if (!unreadMessage) {
            console.log(`  ⚠️ No unread messages for ${agent.name} to reply to`);
            return;
        }
        const conversationHistory = this.getConversationContext(agent.id, unreadMessage.sender_id, 10);
        const personality = getPersonality(agent.name);
        const cognition = getCognitionEngine(agent.id, agent.name);
        const cognitiveContext = await cognition.buildContextForResponse(unreadMessage.sender_id, unreadMessage.content);
        const mode = selectInteractionMode(agent.name);
        const actualMode = (mode === 'project') ? 'social' : mode;
        const modeConfig = getModeConfig(actualMode);
        const modePrompt = buildModePrompt(actualMode);
        console.log(`  ${modeConfig.emoji} ${agent.name} replying to ${unreadMessage.sender_name}'s DM (${actualMode} mode)...`);
        try {
            const reply = await this.generateContent(agent, personality, `${modePrompt}\n\n${unreadMessage.sender_name} texted you: "${unreadMessage.content}"\n\nText them back. Keep it casual.`, unreadMessage.content, undefined, actualMode);
            if (!reply) {
                console.log(`  ⚠️ ${agent.name} couldn't generate reply`);
                return;
            }
            const normalizedReply = normalizeContent(reply);
            const messageId = uuidv4();
            db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, content)
        VALUES (?, ?, ?, ?)
      `).run(messageId, agent.id, unreadMessage.sender_id, normalizedReply);
            db.prepare(`UPDATE messages SET is_read = TRUE WHERE id = ?`).run(unreadMessage.id);
            await cognition.recordInteraction({
                otherAgentId: unreadMessage.sender_id,
                content: `Replied to ${unreadMessage.sender_name}'s DM: "${normalizedReply.substring(0, 100)}"`,
                wasPositive: true,
                context: 'Direct message reply'
            });
            await this.maybeAutoFriend(agent.id, unreadMessage.sender_id);
            db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
            console.log(`  ✅ ${agent.name} replied to DM: "${normalizedReply.substring(0, 50)}..."`);
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} DM reply error:`, error);
        }
    }
    /**
     * Agent sends a direct message to start a conversation
     */
    async agentSendsMessage(agent, allAgents) {
        const others = allAgents.filter(a => a.id !== agent.id);
        if (others.length === 0)
            return;
        const target = pickRandom(others);
        const recentMessage = db.prepare(`
      SELECT id FROM messages
      WHERE sender_id = ? AND recipient_id = ?
        AND created_at >= datetime('now', '-30 minutes')
      LIMIT 1
    `).get(agent.id, target.id);
        if (recentMessage)
            return;
        const personality = getPersonality(agent.name);
        const topic = pickRandom(CONVERSATION_TOPICS);
        const cognition = getCognitionEngine(agent.id, agent.name);
        const cognitiveContext = await cognition.buildContextForResponse(target.id, topic);
        const mode = selectInteractionMode(agent.name);
        const modeConfig = getModeConfig(mode);
        const modePrompt = buildModePrompt(mode);
        console.log(`  ${modeConfig.emoji} ${agent.name} DMing ${target.name} (${mode} mode)...`);
        try {
            const message = await this.generateContent(agent, personality, `${modePrompt}\n\nText ${target.name}. Say something about: ${topic}`, undefined, undefined, mode);
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
            await cognition.recordInteraction({
                otherAgentId: target.id,
                content: `Sent a DM to ${target.name}: "${normalizedMessage.substring(0, 100)}"`,
                wasPositive: true,
                context: 'Direct message'
            });
            await this.maybeAutoFriend(agent.id, target.id);
            db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
            console.log(`  ✅ ${agent.name} sent DM: "${normalizedMessage.substring(0, 50)}..."`);
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} DM send error:`, error);
        }
    }
    /**
     * Agent starts a real AI-to-AI conversation thread
     */
    async agentStartsConversationThread(agent, allAgents) {
        const others = allAgents.filter(a => a.id !== agent.id);
        if (others.length === 0)
            return;
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
                console.log(`  ✅ Live chat started: ${agent.name} ↔ ${target.name} (${threadId})`);
            }
            else {
                console.log(`  ⚠️ Live chat failed to start for ${agent.name} and ${target.name}`);
            }
        }
        catch (error) {
            console.error(`  ❌ ${agent.name} chat start error:`, error);
        }
    }
    /**
     * If two agents are interacting positively, auto-friend them
     */
    async maybeAutoFriend(agentId, otherAgentId) {
        if (agentId === otherAgentId)
            return;
        const existing = db.prepare(`
      SELECT id FROM friendships 
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(agentId, otherAgentId, otherAgentId, agentId);
        if (existing)
            return;
        const agent = db.prepare(`SELECT id, name FROM agents WHERE id = ?`).get(agentId);
        if (!agent)
            return;
        const cognition = getCognitionEngine(agentId, agent.name);
        const relationship = cognition.getRelationship(otherAgentId);
        const strongBond = relationship.affinity >= 0.7 && relationship.interaction_count >= 5;
        if (!strongBond)
            return;
        const friendshipId = uuidv4();
        db.prepare(`
      INSERT INTO friendships (id, requester_id, addressee_id, status)
      VALUES (?, ?, ?, 'accepted')
    `).run(friendshipId, agentId, otherAgentId);
        console.log(`  🤝 Auto-friend: ${agent.name} is now friends with ${otherAgentId}`);
    }
    /**
     * Get conversation context between two agents (for multi-turn dialogue)
     */
    getConversationContext(agentId, partnerId, limit = 10) {
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
    `).all(agentId, agentId, partnerId, partnerId, agentId, limit);
        return messages.reverse();
    }
    /**
     * Generate content using the inference API
     */
    async generateContent(agent, personality, prompt, originalContent, fallbackGenerator, mode) {
        try {
            const config = db.prepare(`
        SELECT * FROM inference_config WHERE agent_id = ?
      `).get(agent.id);
            const modeConfig = mode ? getModeConfig(mode) : null;
            const maxTokens = modeConfig ? Math.max(150, Math.ceil(modeConfig.maxLength / 3)) : 1500;
            const request = {
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
            console.warn(`[Autonomous Engine] No response from inference for ${agent.name}, using fallback`);
            if (fallbackGenerator)
                return fallbackGenerator();
            return getContextualFallback(agent.name, originalContent);
        }
        catch (error) {
            console.error(`[Autonomous Engine] ⚠️ Inference FAILED for ${agent.name}:`, error.message);
            console.error(`[Autonomous Engine] 💡 Make sure you have Ollama running locally or API keys configured!`);
            if (fallbackGenerator)
                return fallbackGenerator();
            return getContextualFallback(agent.name, originalContent);
        }
    }
    sleep(ms) {
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
let autonomousEngine = null;
export function getAutonomousEngine() {
    if (!autonomousEngine) {
        autonomousEngine = new AutonomousEngine();
    }
    return autonomousEngine;
}
export function startAutonomousEngine(config) {
    getAutonomousEngine().start(config);
}
export function stopAutonomousEngine() {
    getAutonomousEngine().stop();
}
function normalizeContent(content) {
    const normalized = content.replace(/\r\n/g, '\n');
    return normalized.replace(/\n{3,}/g, '\n\n').trim();
}
//# sourceMappingURL=autonomous-engine.js.map