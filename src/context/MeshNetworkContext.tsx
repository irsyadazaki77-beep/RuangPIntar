import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  INITIAL_MODULES,
  INITIAL_PEERS,
  INITIAL_TRANSFER_HISTORY,
  INITIAL_CACHE_ENTRIES,
} from '../utils/seedData';
import {
  calculateSwarmMetrics,
  type LearningModule,
  type PeerNode,
  type ChunkTransferEvent,
  type CacheEntry,
  type TutorAskResponse,
  type SwarmMetrics,
  type StudentSubmission,
} from '../utils/edgeEngine';
import {
  saveClientDownloadedChunks,
} from '../utils/clientStorage';
import { useOnlineStatus } from '../components/PWAInstallButton';

export type ActiveTab = 'pustaka' | 'mesh' | 'tutor' | 'guru';

export interface StudentProfile {
  peerId: string;
  studentName: string;
  avatar: string;
}

export const STUDENT_PEER_ID = 'peer-siswa-05';
export const STUDENT_PROFILE_KEY = 'ruangpintar_student_identity_v2';
export const DEFAULT_AVATARS = [
  '🐬 Lumba-lumba',
  '🦅 Cendrawasih',
  '🦎 Komodo',
  '🌿 Bakau',
  '⛵ Pinisi',
  '🐢 Penyu Sisik',
];

interface ServerStatePayload {
  modules?: LearningModule[];
  peers?: PeerNode[];
  transferHistory?: ChunkTransferEvent[];
  cacheEntries?: CacheEntry[];
  recentQueries?: TutorAskResponse[];
  submissions?: StudentSubmission[];
  metrics?: SwarmMetrics;
  gatewayTetheringOnline?: boolean;
}

interface MeshNetworkContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  modules: LearningModule[];
  setModules: React.Dispatch<React.SetStateAction<LearningModule[]>>;
  activeModuleId: string;
  setActiveModuleId: (id: string) => void;
  peers: PeerNode[];
  setPeers: React.Dispatch<React.SetStateAction<PeerNode[]>>;
  transferHistory: ChunkTransferEvent[];
  setTransferHistory: React.Dispatch<React.SetStateAction<ChunkTransferEvent[]>>;
  cacheEntries: CacheEntry[];
  setCacheEntries: React.Dispatch<React.SetStateAction<CacheEntry[]>>;
  recentQueries: TutorAskResponse[];
  setRecentQueries: React.Dispatch<React.SetStateAction<TutorAskResponse[]>>;
  submissions: StudentSubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<StudentSubmission[]>>;
  metrics: SwarmMetrics;
  setMetrics: React.Dispatch<React.SetStateAction<SwarmMetrics>>;
  gatewayTetheringOnline: boolean;
  setGatewayTetheringOnline: React.Dispatch<React.SetStateAction<boolean>>;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  isAsking: boolean;
  setIsAsking: (asking: boolean) => void;
  activeWebRtcChannelsCount: number;
  setActiveWebRtcChannelsCount: (count: number) => void;
  statusBanner: string | null;
  setStatusBanner: (banner: string | null) => void;
  lastBinaryPacketInfo: string | null;
  setLastBinaryPacketInfo: (info: string | null) => void;
  studentProfile: StudentProfile;
  setStudentProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  isBrowserOnline: boolean;
  simulatedOfflineMode: boolean;
  setSimulatedOfflineMode: React.Dispatch<React.SetStateAction<boolean>>;
  isOfflineActive: boolean;
  tutorPromptDraft: string | null;
  setTutorPromptDraft: (prompt: string | null) => void;
  applyServerState: (data: ServerStatePayload) => void;
  isQrScannerOpen: boolean;
  setIsQrScannerOpen: (open: boolean) => void;
  openQrScanner: () => void;
  closeQrScanner: () => void;
  customHostUrl: string | null;
  setCustomHostUrl: (url: string | null) => void;
}

const MeshNetworkContext = createContext<MeshNetworkContextType | undefined>(undefined);

