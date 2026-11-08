import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MeshNetworkProvider,
  useMeshNetwork,
  STUDENT_PEER_ID,
} from './context/MeshNetworkContext';
import { useMeshSocket } from './hooks/useMeshSocket';
import { useTeacherHost } from './hooks/useTeacherHost';
import { useOfflineSync } from './hooks/useOfflineSync';
import { AppHeader, NAV_ITEMS } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { StatusBanner } from './components/layout/StatusBanner';
import { ModuleLibraryView } from './components/ModuleLibraryView';
import { MeshTopologyView } from './components/MeshTopologyView';
import { AiTutorGatewayView } from './components/AiTutorGatewayView';
import { TeacherHostView } from './components/TeacherHostView';
import { stopSpeech } from './utils/speechUtils';
import {
  encodeBinaryChunkPayload,
  type TutorAskResponse,
} from './utils/edgeEngine';

function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = window.atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function safeParseJson(res: Response): Promise<Record<string, any>> {
  try {
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) {
      return {};
    }
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function MainLayout() {
  const {
    activeTab,
    setActiveTab,
    modules,
    peers,
    transferHistory,
    cacheEntries,
    recentQueries,
    metrics,
    gatewayTetheringOnline,
    activeModuleId,
    setActiveModuleId,
    isSyncing,
    setIsSyncing,
    isAsking,
    setIsAsking,
    activeWebRtcChannelsCount,
    setStatusBanner,
    tutorPromptDraft,
    setTutorPromptDraft,
    applyServerState,
    studentProfile,
  } = useMeshNetwork();

  // Lifecycle socket and WebRTC hook
  const { transmitBinaryViaWebRtcDataChannel } = useMeshSocket();

  // Teacher Host operations hook
  const {
    isPinVerified,
    handleVerifyHostPin,
    handleChangeHostPin,
    handleLockHost,
    handleToggleGatewayTethering,
    handlePublishModule,
    handleSeedCacheEntry,
    handleExportPackage,
    handleImportPackage,
  } = useTeacherHost();

  // Offline sync hook
  useOfflineSync();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    stopSpeech();
  }, [activeTab]);

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
        const data = await safeParseJson(response);
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
            `🎉 Berhasil menerima materi dari teman sekelas! Buku tersimpan di perangkatmu (0 KB Kuota · +35 XP).`
          );
        } else {
          setStatusBanner(
            '📖 Buku Sudah Siap Dibaca! Seluruh bab sudah lengkap tersimpan di perangkatmu.'
          );
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
        const data = await safeParseJson(response);
        if (data.state) {
          applyServerState(data.state);
        }
        setStatusBanner(
          '🔄 Status materi direset. Kamu bisa mencoba berbagi buku lagi dengan teman sekelas!'
        );
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
      const data = await safeParseJson(response);
      if (data.state) applyServerState(data.state);
      if (data.result) {
        const isHit = data.result.source === 'LOCAL_CACHE';
        setStatusBanner(
          isHit
            ? `✨ Jawaban Resmi Guru Tersedia! (Instan 0 detik · Hemat ${data.result.ispQuotaKBaved} KB Kuota · +45 XP Sahabat AI)`
            : '🌟 Jawaban baru berhasil dijawab oleh Sahabat Pintar dan disimpan di kelas untuk semua teman.'
        );
      }
      return data.result || null;
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-canvas text-slate-900 selection:bg-sky-100 selection:text-sky-950">
      <OfflineBanner />

      <AppHeader
        onSync={() => handleSyncChunks(activeModuleId, 4, studentProfile.peerId)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* Responsive Mobile Navigation Bar (Touch-first: min-h-[48px], active:scale-95) */}
        <nav
          aria-label="Navigasi Layar Kecil"
          className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] px-3.5 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{item.iconEmoji}</span>
              <span>{item.mobileLabel}</span>
            </button>
          ))}
        </nav>

        <StatusBanner />

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
                onSyncChunks={(modId, count) => handleSyncChunks(modId, count, studentProfile.peerId)}
                onResetPeerChunks={(modId) => handleResetPeerChunks(modId, studentProfile.peerId)}
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
                isPinVerified={isPinVerified}
                onVerifyPin={handleVerifyHostPin}
                onChangePin={handleChangeHostPin}
                onLockHost={handleLockHost}
                onToggleGatewayTethering={handleToggleGatewayTethering}
                onPublishModule={handlePublishModule}
                onSeedCacheEntry={handleSeedCacheEntry}
                onExportPackage={handleExportPackage}
                onImportPackage={handleImportPackage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AppFooter />
    </div>
  );
}

export default function App() {
  return (
    <MeshNetworkProvider>
      <MainLayout />
    </MeshNetworkProvider>
  );
}
