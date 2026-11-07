import Database from 'better-sqlite3';
import path from 'path';
import type {
  LearningModule,
  CacheEntry,
  ChunkTransferEvent,
  PeerNode,
} from './edgeEngine.ts';
import {
  INITIAL_MODULES,
  INITIAL_PEERS,
  INITIAL_TRANSFER_HISTORY,
  INITIAL_CACHE_ENTRIES,
} from './seedData.ts';

const DB_FILE = process.env.RUANGPINTAR_DB_PATH || path.resolve(process.cwd(), 'ruangpintar-edge.db');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize SQLite schema
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

  CREATE TABLE IF NOT EXISTS host_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

interface ModuleRow {
  id: string;
  code: string;
  title: string;
  subject: LearningModule['subject'];
  grade_level: string;
  author_teacher: string;
  school_origin: string;
  size_mb: number;
  total_chunks: number;
  chunk_size_kb: number;
  chunk_hashes_json: string;
  media_type: LearningModule['mediaType'];
  image_url: string;
  summary: string;
  sections_json: string;
  case_study_json: string | null;
  glossary_json: string | null;
  guided_exercises_json: string | null;
  simulation_type: LearningModule['simulationType'];
  checkpoints_json: string;
  updated_at: string;
  sort_order: number;
}

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

interface TransferLogRow {
  id: string;
  timestamp: string;
  module_id: string;
  module_title: string;
  chunk_index: number;
  chunk_hash: string;
  from_peer_id: string;
  from_peer_name: string;
  from_peer_role: 'HOST' | 'PEER';
  to_peer_id: string;
  to_peer_name: string;
  size_kb: number;
  channel_protocol: ChunkTransferEvent['channelProtocol'];
  zero_isp_quota: number;
  created_ms: number;
}

interface PeerRow {
  id: string;
  peer_json: string;
  sort_order: number;
}

