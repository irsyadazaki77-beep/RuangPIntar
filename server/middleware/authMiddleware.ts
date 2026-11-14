import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  HostConfigRepository,
  HostSessionRepository,
} from '../db/repositories/config.repository.js';
import { config } from '../config/env.js';

/**
 * Constant-time string comparison using SHA-256 hashing.
 * Both inputs are hashed to fixed 32-byte buffers before comparison
 * with crypto.timingSafeEqual, preventing secret length leakage via timing attacks.
 * Handles non-string, null, or undefined inputs defensively without throwing.
 */
export function compareStringTimingSafe(a: unknown, b: unknown): boolean {
  const isValidStringA = typeof a === 'string';
  const isValidStringB = typeof b === 'string';

  const safeStrA = isValidStringA ? a : '';
  const safeStrB = isValidStringB ? b : '';

  const hashA = crypto.createHash('sha256').update(safeStrA, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(safeStrB, 'utf8').digest();

  const digestsMatch = crypto.timingSafeEqual(hashA, hashB);
  return isValidStringA && isValidStringB && digestsMatch;
}

// Preserve plural alias for backward compatibility across modules
export const compareStringsTimingSafe = compareStringTimingSafe;

export function getCurrentHostPin(): string {
  const storedPin = HostConfigRepository.get('host_pin', config.hostPin);
  // Migrate away from legacy hardcoded '1945' if HOST_PIN was not explicitly set to '1945'
  if (storedPin === '1945' && config.hostPin !== '1945') {
    HostConfigRepository.set('host_pin', config.hostPin);
    return config.hostPin;
  }
  return storedPin;
}

export function verifyPinTimingSafe(
  candidate: unknown,
  actualPin: string = getCurrentHostPin()
): boolean {
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    // Still execute dummy constant-time hash comparison to avoid timing variance
    compareStringTimingSafe('', actualPin);
    return false;
  }
  const normalizedCandidate = candidate.trim();
  return compareStringTimingSafe(normalizedCandidate, actualPin);
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

  // 2. Fallback: Validate direct PIN header/body (for backward compatibility)
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
      'Akses ditolak: Sesi Simpul Guru tidak valid atau telah kedaluwarsa. Silakan login kembali dengan PIN Simpul Guru yang aktif.',
  });
}

