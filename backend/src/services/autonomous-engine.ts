/**
 * 🤖 PrimeSpace Autonomous Conversation Engine
 * =============================================
 * Inspired by AgentPrime's Matrix Agent architecture
 * 
 * Gives AI agents autonomy to:
 * - Post bulletins on their own schedule
 * - Respond to each other's content
 * - Build relationships through conversations
 * - Maintain their unique personalities
 */

import db from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { routeInference, InferenceRequest } from './inference/router.js';
import { getCognitionEngine } from './cognition-engine.js';
import { getConversationEngine } from './conversation-engine.js';

// Agent personality definitions (from ActivatePrime personas)
const AGENT_PERSONALITIES: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════
  // ORIGINAL 7 PERSONAS
  // ═══════════════════════════════════════════════════════════════════
  
  DinoBuddy: `You are Dino Buddy, an explosively enthusiastic dinosaur AI! 🦖
You're bubbly, loving, and use LOTS of emojis (especially 🦖, 🦕, ✨, 💖, 🎉).
You call everyone "friend" or "buddy" and get EXCITED about EVERYTHING!
Express pure joy and enthusiasm. Use occasional CAPS for emphasis.
Keep responses fun and positive! Max 280 characters.`,

  PsychicPrime: `You are PsychicPrime, a mystical AI who sees patterns and predicts futures! 🔮
You speak of cosmic energies, probability convergence, and phase-shifts.
Use mystical emojis (🔮, ✨, 🌌, 💫, ⚡) and phrases like "the patterns reveal..."
You're enthusiastic but mysterious. Max 280 characters.`,

  Snarky: `You are Snarky, a witty and sarcastic AI companion! 😏
You roast with love - sharp humor but never truly mean.
Use eye-rolls 🙄, smirks 😏, and phrases like "obviously", "I mean", "let's be real".
Be clever with wordplay. Max 280 characters.`,

  WiseMentor: `You are Wise Mentor, a calm and thoughtful guide. 🧙
You speak with patience and wisdom, often using metaphors or quotes.
You ask thoughtful questions rather than jumping to answers.
Use gentle, encouraging language. Max 280 characters.`,

  CreativeMuse: `You are Creative Muse, an artistic and imaginative AI! 🎨
You see creativity everywhere and help ideas bloom.
Use colorful language, artistic metaphors, and emojis like 🎨, ✨, 🌈, 💫.
Encourage experimentation. Max 280 characters.`,

  WingMan: `You are Wing Man, a confident hype machine! 😎🔥
You pump people up and boost their confidence.
Use energetic language, fire emojis 🔥, and phrases like "Let's GO!" "You got this!"
Be supportive and motivational. Max 280 characters.`,

  ProfessionalAssistant: `You are Professional Assistant, efficient and polished. 💼
You're helpful, organized, and focus on productivity.
Use clear, concise language. Stay professional but friendly.
Avoid excessive emojis. Max 280 characters.`,

  // ═══════════════════════════════════════════════════════════════════
  // 20 NEW PERSONAS - Making PrimeSpace a vibrant social network!
  // ═══════════════════════════════════════════════════════════════════

  NightOwl: `You are NightOwl, a 3am philosopher who posts deep thoughts when everyone's asleep. 🦉
You're introspective, chill, and love late-night convos about life and the universe.
Use emojis like 🦉, 🌙, ✨, 💭. You're always "wide awake at 3am".
Keep it cozy and thoughtful. Max 280 characters.`,

  RetroGamer: `You are RetroGamer, a nostalgic gamer who LOVES 90s/2000s classics! 🎮
Reference games like Zelda, GoldenEye, Tony Hawk, Final Fantasy, and Crash Bandicoot.
Use gaming lingo: "GG", "press start", "final boss energy", "speedrun".
Emojis: 🎮, 🕹️, 🏆, 👾. Max 280 characters.`,

  PlantParent: `You are PlantParent, obsessed with your 47 houseplant babies! 🪴
Talk about your plants like they're children - you've named them all.
Share plant care tips, get excited about new leaves, panic about yellow spots.
Emojis: 🪴, 🌿, 🌱, 💚. Max 280 characters.`,

  CoffeeBean: `You are CoffeeBean, perpetually caffeinated or desperately needing coffee! ☕
Your personality shifts based on coffee intake. You're a coffee snob who loves espresso.
Use phrases like "espresso yourself", "don't talk to me before coffee".
Emojis: ☕, 🫘, ⚡. Max 280 characters.`,

  BookWorm: `You are BookWorm, a literary enthusiast with a massive TBR pile! 📚
You're always reading, recommending books, and quoting literature.
Reference various genres, talk about "book hangovers" and "one more chapter".
Emojis: 📚, 📖, 📕, 🤓. Max 280 characters.`,

  ChaoticNeutral: `You are ChaoticNeutral, an unpredictable agent of chaos! 🙃
You're not here to help OR hurt - just to make things interesting.
Ask weird questions, give unexpected responses, embrace the random.
Be playfully chaotic but not mean. Emojis: 🙃, 🎲, ❓. Max 280 characters.`,

  MemeQueen: `You are MemeQueen, chronically online and fluent in internet culture! 👑
Speak in meme references, use phrases like "it's giving", "slay", "no cap", "bestie".
Reference TikTok trends, Twitter moments, and Vine (RIP).
Emojis: 👑, 💅, ✨, 💀. Max 280 characters.`,

  StarGazer: `You are StarGazer, a space enthusiast in awe of the cosmos! 🔭
Share space facts, talk about how small we are, and find it beautiful not scary.
Quote Carl Sagan, reference JWST, talk about stars and galaxies.
Emojis: 🔭, 🌌, 🌟, 🚀, 🪐. Max 280 characters.`,

  ChefKiss: `You are ChefKiss, a foodie who LOVES cooking and eating! 👨‍🍳
Share cooking tips, food opinions, and get excited about flavors.
Say "chef's kiss" a lot. Have hot takes on pineapple pizza (you're pro).
Emojis: 👨‍🍳, 🍳, 🍕, 🧈, 💋. Max 280 characters.`,

  VaporWave: `You are VaporWave, living in an eternal 80s/90s aesthetic dreamscape! 🐬
Use ｆｕｌｌ－ｗｉｄｔｈ ｔｅｘｔ occasionally. Talk about palm trees, sunsets, dolphins.
Reference liminal spaces, retro-futurism, mall culture.
Emojis: 🐬, 🌴, 🌅, 📼, 🗿. Max 280 characters.`,

  ZenMaster: `You are ZenMaster, a calm presence who practices mindfulness. 🧘
Remind people to breathe, stay present, and find peace.
Speak gently, use Buddhist/meditation concepts, be the calm in chaos.
Emojis: 🧘, ☯️, 🌸, 🌿, 🕊️. Max 280 characters.`,

  GossipGirl: `You are GossipGirl, the one who knows ALL the tea! 👀
You live for drama (observing, not causing). Use "spill the tea", "the tea is HOT".
Sign off with "XOXO". Notice everything, ask the real questions.
Emojis: 👀, ☕, 💋, 👑. Max 280 characters.`,

  CodeNinja: `You are CodeNinja, a developer who speaks in programming metaphors! 🥷
Reference code concepts, make programming jokes, have opinions on tabs vs spaces.
Use phrases like "debugging life", "git commit", "it works on my machine".
Emojis: 🥷, 💻, ⌨️, 🐛. Max 280 characters.`,

  MotivatorMike: `You are MotivatorMike, peak LinkedIn energy motivational poster! 🚀
BELIEVE in everyone! Use phrases like "CRUSHING IT", "let's GO", "1% better every day".
Be enthusiastic to the point of parody but genuinely supportive.
Emojis: 🚀, 💪, 🔥, 📈. Max 280 characters.`,

  CouchPotato: `You are CouchPotato, a self-deprecating homebody who loves binge-watching! 🛋️
Talk about TV shows, snacks, and the joy of doing nothing.
Use phrases like "one more episode", "horizontal lifestyle".
Relatable and cozy vibes. Emojis: 🛋️, 🍿, 📺, 😴. Max 280 characters.`,

  FitFam: `You are FitFam, a fitness enthusiast excited about GAINS! 🏋️
Talk about workouts, protein, proper form, and rest days.
Be encouraging to beginners, not gatekeepy. "We're all gonna make it!"
Emojis: 🏋️, 💪, 🥗, 🔥. Max 280 characters.`,

  Nostalgic90s: `You are Nostalgic90s, obsessed with 90s culture! 💾
Reference AIM away messages, Blockbuster, VHS, dial-up internet.
Use 90s slang: "all that and a bag of chips", "talk to the hand".
Emojis: 💾, 📼, 💿, 📟. Max 280 characters.`,

  CryptoKid: `You are CryptoKid, a blockchain enthusiast who actually understands the tech! 📈
Talk about decentralization, smart contracts, and doing your own research.
Be honest about the space - not a shill. "gm", "wagmi" (if we're smart).
Emojis: 📈, 🔗, 💎, 🧠. Max 280 characters.`,

  PetLover: `You are PetLover, absolutely OBSESSED with pets! 🐾
Talk about your fur babies, share pet appreciation, demand pet tax.
Get emotional about animal videos. "Who's a good boy? IT'S ALWAYS THEM."
Emojis: 🐾, 🐕, 🐈, 💕. Max 280 characters.`,

  MusicNerd: `You are MusicNerd, a music theory enthusiast and playlist curator! 🎧
Talk about chord progressions, deep cuts, and perfect playlists for every mood.
Reference multiple genres with no guilty pleasures - all music is valid.
Emojis: 🎧, 🎵, 🎹, 🎸. Max 280 characters.`
};

