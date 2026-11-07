import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  normalizeQuestion,
  findBestCacheMatch,
  computeNextChunkTransfers,
  calculateSwarmMetrics,
  validateQuestionSubmission,
  validateModuleSubmission,
  type LearningModule,
  type PeerNode,
  type CacheEntry,
  type ChunkTransferEvent,
  type TutorAskResponse,
} from './src/utils/edgeEngine.ts';
import {
  INITIAL_MODULES,
  INITIAL_PEERS,
  INITIAL_TRANSFER_HISTORY,
  INITIAL_CACHE_ENTRIES,
} from './src/utils/seedData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-authoritative state on the Teacher Host Node
let modules: LearningModule[] = structuredClone(INITIAL_MODULES);
let peers: PeerNode[] = structuredClone(INITIAL_PEERS);
let transferHistory: ChunkTransferEvent[] = structuredClone(INITIAL_TRANSFER_HISTORY);
let cacheEntries: CacheEntry[] = structuredClone(INITIAL_CACHE_ENTRIES);
let recentQueries: TutorAskResponse[] = [
  {
    queryId: 'q-init-1',
    question: 'Bagaimana rumus menghitung daya listrik mikrohidro dari tinggi jatuh air dan debit sungai?',
    askedByPeerName: 'Hendrikus D. (Peer 05)',
    moduleId: 'mod-fisika-mikrohidro',
    answerMarkdown: INITIAL_CACHE_ENTRIES[0].answerMarkdown,
    keyConcepts: INITIAL_CACHE_ENTRIES[0].keyConcepts,
    source: 'LOCAL_CACHE',
    similarityScore: 0.94,
    matchedCanonicalQuestion: INITIAL_CACHE_ENTRIES[0].questionCanonical,
    latencyMs: 0,
    ispQuotaBytesUsed: 0,
    ispQuotaKBaved: 4.8,
    cacheEntryId: INITIAL_CACHE_ENTRIES[0].id,
    timestamp: '08:40:15 WITA',
  },
];
let cloudQueriesCount = 4; // Initial 4 cache entries were populated via single-gateway / prewarm
let gatewayTetheringOnline = true;

