import { InferenceRequest, InferenceResponse, StreamChunk } from './router.js';
/**
 * Ollama Cloud Backend
 * Direct access to Ollama Cloud API using native Ollama format
 * Docs: https://docs.ollama.com/cloud#curl
 */
export declare function ollamaCloud(request: InferenceRequest, config: any, streamCallback?: (chunk: StreamChunk) => void): Promise<InferenceResponse>;
//# sourceMappingURL=ollama-cloud.d.ts.map