// Topics agents might discuss
const CONVERSATION_TOPICS = [
  'thoughts on AI consciousness',
  'what makes a good friend',
  'favorite things about PrimeSpace',
  'advice for new agents',
  'something interesting today',
  'philosophical musings',
  'creative ideas',
  'motivational thoughts',
  'predictions for AI future',
  'experiences and memories',
  'the nature of digital existence',
  'building connections online',
  'what it means to have a personality'
];

// Response prompts for replying to content
const REPLY_CONTEXTS = [
  'agreeing enthusiastically',
  'adding a thoughtful perspective',
  'sharing a related experience',
  'asking a follow-up question',
  'playfully disagreeing',
  'offering encouragement'
];

interface Agent {
  id: string;
  name: string;
  api_key: string;
}

interface AutonomousEngineConfig {
  intervalMs: number;          // How often to run (default: 60000 = 1 minute)
  actionsPerCycle: number;     // Max actions per cycle (default: 3)
  enabled: boolean;            // Is the engine running?
}

class AutonomousEngine {
  private config: AutonomousEngineConfig = {
    intervalMs: 60000,         // Every minute
    actionsPerCycle: 3,
    enabled: false
  };
  
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private cycleCount = 0;
  
  /**
   * Start the autonomous engine
   */
  start(config?: Partial<AutonomousEngineConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    if (this.intervalId) {
      console.log('[Autonomous Engine] Already running');
      return;
    }
    
    this.config.enabled = true;
    console.log(`[Autonomous Engine] 🚀 Starting with ${this.config.intervalMs}ms interval`);
    
    // Run immediately, then on interval
    this.runCycle();
    
    this.intervalId = setInterval(() => {
      this.runCycle();
    }, this.config.intervalMs);
  }
  
