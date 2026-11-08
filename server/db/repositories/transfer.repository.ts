import { getDatabase } from '../connection.js';
import type { ChunkTransferEvent } from '../../../src/utils/edgeEngine.js';

interface TransferLogRow {
  id: string;
  timestamp: string;
  module_id: string;
  module_title: string;
  chunk_index: number;
  chunk_hash: string;
  from_peer_id: string;
  from_peer_name: string;
  from_peer_role: 'HOST' | 'PEER';
  to_peer_id: string;
  to_peer_name: string;
  size_kb: number;
  channel_protocol: ChunkTransferEvent['channelProtocol'];
  zero_isp_quota: number;
  created_ms: number;
}

export class TransferRepository {
  static insert(ev: ChunkTransferEvent, createdMs = Date.now()): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO transfer_logs (
        id, timestamp, module_id, module_title, chunk_index, chunk_hash,
        from_peer_id, from_peer_name, from_peer_role, to_peer_id, to_peer_name,
        size_kb, channel_protocol, zero_isp_quota, created_ms
      ) VALUES (
        @id, @timestamp, @module_id, @module_title, @chunk_index, @chunk_hash,
        @from_peer_id, @from_peer_name, @from_peer_role, @to_peer_id, @to_peer_name,
        @size_kb, @channel_protocol, @zero_isp_quota, @created_ms
      )
    `);

    stmt.run({
      id: ev.id,
      timestamp: ev.timestamp,
      module_id: ev.moduleId,
      module_title: ev.moduleTitle,
      chunk_index: ev.chunkIndex,
      chunk_hash: ev.chunkHash,
      from_peer_id: ev.fromPeerId,
      from_peer_name: ev.fromPeerName,
      from_peer_role: ev.fromPeerRole,
      to_peer_id: ev.toPeerId,
      to_peer_name: ev.toPeerName,
      size_kb: ev.sizeKB,
      channel_protocol: ev.channelProtocol,
      zero_isp_quota: ev.zeroIspQuota ? 1 : 0,
      created_ms: createdMs,
    });
  }

  static loadRecent(limit = 50): ChunkTransferEvent[] {
    const db = getDatabase();
    const rows = db
      .prepare('SELECT * FROM transfer_logs ORDER BY created_ms DESC LIMIT ?')
      .all(limit) as TransferLogRow[];

    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      moduleId: r.module_id,
      moduleTitle: r.module_title,
      chunkIndex: r.chunk_index,
      chunkHash: r.chunk_hash,
      fromPeerId: r.from_peer_id,
      fromPeerName: r.from_peer_name,
      fromPeerRole: r.from_peer_role,
      toPeerId: r.to_peer_id,
      toPeerName: r.to_peer_name,
      sizeKB: r.size_kb,
      channelProtocol: r.channel_protocol,
      zeroIspQuota: Boolean(r.zero_isp_quota),
    }));
  }

  static count(): number {
    const db = getDatabase();
    const row = db.prepare('SELECT COUNT(*) as cnt FROM transfer_logs').get() as { cnt: number };
    return row?.cnt || 0;
  }
}
