import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  HostConfigRepository,
  HostSessionRepository,
} from '../db/repositories/config.repository.js';
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
 * Extracts Bearer token from Authorization header
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.header('authorization') || req.header('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Middleware: Requires valid Bearer Session Token (preferred) or valid `x-host-pin` header
 * to protect Teacher Host Node endpoints from unauthorized student modification.
 */
export function requireHostPin(req: Request, res: Response, next: NextFunction): void {
  // 1. Prioritize Session Token (Bearer <token>)
  const bearerToken = extractBearerToken(req);
  if (bearerToken && HostSessionRepository.isValid(bearerToken)) {
    return next();
  }

  // 2. Fallback: Validate direct PIN header/body (for backward compatibility during migration)
  const headerPin = req.header('x-host-pin');
  const bodyPin = typeof req.body?.hostPin === 'string' ? req.body.hostPin : undefined;
  const candidate = (headerPin || bodyPin || '').trim();

  if (candidate && verifyPinTimingSafe(candidate)) {
    return next();
  }

  res.status(401).json({
    ok: false,
    success: false,
    error:
      'Akses ditolak: Sesi Simpul Guru tidak valid atau telah kedaluwarsa. Silakan login kembali dengan PIN Guru (default: 1945).',
  });
}