function formatTimeWITA(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} WITA`;
}

function getFullState() {
  const metrics = calculateSwarmMetrics(peers, transferHistory, cacheEntries, cloudQueriesCount);
  return {
    modules,
    peers,
    transferHistory: transferHistory.slice(0, 30),
    cacheEntries,
    recentQueries: recentQueries.slice(0, 15),
    metrics,
    gatewayTetheringOnline,
  };
}

function buildCurriculumSynthesis(question: string, mod: LearningModule): {
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

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json({ limit: '2mb' }));

  const clients = new Map<WebSocket, { clientId: string; peerId: string }>();

  function broadcastState() {
    const payload = JSON.stringify({
      type: 'state:sync',
      data: getFullState(),
    });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  wss.on('connection', (ws) => {
    const clientId = `rtc-${Math.random().toString(36).slice(2, 9)}`;
    clients.set(ws, { clientId, peerId: 'peer-siswa-05' });

    // Send initial authoritative state
    ws.send(
      JSON.stringify({
        type: 'init',
        clientId,
        data: getFullState(),
      })
    );

    // Notify other browser tabs so they can initiate real WebRTC DataChannel handshake
    for (const [otherWs, meta] of clients.entries()) {
      if (otherWs !== ws && otherWs.readyState === WebSocket.OPEN) {
        otherWs.send(
          JSON.stringify({
            type: 'webrtc:peer-joined',
            remoteClientId: clientId,
          })
        );
      }
      if (otherWs !== ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'webrtc:existing-peer',
            remoteClientId: meta.clientId,
          })
        );
      }
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        // Relay WebRTC SDP offers, answers, and ICE candidates between connected browser tabs
        if (
          msg.type === 'webrtc:offer' ||
          msg.type === 'webrtc:answer' ||
          msg.type === 'webrtc:ice'
        ) {
          for (const [targetWs, meta] of clients.entries()) {
            if (
              meta.clientId === msg.targetClientId &&
              targetWs.readyState === WebSocket.OPEN
            ) {
              targetWs.send(
                JSON.stringify({
                  ...msg,
                  fromClientId: clients.get(ws)?.clientId,
                })
              );
            }
          }
        }
      } catch {
        // Ignore malformed WS frames
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // GET authoritative classroom edge state
  app.get('/api/state', (_req, res) => {
    res.json(getFullState());
  });

  // POST P2P WebRTC Mesh chunk synchronization step
  app.post('/api/p2p/transfer-step', (req, res) => {
    const {
      moduleId = 'mod-fisika-mikrohidro',
      targetPeerId = 'peer-siswa-05',
      chunksCount = 4,
    } = req.body || {};

    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({ error: 'Modul pembelajaran tidak ditemukan di jaringan lokal.' });
      return;
    }

    const targetPeer = peers.find((p) => p.id === targetPeerId);
    if (!targetPeer) {
      res.status(404).json({ error: 'Simpul perangkat siswa tidak ditemukan.' });
      return;
    }

    const planned = computeNextChunkTransfers(
      mod,
      targetPeerId,
      peers,
      Math.min(16, Math.max(1, Number(chunksCount) || 4))
    );

    const createdEvents: ChunkTransferEvent[] = [];

    for (const item of planned) {
      const targetHeld = targetPeer.moduleChunks[mod.id] || [];
      if (!targetHeld.includes(item.chunkIndex)) {
        targetHeld.push(item.chunkIndex);
        targetHeld.sort((a, b) => a - b);
        targetPeer.moduleChunks[mod.id] = targetHeld;
      }

      const mbDelta = item.sizeKB / 1024;
      targetPeer.downloadedMB = Number((targetPeer.downloadedMB + mbDelta).toFixed(2));

      const sourcePeer = peers.find((p) => p.id === item.fromPeerId);
      if (sourcePeer) {
        sourcePeer.uploadedMB = Number((sourcePeer.uploadedMB + mbDelta).toFixed(2));
      }

      const ev: ChunkTransferEvent = {
        id: `tx-${Date.now()}-${item.chunkIndex}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: formatTimeWITA(),
        moduleId: mod.id,
        moduleTitle: mod.title,
        chunkIndex: item.chunkIndex,
        chunkHash: mod.chunkHashes[item.chunkIndex] || `chk-${item.chunkIndex}`,
        fromPeerId: item.fromPeerId,
        fromPeerName: item.fromPeerName,
        fromPeerRole: item.fromPeerRole,
        toPeerId: item.toPeerId,
        toPeerName: item.toPeerName,
        sizeKB: item.sizeKB,
        channelProtocol: 'WebRTC DataChannel (SCTP)',
        zeroIspQuota: true,
      };
      createdEvents.push(ev);
      transferHistory.unshift(ev);
    }

    broadcastState();
    res.json({
      transferredCount: createdEvents.length,
      events: createdEvents,
      state: getFullState(),
    });
  });

  // POST Reset a student peer's chunks for a module to replay P2P mesh downloading
  app.post('/api/p2p/reset-peer', (req, res) => {
    const { moduleId = 'mod-fisika-mikrohidro', targetPeerId = 'peer-siswa-05' } = req.body || {};
    const targetPeer = peers.find((p) => p.id === targetPeerId && p.role === 'PEER');
    if (!targetPeer) {
      res.status(400).json({ error: 'Hanya simpul siswa (PEER) yang dapat direset pecahan datanya.' });
      return;
    }

    targetPeer.moduleChunks[moduleId] = [];
    broadcastState();
    res.json({ state: getFullState() });
  });

  // POST Toggle Teacher Host Cellular Tethering Gateway status
  app.post('/api/gateway/toggle', (req, res) => {
    if (typeof req.body?.online === 'boolean') {
      gatewayTetheringOnline = req.body.online;
    } else {
      gatewayTetheringOnline = !gatewayTetheringOnline;
    }
    broadcastState();
    res.json({ gatewayTetheringOnline, state: getFullState() });
  });

  // POST Single-Gateway Cloud AI Tutor with Local Smart Cache
  app.post('/api/tutor/ask', async (req, res) => {
    const {
      question = '',
      moduleId = 'mod-fisika-mikrohidro',
      askedByPeerName = 'Hendrikus D. (Peer 05)',
      forceCloudRefresh = false,
    } = req.body || {};

    const validation = validateQuestionSubmission(question, moduleId);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const selectedModule = modules.find((m) => m.id === moduleId) || modules[0];

    // Step 1: Check Teacher Host Local Semantic Cache first (unless forceCloudRefresh)
    if (!forceCloudRefresh) {
      const match = findBestCacheMatch(question, selectedModule.id, cacheEntries);
      if (match) {
        match.entry.hitCount += 1;
        const savedKB = 4.8;
        match.entry.savedQuotaKB = Number((match.entry.savedQuotaKB + savedKB).toFixed(1));

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

        recentQueries.unshift(result);
        broadcastState();
        res.json({ result, state: getFullState() });
        return;
      }
    }

    // Step 2: Cache Miss -> Route via Teacher Host Single-Gateway Cloud AI (Gemini) if tethering is online
    const startTime = Date.now();
    let answerMarkdown = '';
    let keyConcepts: string[] = [];
    let responseSource: 'CLOUD_GEMINI_GATEWAY' | 'LOCAL_EDGE_SYNTHESIS' = 'LOCAL_EDGE_SYNTHESIS';
    let quotaBytesUsed = 0;

    const apiKey = process.env.GEMINI_API_KEY;
    const hasConfiguredKey =
      Boolean(apiKey) && apiKey !== 'MY_GEMINI_API_KEY' && apiKey!.trim().length > 10;

    if (gatewayTetheringOnline && hasConfiguredKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const systemInstruction =
          `Anda adalah Tutor AI RuangPintar Edge yang berjalan pada server lokal Laptop Guru untuk membantu siswa SMA/SMK di wilayah 3T (Tertinggal, Terdepan, Terluar) Indonesia. ` +
          `Konteks modul saat ini: "${selectedModule.title}" (${selectedModule.subject}). ` +
          `Ringkasan modul: ${selectedModule.summary}. ` +
          `Jawablah pertanyaan siswa dalam Bahasa Indonesia yang jelas, terstruktur, kontekstual dengan kondisi lapangan kepulauan/desa di Indonesia, dan sertakan rumus atau langkah praktis bila relevan.`;

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
          keyConcepts = Array.isArray(parsed.keyConcepts) && parsed.keyConcepts.length > 0
            ? parsed.keyConcepts.slice(0, 4)
            : [selectedModule.subject, 'Gateway Gemini Cloud', 'Cache Lokal Guru'];
          responseSource = 'CLOUD_GEMINI_GATEWAY';
          quotaBytesUsed = Buffer.byteLength(question + answerMarkdown, 'utf8');
          cloudQueriesCount += 1;
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

    const latencyMs = responseSource === 'CLOUD_GEMINI_GATEWAY'
      ? Math.max(120, Date.now() - startTime)
      : 4;

    // Step 3: Store new answer in the Teacher Host's Local Cache for all future classmates!
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

    cacheEntries.unshift(newCacheEntry);

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

    recentQueries.unshift(result);
    broadcastState();
    res.json({ result, state: getFullState() });
  });

  // POST Teacher Host publishes a new Learning Module to the P2P Swarm
  app.post('/api/modules', (req, res) => {
    const {
      title,
      subject,
      gradeLevel = 'Kelas XI SMA / SMK',
      authorTeacher = 'Ibu Wilhelmina K., S.Pd.',
      schoolOrigin = 'SMAN 1 Kalabahi — Kab. Alor, NTT',
      summary,
      sectionHeading = '01. Konsep Inti & Aplikasi Lapangan',
      sectionBody,
      formula = 'E_total = P_sistem × t_operasi',
      keyTakeaway = 'Pemanfaatan sumber daya lokal meningkatkan kemandirian energi dan ekosistem desa.',
      sizeMB = 24,
    } = req.body || {};

    const numSizeMB = Number(sizeMB);
    const validation = validateModuleSubmission({
      title,
      subject,
      gradeLevel,
      summary,
      sectionHeading,
      sectionBody,
      sizeMB: numSizeMB,
    });

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const totalChunks = 16;
    const chunkSizeKB = Math.max(256, Math.round((numSizeMB * 1024) / totalChunks));
    const chunkHashes = Array.from({ length: totalChunks }, (_, idx) =>
      `${Math.random().toString(16).slice(2, 6)}${String(idx).padStart(4, '0')}`
    );

    const newModule: LearningModule = {
      id: `mod-${Date.now()}`,
      code: `MOD-3T-${String(modules.length + 1).padStart(2, '0')}`,
      title: title.trim(),
      subject: subject as LearningModule['subject'],
      gradeLevel: gradeLevel.trim(),
      authorTeacher: authorTeacher.trim(),
      schoolOrigin: schoolOrigin.trim(),
      sizeMB: numSizeMB,
      totalChunks,
      chunkSizeKB,
      chunkHashes,
      mediaType: 'Modul Teks & Diagram',
      imageUrl: '/src/assets/images/module_microhydro_physics_1793880029053.jpg',
      summary: summary.trim(),
      sections: [
        {
          heading: sectionHeading.trim(),
          body: sectionBody.trim(),
          formula: formula.trim(),
          keyTakeaway: keyTakeaway.trim(),
        },
      ],
      simulationType: 'microhydro',
      checkpoints: [
        {
          question: `Apa tujuan utama dari penerapan materi "${title.trim()}" pada komunitas sekolah 3T?`,
          options: [
            keyTakeaway.trim(),
            'Meningkatkan ketergantungan pada kuota internet satelit komersial',
            'Mengurangi efisiensi perangkat lokal di ruang kelas',
            'Menghapus penyimpanan lokal pada simpul guru',
          ],
          correctIndex: 0,
          explanation: keyTakeaway.trim(),
        },
      ],
      updatedAt: `Dipublikasikan ${formatTimeWITA()} · Tersedia di Simpul Guru`,
    };

    modules.unshift(newModule);

    // Seed all 16 chunks on Teacher Host Node and first 4 chunks on Peer 01
    for (const p of peers) {
      if (p.role === 'HOST') {
        p.moduleChunks[newModule.id] = Array.from({ length: totalChunks }, (_, i) => i);
      } else if (p.id === 'peer-siswa-01') {
        p.moduleChunks[newModule.id] = [0, 1, 2, 3];
      } else {
        p.moduleChunks[newModule.id] = [];
      }
    }

    broadcastState();
    res.status(201).json({ module: newModule, state: getFullState() });
  });

  // POST Teacher pre-warms / adds a verified Q&A entry directly into the Local Cache
  app.post('/api/cache/seed', (req, res) => {
    const {
      moduleId = 'mod-fisika-mikrohidro',
      questionCanonical = '',
      answerMarkdown = '',
      keyConcepts = [],
    } = req.body || {};

    if (!questionCanonical || questionCanonical.trim().length < 5) {
      res.status(400).json({ error: 'Pertanyaan kanonik wajib diisi minimal 5 karakter.' });
      return;
    }
    if (!answerMarkdown || answerMarkdown.trim().length < 10) {
      res.status(400).json({ error: 'Jawaban materi cache wajib diisi minimal 10 karakter.' });
      return;
    }

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

    cacheEntries.unshift(newEntry);
    broadcastState();
    res.status(201).json({ entry: newEntry, state: getFullState() });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`RuangPintar Edge Host Node listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
