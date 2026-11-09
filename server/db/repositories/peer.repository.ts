import { getDatabase } from '../connection.js';
import type { PeerNode } from '../../../src/utils/edgeEngine.js';

interface PeerRow {
  id: string;
  peer_json: string;
  sort_order: number;
}

export class PeerRepository {
  static saveAll(peersList: PeerNode[]): void {
    const db = getDatabase();
    const clearStmt = db.prepare('DELETE FROM peer_nodes');
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO peer_nodes (id, peer_json, sort_order)
      VALUES (@id, @peer_json, @sort_order)
    `);

    const tx = db.transaction((items: PeerNode[]) => {
      clearStmt.run();
      items.forEach((p, idx) => {
        stmt.run({
          id: p.id,
          peer_json: JSON.stringify(p),
          sort_order: idx,
        });
      });
    });

    tx(peersList);
  }

  static loadAll(): PeerNode[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM peer_nodes ORDER BY sort_order ASC')
      .all() as PeerRow[];

    return rows.map((r) => JSON.parse(r.peer_json) as PeerNode);
  }

  static count(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM peer_nodes').get() as { cnt: number };
    return row?.cnt || 0;
  }
}
