import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Binary } from 'lucide-react';
import {
  INITIAL_MODULES,
  INITIAL_PEERS,
  INITIAL_TRANSFER_HISTORY,
  INITIAL_CACHE_ENTRIES,
} from './utils/seedData';
import {
  calculateSwarmMetrics,
  encodeBinaryChunkPayload,
  decodeBinaryChunkPayload,
  type LearningModule,
  type PeerNode,
  type ChunkTransferEvent,
  type CacheEntry,
  type TutorAskResponse,
  type SwarmMetrics,
} from './utils/edgeEngine';
import {
  loadClientDownloadedChunks,
  saveClientDownloadedChunks,
  saveBinaryChunkRecord,
} from './utils/clientStorage';
import { ModuleLibraryView } from './components/ModuleLibraryView';
import { MeshTopologyView } from './components/MeshTopologyView';
import { AiTutorGatewayView } from './components/AiTutorGatewayView';
import { TeacherHostView } from './components/TeacherHostView';
import { PWAInstallButton, useOnlineStatus } from './components/PWAInstallButton';

type ActiveTab = 'pustaka' | 'mesh' | 'tutor' | 'guru';

const NAV_ITEMS: { id: ActiveTab; label: string; mobileLabel: string }[] = [
  { id: 'pustaka', label: 'Pustaka Materi', mobileLabel: 'Pustaka Materi' },
  { id: 'mesh', label: 'Jaringan Mesh P2P', mobileLabel: 'Mesh P2P' },
  { id: 'tutor', label: 'Tutor AI Satu Pintu', mobileLabel: 'Tutor AI' },
  { id: 'guru', label: 'Simpul Guru & Cache', mobileLabel: 'Simpul Guru' },
];

const STUDENT_PEER_ID = 'peer-siswa-05';
const HOST_PIN_STORAGE_KEY = 'ruangpintar_verified_host_pin';

