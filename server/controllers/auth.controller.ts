import type { Request, Response } from 'express';
import {
  verifyPinTimingSafe,
  getCurrentHostPin,
} from '../middleware/authMiddleware.js';
import { HostConfigRepository } from '../db/repositories/config.repository.js';
import {
  exportSneakernetPackage,
  importSneakernetPackage,
} from '../db/index.js';
import {
  validateHostPinChange,
} from '../../src/utils/edgeEngine.js';
import { classroomState } from '../state/classroomState.js';
import { SECURITY_CONSTANTS } from '../config/env.js';

const failedPinAttempts = new Map<string, { count: number; lockedUntil: number }>();

export class AuthController {
  public static verifyPin(req: Request, res: Response): void {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = failedPinAttempts.get(clientIp);

    if (record && record.lockedUntil > now) {
      const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
      res.status(429).json({
        ok: false,
        valid: false,
        error: `Terlalu banyak percobaan PIN salah. Akses dikunci sementara selama ${waitSec} detik demi keamanan Simpul Guru.`,
        retryAfter: waitSec,
        retryAfterSeconds: waitSec,
      });
      return;
    }

    const candidate = String(req.body?.pin || req.header('x-host-pin') || '').trim();
    if (candidate && verifyPinTimingSafe(candidate)) {
      failedPinAttempts.delete(clientIp);
      res.json({ ok: true, valid: true });
      return;
    }

    const currentCount = (record?.count || 0) + 1;
    if (currentCount >= SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS) {
      failedPinAttempts.set(clientIp, {
        count: currentCount,
        lockedUntil: now + SECURITY_CONSTANTS.LOCKOUT_DURATION_MS,
      });
      res.status(429).json({
        ok: false,
        valid: false,
        error: `Terlalu banyak percobaan salah (${SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS}x). Simpul Guru dikunci sementara selama 60 detik.`,
        retryAfter: 60,
        retryAfterSeconds: 60,
      });
      return;
    }

    failedPinAttempts.set(clientIp, { count: currentCount, lockedUntil: 0 });
    res.status(401).json({
      ok: false,
      valid: false,
      error: `PIN Simpul Guru salah (percobaan ${currentCount}/${SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS}). Gunakan PIN default 1945 atau PIN yang telah diperbarui.`,
    });
  }

  public static changePin(req: Request, res: Response): void {
    const currentPin = String(req.body?.currentPin || req.header('x-host-pin') || '').trim();
    const newPin = String(req.body?.newPin || '').trim();
    const activeHostPin = getCurrentHostPin();

    const validation = validateHostPinChange(currentPin, activeHostPin, newPin);
    if (!validation.valid) {
      res.status(400).json({ ok: false, error: validation.error });
      return;
    }

    HostConfigRepository.set('host_pin', newPin);
    res.json({
      ok: true,
      message: 'PIN Keamanan Simpul Guru berhasil diperbarui dan disimpan di SQLite lokal.',
    });
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
    const pkg = req.body;
    if (!pkg || typeof pkg !== 'object') {
      res.status(400).json({ ok: false, error: 'Paket data Sneakernet tidak valid atau kosong.' });
      return;
    }

    try {
      const result = importSneakernetPackage(pkg);
      classroomState.setModules(result.modules);
      classroomState.setCacheEntries(result.cacheEntries);

      // Seed newly imported modules on Teacher Host node
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
        message: `Berhasil mengimpor ${result.modulesCount} modul kurikulum dan ${result.cacheCount} cache tanya-jawab ke Simpul Guru!`,
        state: classroomState.getFullState(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memproses impor paket data.';
      res.status(500).json({ ok: false, error: message });
    }
  }
}
