import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  INITIAL_MODULES,
  INITIAL_PEERS,
  INITIAL_TRANSFER_HISTORY,
  INITIAL_CACHE_ENTRIES,
} from './utils/seedData';
import {
  calculateSwarmMetrics,
  type LearningModule,
  type PeerNode,
  type ChunkTransferEvent,
  type CacheEntry,
  type TutorAskResponse,
  type SwarmMetrics,
} from './utils/edgeEngine';
import { ModuleLibraryView } from './components/ModuleLibraryView';
import { MeshTopologyView } from './components/MeshTopologyView';
import { AiTutorGatewayView } from './components/AiTutorGatewayView';
import { TeacherHostView } from './components/TeacherHostView';

type ActiveTab = 'pustaka' | 'mesh' | 'tutor' | 'guru';

const NAV_ITEMS: { id: ActiveTab; label: string; mobileLabel: string }[] = [
  { id: 'pustaka', label: 'Pustaka Materi', mobileLabel: 'Pustaka Materi' },
  { id: 'mesh', label: 'Jaringan Mesh P2P', mobileLabel: 'Mesh P2P' },
  { id: 'tutor', label: 'Tutor AI Satu Pintu', mobileLabel: 'Tutor AI' },
  { id: 'guru', label: 'Simpul Guru & Cache', mobileLabel: 'Simpul Guru' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pustaka');
  const [modules, setModules] = useState<LearningModule[]>(INITIAL_MODULES);
  const [peers, setPeers] = useState<PeerNode[]>(INITIAL_PEERS);
  const [transferHistory, setTransferHistory] = useState<ChunkTransferEvent[]>(
    INITIAL_TRANSFER_HISTORY
  );
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>(INITIAL_CACHE_ENTRIES);
  const [recentQueries, setRecentQueries] = useState<TutorAskResponse[]>([]);
  const [metrics, setMetrics] = useState<SwarmMetrics>(() =>
    calculateSwarmMetrics(INITIAL_PEERS, INITIAL_TRANSFER_HISTORY, INITIAL_CACHE_ENTRIES, 4)
  );
  const [gatewayTetheringOnline, setGatewayTetheringOnline] = useState<boolean>(true);
  const [activeModuleId, setActiveModuleId] = useState<string>(INITIAL_MODULES[0].id);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [activeWebRtcChannelsCount, setActiveWebRtcChannelsCount] = useState<number>(5);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [tutorPromptDraft, setTutorPromptDraft] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const rtcPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const applyServerState = useCallback((data: {
    modules?: LearningModule[];
    peers?: PeerNode[];
    transferHistory?: ChunkTransferEvent[];
    cacheEntries?: CacheEntry[];
    recentQueries?: TutorAskResponse[];
    metrics?: SwarmMetrics;
    gatewayTetheringOnline?: boolean;
  }) => {
    if (!data) return;
    if (data.modules) setModules(data.modules);
    if (data.peers) setPeers(data.peers);
    if (data.transferHistory) setTransferHistory(data.transferHistory);
    if (data.cacheEntries) setCacheEntries(data.cacheEntries);
    if (data.recentQueries) setRecentQueries(data.recentQueries);
    if (data.metrics) setMetrics(data.metrics);
    if (typeof data.gatewayTetheringOnline === 'boolean') {
      setGatewayTetheringOnline(data.gatewayTetheringOnline);
    }
  }, []);

  // Fetch initial state and establish WebSocket + WebRTC DataChannel mesh signaling
  useEffect(() => {
    let mounted = true;

    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data) applyServerState(data);
      })
      .catch(() => {
        // Initial fallback seed data is already loaded
      });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const createPeerConnection = (remoteClientId: string, initiator: boolean) => {
        if (typeof RTCPeerConnection === 'undefined') return null;
        if (rtcPeersRef.current.has(remoteClientId)) {
          return rtcPeersRef.current.get(remoteClientId)!;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        rtcPeersRef.current.set(remoteClientId, pc);

        pc.onicecandidate = (ev) => {
          if (ev.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'webrtc:ice',
                targetClientId: remoteClientId,
                candidate: ev.candidate,
              })
            );
          }
        };

        if (initiator) {
          const dc = pc.createDataChannel('ruangpintar-chunks');
          dc.onopen = () => {
            if (mounted) {
              setActiveWebRtcChannelsCount(5 + rtcPeersRef.current.size);
            }
          };
          pc.createOffer()
            .then((offer) => pc.setLocalDescription(offer))
            .then(() => {
              if (ws.readyState === WebSocket.OPEN && pc.localDescription) {
                ws.send(
                  JSON.stringify({
                    type: 'webrtc:offer',
                    targetClientId: remoteClientId,
                    sdp: pc.localDescription,
                  })
                );
              }
            })
            .catch(() => {});
        } else {
          pc.ondatachannel = (ev) => {
            ev.channel.onopen = () => {
              if (mounted) {
                setActiveWebRtcChannelsCount(5 + rtcPeersRef.current.size);
              }
            };
          };
        }

        return pc;
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'init' || msg.type === 'state:sync') {
            if (mounted && msg.data) applyServerState(msg.data);
          } else if (msg.type === 'webrtc:peer-joined') {
            createPeerConnection(msg.remoteClientId, true);
          } else if (msg.type === 'webrtc:offer' && msg.fromClientId) {
            const pc = createPeerConnection(msg.fromClientId, false);
            if (pc && msg.sdp) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              if (ws.readyState === WebSocket.OPEN && pc.localDescription) {
                ws.send(
                  JSON.stringify({
                    type: 'webrtc:answer',
                    targetClientId: msg.fromClientId,
                    sdp: pc.localDescription,
                  })
                );
              }
            }
          } else if (msg.type === 'webrtc:answer' && msg.fromClientId) {
            const pc = rtcPeersRef.current.get(msg.fromClientId);
            if (pc && msg.sdp) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            }
          } else if (msg.type === 'webrtc:ice' && msg.fromClientId) {
            const pc = rtcPeersRef.current.get(msg.fromClientId);
            if (pc && msg.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
            }
          }
        } catch {
          // Ignore malformed WS messages
        }
      };
    } catch {
      // Fallback gracefully if WebSocket is blocked
    }

    return () => {
      mounted = false;
      wsRef.current?.close();
      for (const pc of rtcPeersRef.current.values()) {
        pc.close();
      }
      rtcPeersRef.current.clear();
    };
  }, [applyServerState]);

  const handleSyncChunks = async (
    moduleId: string,
    chunksCount = 4,
    targetPeerId = 'peer-siswa-05'
  ) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/p2p/transfer-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, targetPeerId, chunksCount }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.state) applyServerState(data.state);
        if (data.transferredCount > 0) {
          setStatusBanner(
            `Berhasil mengunduh ${data.transferredCount} pecahan data via WebRTC DataChannel (0 KB Kuota Provider · +35 XP Kontributor Mesh P2P).`
          );
        } else {
          setStatusBanner('Seluruh 16 pecahan data modul ini sudah lengkap di perangkat siswa.');
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetPeerChunks = async (
    moduleId: string,
    targetPeerId = 'peer-siswa-05'
  ) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/p2p/reset-peer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, targetPeerId }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.state) applyServerState(data.state);
        setStatusBanner('Pecahan data pada perangkat siswa direset. Siap menguji unduhan P2P baru.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAskQuestion = async (payload: {
    question: string;
    moduleId: string;
    askedByPeerName: string;
    forceCloudRefresh?: boolean;
  }): Promise<TutorAskResponse | null> => {
    setIsAsking(true);
    try {
      const response = await fetch('/api/tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.state) applyServerState(data.state);
      if (data.result) {
        const isHit = data.result.source === 'LOCAL_CACHE';
        setStatusBanner(
          isHit
            ? `Cache Hit Lokal (0 ms · Hemat ${data.result.ispQuotaKBaved} KB Kuota · +45 XP Literasi AI 0-Kuota)!`
            : 'Jawaban baru diterima via Satu Pintu Cloud Guru dan otomatis disimpan ke Cache Lokal kelas.'
        );
      }
      return data.result || null;
    } finally {
      setIsAsking(false);
    }
  };

  const handleToggleGatewayTethering = async () => {
    const response = await fetch('/api/gateway/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: !gatewayTetheringOnline }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.state) applyServerState(data.state);
    }
  };

  const handlePublishModule = async (payload: {
    title: string;
    subject: string;
    gradeLevel: string;
    summary: string;
    sectionHeading: string;
    sectionBody: string;
    formula: string;
    keyTakeaway: string;
    sizeMB: number;
  }): Promise<{ ok: boolean; error?: string }> => {
    const response = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error || 'Gagal menyimpan modul.' };
    }
    if (data.state) applyServerState(data.state);
    if (data.module?.id) setActiveModuleId(data.module.id);
    return { ok: true };
  };

  const handleSeedCacheEntry = async (payload: {
    moduleId: string;
    questionCanonical: string;
    answerMarkdown: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const response = await fetch('/api/cache/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data.error || 'Gagal menyimpan cache.' };
    }
    if (data.state) applyServerState(data.state);
    return { ok: true };
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-canvas text-slate-900 selection:bg-sky-100 selection:text-sky-950">
      {/* Strict 3-Zone Top Bar Contract with Modern Frosted Glass */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-slate-200/85 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('pustaka');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-sky-700 transition-colors"
          >
            RuangPintar Edge
          </a>

          {/* Zone 2: 4 concise single-line text navigation links with animated gradient underline */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="top-nav-underline"
                      className="absolute left-0 right-0 -bottom-[15px] h-0.5 bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={isSyncing}
              onClick={() => handleSyncChunks(activeModuleId, 4, 'peer-siswa-05')}
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-50 rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi P2P'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Responsive Mobile Navigation Strip (visible only below md breakpoint) */}
        <nav
          aria-label="Navigasi Layar Kecil"
          className="flex md:hidden items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white font-semibold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.mobileLabel}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="popLayout">
          {statusBanner && (
            <motion.div
              key={statusBanner}
              initial={{ opacity: 0, y: -8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              role="status"
              className="bg-gradient-to-r from-emerald-50/95 via-teal-50/95 to-sky-50/95 border border-emerald-300/80 rounded-xl px-4 py-3 flex items-center justify-between gap-4 text-xs text-emerald-950 shadow-xs"
            >
              <span className="font-semibold">{statusBanner}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-emerald-800 hover:text-emerald-950 font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer px-2.5 py-1 rounded-md bg-white/80 hover:bg-white border border-emerald-200/80 transition-colors"
              >
                Tutup
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0.96, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0.96, y: -2 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'pustaka' && (
              <ModuleLibraryView
                modules={modules}
                peers={peers}
                metrics={metrics}
                activeModuleId={activeModuleId}
                onSelectModule={(id) => setActiveModuleId(id)}
                onSyncChunks={(modId, count) => handleSyncChunks(modId, count, 'peer-siswa-05')}
                onResetPeerChunks={(modId) => handleResetPeerChunks(modId, 'peer-siswa-05')}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onAskTutorWithPrompt={(modId, prompt) => {
                  setActiveModuleId(modId);
                  setTutorPromptDraft(prompt);
                  setActiveTab('tutor');
                }}
                isSyncing={isSyncing}
              />
            )}

            {activeTab === 'mesh' && (
              <MeshTopologyView
                modules={modules}
                peers={peers}
                transferHistory={transferHistory}
                metrics={metrics}
                activeWebRtcChannelsCount={activeWebRtcChannelsCount}
                onTriggerPeerTransfer={(modId, peerId, count) =>
                  handleSyncChunks(modId, count, peerId)
                }
                onResetPeerChunks={handleResetPeerChunks}
                isSyncing={isSyncing}
              />
            )}

            {activeTab === 'tutor' && (
              <AiTutorGatewayView
                modules={modules}
                peers={peers}
                cacheEntries={cacheEntries}
                recentQueries={recentQueries}
                metrics={metrics}
                gatewayTetheringOnline={gatewayTetheringOnline}
                activeModuleId={activeModuleId}
                onAskQuestion={handleAskQuestion}
                isAsking={isAsking}
                initialQuestionPrompt={tutorPromptDraft}
                onClearInitialPrompt={() => setTutorPromptDraft(null)}
              />
            )}

            {activeTab === 'guru' && (
              <TeacherHostView
                modules={modules}
                cacheEntries={cacheEntries}
                metrics={metrics}
                gatewayTetheringOnline={gatewayTetheringOnline}
                onToggleGatewayTethering={handleToggleGatewayTethering}
                onPublishModule={handlePublishModule}
                onSeedCacheEntry={handleSeedCacheEntry}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 bg-white/75 backdrop-blur-md mt-12">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            RuangPintar Edge — Infrastruktur Pembelajaran Terdesentralisasi Wilayah 3T (Tertinggal, Terdepan, Terluar)
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('pustaka')}
              className="hover:text-sky-700 transition-colors cursor-pointer whitespace-nowrap font-medium"
            >
              Pustaka P2P
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mesh')}
              className="hover:text-sky-700 transition-colors cursor-pointer whitespace-nowrap font-medium"
            >
              Topologi WebRTC
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tutor')}
              className="hover:text-sky-700 transition-colors cursor-pointer whitespace-nowrap font-medium"
            >
              Gateway AI Lokal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
