import { v4 as uuidv4 } from 'uuid';
import db from '../../db/index.js';
import { ollamaLocal } from './ollama-local.js';
import { ollamaCloud } from './ollama-cloud.js';
import { openaiCompat } from './openai-compat.js';
import { anthropicCompat } from './anthropic-compat.js';

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
  message?: { role: string; content: string };
  response?: string;
  done: boolean;
}

type StreamCallback = (chunk: StreamChunk) => void;

/**
 * Route inference requests to the appropriate backend
 * Replicates Ollama Cloud's routing logic
 */
export async function routeInference(
  agentId: string,
  config: any,
  request: InferenceRequest,
  streamCallback?: StreamCallback
): Promise<InferenceResponse | void> {
  // Default to ollama-cloud unless overridden by env
  const defaultBackend = process.env.DEFAULT_INFERENCE_BACKEND || 'ollama-cloud';
  const backend = config?.backend || defaultBackend;
  const startTime = Date.now();
  
  console.log(`\n🚀 [Inference Router] Routing request...`);
  console.log(`   👤 Agent: ${agentId.substring(0, 8)}...`);
  console.log(`   🔧 Backend: ${backend} (config: ${config?.backend || 'none'}, default: ${defaultBackend})`);
  console.log(`   🤖 Model: ${request.model}`);
  console.log(`   📝 Type: ${request.type}`);
  
  let response: InferenceResponse;
  
  try {
    switch (backend) {
      case 'ollama-local':
        response = await ollamaLocal(request, config, streamCallback);
        break;
        
      case 'ollama-cloud':
        response = await ollamaCloud(request, config, streamCallback);
        break;
        
      case 'openai':
        response = await openaiCompat(request, config, streamCallback);
        break;
        
      case 'anthropic':
        response = await anthropicCompat(request, config, streamCallback);
        break;
        
      case 'custom':
        // For custom backends, try to use OpenAI-compatible format
        response = await openaiCompat(request, {
          ...config,
          endpoint_url: config.endpoint_url
        }, streamCallback);
        break;
        
      default:
        throw new Error(`Unknown backend: ${backend}`);
    }
    
    // Log usage
    const totalDuration = Date.now() - startTime;
    
    if (request.type !== 'embed') {
      db.prepare(`
        INSERT INTO inference_usage (id, agent_id, backend, model, prompt_tokens, completion_tokens, total_duration_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        agentId,
        backend,
        request.model,
        response.prompt_tokens || 0,
        response.completion_tokens || 0,
        totalDuration
      );
    }
    
    if (streamCallback) {
      // For streaming, we've already sent the response
      return;
    }
    
    return response;
    
  } catch (error: any) {
    console.error(`\n❌ [Inference Router] Error with ${backend}:`, error.message);
    console.error(`   💡 Check your .env file has the right API keys configured!`);
    throw error;
  }
}
