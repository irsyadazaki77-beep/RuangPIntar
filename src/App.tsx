import React, { useEffect, Suspense, lazy } from 'react';
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
import { StudentOnboardingModal } from './components/layout/StudentOnboardingModal';
import { ModuleLibraryView } from './components/ModuleLibraryView';
import { stopSpeech } from './utils/speechUtils';
import { apiFetch, safeParseJson } from './utils/apiClient';
import {
  encodeBinaryChunkPayload,
  type TutorAskResponse,
} from './utils/edgeEngine';

const MeshTopologyView = lazy(() =>
  import('./components/MeshTopologyView').then((m) => ({ default: m.MeshTopologyView }))
);
const AiTutorGatewayView = lazy(() =>
  import('./components/AiTutorGatewayView').then((m) => ({ default: m.AiTutorGatewayView }))
);
const TeacherHostView = lazy(() =>
  import('./components/TeacherHostView').then((m) => ({ default: m.TeacherHostView }))
);
const QrScannerModal = lazy(() =>
  import('./components/QrScannerModal').then((m) => ({ default: m.QrScannerModal }))
);

function base64ToUint8Array(b64: string): Uint8Array {
  const binaryString = window.atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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
    submissions,
    pendingAiQuestions,
    classroomBroadcast,
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
    isOfflineActive,
    isQrScannerOpen,
    closeQrScanner,
  } = useMeshNetwork();

  // Lifecycle socket and WebRTC hook
  const { transmitBinaryViaWebRtcDataChannel, reconnectToHost, forceReconnect } = useMeshSocket();

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
    handleDistributeToAll,
    handleBroadcastClassroom,
    handleProcessAiQueue,
    handleDismissPendingQuestion,
  } = useTeacherHost();

  // Offline sync hook
  const { queueSubmission } = useOfflineSync();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    stopSpeech();
  }, [activeTab]);

  const handleSyncStudentSubmission = async (payload: {
    moduleId: string;
    moduleTitle: string;
    quizScore: number;
    totalQuestions: number;
    passed: boolean;
    simulationCompleted: boolean;
  }) => {
    const activePeerId = studentProfile.peerId || STUDENT_PEER_ID;
    const computedScore = Math.min(100, Math.max(0, Math.round(payload.quizScore)));
    const submissionPayload = {
      id: `sub-${activePeerId}-${payload.moduleId}`,
      studentId: activePeerId,
      peerId: activePeerId,
      studentName: studentProfile.studentName,
      avatar: studentProfile.avatar,
      score: computedScore,
      completedChapters: payload.simulationCompleted ? [0, 1] : [0],
      ...payload,
      timestamp: `${new Date().toLocaleTimeString('id-ID', { hour12: false })} WITA`,
      updatedMs: Date.now(),
    };

    if (isOfflineActive) {
      await queueSubmission(submissionPayload);
      setStatusBanner(
        '📥 Mode Luring: Capaian kuis & eksperimen disimpan di perangkat dan akan disinkronkan otomatis ke Guru.'
      );
      return;
    }

    try {
      const response = await apiFetch('/api/students/sync-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
      if (response.ok) {
        const data = await safeParseJson(response);
        if (data.state) applyServerState(data.state);
      } else {
        await queueSubmission(submissionPayload);
      }
    } catch {
      await queueSubmission(submissionPayload);
    }
  };

  const handleSyncChunks = async (
    moduleId: string,
    chunksCount = 4,
    targetPeerId = studentProfile.peerId || STUDENT_PEER_ID
  ) => {
    setIsSyncing(true);
    try {
      const response = await apiFetch('/api/p2p/transfer-step', {
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
    targetPeerId = studentProfile.peerId || STUDENT_PEER_ID
  ) => {
    setIsSyncing(true);
    try {
      const response = await apiFetch('/api/p2p/reset-peer', {
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
      const response = await apiFetch('/api/tutor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await safeParseJson(response);
      if (!response.ok) {
        if (data.error) setStatusBanner(data.error);
        return null;
      }
      if (data.state) applyServerState(data.state);
      if (data.result) {
        const isHit = data.result.source === 'LOCAL_CACHE';
        const isLocalSynthesis = data.result.source === 'LOCAL_EDGE_SYNTHESIS';
        setStatusBanner(
          isHit
            ? `✨ Jawaban Resmi Guru Tersedia! (Instan 0 detik · Hemat ${data.result.ispQuotaKBaved} KB Kuota · +45 XP Sahabat AI)`
            : isLocalSynthesis
              ? '📥 Dijawab dari ringkasan modul lokal & dimasukkan ke Antrean Gemini Guru.'
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
        onReconnect={forceReconnect}
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

        {classroomBroadcast && (classroomBroadcast.message || classroomBroadcast.examMode || classroomBroadcast.focusModuleId) && (
          <div
            role="status"
            className="bg-gradient-to-r from-indigo-50 via-sky-50 to-amber-50 border border-indigo-200 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none mt-0.5">📢</span>
              <div className="space-y-0.5">
                <div className="font-bold text-indigo-950 flex flex-wrap items-center gap-2">
                  <span>Pengumuman Guru ({classroomBroadcast.updatedAt})</span>
                  {classroomBroadcast.examMode && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold">
                      🔒 Mode Ujian Aktif
                    </span>
                  )}
                </div>
                {classroomBroadcast.message && (
                  <p className="text-slate-800">{classroomBroadcast.message}</p>
                )}
              </div>
            </div>

            {classroomBroadcast.focusModuleId && (
              <button
                type="button"
                onClick={() => {
                  setActiveModuleId(classroomBroadcast.focusModuleId!);
                  setActiveTab('pustaka');
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shrink-0 transition-colors"
              >
                Buka Modul Arahan Guru →
              </button>
            )}
          </div>
        )}

        <Suspense
          fallback={
            <div className="bento-card p-8 text-center text-xs text-slate-600 font-medium">
              Memuat tampilan kelas...
            </div>
          }
        >
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
                onSyncStudentSubmission={handleSyncStudentSubmission}
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
                examMode={Boolean(classroomBroadcast?.examMode)}
                pendingQueueCount={pendingAiQuestions.length}
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
                submissions={submissions}
                pendingAiQuestions={pendingAiQuestions}
                classroomBroadcast={classroomBroadcast}
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
                onDistributeToAll={handleDistributeToAll}
                onBroadcastClassroom={handleBroadcastClassroom}
                onProcessAiQueue={handleProcessAiQueue}
                onDismissPendingQuestion={handleDismissPendingQuestion}
              />
            )}
          </motion.div>
        </AnimatePresence>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {isQrScannerOpen && (
          <QrScannerModal
            isOpen={isQrScannerOpen}
            onClose={closeQrScanner}
            onConnect={reconnectToHost}
          />
        )}
      </Suspense>

      <StudentOnboardingModal />

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
