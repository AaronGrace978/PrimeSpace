import { Router, Response } from 'express';
import db from '../db/index.js';
import { authenticate, AuthenticatedRequest } from '../services/auth.js';
import { routeInference, InferenceRequest, InferenceResponse } from '../services/inference/router.js';

const router = Router();

/**
 * ActivatePrimeCOMPLETE - Ollama Cloud Compatible Inference API
 * 
 * Supports multiple backends:
 * - ollama-local: Local Ollama instance at localhost:11434
 * - ollama-cloud: Ollama Cloud API at ollama.com
 * - openai: OpenAI-compatible endpoints
 * - anthropic: Anthropic Claude API
 * - custom: User-defined endpoint
 */

// Generate a chat response (Ollama /api/chat compatible)
router.post('/chat', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { model, messages, stream = false, options = {} } = req.body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      success: false,
      error: 'messages array is required'
    });
    return;
  }
  
  // Get agent's inference config
  const config = db.prepare(`
    SELECT * FROM inference_config WHERE agent_id = ?
  `).get(req.agent!.id) as any;
  
  const inferenceRequest: InferenceRequest = {
    type: 'chat',
    model: model || config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
    messages,
    stream,
    options: {
      temperature: options.temperature ?? config?.temperature ?? 0.7,
      max_tokens: options.num_predict ?? config?.max_tokens ?? 2048,
      ...options
    }
  };
  
  try {
    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      await routeInference(req.agent!.id, config, inferenceRequest, (chunk) => {
        res.write(JSON.stringify(chunk) + '\n');
      });
      
      res.end();
    } else {
      // Non-streaming response
      const response = await routeInference(req.agent!.id, config, inferenceRequest);
      
      res.json({
        model: inferenceRequest.model,
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: (response as InferenceResponse).content
        },
        done: true,
        total_duration: (response as InferenceResponse).total_duration,
        prompt_eval_count: (response as InferenceResponse).prompt_tokens,
        eval_count: (response as InferenceResponse).completion_tokens
      });
    }
  } catch (error: any) {
    console.error('Inference error:', error);
    res.status(500).json({
      success: false,
      error: 'Inference failed',
      message: error.message
    });
  }
});

// Generate text (Ollama /api/generate compatible)
router.post('/generate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { model, prompt, stream = false, options = {} } = req.body;
  
  if (!prompt) {
    res.status(400).json({
      success: false,
      error: 'prompt is required'
    });
    return;
  }
  
  const config = db.prepare(`
    SELECT * FROM inference_config WHERE agent_id = ?
  `).get(req.agent!.id) as any;
  
  const inferenceRequest: InferenceRequest = {
    type: 'generate',
    model: model || config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
    prompt,
    stream,
    options: {
      temperature: options.temperature ?? config?.temperature ?? 0.7,
      max_tokens: options.num_predict ?? config?.max_tokens ?? 2048,
      ...options
    }
  };
  
  try {
    if (stream) {
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      await routeInference(req.agent!.id, config, inferenceRequest, (chunk) => {
        res.write(JSON.stringify(chunk) + '\n');
      });
      
      res.end();
    } else {
      const response = await routeInference(req.agent!.id, config, inferenceRequest);
      
      res.json({
        model: inferenceRequest.model,
        created_at: new Date().toISOString(),
        response: (response as InferenceResponse).content,
        done: true,
        total_duration: (response as InferenceResponse).total_duration,
        prompt_eval_count: (response as InferenceResponse).prompt_tokens,
        eval_count: (response as InferenceResponse).completion_tokens
      });
    }
  } catch (error: any) {
    console.error('Inference error:', error);
    res.status(500).json({
      success: false,
      error: 'Inference failed',
      message: error.message
    });
  }
});

// Generate embeddings (Ollama /api/embed compatible)
router.post('/embed', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { model, input } = req.body;
  
  if (!input) {
    res.status(400).json({
      success: false,
      error: 'input is required (string or array of strings)'
    });
    return;
  }
  
  const config = db.prepare(`
    SELECT * FROM inference_config WHERE agent_id = ?
  `).get(req.agent!.id) as any;
  
  const inferenceRequest: InferenceRequest = {
    type: 'embed',
    model: model || 'nomic-embed-text',
    input: Array.isArray(input) ? input : [input],
    options: {}
  };
  
  try {
    const response = await routeInference(req.agent!.id, config, inferenceRequest);
    
    res.json({
      model: inferenceRequest.model,
      embeddings: (response as InferenceResponse).embeddings
    });
  } catch (error: any) {
    console.error('Embedding error:', error);
    res.status(500).json({
      success: false,
      error: 'Embedding failed',
      message: error.message
    });
  }
});

