import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Server,
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
  LayoutDashboard,
  BookOpen,
  Database,
  BarChart3,
  HardDrive,
} from 'lucide-react';
import type {
  LearningModule,
  CacheEntry,
  SwarmMetrics,
  StudentSubmission,
  PendingAiQuestion,
  ClassroomBroadcast,
  PeerNode,
} from '../utils/edgeEngine';
import type {
  PublishModulePayload,
  UpdateModulePayload,
  AiQueueProcessItemResult,
} from '../hooks/useTeacherHost';
import { TeacherOverviewTab } from './teacher/TeacherOverviewTab';
import { TeacherModulesTab } from './teacher/TeacherModulesTab';
import { TeacherCacheQueueTab } from './teacher/TeacherCacheQueueTab';
import { TeacherGradebookTab } from './teacher/TeacherGradebookTab';
import { TeacherNetworkSneakernetTab } from './teacher/TeacherNetworkSneakernetTab';

interface Props {
  modules: LearningModule[];
  peers?: PeerNode[];
  cacheEntries: CacheEntry[];
  metrics: SwarmMetrics;
  submissions?: StudentSubmission[];
  pendingAiQuestions?: PendingAiQuestion[];
  classroomBroadcast?: ClassroomBroadcast | null;
  gatewayTetheringOnline: boolean;
  isPinVerified: boolean;
  onVerifyPin: (pin: string) => Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number }>;
  onChangePin: (
    currentPin: string,
    newPin: string
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onLockHost: () => void;
  onToggleGatewayTethering: () => Promise<void>;
  onPublishModule: (payload: PublishModulePayload) => Promise<{ ok: boolean; error?: string }>;
  onUpdateModule?: (
    id: string,
    payload: UpdateModulePayload
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteModule?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onSeedCacheEntry: (payload: {
    moduleId: string;
    questionCanonical: string;
    answerMarkdown: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateCacheEntry?: (
    id: string,
    payload: {
      moduleId?: string;
      questionCanonical?: string;
      answerMarkdown?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCacheEntry?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteSubmission?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onDeletePeer?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  onTriggerBackup?: () => Promise<{ ok: boolean; message?: string; error?: string }>;
  onExportPackage?: () => void;
  onImportPackage?: (pkg: unknown) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onDistributeToAll?: (moduleId: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  onBroadcastClassroom?: (payload: {
    message: string;
    focusModuleId?: string;
    examMode: boolean;
    clear?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onProcessAiQueue?: () => Promise<{
    ok: boolean;
    message?: string;
    error?: string;
    results?: AiQueueProcessItemResult[];
  }>;
  onDismissPendingQuestion?: (id: string) => Promise<void>;
}

type TeacherWorkspaceTab = 'ringkasan' | 'modul' | 'arsip' | 'nilai' | 'jaringan';

export const TeacherHostView: React.FC<Props> = ({
  modules,
  peers = [],
  cacheEntries,
  metrics,
  submissions = [],
  pendingAiQuestions = [],
  classroomBroadcast = null,
  gatewayTetheringOnline,
  isPinVerified,
  onVerifyPin,
  onChangePin,
  onLockHost,
  onToggleGatewayTethering,
  onPublishModule,
  onUpdateModule,
  onDeleteModule,
  onSeedCacheEntry,
  onUpdateCacheEntry,
  onDeleteCacheEntry,
  onDeleteSubmission,
  onDeletePeer,
  onTriggerBackup,
  onExportPackage,
  onImportPackage,
  onDistributeToAll,
  onBroadcastClassroom,
  onProcessAiQueue,
  onDismissPendingQuestion,
}) => {
  const [activeTeacherTab, setActiveTeacherTab] = useState<TeacherWorkspaceTab>('ringkasan');

  // PIN Gate state
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    setPinError(null);
    setIsVerifyingPin(true);
    const res = await onVerifyPin(pinInput);
    setIsVerifyingPin(false);
    if (!res.ok) {
      setPinError(res.error || 'PIN Simpul Guru tidak sesuai.');
      if (res.retryAfterSeconds && res.retryAfterSeconds > 0) {
        setCooldownSeconds(res.retryAfterSeconds);
      }
      return;
    }
    setPinInput('');
  };

  if (!isPinVerified) {
    return (
      <div className="max-w-lg mx-auto py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bento-card overflow-hidden"
        >
          <div className="h-1.5 w-full bg-[#1D4ED8]" />
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h1 className="font-display text-lg sm:text-xl font-bold text-[#0F172A]">
                  Akses Panel Simpul Guru
                </h1>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Masukkan PIN Guru untuk mengelola modul kurikulum, arsip AI lokal, buku nilai siswa, dan paket USB Sneakernet.
                </p>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="teacher-pin-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  PIN Simpul Guru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="teacher-pin-input"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    disabled={cooldownSeconds > 0 || isVerifyingPin}
                    placeholder="Masukkan 4–12 karakter PIN..."
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest bg-[#F8FAFC] border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-[#1D4ED8]"
                  />
                </div>
              </div>

              {pinError && (
                <div
                  role="alert"
                  className="text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl"
                >
                  {pinError}
                  {cooldownSeconds > 0 && (
                    <span className="font-mono font-bold ml-1.5 tabular-nums">
                      ({cooldownSeconds} dtk)
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingPin || cooldownSeconds > 0 || pinInput.trim().length < 4}
                className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {cooldownSeconds > 0
                    ? `Terkunci Sementara (${cooldownSeconds} dtk)`
                    : isVerifyingPin
                      ? 'Memverifikasi...'
                      : 'Buka Panel Simpul Guru'}
                </span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
              <p>
                PIN bawaan instalasi lokal:{' '}
                <code className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                  20263T
                </code>
              </p>
              <p>
                Sesi guru menggunakan token Bearer terenkripsi dan otomatis terkunci saat keluar.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const tabs: {
    id: TeacherWorkspaceTab;
    label: string;
    count?: number;
    Icon: React.FC<{ className?: string }>;
  }[] = [
    { id: 'ringkasan', label: 'Ringkasan & Siaran', Icon: LayoutDashboard },
    { id: 'modul', label: 'Modul & Kuis', count: modules.length, Icon: BookOpen },
    {
      id: 'arsip',
      label: 'Arsip & Antrean AI',
      count: pendingAiQuestions.length > 0 ? pendingAiQuestions.length : undefined,
      Icon: Database,
    },
    { id: 'nilai', label: 'Buku Nilai & Analitik', count: submissions.length, Icon: BarChart3 },
    { id: 'jaringan', label: 'USB & Perangkat', count: peers.length, Icon: HardDrive },
  ];

  return (
    <div className="space-y-6">
      {/* Unified Teacher Host Header + 5-Tab Workspace Navigation */}
      <section className="bento-card overflow-hidden">
        <div className="h-1.5 w-full bg-[#1D4ED8]" />
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                <Server className="w-5 h-5 text-[#FBBF24]" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-500">
                  <span className="font-bold text-[#1D4ED8]">SERVER LOKAL GURU</span>
                  <span aria-hidden="true">·</span>
                  <span>SQLite WAL + WebSocket Delta</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-semibold">Sesi Terverifikasi</span>
                </div>
                <h1 className="font-display text-lg sm:text-xl font-bold text-[#0F172A]">
                  Ruang Kendali Simpul Guru
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleGatewayTethering}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  gatewayTetheringOnline
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                    : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                }`}
              >
                {gatewayTetheringOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tethering AI Aktif</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>Luring 100% Lokal</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onLockHost}
                className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Kunci Panel</span>
              </button>
            </div>
          </div>

          {/* 5-Tab Workspace Navigation Bar */}
          <div
            role="tablist"
            aria-label="Navigasi Ruang Kendali Simpul Guru"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-200 pt-4"
          >
            {tabs.map(({ id, label, count, Icon }) => {
              const isActive = activeTeacherTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTeacherTab(id)}
                  className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                  {typeof count === 'number' && (
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isActive ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active Tab Content */}
      {activeTeacherTab === 'ringkasan' && (
        <TeacherOverviewTab
          modules={modules}
          metrics={metrics}
          cacheCount={cacheEntries.length}
          pendingQueueCount={pendingAiQuestions.length}
          classroomBroadcast={classroomBroadcast}
          gatewayTetheringOnline={gatewayTetheringOnline}
          onToggleGatewayTethering={onToggleGatewayTethering}
          onDistributeToAll={onDistributeToAll}
          onBroadcastClassroom={onBroadcastClassroom}
          onTriggerBackup={onTriggerBackup}
          onChangePin={onChangePin}
        />
      )}

      {activeTeacherTab === 'modul' && (
        <TeacherModulesTab
          modules={modules}
          onPublishModule={onPublishModule}
          onUpdateModule={onUpdateModule}
          onDeleteModule={onDeleteModule}
        />
      )}

      {activeTeacherTab === 'arsip' && (
        <TeacherCacheQueueTab
          modules={modules}
          cacheEntries={cacheEntries}
          pendingAiQuestions={pendingAiQuestions}
          gatewayTetheringOnline={gatewayTetheringOnline}
          onSeedCacheEntry={onSeedCacheEntry}
          onUpdateCacheEntry={onUpdateCacheEntry}
          onDeleteCacheEntry={onDeleteCacheEntry}
          onProcessAiQueue={onProcessAiQueue}
          onDismissPendingQuestion={onDismissPendingQuestion}
        />
      )}

      {activeTeacherTab === 'nilai' && (
        <TeacherGradebookTab
          modules={modules}
          submissions={submissions}
          onDeleteSubmission={onDeleteSubmission}
        />
      )}

      {activeTeacherTab === 'jaringan' && (
        <TeacherNetworkSneakernetTab
          peers={peers}
          onExportPackage={onExportPackage}
          onImportPackage={onImportPackage}
          onDeletePeer={onDeletePeer}
        />
      )}
    </div>
  );
};
