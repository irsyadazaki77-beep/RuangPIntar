import os from 'os';
import type { Request, Response } from 'express';
import {
  computeNextChunkTransfers,
  encodeBinaryChunkPayload,
  computeDeterministicChunkHash,
  validateModuleSubmission,
  type LearningModule,
  type ChunkTransferEvent,
  type StudentSubmission,
  type CacheEntry,
} from '../../src/utils/edgeEngine.js';
import { classroomState, formatTimeWITA } from '../state/classroomState.js';
import {
  QuizRepository,
  exportSneakernetPackage,
  importSneakernetPackage,
} from '../db/index.js';
import { config } from '../config/env.js';
import {
  ProgressSyncSchema,
  TransferPackageSchema,
  ClientChunksSyncSchema,
  type ProgressSyncPayload,
  type TransferPackagePayload,
  type ClientChunksSyncPayload,
} from '../schemas/sync.schema.js';

export class SyncController {
  public static getState(_req: Request, res: Response): void {
    res.json(classroomState.getFullState());
  }

  public static syncSubmission(req: Request, res: Response): void {
    const parsed: ProgressSyncPayload =
      (req.validatedBody as ProgressSyncPayload | undefined) ??
      ProgressSyncSchema.parse(req.body);

    const effectivePeerId = parsed.peerId || parsed.studentId;
    const effectiveStudentName = parsed.studentName || parsed.studentId;
    const totalQuestions = parsed.totalQuestions ?? 1;
    const quizScore =
      parsed.quizScore ?? Math.round((parsed.score / 100) * totalQuestions);
    const passed = parsed.passed ?? parsed.score >= 70;
    const simulationCompleted =
      parsed.simulationCompleted ?? parsed.completedChapters.length > 0;

    const sub: StudentSubmission = {
      id: `sub-${effectivePeerId}-${parsed.moduleId}`,
      peerId: effectivePeerId,
      studentName: effectiveStudentName,
      avatar: parsed.avatar || '🐬 Lumba-lumba',
      moduleId: parsed.moduleId,
      moduleTitle: parsed.moduleTitle || parsed.moduleId,
      quizScore,
      totalQuestions,
      passed,
      simulationCompleted,
      timestamp:
        typeof parsed.timestamp === 'string'
          ? parsed.timestamp
          : formatTimeWITA(),
      updatedMs:
        typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
    };

    QuizRepository.saveSubmission(sub);
    classroomState.broadcastState();
    res.json({
      ok: true,
      success: true,
      submission: sub,
      state: classroomState.getFullState(),
    });
  }

  public static syncClientChunks(req: Request, res: Response): void {
    const parsed: ClientChunksSyncPayload =
      (req.validatedBody as ClientChunksSyncPayload | undefined) ??
      ClientChunksSyncSchema.parse(req.body);

    const { peerId, moduleChunks } = parsed;

    const peers = classroomState.getPeers();
    const targetPeer = peers.find((p) => p.id === peerId);
    if (!targetPeer) {
      res.status(404).json({ ok: false, error: 'Simpul siswa tidak ditemukan.' });
      return;
    }

    let updated = false;
    for (const [modId, chunks] of Object.entries(moduleChunks)) {
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
      classroomState.savePeers();
      classroomState.broadcastState();
    }

    res.json({ ok: true, success: true, state: classroomState.getFullState() });
  }

  public static transferStep(req: Request, res: Response): void {
    const parsed: TransferPackagePayload =
      (req.validatedBody as TransferPackagePayload | undefined) ??
      TransferPackageSchema.parse(req.body);

    const { moduleId, targetPeerId, chunksCount } = parsed;

    const modules = classroomState.getModules();
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) {
      res.status(404).json({
        ok: false,
        error: 'Modul pembelajaran tidak ditemukan di jaringan lokal.',
      });
      return;
    }

    const peers = classroomState.getPeers();
    const targetPeer = peers.find((p) => p.id === targetPeerId);
    if (!targetPeer) {
      res.status(404).json({
        ok: false,
        error: 'Simpul perangkat siswa tidak ditemukan.',
      });
      return;
    }

    const planned = computeNextChunkTransfers(
      mod,
      targetPeerId,
      peers,
      Math.min(16, Math.max(1, chunksCount))
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
      classroomState.broadcastBinary(binaryFrame);

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
      classroomState.addTransferEvent(ev);
    }

    if (createdEvents.length > 0) {
      classroomState.savePeers();
    }

