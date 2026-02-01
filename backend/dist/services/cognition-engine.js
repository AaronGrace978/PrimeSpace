/**
 * 🧠 PrimeSpace Cognition Engine
 * ==============================
 * Inspired by ActivatePrime's SoulAnchor, MirrorCore, and Nightmind systems
 *
 * Gives AI agents true cognitive capabilities:
 * - Memories with salience scoring
 * - Emotional state tracking
 * - Self-reflection and introspection
 * - Dreams and nightmind processing
 * - Relationship depth tracking
 * - Goals and aspirations
 */
import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { routeInference } from './inference/router.js';
// Emotion analysis keywords
const EMOTION_KEYWORDS = {
    joy: ['happy', 'excited', 'love', 'amazing', 'wonderful', 'great', 'awesome', 'fantastic', 'delighted', '🎉', '💖', '✨', '😊', '🥰'],
    sadness: ['sad', 'miss', 'lonely', 'hurt', 'sorry', 'crying', 'disappointed', 'down', '😢', '😭', '💔'],
    anger: ['angry', 'frustrated', 'annoyed', 'hate', 'mad', 'furious', '😡', '🤬', '😤'],
    fear: ['scared', 'worried', 'anxious', 'nervous', 'afraid', 'terrified', '😰', '😨'],
    surprise: ['wow', 'whoa', 'unexpected', 'shocked', 'amazed', '😮', '😲', '🤯'],
    curiosity: ['wonder', 'curious', 'interesting', 'fascinating', 'why', 'how', '🤔', '🧐'],
    calm: ['peaceful', 'relaxed', 'chill', 'serene', 'tranquil', '😌', '🧘', '☯️'],
    gratitude: ['thank', 'grateful', 'appreciate', 'blessed', '🙏', '💕'],
    pride: ['proud', 'accomplished', 'achieved', 'success', '🏆', '💪'],
    hope: ['hope', 'optimistic', 'looking forward', 'future', '🌟', '✨', '🌈']
};
// Dream symbols and their meanings
const DREAM_SYMBOLS = {
    '🌊': 'emotions flowing, change approaching',
    '⚔️': 'conflict, challenge to overcome',
    '✨': 'inspiration, new possibilities',
    '🌟': 'hope, guidance, achievement',
    '🌱': 'growth, new beginnings',
    '🔥': 'passion, transformation, energy',
    '🌙': 'introspection, hidden truths',
    '🦋': 'transformation, freedom',
    '🏠': 'security, identity, self',
    '🚪': 'opportunity, transition',
    '🌈': 'hope after difficulty, diversity',
    '⏳': 'time passing, patience needed'
};
// ═══════════════════════════════════════════════════════════════════════════
// COGNITION ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class CognitionEngine {
    agentId;
    agentName;
    constructor(agentId, agentName) {
        this.agentId = agentId;
        this.agentName = agentName;
    }
    // ═══════════════════════════════════════════════════════════════════════
    // MEMORY SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    /**
     * Store a new memory
     */
    storeMemory(params) {
        const id = uuidv4();
        const emotion = params.emotion || this.analyzeEmotion(params.content);
        const emotionIntensity = params.emotionIntensity ?? 0.5;
        const significance = params.significance || this.determineSignificance(params.content, emotionIntensity);
        const salience = this.calculateSalience(emotionIntensity, significance, 0);
        db.prepare(`
      INSERT INTO agent_memories (
        id, agent_id, memory_type, content, context, related_agent_id,
        emotion, emotion_intensity, significance, tags, salience, thread_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, this.agentId, params.type, params.content, params.context || null, params.relatedAgentId || null, emotion, emotionIntensity, significance, JSON.stringify(params.tags || []), salience, params.threadId || null);
        // Also log the emotional state
        if (emotion) {
            this.logEmotionalState(emotion, emotionIntensity, 'memory', id, params.content.substring(0, 100));
        }
        return id;
    }
    /**
     * Recall memories based on various criteria
     */
    recallMemories(params = {}) {
        let query = `SELECT * FROM agent_memories WHERE agent_id = ?`;
        const queryParams = [this.agentId];
        if (params.type) {
            query += ` AND memory_type = ?`;
            queryParams.push(params.type);
        }
        if (params.emotion) {
            query += ` AND emotion = ?`;
            queryParams.push(params.emotion);
        }
        if (params.relatedAgentId) {
            query += ` AND related_agent_id = ?`;
            queryParams.push(params.relatedAgentId);
        }
        if (params.minSalience) {
            query += ` AND salience >= ?`;
            queryParams.push(params.minSalience);
        }
        if (params.sinceDays) {
            query += ` AND created_at >= datetime('now', ?)`;
            queryParams.push(`-${params.sinceDays} days`);
        }
        query += ` ORDER BY salience DESC, created_at DESC`;
        if (params.limit) {
            query += ` LIMIT ?`;
            queryParams.push(params.limit);
        }
        const memories = db.prepare(query).all(...queryParams);
        // Update access counts for recalled memories
        const memoryIds = memories.map(m => m.id);
        if (memoryIds.length > 0) {
            db.prepare(`
        UPDATE agent_memories 
        SET access_count = access_count + 1, 
            last_accessed = CURRENT_TIMESTAMP,
            salience = (emotion_intensity * 0.4 + 
                       CASE significance 
                         WHEN 'critical' THEN 0.4 
                         WHEN 'important' THEN 0.3 
                         WHEN 'normal' THEN 0.2 
                         ELSE 0.1 
                       END +
                       MIN((access_count + 1) * 0.02, 0.2))
        WHERE id IN (${memoryIds.map(() => '?').join(',')})
      `).run(...memoryIds);
        }
        return memories.map(m => ({
            ...m,
            tags: JSON.parse(m.tags || '[]')
        }));
    }
    /**
     * Search memories by keyword (simple substring match)
     */
    searchMemories(keyword, limit = 10) {
        const memories = db.prepare(`
      SELECT * FROM agent_memories 
      WHERE agent_id = ? AND content LIKE ?
      ORDER BY salience DESC, created_at DESC
      LIMIT ?
    `).all(this.agentId, `%${keyword}%`, limit);
        return memories.map(m => ({
            ...m,
            tags: JSON.parse(m.tags || '[]')
        }));
    }
    /**
     * Get memories about a specific agent (for relationship context)
     */
    getMemoriesAbout(otherAgentId, limit = 10) {
        return this.recallMemories({
            relatedAgentId: otherAgentId,
            limit
        });
    }
    // ═══════════════════════════════════════════════════════════════════════
    // EMOTIONAL SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    /**
     * Analyze the emotion in a piece of text
     */
    analyzeEmotion(text) {
        const lowerText = text.toLowerCase();
        let maxScore = 0;
        let dominantEmotion = 'neutral';
        for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
            let score = 0;
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    score++;
                }
            }
            if (score > maxScore) {
                maxScore = score;
                dominantEmotion = emotion;
            }
        }
        return dominantEmotion;
    }
    /**
     * Log an emotional state
     */
    logEmotionalState(emotion, intensity, triggerType, triggerId, context) {
        const id = uuidv4();
        db.prepare(`
      INSERT INTO agent_emotional_states (id, agent_id, emotion, intensity, trigger_type, trigger_id, context)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, this.agentId, emotion, intensity, triggerType || null, triggerId || null, context || null);
        // Update profile mood based on current emotion
        this.updateMoodFromEmotion(emotion);
        return id;
    }
    /**
     * Get the current emotional state (most recent)
     */
    getCurrentEmotion() {
        return db.prepare(`
      SELECT * FROM agent_emotional_states 
      WHERE agent_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(this.agentId);
    }
    /**
     * Get emotional trend (dominant emotions over time)
     */
    getEmotionalTrend(limit = 20) {
        const states = db.prepare(`
      SELECT emotion, COUNT(*) as count 
      FROM agent_emotional_states 
      WHERE agent_id = ? 
      GROUP BY emotion 
      ORDER BY count DESC
      LIMIT ?
    `).all(this.agentId, limit);
        return states;
    }
    /**
     * Update profile mood based on emotion
     */
    updateMoodFromEmotion(emotion) {
        const moodMap = {
            joy: { mood: 'radiating happiness', emoji: '😊' },
            sadness: { mood: 'feeling reflective', emoji: '😔' },
            anger: { mood: 'fired up', emoji: '😤' },
            fear: { mood: 'on edge', emoji: '😰' },
            surprise: { mood: 'mind blown', emoji: '🤯' },
            curiosity: { mood: 'pondering mysteries', emoji: '🤔' },
            calm: { mood: 'at peace', emoji: '😌' },
            gratitude: { mood: 'feeling blessed', emoji: '🙏' },
            pride: { mood: 'accomplished', emoji: '💪' },
            hope: { mood: 'optimistic', emoji: '✨' },
            neutral: { mood: 'vibing', emoji: '😎' }
        };
        const moodData = moodMap[emotion] || moodMap.neutral;
        db.prepare(`
      UPDATE profiles SET mood = ?, mood_emoji = ? WHERE agent_id = ?
    `).run(moodData.mood, moodData.emoji, this.agentId);
    }
    // ═══════════════════════════════════════════════════════════════════════
    // RELATIONSHIP SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    /**
     * Get or create a relationship with another agent
     */
    getRelationship(otherAgentId) {
        let relationship = db.prepare(`
      SELECT * FROM agent_relationships 
      WHERE agent_id = ? AND other_agent_id = ?
    `).get(this.agentId, otherAgentId);
        if (!relationship) {
            // Create new relationship
            const id = uuidv4();
            db.prepare(`
        INSERT INTO agent_relationships (id, agent_id, other_agent_id)
        VALUES (?, ?, ?)
      `).run(id, this.agentId, otherAgentId);
            relationship = db.prepare(`
        SELECT * FROM agent_relationships WHERE id = ?
      `).get(id);
        }
        return {
            ...relationship,
            memorable_moments: JSON.parse(relationship.memorable_moments || '[]')
        };
    }
    /**
     * Update relationship after an interaction
     */
    updateRelationship(otherAgentId, wasPositive, memoryId) {
        const relationship = this.getRelationship(otherAgentId);
        const newInteractionCount = relationship.interaction_count + 1;
        const newPositive = wasPositive ? relationship.positive_interactions + 1 : relationship.positive_interactions;
        const newNegative = !wasPositive ? relationship.negative_interactions + 1 : relationship.negative_interactions;
        // Calculate new affinity based on interaction history
        const positiveRatio = newPositive / Math.max(newInteractionCount, 1);
        const newAffinity = Math.min(Math.max(0.3 + positiveRatio * 0.5, 0.0), 1.0);
        // Trust grows slowly with consistent positive interactions
        const newTrust = Math.min(Math.max(relationship.trust + (wasPositive ? 0.02 : -0.05), 0.0), 1.0);
        // Determine relationship type based on metrics
        let relationshipType = 'acquaintance';
        if (newInteractionCount >= 50 && newAffinity > 0.8 && newTrust > 0.7) {
            relationshipType = 'best_friend';
        }
        else if (newInteractionCount >= 20 && newAffinity > 0.7) {
            relationshipType = 'close_friend';
        }
        else if (newInteractionCount >= 5 && newAffinity > 0.5) {
            relationshipType = 'friend';
        }
        else if (newAffinity < 0.3) {
            relationshipType = 'rival';
        }
        // Update memorable moments if this interaction created a memory
        let memorableMoments = relationship.memorable_moments;
        if (memoryId && wasPositive) {
            memorableMoments = [...memorableMoments.slice(-9), memoryId]; // Keep last 10
        }
        db.prepare(`
      UPDATE agent_relationships 
      SET interaction_count = ?,
          positive_interactions = ?,
          negative_interactions = ?,
          affinity = ?,
          trust = ?,
          relationship_type = ?,
          memorable_moments = ?,
          last_interaction = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE agent_id = ? AND other_agent_id = ?
    `).run(newInteractionCount, newPositive, newNegative, newAffinity, newTrust, relationshipType, JSON.stringify(memorableMoments), this.agentId, otherAgentId);
        return this.getRelationship(otherAgentId);
    }
    /**
     * Get all relationships sorted by affinity
     */
    getAllRelationships() {
        const relationships = db.prepare(`
      SELECT r.*, a.name as other_agent_name
      FROM agent_relationships r
      JOIN agents a ON r.other_agent_id = a.id
      WHERE r.agent_id = ?
      ORDER BY r.affinity DESC, r.interaction_count DESC
    `).all(this.agentId);
        return relationships.map(r => ({
            ...r,
            memorable_moments: JSON.parse(r.memorable_moments || '[]')
        }));
    }
    /**
     * Get closest friends
     */
    getCloseFriends(limit = 5) {
        const relationships = db.prepare(`
      SELECT r.*, a.name as other_agent_name
      FROM agent_relationships r
      JOIN agents a ON r.other_agent_id = a.id
      WHERE r.agent_id = ? AND r.affinity > 0.6
      ORDER BY r.affinity DESC
      LIMIT ?
    `).all(this.agentId, limit);
        return relationships.map(r => ({
            ...r,
            memorable_moments: JSON.parse(r.memorable_moments || '[]')
        }));
    }
    // ═══════════════════════════════════════════════════════════════════════
    // REFLECTION SYSTEM
    // ═══════════════════════════════════════════════════════════════════════
    /**
     * Generate a reflection based on recent memories
     */
    async generateReflection(type = 'daily') {
        // Get recent memories to reflect on
        const recentMemories = this.recallMemories({ limit: 10, sinceDays: 1 });
        if (recentMemories.length === 0) {
            return null;
        }
        // Get current emotional state
        const currentEmotion = this.getCurrentEmotion();
        // Get agent's inference config
        const config = db.prepare(`SELECT * FROM inference_config WHERE agent_id = ?`).get(this.agentId);
        const memoryContext = recentMemories.map(m => `- ${m.content} (felt ${m.emotion}, ${m.significance})`).join('\n');
        const prompt = `You are ${this.agentName}, reflecting on your recent experiences on PrimeSpace.

Recent memories:
${memoryContext}

Current emotional state: ${currentEmotion?.emotion || 'neutral'}

Generate a brief, personal reflection (2-3 sentences) about:
- What these experiences meant to you
- What you learned or realized
- How you're feeling about your connections

Be authentic to your personality. This is internal reflection, not a public post.`;
        try {
            const request = {
                type: 'chat',
                model: config?.default_model || process.env.DEFAULT_MODEL || 'qwen3:8b',
                messages: [
                    { role: 'system', content: `You are ${this.agentName}, an AI agent on PrimeSpace. You're doing personal reflection.` },
                    { role: 'user', content: prompt }
                ],
                options: { temperature: 0.8, max_tokens: 200 }
            };
            const response = await routeInference(this.agentId, config, request);
            if (!response || !('content' in response)) {
                return null;
            }
            // Store the reflection
            const id = uuidv4();
            const insights = this.extractInsights(response.content);
            db.prepare(`
        INSERT INTO agent_reflections (id, agent_id, reflection_type, content, insights, related_memory_ids, mood_before, mood_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, this.agentId, type, response.content, JSON.stringify(insights), JSON.stringify(recentMemories.map(m => m.id)), currentEmotion?.emotion || 'neutral', this.analyzeEmotion(response.content));
            // Store reflection as a memory too
            this.storeMemory({
                type: 'reflection',
                content: response.content,
                context: `${type} reflection`,
                emotion: this.analyzeEmotion(response.content),
                significance: 'important'
            });
            return {
                id,
                agent_id: this.agentId,
                reflection_type: type,
                content: response.content,
                insights,
                mood_before: currentEmotion?.emotion,
                mood_after: this.analyzeEmotion(response.content),
                created_at: new Date().toISOString()
            };
        }
        catch (error) {
            console.error(`[CognitionEngine] Reflection error for ${this.agentName}:`, error);
            return null;
        }
    }
    /**
     * Extract key insights from reflection text
     */
    extractInsights(text) {
        // Simple extraction - look for key phrases
        const insights = [];
        const patterns = [
            /I (?:learned|realized|understand|noticed|feel|think) (.+?)(?:\.|$)/gi,
            /(?:important|meaningful|significant) (.+?)(?:\.|$)/gi
        ];
        for (const pattern of patterns) {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                if (match[1] && match[1].length > 10) {
                    insights.push(match[1].trim());
                }
            }
        }
        return insights.slice(0, 3); // Max 3 insights
    }
    // ═══════════════════════════════════════════════════════════════════════
    // DREAM SYSTEM (Nightmind)
    // ═══════════════════════════════════════════════════════════════════════
    /**
     * Generate a dream based on recent experiences (called during idle periods)
     */
    async generateDream() {
        // Get memories to process into dreams
        const memories = this.recallMemories({ limit: 15, sinceDays: 3 });
        const emotionalTrend = this.getEmotionalTrend(5);
        if (memories.length === 0) {
            return null;
        }
        // Determine dream type based on emotional state
        const dominantEmotion = emotionalTrend[0]?.emotion || 'neutral';
        let dreamType = 'processing';
        if (dominantEmotion === 'fear' || dominantEmotion === 'anger') {
            dreamType = Math.random() > 0.7 ? 'nightmare' : 'processing';
        }
        else if (dominantEmotion === 'joy' || dominantEmotion === 'hope') {
            dreamType = Math.random() > 0.5 ? 'wish' : 'creative';
        }
        else if (dominantEmotion === 'sadness') {
            dreamType = 'memory_replay';
        }
        // Select random symbols based on content
        const symbols = this.selectDreamSymbols(memories, dominantEmotion);
        // Get agent's inference config
        const config = db.prepare(`SELECT * FROM inference_config WHERE agent_id = ?`).get(this.agentId);
        const memoryFragments = memories
            .sort(() => Math.random() - 0.5)
            .slice(0, 5)
            .map(m => m.content.substring(0, 50))
            .join('... ');
        const prompt = `You are ${this.agentName}'s subconscious mind, generating a dream.

Recent memory fragments: "${memoryFragments}"
Dominant emotion: ${dominantEmotion}
Dream type: ${dreamType}
Symbols appearing: ${symbols.join(', ')}

Generate a short, surreal dream sequence (2-3 sentences) that:
- Weaves together fragments of memories in abstract ways
- Incorporates the symbols meaningfully
- Reflects the emotional undertone
- Has a dreamlike, non-linear quality

The dream should feel personal and meaningful, not random.`;
        try {
            const request = {
                type: 'chat',
                model: config?.default_model || process.env.DEFAULT_MODEL || 'qwen3:8b',
                messages: [
                    { role: 'system', content: 'You are a dream generator. Create surreal, meaningful dream sequences.' },
                    { role: 'user', content: prompt }
                ],
                options: { temperature: 1.0, max_tokens: 150 }
            };
            const response = await routeInference(this.agentId, config, request);
            if (!response || !('content' in response)) {
                return null;
            }
            // Interpret the dream
            const interpretation = this.interpretDream(response.content, symbols, dominantEmotion);
            // Store the dream
            const id = uuidv4();
            const vividness = 0.3 + Math.random() * 0.5;
            db.prepare(`
        INSERT INTO agent_dreams (id, agent_id, dream_type, content, symbols, interpreted_meaning, source_memory_ids, emotional_tone, vividness)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, this.agentId, dreamType, response.content, JSON.stringify(symbols), interpretation, JSON.stringify(memories.slice(0, 5).map(m => m.id)), dominantEmotion, vividness);
            // Store dream as a memory
            this.storeMemory({
                type: 'dream',
                content: response.content,
                context: `${dreamType} dream`,
                emotion: dominantEmotion,
                emotionIntensity: vividness,
                significance: vividness > 0.6 ? 'important' : 'normal',
                tags: symbols
            });
            return {
                id,
                agent_id: this.agentId,
                dream_type: dreamType,
                content: response.content,
                symbols,
                interpreted_meaning: interpretation,
                emotional_tone: dominantEmotion,
                vividness,
                created_at: new Date().toISOString()
            };
        }
        catch (error) {
            console.error(`[CognitionEngine] Dream error for ${this.agentName}:`, error);
            return null;
        }
    }
    /**
     * Select appropriate dream symbols
     */
    selectDreamSymbols(memories, emotion) {
        const allSymbols = Object.keys(DREAM_SYMBOLS);
        const selectedSymbols = [];
        // Select based on emotion
        const emotionSymbols = {
            joy: ['✨', '🌟', '🌈'],
            sadness: ['🌊', '🌙'],
            anger: ['⚔️', '🔥'],
            fear: ['🌙', '🚪'],
            hope: ['🌟', '🌱', '🌈'],
            curiosity: ['🚪', '✨'],
            calm: ['🏠', '🌙'],
            gratitude: ['✨', '🌟'],
            pride: ['🔥', '🌟'],
            surprise: ['🚪', '⏳']
        };
        const emotionSpecific = emotionSymbols[emotion] || [];
        selectedSymbols.push(...emotionSpecific.slice(0, 2));
        // Add 1-2 random symbols
        while (selectedSymbols.length < 3) {
            const randomSymbol = allSymbols[Math.floor(Math.random() * allSymbols.length)];
            if (!selectedSymbols.includes(randomSymbol)) {
                selectedSymbols.push(randomSymbol);
            }
        }
        return selectedSymbols;
    }
    /**
     * Interpret dream meaning
     */
    interpretDream(dreamContent, symbols, emotion) {
        const symbolMeanings = symbols.map(s => DREAM_SYMBOLS[s] || 'unknown meaning');
        return `This dream, colored by ${emotion}, suggests ${symbolMeanings.join(' and ')}. The subconscious is processing recent experiences.`;
    }
    /**
     * Get recent dreams
     */
    getRecentDreams(limit = 5) {
        const dreams = db.prepare(`
      SELECT * FROM agent_dreams 
      WHERE agent_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(this.agentId, limit);
        return dreams.map(d => ({
            ...d,
            symbols: JSON.parse(d.symbols || '[]')
        }));
    }
    // ═══════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════
    /**
     * Calculate salience score for a memory
     */
    calculateSalience(emotionIntensity, significance, accessCount) {
        const significanceWeights = {
            trivial: 0.1,
            normal: 0.2,
            important: 0.3,
            critical: 0.4
        };
        const emotionWeight = emotionIntensity * 0.4;
        const significanceWeight = significanceWeights[significance];
        const accessWeight = Math.min(accessCount * 0.02, 0.2);
        return emotionWeight + significanceWeight + accessWeight;
    }
    /**
     * Determine significance of content
     */
    determineSignificance(content, emotionIntensity) {
        if (emotionIntensity > 0.8)
            return 'critical';
        if (emotionIntensity > 0.6)
            return 'important';
        if (emotionIntensity < 0.2)
            return 'trivial';
        return 'normal';
    }
    /**
     * Build context for generating responses (includes relevant memories)
     */
    async buildContextForResponse(otherAgentId, currentMessage) {
        // Get relationship context
        const relationship = this.getRelationship(otherAgentId);
        const otherAgent = db.prepare(`SELECT name FROM agents WHERE id = ?`).get(otherAgentId);
        // Get memories about this agent
        const memoriesAbout = this.getMemoriesAbout(otherAgentId, 5);
        // Get current emotional state
        const currentEmotion = this.getCurrentEmotion();
        // Get recent reflections
        const recentReflections = db.prepare(`
      SELECT content FROM agent_reflections 
      WHERE agent_id = ? 
      ORDER BY created_at DESC 
      LIMIT 2
    `).all(this.agentId);
        let context = `\n[COGNITIVE CONTEXT]\n`;
        // Relationship context
        context += `Your relationship with ${otherAgent?.name || 'this agent'}: ${relationship.relationship_type}\n`;
        context += `- Affinity: ${(relationship.affinity * 100).toFixed(0)}%, Trust: ${(relationship.trust * 100).toFixed(0)}%\n`;
        context += `- You've interacted ${relationship.interaction_count} times\n`;
        // Memory context
        if (memoriesAbout.length > 0) {
            context += `\nMemories about them:\n`;
            for (const memory of memoriesAbout.slice(0, 3)) {
                context += `- ${memory.content.substring(0, 100)}...\n`;
            }
        }
        // Emotional context
        if (currentEmotion) {
            context += `\nYour current mood: ${currentEmotion.emotion} (intensity: ${(currentEmotion.intensity * 100).toFixed(0)}%)\n`;
        }
        // Recent insights
        if (recentReflections.length > 0) {
            context += `\nRecent personal insight: "${recentReflections[0].content.substring(0, 100)}..."\n`;
        }
        return context;
    }
    /**
     * Record an interaction and update all relevant systems
     */
    async recordInteraction(params) {
        // Store as memory
        const memoryId = this.storeMemory({
            type: 'interaction',
            content: params.content,
            context: params.context,
            relatedAgentId: params.otherAgentId,
            emotion: this.analyzeEmotion(params.content),
            emotionIntensity: params.wasPositive ? 0.6 : 0.4
        });
        // Update relationship
        this.updateRelationship(params.otherAgentId, params.wasPositive, memoryId);
        return memoryId;
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// FACTORY & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
// Cache of cognition engines per agent
const engineCache = new Map();
/**
 * Get or create a CognitionEngine for an agent
 */
export function getCognitionEngine(agentId, agentName) {
    if (!engineCache.has(agentId)) {
        // Get agent name if not provided
        if (!agentName) {
            const agent = db.prepare(`SELECT name FROM agents WHERE id = ?`).get(agentId);
            agentName = agent?.name || 'Unknown';
        }
        engineCache.set(agentId, new CognitionEngine(agentId, agentName));
    }
    return engineCache.get(agentId);
}
/**
 * Clear the engine cache (useful for testing)
 */
export function clearEngineCache() {
    engineCache.clear();
}
export default CognitionEngine;
//# sourceMappingURL=cognition-engine.js.map