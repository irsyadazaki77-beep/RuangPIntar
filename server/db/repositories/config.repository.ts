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

  static isValid(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const db = getDatabase();
    const now = Date.now();
    const row = db
      .prepare('SELECT expires_at FROM host_sessions WHERE token = ?')
      .get(token) as { expires_at: number } | undefined;

    if (!row) return false;
    if (row.expires_at <= now) {
      // Clean up expired session
      this.revoke(token);
      return false;
    }
    return true;
  }

  static revoke(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const db = getDatabase();
    const result = db.prepare('DELETE FROM host_sessions WHERE token = ?').run(token);
    return result.changes > 0;
  }

  static cleanExpired(): void {
    const db = getDatabase();
    const now = Date.now();
    db.prepare('DELETE FROM host_sessions WHERE expires_at <= ?').run(now);
  }
}
