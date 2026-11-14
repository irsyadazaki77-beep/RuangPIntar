import { getDatabase } from '../connection.js';
import type { PendingAiQuestion } from '../../../src/utils/edgeEngine.js';

interface PendingQuestionRow {
  id: string;
  question: string;
  module_id: string;
  module_title: string;
  asked_by_peer_name: string;
  created_at: string;
  created_ms: number;
}

export class PendingQuestionRepository {
  static insert(item: PendingAiQuestion): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR REPLACE INTO pending_ai_questions (
        id, question, module_id, module_title, asked_by_peer_name, created_at, created_ms
      ) VALUES (
        @id, @question, @module_id, @module_title, @asked_by_peer_name, @created_at, @created_ms
      )
    `).run({
      id: item.id,
      question: item.question,
      module_id: item.moduleId,
      module_title: item.moduleTitle,
      asked_by_peer_name: item.askedByPeerName,
      created_at: item.createdAt,
      created_ms: item.createdMs,
    });
  }

  static loadAll(): PendingAiQuestion[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM pending_ai_questions ORDER BY created_ms DESC')
      .all() as PendingQuestionRow[];

    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      moduleId: r.module_id,
      moduleTitle: r.module_title,
      askedByPeerName: r.asked_by_peer_name,
      createdAt: r.created_at,
      createdMs: r.created_ms,
    }));
  }

  static remove(id: string): boolean {
    const db = getDatabase();
    const res = db.prepare('DELETE FROM pending_ai_questions WHERE id = ?').run(id);
    return res.changes > 0;
  }
}
