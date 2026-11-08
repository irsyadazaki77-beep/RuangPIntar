import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { HostConfigRepository } from '../db/repositories/config.repository.js';
import { config } from '../config/env.js';

export function compareStringsTimingSafe(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function getCurrentHostPin(): string {
  return HostConfigRepository.get('host_pin', config.hostPin);
}

export function verifyPinTimingSafe(candidate: string, actualPin = getCurrentHostPin()): boolean {
  const matchesPrimary = compareStringsTimingSafe(candidate, actualPin);
  const envPin = (config.hostPin || '').trim();
  const matchesEnv = envPin.length > 0 ? compareStringsTimingSafe(candidate, envPin) : false;
  return matchesPrimary || matchesEnv;
}

/**
 * Middleware: Requires valid `x-host-pin` header (or `hostPin` in request body)
 * to protect Teacher Host Node endpoints from unauthorized student modification.
 */
export function requireHostPin(req: Request, res: Response, next: NextFunction): void {
  const headerPin = req.header('x-host-pin');
  const bodyPin = typeof req.body?.hostPin === 'string' ? req.body.hostPin : undefined;
  const candidate = (headerPin || bodyPin || '').trim();

  if (!candidate || !verifyPinTimingSafe(candidate)) {
    res.status(401).json({
      ok: false,
      error:
        'Akses ditolak: PIN Simpul Guru (x-host-pin) tidak valid atau belum diotorisasi. Masukkan PIN Simpul Guru (default: 1945).',
    });
    return;
  }
  next();
}
