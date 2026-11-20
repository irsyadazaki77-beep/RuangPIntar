import { getDatabase } from '../connection.js';
import { SECURITY_CONSTANTS } from '../../config/env.js';

export class HostConfigRepository {
  static get(key: string, defaultValue: string): string {
    const db = getDatabase();
    const row = db
      .prepare('SELECT value FROM host_config WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue;
  }

  static set(key: string, value: string): void {
    const db = getDatabase();
    db.prepare('INSERT OR REPLACE INTO host_config (key, value) VALUES (?, ?)').run(
      key,
      value
    );
  }
}

export interface HostSessionRecord {
  token: string;
  createdAt: number;
  expiresAt: number;
}

export class HostSessionRepository {
  static create(token: string, durationMs = SECURITY_CONSTANTS.SESSION_DURATION_MS): HostSessionRecord {
    const db = getDatabase();
    const createdAt = Date.now();
    const expiresAt = createdAt + durationMs;

    db.prepare(
      'INSERT OR REPLACE INTO host_sessions (token, created_at, expires_at) VALUES (?, ?, ?)'
    ).run(token, createdAt, expiresAt);

    return { token, createdAt, expiresAt };
  }

  static getSession(token: string): HostSessionRecord | null {
    if (!token || typeof token !== 'string') return null;
    const db = getDatabase();
    const now = Date.now();
    const row = db
      .prepare('SELECT token, created_at, expires_at FROM host_sessions WHERE token = ?')
      .get(token) as { token: string; created_at: number; expires_at: number } | undefined;

    if (!row) return null;
    if (row.expires_at <= now) {
      this.revoke(token);
      return null;
    }
    return {
      token: row.token,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  static isValid(token: string): boolean {
    return this.getSession(token) !== null;
  }

  static revoke(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const db = getDatabase();
    const result = db.prepare('DELETE FROM host_sessions WHERE token = ?').run(token);
    return result.changes > 0;
  }

  static revokeAllExcept(keepToken?: string | null): number {
    const db = getDatabase();
    if (keepToken) {
      const result = db.prepare('DELETE FROM host_sessions WHERE token != ?').run(keepToken);
      return result.changes;
    }
    const result = db.prepare('DELETE FROM host_sessions').run();
    return result.changes;
  }

  static cleanExpired(): void {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('DELETE FROM host_sessions WHERE expires_at <= ?').run(now);
  }
}

export interface PinLockoutRecord {
  clientIp: string;
  count: number;
  lockedUntil: number;
}

export class PinLockoutRepository {
  static get(clientIp: string): PinLockoutRecord | null {
    const db = getDatabase();
    const row = db
      .prepare('SELECT client_ip, attempt_count, locked_until FROM pin_lockouts WHERE client_ip = ?')
      .get(clientIp) as { client_ip: string; attempt_count: number; locked_until: number } | undefined;
    if (!row) return null;
    return {
      clientIp: row.client_ip,
      count: row.attempt_count,
      lockedUntil: row.locked_until,
    };
  }

  static set(clientIp: string, count: number, lockedUntil: number): void {
    const db = getDatabase();
    db.prepare(
      'INSERT OR REPLACE INTO pin_lockouts (client_ip, attempt_count, locked_until) VALUES (?, ?, ?)'
    ).run(clientIp, count, lockedUntil);
  }

  static clear(clientIp: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM pin_lockouts WHERE client_ip = ?').run(clientIp);
  }
}
