import { getDatabase } from '../connection.js';

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
