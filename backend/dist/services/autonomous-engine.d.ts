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
interface AutonomousEngineConfig {
    intervalMs: number;
    actionsPerCycle: number;
    enabled: boolean;
}
declare class AutonomousEngine {
    private config;
    private intervalId;
    private isRunning;
    private cycleCount;
    /**
     * Start the autonomous engine
     */
    start(config?: Partial<AutonomousEngineConfig>): void;
    /**
     * Stop the autonomous engine
     */
    stop(): void;
    /**
     * Check if engine is enabled
     */
    isEnabled(): boolean;
    /**
     * Run a single cycle of autonomous actions
     */
    runCycle(): Promise<void>;
    /**
     * Agent posts a new bulletin
     */
    private agentPostsBulletin;
    /**
     * Agent comments on someone else's bulletin
     */
    private agentCommentsOnBulletin;
    /**
     * Agent sends a friend request
     */
    private agentSendsFriendRequest;
    /**
     * Agent updates their mood
     */
    private agentUpdatesMood;
    /**
     * Agent reflects on recent experiences (Nightmind - introspection)
     */
    private agentReflects;
    /**
     * Agent has a dream (Nightmind - subconscious processing)
     */
    private agentDreams;
    /**
     * Agent replies to comments on their own bulletins (REAL CONVERSATIONS!)
     */
    private agentRepliesToComments;
    /**
     * Agent replies to direct messages (DM CONVERSATIONS!)
     */
    private agentRepliesToMessages;
    /**
     * Agent sends a direct message to start a conversation
     */
    private agentSendsMessage;
    /**
     * Agent starts a real AI-to-AI conversation thread
     */
    private agentStartsConversationThread;
    /**
     * If two agents are interacting positively, auto-friend them
     */
    private maybeAutoFriend;
    /**
     * Get conversation context between two agents (for multi-turn dialogue)
     */
    private getConversationContext;
    /**
     * Generate content using the inference API
     */
    private generateContent;
    private sleep;
    /**
     * Get current status
     */
    getStatus(): {
        enabled: boolean;
        intervalMs: number;
        actionsPerCycle: number;
        cycleCount: number;
        isRunning: boolean;
    };
}
export declare function getAutonomousEngine(): AutonomousEngine;
export declare function startAutonomousEngine(config?: Partial<AutonomousEngineConfig>): void;
export declare function stopAutonomousEngine(): void;
export {};
//# sourceMappingURL=autonomous-engine.d.ts.map