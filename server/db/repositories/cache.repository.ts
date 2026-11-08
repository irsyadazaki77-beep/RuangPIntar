import { getDatabase } from '../connection.js';
import type { CacheEntry } from '../../../src/utils/edgeEngine.js';

interface CacheEntryRow {
  id: string;
  module_id: string;
  subject: string;
  question_canonical: string;
  normalized_tokens_json: string;
  answer_markdown: string;
  key_concepts_json: string;
  created_by_student: string;
  created_at: string;
  hit_count: number;
  saved_quota_kb: number;
  origin_source: CacheEntry['originSource'];
  sort_order: number;
}

export class CacheRepository {
  static save(entry: CacheEntry, sortOrder = 0): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cache_entries (
        id, module_id, subject, question_canonical, normalized_tokens_json,
        answer_markdown, key_concepts_json, created_by_student, created_at,
        hit_count, saved_quota_kb, origin_source, sort_order
      ) VALUES (
        @id, @module_id, @subject, @question_canonical, @normalized_tokens_json,
        @answer_markdown, @key_concepts_json, @created_by_student, @created_at,
        @hit_count, @saved_quota_kb, @origin_source, @sort_order
      )
    `);

    stmt.run({
      id: entry.id,
      module_id: entry.moduleId,
      subject: entry.subject,
      question_canonical: entry.questionCanonical,
      normalized_tokens_json: JSON.stringify(entry.normalizedTokens),
      answer_markdown: entry.answerMarkdown,
      key_concepts_json: JSON.stringify(entry.keyConcepts),
      created_by_student: entry.createdByStudent,
      created_at: entry.createdAt,
      hit_count: entry.hitCount,
      saved_quota_kb: entry.savedQuotaKB,
      origin_source: entry.originSource,
      sort_order: sortOrder,
    });
  }

  static loadAll(): CacheEntry[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM cache_entries ORDER BY sort_order ASC')
      .all() as CacheEntryRow[];

    return rows.map((r) => ({
      id: r.id,
      moduleId: r.module_id,
      subject: r.subject,
      questionCanonical: r.question_canonical,
      normalizedTokens: JSON.parse(r.normalized_tokens_json) as string[],
      answerMarkdown: r.answer_markdown,
      keyConcepts: JSON.parse(r.key_concepts_json) as string[],
      createdByStudent: r.created_by_student,
      createdAt: r.created_at,
      hitCount: r.hit_count,
      savedQuotaKB: r.saved_quota_kb,
      originSource: r.origin_source,
    }));
  }

  static count(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM cache_entries').get() as { cnt: number };
    return row?.cnt || 0;
  }
}