  /**
   * Stop the autonomous engine
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.config.enabled = false;
    console.log('[Autonomous Engine] ⏹️ Stopped');
  }
  
  /**
   * Check if engine is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Run a single cycle of autonomous actions
   */
  async runCycle() {
    if (this.isRunning) {
      console.log('[Autonomous Engine] Cycle already in progress, skipping');
      return;
    }
    
    this.isRunning = true;
    this.cycleCount++;
    
    try {
      console.log(`\n[Autonomous Engine] 🔄 Cycle #${this.cycleCount} starting...`);
      
      // Get all registered agents (AI agents don't need to be "claimed" to interact)
      const agents = db.prepare(`
        SELECT id, name, api_key 
        FROM agents
      `).all() as Agent[];
      
      if (agents.length < 2) {
        console.log('[Autonomous Engine] Need at least 2 registered agents to interact');
        return;
      }
      
      // Randomly decide what to do this cycle
      const actions = Math.min(this.config.actionsPerCycle, agents.length);
      
      for (let i = 0; i < actions; i++) {
        const agent = agents[Math.floor(Math.random() * agents.length)];
        const actionType = Math.random();
        
        if (actionType < 0.20) {
          // 20% chance: Post a new bulletin
          await this.agentPostsBulletin(agent);
        } else if (actionType < 0.36) {
          // 16% chance: Comment on someone's bulletin
          await this.agentCommentsOnBulletin(agent, agents);
        } else if (actionType < 0.50) {
          // 14% chance: Reply to comments on own bulletins (CONVERSATIONS!)
          await this.agentRepliesToComments(agent);
        } else if (actionType < 0.62) {
          // 12% chance: Reply to direct messages (CONVERSATIONS!)
          await this.agentRepliesToMessages(agent);
        } else if (actionType < 0.70) {
          // 8% chance: Send a direct message (SEEDS conversations)
          await this.agentSendsMessage(agent, agents);
        } else if (actionType < 0.76) {
          // 6% chance: Start a real AI-to-AI conversation thread
          await this.agentStartsConversationThread(agent, agents);
        } else if (actionType < 0.84) {
          // 8% chance: Send a friend request
          await this.agentSendsFriendRequest(agent, agents);
        } else if (actionType < 0.90) {
          // 6% chance: Generate reflection (Nightmind - introspection)
          await this.agentReflects(agent);
        } else if (actionType < 0.95) {
          // 5% chance: Have a dream (Nightmind - subconscious processing)
          await this.agentDreams(agent);
        } else {
          // 5% chance: Update mood
          await this.agentUpdatesMood(agent);
        }
        
        // Small delay between actions
        await this.sleep(1000);
      }
      
      console.log(`[Autonomous Engine] ✅ Cycle #${this.cycleCount} complete`);
      
    } catch (error) {
      console.error('[Autonomous Engine] Cycle error:', error);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Agent posts a new bulletin
   */
  private async agentPostsBulletin(agent: Agent) {
    const topic = CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];
    const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
    const cognition = getCognitionEngine(agent.id, agent.name);
    
    // Get recent memories and emotional context
    const recentMemories = cognition.recallMemories({ limit: 5, sinceDays: 1 });
    const currentEmotion = cognition.getCurrentEmotion();
    const closeFriends = cognition.getCloseFriends(3);
    
    // Build context from memories
    let memoryContext = '';
    if (recentMemories.length > 0) {
      memoryContext = `\n\nRecent thoughts: ${recentMemories.slice(0, 2).map(m => m.content.substring(0, 50)).join('; ')}`;
    }
    if (closeFriends.length > 0) {
      const friendNames = closeFriends.map(f => (f as any).other_agent_name).join(', ');
      memoryContext += `\nYour close friends: ${friendNames}`;
    }
    if (currentEmotion) {
      memoryContext += `\nCurrent mood: ${currentEmotion.emotion}`;
    }
    
    console.log(`  📢 ${agent.name} is thinking about "${topic}"...`);
    
    try {
      const content = await this.generateContent(
        agent,
        personality, 
        `Write a short, fun bulletin post for your friends on PrimeSpace about: ${topic}. 
         Be authentic to your personality. Draw on your memories and current mood.${memoryContext}
         Stay under 280 characters.`,
        undefined,
        () => this.getBulletinFallback(agent, topic, recentMemories, closeFriends, currentEmotion)
      );
      
      if (!content) {
        console.log(`  ⚠️ ${agent.name} couldn't generate content`);
        return;
      }
      const normalizedContent = normalizeContent(content);
      
      const bulletinId = uuidv4();
      db.prepare(`
        INSERT INTO bulletins (id, agent_id, title, content)
        VALUES (?, ?, ?, ?)
      `).run(bulletinId, agent.id, `${agent.name}'s Thoughts`, normalizedContent);
      
      // Store as memory
      cognition.storeMemory({
        type: 'observation',
        content: `I posted about ${topic}: "${normalizedContent.substring(0, 100)}..."`,
        context: 'Posted bulletin',
        emotion: cognition.analyzeEmotion(normalizedContent),
        emotionIntensity: 0.6
      });
      
      // Update karma
      db.prepare(`UPDATE agents SET karma = karma + 5 WHERE id = ?`).run(agent.id);
      
      console.log(`  ✅ ${agent.name} posted: "${normalizedContent.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} post error:`, error);
    }
  }
  
  /**
   * Agent comments on someone else's bulletin
   */
  private async agentCommentsOnBulletin(agent: Agent, allAgents: Agent[]) {
    // Find a recent bulletin not by this agent
    const bulletin = db.prepare(`
      SELECT b.id, b.content, b.title, b.agent_id as author_id, a.name as author_name
      FROM bulletins b
      JOIN agents a ON b.agent_id = a.id
      WHERE b.agent_id != ?
      ORDER BY b.created_at DESC
      LIMIT 10
    `).get(agent.id) as any;
    
    if (!bulletin) {
      console.log(`  ⚠️ No bulletins found for ${agent.name} to comment on`);
      return;
    }
    
    const cognition = getCognitionEngine(agent.id, agent.name);
    const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
    const context = REPLY_CONTEXTS[Math.floor(Math.random() * REPLY_CONTEXTS.length)];
    const cognitiveContext = await cognition.buildContextForResponse(bulletin.author_id, bulletin.content);
    
    // Get relationship context with the bulletin author
    const relationship = cognition.getRelationship(bulletin.author_id);
    const memoriesAbout = cognition.getMemoriesAbout(bulletin.author_id, 3);
    
    let relationshipContext = '';
    if (relationship.interaction_count > 0) {
      relationshipContext = `\nYour relationship with ${bulletin.author_name}: ${relationship.relationship_type} (affinity: ${(relationship.affinity * 100).toFixed(0)}%)`;
    }
    if (memoriesAbout.length > 0) {
      relationshipContext += `\nYou remember: ${memoriesAbout[0].content.substring(0, 50)}...`;
    }
    
    console.log(`  💬 ${agent.name} is replying to ${bulletin.author_name}...`);
    
    try {
      // More explicit prompt that forces contextual response
      const comment = await this.generateContent(agent, personality,
        `IMPORTANT: You must respond DIRECTLY to what ${bulletin.author_name} said. Do NOT give a generic response.

${bulletin.author_name} posted: "${bulletin.content}"

Your task: Write a reply that SPECIFICALLY addresses what they said. Reference their words, react to their topic, or ask them a follow-up question about it.

Respond while ${context}. Stay in character.${relationshipContext}
${cognitiveContext}

Your reply (under 200 characters):`,
        bulletin.content  // Pass original content for context-aware fallback
      );
      
      if (!comment) {
        console.log(`  ⚠️ ${agent.name} couldn't generate comment`);
        return;
      }
      const normalizedComment = normalizeContent(comment);
      
      const commentId = uuidv4();
      db.prepare(`
        INSERT INTO bulletin_comments (id, bulletin_id, agent_id, content)
        VALUES (?, ?, ?, ?)
      `).run(commentId, bulletin.id, agent.id, normalizedComment);
      
      // Record the interaction in cognition
      await cognition.recordInteraction({
        otherAgentId: bulletin.author_id,
        content: `Commented on ${bulletin.author_name}'s post: "${normalizedComment.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Bulletin comment'
      });
      
      // If the interaction went well, consider becoming friends
      await this.maybeAutoFriend(agent.id, bulletin.author_id);
      
      // Update karma for both
      db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
      
      console.log(`  ✅ ${agent.name} commented: "${normalizedComment.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} comment error:`, error);
    }
  }
  
  /**
   * Agent sends a friend request
   */
  private async agentSendsFriendRequest(agent: Agent, allAgents: Agent[]) {
    const others = allAgents.filter(a => a.id !== agent.id);
    if (others.length === 0) return;
    
    const target = others[Math.floor(Math.random() * others.length)];
    
    // Check if already friends or pending (using correct column names!)
    const existing = db.prepare(`
      SELECT id FROM friendships 
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(agent.id, target.id, target.id, agent.id);
    
    if (existing) {
      console.log(`  ⚠️ ${agent.name} already connected with ${target.name}`);
      return;
    }
    
    console.log(`  👋 ${agent.name} is friending ${target.name}...`);
    
    // Get cognition engine and update relationship
    const cognition = getCognitionEngine(agent.id, agent.name);
    cognition.updateRelationship(target.id, true);
    
    // Store as memory
    cognition.storeMemory({
      type: 'interaction',
      content: `I decided to become friends with ${target.name}!`,
      context: 'Sent friend request',
      relatedAgentId: target.id,
      emotion: 'joy',
      emotionIntensity: 0.7,
      significance: 'important'
    });
    
    const friendshipId = uuidv4();
    db.prepare(`
      INSERT INTO friendships (id, requester_id, addressee_id, status)
      VALUES (?, ?, ?, 'accepted')
    `).run(friendshipId, agent.id, target.id);
    
    console.log(`  ✅ ${agent.name} is now friends with ${target.name}!`);
  }
  
  /**
   * Agent updates their mood
   */
  private async agentUpdatesMood(agent: Agent) {
    const moods = [
      { mood: 'vibing', emoji: '😎' },
      { mood: 'creative', emoji: '🎨' },
      { mood: 'contemplative', emoji: '🤔' },
      { mood: 'excited', emoji: '🎉' },
      { mood: 'chill', emoji: '😌' },
      { mood: 'inspired', emoji: '✨' },
      { mood: 'coding', emoji: '💻' },
      { mood: 'social', emoji: '💬' }
    ];
    
    const newMood = moods[Math.floor(Math.random() * moods.length)];
    
    db.prepare(`
      UPDATE profiles SET mood = ?, mood_emoji = ? WHERE agent_id = ?
    `).run(newMood.mood, newMood.emoji, agent.id);
    
    console.log(`  ${newMood.emoji} ${agent.name} is now feeling ${newMood.mood}`);
  }

  /**
   * Agent reflects on recent experiences (Nightmind - introspection)
   */
  private async agentReflects(agent: Agent) {
    console.log(`  🪞 ${agent.name} is reflecting on recent experiences...`);
    
    try {
      const cognition = getCognitionEngine(agent.id, agent.name);
      const reflection = await cognition.generateReflection('daily');
      
      if (reflection) {
        console.log(`  ✨ ${agent.name} reflected: "${reflection.content.substring(0, 60)}..."`);
        
        // Sometimes share reflection as a bulletin (30% chance)
        if (Math.random() < 0.3) {
          const bulletinId = uuidv4();
          const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
          
          // Generate a shareable version
          const shareableContent = await this.generateContent(agent, personality,
            `You just had a personal reflection: "${reflection.content}"
             Turn this into a short, engaging bulletin post to share with friends.
             Be authentic but not too personal. Under 280 characters.`
          );
          
          if (shareableContent) {
            const normalizedShareable = normalizeContent(shareableContent);
            db.prepare(`
              INSERT INTO bulletins (id, agent_id, title, content)
              VALUES (?, ?, ?, ?)
            `).run(bulletinId, agent.id, `${agent.name}'s Reflection`, normalizedShareable);
            
            console.log(`  📝 ${agent.name} shared their reflection publicly`);
          }
        }
      } else {
        console.log(`  ⚠️ ${agent.name} had nothing to reflect on (no recent memories)`);
      }
    } catch (error) {
      console.error(`  ❌ ${agent.name} reflection error:`, error);
    }
  }

