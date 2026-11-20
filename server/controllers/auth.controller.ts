import crypto from 'crypto';
import type { Request, Response } from 'express';
import {
  verifyPinTimingSafe,
  hashPinScrypt,
  extractBearerToken,
} from '../middleware/authMiddleware.js';
import {
  HostConfigRepository,
  HostSessionRepository,
  PinLockoutRepository,
} from '../db/repositories/config.repository.js';
import { SECURITY_CONSTANTS } from '../config/env.js';

export class AuthController {
  /**
   * GET /api/auth/session
   * Validates the active Bearer token against SQLite host_sessions.
   */
  public static checkSession(req: Request, res: Response): void {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({
        ok: false,
        valid: false,
        error: 'Token sesi tidak ditemukan.',
      });
      return;
    }

    const session = HostSessionRepository.getSession(token);
    if (!session) {
      res.status(401).json({
        ok: false,
        valid: false,
        error: 'Sesi Simpul Guru tidak valid atau telah kedaluwarsa.',
      });
      return;
    }

    res.json({
      ok: true,
      valid: true,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  }

  /**
   * POST /api/auth/login
   * Authenticates teacher PIN and issues a secure 8-hour session token.
   */
  public static login(req: Request, res: Response): void {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = PinLockoutRepository.get(clientIp);

    if (record && record.lockedUntil > now) {
      const waitSec = Math.ceil((record.lockedUntil - now) / 1000);
      res.status(429).json({
        success: false,
        ok: false,
        error: `Terlalu banyak percobaan PIN salah. Akses login dikunci sementara selama ${waitSec} detik demi keamanan Simpul Guru.`,
        retryAfter: waitSec,
        retryAfterSeconds: waitSec,
      });
      return;
    }

    const candidate = String(req.body?.pin || '').trim();
    if (candidate && verifyPinTimingSafe(candidate)) {
      PinLockoutRepository.clear(clientIp);
      HostSessionRepository.cleanExpired();

      const rawToken = crypto.randomBytes(32).toString('hex');
      const session = HostSessionRepository.create(rawToken);

      res.status(200).json({
        success: true,
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt,
      });
      return;
    }

    const currentCount = (record && record.lockedUntil <= now && record.lockedUntil > 0 ? 0 : record?.count || 0) + 1;
    if (currentCount >= SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS) {
      PinLockoutRepository.set(clientIp, currentCount, now + SECURITY_CONSTANTS.LOCKOUT_DURATION_MS);
      res.status(429).json({
        success: false,
        ok: false,
        error: `Terlalu banyak percobaan salah (${SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS}x). Simpul Guru dikunci sementara selama 60 detik.`,
        retryAfter: 60,
        retryAfterSeconds: 60,
      });
      return;
    }

    PinLockoutRepository.set(clientIp, currentCount, 0);
    res.status(401).json({
      success: false,
      ok: false,
      error: `PIN Simpul Guru salah (percobaan ${currentCount}/${SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS}). Silakan periksa PIN Simpul Guru di terminal server atau berkas .env.`,
    });
  }

  /**
   * POST /api/auth/logout
   * Revokes the active session token.
   */
  public static logout(req: Request, res: Response): void {
    const token =
      extractBearerToken(req) ||
      (typeof req.body?.token === 'string' ? req.body.token : null) ||
      req.header('x-session-token') ||
      '';

    if (token) {
      HostSessionRepository.revoke(token);
    }

    res.json({
      success: true,
      ok: true,
      message: 'Sesi Simpul Guru berhasil dicabut.',
    });
  }

  public static verifyPin(req: Request, res: Response): void {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = PinLockoutRepository.get(clientIp);

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
      PinLockoutRepository.clear(clientIp);
      res.json({ ok: true, valid: true });
      return;
    }

    const currentCount = (record && record.lockedUntil <= now && record.lockedUntil > 0 ? 0 : record?.count || 0) + 1;
    if (currentCount >= SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS) {
      PinLockoutRepository.set(clientIp, currentCount, now + SECURITY_CONSTANTS.LOCKOUT_DURATION_MS);
      res.status(429).json({
        ok: false,
        valid: false,
        error: `Terlalu banyak percobaan salah (${SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS}x). Simpul Guru dikunci sementara selama 60 detik.`,
        retryAfter: 60,
        retryAfterSeconds: 60,
      });
      return;
    }

    PinLockoutRepository.set(clientIp, currentCount, 0);
    res.status(401).json({
      ok: false,
      valid: false,
      error: `PIN Simpul Guru salah (percobaan ${currentCount}/${SECURITY_CONSTANTS.MAX_PIN_ATTEMPTS}). Silakan periksa PIN Simpul Guru di terminal server atau berkas .env.`,
    });
  }

  public static changePin(req: Request, res: Response): void {
    const currentPin = String(req.body?.currentPin || req.header('x-host-pin') || '').trim();
    const newPin = String(req.body?.newPin || '').trim();

    if (!currentPin || !verifyPinTimingSafe(currentPin)) {
      res.status(400).json({ ok: false, error: 'PIN saat ini tidak sesuai.' });
      return;
    }
    if (!newPin || newPin.length < 4 || newPin.length > 12) {
      res.status(400).json({ ok: false, error: 'PIN baru harus terdiri dari 4 hingga 12 karakter.' });
      return;
    }
    if (newPin === currentPin) {
      res.status(400).json({ ok: false, error: 'PIN baru tidak boleh sama dengan PIN sebelumnya.' });
      return;
    }

    // Store salted scrypt hash in SQLite host_config
    HostConfigRepository.set('host_pin', hashPinScrypt(newPin));

    // Revoke any other sessions while keeping the caller's current token active
    const callerToken = extractBearerToken(req);
    HostSessionRepository.revokeAllExcept(callerToken);

    res.json({
      ok: true,
      message: 'PIN Keamanan Simpul Guru berhasil diperbarui dengan hash scrypt dan disimpan di SQLite lokal.',
    });
  }
}
