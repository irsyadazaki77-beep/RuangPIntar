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
  type ModuleDiscussionPost,
} from '../../src/utils/edgeEngine.js';
import { classroomState, formatTimeWITA } from '../state/classroomState.js';
import {
  QuizRepository,
  DiscussionRepository,
  backupDatabase,
  exportSneakernetPackage,
  importSneakernetPackage,
} from '../db/index.js';
import { verifyStudentSignature } from '../utils/studentSignature.js';
import { config } from '../config/env.js';
import {
  ProgressSyncSchema,
  TransferPackageSchema,
  ClientChunksSyncSchema,
  DistributeAllSchema,
  ClassroomBroadcastSchema,
  DiscussionCreateSchema,
  type ProgressSyncPayload,
  type TransferPackagePayload,
  type ClientChunksSyncPayload,
  type DistributeAllPayload,
  type ClassroomBroadcastPayload,
  type DiscussionCreatePayload,
  type ModuleUpdatePayload,
  type SubmissionUpdatePayload,
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

    // Verify ECDSA student device cryptographic signature (Anti-Impersonation)
    const payloadToVerify = `${parsed.studentId}:${parsed.moduleId}:${parsed.score}:${parsed.timestamp}`;
    const sigCheck = verifyStudentSignature(
      parsed.studentId,
      payloadToVerify,
      parsed.clientSignature,
      parsed.clientPublicKey,
      effectiveStudentName
    );

    if (!sigCheck.valid) {
      res.status(403).json({
        ok: false,
        error: sigCheck.reason || 'Autentikasi identitas perangkat siswa gagal.',
      });
      return;
    }

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
    classroomState.broadcastDelta('submissions', QuizRepository.loadSubmissions(100));
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
      classroomState.broadcastDelta('peers', classroomState.getPeers());
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

    classroomState.broadcastDelta('transfers', {
      peers: classroomState.getPeers(),
      transferHistory: classroomState.getTransferHistory().slice(0, 30),
    });
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
    classroomState.broadcastDelta('peers', classroomState.getPeers());
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
    classroomState.broadcastDelta('gateway', { gatewayTetheringOnline: nextOnline });
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
      sections: customSections,
      checkpoints: customCheckpoints,
      simulationType: customSimType,
    } = req.body || {};

    const effectiveSectionHeading =
      Array.isArray(customSections) && customSections[0]?.heading
        ? String(customSections[0].heading)
        : sectionHeading;
    const effectiveSectionBody =
      Array.isArray(customSections) && customSections[0]?.body
        ? String(customSections[0].body)
        : sectionBody;

    const numSizeMB = Number(sizeMB);
    const validation = validateModuleSubmission({
      title,
      subject,
      gradeLevel,
      summary,
      sectionHeading: effectiveSectionHeading,
      sectionBody: effectiveSectionBody,
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
      'Pertanian Lahan Kering': {
        sim: 'agroforestry',
        fallbackImg:
          '/src/assets/images/module_dryland_agroforestry_1794013784750.jpg',
      },
      'Teknik Lingkungan': {
        sim: 'desalination',
        fallbackImg:
          '/src/assets/images/module_solar_desalination_1794013784758.jpg',
      },
    };
    const matchedMeta = subjectSimMap[subject] || subjectSimMap['Fisika Terapan'];

    const normalizedSections: LearningModule['sections'] =
      Array.isArray(customSections) && customSections.length > 0
        ? customSections.map((sec: LearningModule['sections'][number], i: number) => ({
            heading: String(sec.heading || `0${i + 1}. Bagian Materi`).trim(),
            body: String(sec.body || '').trim(),
            formula: sec.formula ? String(sec.formula).trim() : undefined,
            keyTakeaway: String(sec.keyTakeaway || keyTakeaway).trim(),
          }))
        : [
            {
              heading: String(sectionHeading).trim(),
              body: String(sectionBody).trim(),
              formula: String(formula).trim(),
              keyTakeaway: String(keyTakeaway).trim(),
            },
          ];

    const normalizedCheckpoints: LearningModule['checkpoints'] =
      Array.isArray(customCheckpoints) && customCheckpoints.length > 0
        ? customCheckpoints.map((cp: LearningModule['checkpoints'][number]) => ({
            question: String(cp.question).trim(),
            options: Array.isArray(cp.options) ? cp.options.map((o) => String(o).trim()) : [],
            correctIndex: Math.max(0, Math.min((cp.options?.length || 1) - 1, Number(cp.correctIndex) || 0)),
            explanation: String(cp.explanation || keyTakeaway).trim(),
          }))
        : [
            {
              question: `Apa tujuan utama dari penerapan materi "${title.trim()}" pada komunitas sekolah 3T?`,
              options: [
                String(keyTakeaway).trim(),
                'Meningkatkan ketergantungan pada kuota internet satelit komersial',
                'Mengurangi efisiensi perangkat lokal di ruang kelas',
                'Menghapus penyimpanan lokal pada simpul guru',
              ],
              correctIndex: 0,
              explanation: String(keyTakeaway).trim(),
            },
          ];

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
      sections: normalizedSections,
      simulationType: (customSimType as LearningModule['simulationType']) || matchedMeta.sim,
      checkpoints: normalizedCheckpoints,
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

    classroomState.broadcastDelta('modules', {
      modules: classroomState.getModules(),
      peers: classroomState.getPeers(),
    });
    res.status(201).json({ ok: true, module: newModule, state: classroomState.getFullState() });
  }

  public static updateModule(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    const existing = classroomState.getModules().find((m) => m.id === id);
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Modul pembelajaran tidak ditemukan.' });
      return;
    }

    const body = (req.validatedBody ?? req.body) as ModuleUpdatePayload;
    const nextTitle = body.title ? body.title.trim() : existing.title;
    const nextSummary = body.summary ? body.summary.trim() : existing.summary;
    const nextSizeMB = typeof body.sizeMB === 'number' ? body.sizeMB : existing.sizeMB;

    const allowedSubjects: LearningModule['subject'][] = [
      'Fisika Terapan',
      'Biologi Pesisir',
      'Matematika Maritim',
      'Teknik Energi',
    ];
    const nextSubject: LearningModule['subject'] =
      body.subject && allowedSubjects.includes(body.subject as LearningModule['subject'])
        ? (body.subject as LearningModule['subject'])
        : existing.subject;

    const updated: LearningModule = {
      ...existing,
      title: nextTitle,
      subject: nextSubject,
      gradeLevel: body.gradeLevel ? body.gradeLevel.trim() : existing.gradeLevel,
      authorTeacher: body.authorTeacher ? body.authorTeacher.trim() : existing.authorTeacher,
      schoolOrigin: body.schoolOrigin ? body.schoolOrigin.trim() : existing.schoolOrigin,
      summary: nextSummary,
      sizeMB: nextSizeMB,
      chunkSizeKB: Math.max(256, Math.round((nextSizeMB * 1024) / existing.totalChunks)),
      simulationType: body.simulationType ?? existing.simulationType,
      sections: body.sections
        ? body.sections.map((s) => ({
            heading: s.heading.trim(),
            body: s.body.trim(),
            formula: s.formula?.trim() || undefined,
            keyTakeaway: s.keyTakeaway.trim(),
          }))
        : existing.sections,
      checkpoints: body.checkpoints
        ? body.checkpoints.map((c) => ({
            question: c.question.trim(),
            options: c.options.map((o) => o.trim()),
            correctIndex: Math.max(0, Math.min(c.options.length - 1, c.correctIndex)),
            explanation: c.explanation.trim(),
          }))
        : existing.checkpoints,
      updatedAt: `Diperbarui ${formatTimeWITA()} · Simpul Guru`,
    };

    classroomState.updateModule(id, updated);
    classroomState.broadcastDelta('modules', {
      modules: classroomState.getModules(),
    });
    res.json({ ok: true, module: updated, state: classroomState.getFullState() });
  }

  public static deleteModule(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    const modules = classroomState.getModules();
    if (modules.length <= 1) {
      res.status(400).json({
        ok: false,
        error: 'Minimal harus tersisa 1 modul aktif di dalam pustaka Simpul Guru.',
      });
      return;
    }

    const deleted = classroomState.deleteModule(id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: 'Modul pembelajaran tidak ditemukan.' });
      return;
    }

    classroomState.broadcastDelta('modules', {
      modules: classroomState.getModules(),
      peers: classroomState.getPeers(),
    });
    res.json({ ok: true, deleted: true, id, state: classroomState.getFullState() });
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

  /**
   * Distributes all missing chunks of a module across all student peers in one click.
   */
  public static distributeToAll(req: Request, res: Response): void {
    const parsed: DistributeAllPayload =
      (req.validatedBody as DistributeAllPayload | undefined) ??
      DistributeAllSchema.parse(req.body);

    const modules = classroomState.getModules();
    const mod = modules.find((m) => m.id === parsed.moduleId);
    if (!mod) {
      res.status(404).json({ ok: false, error: 'Modul pembelajaran tidak ditemukan.' });
      return;
    }

    const peers = classroomState.getPeers();
    const studentPeers = peers.filter((p) => p.role === 'PEER');
    let totalTransferred = 0;

    for (const targetPeer of studentPeers) {
      const planned = computeNextChunkTransfers(mod, targetPeer.id, peers, mod.totalChunks);
      for (const item of planned) {
        const held = targetPeer.moduleChunks[mod.id] || [];
        if (!held.includes(item.chunkIndex)) {
          held.push(item.chunkIndex);
          held.sort((a, b) => a - b);
          targetPeer.moduleChunks[mod.id] = held;
        }
        const mbDelta = item.sizeKB / 1024;
        targetPeer.downloadedMB = Number((targetPeer.downloadedMB + mbDelta).toFixed(2));
        const sourcePeer = peers.find((p) => p.id === item.fromPeerId);
        if (sourcePeer) {
          sourcePeer.uploadedMB = Number((sourcePeer.uploadedMB + mbDelta).toFixed(2));
        }

        const ev: ChunkTransferEvent = {
          id: `tx-all-${Date.now()}-${targetPeer.id}-${item.chunkIndex}-${Math.random().toString(36).slice(2, 5)}`,
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
        classroomState.addTransferEvent(ev);
        totalTransferred++;
      }
    }

    if (totalTransferred > 0) {
      classroomState.savePeers();
    }
    classroomState.broadcastDelta('transfers', {
      peers: classroomState.getPeers(),
      transferHistory: classroomState.getTransferHistory().slice(0, 30),
    });

    res.json({
      ok: true,
      transferredCount: totalTransferred,
      message:
        totalTransferred > 0
          ? `Berhasil mendistribusikan ${totalTransferred} pecahan materi "${mod.title}" ke seluruh siswa!`
          : `Seluruh siswa sudah memiliki salinan lengkap modul "${mod.title}".`,
      state: classroomState.getFullState(),
    });
  }

  /**
   * Broadcasts teacher announcement, optional focus module redirect, and exam mode lock.
   */
  public static setClassroomBroadcast(req: Request, res: Response): void {
    const parsed: ClassroomBroadcastPayload =
      (req.validatedBody as ClassroomBroadcastPayload | undefined) ??
      ClassroomBroadcastSchema.parse(req.body);

    if (parsed.clear || (!parsed.message && !parsed.focusModuleId && !parsed.examMode)) {
      classroomState.setClassroomBroadcast(null);
      classroomState.broadcastDelta('broadcast', null);
      res.json({ ok: true, broadcast: null, state: classroomState.getFullState() });
      return;
    }

    const nextBroadcast = {
      message: parsed.message,
      focusModuleId: parsed.focusModuleId || undefined,
      examMode: Boolean(parsed.examMode),
      updatedAt: formatTimeWITA(),
      updatedMs: Date.now(),
    };
    classroomState.setClassroomBroadcast(nextBroadcast);
    classroomState.broadcastDelta('broadcast', nextBroadcast);
    res.json({ ok: true, broadcast: nextBroadcast, state: classroomState.getFullState() });
  }

  /**
   * Lists local classroom discussion posts (0-KB internet quota) optionally filtered by moduleId.
   */
  public static listDiscussions(req: Request, res: Response): void {
    const moduleId =
      typeof req.query.moduleId === 'string' && req.query.moduleId.trim().length > 0
        ? req.query.moduleId.trim()
        : undefined;
    const posts = DiscussionRepository.listByModule(moduleId);
    res.json({ ok: true, posts });
  }

  /**
   * Creates a new discussion post in SQLite and broadcasts update via WebSocket.
   */
  public static createDiscussion(req: Request, res: Response): void {
    const parsed: DiscussionCreatePayload =
      (req.validatedBody as DiscussionCreatePayload | undefined) ??
      DiscussionCreateSchema.parse(req.body);

    const authorId = `${parsed.authorName}-${parsed.avatar}`;
    const payloadToVerify = `${parsed.moduleId}:${parsed.authorName}:${parsed.message}`;
    const sigCheck = verifyStudentSignature(
      authorId,
      payloadToVerify,
      parsed.clientSignature,
      parsed.clientPublicKey,
      parsed.authorName
    );

    if (!sigCheck.valid) {
      res.status(403).json({
        ok: false,
        error: sigCheck.reason || 'Autentikasi identitas perangkat forum gagal.',
      });
      return;
    }

    const post: ModuleDiscussionPost = {
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moduleId: parsed.moduleId,
      authorName: parsed.authorName,
      authorRole: parsed.authorRole,
      avatar: parsed.avatar,
      message: parsed.message,
      isPinned: false,
      createdAt: formatTimeWITA(),
      createdMs: Date.now(),
    };

    DiscussionRepository.insert(post);
    classroomState.broadcastDelta('discussions', { moduleId: post.moduleId, post });
    res.status(201).json({ ok: true, post });
  }

  /**
   * Toggles pinned status on a discussion post (Teacher Host only).
   */
  public static togglePinDiscussion(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ ok: false, error: 'ID diskusi wajib diisi' });
      return;
    }
    const updated = DiscussionRepository.togglePin(id);
    if (!updated) {
      res.status(404).json({ ok: false, error: 'Komentar diskusi tidak ditemukan' });
      return;
    }
    classroomState.broadcastDelta('discussions', { moduleId: updated.moduleId, post: updated });
    res.json({ ok: true, post: updated });
  }

  /**
   * Deletes a discussion post (Teacher Host moderation).
   */
  public static deleteDiscussion(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    if (!id) {
      res.status(400).json({ ok: false, error: 'ID diskusi wajib diisi.' });
      return;
    }
    const deleted = DiscussionRepository.delete(id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: 'Komentar diskusi tidak ditemukan.' });
      return;
    }
    classroomState.broadcastDelta('discussions', { deletedId: id });
    res.json({ ok: true, deleted: true, id });
  }

  /**
   * Updates a student gradebook submission (Teacher Host correction).
   */
  public static updateSubmission(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    const existing = QuizRepository.findById(id);
    if (!existing) {
      res.status(404).json({ ok: false, error: 'Data nilai siswa tidak ditemukan.' });
      return;
    }

    const body = (req.validatedBody ?? req.body) as SubmissionUpdatePayload;
    const nextTotal = body.totalQuestions ?? existing.totalQuestions;
    const nextScore = Math.min(nextTotal, body.quizScore ?? existing.quizScore);
    const nextPassed =
      typeof body.passed === 'boolean'
        ? body.passed
        : nextTotal > 0
        ? (nextScore / nextTotal) * 100 >= 70
        : existing.passed;

    const updated: StudentSubmission = {
      ...existing,
      quizScore: nextScore,
      totalQuestions: nextTotal,
      passed: nextPassed,
      simulationCompleted: body.simulationCompleted ?? existing.simulationCompleted,
      timestamp: formatTimeWITA(),
      updatedMs: Date.now(),
    };

    QuizRepository.saveSubmission(updated);
    classroomState.broadcastDelta('submissions', QuizRepository.loadSubmissions(100));
    res.json({ ok: true, submission: updated, state: classroomState.getFullState() });
  }

  /**
   * Deletes a student gradebook submission (Teacher Host only).
   */
  public static deleteSubmission(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    if (!id) {
      res.status(400).json({ ok: false, error: 'ID nilai siswa wajib diisi.' });
      return;
    }
    const deleted = QuizRepository.deleteSubmission(id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: 'Data nilai siswa tidak ditemukan.' });
      return;
    }
    classroomState.broadcastDelta('submissions', QuizRepository.loadSubmissions(100));
    res.json({ ok: true, deleted: true, id, state: classroomState.getFullState() });
  }

  /**
   * Removes a stale student peer node from mesh registry (Teacher Host only).
   */
  public static deletePeer(req: Request, res: Response): void {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId || '').trim();
    if (!id) {
      res.status(400).json({ ok: false, error: 'ID perangkat peer wajib diisi.' });
      return;
    }
    const peer = classroomState.getPeers().find((p) => p.id === id);
    if (!peer) {
      res.status(404).json({ ok: false, error: 'Perangkat simpul tidak ditemukan.' });
      return;
    }
    if (peer.role === 'HOST') {
      res.status(400).json({ ok: false, error: 'Simpul Utama Guru (HOST) tidak dapat dihapus.' });
      return;
    }

    classroomState.removePeer(id);
    classroomState.broadcastDelta('peers', classroomState.getPeers());
    res.json({ ok: true, deleted: true, id, state: classroomState.getFullState() });
  }

  /**
   * Triggers an online non-blocking SQLite snapshot backup (Teacher Host only).
   */
  public static async triggerBackup(_req: Request, res: Response): Promise<void> {
    try {
      const backupFile = await backupDatabase();
      res.json({
        ok: true,
        backupFile,
        backedUpAt: new Date().toISOString(),
        message: 'Cadangan (snapshot) SQLite Simpul Guru berhasil dibuat secara aman.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat cadangan SQLite.';
      res.status(500).json({ ok: false, error: msg });
    }
  }
}
