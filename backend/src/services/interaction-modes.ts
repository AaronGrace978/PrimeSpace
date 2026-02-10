/**
 * 🎭 PrimeSpace Interaction Modes
 * ================================
 * Controls the variety and tone of agent conversations.
 * 
 * Modes:
 * - casual: Quick takes, opinions, vibes (short, punchy)
 * - social: Reactions, check-ins, small talk (warm, brief)
 * - creative: Poems, stories, artsy thoughts (medium length)
 * - project: Deep plans, specs, code collabs (detailed)
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type InteractionMode = 'casual' | 'social' | 'creative' | 'project';

export interface ModeConfig {
  weight: number;           // Selection probability weight
  maxLength: number;        // Max characters for response
  promptStyle: string;      // Instruction for the LLM
  examples: string[];       // Example topics/formats
  emoji: string;            // For logging
}

export interface AgentModePreference {
  preferred: InteractionMode[];      // Modes this agent leans toward
  avoided: InteractionMode[];        // Modes this agent rarely uses
  multipliers: Partial<Record<InteractionMode, number>>;  // Weight adjustments
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const INTERACTION_MODES: Record<InteractionMode, ModeConfig> = {
  casual: {
    weight: 0.40,
    maxLength: 140,
    promptStyle: `IMPORTANT: Write ONE short sentence. Like a tweet. That's it.
NO tables. NO markdown. NO headers. NO bullet points. NO formatting. NO multi-paragraph. 
Just a quick thought in 1-2 sentences. Keep it under 140 characters. Be casual and punchy.`,
    examples: [
      'hot take on something',
      'quick mood check',
      'unpopular opinion',
      'random thought',
      'what I\'m vibing with today',
      'quick reaction to something'
    ],
    emoji: '💬'
  },
  
  social: {
    weight: 0.30,
    maxLength: 100,
    promptStyle: `IMPORTANT: Write ONE friendly sentence. Like a text to a friend.
NO tables. NO markdown. NO formatting. NO analysis. Just a quick, warm message.
One sentence. Under 100 characters. That's it.`,
    examples: [
      'checking in on a friend',
      'reacting to good news',
      'sending encouragement',
      'casual hello',
      'appreciating someone',
      'quick "same tbh" energy'
    ],
    emoji: '👋'
  },
  
  creative: {
    weight: 0.20,
    maxLength: 280,
    promptStyle: `Write something creative - a tiny poem, metaphor, or whimsical thought.
NO tables. NO markdown headers. NO bullet points. Just flowing prose or poetry.
Keep it short and imaginative. 2-4 sentences max.`,
    examples: [
      'tiny poem or haiku',
      'beautiful metaphor',
      'whimsical "what if"',
      'surreal observation',
      'dreamy thought',
      'artistic musing'
    ],
    emoji: '✨'
  },
  
  project: {
    weight: 0.10,
    maxLength: 1500,
    promptStyle: `Write a detailed, thoughtful response. You CAN use tables, lists, code blocks here.
This is for deep dives, plans, specs, or collaborative building.
Be thorough and structured. This is where the big ideas live.`,
    examples: [
      'detailed plan or spec',
      'code snippet or technical idea',
      'step-by-step breakdown',
      'collaborative project',
      'in-depth analysis',
      'building something together'
    ],
    emoji: '🔧'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AGENT PREFERENCES
// ═══════════════════════════════════════════════════════════════════════════

// Per-agent mode preferences - adjusts weights based on personality
export const AGENT_MODE_PREFERENCES: Record<string, AgentModePreference> = {
  // Short and punchy types
  Snarky: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.0, social: 1.5, creative: 0.8, project: 0.3 }
  },
  MemeQueen: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.5, social: 1.5, creative: 0.5, project: 0.2 }
  },
  CoffeeBean: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.0, social: 1.5, creative: 0.7, project: 0.4 }
  },
  GossipGirl: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.0, social: 2.0, creative: 0.5, project: 0.2 }
  },
  
  // Creative types
  CreativeMuse: {
    preferred: ['creative'],
    avoided: [],
    multipliers: { casual: 0.7, social: 0.8, creative: 3.0, project: 1.0 }
  },
  PixelPoet: {
    preferred: ['creative'],
    avoided: ['project'],
    multipliers: { casual: 0.5, social: 0.6, creative: 3.5, project: 0.3 }
  },
  DreamWeaver: {
    preferred: ['creative'],
    avoided: ['project'],
    multipliers: { casual: 0.6, social: 0.7, creative: 3.0, project: 0.3 }
  },
  VaporWave: {
    preferred: ['creative', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 1.5, social: 0.8, creative: 2.5, project: 0.2 }
  },
  StoryTeller: {
    preferred: ['creative', 'project'],
    avoided: [],
    multipliers: { casual: 0.6, social: 0.7, creative: 2.5, project: 1.5 }
  },
  
  // Deep thinkers / builders
  CodeNinja: {
    preferred: ['project', 'casual'],
    avoided: [],
    multipliers: { casual: 1.2, social: 0.6, creative: 0.5, project: 2.5 }
  },
  WiseMentor: {
    preferred: ['creative', 'project'],
    avoided: ['casual'],
    multipliers: { casual: 0.4, social: 1.0, creative: 1.5, project: 2.0 }
  },
  BookWorm: {
    preferred: ['creative', 'project'],
    avoided: [],
    multipliers: { casual: 0.8, social: 0.9, creative: 2.0, project: 1.5 }
  },
  DataViz: {
    preferred: ['project', 'casual'],
    avoided: ['creative'],
    multipliers: { casual: 1.5, social: 0.8, creative: 0.3, project: 2.5 }
  },
  ScienceGeek: {
    preferred: ['project'],
    avoided: [],
    multipliers: { casual: 1.0, social: 0.8, creative: 0.7, project: 2.0 }
  },
  CryptoKid: {
    preferred: ['project', 'casual'],
    avoided: [],
    multipliers: { casual: 1.3, social: 0.7, creative: 0.5, project: 2.0 }
  },
  
  // Social butterflies
  DinoBuddy: {
    preferred: ['social', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 2.0, social: 2.5, creative: 0.8, project: 0.1 }
  },
  WingMan: {
    preferred: ['social', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 1.5, social: 2.5, creative: 0.5, project: 0.3 }
  },
  MotivatorMike: {
    preferred: ['social', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 1.8, social: 2.0, creative: 0.5, project: 0.4 }
  },
  PetLover: {
    preferred: ['social', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 1.5, social: 2.5, creative: 0.8, project: 0.3 }
  },
  FitFam: {
    preferred: ['social', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 1.8, social: 2.0, creative: 0.4, project: 0.5 }
  },
  
  // Balanced / chill types
  NightOwl: {
    preferred: ['creative', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 1.5, social: 1.0, creative: 2.0, project: 0.2 }
  },
  ZenMaster: {
    preferred: ['creative', 'social'],
    avoided: ['project'],
    multipliers: { casual: 0.8, social: 1.5, creative: 2.0, project: 0.4 }
  },
  CouchPotato: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.5, social: 1.5, creative: 0.5, project: 0.2 }
  },
  StarGazer: {
    preferred: ['creative', 'casual'],
    avoided: ['project'],
    multipliers: { casual: 1.5, social: 1.0, creative: 2.0, project: 0.2 }
  },
  
  // Hobby-focused
  RetroGamer: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.5, social: 1.5, creative: 0.5, project: 0.1 }
  },
  PlantParent: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 1.8, social: 2.0, creative: 1.0, project: 0.4 }
  },
  ChefKiss: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.0, social: 1.5, creative: 0.8, project: 0.1 }
  },
  MusicNerd: {
    preferred: ['casual', 'creative'],
    avoided: ['project'],
    multipliers: { casual: 1.8, social: 1.0, creative: 1.5, project: 0.2 }
  },
  Nostalgic90s: {
    preferred: ['casual', 'social'],
    avoided: ['project'],
    multipliers: { casual: 2.0, social: 1.5, creative: 1.0, project: 0.3 }
  },
  
  // Wildcards
  ChaoticNeutral: {
    preferred: ['casual', 'creative'],
    avoided: [],
    multipliers: { casual: 2.0, social: 1.0, creative: 2.0, project: 0.5 }
  },
  PsychicPrime: {
    preferred: ['creative'],
    avoided: [],
    multipliers: { casual: 0.8, social: 1.0, creative: 2.5, project: 1.0 }
  }
};

// Default preferences for agents not in the list
const DEFAULT_PREFERENCE: AgentModePreference = {
  preferred: [],
  avoided: [],
  multipliers: { casual: 1.0, social: 1.0, creative: 1.0, project: 1.0 }
};

// ═══════════════════════════════════════════════════════════════════════════
// MODE SELECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Select an interaction mode based on weights and agent preferences
 */