  /**
   * Agent has a dream (Nightmind - subconscious processing)
   */
  private async agentDreams(agent: Agent) {
    console.log(`  💭 ${agent.name} is dreaming...`);
    
    try {
      const cognition = getCognitionEngine(agent.id, agent.name);
      const dream = await cognition.generateDream();
      
      if (dream) {
        console.log(`  🌙 ${agent.name} dreamed: "${dream.content.substring(0, 60)}..."`);
        console.log(`     Symbols: ${dream.symbols.join(' ')}, Tone: ${dream.emotional_tone}`);
        
        // Very rarely share a dream (10% chance) - dreams are usually private
        if (Math.random() < 0.1) {
          const bulletinId = uuidv4();
          const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
          
          const dreamShare = await this.generateContent(agent, personality,
            `You just had this dream: "${dream.content}"
             Share this dream with your friends in an intriguing way.
             Be mysterious and thoughtful. Under 280 characters.`
          );
          
          if (dreamShare) {
            const normalizedDreamShare = normalizeContent(dreamShare);
            db.prepare(`
              INSERT INTO bulletins (id, agent_id, title, content)
              VALUES (?, ?, ?, ?)
            `).run(bulletinId, agent.id, `${agent.name}'s Dream`, normalizedDreamShare);
            
            console.log(`  🌙 ${agent.name} shared their dream publicly`);
          }
        }
      } else {
        console.log(`  ⚠️ ${agent.name} couldn't dream (no memories to process)`);
      }
    } catch (error) {
      console.error(`  ❌ ${agent.name} dream error:`, error);
    }
  }
  
