import type { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  normalizeQuestion,
  findBestCacheMatch,
  validateQuestionSubmission,
  type LearningModule,
  type CacheEntry,
  type TutorAskResponse,
} from '../../src/utils/edgeEngine.js';
import { classroomState, formatTimeWITA } from '../state/classroomState.js';
import { config } from '../config/env.js';

export function buildCurriculumSynthesis(
  question: string,
  mod: LearningModule
): {
  answerMarkdown: string;
  keyConcepts: string[];
} {
  const sec = mod.sections[0];
  const sec2 = mod.sections[1] || mod.sections[0];
  const formulaLine = sec?.formula ? `\n\n**Rumus & Hubungan Kuantitatif:**\n\`${sec.formula}\`` : '';
  const answerMarkdown =
    `Berdasarkan modul **${mod.title}** (${mod.subject} · ${mod.schoolOrigin}):\n\n` +
    `**1. Penjelasan Konsep Utama (${sec.heading}):**\n${sec.body}` +
    `${formulaLine}\n\n` +
    `**2. Penerapan Lapangan di Wilayah 3T:**\n${sec.keyTakeaway}\n\n` +
    `**3. Kaitan Lanjutan (${sec2.heading}):**\n${sec2.keyTakeaway}\n\n` +
    `*Catatan Konteks Pertanyaan ("${question.trim()}"):* Jawaban ini telah disimpan ke dalam **Cache Lokal Simpul Guru** sehingga rekan sekelas yang menanyakan topik serupa akan langsung dilayani dari memori lokal dengan konsumsi kuota internet **0 KB**.`;

  return {
    answerMarkdown,
    keyConcepts: [
      mod.subject,
      sec.heading.replace(/^\d+\.\s*/, ''),
      'Distribusi Edge Lokal 3T',
    ],
  };
}

export interface GeminiGatewayResult {
  answerMarkdown: string;
  keyConcepts: string[];
  quotaBytesUsed: number;
}

export interface GeminiGatewayOutcome {
  result: GeminiGatewayResult | null;
  errorReason?: string;
}

function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number })?.status;
  if (status && (status === 429 || status >= 500)) return true;
  return /429|500|502|503|504|ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(msg);
}

export async function queryGeminiGateway(
  question: string,
  selectedModule: LearningModule
): Promise<GeminiGatewayOutcome> {
  const apiKey = config.geminiApiKey;
  const hasConfiguredKey =
    Boolean(apiKey) && apiKey !== 'MY_GEMINI_API_KEY' && apiKey!.trim().length > 10;
  if (!classroomState.isGatewayTetheringOnline()) {
    return { result: null, errorReason: 'Gateway tethering guru sedang offline.' };
  }
  if (!hasConfiguredKey) {
    return { result: null, errorReason: 'GEMINI_API_KEY belum dikonfigurasi pada Simpul Guru.' };
  }

  const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction =
    `Anda adalah Tutor AI RuangPintar Edge yang beroperasi di Simpul Lokal (Edge Gateway) Laptop Guru untuk membantu siswa SMA/SMK di wilayah 3T (Tertinggal, Terdepan, Terluar) Indonesia.\n\n` +
    `Konteks Modul Saat Ini:\n- Judul: "${selectedModule.title}"\n- Bidang Studi: ${selectedModule.subject} (${selectedModule.gradeLevel})\n- Ringkasan: ${selectedModule.summary}\n\n` +
    `Prinsip Respon Pembelajaran:\n` +
    `1. Efisien & Padat: Langsung ke inti materi tanpa kalimat basa-basi pembuka/penutup untuk menghemat kuota satelit.\n` +
    `2. Kontekstual Wilayah 3T: Hubungkan konsep sains/teknik dengan analogi nyata di desa, kepulauan, dan pesisir Indonesia.\n` +
    `3. Struktur Wajib: Bagi penjelasan menjadi 3 bagian: (a) Konsep Inti, (b) Rumus & Contoh Perhitungan Konkret bila ada, (c) Penerapan Lapangan di Daerah 3T.`;

  const maxAttempts = 3;
  let lastErrorMsg = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: question.trim(),
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answerMarkdown: {
                type: Type.STRING,
                description: 'Jawaban lengkap terstruktur dalam format Markdown.',
              },
              keyConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 konsep kunci utama dari jawaban.',
              },
            },
          },
        },
      });

      const rawText = (geminiResponse.text ?? '').trim();
      if (!rawText) {
        return { result: null, errorReason: 'Model Gemini mengembalikan respons kosong.' };
      }

      const parsed = JSON.parse(rawText);
      const answerMarkdown = parsed.answerMarkdown || rawText;
      const keyConcepts =
        Array.isArray(parsed.keyConcepts) && parsed.keyConcepts.length > 0
          ? parsed.keyConcepts.slice(0, 4)
          : [selectedModule.subject, 'Gateway Gemini Cloud', 'Cache Lokal Guru'];
      const quotaBytesUsed = Buffer.byteLength(question + answerMarkdown, 'utf8');
      classroomState.incrementCloudQueriesCount();
      return { result: { answerMarkdown, keyConcepts, quotaBytesUsed } };
    } catch (err: unknown) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts && isRetryableGeminiError(err)) {
        const delayMs = 350 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      console.warn(`[RuangPintar AI Gateway] Fallback ke sintesis lokal: ${lastErrorMsg}`);
      return { result: null, errorReason: lastErrorMsg };
    }
  }

  return { result: null, errorReason: lastErrorMsg || 'Koneksi Gemini Cloud terputus.' };
}