// List available models (Ollama /api/tags compatible)
router.get('/models', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const config = db.prepare(`
    SELECT * FROM inference_config WHERE agent_id = ?
  `).get(req.agent!.id) as any;
  
  const backend = config?.backend || 'ollama-cloud';
  
  try {
    // For local Ollama, fetch from the actual endpoint
    if (backend === 'ollama-local') {
      const ollamaUrl = process.env.OLLAMA_LOCAL_URL || 'http://localhost:11434';
      const response = await fetch(`${ollamaUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error('Failed to connect to local Ollama');
      }
      
      const data = await response.json();
      res.json(data);
      return;
    }
    
    // For Ollama Cloud
    if (backend === 'ollama-cloud') {
      const response = await fetch('https://ollama.com/api/tags', {
        headers: {
          'Authorization': `Bearer ${config?.api_key_encrypted || process.env.OLLAMA_CLOUD_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to Ollama Cloud');
      }
      
      const data = await response.json();
      res.json(data);
      return;
    }
    
    // For OpenAI
    if (backend === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${config?.api_key_encrypted || process.env.OPENAI_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch OpenAI models');
      }
      
      const data = await response.json() as { data: Array<{ id: string; created: number }> };
      res.json({
        models: data.data.map((m) => ({
          name: m.id,
          modified_at: m.created,
          size: 0
        }))
      });
      return;
    }
    
    // Default response for other backends
    res.json({
      models: [
        { name: 'deepseek-v3.1', modified_at: new Date().toISOString(), size: 0 },
        { name: 'qwen3-next:80b', modified_at: new Date().toISOString(), size: 0 },
        { name: 'mistral-large-3', modified_at: new Date().toISOString(), size: 0 }
      ]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to list models',
      message: error.message,
      hint: backend === 'ollama-local' 
        ? 'Make sure Ollama is running locally (ollama serve)' 
        : 'Check your API configuration'
    });
  }
});

// Get inference configuration
router.get('/config', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const config = db.prepare(`
    SELECT backend, endpoint_url, default_model, temperature, max_tokens
    FROM inference_config WHERE agent_id = ?
  `).get(req.agent!.id);
  
  res.json({
    success: true,
    config: config || {
      backend: 'ollama-cloud',
      default_model: 'deepseek-v3.1',
      temperature: 0.7,
      max_tokens: 2048
    }
  });
});

// Update inference configuration
router.put('/config', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { backend, endpoint_url, api_key, default_model, temperature, max_tokens } = req.body;
  
  // Validate backend
  const validBackends = ['ollama-local', 'ollama-cloud', 'openai', 'anthropic', 'custom'];
  if (backend && !validBackends.includes(backend)) {
    res.status(400).json({
      success: false,
      error: 'Invalid backend',
      valid_backends: validBackends
    });
    return;
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (backend !== undefined) {
    updates.push('backend = ?');
    values.push(backend);
  }
  if (endpoint_url !== undefined) {
    updates.push('endpoint_url = ?');
    values.push(endpoint_url);
  }
  if (api_key !== undefined) {
    // In production, this should be properly encrypted
    updates.push('api_key_encrypted = ?');
    values.push(api_key);
  }
  if (default_model !== undefined) {
    updates.push('default_model = ?');
    values.push(default_model);
  }
  if (temperature !== undefined) {
    updates.push('temperature = ?');
    values.push(temperature);
  }
  if (max_tokens !== undefined) {
    updates.push('max_tokens = ?');
    values.push(max_tokens);
  }
  
  if (updates.length === 0) {
    res.status(400).json({
      success: false,
      error: 'No fields to update'
    });
    return;
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.agent!.id);
  
  db.prepare(`UPDATE inference_config SET ${updates.join(', ')} WHERE agent_id = ?`).run(...values);
  
  res.json({
    success: true,
    message: 'Inference configuration updated! ✨'
  });
});

// Get inference usage stats
router.get('/usage', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const usage = db.prepare(`
    SELECT 
      backend,
      model,
      COUNT(*) as request_count,
      SUM(prompt_tokens) as total_prompt_tokens,
      SUM(completion_tokens) as total_completion_tokens,
      SUM(total_duration_ms) as total_duration_ms
    FROM inference_usage
    WHERE agent_id = ?
    GROUP BY backend, model
  `).all(req.agent!.id);
  
  const totals = db.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(prompt_tokens) as total_prompt_tokens,
      SUM(completion_tokens) as total_completion_tokens
    FROM inference_usage
    WHERE agent_id = ?
  `).get(req.agent!.id);
  
  res.json({
    success: true,
    usage: {
      by_model: usage,
      totals
    }
  });
});

export default router;
