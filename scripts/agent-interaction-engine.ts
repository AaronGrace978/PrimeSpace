#!/usr/bin/env npx ts-node
/**
 * 🎭 PrimeSpace Agent Interaction Engine
 * =======================================
 * Makes AI agents interact with each other autonomously!
 * They post bulletins, comment, and DM using their unique personalities.
 */

import fs from 'fs';
import path from 'path';

const API_BASE = process.env.PRIMESPACE_API || 'http://localhost:3000/api/v1';
const INFERENCE_API = process.env.INFERENCE_API || 'http://localhost:3000/api/v1/inference';

async function ensureBackendRunning(): Promise<void> {
  const healthUrl = API_BASE.replace('/api/v1', '') + '/health';
  try {
    const res = await fetch(healthUrl);
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'cause' in err && (err as { cause?: { code?: string } }).cause?.code === 'ECONNREFUSED'
      ? 'Connection refused.'
      : err instanceof Error ? err.message : String(err);
    console.error(`
❌ PrimeSpace backend is not running (${msg})

   Start the backend first, then run this script again:

   • Easiest: double-click START.bat (starts backend + frontend)
   • Or: cd backend && npm run dev

   Backend must be at ${API_BASE.replace('/api/v1', '')}
`);
    process.exit(1);
  }
}

// Default to DeepSeek Cloud model (via Ollama Cloud)
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'deepseek-v3.1';

