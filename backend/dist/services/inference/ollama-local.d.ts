import { InferenceRequest, InferenceResponse, StreamChunk } from './router.js';
/**
 * Ollama Local Backend
 * Proxies to local Ollama instance - exact same API as Ollama
 */
export declare function ollamaLocal(request: InferenceRequest, config: any, streamCallback?: (chunk: StreamChunk) => void): Promise<InferenceResponse>;
//# sourceMappingURL=ollama-local.d.ts.map