import express, { type Request, type Response, type NextFunction } from 'express';
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
  encodeBinaryChunkPayload,
  decodeBinaryChunkPayload,
  validateHostPinChange,
  type LearningModule,
  type PeerNode,
  type CacheEntry,
  type ChunkTransferEvent,
  type TutorAskResponse,
} from './src/utils/edgeEngine.ts';
import { INITIAL_CACHE_ENTRIES } from './src/utils/seedData.ts';
import {
  ensureDatabaseSeeded,
  saveModuleToDb,
  saveCacheEntryToDb,
  insertTransferLogToDb,
  savePeersToDb,
  setHostConfig,
} from './src/utils/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load or seed persistent SQLite state on the Teacher Host Node
const seeded = ensureDatabaseSeeded();
let modules: LearningModule[] = seeded.modules;
let peers: PeerNode[] = seeded.peers;
let transferHistory: ChunkTransferEvent[] = seeded.transferHistory;
let cacheEntries: CacheEntry[] = seeded.cacheEntries;
let hostPin: string = seeded.hostPin;
let gatewayTetheringOnline: boolean = seeded.gatewayTetheringOnline;
let cloudQueriesCount: number = seeded.cloudQueriesCount;

let recentQueries: TutorAskResponse[] = [
  {
    queryId: 'q-init-1',
    question: 'Bagaimana rumus menghitung daya listrik mikrohidro dari tinggi jatuh air dan debit sungai?',
    askedByPeerName: 'Hendrikus D. (Peer 05)',
    moduleId: 'mod-fisika-mikrohidro',
    answerMarkdown:
      cacheEntries[0]?.answerMarkdown || INITIAL_CACHE_ENTRIES[0].answerMarkdown,
    keyConcepts:
      cacheEntries[0]?.keyConcepts || INITIAL_CACHE_ENTRIES[0].keyConcepts,
    source: 'LOCAL_CACHE',
    similarityScore: 0.94,
    matchedCanonicalQuestion:
      cacheEntries[0]?.questionCanonical || INITIAL_CACHE_ENTRIES[0].questionCanonical,
    latencyMs: 0,
    ispQuotaBytesUsed: 0,
    ispQuotaKBaved: 4.8,
    cacheEntryId: cacheEntries[0]?.id || INITIAL_CACHE_ENTRIES[0].id,
    timestamp: '08:40:15 WITA',
  },
];

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

/**
 * Middleware: Requires valid `x-host-pin` header (or `hostPin` in request body)
 * to protect Teacher Host Node endpoints from unauthorized student toggling.
 */