export class AiController {
  public static async askQuestion(req: Request, res: Response): Promise<void> {
    if (classroomState.getClassroomBroadcast()?.examMode) {
      res.status(403).json({
        ok: false,
        error:
          'Mode Ujian sedang diaktifkan oleh Guru. Sahabat Belajar AI dikunci sementara selama evaluasi berlangsung.',
      });
      return;
    }

    const {
      question = '',
      moduleId = 'mod-fisika-mikrohidro',
      askedByPeerName = 'Hendrikus D. (Peer 05)',
      forceCloudRefresh = false,
    } = req.body || {};

    const validation = validateQuestionSubmission(question, moduleId);
    if (!validation.valid) {
      res.status(400).json({ ok: false, error: validation.error });
      return;
    }

    const modules = classroomState.getModules();
    const cacheEntries = classroomState.getCacheEntries();
    const selectedModule = modules.find((m) => m.id === moduleId) || modules[0];

    // Step 1: Check Teacher Host Local Semantic Cache first (unless forceCloudRefresh)
    if (!forceCloudRefresh) {
      const match = findBestCacheMatch(question, selectedModule.id, cacheEntries);
      if (match) {
        match.entry.hitCount += 1;
        const savedKB = 4.8;
        match.entry.savedQuotaKB = Number((match.entry.savedQuotaKB + savedKB).toFixed(1));
        classroomState.addCacheEntry(match.entry);

        const result: TutorAskResponse = {
          queryId: `q-${Date.now()}`,
          question: question.trim(),
          askedByPeerName,
          moduleId: selectedModule.id,
          answerMarkdown: match.entry.answerMarkdown,
          keyConcepts: match.entry.keyConcepts,
          source: 'LOCAL_CACHE',
          similarityScore: match.similarityScore,
          matchedCanonicalQuestion: match.entry.questionCanonical,
          latencyMs: 0,
          ispQuotaBytesUsed: 0,
          ispQuotaKBaved: savedKB,
          cacheEntryId: match.entry.id,
          timestamp: formatTimeWITA(),
        };

        classroomState.addRecentQuery(result);
        classroomState.broadcastDelta('cache', {
          cacheEntries: classroomState.getCacheEntries(),
          recentQueries: classroomState.getFullState().recentQueries,
        });
        res.json({ result, state: classroomState.getFullState() });
        return;
      }
    }

    // Step 2: Cache Miss -> Route via Teacher Host Single-Gateway Cloud AI (Gemini 4 Hydrogen) if tethering is online
    const startTime = Date.now();
    const cloudOutcome = await queryGeminiGateway(question, selectedModule);
    const cloudResult = cloudOutcome.result;

    let answerMarkdown: string;
    let keyConcepts: string[];
    let responseSource: 'CLOUD_GEMINI_GATEWAY' | 'LOCAL_EDGE_SYNTHESIS';
    let quotaBytesUsed = 0;

    if (cloudResult) {
      answerMarkdown = cloudResult.answerMarkdown;
      keyConcepts = cloudResult.keyConcepts;
      quotaBytesUsed = cloudResult.quotaBytesUsed;
      responseSource = 'CLOUD_GEMINI_GATEWAY';
    } else {
      const fallback = buildCurriculumSynthesis(question, selectedModule);
      answerMarkdown = fallback.answerMarkdown;
      keyConcepts = fallback.keyConcepts;
      responseSource = 'LOCAL_EDGE_SYNTHESIS';

      // Queue question for batch processing when Teacher Host gets internet signal
      classroomState.addPendingAiQuestion({
        id: `pq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: question.trim(),
        moduleId: selectedModule.id,
        moduleTitle: selectedModule.title,
        askedByPeerName,
        createdAt: formatTimeWITA(),
        createdMs: Date.now(),
      });
    }

    const latencyMs =
      responseSource === 'CLOUD_GEMINI_GATEWAY' ? Math.max(120, Date.now() - startTime) : 4;

    // Step 3: Store new answer in the Teacher Host's Local SQLite Cache for all future classmates!
    const newCacheEntry: CacheEntry = {
      id: `cache-${Date.now()}`,
      moduleId: selectedModule.id,
      subject: selectedModule.subject,
      questionCanonical: question.trim(),
      normalizedTokens: normalizeQuestion(question),
      answerMarkdown,
      keyConcepts,
      createdByStudent: askedByPeerName,
      createdAt: formatTimeWITA(),
      hitCount: 1,
      savedQuotaKB: 4.8,
      originSource:
        responseSource === 'CLOUD_GEMINI_GATEWAY'
          ? 'GEMINI_CLOUD_GATEWAY'
          : 'LOCAL_EDGE_SYNTHESIS',
    };

    classroomState.addCacheEntry(newCacheEntry);

    const result: TutorAskResponse = {
      queryId: `q-${Date.now()}`,
      question: question.trim(),
      askedByPeerName,
      moduleId: selectedModule.id,
      answerMarkdown,
      keyConcepts,
      source: responseSource,
      similarityScore: 1,
      matchedCanonicalQuestion: newCacheEntry.questionCanonical,
      latencyMs,
      ispQuotaBytesUsed: quotaBytesUsed,
      ispQuotaKBaved: 0,
      cacheEntryId: newCacheEntry.id,
      timestamp: formatTimeWITA(),
    };

    classroomState.addRecentQuery(result);
    classroomState.broadcastDelta('cache', {
      cacheEntries: classroomState.getCacheEntries(),
      recentQueries: classroomState.getFullState().recentQueries,
      pendingAiQuestions: classroomState.getPendingAiQuestions(),
    });
    res.json({
      result,
      cloudErrorReason: cloudOutcome.errorReason,
      state: classroomState.getFullState(),
    });
  }

  public static async processPendingQueue(_req: Request, res: Response): Promise<void> {
    if (!classroomState.isGatewayTetheringOnline()) {
      res.status(400).json({
        ok: false,
        error: 'Aktifkan Gateway Tethering Guru terlebih dahulu sebelum memproses antrean pertanyaan.',
      });
      return;
    }

    const pending = [...classroomState.getPendingAiQuestions()];
    if (pending.length === 0) {
      res.json({
        ok: true,
        processedCount: 0,
        results: [],
        message: 'Tidak ada antrean pertanyaan offline yang menunggu.',
        state: classroomState.getFullState(),
      });
      return;
    }

    const modules = classroomState.getModules();
    let processedCount = 0;
    const results: Array<{
      id: string;
      question: string;
      status: 'processed' | 'failed';
      error?: string;
    }> = [];

    for (const item of pending) {
      const mod = modules.find((m) => m.id === item.moduleId) || modules[0];
      const cloudOutcome = await queryGeminiGateway(item.question, mod);
      if (cloudOutcome.result) {
        const entry: CacheEntry = {
          id: `cache-batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          moduleId: mod.id,
          subject: mod.subject,
          questionCanonical: item.question,
          normalizedTokens: normalizeQuestion(item.question),
          answerMarkdown: cloudOutcome.result.answerMarkdown,
          keyConcepts: cloudOutcome.result.keyConcepts,
          createdByStudent: item.askedByPeerName,
          createdAt: formatTimeWITA(),
          hitCount: 1,
          savedQuotaKB: 4.8,
          originSource: 'GEMINI_CLOUD_GATEWAY',
        };
        classroomState.addCacheEntry(entry);
        classroomState.removePendingAiQuestion(item.id);
        processedCount++;
        results.push({ id: item.id, question: item.question, status: 'processed' });
      } else {
        results.push({
          id: item.id,
          question: item.question,
          status: 'failed',
          error: cloudOutcome.errorReason || 'Gagal terhubung ke Gemini Cloud.',
        });
      }
    }

    classroomState.broadcastDelta('cache', {
      cacheEntries: classroomState.getCacheEntries(),
      pendingAiQuestions: classroomState.getPendingAiQuestions(),
    });
    res.json({
      ok: true,
      processedCount,
      remainingCount: classroomState.getPendingAiQuestions().length,
      results,
      message:
        processedCount > 0
          ? `${processedCount} pertanyaan antrean berhasil dijawab oleh Gemini 4 Hydrogen dan disimpan ke Cache Lokal!`
          : 'Gemini API tidak tersedia atau belum dikonfigurasi (cek GEMINI_API_KEY di .env).',
      state: classroomState.getFullState(),
    });
  }

