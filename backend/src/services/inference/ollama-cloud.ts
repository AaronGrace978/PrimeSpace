import { InferenceRequest, InferenceResponse, StreamChunk } from './router.js';

// Ollama Cloud API - uses native Ollama format
// See: https://docs.ollama.com/cloud
const OLLAMA_CLOUD_URL = 'https://ollama.com/api';

/**
 * Ollama Cloud Backend
 * Direct access to Ollama Cloud API using native Ollama format
 * Docs: https://docs.ollama.com/cloud#curl
 */
export async function ollamaCloud(
  request: InferenceRequest,
  config: any,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  const apiKey = config?.api_key_encrypted || process.env.OLLAMA_CLOUD_API_KEY;
  
  console.log(`🌩️ [Ollama Cloud] Request starting...`);
  console.log(`   📍 URL: ${OLLAMA_CLOUD_URL}`);
  console.log(`   🤖 Model: ${request.model}`);
  console.log(`   🔑 API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET!'}`);
  
  if (!apiKey) {
    throw new Error('Ollama Cloud API key not configured. Set OLLAMA_CLOUD_API_KEY in your .env file.');
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  
  if (request.type === 'embed') {
    return handleEmbed(request, headers);
  }
  
  if (request.type === 'generate') {
    return handleGenerate(request, headers, streamCallback);
  }
  
  return handleChat(request, headers, streamCallback);
}

async function handleChat(
  request: InferenceRequest,
  headers: Record<string, string>,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  // Native Ollama chat endpoint
  const url = `${OLLAMA_CLOUD_URL}/chat`;
  console.log(`   📤 POST ${url}`);
  
  // Native Ollama request format
  const body = {
    model: request.model,
    messages: request.messages,
    stream: Boolean(streamCallback),
    options: {
      temperature: request.options?.temperature ?? 0.7,
      num_predict: request.options?.max_tokens ?? 500,
      top_p: request.options?.top_p,
      top_k: request.options?.top_k,
      stop: request.options?.stop
    }
  };
  
  console.log(`   📦 Request body:`, JSON.stringify({ ...body, messages: `[${body.messages?.length} messages]` }));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    console.log(`   📥 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`   ❌ Ollama Cloud error: ${error}`);
      throw new Error(`Ollama Cloud error (${response.status}): ${error}`);
    }
    
    if (streamCallback && response.body) {
      return handleStreamOllama(response.body, request.model, streamCallback);
    }
    
    const data = await response.json() as {
      message?: { content?: string };
      prompt_eval_count?: number;
      eval_count?: number;
      total_duration?: number;
    };
    // Native Ollama format: message.content
    const content = data.message?.content || '';
    
    console.log(`   ✅ Got response: "${content.substring(0, 80)}..."`);
    
    return {
      content,
      prompt_tokens: data.prompt_eval_count,
      completion_tokens: data.eval_count,
      total_duration: data.total_duration,
      model: request.model
    };
  } catch (error) {
    console.error(`   ❌ Fetch error: ${(error as Error).message}`);
    throw error;
  }
}

async function handleGenerate(
  request: InferenceRequest,
  headers: Record<string, string>,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  const url = `${OLLAMA_CLOUD_URL}/generate`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: request.model,
      prompt: request.prompt,
      stream: Boolean(streamCallback),
      options: {
        temperature: request.options?.temperature,
        num_predict: request.options?.max_tokens,
        top_p: request.options?.top_p,
        top_k: request.options?.top_k,
        stop: request.options?.stop
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama Cloud error: ${error}`);
  }
  
  if (streamCallback && response.body) {
    return handleStreamOllama(response.body, request.model, streamCallback);
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

async function handleEmbed(
  request: InferenceRequest,
  headers: Record<string, string>
): Promise<InferenceResponse> {
  // Native Ollama embed endpoint
  const url = `${OLLAMA_CLOUD_URL}/embed`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: request.model,
      input: request.input
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama Cloud error: ${error}`);
  }
  
  const data = await response.json() as { embeddings?: number[][] };
  
  return {
    content: '',
    embeddings: data.embeddings,
    model: request.model
  };
}

async function handleStreamOllama(
  body: ReadableStream<Uint8Array>,
  model: string,
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
      // Ollama streams JSON objects line by line
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          // Handle chat format (message.content) or generate format (response)
          const content = data.message?.content || data.response || '';
          fullContent += content;
          
          callback({
            model,
            created_at: new Date().toISOString(),
            message: { role: 'assistant', content },
            done: data.done || false
          });
          
          // Capture final stats
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
