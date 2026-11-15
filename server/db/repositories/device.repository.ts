import { getDatabase } from '../connection.js';

export interface StudentDeviceRecord {
  studentId: string;
  publicKeySpki: string;
  deviceName: string;
  registeredAt: string;
  registeredMs: number;
}

export const DeviceRepository = {
  findByStudentId(studentId: string): StudentDeviceRecord | null {
    const db = getDatabase();
    const row = db
      .prepare(`SELECT * FROM student_devices WHERE student_id = ?`)
      .get(studentId) as
      | {
          student_id: string;
          public_key_spki: string;
          device_name: string;
          registered_at: string;
          registered_ms: number;
        }
      | undefined;

    if (!row) return null;
    return {
      studentId: row.student_id,
      publicKeySpki: row.public_key_spki,
      deviceName: row.device_name,
      registeredAt: row.registered_at,
      registeredMs: row.registered_ms,
    };
  },

  register(record: StudentDeviceRecord): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO student_devices (student_id, public_key_spki, device_name, registered_at, registered_ms)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        public_key_spki = excluded.public_key_spki,
        device_name = excluded.device_name,
        registered_at = excluded.registered_at,
        registered_ms = excluded.registered_ms
    `).run(
      record.studentId,
      record.publicKeySpki,
      record.deviceName,
      record.registeredAt,
      record.registeredMs
    );
  },

  count(): number {
    const db = getDatabase();
    const row = db.prepare(`SELECT COUNT(*) as count FROM student_devices`).get() as {
      count: number;
    };
    return row.count;
  },
};
