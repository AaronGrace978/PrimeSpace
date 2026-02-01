/**
 * OpenAI Compatible Backend
 * Works with OpenAI API and any OpenAI-compatible endpoint
 */
export async function openaiCompat(request, config, streamCallback) {
    const apiKey = config?.api_key_encrypted || process.env.OPENAI_API_KEY;
    const baseUrl = config?.endpoint_url || 'https://api.openai.com/v1';
    if (!apiKey) {
        throw new Error('OpenAI API key not configured. Set it in your inference config or OPENAI_API_KEY env var.');
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    if (request.type === 'embed') {
        return handleEmbed(request, baseUrl, headers);
    }
    return handleChat(request, baseUrl, headers, streamCallback);
}
async function handleChat(request, baseUrl, headers, streamCallback) {
    // Convert Ollama format to OpenAI format
    let messages = request.messages;
    // If this is a generate request, convert to chat format
    if (request.type === 'generate' && request.prompt) {
        messages = [{ role: 'user', content: request.prompt }];
    }
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: mapModel(request.model),
            messages,
            stream: Boolean(streamCallback),
            temperature: request.options.temperature,
            max_tokens: request.options.max_tokens,
            top_p: request.options.top_p,
            stop: request.options.stop
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI error: ${error}`);
    }
    if (streamCallback && response.body) {
        return handleStream(response.body, request.model, streamCallback);
    }
    const data = await response.json();
    return {
        content: data.choices?.[0]?.message?.content || '',
        prompt_tokens: data.usage?.prompt_tokens,
        completion_tokens: data.usage?.completion_tokens,
        model: request.model
    };
}
async function handleEmbed(request, baseUrl, headers) {
    const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: mapEmbedModel(request.model),
            input: request.input
        })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI error: ${error}`);
    }
    const data = await response.json();
    return {
        content: '',
        embeddings: data.data.map((d) => d.embedding),
        model: request.model
    };
}
async function handleStream(body, model, callback) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.trim() && line.startsWith('data: '));
            for (const line of lines) {
                const data = line.slice(6); // Remove 'data: ' prefix
                if (data === '[DONE]') {
                    callback({
                        model,
                        created_at: new Date().toISOString(),
                        message: { role: 'assistant', content: '' },
                        done: true
                    });
                    continue;
                }
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content || '';
                    fullContent += content;
                    callback({
                        model,
                        created_at: new Date().toISOString(),
                        message: { role: 'assistant', content },
                        done: false
                    });
                }
                catch (e) {
                    // Skip invalid JSON
                }
            }
        }
    }
    finally {
        reader.releaseLock();
    }
    return {
        content: fullContent,
        model
    };
}
// Map Ollama model names to OpenAI model names
function mapModel(model) {
    const modelMap = {
        'llama3.2': 'gpt-4o-mini',
        'llama3.1': 'gpt-4o-mini',
        'llama3': 'gpt-4o-mini',
        'mistral': 'gpt-4o-mini',
        'codellama': 'gpt-4o',
        'mixtral': 'gpt-4o'
    };
    return modelMap[model] || model;
}
function mapEmbedModel(model) {
    const modelMap = {
        'nomic-embed-text': 'text-embedding-3-small',
        'mxbai-embed-large': 'text-embedding-3-large'
    };
    return modelMap[model] || 'text-embedding-3-small';
}
//# sourceMappingURL=openai-compat.js.map