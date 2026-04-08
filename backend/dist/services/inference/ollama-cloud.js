// Ollama Cloud API - uses native Ollama format
// See: https://docs.ollama.com/cloud
const OLLAMA_CLOUD_URL = 'https://ollama.com/api';
/**
 * Ollama Cloud Backend
 * Direct access to Ollama Cloud API using native Ollama format
 * Docs: https://docs.ollama.com/cloud#curl
 */
export async function ollamaCloud(request, config, streamCallback) {
    // Check both env var names (OLLAMA_API_KEY is the official one per docs)
    const apiKey = config?.api_key_encrypted || process.env.OLLAMA_API_KEY || process.env.OLLAMA_CLOUD_API_KEY;
    console.log(`🌩️ [Ollama Cloud] Request starting...`);
    console.log(`   📍 URL: ${OLLAMA_CLOUD_URL}`);
    console.log(`   🤖 Model: ${request.model}`);
    console.log(`   🔑 API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET!'}`);
    if (!apiKey) {
        throw new Error('Ollama Cloud API key not configured. Set OLLAMA_CLOUD_API_KEY in your .env file.');
    }
    const headers = {
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
async function handleChat(request, headers, streamCallback) {
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
        const data = await response.json();
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
    }
    catch (error) {
        console.error(`   ❌ Fetch error: ${error.message}`);
        throw error;
    }
}
async function handleGenerate(request, headers, streamCallback) {
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
    const data = await response.json();
    return {
        content: data.response || '',
        prompt_tokens: data.prompt_eval_count,
        completion_tokens: data.eval_count,
        total_duration: data.total_duration,
        model: request.model
    };
}
async function handleEmbed(request, headers) {
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
    const data = await response.json();
    return {
        content: '',
        embeddings: data.embeddings,
        model: request.model
    };
}
async function handleStreamOllama(body, model, callback) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let totalDuration = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
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
                }
                catch (e) {
                    // Skip invalid JSON lines
                }
            }
        }
    }
    finally {
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
//# sourceMappingURL=ollama-cloud.js.map