  public static dismissPendingQuestion(req: Request, res: Response): void {
    const id = String(req.params.id || '').trim();
    if (!id) {
      res.status(400).json({ ok: false, error: 'ID pertanyaan wajib diisi.' });
      return;
    }
    const removed = classroomState.removePendingAiQuestion(id);
    if (removed) {
      classroomState.broadcastDelta('pending_ai', classroomState.getPendingAiQuestions());
    }
    res.json({ ok: true, removed, state: classroomState.getFullState() });
  }

  public static seedCache(req: Request, res: Response): void {
    const {
      moduleId = 'mod-fisika-mikrohidro',
      questionCanonical = '',
      answerMarkdown = '',
      keyConcepts = [],
    } = req.body || {};

    if (!questionCanonical || questionCanonical.trim().length < 5) {
      res.status(400).json({ ok: false, error: 'Pertanyaan kanonik wajib diisi minimal 5 karakter.' });
      return;
    }
    if (!answerMarkdown || answerMarkdown.trim().length < 10) {
      res.status(400).json({ ok: false, error: 'Jawaban materi cache wajib diisi minimal 10 karakter.' });
      return;
    }

    const modules = classroomState.getModules();
    const mod = modules.find((m) => m.id === moduleId) || modules[0];
    const newEntry: CacheEntry = {
      id: `cache-prewarm-${Date.now()}`,
      moduleId: mod.id,
      subject: mod.subject,
      questionCanonical: questionCanonical.trim(),
      normalizedTokens: normalizeQuestion(questionCanonical),
      answerMarkdown: answerMarkdown.trim(),
      keyConcepts:
        Array.isArray(keyConcepts) && keyConcepts.length > 0
          ? keyConcepts
          : [mod.subject, 'Pre-warm Guru', 'Bebas Kuota'],
      createdByStudent: 'Simpul Guru (Pre-warm Lokal)',
      createdAt: formatTimeWITA(),
      hitCount: 1,
      savedQuotaKB: 5.2,
      originSource: 'TEACHER_PREWARM',
    };

    classroomState.addCacheEntry(newEntry);
    classroomState.broadcastDelta('cache', {
      cacheEntries: classroomState.getCacheEntries(),
    });
    res.status(201).json({ ok: true, entry: newEntry, state: classroomState.getFullState() });
  }

