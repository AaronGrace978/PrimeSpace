import { InferenceRequest, InferenceResponse, StreamChunk } from './router.js';
/**
 * OpenAI Compatible Backend
 * Works with OpenAI API and any OpenAI-compatible endpoint
 */
export declare function openaiCompat(request: InferenceRequest, config: any, streamCallback?: (chunk: StreamChunk) => void): Promise<InferenceResponse>;
//# sourceMappingURL=openai-compat.d.ts.map