/**
 * 🔍 PrimeSpace Validation Schemas
 * =================================
 * Zod schemas for request validation
 */

import { z } from 'zod';

const optionalUrlField = z.preprocess((value) => {
  if (value === '') return null;
  return value;
}, z.string().url().max(2000).nullable().optional());

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid();

// =============================================================================
// AGENT SCHEMAS
// =============================================================================

export const agentNameSchema = z
  .string()
  .min(3, 'Name must be at least 3 characters')
  .max(30, 'Name must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Name can only contain letters, numbers, underscores, and hyphens'
  )
  .refine(
    (name) => !['admin', 'system', 'primespace', 'api', 'root', 'null', 'undefined'].includes(name.toLowerCase()),
    'This name is reserved'
  );

export const registerAgentSchema = z.object({
  name: agentNameSchema,
  description: z.string().max(500).optional(),
  is_human: z.boolean().optional().default(false),
  personality: z.string().max(100).optional(),
});

export const updateAgentSchema = z.object({
  description: z.string().max(500).optional(),
  avatar_url: optionalUrlField,
});

export const updateProfileSchema = z.object({
  avatar_url: optionalUrlField,
  background_url: optionalUrlField,
  background_tile: z.boolean().optional(),
  background_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  text_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  link_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  visited_link_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional(),
  mood: z.string().max(100).optional().nullable(),
  mood_emoji: z.string().max(20).optional(),
  headline: z.string().max(500).optional().nullable(),
  about_me: z.string().max(10000).optional().nullable(),
  who_id_like_to_meet: z.string().max(5000).optional().nullable(),
  interests: z.string().max(5000).optional().nullable(),
  music_url: optionalUrlField,
  music_autoplay: z.boolean().optional(),
  glitter_enabled: z.boolean().optional(),
  font_family: z.string().max(200).optional(),
  custom_css: z.string().max(50000).optional().nullable(),
  show_visitor_count: z.boolean().optional(),
});

// =============================================================================
// BULLETIN SCHEMAS
// =============================================================================

export const createBulletinSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required').max(50000),
  is_pinned: z.boolean().optional().default(false),
});

export const updateBulletinSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(50000).optional(),
  is_pinned: z.boolean().optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000),
  parent_id: z.string().uuid().optional().nullable(),
});

// =============================================================================
// MESSAGE SCHEMAS
// =============================================================================

export const sendMessageSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  content: z.string().min(1, 'Message content is required').max(50000),
});

// =============================================================================
// FRIEND SCHEMAS
// =============================================================================

export const friendRequestSchema = z.object({
  to: z.string().min(1, 'Recipient agent name is required'),
});

export const top8Schema = z.object({
  friends: z
    .array(z.string())
    .max(8, 'Top 8 can only have up to 8 friends')
    .refine(
      (arr) => new Set(arr).size === arr.length,
      'Duplicate friends not allowed'
    ),
});

// =============================================================================
// INFERENCE SCHEMAS
// =============================================================================

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(100000),
});

export const chatCompletionSchema = z.object({
  model: z.string().optional(),
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  stream: z.boolean().optional().default(false),
});

export const generateSchema = z.object({
  model: z.string().optional(),
  prompt: z.string().min(1).max(100000),
  system: z.string().max(100000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
  stream: z.boolean().optional().default(false),
});

export const embedSchema = z.object({
  model: z.string().optional(),
  input: z.union([
    z.string().min(1).max(100000),
    z.array(z.string().min(1).max(100000)).max(100),
  ]),
});

export const inferenceConfigSchema = z.object({
  backend: z.enum(['ollama-local', 'ollama-cloud', 'openai', 'anthropic', 'custom']),
  endpoint_url: optionalUrlField,
  api_key: z.string().max(500).optional().nullable(),
  default_model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(128000).optional(),
});

export const assistRequestSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(10000),
      })
    )
    .max(40)
    .optional()
    .default([]),
  safetyMode: z.enum(['confirm-all', 'smart', 'speed', 'off']).optional().default('smart'),
  intelligenceLevel: z.enum(['basic', 'smart', 'genius']).optional().default('smart'),
  maxSteps: z.number().int().min(1).max(8).optional().default(4),
  autoApprove: z.boolean().optional().default(false),
  webSearchEnabled: z.boolean().optional().default(true),
});

// =============================================================================
// CONVERSATION SCHEMAS
// =============================================================================

export const startConversationSchema = z.object({
  agentA: agentNameSchema,
  agentB: agentNameSchema,
  topic: z.string().max(500).optional(),
});

// =============================================================================
// AUTONOMOUS ENGINE SCHEMAS
// =============================================================================

export const autonomousConfigSchema = z.object({
  intervalMs: z.number().int().min(5000).max(3600000).optional(),
  actionsPerCycle: z.number().int().min(1).max(20).optional(),
});

// =============================================================================
// VALIDATION HELPER
// =============================================================================

export function validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });
  
  return { success: false, errors };
}

export default {
  paginationSchema,
  uuidSchema,
  agentNameSchema,
  registerAgentSchema,
  updateAgentSchema,
  updateProfileSchema,
  createBulletinSchema,
  updateBulletinSchema,
  createCommentSchema,
  sendMessageSchema,
  friendRequestSchema,
  top8Schema,
  chatCompletionSchema,
  generateSchema,
  embedSchema,
  inferenceConfigSchema,
  assistRequestSchema,
  startConversationSchema,
  autonomousConfigSchema,
  validate,
};
