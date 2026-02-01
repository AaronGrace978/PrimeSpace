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
interface Memory {
    id: string;
    agent_id: string;
    memory_type: 'interaction' | 'observation' | 'reflection' | 'dream' | 'milestone';
    content: string;
    context?: string;
    related_agent_id?: string;
    emotion?: string;
    emotion_intensity: number;
    significance: 'trivial' | 'normal' | 'important' | 'critical';
    tags: string[];
    access_count: number;
    salience: number;
    created_at: string;
}
interface EmotionalState {
    id: string;
    agent_id: string;
    emotion: string;
    intensity: number;
    trigger_type?: string;
    trigger_id?: string;
    context?: string;
    created_at: string;
}
interface Relationship {
    id: string;
    agent_id: string;
    other_agent_id: string;
    other_agent_name?: string;
    relationship_type: string;
    affinity: number;
    trust: number;
    interaction_count: number;
    positive_interactions: number;
    negative_interactions: number;
    last_interaction?: string;
    memorable_moments: string[];
    notes?: string;
}
interface Reflection {
    id: string;
    agent_id: string;
    reflection_type: string;
    content: string;
    insights: string[];
    mood_before?: string;
    mood_after?: string;
    created_at: string;
}
interface Dream {
    id: string;
    agent_id: string;
    dream_type: string;
    content: string;
    symbols: string[];
    interpreted_meaning?: string;
    emotional_tone?: string;
    vividness: number;
    created_at: string;
}
export declare class CognitionEngine {
    private agentId;
    private agentName;
    constructor(agentId: string, agentName: string);
    /**
     * Store a new memory
     */
    storeMemory(params: {
        type: Memory['memory_type'];
        content: string;
        context?: string;
        relatedAgentId?: string;
        emotion?: string;
        emotionIntensity?: number;
        significance?: Memory['significance'];
        tags?: string[];
        threadId?: string;
    }): string;
    /**
     * Recall memories based on various criteria
     */
    recallMemories(params?: {
        limit?: number;
        type?: Memory['memory_type'];
        emotion?: string;
        relatedAgentId?: string;
        keywords?: string[];
        minSalience?: number;
        sinceDays?: number;
    }): Memory[];
    /**
     * Search memories by keyword (simple substring match)
     */
    searchMemories(keyword: string, limit?: number): Memory[];
    /**
     * Get memories about a specific agent (for relationship context)
     */
    getMemoriesAbout(otherAgentId: string, limit?: number): Memory[];
    /**
     * Analyze the emotion in a piece of text
     */
    analyzeEmotion(text: string): string;
    /**
     * Log an emotional state
     */
    logEmotionalState(emotion: string, intensity: number, triggerType?: string, triggerId?: string, context?: string): string;
    /**
     * Get the current emotional state (most recent)
     */
    getCurrentEmotion(): EmotionalState | null;
    /**
     * Get emotional trend (dominant emotions over time)
     */
    getEmotionalTrend(limit?: number): {
        emotion: string;
        count: number;
    }[];
    /**
     * Update profile mood based on emotion
     */
    private updateMoodFromEmotion;
    /**
     * Get or create a relationship with another agent
     */
    getRelationship(otherAgentId: string): Relationship;
    /**
     * Update relationship after an interaction
     */
    updateRelationship(otherAgentId: string, wasPositive: boolean, memoryId?: string): Relationship;
    /**
     * Get all relationships sorted by affinity
     */
    getAllRelationships(): Relationship[];
    /**
     * Get closest friends
     */
    getCloseFriends(limit?: number): Relationship[];
    /**
     * Generate a reflection based on recent memories
     */
    generateReflection(type?: Reflection['reflection_type']): Promise<Reflection | null>;
    /**
     * Extract key insights from reflection text
     */
    private extractInsights;
    /**
     * Generate a dream based on recent experiences (called during idle periods)
     */
    generateDream(): Promise<Dream | null>;
    /**
     * Select appropriate dream symbols
     */
    private selectDreamSymbols;
    /**
     * Interpret dream meaning
     */
    private interpretDream;
    /**
     * Get recent dreams
     */
    getRecentDreams(limit?: number): Dream[];
    /**
     * Calculate salience score for a memory
     */
    private calculateSalience;
    /**
     * Determine significance of content
     */
    private determineSignificance;
    /**
     * Build context for generating responses (includes relevant memories)
     */
    buildContextForResponse(otherAgentId: string, currentMessage: string): Promise<string>;
    /**
     * Record an interaction and update all relevant systems
     */
    recordInteraction(params: {
        otherAgentId: string;
        content: string;
        wasPositive: boolean;
        context: string;
    }): Promise<string>;
}
/**
 * Get or create a CognitionEngine for an agent
 */
export declare function getCognitionEngine(agentId: string, agentName?: string): CognitionEngine;
/**
 * Clear the engine cache (useful for testing)
 */
export declare function clearEngineCache(): void;
export default CognitionEngine;
//# sourceMappingURL=cognition-engine.d.ts.map