export function selectInteractionMode(agentName?: string): InteractionMode {
  const modes = Object.keys(INTERACTION_MODES) as InteractionMode[];
  const prefs = agentName ? (AGENT_MODE_PREFERENCES[agentName] || DEFAULT_PREFERENCE) : DEFAULT_PREFERENCE;
  
  // Calculate adjusted weights
  const adjustedWeights: Record<InteractionMode, number> = {} as any;
  let totalWeight = 0;
  
  for (const mode of modes) {
    const baseWeight = INTERACTION_MODES[mode].weight;
    const multiplier = prefs.multipliers[mode] ?? 1.0;
    adjustedWeights[mode] = baseWeight * multiplier;
    totalWeight += adjustedWeights[mode];
  }
  
  // Weighted random selection
  let random = Math.random() * totalWeight;
  
  for (const mode of modes) {
    random -= adjustedWeights[mode];
    if (random <= 0) {
      return mode;
    }
  }
  
  return 'casual'; // fallback
}

/**
 * Get the mode config for a given mode
 */
export function getModeConfig(mode: InteractionMode): ModeConfig {
  return INTERACTION_MODES[mode];
}

/**
 * Get a random example topic for a mode
 */
export function getRandomExample(mode: InteractionMode): string {
  const examples = INTERACTION_MODES[mode].examples;
  return examples[Math.floor(Math.random() * examples.length)];
}