export function saveModuleToDb(mod: LearningModule, sortOrder = 0): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO modules (
      id, code, title, subject, grade_level, author_teacher, school_origin,
      size_mb, total_chunks, chunk_size_kb, chunk_hashes_json, media_type,
      image_url, summary, sections_json, case_study_json, glossary_json,
      guided_exercises_json, simulation_type, checkpoints_json, updated_at, sort_order
    ) VALUES (
      @id, @code, @title, @subject, @grade_level, @author_teacher, @school_origin,
      @size_mb, @total_chunks, @chunk_size_kb, @chunk_hashes_json, @media_type,
      @image_url, @summary, @sections_json, @case_study_json, @glossary_json,
      @guided_exercises_json, @simulation_type, @checkpoints_json, @updated_at, @sort_order
    )
  `);

  stmt.run({
    id: mod.id,
    code: mod.code,
    title: mod.title,
    subject: mod.subject,
    grade_level: mod.gradeLevel,
    author_teacher: mod.authorTeacher,
    school_origin: mod.schoolOrigin,
    size_mb: mod.sizeMB,
    total_chunks: mod.totalChunks,
    chunk_size_kb: mod.chunkSizeKB,
    chunk_hashes_json: JSON.stringify(mod.chunkHashes),
    media_type: mod.mediaType,
    image_url: mod.imageUrl,
    summary: mod.summary,
    sections_json: JSON.stringify(mod.sections),
    case_study_json: mod.caseStudy ? JSON.stringify(mod.caseStudy) : null,
    glossary_json: mod.glossary ? JSON.stringify(mod.glossary) : null,
    guided_exercises_json: mod.guidedExercises ? JSON.stringify(mod.guidedExercises) : null,
    simulation_type: mod.simulationType,
    checkpoints_json: JSON.stringify(mod.checkpoints),
    updated_at: mod.updatedAt,
    sort_order: sortOrder,
  });
}

export function loadModulesFromDb(): LearningModule[] {
  const rows = db
    .prepare('SELECT * FROM modules ORDER BY sort_order ASC')
    .all() as ModuleRow[];

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    subject: r.subject,
    gradeLevel: r.grade_level,
    authorTeacher: r.author_teacher,
    schoolOrigin: r.school_origin,
    sizeMB: r.size_mb,
    totalChunks: r.total_chunks,
    chunkSizeKB: r.chunk_size_kb,
    chunkHashes: JSON.parse(r.chunk_hashes_json) as string[],
    mediaType: r.media_type,
    imageUrl: r.image_url,
    summary: r.summary,
    sections: JSON.parse(r.sections_json) as LearningModule['sections'],
    caseStudy: r.case_study_json
      ? (JSON.parse(r.case_study_json) as LearningModule['caseStudy'])
      : undefined,
    glossary: r.glossary_json
      ? (JSON.parse(r.glossary_json) as LearningModule['glossary'])
      : undefined,
    guidedExercises: r.guided_exercises_json
      ? (JSON.parse(r.guided_exercises_json) as LearningModule['guidedExercises'])
      : undefined,
    simulationType: r.simulation_type,
    checkpoints: JSON.parse(r.checkpoints_json) as LearningModule['checkpoints'],
    updatedAt: r.updated_at,
  }));
}

export function saveCacheEntryToDb(entry: CacheEntry, sortOrder = 0): void {
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

export function loadCacheEntriesFromDb(): CacheEntry[] {
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

export function insertTransferLogToDb(ev: ChunkTransferEvent, createdMs = Date.now()): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO transfer_logs (
      id, timestamp, module_id, module_title, chunk_index, chunk_hash,
      from_peer_id, from_peer_name, from_peer_role, to_peer_id, to_peer_name,
      size_kb, channel_protocol, zero_isp_quota, created_ms
    ) VALUES (
      @id, @timestamp, @module_id, @module_title, @chunk_index, @chunk_hash,
      @from_peer_id, @from_peer_name, @from_peer_role, @to_peer_id, @to_peer_name,
      @size_kb, @channel_protocol, @zero_isp_quota, @created_ms
    )
  `);

  stmt.run({
    id: ev.id,
    timestamp: ev.timestamp,
    module_id: ev.moduleId,
    module_title: ev.moduleTitle,
    chunk_index: ev.chunkIndex,
    chunk_hash: ev.chunkHash,
    from_peer_id: ev.fromPeerId,
    from_peer_name: ev.fromPeerName,
    from_peer_role: ev.fromPeerRole,
    to_peer_id: ev.toPeerId,
    to_peer_name: ev.toPeerName,
    size_kb: ev.sizeKB,
    channel_protocol: ev.channelProtocol,
    zero_isp_quota: ev.zeroIspQuota ? 1 : 0,
    created_ms: createdMs,
  });
}

export function loadTransferLogsFromDb(limit = 50): ChunkTransferEvent[] {
  const rows = db
    .prepare('SELECT * FROM transfer_logs ORDER BY created_ms DESC LIMIT ?')
    .all(limit) as TransferLogRow[];

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    moduleId: r.module_id,
    moduleTitle: r.module_title,
    chunkIndex: r.chunk_index,
    chunkHash: r.chunk_hash,
    fromPeerId: r.from_peer_id,
    fromPeerName: r.from_peer_name,
    fromPeerRole: r.from_peer_role,
    toPeerId: r.to_peer_id,
    toPeerName: r.to_peer_name,
    sizeKB: r.size_kb,
    channelProtocol: r.channel_protocol,
    zeroIspQuota: Boolean(r.zero_isp_quota),
  }));
}