    classroomState.broadcastState();
    res.json({
      ok: true,
      success: true,
      transferredCount: createdEvents.length,
      events: createdEvents,
      binaryPayloadsBase64,
      state: classroomState.getFullState(),
    });
  }

  public static resetPeer(req: Request, res: Response): void {
    const parsed: TransferPackagePayload =
      (req.validatedBody as TransferPackagePayload | undefined) ??
      TransferPackageSchema.parse(req.body);

    const { moduleId, targetPeerId } = parsed;
    const peers = classroomState.getPeers();
    const targetPeer = peers.find((p) => p.id === targetPeerId && p.role === 'PEER');
    if (!targetPeer) {
      res.status(400).json({
        ok: false,
        error: 'Hanya simpul siswa (PEER) yang dapat direset pecahan datanya.',
      });
      return;
    }

    targetPeer.moduleChunks[moduleId] = [];
    classroomState.savePeers();
    classroomState.broadcastState();
    res.json({ ok: true, success: true, state: classroomState.getFullState() });
  }

  public static exportPackage(_req: Request, res: Response): void {
    const pkg = exportSneakernetPackage();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ruangpintar-sneakernet-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json(pkg);
  }

  public static importPackage(req: Request, res: Response): void {
    const pkg = (req.validatedBody ?? req.body) as {
      modules?: LearningModule[];
      cacheEntries?: CacheEntry[];
    };
    if (!pkg || typeof pkg !== 'object') {
      res.status(400).json({ ok: false, error: 'Paket data Sneakernet tidak valid atau kosong.' });
      return;
    }

    try {
      const result = importSneakernetPackage(pkg);
      classroomState.setModules(result.modules);
      classroomState.setCacheEntries(result.cacheEntries);

      const peers = classroomState.getPeers();
      for (const mod of result.modules) {
        for (const p of peers) {
          if (p.role === 'HOST' && (!p.moduleChunks[mod.id] || p.moduleChunks[mod.id].length === 0)) {
            p.moduleChunks[mod.id] = Array.from({ length: mod.totalChunks }, (_, i) => i);
          }
        }
      }
      classroomState.savePeers();
      classroomState.broadcastState();

      res.json({
        ok: true,
        success: true,
        message: `Berhasil mengimpor ${result.modulesCount} modul kurikulum dan ${result.cacheCount} cache tanya-jawab ke Simpul Guru!`,
        state: classroomState.getFullState(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memproses impor paket data.';
      res.status(500).json({ ok: false, error: message });
    }
  }

  public static toggleGateway(req: Request, res: Response): void {
    let nextOnline: boolean;
    if (typeof req.body?.online === 'boolean') {
      nextOnline = req.body.online;
    } else {
      nextOnline = !classroomState.isGatewayTetheringOnline();
    }
    classroomState.setGatewayTetheringOnline(nextOnline);
    classroomState.broadcastState();
    res.json({ ok: true, gatewayTetheringOnline: nextOnline, state: classroomState.getFullState() });
  }

  public static publishModule(req: Request, res: Response): void {
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
      res.status(400).json({ ok: false, error: validation.error });
      return;
    }

    const totalChunks = 16;
    const chunkSizeKB = Math.max(256, Math.round((numSizeMB * 1024) / totalChunks));
    const chunkHashes = Array.from({ length: totalChunks }, (_, idx) =>
      computeDeterministicChunkHash(title.trim(), idx, summary.trim())
    );

    const modules = classroomState.getModules();
    const subjectSimMap: Record<
      string,
      { sim: LearningModule['simulationType']; fallbackImg: string }
    > = {
      'Teknik Energi': {
        sim: 'solar',
        fallbackImg:
          modules.find((m) => m.subject === 'Teknik Energi')?.imageUrl ||
          '/src/assets/images/module_solar_lifepo4_1794013783706.jpg',
      },
      'Biologi Pesisir': {
        sim: 'mangrove',
        fallbackImg:
          modules.find((m) => m.subject === 'Biologi Pesisir')?.imageUrl ||
          '/src/assets/images/module_mangrove_biology_1793880031385.jpg',
      },
      'Matematika Maritim': {
        sim: 'navigation',
        fallbackImg:
          modules.find((m) => m.subject === 'Matematika Maritim')?.imageUrl ||
          '/src/assets/images/module_archipelago_navigation_1793880031828.jpg',
      },
      'Fisika Terapan': {
        sim: 'microhydro',
        fallbackImg:
          modules.find((m) => m.subject === 'Fisika Terapan')?.imageUrl ||
          '/src/assets/images/module_microhydro_physics_1793880029053.jpg',
      },
    };
    const matchedMeta = subjectSimMap[subject] || subjectSimMap['Fisika Terapan'];

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
      imageUrl: matchedMeta.fallbackImg,
      summary: summary.trim(),
      sections: [
        {
          heading: sectionHeading.trim(),
          body: sectionBody.trim(),
          formula: formula.trim(),
          keyTakeaway: keyTakeaway.trim(),
        },
      ],
      simulationType: matchedMeta.sim,
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

    classroomState.addModule(newModule);

    // Seed all 16 chunks on Teacher Host Node and first 4 chunks on Peer 01
    const peers = classroomState.getPeers();
    for (const p of peers) {
      if (p.role === 'HOST') {
        p.moduleChunks[newModule.id] = Array.from({ length: totalChunks }, (_, i) => i);
      } else if (p.id === 'peer-siswa-01') {
        p.moduleChunks[newModule.id] = [0, 1, 2, 3];
      } else {
        p.moduleChunks[newModule.id] = [];
      }
    }
    classroomState.savePeers();

    classroomState.broadcastState();
    res.status(201).json({ ok: true, module: newModule, state: classroomState.getFullState() });
  }

  /**
   * Returns host network info: Local IPv4 addresses, mDNS host, port,
   * and constructed access URLs for QR Code generation.
   */
  public static getNetworkInfo(_req: Request, res: Response): void {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    const primaryIp = addresses[0] || '192.168.43.1';
    const port = config.port;
    const mdnsHost = config.mdnsHost;

    res.json({
      ok: true,
      primaryIp,
      allIps: addresses,
      port,
      mdnsHost,
      lanUrl: `http://${primaryIp}:${port}`,
      mdnsUrl: `http://${mdnsHost}:${port}`,
      hostname: os.hostname(),
    });
  }
}
