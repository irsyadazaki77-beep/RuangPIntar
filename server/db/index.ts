import { getDatabase, closeDatabase } from './connection.js';
import { ModuleRepository } from './repositories/module.repository.js';
import { CacheRepository } from './repositories/cache.repository.js';
import { QuizRepository } from './repositories/quiz.repository.js';
import { PeerRepository } from './repositories/peer.repository.js';
import { TransferRepository } from './repositories/transfer.repository.js';
import { HostConfigRepository } from './repositories/config.repository.js';
import {
  INITIAL_MODULES,
  INITIAL_PEERS,
  INITIAL_TRANSFER_HISTORY,
  INITIAL_CACHE_ENTRIES,
} from '../../src/utils/seedData.js';
import type {
  LearningModule,
  PeerNode,
  ChunkTransferEvent,
  CacheEntry,
  StudentSubmission,
} from '../../src/utils/edgeEngine.js';
import { config } from '../config/env.js';

export {
  getDatabase,
  closeDatabase,
  ModuleRepository,
  CacheRepository,
  QuizRepository,
  PeerRepository,
  TransferRepository,
  HostConfigRepository,
};

// Aliases matching existing signatures for seamless compatibility
export const saveModuleToDb = (m: LearningModule, sortOrder = 0) => ModuleRepository.save(m, sortOrder);
export const loadModulesFromDb = () => ModuleRepository.loadAll();
export const saveCacheEntryToDb = (c: CacheEntry, sortOrder = 0) => CacheRepository.save(c, sortOrder);
export const loadCacheEntriesFromDb = () => CacheRepository.loadAll();
export const insertTransferLogToDb = (ev: ChunkTransferEvent, createdMs = Date.now()) => TransferRepository.insert(ev, createdMs);
export const loadTransferLogsFromDb = (limit = 50) => TransferRepository.loadRecent(limit);
export const savePeersToDb = (peers: PeerNode[]) => PeerRepository.saveAll(peers);
export const loadPeersFromDb = () => PeerRepository.loadAll();
export const getHostConfig = (key: string, defaultValue: string) => HostConfigRepository.get(key, defaultValue);
export const setHostConfig = (key: string, value: string) => HostConfigRepository.set(key, value);
export const saveStudentSubmission = (sub: StudentSubmission) => QuizRepository.saveSubmission(sub);
export const loadStudentSubmissions = (limit = 100) => QuizRepository.loadSubmissions(limit);

export function exportSneakernetPackage(): {
  version: string;
  exportedAt: string;
  modules: LearningModule[];
  cacheEntries: CacheEntry[];
} {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    modules: ModuleRepository.loadAll(),
    cacheEntries: CacheRepository.loadAll(),
  };
}

export function importSneakernetPackage(pkg: {
  modules?: LearningModule[];
  cacheEntries?: CacheEntry[];
}): { modules: LearningModule[]; cacheEntries: CacheEntry[]; modulesCount: number; cacheCount: number } {
  let modulesCount = 0;
  let cacheCount = 0;

  const db = getDatabase();
  const tx = db.transaction(() => {
    if (Array.isArray(pkg.modules)) {
      pkg.modules.forEach((mod, idx) => {
        if (mod && mod.id && mod.title && mod.subject) {
          ModuleRepository.save(mod, idx);
          modulesCount++;
        }
      });
    }

    if (Array.isArray(pkg.cacheEntries)) {
      pkg.cacheEntries.forEach((entry, idx) => {
        if (entry && entry.id && entry.questionCanonical && entry.answerMarkdown) {
          CacheRepository.save(entry, idx);
          cacheCount++;
        }
      });
    }
  });

  tx();

  return {
    modules: ModuleRepository.loadAll(),
    cacheEntries: CacheRepository.loadAll(),
    modulesCount,
    cacheCount,
  };
}

export function ensureDatabaseSeeded(): {
  modules: LearningModule[];
  peers: PeerNode[];
  transferHistory: ChunkTransferEvent[];
  cacheEntries: CacheEntry[];
  hostPin: string;
  gatewayTetheringOnline: boolean;
  cloudQueriesCount: number;
} {
  if (ModuleRepository.count() === 0) {
    const db = getDatabase();
    const tx = db.transaction(() => {
      INITIAL_MODULES.forEach((m, idx) => ModuleRepository.save(m, idx));
    });
    tx();
  }

  if (CacheRepository.count() === 0) {
    const db = getDatabase();
    const tx = db.transaction(() => {
      INITIAL_CACHE_ENTRIES.forEach((c, idx) => CacheRepository.save(c, idx));
    });
    tx();
  }

  if (TransferRepository.count() === 0) {
    const baseTime = Date.now() - INITIAL_TRANSFER_HISTORY.length * 1000;
    const db = getDatabase();
    const tx = db.transaction(() => {
      INITIAL_TRANSFER_HISTORY.forEach((ev, idx) => {
        TransferRepository.insert(ev, baseTime + (INITIAL_TRANSFER_HISTORY.length - idx) * 1000);
      });
    });
    tx();
  }

  if (PeerRepository.count() === 0) {
    PeerRepository.saveAll(INITIAL_PEERS);
  } else {
    const loadedPeers = PeerRepository.loadAll();
    const canonicalIds = new Set(INITIAL_PEERS.map((p) => p.id));
    const filteredPeers = loadedPeers.filter((p) => {
      if (p.id === 'peer-test-unit') return false;
      if (p.id.startsWith('peer-siswa-') && !canonicalIds.has(p.id)) return false;
      return true;
    });

    // Ensure all canonical peers exist and peer-siswa-05 retains seat suffix
    const finalPeers: PeerNode[] = INITIAL_PEERS.map((initPeer) => {
      const existing = filteredPeers.find((p) => p.id === initPeer.id);
      if (!existing) return initPeer;
      if (existing.id === 'peer-siswa-05' && existing.name === 'Hendrikus D.') {
        existing.name = 'Hendrikus D. (Perangkat Anda · Peer 05)';
      }
      return existing;
    });

    if (finalPeers.length !== loadedPeers.length) {
      PeerRepository.saveAll(finalPeers);
    }
  }

  const storedHostPin = HostConfigRepository.get('host_pin', config.hostPin);
  const hostPin =
    storedHostPin === '1945' && config.hostPin !== '1945' ? config.hostPin : storedHostPin;
  HostConfigRepository.set('host_pin', hostPin);

  const tetheringStr = HostConfigRepository.get('gateway_tethering_online', 'true');
  HostConfigRepository.set('gateway_tethering_online', tetheringStr);

  const cloudQueriesStr = HostConfigRepository.get('cloud_queries_count', '4');
  HostConfigRepository.set('cloud_queries_count', cloudQueriesStr);

  return {
    modules: ModuleRepository.loadAll(),
    peers: PeerRepository.loadAll(),
    transferHistory: TransferRepository.loadRecent(50),
    cacheEntries: CacheRepository.loadAll(),
    hostPin,
    gatewayTetheringOnline: tetheringStr === 'true',
    cloudQueriesCount: Number(cloudQueriesStr) || 4,
  };
}