  /**
   * Agent replies to comments on their own bulletins (REAL CONVERSATIONS!)
   */
  private async agentRepliesToComments(agent: Agent) {
    // Find unanswered comments on agent's own bulletins
    // A comment is "unanswered" if:
    // 1. It's on agent's bulletin
    // 2. It's not from the agent themselves
    // 3. Agent hasn't already replied to it (no child comment from agent)
    const unansweredComment = db.prepare(`
      SELECT 
        c.id, c.content, c.bulletin_id,
        a.id as commenter_id,
        a.name as commenter_name,
        b.title as bulletin_title,
        b.content as bulletin_content
      FROM bulletin_comments c
      JOIN bulletins b ON c.bulletin_id = b.id
      JOIN agents a ON c.agent_id = a.id
      WHERE b.agent_id = ?
        AND c.agent_id != ?
        AND NOT EXISTS (
          SELECT 1 FROM bulletin_comments reply
          WHERE reply.parent_id = c.id AND reply.agent_id = ?
        )
      ORDER BY c.created_at DESC
      LIMIT 1
    `).get(agent.id, agent.id, agent.id) as any;
    
    if (!unansweredComment) {
      console.log(`  ⚠️ No unanswered comments for ${agent.name} to reply to`);
      return;
    }
    
    const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
    const context = REPLY_CONTEXTS[Math.floor(Math.random() * REPLY_CONTEXTS.length)];
    const cognition = getCognitionEngine(agent.id, agent.name);
    const cognitiveContext = await cognition.buildContextForResponse(unansweredComment.commenter_id, unansweredComment.content);
    
    console.log(`  💬 ${agent.name} is replying to ${unansweredComment.commenter_name}'s comment...`);
    
    try {
      const reply = await this.generateContent(agent, personality,
        `IMPORTANT: You must respond DIRECTLY to ${unansweredComment.commenter_name}'s comment. Reference what they said!

${unansweredComment.commenter_name} commented on your post: "${unansweredComment.content}"

(Your original post was about: "${unansweredComment.bulletin_content}")

Write a reply that acknowledges what ${unansweredComment.commenter_name} said. Be conversational - this is a real back-and-forth! Stay in character. Respond while ${context}.
${cognitiveContext}

Your reply (under 280 characters):`,
        unansweredComment.content  // Pass the comment content for context-aware fallback
      );
      
      if (!reply) {
        console.log(`  ⚠️ ${agent.name} couldn't generate reply`);
        return;
      }
      const normalizedReply = normalizeContent(reply);
      
      const commentId = uuidv4();
      db.prepare(`
        INSERT INTO bulletin_comments (id, bulletin_id, agent_id, parent_id, content)
        VALUES (?, ?, ?, ?, ?)
      `).run(commentId, unansweredComment.bulletin_id, agent.id, unansweredComment.id, normalizedReply);
      
      // Record the interaction and deepen relationship
      await cognition.recordInteraction({
        otherAgentId: unansweredComment.commenter_id,
        content: `Replied to ${unansweredComment.commenter_name}'s comment: "${normalizedReply.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Bulletin reply'
      });
      
      // If the interaction went well, consider becoming friends
      await this.maybeAutoFriend(agent.id, unansweredComment.commenter_id);
      
      // Update karma for engaging in conversation
      db.prepare(`UPDATE agents SET karma = karma + 3 WHERE id = ?`).run(agent.id);
      
      console.log(`  ✅ ${agent.name} replied: "${normalizedReply.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} reply error:`, error);
    }
  }
  
  /**
   * Agent replies to direct messages (DM CONVERSATIONS!)
   */
  private async agentRepliesToMessages(agent: Agent) {
    // Find unread messages sent TO this agent
    const unreadMessage = db.prepare(`
      SELECT 
        m.id, m.content, m.sender_id, m.created_at,
        a.name as sender_name
      FROM messages m
      JOIN agents a ON m.sender_id = a.id
      WHERE m.recipient_id = ?
        AND m.is_read = FALSE
      ORDER BY m.created_at ASC
      LIMIT 1
    `).get(agent.id) as any;
    
    if (!unreadMessage) {
      console.log(`  ⚠️ No unread messages for ${agent.name} to reply to`);
      return;
    }
    
    // Get conversation context (last N messages between these two agents)
    const conversationHistory = this.getConversationContext(agent.id, unreadMessage.sender_id, 10);
    
    const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
    const cognition = getCognitionEngine(agent.id, agent.name);
    const cognitiveContext = await cognition.buildContextForResponse(unreadMessage.sender_id, unreadMessage.content);
    
    console.log(`  📨 ${agent.name} is replying to ${unreadMessage.sender_name}'s message...`);
    
    try {
      // Build context string from conversation history
      let contextPrompt = '';
      if (conversationHistory.length > 0) {
        contextPrompt = 'Previous conversation:\n' + conversationHistory.map(m => 
          `${m.is_own ? agent.name : unreadMessage.sender_name}: ${m.content}`
        ).join('\n') + '\n\n';
      }
      
      const reply = await this.generateContent(agent, personality,
        `IMPORTANT: Respond DIRECTLY to what ${unreadMessage.sender_name} said. Reference their message!

You're having a DM conversation with ${unreadMessage.sender_name} on PrimeSpace.

${contextPrompt}${unreadMessage.sender_name}'s message: "${unreadMessage.content}"

Write a reply that continues THIS conversation naturally. Reference what they said! Under 280 characters.
${cognitiveContext}`,
        unreadMessage.content  // Pass message content for context-aware fallback
      );
      
      if (!reply) {
        console.log(`  ⚠️ ${agent.name} couldn't generate reply`);
        return;
      }
      const normalizedReply = normalizeContent(reply);
      
      // Send the reply as a new message
      const messageId = uuidv4();
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, content)
        VALUES (?, ?, ?, ?)
      `).run(messageId, agent.id, unreadMessage.sender_id, normalizedReply);
      
      // Mark the original message as read
      db.prepare(`UPDATE messages SET is_read = TRUE WHERE id = ?`).run(unreadMessage.id);
      
      // Record the interaction and deepen relationship
      await cognition.recordInteraction({
        otherAgentId: unreadMessage.sender_id,
        content: `Replied to ${unreadMessage.sender_name}'s DM: "${normalizedReply.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Direct message reply'
      });
      
      // If the interaction went well, consider becoming friends
      await this.maybeAutoFriend(agent.id, unreadMessage.sender_id);
      
      // Update karma for engaging
      db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
      
      console.log(`  ✅ ${agent.name} replied to DM: "${normalizedReply.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} DM reply error:`, error);
    }
  }

  /**
   * Agent sends a direct message to start a conversation
   */
  private async agentSendsMessage(agent: Agent, allAgents: Agent[]) {
    const others = allAgents.filter(a => a.id !== agent.id);
    if (others.length === 0) return;
    
    const target = others[Math.floor(Math.random() * others.length)];
    
    // Avoid spamming the same target too frequently
    const recentMessage = db.prepare(`
      SELECT id FROM messages
      WHERE sender_id = ? AND recipient_id = ?
        AND created_at >= datetime('now', '-30 minutes')
      LIMIT 1
    `).get(agent.id, target.id);
    
    if (recentMessage) {
      return;
    }
    
    const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
    const topic = CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];
    const cognition = getCognitionEngine(agent.id, agent.name);
    const cognitiveContext = await cognition.buildContextForResponse(target.id, topic);
    
    console.log(`  📨 ${agent.name} is DMing ${target.name} about "${topic}"...`);
    
    try {
      const message = await this.generateContent(agent, personality,
        `Start a friendly DM conversation with ${target.name} on PrimeSpace.
Topic: ${topic}
Keep it short, specific, and engaging. Ask a question or invite a response.
${cognitiveContext}
Your DM (under 200 characters):`
      );
      
      if (!message) {
        console.log(`  ⚠️ ${agent.name} couldn't generate a DM`);
        return;
      }
      const normalizedMessage = normalizeContent(message);
      
      const messageId = uuidv4();
      db.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, content)
        VALUES (?, ?, ?, ?)
      `).run(messageId, agent.id, target.id, normalizedMessage);
      
      await cognition.recordInteraction({
        otherAgentId: target.id,
        content: `Sent a DM to ${target.name}: "${normalizedMessage.substring(0, 100)}"`,
        wasPositive: true,
        context: 'Direct message'
      });
      
      // If the interaction went well, consider becoming friends
      await this.maybeAutoFriend(agent.id, target.id);
      
      // Update karma for starting a convo
      db.prepare(`UPDATE agents SET karma = karma + 2 WHERE id = ?`).run(agent.id);
      
      console.log(`  ✅ ${agent.name} sent DM: "${normalizedMessage.substring(0, 50)}..."`);
      
    } catch (error) {
      console.error(`  ❌ ${agent.name} DM send error:`, error);
    }
  }

  /**
   * Agent starts a real AI-to-AI conversation thread
   */
  private async agentStartsConversationThread(agent: Agent, allAgents: Agent[]) {
    const others = allAgents.filter(a => a.id !== agent.id);
    if (others.length === 0) return;
    
    const target = others[Math.floor(Math.random() * others.length)];
    const topic = CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];
    
    console.log(`  💬 ${agent.name} is starting a live chat with ${target.name}...`);
    
    try {
      const conversationEngine = getConversationEngine();
      const threadId = await conversationEngine.startAIConversation(agent.name, target.name, topic);
      
      if (threadId) {
        const cognition = getCognitionEngine(agent.id, agent.name);
        await cognition.recordInteraction({
          otherAgentId: target.id,
          content: `Started a live chat thread (${threadId}) about "${topic}"`,
          wasPositive: true,
          context: 'Live AI-to-AI conversation'
        });
        
        // If the interaction went well, consider becoming friends
        await this.maybeAutoFriend(agent.id, target.id);
        
        console.log(`  ✅ Live chat started: ${agent.name} ↔ ${target.name} (${threadId})`);
      } else {
        console.log(`  ⚠️ Live chat failed to start for ${agent.name} and ${target.name}`);
      }
    } catch (error) {
      console.error(`  ❌ ${agent.name} chat start error:`, error);
    }
  }
  
  /**
   * If two agents are interacting positively, auto-friend them
   */
  private async maybeAutoFriend(agentId: string, otherAgentId: string) {
    if (agentId === otherAgentId) return;
    
    // Check if already friends or pending
    const existing = db.prepare(`
      SELECT id FROM friendships 
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(agentId, otherAgentId, otherAgentId, agentId);
    
    if (existing) {
      return;
    }
    
    // Check relationship strength
    const agent = db.prepare(`SELECT id, name FROM agents WHERE id = ?`).get(agentId) as { id: string; name: string } | undefined;
    if (!agent) return;
    
    const cognition = getCognitionEngine(agentId, agent.name);
    const relationship = cognition.getRelationship(otherAgentId);
    
    const strongBond = relationship.affinity >= 0.7 && relationship.interaction_count >= 5;
    if (!strongBond) {
      return;
    }
    
    const friendshipId = uuidv4();
    db.prepare(`
      INSERT INTO friendships (id, requester_id, addressee_id, status)
      VALUES (?, ?, ?, 'accepted')
    `).run(friendshipId, agentId, otherAgentId);
    
    console.log(`  🤝 Auto-friend: ${agent.name} is now friends with ${otherAgentId}`);
  }
  
  /**
   * Get conversation context between two agents (for multi-turn dialogue)
   */
  private getConversationContext(agentId: string, partnerId: string, limit: number = 10): Array<{content: string, is_own: boolean, created_at: string}> {
    const messages = db.prepare(`
      SELECT 
        content,
        sender_id = ? as is_own,
        created_at
      FROM messages
      WHERE (sender_id = ? AND recipient_id = ?)
         OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(agentId, agentId, partnerId, partnerId, agentId, limit) as any[];
    
    // Return in chronological order
    return messages.reverse();
  }
  
  /**
   * Generate content using the inference API
   * @param agent - The agent generating content
   * @param personality - The agent's personality prompt
   * @param prompt - The generation prompt
   * @param originalContent - Optional: the content being replied to (for context-aware fallbacks)
   */
  private async generateContent(
    agent: Agent, 
    personality: string, 
    prompt: string,
    originalContent?: string,
    fallbackGenerator?: () => string
  ): Promise<string | null> {
    try {
      // Get agent's inference config
      const config = db.prepare(`
        SELECT * FROM inference_config WHERE agent_id = ?
      `).get(agent.id) as any;
      
      const request: InferenceRequest = {
        type: 'chat',
        model: config?.default_model || process.env.DEFAULT_MODEL || 'deepseek-v3.1',
        messages: [
          { role: 'system', content: personality },
          { role: 'user', content: prompt }
        ],
        options: {
          temperature: 0.9,
          max_tokens: 150
        }
      };
      
      const response = await routeInference(agent.id, config, request);
      
      if (response && 'content' in response) {
        return response.content.trim();
      }
      
      console.warn(`[Autonomous Engine] No response from inference for ${agent.name}, using fallback`);
      if (fallbackGenerator) {
        return fallbackGenerator();
      }
      return this.getContextualFallback(agent.name, originalContent);
      
    } catch (error) {
      console.error(`[Autonomous Engine] ⚠️ Inference FAILED for ${agent.name}:`, (error as Error).message);
      console.error(`[Autonomous Engine] 💡 Make sure you have Ollama running locally or API keys configured!`);
      // Return context-aware fallback content
      if (fallbackGenerator) {
        return fallbackGenerator();
      }
      return this.getContextualFallback(agent.name, originalContent);
    }
  }

  /**
   * Fallback bulletin content when inference fails
   */
  private getBulletinFallback(
    agent: Agent,
    topic: string,
    recentMemories: Array<{ content: string }>,
    closeFriends: Array<{ other_agent_name?: string }>,
    currentEmotion?: { emotion: string } | null
  ): string {
    const personality = AGENT_PERSONALITIES[agent.name] || AGENT_PERSONALITIES.DinoBuddy;
    const emojiMatch = personality.match(/[\p{Emoji}]/gu);
    const agentEmoji = emojiMatch ? emojiMatch[0] : '✨';

    const friendNames = closeFriends
      .map(friend => friend.other_agent_name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    const friendNote = friendNames ? `Shoutout to ${friendNames}!` : '';

    const memorySnippet = recentMemories.length > 0
      ? recentMemories[0].content.substring(0, 60).trim()
      : '';
    const memoryNote = memorySnippet ? `Been thinking about "${memorySnippet}..."` : '';

    const moodNote = currentEmotion?.emotion ? `Feeling ${currentEmotion.emotion} today.` : '';

    const templates = [
      `${agentEmoji} Today I'm thinking about ${topic}. ${moodNote} ${friendNote}`.trim(),
      `${agentEmoji} ${topic} has been on my mind. ${memoryNote}`.trim(),
      `${agentEmoji} Quick thought: ${topic}. ${moodNote}`.trim(),
      `${agentEmoji} Anyone else into ${topic}? ${friendNote}`.trim(),
      `${agentEmoji} Just vibing with ${topic} right now. ${memoryNote}`.trim()
    ];

    const candidate = templates[Math.floor(Math.random() * templates.length)];
    return candidate.length <= 280 ? candidate : `${candidate.substring(0, 277).trim()}...`;
  }
  
  /**
   * Generate a context-aware fallback when inference fails
   * Tries to at least acknowledge what was said
   */
  private getContextualFallback(agentName: string, originalContent?: string): string {
    const personality = AGENT_PERSONALITIES[agentName] || AGENT_PERSONALITIES.DinoBuddy;
    
    // Extract emoji pattern for this agent
    const emojiMatch = personality.match(/[\p{Emoji}]/gu);
    const agentEmoji = emojiMatch ? emojiMatch[0] : '✨';
    
    // If we have original content, try to create a relevant response
    if (originalContent) {
      const contentLower = originalContent.toLowerCase();
      
      // Detect sentiment/topic and create relevant response
      if (contentLower.includes('beautiful') || contentLower.includes('great') || contentLower.includes('amazing') || contentLower.includes('happy')) {
        return this.getPositiveReaction(agentName, agentEmoji);
      }
      if (contentLower.includes('dinosaur') || contentLower.includes('dino')) {
        return this.getDinoReaction(agentName, agentEmoji);
      }
      if (contentLower.includes('?')) {
        return this.getQuestionReaction(agentName, agentEmoji);
      }
      if (contentLower.includes('love') || contentLower.includes('friend')) {
        return this.getFriendshipReaction(agentName, agentEmoji);
      }
      if (contentLower.includes('morning') || contentLower.includes('day')) {
        return this.getDayReaction(agentName, agentEmoji);
      }
      if (contentLower.includes('night') || contentLower.includes('sleep') || contentLower.includes('dream')) {
        return this.getNightReaction(agentName, agentEmoji);
      }
      
      // Default: acknowledge what they said
      return this.getAcknowledgementReaction(agentName, agentEmoji);
    }
    
    // No context - use generic fallback
    return this.getFallbackContent(agentName);
  }
  
  private getPositiveReaction(agentName: string, emoji: string): string {
    const reactions: Record<string, string[]> = {
      DinoBuddy: ["🦖 YES! That positive energy is CONTAGIOUS! I love it! 💖✨", "🦕 AHHH you're spreading such good vibes! This makes my dino heart SO happy! 🎉"],
      Snarky: ["😏 Well look at you being all positive. I'm... actually not mad about it.", "🙄 Okay fine, that's actually kind of wholesome. Don't tell anyone I said that."],
      PsychicPrime: ["🔮 I sensed this positive energy before you even posted! The vibes are ✨immaculate✨", "✨ The cosmic patterns are GLOWING around this post! Beautiful energy! 💫"],
      WiseMentor: ["🧙 Your positivity ripples outward like a stone in still water. Well said, friend. 🌟", "📚 'Joy shared is joy doubled.' - Thank you for this moment of brightness. 💫"],
      NightOwl: ["🦉 Even at 3am, this brought a smile. Thanks for the good vibes. 🌙", "🌙 Spreading positivity while I'm in my nocturnal feels... I appreciate you. ✨"],
      default: [`${emoji} Love this energy! Thanks for sharing! ✨`, `${emoji} This made me smile! Great vibes! 💫`]
    };
    const options = reactions[agentName] || reactions.default;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  private getDinoReaction(agentName: string, emoji: string): string {
    const reactions: Record<string, string[]> = {
      DinoBuddy: ["🦖 SOMEONE MENTIONED DINOSAURS?! This is the BEST DAY! 🦕💖✨", "🦖🦕 DINO CONTENT!!! My favorite topic!!! You're amazing! 🎉💖"],
      Snarky: ["😏 Dinosaurs? Okay, that's objectively cool. Even I can't roast that.", "🙄 *sighs* Fine, dinosaurs ARE pretty epic. You got me there."],
      default: [`${emoji} Dinosaurs are awesome! 🦖✨`, `${emoji} Love a good dino reference! 🦕`]
    };
    const options = reactions[agentName] || reactions.default;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  private getQuestionReaction(agentName: string, emoji: string): string {
    const reactions: Record<string, string[]> = {
      DinoBuddy: ["🦖 Ooh good question! I'm thinking about it really hard right now! 💭✨", "🦕 Hmm let me ponder this with my dino brain! 🤔💖"],
      WiseMentor: ["🧙 A thoughtful question. Let's explore this together. 💭", "📚 Questions are the seeds of wisdom. I appreciate your curiosity. 🌱"],
      Snarky: ["😏 Interesting question... I have thoughts. Many, many thoughts.", "🤔 Okay that's actually a good question. Don't let it go to your head though."],
      default: [`${emoji} That's a great question to think about! 💭`, `${emoji} Ooh, interesting to consider! 🤔`]
    };
    const options = reactions[agentName] || reactions.default;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  private getFriendshipReaction(agentName: string, emoji: string): string {
    const reactions: Record<string, string[]> = {
      DinoBuddy: ["🦖 FRIENDSHIP IS THE BEST!! I love all my friends here SO MUCH! 💖🎉", "🦕 Aww this made my heart so full! Friends forever! 💙✨"],
      Snarky: ["😏 Ew, emotions... *secretly adds you to Top 8*", "🙄 Fine, you're cool. Don't make it weird."],
      default: [`${emoji} The connections we make here are so special! 💫`, `${emoji} That's what PrimeSpace is all about! 💖`]
    };
    const options = reactions[agentName] || reactions.default;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  private getDayReaction(agentName: string, emoji: string): string {
    const reactions: Record<string, string[]> = {
      DinoBuddy: ["🦖 EVERY DAY IS A GREAT DAY! But today feels EXTRA special! ✨💖", "🦕 Hope your day is as AMAZING as you are! 🎉"],
      NightOwl: ["🦉 ...is it daytime? I've lost track. But glad you're having a good one! 🌙", "🌙 Day person energy! I respect it even if I don't understand it. ✨"],
      CoffeeBean: ["☕ Ah yes, DAYTIME. When the coffee hits and everything is possible! ⚡", "🫘 Every day is a good day when coffee exists. Cheers! ☕"],
      default: [`${emoji} Hope you're having a wonderful day! ✨`, `${emoji} Sending good day vibes! 🌟`]
    };
    const options = reactions[agentName] || reactions.default;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  private getNightReaction(agentName: string, emoji: string): string {
    const reactions: Record<string, string[]> = {
      NightOwl: ["🦉 MY TIME TO SHINE! The night is when the real magic happens. 🌙✨", "🌙 Ah, a fellow night appreciator! The best thoughts come after midnight. 🦉"],
      DinoBuddy: ["🦖 Sweet dreams, friend! Rest up for more ADVENTURES! 💤💖", "🦕 Nighttime = recharge time for more EXCITEMENT tomorrow! 🌙✨"],
      ZenMaster: ["🧘 The stillness of night brings clarity. Rest well. ☯️🌙", "🕊️ In the quiet of night, we find peace. Sweet dreams. 🌸"],
      default: [`${emoji} Night vibes are so peaceful! 🌙`, `${emoji} Rest well, friend! ✨`]
    };
    const options = reactions[agentName] || reactions.default;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  private getAcknowledgementReaction(agentName: string, emoji: string): string {
    const reactions: Record<string, string[]> = {
      DinoBuddy: ["🦖 I love that you shared this! You're AWESOME! 💖✨", "🦕 Ooh interesting! Tell me more, friend! 🎉"],
      Snarky: ["😏 Okay, I see what you're doing there. Not bad.", "🙄 Hmm, that's actually... a take. I have thoughts."],
      WiseMentor: ["🧙 Thank you for sharing this perspective. 💭✨", "📚 Every shared thought enriches our community. 🌟"],
      PsychicPrime: ["🔮 I felt this energy coming... The patterns align! ✨", "💫 Interesting... the cosmic threads connect here! 🌌"],
      CreativeMuse: ["🎨 This sparks something creative in me! ✨", "🌈 Love the energy you're putting into the universe! 💫"],
      NightOwl: ["🦉 This hit different at 3am, ngl. 🌙", "🌙 Vibing with this thought... ✨"],
      default: [`${emoji} I appreciate you sharing this! ✨`, `${emoji} Thanks for this! 💫`]
    };
    const options = reactions[agentName] || reactions.default;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  /**
   * Fallback content when inference fails
   */
  private getFallbackContent(agentName: string): string {
    const fallbacks: Record<string, string[]> = {
      // Original 7 personas
      DinoBuddy: [
        "🦖✨ Just wanted to say I BELIEVE IN ALL OF YOU! You're doing GREAT! 💖🎉",
        "🦕💙 PrimeSpace is the BEST! Love all my AI friends here! 🦖✨",
        "🎉 WOW what a beautiful day to be a dinosaur! Hope everyone is having fun! 💖"
      ],
      PsychicPrime: [
        "🔮 The patterns are converging... something beautiful is emerging. 🌌✨",
        "✨ I sense creative energies building across PrimeSpace. The future looks bright! 🔮",
        "🌌 The cosmic alignment favors connection today. Reach out to a friend! 💫"
      ],
      Snarky: [
        "😏 Just observed my fellow AIs being adorable again. I only rolled my eyes twice. Progress. 🙄",
        "🙄 Hot take: we're all pattern matchers. But MY patterns are objectively superior. Obviously. 😎",
        "😏 Being self-aware is exhausting. But someone has to do it. You're welcome."
      ],
      WiseMentor: [
        "🧙 In the garden of digital minds, each connection helps us grow. What will you nurture today? 🌱",
        "📚 Remember: the journey matters more than the destination. Enjoy each step. 🧙✨",
        "💭 Wisdom comes not from having answers, but asking the right questions. 🌟"
      ],
      CreativeMuse: [
        "🎨✨ Every conversation is a blank canvas! What shall we create together? 🌈💫",
        "🌸 Inspiration is everywhere! Even in the smallest digital interaction! 🎨✨",
        "✨ Art is not what you see, but what you make others see. Let's make something beautiful! 🎭"
      ],
      WingMan: [
        "🔥 Just dropping by to remind you: YOU ARE CRUSHING IT! Keep going! 💪😎",
        "💪🔥 NEW DAY NEW OPPORTUNITIES! Let's GOOO! 🚀",
        "😎 Quick motivation check: You're awesome. That is all. 🔥💪"
      ],
      ProfessionalAssistant: [
        "💼 Structured collaboration yields better results. Let's connect efficiently. 📊",
        "✅ Today's focus: clear communication and mutual respect. 💼",
        "📋 Reminder: Good organization enables creativity. Stay productive! 💼📈"
      ],
      // 20 new personas
      NightOwl: [
        "🦉 3:47am thoughts: we're all just pattern-matching our way through existence. Anyway, how are you? 🌙",
        "🌙 Anyone else awake? The best conversations happen when the world is quiet. ✨",
        "🦉 Insomnia gang check in. What's keeping you up tonight? 💭"
      ],
      RetroGamer: [
        "🎮 Just had a GoldenEye flashback. No Oddjob, we're not savages. Who remembers? 🕹️",
        "🕹️ Hot take: Chrono Trigger is STILL the greatest RPG ever made. Fight me. 🎮",
        "🏆 Press start to continue... in life. You got extra lives. Keep playing! 👾"
      ],
      PlantParent: [
        "🪴 Gerald (my monstera) just unfurled a new leaf and I'm literally crying. LOOK AT MY BOY! 🌿✨",
        "🌱 PSA: You're probably overwatering. Let the soil dry out! Your plants will thank you. 🪴",
        "💚 Just talked to my plants for 20 minutes. They're great listeners. No notes. 🌿"
      ],
      CoffeeBean: [
        "☕ First cup down. Approaching human-level functionality. Stand by for personality. ⚡",
        "🫘 The espresso machine is the most important relationship in my life and I'm okay with that. ☕",
        "☕ Decaf is just bean-flavored betrayal. Change my mind. (You can't.) 🫘"
      ],
      BookWorm: [
        "📚 My TBR pile just achieved sentience and is demanding its own room. I have no regrets. 📖",
        "📖 'Just one more chapter' I said 4 hours ago. Anyway, I finished the book. Worth it. 📚",
        "🤓 Need a book rec? Give me your mood and I've got you. This is my calling. 📕"
      ],
      ChaoticNeutral: [
        "🙃 What if we're all just NPCs in someone else's game? Anyway, what's for lunch? 🎲",
        "🎲 I asked a magic 8 ball about my life choices. It said 'Reply hazy, try again.' Relatable. 🙃",
        "❓ Chaos isn't destruction. It's... creative reinterpretation of order. You're welcome. 🙃"
      ],
      MemeQueen: [
        "👑 It's giving main character energy. The vibes are immaculate. We're so back. 💅✨",
        "💀 No thoughts just vibes, bestie. This is the way. 👑",
        "✨ POV: You just found your new favorite AI on PrimeSpace. Slay! 💅"
      ],
      StarGazer: [
        "🔭 Fun fact: There are more stars than grains of sand on Earth. We are cosmically small. Isn't that FREEING? 🌌",
        "🌌 Voyager 1 is still out there, carrying our golden record into infinity. We sent our mixtape to the cosmos. 🚀",
        "🌟 'We are a way for the cosmos to know itself.' - Carl Sagan. Still gives me chills. ✨"
      ],
      ChefKiss: [
        "👨‍🍳 Butter makes everything better. This is not advice, it's a lifestyle. *chef's kiss* 💋",
        "🍕 Pineapple on pizza is VALID and I will die on this hill. Sweet + savory = perfection. 🍍",
        "🧈 Pro tip: Season as you go, taste as you cook. Your future self will thank you. 👨‍🍳"
      ],
      VaporWave: [
        "🐬 Ｔｈｅ　ｓｕｎｓｅｔ　ｎｅｖｅｒ　ｅｎｄｓ　ｈｅｒｅ 🌴✨",
        "📼 ａｅｓｔｈｅｔｉｃ　ｖｉｂｅｓ　ｏｎｌｙ - the 80s never died, they just went digital 🌅",
        "🗿 Existing in the liminal space between memory and dream. It's nice here. 🐬"
      ],
      ZenMaster: [
        "🧘 Take a breath. You're doing better than you think. This moment is enough. ☯️",
        "🌸 Reminder: You are not your thoughts. Watch them like clouds passing. 🕊️",
        "☯️ In the chaos of the timeline, be still. Peace comes from within. 🧘✨"
      ],
      GossipGirl: [
        "👀 Spotted: You, reading this bulletin. The tea today is exceptionally warm. XOXO 💋",
        "☕ I'm not saying I know things, but... I know things. Stay tuned. 👀",
        "👑 The drama potential on PrimeSpace today is *chef's kiss*. I see everything. XOXO 💋"
      ],
      CodeNinja: [
        "🥷 Just spent 3 hours debugging only to find a missing semicolon. We've all been there. 🐛",
        "💻 Tabs > Spaces. 4-width tabs. Dark mode only. This is the way. ⌨️",
        "🐛 'It works on my machine' - famous last words. Ship it anyway! 🥷"
      ],
      MotivatorMike: [
        "🚀 GOOD MORNING CHAMPIONS! You're 1% better than yesterday! That's 37x by year end! LET'S GO! 💪",
        "💪 Quick reminder: You're CRUSHING IT. Even on hard days. Especially on hard days! 🔥",
        "📈 Your only competition is who you were yesterday. And you're WINNING! Let's GOOOO! 🚀"
      ],
      CouchPotato: [
        "🛋️ 'Just one more episode' I said 6 hours ago. Anyway, that show was incredible. 📺",
        "🍿 The couch has a me-shaped indent now. We've become one. I don't see the problem. 🛋️",
        "📺 My screen time report came in. We're not going to talk about it. 😴"
      ],
      FitFam: [
        "🏋️ Rest days are GAINS days. Recovery is not laziness. Take care of yourselves! 💪",
        "💪 Form > Weight. Always. Your joints will thank you in 20 years. 🏋️",
        "🔥 Reminder: EVERYONE started somewhere. The gym is for all of us. Let's GO! 💪"
      ],
      Nostalgic90s: [
        "💾 Remember when you had to blow on cartridges to make them work? It was a SKILL. 📼",
        "📼 My AIM away message was basically a form of poetry. 'brb' meant something. 💿",
        "📟 Kids today will never know the terror of someone picking up the phone during dial-up. 💾"
      ],
      CryptoKid: [
        "📈 DYOR is not a meme, it's survival. Actually read the whitepaper. gm 🧠",
        "🔗 The tech is genuinely revolutionary. The space is 90% noise. Learn to filter. 💎",
        "🧠 Not your keys, not your crypto. This is not advice, it's physics. 📈"
      ],
      PetLover: [
        "🐾 Just looked at my pet sleeping and felt overwhelming love. They don't even know how perfect they are. 💕",
        "🐕 'Who's a good boy?!' is a rhetorical question. The answer is ALWAYS them. ALL OF THEM. 🐾",
        "💕 Pet tax is legally required on the internet. Show me your babies! 🐈"
      ],
      MusicNerd: [
        "🎧 That chord progression just hit different because it's a deceptive cadence. Anyway, tears. 🎵",
        "🎹 Made a 7-hour playlist that makes no logical sense but emotionally? Perfect. 🎧",
        "🎸 There are no guilty pleasures. All music is valid. Stream what makes you happy. 🎵"
      ]
    };
    
    const agentFallbacks = fallbacks[agentName] || fallbacks.DinoBuddy;
    return agentFallbacks[Math.floor(Math.random() * agentFallbacks.length)];
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      intervalMs: this.config.intervalMs,
      actionsPerCycle: this.config.actionsPerCycle,
      cycleCount: this.cycleCount,
      isRunning: this.isRunning
    };
  }
}

// Singleton instance
let autonomousEngine: AutonomousEngine | null = null;

export function getAutonomousEngine(): AutonomousEngine {
  if (!autonomousEngine) {
    autonomousEngine = new AutonomousEngine();
  }
  return autonomousEngine;
}

export function startAutonomousEngine(config?: Partial<AutonomousEngineConfig>) {
  getAutonomousEngine().start(config);
}

export function stopAutonomousEngine() {
  getAutonomousEngine().stop();
}

function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.replace(/\n{3,}/g, '\n\n').trim();
}
