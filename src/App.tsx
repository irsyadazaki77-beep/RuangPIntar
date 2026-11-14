import React, { useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Lock } from 'lucide-react';
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
            ? `Dijawab dari Arsip Kelas · Instan 0 detik & bebas kuota (${data.result.ispQuotaKBaved} KB dihemat).`
            : isLocalSynthesis
              ? 'Dijawab dari ringkasan modul lokal & dicatat ke Antrean Guru untuk dilengkapi nanti.'
              : 'Jawaban baru diterima dan disimpan ke arsip kelas agar semua teman dapat memakainya tanpa kuota.'
        );
      }
      return data.result || null;
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-canvas text-[#17232F] selection:bg-[#163A5F] selection:text-[#FFFDF8]">
      <OfflineBanner />

      <AppHeader
        onSync={() => handleSyncChunks(activeModuleId, 4, studentProfile.peerId)}
        onReconnect={forceReconnect}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-24 md:pb-8 space-y-5">
        <StatusBanner />

        {classroomBroadcast && (classroomBroadcast.message || classroomBroadcast.examMode || classroomBroadcast.focusModuleId) && (
          <div
            role="status"
            className="bg-[#FFFDF8] border border-[#DED4BE] border-l-4 border-l-[#C85A32] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FAF0EC] border border-[#E9C9BC] flex items-center justify-center text-[#9E3E22] shrink-0 mt-0.5">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-[#17232F] flex flex-wrap items-center gap-2">
                  <span>Arahan Guru ({classroomBroadcast.updatedAt})</span>
                  {classroomBroadcast.examMode && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBF4E7] border border-[#EAD6B0] text-[#8C540B] text-[10px] font-bold">
                      <Lock className="w-3 h-3" />
                      <span>Mode Ujian Aktif</span>
                    </span>
                  )}
                </div>
                {classroomBroadcast.message && (
                  <p className="text-[#4A5562]">{classroomBroadcast.message}</p>
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
                className="px-3 py-1.5 rounded-xl bg-[#163A5F] hover:bg-[#1E4D7B] text-[#FFFDF8] font-semibold text-xs cursor-pointer shrink-0 transition-colors"
              >
                Buka Modul Arahan →
              </button>
            )}
          </div>
        )}

        <Suspense
          fallback={
            <div className="bento-card p-8 text-center text-xs text-[#4A5562] font-medium">
              Menyiapkan halaman belajar...
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

      {/* Mobile Bottom Tab Bar (Native-like PWA Navigation) */}
      <nav
        aria-label="Navigasi Bawah Seluler"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFDF8]/95 backdrop-blur-md border-t border-[#DED4BE] px-2 py-1.5 shadow-[0_-4px_20px_-8px_rgba(23,35,47,0.16)]"
      >
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {NAV_ITEMS.map(({ id, mobileLabel, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`min-h-[50px] px-1.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-[#163A5F] text-[#FFFDF8]'
                    : 'text-[#5A6572] hover:text-[#17232F]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#F2B857]' : ''}`} />
                <span className="truncate leading-tight">{mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

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
