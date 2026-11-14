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
