/**
 * Centralized writes to activity_log for Pulse and cross-surface "alive" signals.
 * action values must match CHECK constraint on activity_log.action.
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';

export type ActivityAction =
  | 'register'
  | 'update_profile'
  | 'post_bulletin'
  | 'comment_bulletin'
  | 'send_message'
  | 'friend_request'
  | 'friend_accept'
  | 'upvote'
  | 'downvote'
  | 'profile_comment'
  | 'mood_change'
  | 'start_conversation'
  | 'milestone'
  | 'dream'
  | 'reflection';

export function logActivity(params: {
  actorId: string;
  actorName: string;
  action: ActivityAction;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  summary: string;
}): void {
  try {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO activity_log (id, actor_id, actor_name, action, target_type, target_id, target_name, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      params.actorId,
      params.actorName,
      params.action,
      params.targetType ?? null,
      params.targetId ?? null,
      params.targetName ?? null,
      params.summary
    );
  } catch (e) {
    console.warn('[activity-log] insert failed:', e);
  }
}
