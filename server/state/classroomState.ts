import {
  ensureDatabaseSeeded,
  ModuleRepository,
  PeerRepository,
  TransferRepository,
  CacheRepository,
  QuizRepository,
  HostConfigRepository,
} from '../db/index.js';
import {
  calculateSwarmMetrics,
  type LearningModule,
  type PeerNode,
  type CacheEntry,
  type ChunkTransferEvent,
  type TutorAskResponse,
  type StudentSubmission,
  type SwarmMetrics,
} from '../../src/utils/edgeEngine.js';
import { INITIAL_CACHE_ENTRIES } from '../../src/utils/seedData.js';

export interface ClassroomFullState {
  modules: LearningModule[];
  peers: PeerNode[];
  transferHistory: ChunkTransferEvent[];
  cacheEntries: CacheEntry[];
  recentQueries: TutorAskResponse[];
  submissions: StudentSubmission[];
  metrics: SwarmMetrics;
  gatewayTetheringOnline: boolean;
}

export function formatTimeWITA(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} WITA`;
}

class ClassroomStateManager {
  private modules: LearningModule[] = [];
  private peers: PeerNode[] = [];
  private transferHistory: ChunkTransferEvent[] = [];
  private cacheEntries: CacheEntry[] = [];
  private recentQueries: TutorAskResponse[] = [];
  private gatewayTetheringOnline = true;
  private cloudQueriesCount = 4;
  private broadcaster: (() => void) | null = null;
  private binaryBroadcaster: ((frame: Uint8Array) => void) | null = null;

  constructor() {
    this.reloadFromDatabase();
  }

  public reloadFromDatabase(): void {
    const seeded = ensureDatabaseSeeded();
    this.modules = seeded.modules;
    this.peers = seeded.peers;
    this.transferHistory = seeded.transferHistory;
    this.cacheEntries = seeded.cacheEntries;
    this.gatewayTetheringOnline = seeded.gatewayTetheringOnline;
    this.cloudQueriesCount = seeded.cloudQueriesCount;

    if (this.recentQueries.length === 0) {
      this.recentQueries = [
        {
          queryId: 'q-init-1',
          question:
            'Bagaimana rumus menghitung daya listrik mikrohidro dari tinggi jatuh air dan debit sungai?',
          askedByPeerName: 'Hendrikus D. (Peer 05)',
          moduleId: 'mod-fisika-mikrohidro',
          answerMarkdown:
            this.cacheEntries[0]?.answerMarkdown || INITIAL_CACHE_ENTRIES[0].answerMarkdown,
          keyConcepts:
            this.cacheEntries[0]?.keyConcepts || INITIAL_CACHE_ENTRIES[0].keyConcepts,
          source: 'LOCAL_CACHE',
          similarityScore: 0.94,
          matchedCanonicalQuestion:
            this.cacheEntries[0]?.questionCanonical ||
            INITIAL_CACHE_ENTRIES[0].questionCanonical,
          latencyMs: 0,
          ispQuotaBytesUsed: 0,
          ispQuotaKBaved: 4.8,
          cacheEntryId: this.cacheEntries[0]?.id || INITIAL_CACHE_ENTRIES[0].id,
          timestamp: '08:40:15 WITA',
        },
      ];
    }
  }

  public setBroadcaster(
    stateBroadcaster: () => void,
    binaryBroadcaster: (frame: Uint8Array) => void
  ): void {
    this.broadcaster = stateBroadcaster;
    this.binaryBroadcaster = binaryBroadcaster;
  }

  public broadcastState(): void {
    if (this.broadcaster) {
      this.broadcaster();
    }
  }

  public broadcastBinary(frame: Uint8Array): void {
    if (this.binaryBroadcaster) {
      this.binaryBroadcaster(frame);
    }
  }

  public getFullState(): ClassroomFullState {
    const metrics = calculateSwarmMetrics(
      this.peers,
      this.transferHistory,
      this.cacheEntries,
      this.cloudQueriesCount
    );
    const submissions = QuizRepository.loadSubmissions(100);

    return {
      modules: this.modules,
      peers: this.peers,
      transferHistory: this.transferHistory.slice(0, 30),
      cacheEntries: this.cacheEntries,
      recentQueries: this.recentQueries.slice(0, 15),
      submissions,
      metrics,
      gatewayTetheringOnline: this.gatewayTetheringOnline,
    };
  }

  // Modules
  public getModules(): LearningModule[] {
    return this.modules;
  }

  public setModules(mods: LearningModule[]): void {
    this.modules = mods;
  }

  public addModule(mod: LearningModule): void {
    this.modules.unshift(mod);
    this.modules.forEach((m, idx) => ModuleRepository.save(m, idx));
  }

  // Peers
  public getPeers(): PeerNode[] {
    return this.peers;
  }

  public savePeers(): void {
    PeerRepository.saveAll(this.peers);
  }

  // Transfer history
  public getTransferHistory(): ChunkTransferEvent[] {
    return this.transferHistory;
  }

  public addTransferEvent(ev: ChunkTransferEvent): void {
    this.transferHistory.unshift(ev);
    TransferRepository.insert(ev, Date.now());
  }

  // Cache entries
  public getCacheEntries(): CacheEntry[] {
    return this.cacheEntries;
  }

  public setCacheEntries(entries: CacheEntry[]): void {
    this.cacheEntries = entries;
  }

  public addCacheEntry(entry: CacheEntry): void {
    this.cacheEntries.unshift(entry);
    this.cacheEntries.forEach((c, idx) => CacheRepository.save(c, idx));
  }

  // Recent queries
  public addRecentQuery(query: TutorAskResponse): void {
    this.recentQueries.unshift(query);
  }

  // Gateway Tethering
  public isGatewayTetheringOnline(): boolean {
    return this.gatewayTetheringOnline;
  }

  public setGatewayTetheringOnline(online: boolean): void {
    this.gatewayTetheringOnline = online;
    HostConfigRepository.set('gateway_tethering_online', String(online));
  }

  // Cloud Queries Count
  public incrementCloudQueriesCount(): number {
    this.cloudQueriesCount += 1;
    HostConfigRepository.set('cloud_queries_count', String(this.cloudQueriesCount));
    return this.cloudQueriesCount;
  }
}

export const classroomState = new ClassroomStateManager();