function requireHostPin(req: Request, res: Response, next: NextFunction): void {
  const headerPin = req.header('x-host-pin');
  const bodyPin = typeof req.body?.hostPin === 'string' ? req.body.hostPin : undefined;
  const candidate = (headerPin || bodyPin || '').trim();

  if (!candidate || candidate !== hostPin) {
    res.status(401).json({
      error:
        'Akses ditolak: PIN Simpul Guru (x-host-pin) tidak valid atau belum diotorisasi. Masukkan PIN Simpul Guru (default: 1945).',
    });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
      // Do NOT destroy the socket for other paths/protocols (such as 'vite-hmr')
      // because Vite attaches its own 'upgrade' listener to `server`.
    } catch {
      // Ignore URL parse errors
    }
  });

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

    ws.on('message', (raw, isBinary) => {
      try {
        // Handle true binary ArrayBuffer/Buffer chunk frames sent over WebSocket or relayed from RTCDataChannel
        if (isBinary) {
          const buf = Buffer.isBuffer(raw)
            ? new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
            : new Uint8Array(raw as ArrayBuffer);
          const decoded = decodeBinaryChunkPayload(buf);
          if (decoded && decoded.valid) {
            // Relay binary frame to other connected peer tabs
            for (const [targetWs] of clients.entries()) {
              if (targetWs !== ws && targetWs.readyState === WebSocket.OPEN) {
                targetWs.send(buf, { binary: true });
              }
            }
          }
          return;
        }

        const msg = JSON.parse(String(raw));
        // Relay WebRTC SDP offers, answers, ICE candidates, and chunk requests between connected browser tabs
        if (
          msg.type === 'webrtc:offer' ||
          msg.type === 'webrtc:answer' ||
          msg.type === 'webrtc:ice' ||
          msg.type === 'webrtc:chunk-request'
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

  // POST Verify Teacher Host PIN
  app.post('/api/host/verify-pin', (req, res) => {
    const candidate = String(req.body?.pin || req.header('x-host-pin') || '').trim();
    if (candidate === hostPin) {
      res.json({ valid: true });
      return;
    }
    res.status(401).json({
      valid: false,
      error: 'PIN Simpul Guru salah. Gunakan PIN default 1945 atau PIN yang telah diperbarui.',
    });
  });

  // POST Change Teacher Host PIN
  app.post('/api/host/change-pin', (req, res) => {
    const currentPin = String(req.body?.currentPin || req.header('x-host-pin') || '').trim();
    const newPin = String(req.body?.newPin || '').trim();

    const validation = validateHostPinChange(currentPin, hostPin, newPin);
    if (!validation.valid) {
      res.status(400).json({ ok: false, error: validation.error });
      return;
    }

    hostPin = newPin;
    setHostConfig('host_pin', hostPin);
    res.json({
      ok: true,
      message: 'PIN Keamanan Simpul Guru berhasil diperbarui dan disimpan di SQLite lokal.',
    });
  });

  // POST Reconcile client IndexedDB downloaded chunks with server peer state on reload
  app.post('/api/p2p/sync-client-chunks', (req, res) => {
    const { peerId = 'peer-siswa-05', moduleChunks } = req.body || {};
    if (!moduleChunks || typeof moduleChunks !== 'object') {
      res.status(400).json({ error: 'Data pecahan modul klien tidak valid.' });
      return;
    }

    const targetPeer = peers.find((p) => p.id === peerId);
    if (!targetPeer) {
      res.status(404).json({ error: 'Simpul siswa tidak ditemukan.' });
      return;
    }

    let updated = false;
    for (const [modId, chunks] of Object.entries(moduleChunks as Record<string, number[]>)) {
      if (Array.isArray(chunks)) {
        const existing = new Set(targetPeer.moduleChunks[modId] || []);
        for (const idx of chunks) {
          if (typeof idx === 'number' && idx >= 0 && !existing.has(idx)) {
            existing.add(idx);
            updated = true;
          }
        }
        targetPeer.moduleChunks[modId] = Array.from(existing).sort((a, b) => a - b);
      }
    }

    if (updated) {
      savePeersToDb(peers);
      broadcastState();
    }

    res.json({ state: getFullState() });
  });

  // POST P2P WebRTC Mesh chunk synchronization step (with true binary payload encoding)
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
    const binaryPayloadsBase64: string[] = [];

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

      // Encode real binary chunk frame (RPE1 header + curriculum/simulation payload)
      const binaryFrame = encodeBinaryChunkPayload(
        mod,
        item.chunkIndex,
        item.fromPeerId,
        item.toPeerId
      );
      binaryPayloadsBase64.push(Buffer.from(binaryFrame).toString('base64'));

      // Also broadcast raw binary frame over WebSocket to connected peers
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(binaryFrame, { binary: true });
        }
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
      insertTransferLogToDb(ev, Date.now());
    }

    if (createdEvents.length > 0) {
      savePeersToDb(peers);
    }

    broadcastState();
    res.json({
      transferredCount: createdEvents.length,
      events: createdEvents,
      binaryPayloadsBase64,
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
    savePeersToDb(peers);
    broadcastState();
    res.json({ state: getFullState() });
  });

  // POST Toggle Teacher Host Cellular Tethering Gateway status (Protected by x-host-pin)
  app.post('/api/gateway/toggle', requireHostPin, (req, res) => {
    if (typeof req.body?.online === 'boolean') {
      gatewayTetheringOnline = req.body.online;
    } else {
      gatewayTetheringOnline = !gatewayTetheringOnline;
    }
    setHostConfig('gateway_tethering_online', String(gatewayTetheringOnline));
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
        saveCacheEntryToDb(match.entry, 0);

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
          setHostConfig('cloud_queries_count', String(cloudQueriesCount));
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

    cacheEntries.unshift(newCacheEntry);
    cacheEntries.forEach((c, idx) => saveCacheEntryToDb(c, idx));

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

  // POST Teacher Host publishes a new Learning Module to the P2P Swarm (Protected by x-host-pin)
  app.post('/api/modules', requireHostPin, (req, res) => {
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
    modules.forEach((m, idx) => saveModuleToDb(m, idx));

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
    savePeersToDb(peers);

    broadcastState();
    res.status(201).json({ module: newModule, state: getFullState() });
  });

  // POST Teacher pre-warms / adds a verified Q&A entry directly into the Local Cache (Protected by x-host-pin)
  app.post('/api/cache/seed', requireHostPin, (req, res) => {
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
    cacheEntries.forEach((c, idx) => saveCacheEntryToDb(c, idx));
    broadcastState();
    res.status(201).json({ entry: newEntry, state: getFullState() });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
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
