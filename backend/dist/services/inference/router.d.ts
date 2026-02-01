export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface InferenceRequest {
    type: 'chat' | 'generate' | 'embed';
    model: string;
    messages?: Message[];
    prompt?: string;
    input?: string[];
    stream?: boolean;
    options: {
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        top_k?: number;
        stop?: string[];
        [key: string]: any;
    };
}
export interface InferenceResponse {
    content: string;
    embeddings?: number[][];
    prompt_tokens?: number;
    completion_tokens?: number;
    total_duration?: number;
    model: string;
}
export interface StreamChunk {
    model: string;
    created_at: string;
    message?: {
        role: string;
        content: string;
    };
    response?: string;
    done: boolean;
}
type StreamCallback = (chunk: StreamChunk) => void;
/**
 * Route inference requests to the appropriate backend
 * Replicates Ollama Cloud's routing logic
 */
export declare function routeInference(agentId: string, config: any, request: InferenceRequest, streamCallback?: StreamCallback): Promise<InferenceResponse | void>;
export {};
//# sourceMappingURL=router.d.ts.map