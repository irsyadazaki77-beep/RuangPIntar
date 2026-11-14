import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
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
  type PendingAiQuestion,
  type ClassroomBroadcast,
} from '../utils/edgeEngine';
import {
  saveClientDownloadedChunks,
  loadCustomHostUrl,
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

function generateUniqueStudentPeerId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `peer-siswa-${crypto.randomUUID().slice(0, 6)}`;
    }
  } catch {
    // Fallback below
  }
  return `peer-siswa-${Math.random().toString(36).slice(2, 8)}`;
}

interface ServerStatePayload {
  modules?: LearningModule[];
  peers?: PeerNode[];
  transferHistory?: ChunkTransferEvent[];
  cacheEntries?: CacheEntry[];
  recentQueries?: TutorAskResponse[];
  submissions?: StudentSubmission[];
  metrics?: SwarmMetrics;
  gatewayTetheringOnline?: boolean;
  pendingAiQuestions?: PendingAiQuestion[];
  classroomBroadcast?: ClassroomBroadcast | null;
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
  pendingAiQuestions: PendingAiQuestion[];
  setPendingAiQuestions: React.Dispatch<React.SetStateAction<PendingAiQuestion[]>>;
  classroomBroadcast: ClassroomBroadcast | null;
  setClassroomBroadcast: React.Dispatch<React.SetStateAction<ClassroomBroadcast | null>>;
  metrics: SwarmMetrics;
  setMetrics: React.Dispatch<React.SetStateAction<SwarmMetrics>>;
  gatewayTetheringOnline: boolean;
  setGatewayTetheringOnline: React.Dispatch<React.SetStateAction<boolean>>;
  socketConnected: boolean;
  setSocketConnected: (connected: boolean) => void;
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
  needsOnboarding: boolean;
  setNeedsOnboarding: (needs: boolean) => void;
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
  const [pendingAiQuestions, setPendingAiQuestions] = useState<PendingAiQuestion[]>([]);
  const [classroomBroadcast, setClassroomBroadcast] = useState<ClassroomBroadcast | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string>(INITIAL_MODULES[0].id);
  const [gatewayTetheringOnline, setGatewayTetheringOnline] = useState<boolean>(true);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [activeWebRtcChannelsCount, setActiveWebRtcChannelsCount] = useState<number>(5);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [lastBinaryPacketInfo, setLastBinaryPacketInfo] = useState<string | null>(null);
  const [tutorPromptDraft, setTutorPromptDraft] = useState<string | null>(null);
  const [simulatedOfflineMode, setSimulatedOfflineMode] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [customHostUrl, setCustomHostUrl] = useState<string | null>(() => loadCustomHostUrl());

  const openQrScanner = useCallback(() => setIsQrScannerOpen(true), []);
  const closeQrScanner = useCallback(() => setIsQrScannerOpen(false), []);

  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(() => {
    try {
      return !window.localStorage.getItem(STUDENT_PROFILE_KEY);
    } catch {
      return false;
    }
  });

  const [studentProfile, setStudentProfile] = useState<StudentProfile>(() => {
    try {
      const saved = window.localStorage.getItem(STUDENT_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as StudentProfile;
        const normalizedPeerId =
          parsed.peerId && /^peer-siswa-[a-z0-9-]+$/i.test(parsed.peerId)
            ? parsed.peerId
            : generateUniqueStudentPeerId();
        return {
          peerId: normalizedPeerId,
          studentName: parsed.studentName || 'Siswa Baru',
          avatar: parsed.avatar || '🐬 Lumba-lumba',
        };
      }
    } catch {}
    return {
      peerId: generateUniqueStudentPeerId(),
      studentName: 'Hendrikus D.',
      avatar: '🐬 Lumba-lumba',
    };
  });

  const studentPeerIdRef = useRef(studentProfile.peerId);
  studentPeerIdRef.current = studentProfile.peerId;

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
      const currentPeerId = studentPeerIdRef.current || STUDENT_PEER_ID;
      const studentPeer = data.peers.find((p) => p.id === currentPeerId);
      if (studentPeer) {
        void saveClientDownloadedChunks(currentPeerId, studentPeer.moduleChunks);
      }
    }
    if (data.transferHistory) setTransferHistory(data.transferHistory);
    if (data.cacheEntries) setCacheEntries(data.cacheEntries);
    if (data.recentQueries) setRecentQueries(data.recentQueries);
    if (data.submissions) setSubmissions(data.submissions);
    if (data.pendingAiQuestions) setPendingAiQuestions(data.pendingAiQuestions);
    if ('classroomBroadcast' in data) {
      setClassroomBroadcast(data.classroomBroadcast ?? null);
    }
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
      pendingAiQuestions,
      setPendingAiQuestions,
      classroomBroadcast,
      setClassroomBroadcast,
      metrics,
      setMetrics,
      gatewayTetheringOnline,
      setGatewayTetheringOnline,
      socketConnected,
      setSocketConnected,
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
      needsOnboarding,
      setNeedsOnboarding,
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
      pendingAiQuestions,
      classroomBroadcast,
      metrics,
      gatewayTetheringOnline,
      socketConnected,
      isSyncing,
      isAsking,
      activeWebRtcChannelsCount,
      statusBanner,
      lastBinaryPacketInfo,
      studentProfile,
      needsOnboarding,
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
