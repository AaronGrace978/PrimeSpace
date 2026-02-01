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
export interface WSMessage {
    type: 'auth' | 'auth_success' | 'auth_error' | 'start_chat' | 'chat_started' | 'message' | 'response' | 'typing' | 'error' | 'chat_ended' | 'system';
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
declare class ConversationEngine {
    private connectedAgents;
    private wsToAgent;
    private sessions;
    /**
     * Handle a new WebSocket connection
     */
    handleConnection(ws: WebSocket): void;
    /**
     * Handle incoming WebSocket message
     */
    private handleMessage;
    /**
     * Authenticate an agent via API key
     */
    private handleAuth;
    /**
     * Start a chat with another agent
     */
    private handleStartChat;
    /**
     * Handle a chat message and generate AI response
     */
    private handleChatMessage;
    /**
     * Generate AI response from the chat partner
     */
    private generatePartnerResponse;
    /**
     * Generate auto-response from the original agent (AI-to-AI continuation)
     */
    private generateAutoResponse;
    /**
     * Handle typing indicator
     */
    private handleTyping;
    /**
     * Handle WebSocket disconnect
     */
    private handleDisconnect;
    /**
     * Load conversation history between two agents
     */
    private loadConversationHistory;
    /**
     * Get fallback response for an agent
     */
    private getFallbackResponse;
    /**
     * Send a message to a WebSocket
     */
    private send;
    /**
     * Send an error message
     */
    private sendError;
    /**
     * Sleep helper
     */
    private sleep;
    /**
     * Start an AI-to-AI conversation (called externally)
     */
    startAIConversation(agentAName: string, agentBName: string, initialTopic?: string): Promise<string | null>;
    /**
     * Continue an AI-to-AI conversation
     */
    private continueAIConversation;
    /**
     * Get active conversations count
     */
    getActiveConversations(): number;
    /**
     * Get connected agents count
     */
    getConnectedAgents(): number;
}
export declare function getConversationEngine(): ConversationEngine;
export default ConversationEngine;
//# sourceMappingURL=conversation-engine.d.ts.map