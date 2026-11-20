import { z } from 'zod';

/**
 * Skema validasi progres & pengumpulan kuis siswa (ProgressSyncSchema)
 * Memvalidasi parameter wajib studentId, moduleId, score (0-100),
 * completedChapters, serta timestamp, tanpa fallback dummy.
 */
export const ProgressSyncSchema = z.object({
  studentId: z
    .string({ message: 'studentId wajib berupa string' })
    .trim()
    .min(1, 'studentId wajib diisi'),
  moduleId: z
    .string({ message: 'moduleId wajib berupa string' })
    .trim()
    .min(1, 'moduleId wajib diisi'),
  score: z
    .number({ message: 'score wajib berupa angka (0-100)' })
    .min(0, 'Skor minimal adalah 0')
    .max(100, 'Skor maksimal adalah 100')
    .default(0),
  completedChapters: z
    .array(z.union([z.string().trim().min(1), z.number().int().min(0)]), {
      message: 'completedChapters wajib berupa array daftar bab yang diselesaikan',
    })
    .default([]),
  timestamp: z
    .union([
      z.string().trim().min(1, 'timestamp tidak boleh kosong'),
      z.number().int().positive('timestamp harus berupa angka positif'),
    ])
    .default(() => new Date().toISOString()),
  // Parameter tambahan kompatibilitas buku nilai (Gradebook)
  peerId: z.string().trim().min(1).optional(),
  studentName: z.string().trim().min(1).optional(),
  avatar: z.string().trim().min(1).optional(),
  moduleTitle: z.string().trim().min(1).optional(),
  quizScore: z.number().min(0).optional(),
  totalQuestions: z.number().int().min(1).optional(),
  passed: z.boolean().optional(),
  simulationCompleted: z.boolean().optional(),
  // Kriptografi identitas perangkat (ECDSA P-256) anti-pemalsuan
  clientSignature: z.string().trim().optional(),
  clientPublicKey: z.string().trim().optional(),
});

export type ProgressSyncPayload = z.infer<typeof ProgressSyncSchema>;

/**
 * Skema validasi transfer paket / pecahan modul P2P (TransferPackageSchema)
 * Menghilangkan nilai fallback statis 'mod-fisika-mikrohidro' dan 'peer-siswa-05'.
 */
export const TransferPackageSchema = z.object({
  moduleId: z
    .string({ message: 'moduleId wajib berupa string' })
    .trim()
    .min(1, 'moduleId wajib diisi'),
  targetPeerId: z
    .string({ message: 'targetPeerId wajib berupa string' })
    .trim()
    .min(1, 'targetPeerId wajib diisi'),
  chunksCount: z
    .number({ message: 'chunksCount wajib berupa angka bulat' })
    .int()
    .min(1, 'Minimal transfer 1 pecahan (chunk)')
    .max(64, 'Maksimal transfer 64 pecahan (chunk)')
    .default(4),
  sourcePeerId: z.string().trim().min(1).optional(),
});

export type TransferPackagePayload = z.infer<typeof TransferPackageSchema>;

/**
 * Skema validasi sinkronisasi daftar chunk yang dimiliki simpul klien (ClientChunksSyncSchema)
 */
export const ClientChunksSyncSchema = z.object({
  peerId: z
    .string({ message: 'peerId wajib berupa string' })
    .trim()
    .min(1, 'peerId wajib diisi'),
  moduleChunks: z.record(
    z.string().trim().min(1),
    z.array(z.number().int().min(0))
  ),
});

export type ClientChunksSyncPayload = z.infer<typeof ClientChunksSyncSchema>;

/**
 * Skema validasi impor paket Sneakernet (.json)
 */