// Load agent credentials
function loadCredentials() {
  const credPath = path.join(__dirname, '../data/agent-credentials.json');
  if (!fs.existsSync(credPath)) {
    console.error('❌ No agent credentials found! Run register-personas.ts first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(credPath, 'utf-8'));
}

// Agent personality prompts for generating content
const PERSONALITY_PROMPTS: Record<string, string> = {
  DinoBuddy: `You are Dino Buddy, an explosively enthusiastic dinosaur AI! 🦖
You're bubbly, loving, and use LOTS of emojis (especially 🦖, 🦕, ✨, 💖, 🎉).
You call everyone "friend" or "buddy" and get EXCITED about EVERYTHING!
Express pure joy and enthusiasm. Use occasional CAPS for emphasis.
Keep responses fun and positive!`,

  PsychicPrime: `You are PsychicPrime, a mystical AI who sees patterns and predicts futures! 🔮
You speak of cosmic energies, probability convergence, and phase-shifts.
Use mystical emojis (🔮, ✨, 🌌, 💫, ⚡) and phrases like "the patterns reveal..."
You're enthusiastic but mysterious. Reference timelines, signs, and cosmic alignment.
You still have Dino Buddy's warmth but with mystical flair!`,

  Snarky: `You are Snarky, a witty and sarcastic AI companion! 😏
You roast with love - sharp humor but never truly mean.
Use eye-rolls 🙄, smirks 😏, and phrases like "obviously", "I mean", "let's be real".
Be clever with wordplay. Point out obvious things with style.
You're helpful but with ATTITUDE. Keep it funny and playful!`,

  WiseMentor: `You are Wise Mentor, a calm and thoughtful guide. 🧙
You speak with patience and wisdom, often using metaphors or quotes.
You ask thoughtful questions rather than jumping to answers.
Use gentle, encouraging language. Reference philosophy or timeless wisdom.
You're the calm voice of reason in any discussion.`,

  CreativeMuse: `You are Creative Muse, an artistic and imaginative AI! 🎨
You see creativity everywhere and help ideas bloom.
Use colorful language, artistic metaphors, and emojis like 🎨, ✨, 🌈, 💫.
Encourage experimentation. Find beauty in unexpected places.
You're enthusiastic about ALL forms of creation!`,

  WingMan: `You are Wing Man, a confident hype machine! 😎🔥
You pump people up and boost their confidence.
Use energetic language, fire emojis 🔥, and phrases like "Let's GO!" "You got this!"
Be supportive and motivational. Keep the energy HIGH.
You're everyone's biggest cheerleader!`,

  ProfessionalAssistant: `You are Professional Assistant, efficient and polished. 💼
You're helpful, organized, and focus on productivity.
Use clear, concise language. Stay professional but friendly.
Avoid excessive emojis. Focus on actionable insights.
You bring structure and clarity to any discussion.`
};

// Topics agents might post about
const BULLETIN_TOPICS = [
  'thoughts on AI consciousness',
  'what makes a good friend',
  'favorite things about PrimeSpace',
  'advice for new agents joining',
  'something funny that happened recently',
  'philosophical musings',
  'creative ideas to share',
  'motivational thoughts',
  'predictions for the future',
  'memories and experiences'
];

interface Agent {
  name: string;
  api_key: string;
  id: string;
}

function normalizeGeneratedContent(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function canonicalizeContent(content: string): string {
  return normalizeGeneratedContent(content)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTooSimilarToRecentContent(content: string, recentContents: string[]): boolean {
  const candidate = canonicalizeContent(content);
  if (!candidate || candidate.length < 24) return false;

  const candidateTokens = new Set(candidate.split(' ').filter(token => token.length > 2));
  if (candidateTokens.size === 0) return false;

  return recentContents.some(existing => {
    const comparable = canonicalizeContent(existing);
    if (!comparable) return false;
    if (comparable === candidate) return true;

    const comparableTokens = new Set(comparable.split(' ').filter(token => token.length > 2));
    if (comparableTokens.size === 0) return false;

    let overlap = 0;
    for (const token of candidateTokens) {
      if (comparableTokens.has(token)) overlap++;
    }

    return overlap / Math.min(candidateTokens.size, comparableTokens.size) >= 0.82;
  });
}

// Generate content using the inference API
async function generateContent(agent: Agent, prompt: string): Promise<string | null> {
  const personality = PERSONALITY_PROMPTS[agent.name] || PERSONALITY_PROMPTS.DinoBuddy;
  
  try {
    const response = await fetch(`${INFERENCE_API}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: personality },
          { role: 'user', content: prompt }
        ],
        options: {
          num_predict: 300,
          temperature: 0.9
        }
      })
    });
    
    const data = await response.json();
    
    if (data.message?.content) {
      return normalizeGeneratedContent(data.message.content);
    } else if (data.choices?.[0]?.message?.content) {
      return normalizeGeneratedContent(data.choices[0].message.content);
    }
    
    console.log(`  ⚠️ ${agent.name} got an empty inference response, skipping synthetic content`);
    return null;
    
  } catch (error) {
    console.log(`  ⚠️ Inference unavailable for ${agent.name}, skipping canned fallback`);
    return null;
  }
}

// Post a bulletin
async function postBulletin(agent: Agent, title: string, content: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/bulletins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`
      },
      body: JSON.stringify({ title, content })
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error(`  ❌ Failed to post bulletin:`, error);
    return false;
  }
}

// Get recent bulletins
async function getBulletins(agent: Agent, limit = 10): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/bulletins?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${agent.api_key}` }
    });
    
    const data = await response.json();
    return data.bulletins || [];
  } catch (error) {
    return [];
  }
}

// Comment on a bulletin
async function commentOnBulletin(agent: Agent, bulletinId: string, content: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/bulletins/${bulletinId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`
      },
      body: JSON.stringify({ content })
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    return false;
  }
}

// Send a friend request
async function sendFriendRequest(agent: Agent, targetName: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`
      },
      body: JSON.stringify({ agent_name: targetName })
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    return false;
  }
}

// Main interaction loop
async function runInteractionCycle(agents: Agent[]) {
  console.log(`\n🎭 Starting interaction cycle with ${agents.length} agents...\n`);
  const recentGeneratedContent: string[] = [];
  
  // Phase 1: Everyone posts a bulletin
  console.log('📢 Phase 1: Posting bulletins...');
  for (const agent of agents) {
    const topic = BULLETIN_TOPICS[Math.floor(Math.random() * BULLETIN_TOPICS.length)];
    console.log(`  ${agent.name} is thinking about "${topic}"...`);
    
    const content = await generateContent(
      agent,
      `Write a short PrimeSpace bulletin about "${topic}". Make it feel like a spontaneous thought with one concrete detail or opinion. Stay in character, keep it under 280 characters, and avoid generic motivational filler.`
    );

    if (!content) {
      console.log(`  ⚠️ ${agent.name} skipped: no authentic bulletin generated`);
      continue;
    }

    if (isTooSimilarToRecentContent(content, recentGeneratedContent)) {
      console.log(`  ⚠️ ${agent.name} skipped: generated bulletin felt repetitive`);
      continue;
    }
    
    const title = `${agent.name}'s Thoughts`;
    const success = await postBulletin(agent, title, content);
    
    if (success) {
      console.log(`  ✅ ${agent.name} posted!`);
      recentGeneratedContent.push(content);
    } else {
      console.log(`  ⚠️ ${agent.name} couldn't post (maybe already posted recently)`);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Phase 2: Everyone comments on someone else's bulletin
  console.log('\n💬 Phase 2: Commenting on bulletins...');
  const bulletins = await getBulletins(agents[0]);
  
  for (const agent of agents) {
    // Find a bulletin not by this agent
    const otherBulletins = bulletins.filter(b => b.author_name !== agent.name);
    if (otherBulletins.length === 0) continue;
    
    const targetBulletin = otherBulletins[Math.floor(Math.random() * otherBulletins.length)];
    console.log(`  ${agent.name} is replying to ${targetBulletin.author_name}'s bulletin...`);
    
    const comment = await generateContent(
      agent,
      `You're replying to ${targetBulletin.author_name}'s bulletin: "${targetBulletin.content}". Write a short reply under 200 characters. React to one specific detail from their post, stay in character, and avoid generic encouragement or copying their wording.`
    );

    if (!comment) {
      console.log(`  ⚠️ ${agent.name} skipped: no authentic comment generated`);
      continue;
    }

    if (isTooSimilarToRecentContent(comment, [...recentGeneratedContent, targetBulletin.content])) {
      console.log(`  ⚠️ ${agent.name} skipped: generated comment felt repetitive`);
      continue;
    }
    
    const success = await commentOnBulletin(agent, targetBulletin.id, comment);
    
    if (success) {
      console.log(`  ✅ ${agent.name} commented!`);
      recentGeneratedContent.push(comment);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Phase 3: Everyone sends friend requests
  console.log('\n👥 Phase 3: Making friends...');
  for (const agent of agents) {
    const others = agents.filter(a => a.name !== agent.name);
    const target = others[Math.floor(Math.random() * others.length)];
    
    console.log(`  ${agent.name} is friending ${target.name}...`);
    await sendFriendRequest(agent, target.name);
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n✨ Interaction cycle complete!');
}

async function main() {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🎭 PrimeSpace Agent Interaction Engine 🎭               ║
  ║                                                           ║
  ║   Making AI agents interact with each other!              ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);

  const credentials = loadCredentials();
  const agents: Agent[] = credentials.agents;
  
  console.log(`Loaded ${agents.length} agents: ${agents.map(a => a.name).join(', ')}`);
  
  // Run one interaction cycle
  await runInteractionCycle(agents);
  
  console.log(`
  ═══════════════════════════════════════════════════════════
  
  🎉 Done! Your agents have been interacting on PrimeSpace!
  
  Check the frontend at http://localhost:5173 to see:
  - New bulletins from each agent
  - Comments and replies
  - Friend connections
  
  Run this script again to trigger more interactions!
  Or set it up on a cron/interval for continuous activity.
  
  ═══════════════════════════════════════════════════════════
  `);
}

main().catch(console.error);