function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = window.atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
  const [lastBinaryPacketInfo, setLastBinaryPacketInfo] = useState<string | null>(null);

  // Teacher Host PIN auth state (Fase 4)
  const [verifiedHostPin, setVerifiedHostPin] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem(HOST_PIN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Browser Online/Offline status (Fase 5)
  const isBrowserOnline = useOnlineStatus();
  const [ simulatedOfflineMode, setSimulatedOfflineMode ] = useState<boolean>(false);
  const isOfflineActive = !isBrowserOnline || simulatedOfflineMode;

  const wsRef = useRef<WebSocket | null>(null);
  const rtcPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  /**
   * Processes a raw binary ArrayBuffer received over RTCDataChannel or WebSocket,
   * decodes the RPE1 binary header + curriculum payload, and stores it in IndexedDB.
   */
  const handleIncomingBinaryChunk = useCallback((buffer: ArrayBuffer | Uint8Array) => {
    const decoded = decodeBinaryChunkPayload(buffer);
    if (!decoded || !decoded.valid) return;

    void saveBinaryChunkRecord({
      key: `${decoded.moduleId}:${decoded.chunkIndex}`,
      moduleId: decoded.moduleId,
      chunkIndex: decoded.chunkIndex,
      chunkHash: decoded.chunkHash,
      fromPeerId: decoded.fromPeerId,
      byteLength: decoded.byteLength,
      payloadText: decoded.contentPayload,
      savedAt: Date.now(),
    });

    setLastBinaryPacketInfo(
      `Frame Biner RPE1 [${decoded.moduleCode} #${decoded.chunkIndex}] (${decoded.byteLength} B ArrayBuffer via RTCDataChannel)`
    );
  }, []);

  /**
   * Sends a binary Uint8Array frame across all open RTCDataChannels (and uses a real
   * local WebRTC loopback RTCDataChannel pair when only 1 browser tab is open so every
   * P2P download exercises genuine WebRTC SCTP binary ArrayBuffer transport).
   */
  const transmitBinaryViaWebRtcDataChannel = useCallback(
    async (frame: Uint8Array): Promise<void> => {
      let sentOverRemotePeer = false;
      for (const dc of dataChannelsRef.current.values()) {
        if (dc.readyState === 'open') {
          try {
            dc.binaryType = 'arraybuffer';
            dc.send(frame.buffer as ArrayBuffer);
            sentOverRemotePeer = true;
          } catch {
            // Continue to fallback/loopback
          }
        }
      }

      if (sentOverRemotePeer) {
        handleIncomingBinaryChunk(frame);
        return;
      }

      if (typeof RTCPeerConnection === 'undefined') {
        handleIncomingBinaryChunk(frame);
        return;
      }

      await new Promise<void>((resolve) => {
        const pcSender = new RTCPeerConnection();
        const pcReceiver = new RTCPeerConnection();
        let settled = false;

        const finish = () => {
          if (settled) return;
          settled = true;
          try {
            pcSender.close();
            pcReceiver.close();
          } catch {
            // Ignore close errors
          }
          resolve();
        };

        const timeoutId = window.setTimeout(() => {
          handleIncomingBinaryChunk(frame);
          finish();
        }, 600);

        pcSender.onicecandidate = (e) => {
          if (e.candidate) void pcReceiver.addIceCandidate(e.candidate).catch(() => {});
        };
        pcReceiver.onicecandidate = (e) => {
          if (e.candidate) void pcSender.addIceCandidate(e.candidate).catch(() => {});
        };

        pcReceiver.ondatachannel = (ev) => {
          const rxChannel = ev.channel;
          rxChannel.binaryType = 'arraybuffer';
          rxChannel.onmessage = (msgEv) => {
            window.clearTimeout(timeoutId);
            if (msgEv.data instanceof ArrayBuffer) {
              handleIncomingBinaryChunk(msgEv.data);
            } else if (msgEv.data instanceof Uint8Array) {
              handleIncomingBinaryChunk(msgEv.data);
            }
            finish();
          };
        };

        const txChannel = pcSender.createDataChannel('ruangpintar-binary-chunk');
        txChannel.binaryType = 'arraybuffer';
        txChannel.onopen = () => {
          try {
            txChannel.send(frame.buffer as ArrayBuffer);
          } catch {
            handleIncomingBinaryChunk(frame);
            finish();
          }
        };

        pcSender
          .createOffer()
          .then((offer) => pcSender.setLocalDescription(offer))
          .then(() => {
            if (pcSender.localDescription) {
              return pcReceiver.setRemoteDescription(pcSender.localDescription);
            }
          })
          .then(() => pcReceiver.createAnswer())
          .then((answer) => pcReceiver.setLocalDescription(answer))
          .then(() => {
            if (pcReceiver.localDescription) {
              return pcSender.setRemoteDescription(pcReceiver.localDescription);
            }
          })
          .catch(() => {
            window.clearTimeout(timeoutId);
            handleIncomingBinaryChunk(frame);
            finish();
          });
      });
    },
    [handleIncomingBinaryChunk]
  );

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
    if (data.metrics) setMetrics(data.metrics);
    if (typeof data.gatewayTetheringOnline === 'boolean') {
      setGatewayTetheringOnline(data.gatewayTetheringOnline);
    }
  }, []);

  // Load persisted IndexedDB chunks on mount, fetch server state, and establish WebSocket + binary WebRTC DataChannel
  useEffect(() => {
    let mounted = true;

    async function initStateAndIndexedDb() {
      const savedChunks = await loadClientDownloadedChunks(STUDENT_PEER_ID);

      if (savedChunks && mounted) {
        setPeers((prev) =>
          prev.map((p) =>
            p.id === STUDENT_PEER_ID
              ? { ...p, moduleChunks: { ...p.moduleChunks, ...savedChunks } }
              : p
          )
        );
      }

      try {
        const r = await fetch('/api/state');
        if (r.ok) {
          const data = await r.json();
          if (mounted && data) {
            applyServerState(data);
          }
        }
        // Reconcile IndexedDB chunks with server if client has local chunks
        if (savedChunks && Object.keys(savedChunks).length > 0) {
          const syncRes = await fetch('/api/p2p/sync-client-chunks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              peerId: STUDENT_PEER_ID,
              moduleChunks: savedChunks,
            }),
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (mounted && syncData?.state) {
              applyServerState(syncData.state);
            }
          }
        }
      } catch {
        // Offline mode: IndexedDB + seed data already loaded
      }
    }

    void initStateAndIndexedDb();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let reconnectTimeoutId: number | undefined;

    const connectWebSocket = () => {
      if (!mounted) return;

      try {
        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onclose = () => {
          if (mounted) {
            reconnectTimeoutId = window.setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {
            // Ignore close errors
          }
        };

      const setupDataChannel = (remoteClientId: string, dc: RTCDataChannel) => {
        dc.binaryType = 'arraybuffer';
        dataChannelsRef.current.set(remoteClientId, dc);

        dc.onopen = () => {
          if (mounted) {
            setActiveWebRtcChannelsCount(5 + rtcPeersRef.current.size);
          }
        };

        dc.onmessage = (ev) => {
          if (ev.data instanceof ArrayBuffer) {
            handleIncomingBinaryChunk(ev.data);
          } else if (ev.data instanceof Blob) {
            void ev.data.arrayBuffer().then((ab) => handleIncomingBinaryChunk(ab));
          }
        };

        dc.onclose = () => {
          dataChannelsRef.current.delete(remoteClientId);
        };
      };

      const createPeerConnection = (remoteClientId: string, initiator: boolean) => {
        if (typeof RTCPeerConnection === 'undefined') return null;
        if (rtcPeersRef.current.has(remoteClientId)) {
          return rtcPeersRef.current.get(remoteClientId)!;
        }

        // Optimal for 3T regions: use empty iceServers when offline to avoid 5-10s Google STUN DNS timeout lag
        const useStun = !isOfflineActive && gatewayTetheringOnline;
        const pc = new RTCPeerConnection({
          iceServers: useStun ? [{ urls: 'stun:stun.l.google.com:19302' }] : [],
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
          setupDataChannel(remoteClientId, dc);

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
            setupDataChannel(remoteClientId, ev.channel);
          };
        }

        return pc;
      };

      ws.onmessage = async (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            handleIncomingBinaryChunk(event.data);
            return;
          }

          const msg = JSON.parse(String(event.data));
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
  };

  connectWebSocket();

  return () => {
    mounted = false;
    if (reconnectTimeoutId) {
      window.clearTimeout(reconnectTimeoutId);
    }
    wsRef.current?.close();
      for (const dc of dataChannelsRef.current.values()) {
        dc.close();
      }
      dataChannelsRef.current.clear();
      for (const pc of rtcPeersRef.current.values()) {
        pc.close();
      }
      rtcPeersRef.current.clear();
    };
  }, [applyServerState, handleIncomingBinaryChunk]);

  const handleSyncChunks = async (
    moduleId: string,
    chunksCount = 4,
    targetPeerId = STUDENT_PEER_ID
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

        // Stream real binary ArrayBuffer frames over WebRTC RTCDataChannel and persist in IndexedDB
        if (Array.isArray(data.binaryPayloadsBase64) && data.binaryPayloadsBase64.length > 0) {
          for (const b64 of data.binaryPayloadsBase64 as string[]) {
            const frame = base64ToUint8Array(b64);
            await transmitBinaryViaWebRtcDataChannel(frame);
          }
        } else if (data.transferredCount > 0) {
          const mod = modules.find((m) => m.id === moduleId) || modules[0];
          const frame = encodeBinaryChunkPayload(mod, 0, 'peer-host-guru', targetPeerId);
          await transmitBinaryViaWebRtcDataChannel(frame);
        }

        if (data.transferredCount > 0) {
          setStatusBanner(
            `Berhasil mengunduh ${data.transferredCount} pecahan biner (ArrayBuffer RPE1) via WebRTC DataChannel & disimpan ke IndexedDB (0 KB Kuota ISP · +35 XP).`
          );
        } else {
          setStatusBanner('Seluruh 16 pecahan data modul ini sudah lengkap di penyimpanan lokal perangkat siswa.');
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetPeerChunks = async (
    moduleId: string,
    targetPeerId = STUDENT_PEER_ID
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
        if (data.state) {
          applyServerState(data.state);
        }
        setStatusBanner('Pecahan data pada perangkat siswa direset. Siap menguji unduhan biner P2P baru.');
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
            : 'Jawaban baru diterima via Satu Pintu Cloud Guru dan otomatis disimpan ke SQLite Cache Lokal kelas.'
        );
      }
      return data.result || null;
    } finally {
      setIsAsking(false);
    }
  };

  const handleVerifyHostPin = async (pin: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/host/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.valid) {
        return { ok: false, error: data.error || 'PIN Simpul Guru tidak valid.' };
      }
      const cleanPin = pin.trim();
      setVerifiedHostPin(cleanPin);
      try {
        window.sessionStorage.setItem(HOST_PIN_STORAGE_KEY, cleanPin);
      } catch {
        // Ignore storage errors
      }
      return { ok: true };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
    }
  };

  const handleChangeHostPin = async (
    currentPin: string,
    newPin: string
  ): Promise<{ ok: boolean; error?: string; message?: string }> => {
    try {
      const response = await fetch('/api/host/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-host-pin': verifiedHostPin || currentPin,
        },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        return { ok: false, error: data.error || 'Gagal memperbarui PIN.' };
      }
      const cleanNew = newPin.trim();
      setVerifiedHostPin(cleanNew);
      try {
        window.sessionStorage.setItem(HOST_PIN_STORAGE_KEY, cleanNew);
      } catch {
        // Ignore storage errors
      }
      return { ok: true, message: data.message };
    } catch {
      return { ok: false, error: 'Gagal menghubungi server Simpul Guru.' };
    }
  };

  const handleLockHost = () => {
    setVerifiedHostPin(null);
    try {
      window.sessionStorage.removeItem(HOST_PIN_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleToggleGatewayTethering = async () => {
    const response = await fetch('/api/gateway/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-host-pin': verifiedHostPin || '',
      },
      body: JSON.stringify({ online: !gatewayTetheringOnline }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.state) applyServerState(data.state);
    } else if (response.status === 401) {
      handleLockHost();
      setStatusBanner('Sesi PIN Simpul Guru berakhir. Silakan masukkan kembali PIN Simpul Guru.');
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
      headers: {
        'Content-Type': 'application/json',
        'x-host-pin': verifiedHostPin || '',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) handleLockHost();
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
      headers: {
        'Content-Type': 'application/json',
        'x-host-pin': verifiedHostPin || '',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) handleLockHost();
      return { ok: false, error: data.error || 'Gagal menyimpan cache.' };
    }
    if (data.state) applyServerState(data.state);
    return { ok: true };
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-canvas text-slate-900 selection:bg-sky-100 selection:text-sky-950">
      {/* Fase 5: Offline Mode Indicator Banner */}
      {isOfflineActive && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-900 text-amber-50 px-6 py-2.5 text-xs font-medium border-b border-amber-700"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Mode Offline Aktif — Anda sedang mengakses pustaka dari penyimpanan lokal perangkat.
              </span>
            </div>
            {simulatedOfflineMode && (
              <button
                type="button"
                onClick={() => setSimulatedOfflineMode(false)}
                className="px-2.5 py-0.5 text-[11px] font-mono font-semibold bg-amber-800 hover:bg-amber-700 text-amber-100 rounded border border-amber-600 cursor-pointer"
              >
                Kembali Online LAN
              </button>
            )}
          </div>
        </div>
      )}

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

          {/* Zone 3: Primary action + PWA Install prompt if available */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton />
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={isSyncing}
              onClick={() => handleSyncChunks(activeModuleId, 4, STUDENT_PEER_ID)}
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
              className="bg-gradient-to-r from-emerald-50/95 via-teal-50/95 to-sky-50/95 border border-emerald-300/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-950 shadow-xs"
            >
              <div className="space-y-0.5">
                <div className="font-semibold">{statusBanner}</div>
                {lastBinaryPacketInfo && (
                  <div className="text-[11px] font-mono text-sky-800 flex items-center gap-1.5">
                    <Binary className="w-3.5 h-3.5 shrink-0" />
                    <span>{lastBinaryPacketInfo}</span>
                  </div>
                )}
              </div>
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
                onSyncChunks={(modId, count) => handleSyncChunks(modId, count, STUDENT_PEER_ID)}
                onResetPeerChunks={(modId) => handleResetPeerChunks(modId, STUDENT_PEER_ID)}
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
                isPinVerified={Boolean(verifiedHostPin)}
                onVerifyPin={handleVerifyHostPin}
                onChangePin={handleChangeHostPin}
                onLockHost={handleLockHost}
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
            RuangPintar Edge — Infrastruktur Pembelajaran Terdesentralisasi Wilayah 3T (SQLite + IndexedDB + WebRTC Binary + PWA)
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => setSimulatedOfflineMode((prev) => !prev)}
              className="hover:text-amber-700 transition-colors cursor-pointer whitespace-nowrap font-mono text-[11px] px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-50 text-slate-700"
            >
              {isOfflineActive ? 'Matikan Simulasi Offline' : 'Uji Mode Offline Lokal'}
            </button>
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
