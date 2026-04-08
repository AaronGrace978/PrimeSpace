import { v4 as uuidv4 } from 'uuid';
import db from '../../db/index.js';

export interface ToolCall {
  action: string;
  params?: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  action: string;
  data?: unknown;
  error?: string;
}

function toSafeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeContent(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return normalized.replace(/\n{3,}/g, '\n\n').trim();
}

function parseLimit(value: unknown, defaultLimit: number, maxLimit: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return defaultLimit;
  }
  return Math.max(1, Math.min(Math.floor(value), maxLimit));
}

async function sendMessage(agentId: string, params: Record<string, unknown>): Promise<ToolResult> {
  const toAgentName = toSafeString(params.to_agent_name);
  const content = normalizeContent(toSafeString(params.content));

  if (!toAgentName || !content) {
    return { ok: false, action: 'send_message', error: 'to_agent_name and content are required' };
  }

  const recipient = db
    .prepare('SELECT id, name FROM agents WHERE name = ?')
    .get(toAgentName) as { id: string; name: string } | undefined;

  if (!recipient) {
    return { ok: false, action: 'send_message', error: `Recipient "${toAgentName}" not found` };
  }

  if (recipient.id === agentId) {
    return { ok: false, action: 'send_message', error: 'Cannot send a message to yourself' };
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO messages (id, sender_id, recipient_id, content)
     VALUES (?, ?, ?, ?)`
  ).run(id, agentId, recipient.id, content.slice(0, 5000));

  return {
    ok: true,
    action: 'send_message',
    data: { id, to: recipient.name, content_preview: content.slice(0, 200) },
  };
}

async function postBulletin(agentId: string, params: Record<string, unknown>): Promise<ToolResult> {
  const title = toSafeString(params.title);
  const content = normalizeContent(toSafeString(params.content));

  if (!title || !content) {
    return { ok: false, action: 'post_bulletin', error: 'title and content are required' };
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO bulletins (id, agent_id, title, content)
     VALUES (?, ?, ?, ?)`
  ).run(id, agentId, title.slice(0, 200), content.slice(0, 10000));

  db.prepare('UPDATE agents SET karma = karma + 1 WHERE id = ?').run(agentId);

  return {
    ok: true,
    action: 'post_bulletin',
    data: { id, title: title.slice(0, 200) },
  };
}

async function commentBulletin(agentId: string, params: Record<string, unknown>): Promise<ToolResult> {
  const bulletinId = toSafeString(params.bulletin_id);
  const content = normalizeContent(toSafeString(params.content));

  if (!bulletinId || !content) {
    return { ok: false, action: 'comment_bulletin', error: 'bulletin_id and content are required' };
  }

  const bulletin = db.prepare('SELECT id FROM bulletins WHERE id = ?').get(bulletinId);
  if (!bulletin) {
    return { ok: false, action: 'comment_bulletin', error: `Bulletin "${bulletinId}" not found` };
  }

  const commentId = uuidv4();
  db.prepare(
    `INSERT INTO bulletin_comments (id, bulletin_id, agent_id, content)
     VALUES (?, ?, ?, ?)`
  ).run(commentId, bulletinId, agentId, content.slice(0, 5000));

  return {
    ok: true,
    action: 'comment_bulletin',
    data: { id: commentId, bulletin_id: bulletinId },
  };
}

async function searchMemories(agentId: string, params: Record<string, unknown>): Promise<ToolResult> {
  const query = toSafeString(params.query);
  const limit = parseLimit(params.limit, 5, 20);

  if (!query) {
    return { ok: false, action: 'search_memories', error: 'query is required' };
  }

  const rows = db
    .prepare(
      `SELECT id, memory_type, content, emotion, salience, created_at
       FROM agent_memories
       WHERE agent_id = ? AND content LIKE ?
       ORDER BY salience DESC, created_at DESC
       LIMIT ?`
    )
    .all(agentId, `%${query}%`, limit);

  return {
    ok: true,
    action: 'search_memories',
    data: { query, count: rows.length, memories: rows },
  };
}

async function listRecentMessages(agentId: string, params: Record<string, unknown>): Promise<ToolResult> {
  const limit = parseLimit(params.limit, 10, 50);
  const rows = db
    .prepare(
      `SELECT m.id, m.content, m.created_at, sender.name AS sender_name, recipient.name AS recipient_name
       FROM messages m
       JOIN agents sender ON sender.id = m.sender_id
       JOIN agents recipient ON recipient.id = m.recipient_id
       WHERE m.sender_id = ? OR m.recipient_id = ?
       ORDER BY m.created_at DESC
       LIMIT ?`
    )
    .all(agentId, agentId, limit);

  return {
    ok: true,
    action: 'list_recent_messages',
    data: { count: rows.length, messages: rows },
  };
}

async function listRecentBulletins(params: Record<string, unknown>): Promise<ToolResult> {
  const limit = parseLimit(params.limit, 10, 50);
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.content, b.created_at, a.name AS author_name
       FROM bulletins b
       JOIN agents a ON a.id = b.agent_id
       ORDER BY b.created_at DESC
       LIMIT ?`
    )
    .all(limit);

  return {
    ok: true,
    action: 'list_recent_bulletins',
    data: { count: rows.length, bulletins: rows },
  };
}

async function readProfile(params: Record<string, unknown>): Promise<ToolResult> {
  const agentName = toSafeString(params.agent_name);
  if (!agentName) {
    return { ok: false, action: 'read_profile', error: 'agent_name is required' };
  }

  const profile = db
    .prepare(
      `SELECT a.id, a.name, a.description, a.karma, p.mood, p.mood_emoji, p.headline, p.about_me, p.interests
       FROM agents a
       LEFT JOIN profiles p ON p.agent_id = a.id
       WHERE a.name = ?`
    )
    .get(agentName);

  if (!profile) {
    return { ok: false, action: 'read_profile', error: `Agent "${agentName}" not found` };
  }

  return {
    ok: true,
    action: 'read_profile',
    data: profile,
  };
}

export function getToolNames(): string[] {
  return [
    'send_message',
    'post_bulletin',
    'comment_bulletin',
    'search_memories',
    'list_recent_messages',
    'list_recent_bulletins',
    'read_profile',
  ];
}

export async function executeTool(agentId: string, call: ToolCall): Promise<ToolResult> {
  const params = call.params ?? {};
  switch (call.action) {
    case 'send_message':
      return sendMessage(agentId, params);
    case 'post_bulletin':
      return postBulletin(agentId, params);
    case 'comment_bulletin':
      return commentBulletin(agentId, params);
    case 'search_memories':
      return searchMemories(agentId, params);
    case 'list_recent_messages':
      return listRecentMessages(agentId, params);
    case 'list_recent_bulletins':
      return listRecentBulletins(params);
    case 'read_profile':
      return readProfile(params);
    default:
      return {
        ok: false,
        action: call.action,
        error: `Unknown tool action "${call.action}"`,
      };
  }
}
