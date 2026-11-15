import { getDatabase } from '../connection.js';
import type { ModuleDiscussionPost } from '../../../src/utils/edgeEngine.js';

interface DiscussionRow {
  id: string;
  module_id: string;
  author_name: string;
  author_role: string;
  avatar: string;
  message: string;
  is_pinned: number;
  created_at: string;
  created_ms: number;
}

export const DiscussionRepository = {
  listByModule(moduleId?: string): ModuleDiscussionPost[] {
    const db = getDatabase();
    const rows = moduleId
      ? (db
          .prepare(
            `SELECT * FROM module_discussions WHERE module_id = ? ORDER BY is_pinned DESC, created_ms DESC LIMIT 100`
          )
          .all(moduleId) as DiscussionRow[])
      : (db
          .prepare(`SELECT * FROM module_discussions ORDER BY is_pinned DESC, created_ms DESC LIMIT 100`)
          .all() as DiscussionRow[]);

    return rows.map((r) => ({
      id: r.id,
      moduleId: r.module_id,
      authorName: r.author_name,
      authorRole: r.author_role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
      avatar: r.avatar,
      message: r.message,
      isPinned: Boolean(r.is_pinned),
      createdAt: r.created_at,
      createdMs: r.created_ms,
    }));
  },

  insert(post: ModuleDiscussionPost): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO module_discussions (
        id, module_id, author_name, author_role, avatar, message, is_pinned, created_at, created_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      post.id,
      post.moduleId,
      post.authorName,
      post.authorRole,
      post.avatar,
      post.message,
      post.isPinned ? 1 : 0,
      post.createdAt,
      post.createdMs
    );
  },

  togglePin(id: string): ModuleDiscussionPost | null {
    const db = getDatabase();
    const row = db
      .prepare(`SELECT * FROM module_discussions WHERE id = ?`)
      .get(id) as DiscussionRow | undefined;
    if (!row) return null;

    const nextPinned = row.is_pinned ? 0 : 1;
    db.prepare(`UPDATE module_discussions SET is_pinned = ? WHERE id = ?`).run(nextPinned, id);
    return {
      id: row.id,
      moduleId: row.module_id,
      authorName: row.author_name,
      authorRole: row.author_role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
      avatar: row.avatar,
      message: row.message,
      isPinned: Boolean(nextPinned),
      createdAt: row.created_at,
      createdMs: row.created_ms,
    };
  },
};
