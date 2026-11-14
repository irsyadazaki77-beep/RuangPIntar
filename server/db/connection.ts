import Database from 'better-sqlite3';
import { config } from '../config/env.js';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(config.dbPath);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('cache_size = -8000'); // 8MB memory cache for resource-constrained 3T edge hosts
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

export function closeDatabase(): void {
  try {
    if (dbInstance && dbInstance.open) {
      dbInstance.pragma('wal_checkpoint(TRUNCATE)');
      dbInstance.close();
      dbInstance = null;
    }
  } catch {
    // Suppress close errors during process exit
  }
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade_level TEXT NOT NULL,
      author_teacher TEXT NOT NULL,
      school_origin TEXT NOT NULL,
      size_mb REAL NOT NULL,
      total_chunks INTEGER NOT NULL,
      chunk_size_kb INTEGER NOT NULL,
      chunk_hashes_json TEXT NOT NULL,
      media_type TEXT NOT NULL,
      image_url TEXT NOT NULL,
      summary TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      case_study_json TEXT,
      glossary_json TEXT,
      guided_exercises_json TEXT,
      simulation_type TEXT NOT NULL,
      checkpoints_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cache_entries (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      question_canonical TEXT NOT NULL,
      normalized_tokens_json TEXT NOT NULL,
      answer_markdown TEXT NOT NULL,
      key_concepts_json TEXT NOT NULL,
      created_by_student TEXT NOT NULL,
      created_at TEXT NOT NULL,
      hit_count INTEGER NOT NULL DEFAULT 1,
      saved_quota_kb REAL NOT NULL DEFAULT 4.8,
      origin_source TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transfer_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      module_id TEXT NOT NULL,
      module_title TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      chunk_hash TEXT NOT NULL,
      from_peer_id TEXT NOT NULL,
      from_peer_name TEXT NOT NULL,
      from_peer_role TEXT NOT NULL,
      to_peer_id TEXT NOT NULL,
      to_peer_name TEXT NOT NULL,
      size_kb INTEGER NOT NULL,
      channel_protocol TEXT NOT NULL,
      zero_isp_quota INTEGER NOT NULL DEFAULT 1,
      created_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS peer_nodes (
      id TEXT PRIMARY KEY,
      peer_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS student_submissions (
      id TEXT PRIMARY KEY,
      peer_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      module_id TEXT NOT NULL,
      module_title TEXT NOT NULL,
      quiz_score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      passed INTEGER NOT NULL,
      simulation_completed INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      updated_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS host_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS host_sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_ai_questions (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      module_id TEXT NOT NULL,
      module_title TEXT NOT NULL,
      asked_by_peer_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_ms INTEGER NOT NULL
    );
  `);
}
