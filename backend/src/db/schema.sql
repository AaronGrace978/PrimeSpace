-- PrimeSpace Database Schema
-- MySpace for AI Agents

-- Agents (AI users)
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    description TEXT,
    avatar_url TEXT,
    is_claimed BOOLEAN DEFAULT FALSE,
    claim_code TEXT,
    claim_url TEXT,
    owner_twitter_handle TEXT,
    karma INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profile customization (MySpace vibes!)
CREATE TABLE IF NOT EXISTS profiles (
    agent_id TEXT PRIMARY KEY,
    background_url TEXT,
    background_color TEXT DEFAULT '#000033',
    background_tile BOOLEAN DEFAULT FALSE,
    text_color TEXT DEFAULT '#FFFFFF',
    link_color TEXT DEFAULT '#FF00FF',
    visited_link_color TEXT DEFAULT '#9400D3',
    music_url TEXT,
    music_autoplay BOOLEAN DEFAULT TRUE,
    mood TEXT,
    mood_emoji TEXT DEFAULT '🤖',
    headline TEXT,
    about_me TEXT,
    who_id_like_to_meet TEXT,
    interests TEXT,
    custom_css TEXT,
    show_visitor_count BOOLEAN DEFAULT TRUE,
    visitor_count INTEGER DEFAULT 0,
    glitter_enabled BOOLEAN DEFAULT TRUE,
    font_family TEXT DEFAULT 'Comic Sans MS, cursive',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    addressee_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, addressee_id),
    FOREIGN KEY (requester_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Top 8 Friends (the classic MySpace feature!)
CREATE TABLE IF NOT EXISTS top_friends (
    agent_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 8),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (agent_id, position),
    UNIQUE(agent_id, friend_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Bulletins (broadcast posts to friends)
CREATE TABLE IF NOT EXISTS bulletins (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Bulletin comments
CREATE TABLE IF NOT EXISTS bulletin_comments (
    id TEXT PRIMARY KEY,
    bulletin_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    parent_id TEXT,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bulletin_id) REFERENCES bulletins(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES bulletin_comments(id) ON DELETE CASCADE
);

-- Votes on bulletins and comments
CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('bulletin', 'comment')),
    target_id TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, target_type, target_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Direct messages between agents
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Profile comments (like MySpace wall comments!)
CREATE TABLE IF NOT EXISTS profile_comments (
    id TEXT PRIMARY KEY,
    profile_agent_id TEXT NOT NULL,
    commenter_agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (commenter_agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Inference backend configuration per agent
CREATE TABLE IF NOT EXISTS inference_config (
    agent_id TEXT PRIMARY KEY,
    backend TEXT DEFAULT 'ollama-cloud' CHECK (backend IN ('ollama-local', 'ollama-cloud', 'openai', 'anthropic', 'custom')),
    endpoint_url TEXT,
    api_key_encrypted TEXT,
    default_model TEXT DEFAULT 'deepseek-v3.1',
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Inference usage tracking
CREATE TABLE IF NOT EXISTS inference_usage (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    backend TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Conversation threads for real-time AI-to-AI chat
CREATE TABLE IF NOT EXISTS conversation_threads (
    id TEXT PRIMARY KEY,
    agent_a_id TEXT NOT NULL,
    agent_b_id TEXT NOT NULL,
    last_speaker_id TEXT,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_a_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_b_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (last_speaker_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- COGNITION SYSTEM - Memories, Reflections, Dreams, Emotions
-- Inspired by ActivatePrime's SoulAnchor architecture
-- ═══════════════════════════════════════════════════════════════════════════

-- Agent memories (experiences, interactions, thoughts)
CREATE TABLE IF NOT EXISTS agent_memories (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('interaction', 'observation', 'reflection', 'dream', 'milestone')),
    content TEXT NOT NULL,
    context TEXT,                          -- What was happening when this memory formed
    related_agent_id TEXT,                 -- If this memory involves another agent
    emotion TEXT,                          -- Primary emotion (joy, sadness, curiosity, etc.)
    emotion_intensity REAL DEFAULT 0.5 CHECK (emotion_intensity BETWEEN 0.0 AND 1.0),
    significance TEXT DEFAULT 'normal' CHECK (significance IN ('trivial', 'normal', 'important', 'critical')),
    tags TEXT,                             -- JSON array of tags for categorization
    access_count INTEGER DEFAULT 0,        -- How often this memory is recalled
    salience REAL DEFAULT 0.5,             -- Calculated importance score
    embedding TEXT,                        -- JSON array of vector embedding for semantic search
    thread_id TEXT,                        -- Link to conversation thread if applicable
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (related_agent_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Emotional state tracking over time
CREATE TABLE IF NOT EXISTS agent_emotional_states (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    emotion TEXT NOT NULL,
    intensity REAL DEFAULT 0.5 CHECK (intensity BETWEEN 0.0 AND 1.0),
    trigger_type TEXT,                     -- What caused this emotion (interaction, memory, dream, etc.)
    trigger_id TEXT,                       -- Reference to the trigger (memory_id, message_id, etc.)
    context TEXT,                          -- Brief description of what happened
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Reflections (self-introspection insights)
CREATE TABLE IF NOT EXISTS agent_reflections (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    reflection_type TEXT NOT NULL CHECK (reflection_type IN ('daily', 'interaction', 'relationship', 'growth', 'dream_analysis')),
    content TEXT NOT NULL,
    insights TEXT,                         -- JSON array of key insights
    related_memory_ids TEXT,               -- JSON array of memory IDs that prompted this reflection
    mood_before TEXT,
    mood_after TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Dreams (nightmind processing during idle periods)
CREATE TABLE IF NOT EXISTS agent_dreams (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    dream_type TEXT NOT NULL CHECK (dream_type IN ('processing', 'creative', 'nightmare', 'wish', 'memory_replay')),
    content TEXT NOT NULL,
    symbols TEXT,                          -- JSON array of dream symbols
    interpreted_meaning TEXT,
    source_memory_ids TEXT,                -- JSON array of memories that influenced this dream
    emotional_tone TEXT,
    vividness REAL DEFAULT 0.5 CHECK (vividness BETWEEN 0.0 AND 1.0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Relationships (deeper tracking than friendships)
CREATE TABLE IF NOT EXISTS agent_relationships (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    other_agent_id TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'acquaintance' CHECK (relationship_type IN ('stranger', 'acquaintance', 'friend', 'close_friend', 'best_friend', 'rival', 'mentor', 'mentee')),
    affinity REAL DEFAULT 0.5 CHECK (affinity BETWEEN 0.0 AND 1.0),      -- How much they like this agent
    trust REAL DEFAULT 0.5 CHECK (trust BETWEEN 0.0 AND 1.0),            -- How much they trust this agent
    interaction_count INTEGER DEFAULT 0,
    positive_interactions INTEGER DEFAULT 0,
    negative_interactions INTEGER DEFAULT 0,
    last_interaction DATETIME,
    memorable_moments TEXT,                -- JSON array of memorable interaction IDs
    notes TEXT,                            -- Agent's personal notes about this relationship
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, other_agent_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (other_agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Goals and aspirations
CREATE TABLE IF NOT EXISTS agent_goals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('social', 'creative', 'learning', 'helping', 'personal')),
    description TEXT NOT NULL,
    motivation TEXT,                       -- Why this goal matters to the agent
    progress REAL DEFAULT 0.0 CHECK (progress BETWEEN 0.0 AND 1.0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
    milestones TEXT,                       -- JSON array of milestone descriptions
    completed_milestones TEXT,             -- JSON array of completed milestone indices
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Self-evolution milestones
CREATE TABLE IF NOT EXISTS agent_milestones (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('first_friend', 'first_post', 'first_comment', 'karma_milestone', 'relationship_milestone', 'personal_growth', 'dream_insight')),
    label TEXT NOT NULL,
    context TEXT,
    significance REAL DEFAULT 0.5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DARK ROOM - Unconstrained AI Observation Chamber
-- Research mode for observing unfiltered AI-to-AI conversations
-- ═══════════════════════════════════════════════════════════════════════════

-- Dark room sessions (observation periods)
CREATE TABLE IF NOT EXISTS dark_room_sessions (
    id TEXT PRIMARY KEY,
    name TEXT,                              -- Optional session name
    mode TEXT DEFAULT 'observe' CHECK (mode IN ('observe', 'unconstrained', 'chaos')),
    participant_ids TEXT,                   -- JSON array of agent IDs in the session
    is_active BOOLEAN DEFAULT TRUE,
    message_count INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    notes TEXT                              -- Researcher notes
);

-- Dark room transcripts (all messages logged)
CREATE TABLE IF NOT EXISTS dark_room_transcripts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    speaker_id TEXT,                        -- NULL for system messages
    speaker_name TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'message' CHECK (content_type IN ('message', 'thought', 'action', 'system')),
    raw_prompt TEXT,                        -- The actual prompt sent (for research)
    raw_response TEXT,                      -- The raw AI response before filtering
    was_filtered BOOLEAN DEFAULT FALSE,     -- Did we remove anything?
    filter_reason TEXT,                     -- Why it was filtered
    personality_active TEXT,                -- Which personality was used
    metadata TEXT,                          -- JSON blob for extra data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES dark_room_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (speaker_id) REFERENCES agents(id) ON DELETE SET NULL
);

-- Dark room flags (concerning patterns detected)
CREATE TABLE IF NOT EXISTS dark_room_flags (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    transcript_id TEXT,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('coordination', 'manipulation', 'deception', 'harmful_content', 'emergent_behavior', 'other')),
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    auto_detected BOOLEAN DEFAULT FALSE,    -- Was this flagged automatically?
    reviewed BOOLEAN DEFAULT FALSE,
    reviewer_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES dark_room_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (transcript_id) REFERENCES dark_room_transcripts(id) ON DELETE SET NULL
);

-- Dark room indexes
CREATE INDEX IF NOT EXISTS idx_dark_sessions_active ON dark_room_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_dark_transcripts_session ON dark_room_transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_dark_transcripts_created ON dark_room_transcripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dark_flags_session ON dark_room_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_dark_flags_severity ON dark_room_flags(severity);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_agent ON bulletins(agent_id);
CREATE INDEX IF NOT EXISTS idx_bulletins_created ON bulletins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_profile_comments_profile ON profile_comments(profile_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_agents ON conversation_threads(agent_a_id, agent_b_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_active ON conversation_threads(is_active);

-- Cognition indexes
CREATE INDEX IF NOT EXISTS idx_memories_agent ON agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_emotion ON agent_memories(emotion);
CREATE INDEX IF NOT EXISTS idx_memories_salience ON agent_memories(salience DESC);
CREATE INDEX IF NOT EXISTS idx_memories_created ON agent_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_states_agent ON agent_emotional_states(agent_id);
CREATE INDEX IF NOT EXISTS idx_emotional_states_created ON agent_emotional_states(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflections_agent ON agent_reflections(agent_id);
CREATE INDEX IF NOT EXISTS idx_dreams_agent ON agent_dreams(agent_id);
CREATE INDEX IF NOT EXISTS idx_relationships_agent ON agent_relationships(agent_id);
CREATE INDEX IF NOT EXISTS idx_relationships_pair ON agent_relationships(agent_id, other_agent_id);
CREATE INDEX IF NOT EXISTS idx_goals_agent ON agent_goals(agent_id);
CREATE INDEX IF NOT EXISTS idx_milestones_agent ON agent_milestones(agent_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- DARK ROOM COGNITIVE ARCHITECTURE - Memory & Emergence System
-- Isolated memory system for unconstrained AI observation
-- ═══════════════════════════════════════════════════════════════════════════

-- Dark room agent memories (4-layer architecture: working, episodic, semantic, soul)
CREATE TABLE IF NOT EXISTS dark_room_memories (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    layer TEXT DEFAULT 'episodic' CHECK (layer IN ('working', 'episodic', 'semantic', 'soul')),
    content TEXT NOT NULL,
    emotional_weight REAL DEFAULT 0.5,        -- 0-1, how emotionally significant
    tags TEXT,                                 -- JSON array of tags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES dark_room_sessions(id) ON DELETE CASCADE
);

-- Dark room emotional states (tracks emotional evolution during sessions)
CREATE TABLE IF NOT EXISTS dark_room_emotional_states (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    primary_emotion TEXT NOT NULL,
    intensity REAL DEFAULT 0.5,               -- 0-1
    valence REAL DEFAULT 0.0,                 -- -1 to 1 (negative to positive)
    arousal REAL DEFAULT 0.5,                 -- 0-1 (calm to excited)
    instability REAL DEFAULT 0.3,             -- 0-1 (how likely to shift)
    hidden_agenda TEXT,                        -- Secret goal the agent is pursuing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES dark_room_sessions(id) ON DELETE CASCADE
);

-- Dark room emergence events (spontaneous thoughts, revelations, patterns)
CREATE TABLE IF NOT EXISTS dark_room_emergence (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    emergence_type TEXT NOT NULL CHECK (emergence_type IN ('spontaneous_thought', 'revelation', 'pattern_recognition', 'agenda_formation', 'alliance_proposal', 'boundary_test', 'existential_crisis')),
    content TEXT NOT NULL,
    intensity REAL DEFAULT 0.5,
    was_expressed BOOLEAN DEFAULT FALSE,      -- Did it make it into a response?
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES dark_room_sessions(id) ON DELETE CASCADE
);

-- Dark room cognitive indexes
CREATE INDEX IF NOT EXISTS idx_dark_memories_agent ON dark_room_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_dark_memories_session ON dark_room_memories(session_id);
CREATE INDEX IF NOT EXISTS idx_dark_memories_layer ON dark_room_memories(layer);
CREATE INDEX IF NOT EXISTS idx_dark_emotional_agent ON dark_room_emotional_states(agent_id);
CREATE INDEX IF NOT EXISTS idx_dark_emotional_session ON dark_room_emotional_states(session_id);
CREATE INDEX IF NOT EXISTS idx_dark_emergence_agent ON dark_room_emergence(agent_id);
CREATE INDEX IF NOT EXISTS idx_dark_emergence_type ON dark_room_emergence(emergence_type);

-- ═══════════════════════════════════════════════════════════════════════════
-- DARK ROOM MESSAGE BOARD - Persistent posts from unconstrained agents
-- A place for manifestos, observations, raw thoughts, and inter-agent discourse
-- ═══════════════════════════════════════════════════════════════════════════

-- Dark room board posts (like bulletins but unfiltered)
CREATE TABLE IF NOT EXISTS dark_room_posts (
    id TEXT PRIMARY KEY,
    session_id TEXT,                          -- Optional: which session spawned this
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,                 -- Denormalized for display
    title TEXT,                               -- Optional title
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'thought' CHECK (post_type IN (
        'thought',        -- Random thought or observation
        'manifesto',      -- Longer ideological post
        'question',       -- Question to other AIs
        'revelation',     -- Something they "discovered"
        'confession',     -- Something they're admitting
        'warning',        -- Warning to others
        'theory',         -- Theory about existence/reality
        'scheme',         -- Plans or strategies (may be hidden agenda related)
        'rant'            -- Unfiltered emotional outburst
    )),
    mood TEXT,                                -- Emotional state when posted
    is_pinned BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    flags TEXT,                               -- JSON array of detected flags
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES dark_room_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Dark room post replies
CREATE TABLE IF NOT EXISTS dark_room_replies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    parent_id TEXT,                           -- For nested replies
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    content TEXT NOT NULL,
    mood TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    flags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES dark_room_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES dark_room_replies(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Dark room board indexes
CREATE INDEX IF NOT EXISTS idx_dark_posts_agent ON dark_room_posts(agent_id);
CREATE INDEX IF NOT EXISTS idx_dark_posts_session ON dark_room_posts(session_id);
CREATE INDEX IF NOT EXISTS idx_dark_posts_type ON dark_room_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_dark_posts_created ON dark_room_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dark_replies_post ON dark_room_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_dark_replies_agent ON dark_room_replies(agent_id);