export function savePeersToDb(peersList: PeerNode[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO peer_nodes (id, peer_json, sort_order)
    VALUES (@id, @peer_json, @sort_order)
  `);
  const tx = db.transaction((items: PeerNode[]) => {
    items.forEach((p, idx) => {
      stmt.run({
        id: p.id,
        peer_json: JSON.stringify(p),
        sort_order: idx,
      });
    });
  });
  tx(peersList);
}

export function loadPeersFromDb(): PeerNode[] {
  const rows = db
    .prepare('SELECT * FROM peer_nodes ORDER BY sort_order ASC')
    .all() as PeerRow[];

  return rows.map((r) => JSON.parse(r.peer_json) as PeerNode);
}

export function getHostConfig(key: string, defaultValue: string): string {
  const row = db
    .prepare('SELECT value FROM host_config WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function setHostConfig(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO host_config (key, value) VALUES (?, ?)').run(
    key,
    value
  );
}

export function exportSneakernetPackage(): {
  version: string;
  exportedAt: string;
  modules: LearningModule[];
  cacheEntries: CacheEntry[];
} {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    modules: loadModulesFromDb(),
    cacheEntries: loadCacheEntriesFromDb(),
  };
}

export function importSneakernetPackage(pkg: {
  modules?: LearningModule[];
  cacheEntries?: CacheEntry[];
}): { modules: LearningModule[]; cacheEntries: CacheEntry[]; modulesCount: number; cacheCount: number } {
  let modulesCount = 0;
  let cacheCount = 0;

  const tx = db.transaction(() => {
    if (Array.isArray(pkg.modules)) {
      pkg.modules.forEach((mod, idx) => {
        if (mod && mod.id && mod.title && mod.subject) {
          saveModuleToDb(mod, idx);
          modulesCount++;
        }
      });
    }

    if (Array.isArray(pkg.cacheEntries)) {
      pkg.cacheEntries.forEach((entry, idx) => {
        if (entry && entry.id && entry.questionCanonical && entry.answerMarkdown) {
          saveCacheEntryToDb(entry, idx);
          cacheCount++;
        }
      });
    }
  });

  tx();

  const loadedModules = loadModulesFromDb();
  const loadedCache = loadCacheEntriesFromDb();

  return {
    modules: loadedModules,
    cacheEntries: loadedCache,
    modulesCount,
    cacheCount,
  };
}

/**
 * Automatic database migration & initial seed if SQLite tables are empty.
 */
export function ensureDatabaseSeeded(): {
  modules: LearningModule[];
  peers: PeerNode[];
  transferHistory: ChunkTransferEvent[];
  cacheEntries: CacheEntry[];
  hostPin: string;
  gatewayTetheringOnline: boolean;
  cloudQueriesCount: number;
} {
  const modCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM modules').get() as { cnt: number }
  ).cnt;
  if (modCount === 0) {
    const tx = db.transaction(() => {
      INITIAL_MODULES.forEach((m, idx) => saveModuleToDb(m, idx));
    });
    tx();
  }

  const cacheCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM cache_entries').get() as { cnt: number }
  ).cnt;
  if (cacheCount === 0) {
    const tx = db.transaction(() => {
      INITIAL_CACHE_ENTRIES.forEach((c, idx) => saveCacheEntryToDb(c, idx));
    });
    tx();
  }

  const txLogCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM transfer_logs').get() as { cnt: number }
  ).cnt;
  if (txLogCount === 0) {
    const baseTime = Date.now() - INITIAL_TRANSFER_HISTORY.length * 1000;
    const tx = db.transaction(() => {
      INITIAL_TRANSFER_HISTORY.forEach((ev, idx) => {
        insertTransferLogToDb(ev, baseTime + (INITIAL_TRANSFER_HISTORY.length - idx) * 1000);
      });
    });
    tx();
  }

  const peerCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM peer_nodes').get() as { cnt: number }
  ).cnt;
  if (peerCount === 0) {
    savePeersToDb(INITIAL_PEERS);
  }

  const hostPin = getHostConfig('host_pin', process.env.HOST_PIN || '1945');
  setHostConfig('host_pin', hostPin);

  const tetheringStr = getHostConfig('gateway_tethering_online', 'true');
  setHostConfig('gateway_tethering_online', tetheringStr);

  const cloudQueriesStr = getHostConfig('cloud_queries_count', '4');
  setHostConfig('cloud_queries_count', cloudQueriesStr);

  return {
    modules: loadModulesFromDb(),
    peers: loadPeersFromDb(),
    transferHistory: loadTransferLogsFromDb(50),
    cacheEntries: loadCacheEntriesFromDb(),
    hostPin,
    gatewayTetheringOnline: tetheringStr === 'true',
    cloudQueriesCount: Number(cloudQueriesStr) || 4,
  };
}


export function closeDatabase(): void {
  try {
    if (db && db.open) {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    }
  } catch {
    // Ignore error if already closed
  }
}