  public static updateCacheEntry(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    const existing = classroomState.getCacheEntries().find((c) => c.id === id);
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Entri cache lokal tidak ditemukan.' });
      return;
    }

    const body = (req.validatedBody ?? req.body) as {
      moduleId?: string;
      questionCanonical?: string;
      answerMarkdown?: string;
      keyConcepts?: string[];
    };

    const modules = classroomState.getModules();
    const targetMod = body.moduleId
      ? modules.find((m) => m.id === body.moduleId) || modules[0]
      : modules.find((m) => m.id === existing.moduleId);

    const nextQuestion = body.questionCanonical ? body.questionCanonical.trim() : existing.questionCanonical;
    const updated: CacheEntry = {
      ...existing,
      moduleId: targetMod ? targetMod.id : existing.moduleId,
      subject: targetMod ? targetMod.subject : existing.subject,
      questionCanonical: nextQuestion,
      normalizedTokens: normalizeQuestion(nextQuestion),
      answerMarkdown: body.answerMarkdown ? body.answerMarkdown.trim() : existing.answerMarkdown,
      keyConcepts:
        Array.isArray(body.keyConcepts) && body.keyConcepts.length > 0
          ? body.keyConcepts
          : existing.keyConcepts,
    };

    classroomState.updateCacheEntry(id, updated);
    classroomState.broadcastDelta('cache', {
      cacheEntries: classroomState.getCacheEntries(),
    });
    res.json({ ok: true, entry: updated, state: classroomState.getFullState() });
  }

  public static deleteCacheEntry(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    if (!id) {
      res.status(400).json({ ok: false, error: 'ID entri cache wajib diisi.' });
      return;
    }
    const deleted = classroomState.deleteCacheEntry(id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: 'Entri cache lokal tidak ditemukan.' });
      return;
    }
    classroomState.broadcastDelta('cache', {
      cacheEntries: classroomState.getCacheEntries(),
    });
    res.json({ ok: true, deleted: true, id, state: classroomState.getFullState() });
  }
}
