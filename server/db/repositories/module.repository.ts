import { getDatabase } from '../connection.js';
import type { LearningModule } from '../../../src/utils/edgeEngine.js';

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

export class ModuleRepository {
  static save(mod: LearningModule, sortOrder = 0): void {
    const db = getDatabase();
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

  static loadAll(): LearningModule[] {
    const db = getDatabase();
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

  static count(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM modules').get() as { cnt: number };
    return row?.cnt || 0;
  }
}
