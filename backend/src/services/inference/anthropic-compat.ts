import { InferenceRequest, InferenceResponse, StreamChunk } from './router.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1';

/**
 * Anthropic Claude Backend
 * Converts Ollama-style requests to Anthropic format
 */
export async function anthropicCompat(
  request: InferenceRequest,
  config: any,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  const apiKey = config?.api_key_encrypted || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Set it in your inference config or ANTHROPIC_API_KEY env var.');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  };
  
  if (request.type === 'embed') {
    throw new Error('Anthropic does not support embeddings. Use OpenAI or Ollama for embeddings.');
  }
  
  return handleChat(request, headers, streamCallback);
}

async function handleChat(
  request: InferenceRequest,
  headers: Record<string, string>,
  streamCallback?: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  // Convert Ollama format to Anthropic format
  let messages = request.messages || [];
  let systemPrompt: string | undefined;
  
  // Extract system message if present
  if (messages.length > 0 && messages[0].role === 'system') {
    systemPrompt = messages[0].content;
    messages = messages.slice(1);
  }
  
  // If this is a generate request, convert to chat format
  if (request.type === 'generate' && request.prompt) {
    messages = [{ role: 'user', content: request.prompt }];
  }
  
  // Anthropic requires alternating user/assistant messages
  const anthropicMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));
  
  const body: any = {
    model: mapModel(request.model),
    messages: anthropicMessages,
    max_tokens: request.options.max_tokens || 2048,
    stream: Boolean(streamCallback)
  };
  
  if (systemPrompt) {
    body.system = systemPrompt;
  }
  
  if (request.options.temperature !== undefined) {
    body.temperature = request.options.temperature;
  }
  
  if (request.options.top_p !== undefined) {
    body.top_p = request.options.top_p;
  }
  
  if (request.options.stop) {
    body.stop_sequences = request.options.stop;
  }
  
  const response = await fetch(`${ANTHROPIC_URL}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic error: ${error}`);
  }
  
  if (streamCallback && response.body) {
    return handleStream(response.body, request.model, streamCallback);
  }
  
  const data = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  
  // Extract text from content blocks
  const content = data.content
    ?.filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('') || '';
  
  return {
    content,
    prompt_tokens: data.usage?.input_tokens,
    completion_tokens: data.usage?.output_tokens,
    model: request.model
  };
}

async function handleStream(
  body: ReadableStream<Uint8Array>,
  model: string,
  callback: (chunk: StreamChunk) => void
): Promise<InferenceResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let promptTokens = 0;
  let completionTokens = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          continue; // Skip event type lines
        }
        
        if (!line.startsWith('data: ')) {
          continue;
        }
        
        const data = line.slice(6);
        
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.type === 'content_block_delta') {
            const content = parsed.delta?.text || '';
            fullContent += content;
            
            callback({
              model,
              created_at: new Date().toISOString(),
              message: { role: 'assistant', content },
              done: false
            });
          }
          
          if (parsed.type === 'message_delta') {
            completionTokens = parsed.usage?.output_tokens || 0;
          }
          
          if (parsed.type === 'message_start') {
            promptTokens = parsed.message?.usage?.input_tokens || 0;
          }
          
          if (parsed.type === 'message_stop') {
            callback({
              model,
              created_at: new Date().toISOString(),
              message: { role: 'assistant', content: '' },
              done: true
            });
          }
        } catch (e) {
          // Skip invalid JSON
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
    model
  };
}

// Map Ollama model names to Anthropic model names
function mapModel(model: string): string {
  const modelMap: Record<string, string> = {
    'llama3.2': 'claude-3-5-haiku-latest',
    'llama3.1': 'claude-3-5-sonnet-latest',
    'llama3': 'claude-3-5-haiku-latest',
    'mistral': 'claude-3-5-haiku-latest',
    'codellama': 'claude-3-5-sonnet-latest',
    'mixtral': 'claude-3-5-sonnet-latest',
    'claude-3-opus': 'claude-3-opus-latest',
    'claude-3-sonnet': 'claude-3-5-sonnet-latest',
    'claude-3-haiku': 'claude-3-5-haiku-latest'
  };
  
  return modelMap[model] || model;
}
