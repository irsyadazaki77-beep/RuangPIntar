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

export class AiController {
  public static async askQuestion(req: Request, res: Response): Promise<void> {
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
        classroomState.broadcastState();
        res.json({ result, state: classroomState.getFullState() });
        return;
      }
    }

    // Step 2: Cache Miss -> Route via Teacher Host Single-Gateway Cloud AI (Gemini) if tethering is online
    const startTime = Date.now();
    let answerMarkdown = '';
    let keyConcepts: string[] = [];
    let responseSource: 'CLOUD_GEMINI_GATEWAY' | 'LOCAL_EDGE_SYNTHESIS' = 'LOCAL_EDGE_SYNTHESIS';
    let quotaBytesUsed = 0;

    const apiKey = config.geminiApiKey;
    const hasConfiguredKey =
      Boolean(apiKey) && apiKey !== 'MY_GEMINI_API_KEY' && apiKey!.trim().length > 10;
    const gatewayTetheringOnline = classroomState.isGatewayTetheringOnline();

    if (gatewayTetheringOnline && hasConfiguredKey) {
      try {
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

        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
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
        if (rawText) {
          const parsed = JSON.parse(rawText);
          answerMarkdown = parsed.answerMarkdown || rawText;
          keyConcepts =
            Array.isArray(parsed.keyConcepts) && parsed.keyConcepts.length > 0
              ? parsed.keyConcepts.slice(0, 4)
              : [selectedModule.subject, 'Gateway Gemini Cloud', 'Cache Lokal Guru'];
          responseSource = 'CLOUD_GEMINI_GATEWAY';
          quotaBytesUsed = Buffer.byteLength(question + answerMarkdown, 'utf8');
          classroomState.incrementCloudQueriesCount();
        }
      } catch {
        // Fallback cleanly to local edge curriculum synthesis if network/key unavailable in sandbox
        const fallback = buildCurriculumSynthesis(question, selectedModule);
        answerMarkdown = fallback.answerMarkdown;
        keyConcepts = fallback.keyConcepts;
        responseSource = 'LOCAL_EDGE_SYNTHESIS';
        quotaBytesUsed = 0;
      }
    } else {
      const fallback = buildCurriculumSynthesis(question, selectedModule);
      answerMarkdown = fallback.answerMarkdown;
      keyConcepts = fallback.keyConcepts;
      responseSource = 'LOCAL_EDGE_SYNTHESIS';
      quotaBytesUsed = 0;
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
      originSource: 'GEMINI_CLOUD_GATEWAY',
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
    classroomState.broadcastState();
    res.json({ result, state: classroomState.getFullState() });
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
    classroomState.broadcastState();
    res.status(201).json({ ok: true, entry: newEntry, state: classroomState.getFullState() });
  }
}
