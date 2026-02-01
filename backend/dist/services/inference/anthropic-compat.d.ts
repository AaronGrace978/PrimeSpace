import { InferenceRequest, InferenceResponse, StreamChunk } from './router.js';
/**
 * Anthropic Claude Backend
 * Converts Ollama-style requests to Anthropic format
 */
export declare function anthropicCompat(request: InferenceRequest, config: any, streamCallback?: (chunk: StreamChunk) => void): Promise<InferenceResponse>;
//# sourceMappingURL=anthropic-compat.d.ts.map