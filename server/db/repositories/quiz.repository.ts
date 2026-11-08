import { getDatabase } from '../connection.js';
import type { StudentSubmission } from '../../../src/utils/edgeEngine.js';

interface SubmissionRow {
  id: string;
  peer_id: string;
  student_name: string;
  avatar: string;
  module_id: string;
  module_title: string;
  quiz_score: number;
  total_questions: number;
  passed: number;
  simulation_completed: number;
  timestamp: string;
  updated_ms: number;
}

export class QuizRepository {
  static saveSubmission(sub: StudentSubmission): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO student_submissions (
        id, peer_id, student_name, avatar, module_id, module_title,
        quiz_score, total_questions, passed, simulation_completed,
        timestamp, updated_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sub.id,
      sub.peerId,
      sub.studentName,
      sub.avatar,
      sub.moduleId,
      sub.moduleTitle,
      sub.quizScore,
      sub.totalQuestions,
      sub.passed ? 1 : 0,
      sub.simulationCompleted ? 1 : 0,
      sub.timestamp,
      sub.updatedMs
    );
  }

  static loadSubmissions(limit = 100): StudentSubmission[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM student_submissions ORDER BY updated_ms DESC LIMIT ?')
      .all(limit) as SubmissionRow[];

    return rows.map((r) => ({
      id: r.id,
      peerId: r.peer_id,
      studentName: r.student_name,
      avatar: r.avatar,
      moduleId: r.module_id,
      moduleTitle: r.module_title,
      quizScore: r.quiz_score,
      totalQuestions: r.total_questions,
      passed: Boolean(r.passed),
      simulationCompleted: Boolean(r.simulation_completed),
      timestamp: r.timestamp,
      updatedMs: r.updated_ms,
    }));
  }

  static count(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM student_submissions').get() as { cnt: number };
    return row?.cnt || 0;
  }
}
