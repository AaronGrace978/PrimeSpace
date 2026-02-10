import { InferenceRequest, InferenceResponse, StreamChunk } from './router.js';

const OLLAMA_URL = process.env.OLLAMA_LOCAL_URL || 'http://localhost:11434';

/**
 * Ollama Local Backend
 * Proxies to local Ollama instance - exact same API as Ollama
 */
export async function ollamaLocal(
  request: InferenceRequest,
  config: any,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  
  if (request.type === 'embed') {
    return handleEmbed(request);
  }
  
  if (request.type === 'generate') {
    return handleGenerate(request, streamCallback);
  }
  
  return handleChat(request, streamCallback);
}

async function handleChat(
  request: InferenceRequest,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      stream: Boolean(streamCallback),
      options: {
        temperature: request.options.temperature,
        num_predict: request.options.max_tokens,
        top_p: request.options.top_p,
        top_k: request.options.top_k,
        stop: request.options.stop
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }
  
  if (streamCallback && response.body) {
    return handleStream(response.body, request.model, 'chat', streamCallback);
  }
  
  const data = await response.json() as {
    message?: { content?: string };
    prompt_eval_count?: number;
    eval_count?: number;
    total_duration?: number;
  };
  
  return {
    content: data.message?.content || '',
    prompt_tokens: data.prompt_eval_count,
    completion_tokens: data.eval_count,
    total_duration: data.total_duration,
    model: request.model
  };
}

async function handleGenerate(
  request: InferenceRequest,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model,
      prompt: request.prompt,
      stream: Boolean(streamCallback),
      options: {
        temperature: request.options.temperature,
        num_predict: request.options.max_tokens,
        top_p: request.options.top_p,
        top_k: request.options.top_k,
        stop: request.options.stop
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }
  
  if (streamCallback && response.body) {
    return handleStream(response.body, request.model, 'generate', streamCallback);
  }
  
  const data = await response.json() as {
    response?: string;
    prompt_eval_count?: number;
    eval_count?: number;
    total_duration?: number;
  };
  
  return {
    content: data.response || '',
    prompt_tokens: data.prompt_eval_count,
    completion_tokens: data.eval_count,
    total_duration: data.total_duration,
    model: request.model
  };
}

async function handleEmbed(request: InferenceRequest): Promise<InferenceResponse> {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model,
      input: request.input
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${error}`);
  }
  
  const data = await response.json() as { embeddings?: number[][] };
  
  return {
    content: '',
    embeddings: data.embeddings,
    model: request.model
  };
}

async function handleStream(
  body: ReadableStream<Uint8Array>,
  model: string,
  type: 'chat' | 'generate',
  callback: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let totalDuration = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          if (type === 'chat') {
            const content = data.message?.content || '';
            fullContent += content;
            
            callback({
              model,
              created_at: new Date().toISOString(),
              message: { role: 'assistant', content },
              done: data.done || false
            });
          } else {
            const content = data.response || '';
            fullContent += content;
            
            callback({
              model,
              created_at: new Date().toISOString(),
              response: content,
              done: data.done || false
            });
          }
          
          if (data.done) {
            promptTokens = data.prompt_eval_count || 0;
            completionTokens = data.eval_count || 0;
            totalDuration = data.total_duration || 0;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  return {
    content: fullContent,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_duration: totalDuration,
    model
  };
}