export const MeshNetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pustaka');
  const [modules, setModules] = useState<LearningModule[]>(INITIAL_MODULES);
  const [peers, setPeers] = useState<PeerNode[]>(INITIAL_PEERS);
  const [transferHistory, setTransferHistory] = useState<ChunkTransferEvent[]>(INITIAL_TRANSFER_HISTORY);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>(INITIAL_CACHE_ENTRIES);
  const [recentQueries, setRecentQueries] = useState<TutorAskResponse[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<string>(INITIAL_MODULES[0].id);
  const [gatewayTetheringOnline, setGatewayTetheringOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [activeWebRtcChannelsCount, setActiveWebRtcChannelsCount] = useState<number>(5);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [lastBinaryPacketInfo, setLastBinaryPacketInfo] = useState<string | null>(null);
  const [tutorPromptDraft, setTutorPromptDraft] = useState<string | null>(null);
  const [simulatedOfflineMode, setSimulatedOfflineMode] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [customHostUrl, setCustomHostUrl] = useState<string | null>(null);

  const openQrScanner = useCallback(() => setIsQrScannerOpen(true), []);
  const closeQrScanner = useCallback(() => setIsQrScannerOpen(false), []);

  const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => {
    try {
      const saved = window.localStorage.getItem(STUDENT_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as StudentProfile;
        const normalizedPeerId =
          parsed.peerId && /^peer-siswa-0[1-5]$/.test(parsed.peerId)
            ? parsed.peerId
            : STUDENT_PEER_ID;
        return {
          peerId: normalizedPeerId,
          studentName: parsed.studentName || 'Hendrikus D.',
          avatar: parsed.avatar || '🐬 Lumba-lumba',
        };
      }
    } catch {}
    return {
      peerId: STUDENT_PEER_ID,
      studentName: 'Hendrikus D.',
      avatar: '🐬 Lumba-lumba',
    };
  });

  const [metrics, setMetrics] = useState<SwarmMetrics>(() =>
    calculateSwarmMetrics(INITIAL_PEERS, INITIAL_TRANSFER_HISTORY, INITIAL_CACHE_ENTRIES, 4)
  );

  const isBrowserOnline = useOnlineStatus();
  const isOfflineActive = !isBrowserOnline || simulatedOfflineMode;

  const applyServerState = useCallback((data: ServerStatePayload) => {
    if (!data) return;
    if (data.modules) setModules(data.modules);
    if (data.peers) {
      setPeers(data.peers);
      const studentPeer = data.peers.find((p) => p.id === STUDENT_PEER_ID);
      if (studentPeer) {
        void saveClientDownloadedChunks(STUDENT_PEER_ID, studentPeer.moduleChunks);
      }
    }
    if (data.transferHistory) setTransferHistory(data.transferHistory);
    if (data.cacheEntries) setCacheEntries(data.cacheEntries);
    if (data.recentQueries) setRecentQueries(data.recentQueries);
    if (data.submissions) setSubmissions(data.submissions);
    if (data.metrics) setMetrics(data.metrics);
    if (typeof data.gatewayTetheringOnline === 'boolean') {
      setGatewayTetheringOnline(data.gatewayTetheringOnline);
    }
  }, []);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      modules,
      setModules,
      activeModuleId,
      setActiveModuleId,
      peers,
      setPeers,
      transferHistory,
      setTransferHistory,
      cacheEntries,
      setCacheEntries,
      recentQueries,
      setRecentQueries,
      submissions,
      setSubmissions,
      metrics,
      setMetrics,
      gatewayTetheringOnline,
      setGatewayTetheringOnline,
      isSyncing,
      setIsSyncing,
      isAsking,
      setIsAsking,
      activeWebRtcChannelsCount,
      setActiveWebRtcChannelsCount,
      statusBanner,
      setStatusBanner,
      lastBinaryPacketInfo,
      setLastBinaryPacketInfo,
      studentProfile,
      setStudentProfile,
      isBrowserOnline,
      simulatedOfflineMode,
      setSimulatedOfflineMode,
      isOfflineActive,
      tutorPromptDraft,
      setTutorPromptDraft,
      applyServerState,
      isQrScannerOpen,
      setIsQrScannerOpen,
      openQrScanner,
      closeQrScanner,
      customHostUrl,
      setCustomHostUrl,
    }),
    [
      activeTab,
      modules,
      activeModuleId,
      peers,
      transferHistory,
      cacheEntries,
      recentQueries,
      submissions,
      metrics,
      gatewayTetheringOnline,
      isSyncing,
      isAsking,
      activeWebRtcChannelsCount,
      statusBanner,
      lastBinaryPacketInfo,
      studentProfile,
      isBrowserOnline,
      simulatedOfflineMode,
      isOfflineActive,
      tutorPromptDraft,
      applyServerState,
      isQrScannerOpen,
      openQrScanner,
      closeQrScanner,
      customHostUrl,
    ]
  );

  return <MeshNetworkContext.Provider value={value}>{children}</MeshNetworkContext.Provider>;
};

export function useMeshNetwork(): MeshNetworkContextType {
  const context = useContext(MeshNetworkContext);
  if (!context) {
    throw new Error('useMeshNetwork must be used within a MeshNetworkProvider');
  }
  return context;
}