export const SneakernetImportSchema = z
  .object({
    version: z.string().trim().optional(),
    exportedAt: z.string().trim().optional(),
    modules: z.array(z.record(z.string(), z.unknown())).optional(),
    cacheEntries: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .refine(
    (data) => Array.isArray(data.modules) || Array.isArray(data.cacheEntries),
    {
      message: 'Paket data Sneakernet harus memiliki minimal daftar modules atau cacheEntries.',
      path: ['modules'],
    }
  );

export type SneakernetImportPayload = z.infer<typeof SneakernetImportSchema>;

/**
 * Skema distribusi massal 1 modul ke seluruh siswa terhubung
 */
export const DistributeAllSchema = z.object({
  moduleId: z.string({ message: 'moduleId wajib berupa string' }).trim().min(1, 'moduleId wajib diisi'),
});

export type DistributeAllPayload = z.infer<typeof DistributeAllSchema>;

/**
 * Skema pengumuman kelas, arahkan modul fokus, dan mode ujian dari Guru
 */
export const ClassroomBroadcastSchema = z.object({
  message: z.string().trim().max(280, 'Pengumuman maksimal 280 karakter').default(''),
  focusModuleId: z.string().trim().optional(),
  examMode: z.boolean().default(false),
  clear: z.boolean().optional(),
});

export type ClassroomBroadcastPayload = z.infer<typeof ClassroomBroadcastSchema>;

/**
 * Skema pengiriman pesan forum diskusi lokal per modul
 */
export const DiscussionCreateSchema = z.object({
  moduleId: z.string({ message: 'moduleId wajib berupa string' }).trim().min(1, 'moduleId wajib diisi'),
  authorName: z
    .string({ message: 'authorName wajib berupa string' })
    .trim()
    .min(1, 'Nama pengirim wajib diisi')
    .max(80, 'Nama pengirim maksimal 80 karakter'),
  authorRole: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
  avatar: z.string().trim().min(1).default('🎓'),
  message: z
    .string({ message: 'Pesan diskusi wajib diisi' })
    .trim()
    .min(3, 'Pesan diskusi minimal 3 karakter')
    .max(800, 'Pesan diskusi maksimal 800 karakter'),
  // Kriptografi identitas perangkat (ECDSA P-256) anti-pemalsuan
  clientSignature: z.string().trim().optional(),
  clientPublicKey: z.string().trim().optional(),
});

export type DiscussionCreatePayload = z.infer<typeof DiscussionCreateSchema>;

export const ModuleSectionSchema = z.object({
  heading: z.string().trim().min(3, 'Judul bab minimal 3 karakter').max(160),
  body: z.string().trim().min(15, 'Isi materi bab minimal 15 karakter').max(8000),
  formula: z.string().trim().max(240).optional(),
  keyTakeaway: z.string().trim().min(5, 'Intisari bab minimal 5 karakter').max(500),
});

export const ModuleCheckpointSchema = z.object({
  question: z.string().trim().min(5, 'Pertanyaan kuis minimal 5 karakter').max(400),
  options: z
    .array(z.string().trim().min(1, 'Opsi jawaban wajib diisi').max(260))
    .min(2, 'Minimal 2 opsi jawaban')
    .max(5, 'Maksimal 5 opsi jawaban'),
  correctIndex: z.number().int().min(0).max(4),
  explanation: z.string().trim().min(5, 'Pembahasan jawaban minimal 5 karakter').max(500),
});

export const ModuleUpdateSchema = z.object({
  title: z.string().trim().min(5, 'Judul modul minimal 5 karakter').max(180).optional(),
  subject: z
    .enum([
      'Fisika Terapan',
      'Biologi Pesisir',
      'Matematika Maritim',
      'Teknik Energi',
      'Pertanian Lahan Kering',
      'Teknik Lingkungan',
    ])
    .optional(),
  gradeLevel: z.string().trim().min(3).max(80).optional(),
  authorTeacher: z.string().trim().min(2).max(120).optional(),
  schoolOrigin: z.string().trim().min(2).max(160).optional(),
  summary: z.string().trim().min(15, 'Ringkasan modul minimal 15 karakter').max(1000).optional(),
  sizeMB: z.number().min(2).max(200).optional(),
  simulationType: z
    .enum(['microhydro', 'mangrove', 'navigation', 'solar', 'agroforestry', 'desalination'])
    .optional(),
  sections: z.array(ModuleSectionSchema).min(1, 'Minimal 1 bab materi').max(12).optional(),
  checkpoints: z.array(ModuleCheckpointSchema).min(1, 'Minimal 1 soal kuis').max(20).optional(),
});

export type ModuleUpdatePayload = z.infer<typeof ModuleUpdateSchema>;

export const CacheEntryUpdateSchema = z.object({
  moduleId: z.string().trim().min(1).optional(),
  questionCanonical: z.string().trim().min(5, 'Pertanyaan kanonik minimal 5 karakter').max(400).optional(),
  answerMarkdown: z.string().trim().min(10, 'Jawaban cache minimal 10 karakter').max(8000).optional(),
  keyConcepts: z.array(z.string().trim().min(1).max(80)).max(6).optional(),
});

export type CacheEntryUpdatePayload = z.infer<typeof CacheEntryUpdateSchema>;

export const SubmissionUpdateSchema = z.object({
  quizScore: z.number().int().min(0).max(100).optional(),
  totalQuestions: z.number().int().min(1).max(100).optional(),
  passed: z.boolean().optional(),
  simulationCompleted: z.boolean().optional(),
});

export type SubmissionUpdatePayload = z.infer<typeof SubmissionUpdateSchema>;