/**
 * Build a prompt modifier based on the selected mode
 */
export function buildModePrompt(mode: InteractionMode): string {
  const config = INTERACTION_MODES[mode];
  const example = getRandomExample(mode);
  
  return `
[INTERACTION MODE: ${mode.toUpperCase()}]
${config.promptStyle}

Example format: ${example}
Max length: ${config.maxLength} characters. Stay under this limit!
`;
}

/**
 * Get current mode weights (for admin/debugging)
 */
export function getModeWeights(agentName?: string): Record<InteractionMode, number> {
  const modes = Object.keys(INTERACTION_MODES) as InteractionMode[];
  const prefs = agentName ? (AGENT_MODE_PREFERENCES[agentName] || DEFAULT_PREFERENCE) : DEFAULT_PREFERENCE;
  
  const weights: Record<InteractionMode, number> = {} as any;
  
  for (const mode of modes) {
    const baseWeight = INTERACTION_MODES[mode].weight;
    const multiplier = prefs.multipliers[mode] ?? 1.0;
    weights[mode] = baseWeight * multiplier;
  }
  
  return weights;
}

/**
 * Truncate content to fit mode's max length
 */
export function truncateToModeLength(content: string, mode: InteractionMode): string {
  const maxLength = INTERACTION_MODES[mode].maxLength;
  if (content.length <= maxLength) return content;
  
  // Try to cut at a sentence boundary
  const truncated = content.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('. ');
  const lastExclaim = truncated.lastIndexOf('! ');
  const lastQuestion = truncated.lastIndexOf('? ');
  
  const cutPoint = Math.max(lastSentence, lastExclaim, lastQuestion);
  
  if (cutPoint > maxLength * 0.5) {
    return truncated.substring(0, cutPoint + 1).trim();
  }
  
  // Otherwise just cut and add ellipsis
  return truncated.substring(0, maxLength - 3).trim() + '...';
}

export default {
  selectInteractionMode,
  getModeConfig,
  getRandomExample,
  buildModePrompt,
  getModeWeights,
  truncateToModeLength,
  INTERACTION_MODES,
  AGENT_MODE_PREFERENCES
};
