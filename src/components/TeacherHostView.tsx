import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Server,
  PlusCircle,
  Database,
  Wifi,
  WifiOff,
  CheckCircle2,
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut,
  HardDrive,
  Download,
  UploadCloud,
  FileJson,
  Clock,
  GraduationCap,
  Award,
  BarChart3,
  Megaphone,
  Send,
  Trash2,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import {
  calculateGradebookSummary,
  type LearningModule,
  type CacheEntry,
  type SwarmMetrics,
  type StudentSubmission,
  type PendingAiQuestion,
  type ClassroomBroadcast,
} from '../utils/edgeEngine';
import { getSubjectTheme } from '../utils/subjectTheme';
import { HostQrConnector } from './HostQrConnector';

interface Props {
  modules: LearningModule[];
  cacheEntries: CacheEntry[];
  metrics: SwarmMetrics;
  submissions?: StudentSubmission[];
  pendingAiQuestions?: PendingAiQuestion[];
  classroomBroadcast?: ClassroomBroadcast | null;
  gatewayTetheringOnline: boolean;
  isPinVerified: boolean;
  onVerifyPin: (pin: string) => Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number }>;
  onChangePin: (currentPin: string, newPin: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onLockHost: () => void;
  onToggleGatewayTethering: () => Promise<void>;
  onPublishModule: (payload: {
    title: string;
    subject: string;
    gradeLevel: string;
    summary: string;
    sectionHeading: string;
    sectionBody: string;
    formula: string;
    keyTakeaway: string;
    sizeMB: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  onSeedCacheEntry: (payload: {
    moduleId: string;
    questionCanonical: string;
    answerMarkdown: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onExportPackage?: () => void;
  onImportPackage?: (pkg: unknown) => Promise<{ ok: boolean; error?: string; message?: string }>;
  onDistributeToAll?: (moduleId: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  onBroadcastClassroom?: (payload: {
    message: string;
    focusModuleId?: string;
    examMode: boolean;
    clear?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onProcessAiQueue?: () => Promise<{ ok: boolean; message?: string; error?: string }>;
  onDismissPendingQuestion?: (id: string) => Promise<void>;
}

const hostContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const hostItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export const TeacherHostView: React.FC<Props> = ({
  modules,
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
  onSeedCacheEntry,
  onExportPackage,
  onImportPackage,
  onDistributeToAll,
  onBroadcastClassroom,
  onProcessAiQueue,
  onDismissPendingQuestion,
}) => {
  // PIN Gate state & Rate Limiting Cooldown (Task 1)
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Sneakernet (USB / Physical Distribution) State (Task 4)
  const [importStatus, setImportStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Classroom Quick Actions, Broadcast & AI Queue
  const [distributeModuleId, setDistributeModuleId] = useState<string>(modules[0]?.id || '');
  const [isDistributingAll, setIsDistributingAll] = useState<boolean>(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string>(classroomBroadcast?.message || '');
  const [broadcastFocusModId, setBroadcastFocusModId] = useState<string>(
    classroomBroadcast?.focusModuleId || ''
  );
  const [broadcastExamMode, setBroadcastExamMode] = useState<boolean>(
    Boolean(classroomBroadcast?.examMode)
  );
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  // Change PIN modal/drawer state
  const [showChangePinPanel, setShowChangePinPanel] = useState(false);
  const [currentPinForChange, setCurrentPinForChange] = useState('');
  const [newPinForChange, setNewPinForChange] = useState('');
  const [changePinStatus, setChangePinStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const [isChangingPin, setIsChangingPin] = useState(false);

  // Module creation form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<
    'Fisika Terapan' | 'Biologi Pesisir' | 'Matematika Maritim' | 'Teknik Energi'
  >('Teknik Energi');
  const [gradeLevel, setGradeLevel] = useState('Kelas XI SMA / SMK');
  const [sizeMB, setSizeMB] = useState<number>(26);
  const [summary, setSummary] = useState('');
  const [sectionHeading] = useState('01. Prinsip Kerja & Perhitungan Kapasitas');
  const [sectionBody, setSectionBody] = useState('');
  const [formula] = useState('E_harian = P_panel × H_matahari × η_inverter');
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [moduleSuccess, setModuleSuccess] = useState<string | null>(null);
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);

  // Cache pre-warm form state
  const [seedModuleId, setSeedModuleId] = useState(modules[0]?.id || 'mod-fisika-mikrohidro');
  const [seedQuestion, setSeedQuestion] = useState('');
  const [seedAnswer, setSeedAnswer] = useState('');
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);
  const [isSeedingCache, setIsSeedingCache] = useState(false);

  const selectedSubjectTheme = getSubjectTheme(subject);

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

  const processImportFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setImportStatus({ ok: false, text: 'File harus berformat paket data JSON (.json).' });
      return;
    }
    setImportStatus(null);
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        if (onImportPackage) {
          const res = await onImportPackage(parsed);
          if (!res.ok) {
            setImportStatus({ ok: false, text: res.error || 'Gagal mengimpor paket.' });
          } else {
            setImportStatus({
              ok: true,
              text: res.message || 'Paket data Sneakernet berhasil diimpor ke server lokal kelas!',
            });
          }
        }
      } catch {
        setImportStatus({
          ok: false,
          text: 'Format isi file JSON paket data Sneakernet rusak atau tidak valid.',
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      setImportStatus({ ok: false, text: 'Gagal membaca file dari penyimpanan USB.' });
    };
    reader.readAsText(file);
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinStatus(null);
    setIsChangingPin(true);
    const res = await onChangePin(currentPinForChange, newPinForChange);
    setIsChangingPin(false);
    if (!res.ok) {
      setChangePinStatus({ ok: false, text: res.error || 'Gagal mengganti PIN.' });
      return;
    }
    setChangePinStatus({
      ok: true,
      text: res.message || 'PIN Simpul Guru berhasil diperbarui!',
    });
    setCurrentPinForChange('');
    setNewPinForChange('');
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setModuleError(null);
    setModuleSuccess(null);
    setIsSubmittingModule(true);

    const res = await onPublishModule({
      title,
      subject,
      gradeLevel,
      summary,
      sectionHeading,
      sectionBody,
      formula,
      keyTakeaway:
        keyTakeaway.trim() ||
        'Distribusi modul lokal mempercepat pembelajaran tanpa ketergantungan sinyal seluler.',
      sizeMB: Number(sizeMB),
    });

    setIsSubmittingModule(false);
    if (!res.ok) {
      setModuleError(res.error || 'Gagal mempublikasikan modul.');
      return;
    }

    setModuleSuccess(
      `Modul "${title.trim()}" berhasil dipecah menjadi 16 paket WebRTC, disimpan ke SQLite, dan disemai ke jaringan kelas!`
    );
    setTitle('');
    setSummary('');
    setSectionBody('');
    setKeyTakeaway('');
  };

  const handleSeedCache = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeedError(null);
    setSeedSuccess(null);
    setIsSeedingCache(true);

    const res = await onSeedCacheEntry({
      moduleId: seedModuleId,
      questionCanonical: seedQuestion,
      answerMarkdown: seedAnswer,
    });

    setIsSeedingCache(false);
    if (!res.ok) {
      setSeedError(res.error || 'Gagal menyimpan ke cache lokal.');
      return;
    }

    setSeedSuccess('Jawaban berhasil ditambahkan ke Cache Lokal Simpul Guru (Siap diakses 0 ms).');
    setSeedQuestion('');
    setSeedAnswer('');
  };

  if (!isPinVerified) {
    return (
      <motion.div
        key="host-pin-gate"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto my-8"
      >
        <div
          role="dialog"
          aria-labelledby="host-pin-modal-title"
          aria-describedby="host-pin-modal-desc"
          className="bento-card overflow-hidden border border-slate-200/90 shadow-md"
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600" />
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-sky-700">
                  Otorisasi Peran Simpul Guru (Host Node)
                </div>
                <h1 id="host-pin-modal-title" className="text-lg font-bold text-slate-900">
                  Masukkan PIN Kendali Simpul Guru
                </h1>
              </div>
            </div>

            <p id="host-pin-modal-desc" className="text-xs text-slate-600 leading-relaxed">
              Halaman ini mengendalikan gateway tethering seluler kelas, publikasi modul ke swarm
              WebRTC, dan database SQLite lokal di <strong>SMAN 1 Kalabahi</strong>. Proteksi PIN
              mencegah siswa mematikan tethering guru secara sepihak.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="teacher-pin-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  PIN Keamanan Simpul Guru (Default: <code className="font-mono text-sky-800">1945</code>)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="teacher-pin-input"
                    type="password"
                    inputMode="numeric"
                    disabled={cooldownSeconds > 0 || isVerifyingPin}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder={cooldownSeconds > 0 ? `Terkunci (${cooldownSeconds}s)` : 'Masukkan PIN (contoh: 1945)'}
                    className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest bg-[#faf8f5] border border-[#d6d1c4] rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 disabled:opacity-50 transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={cooldownSeconds > 0 || isVerifyingPin}
                    onClick={() => setPinInput('1945')}
                    className="px-3 py-2.5 text-xs font-mono font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 border border-sky-200 rounded-xl whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Isi 1945
                  </button>
                </div>
              </div>

              {cooldownSeconds > 0 && (
                <div role="alert" className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-medium">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-pulse" />
                  <span>
                    Terlalu banyak percobaan PIN. Mohon tunggu <strong>{cooldownSeconds} detik</strong> sebelum mencoba kembali.
                  </span>
                </div>
              )}

              {pinError && cooldownSeconds <= 0 && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {pinError}
                </p>
              )}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isVerifyingPin || cooldownSeconds > 0}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {cooldownSeconds > 0
                    ? `Tunggu Cooldown (${cooldownSeconds}s)...`
                    : isVerifyingPin
                    ? 'Memverifikasi PIN...'
                    : 'Buka Panel Kendali Simpul Guru'}
                </span>
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="host-unlocked-dashboard"
      variants={hostContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Unified Host Node Control Header + Telemetry Ribbon */}
      <motion.section
        variants={hostItemVariants}
        aria-label="Status Simpul Pusat Laptop Guru"
        className="bento-card overflow-hidden"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-emerald-500 to-amber-500" />
        <div className="p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
              <span className="text-sky-700 font-bold">Host Node: 192.168.43.1</span>
              <span aria-hidden="true">·</span>
              <span>Database: SQLite Persisten (WAL)</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sesi Guru Aktif (Bearer Token 8 Jam)</span>
              </span>
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold text-slate-900"
              style={{ textWrap: 'balance' }}
            >
              Panel Kendali Simpul Guru (Host Node) &amp; Manajemen Cache Lokal
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Kelola distribusi materi P2P ke seluruh perangkat kelas, atur koneksi tethering seluler
              satu pintu untuk AI, dan tambahkan cadangan materi atau jawaban ke cache lokal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onToggleGatewayTethering}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs ${
                gatewayTetheringOnline
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500'
              }`}
            >
              {gatewayTetheringOnline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>Tethering Cloud AI: AKTIF (Satu Pintu)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>Tethering Cloud AI: LURING (100% Lokal)</span>
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => {
                setShowChangePinPanel((prev) => !prev);
                setChangePinStatus(null);
              }}
              className="px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-sky-700" />
              <span>Ganti PIN</span>
            </button>

            <button
              type="button"
              onClick={onLockHost}
              className="px-3 py-2.5 text-xs font-semibold text-stone-700 bg-[#f4f1ea] hover:bg-[#e9e4d8] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Kunci Simpul</span>
            </button>
          </div>
        </div>

        {showChangePinPanel && (
          <div className="px-6 py-4 bg-sky-50/70 border-t border-sky-200/80">
            <form
              onSubmit={handleUpdatePin}
              className="flex flex-col sm:flex-row sm:items-end gap-3"
              noValidate
            >
              <div className="flex-1">
                <label
                  htmlFor="current-pin-input"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  PIN Saat Ini
                </label>
                <input
                  id="current-pin-input"
                  type="password"
                  value={currentPinForChange}
                  onChange={(e) => setCurrentPinForChange(e.target.value)}
                  placeholder="PIN lama (mis. 1945)"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="new-pin-input"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  PIN Baru (4–12 Karakter)
                </label>
                <input
                  id="new-pin-input"
                  type="password"
                  value={newPinForChange}
                  onChange={(e) => setNewPinForChange(e.target.value)}
                  placeholder="Masukkan PIN baru"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={isChangingPin}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {isChangingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
              </button>
            </form>
            {changePinStatus && (
              <p
                role={changePinStatus.ok ? 'status' : 'alert'}
                className={`mt-2 text-xs font-medium ${
                  changePinStatus.ok ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {changePinStatus.text}
              </p>
            )}
          </div>
        )}

        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-600 tabular-nums">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-sky-700" />
            <span>
              Modul Aktif di Swarm: <strong>{modules.length} Modul</strong> (16 pecahan/modul) · Tema
              Aktif: <strong className={selectedSubjectTheme.accentText}>{subject}</strong>
            </span>
          </div>
          <div>
            Rekaman Cache AI Lokal: <strong>{cacheEntries.length} Topik</strong> · Rasio Hit:{' '}
            <strong className="text-emerald-700">{metrics.cacheHitRatioPct}%</strong>
          </div>
          <div>
            Total Kuota Kelas Dihemat:{' '}
            <strong className="text-emerald-700">{metrics.ispQuotaSavedMB.toFixed(1)} MB</strong>
          </div>
        </div>
      </motion.section>

      {/* Zero-Config Connectivity: Dynamic LAN IP QR Code & Camera Scanner */}
      <HostQrConnector className="mb-6" />

      {/* 00. Ringkasan Kelas Sekilas, Kontrol Siaran, Mode Ujian & Distribusi Massal */}
      <motion.section
        variants={hostItemVariants}
        aria-label="Kontrol Cepat Kelas dan Pengumuman"
        className="bento-card p-6 sm:p-7 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e6e2d8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                00. Kontrol Cepat Kelas, Pengumuman &amp; Mode Ujian
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Kirim pengumuman ke seluruh HP siswa, kunci Sahabat AI saat kuis berlangsung, atau bagikan modul sekaligus.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-semibold">
              {metrics.studentPeersCount} Siswa Terdaftar
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold">
              {submissions.length} Nilai Terkumpul
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
              {pendingAiQuestions.length} Antrean AI
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Classroom Broadcast + Exam Mode */}
          <div className="lg:col-span-7 surface-warm-recessed p-5 rounded-2xl space-y-3.5">
            <div className="text-xs font-bold text-stone-900">
              Siaran Pengumuman &amp; Mode Ujian Real-Time
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Pesan Pengumuman untuk Siswa
                </label>
                <input
                  type="text"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  maxLength={240}
                  placeholder="Contoh: Kerjakan Kuis Bab Mikrohidro sebelum jam 10.00 WITA!"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Arahkan Siswa ke Modul (Opsional)
                </label>
                <select
                  value={broadcastFocusModId}
                  onChange={(e) => setBroadcastFocusModId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-stone-900"
                >
                  <option value="">-- Tidak diarahkan --</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={broadcastExamMode}
                    onChange={(e) => setBroadcastExamMode(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>🔒 Mode Ujian (Kunci AI Tutor)</span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSendingBroadcast || !onBroadcastClassroom}
                onClick={async () => {
                  if (!onBroadcastClassroom) return;
                  setIsSendingBroadcast(true);
                  await onBroadcastClassroom({
                    message: broadcastMessage.trim(),
                    focusModuleId: broadcastFocusModId || undefined,
                    examMode: broadcastExamMode,
                  });
                  setIsSendingBroadcast(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingBroadcast ? 'Mengirim...' : 'Kirim ke Semua Siswa'}</span>
              </button>

              {classroomBroadcast && (
                <button
                  type="button"
                  disabled={isSendingBroadcast || !onBroadcastClassroom}
                  onClick={async () => {
                    if (!onBroadcastClassroom) return;
                    setIsSendingBroadcast(true);
                    setBroadcastMessage('');
                    setBroadcastFocusModId('');
                    setBroadcastExamMode(false);
                    await onBroadcastClassroom({
                      message: '',
                      examMode: false,
                      clear: true,
                    });
                    setIsSendingBroadcast(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hapus Pengumuman
                </button>
              )}
            </div>
          </div>

          {/* Right: One-Click Distribute to All + AI Offline Queue */}
          <div className="lg:col-span-5 surface-warm-recessed p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-stone-900">
                Bagikan Modul ke Seluruh Siswa (1 Klik)
              </div>
              <select
                value={distributeModuleId || modules[0]?.id || ''}
                onChange={(e) => setDistributeModuleId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-stone-900"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isDistributingAll || !onDistributeToAll}
                onClick={async () => {
                  if (!onDistributeToAll) return;
                  setIsDistributingAll(true);
                  await onDistributeToAll(distributeModuleId || modules[0]?.id || '');
                  setIsDistributingAll(false);
                }}
                className="w-full px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-50 rounded-xl cursor-pointer shadow-2xs"
              >
                {isDistributingAll
                  ? 'Mendistribusikan ke Kelas...'
                  : '⚡ Bagikan Modul Ini ke Semua Siswa'}
              </button>
            </div>

            <div className="pt-3 border-t border-[#e6e2d8] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Antrean Pertanyaan AI Luring ({pendingAiQuestions.length})</span>
                </span>
                {onProcessAiQueue && pendingAiQuestions.length > 0 && (
                  <button
                    type="button"
                    disabled={isProcessingQueue || !gatewayTetheringOnline}
                    onClick={async () => {
                      setIsProcessingQueue(true);
                      await onProcessAiQueue();
                      setIsProcessingQueue(false);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    {isProcessingQueue ? 'Memproses...' : 'Proses via Gemini'}
                  </button>
                )}
              </div>

              {pendingAiQuestions.length === 0 ? (
                <p className="text-[11px] text-stone-500">
                  Belum ada pertanyaan luring yang menunggu sinyal internet.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {pendingAiQuestions.slice(0, 5).map((pq) => (
                    <li
                      key={pq.id}
                      className="p-2 bg-white border border-slate-200 rounded-lg text-[11px] flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 truncate">{pq.question}</div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {pq.askedByPeerName} · {pq.createdAt}
                        </div>
                      </div>
                      {onDismissPendingQuestion && (
                        <button
                          type="button"
                          onClick={() => onDismissPendingQuestion(pq.id)}
                          title="Hapus dari antrean"
                          className="text-slate-400 hover:text-red-600 p-1 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Two-Column Structured Forms: Publish P2P Module (7 cols) + Pre-warm Local Cache (5 cols) */}
      <motion.section
        variants={hostItemVariants}
        aria-label="Formulir Publikasi Modul dan Pre-Warm Cache"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        {/* Left: Publish New Module to P2P Swarm */}
        <div className="lg:col-span-7 bento-card p-6 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#e6e2d8]">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                01. Publikasikan Modul Baru ke Swarm P2P
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Modul otomatis dipecah menjadi 16 bagian (chunks), disimpan ke SQLite, dan disebarkan melalui WebRTC DataChannel.
              </p>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setTitle('Instalasi Mikro-Surya (PLTS) Atap Sekolah Kepulauan');
                setSubject('Teknik Energi');
                setSizeMB(28);
                setSummary(
                  'Panduan perhitungan kapasitas panel surya fotovoltaik, baterai LiFePO4, dan MPPT untuk menyuplai listrik laptop guru dan router WiFi kelas.'
                );
                setSectionBody(
                  'Sistem PLTS otonom (off-grid) mengubah radiasi surya menjadi listrik arus searah (DC) yang disimpan pada bank baterai LiFePO4 24V untuk menjaga simpul pembelajaran tetap menyala sepanjang hari.'
                );
                setKeyTakeaway(
                  'Panel surya 600 Wp sudah mencukupi kebutuhan energi harian laptop host guru dan router hotspot lokal di sekolah 3T.'
                );
                setModuleError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-[#f4f1ea] hover:bg-[#e9e4d8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Isi Contoh Modul PLTS
            </motion.button>
          </div>

          <form onSubmit={handleCreateModule} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="mod-title-input" className="block text-xs font-medium text-stone-700 mb-1">
                  Judul Modul Pembelajaran
                </label>
                <input
                  id="mod-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Instalasi PLTS Atap Sekolah"
                  className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                />
              </div>

              <div>
                <label htmlFor="mod-size-input" className="block text-xs font-medium text-stone-700 mb-1">
                  Ukuran Paket (MB)
                </label>
                <input
                  id="mod-size-input"
                  type="number"
                  min={1}
                  max={500}
                  value={sizeMB}
                  onChange={(e) => setSizeMB(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 tabular-nums focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="mod-subject-select" className="block text-xs font-medium text-stone-700 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  id="mod-subject-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value as typeof subject)}
                  className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                >
                  <option value="Teknik Energi">Teknik Energi</option>
                  <option value="Fisika Terapan">Fisika Terapan</option>
                  <option value="Biologi Pesisir">Biologi Pesisir</option>
                  <option value="Matematika Maritim">Matematika Maritim</option>
                </select>
              </div>

              <div>
                <label htmlFor="mod-grade-input" className="block text-xs font-medium text-stone-700 mb-1">
                  Tingkat Kelas
                </label>
                <input
                  id="mod-grade-input"
                  type="text"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="mod-summary-input" className="block text-xs font-medium text-stone-700 mb-1">
                Ringkasan Kompetensi Modul
              </label>
              <input
                id="mod-summary-input"
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ringkasan singkat tujuan pembelajaran..."
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
              />
            </div>

            <div>
              <label htmlFor="mod-body-textarea" className="block text-xs font-medium text-stone-700 mb-1">
                Isi Materi Utama &amp; Penjelasan Teknis
              </label>
              <textarea
                id="mod-body-textarea"
                rows={3}
                value={sectionBody}
                onChange={(e) => setSectionBody(e.target.value)}
                placeholder="Tuliskan penjelasan materi yang akan didistribusikan ke perangkat siswa..."
                className="w-full p-3 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
              />
            </div>

            {moduleError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {moduleError}
              </p>
            )}
            {moduleSuccess && (
              <p role="status" className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{moduleSuccess}</span>
              </p>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={isSubmittingModule}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publikasikan &amp; Semai 16 Pecahan Data ke Kelas</span>
            </motion.button>
          </form>
        </div>

        {/* Right: Pre-Warm Local AI Cache Form */}
        <div className="lg:col-span-5 bento-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#e6e2d8]">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  02. Pre-Warm Cache Lokal Tutor AI
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Tambahkan pasangan tanya-jawab sebelum kelas dimulai agar siswa mendapat jawaban 0 ms.
                </p>
              </div>
              <Database className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            </div>

            <form onSubmit={handleSeedCache} className="space-y-4" noValidate>
              <div>
                <label htmlFor="seed-module-select" className="block text-xs font-medium text-stone-700 mb-1">
                  Modul Terkait
                </label>
                <select
                  id="seed-module-select"
                  value={seedModuleId}
                  onChange={(e) => setSeedModuleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="seed-question-input" className="block text-xs font-medium text-stone-700 mb-1">
                  Pertanyaan Kanonik yang Sering Ditanyakan Siswa
                </label>
                <input
                  id="seed-question-input"
                  type="text"
                  value={seedQuestion}
                  onChange={(e) => setSeedQuestion(e.target.value)}
                  placeholder="Contoh: Apa perbedaan turbin Pelton dan turbin Crossflow?"
                  className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                />
              </div>

              <div>
                <label htmlFor="seed-answer-textarea" className="block text-xs font-medium text-stone-700 mb-1">
                  Jawaban Terverifikasi Guru (Disimpan di Cache Lokal SQLite)
                </label>
                <textarea
                  id="seed-answer-textarea"
                  rows={4}
                  value={seedAnswer}
                  onChange={(e) => setSeedAnswer(e.target.value)}
                  placeholder="Turbin Pelton cocok untuk tinggi jatuh air (head) tinggi dengan debit kecil, sedangkan turbin Crossflow cocok untuk head rendah dengan debit sungai besar..."
                  className="w-full p-3 text-xs bg-[#faf8f5] border border-[#d6d1c4] rounded-lg text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                />
              </div>

              {seedError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {seedError}
                </p>
              )}
              {seedSuccess && (
                <p role="status" className="text-xs font-medium text-emerald-700">
                  {seedSuccess}
                </p>
              )}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isSeedingCache}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Simpan ke Memori Cache Lokal Guru
              </motion.button>
            </form>
          </div>

          <div className="surface-warm-recessed p-4 text-xs text-stone-600 space-y-1">
            <div className="font-semibold text-stone-900">
              Mode Penyimpanan Offline-First SQLite Aktif
            </div>
            <p className="leading-relaxed">
              Setiap rekaman yang ditambahkan langsung disimpan secara permanen ke database SQLite lokal laptop guru dan diindeks dengan pencocokan trigram Bahasa Indonesia.
            </p>
          </div>
        </div>
      </motion.section>

      {/* TUGAS 4: Sneakernet / Physical USB Distribution Card */}
      <motion.section
        variants={hostItemVariants}
        aria-label="Distribusi Fisik Sneakernet USB"
        className="bento-card p-6 sm:p-7 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e6e2d8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                03. Distribusi Fisik (Sneakernet / USB Flashdisk)
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                Bawa paket data kurikulum (.json) menggunakan flashdisk dari kota untuk mengutuhkan server lokal kelas tanpa koneksi internet satelit.
              </p>
            </div>
          </div>

          {onExportPackage && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onExportPackage}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Paket Data Modul (.json)</span>
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left info column */}
          <div className="lg:col-span-5 space-y-3 surface-warm-recessed p-5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-amber-800 font-semibold">
                <FileJson className="w-4 h-4" />
                <span>Format Paket Data Kurikulum (.json)</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                File paket berisi seluruh data modul kurikulum, skema section, studi kasus, glosarium, dan rekaman cache tanya-jawab Tutor AI lokal.
              </p>
            </div>

            <div className="pt-3 border-t border-[#e6e2d8] space-y-1.5 text-[11px] font-mono text-stone-600">
              <div className="flex justify-between">
                <span>Total Modul Siap Ekspor:</span>
                <strong className="text-stone-900">{modules.length} Modul</strong>
              </div>
              <div className="flex justify-between">
                <span>Rekaman Cache AI Siap Ekspor:</span>
                <strong className="text-stone-900">{cacheEntries.length} Topik</strong>
              </div>
            </div>
          </div>

          {/* Right Drag-and-Drop / File Upload Box */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  processImportFile(e.dataTransfer.files[0]);
                }
              }}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-3 transition-colors ${
                isDragging
                  ? 'border-amber-500 bg-amber-50/70'
                  : 'border-slate-300 hover:border-amber-400 bg-slate-50/50'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-amber-700">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-900">
                  Tarik &amp; Lepas File Paket Sneakernet (.json) ke Sini
                </p>
                <p className="text-[11px] text-stone-500">
                  atau pilih file dari USB Flashdisk / Penyimpanan Lokal
                </p>
              </div>

              <label className="px-4 py-2 text-xs font-semibold text-stone-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors shadow-2xs">
                <span>{isImporting ? 'Mengimpor Data...' : 'Pilih File JSON Paket'}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImportFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

            {importStatus && (
              <div
                role={importStatus.ok ? 'status' : 'alert'}
                className={`mt-3 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  importStatus.ok
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-red-50 text-red-900 border border-red-300'
                }`}
              >
                {importStatus.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{importStatus.text}</span>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* 04. Buku Nilai & Capaian Eksperimen Siswa (Sinkronisasi Luring/Daring) */}
      {(() => {
        const gradebook = calculateGradebookSummary(submissions);
        return (
          <motion.section
            variants={hostItemVariants}
            aria-label="Buku Nilai dan Capaian Eksperimen Siswa"
            className="bento-card p-6 sm:p-7 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e6e2d8]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    04. Buku Nilai &amp; Capaian Eksperimen Siswa (Real-Time SQLite)
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Rekaman skor kuis dan penyelesaian misi laboratorium virtual yang disinkronkan otomatis dari perangkat siswa.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono tabular-nums">
                <span className="px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 font-semibold flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Rata-rata Kelas: {gradebook.averageScore}%</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>Lab Tuntas: {gradebook.simulationsCompletedCount} Misi</span>
                </span>
                {submissions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const headers = [
                        'Nama Siswa',
                        'ID Simpul',
                        'Modul',
                        'Skor Kuis (%)',
                        'Status Kuis',
                        'Status Lab',
                        'Waktu Sinkronisasi',
                      ];
                      const escapeCsv = (val: string | number) =>
                        `"${String(val).replace(/"/g, '""')}"`;
                      const rows = submissions.map((s) =>
                        [
                          escapeCsv(s.studentName),
                          escapeCsv(s.peerId),
                          escapeCsv(s.moduleTitle),
                          escapeCsv(s.quizScore),
                          escapeCsv(s.passed ? 'Lulus' : 'Remedial'),
                          escapeCsv(s.simulationCompleted ? 'Lab Selesai' : 'Proses Baca'),
                          escapeCsv(s.timestamp),
                        ].join(',')
                      );
                      const csvContent = [headers.join(','), ...rows].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `rekap-nilai-ruangpintar-${new Date().toISOString().slice(0, 10)}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-stone-800 font-sans font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Unduh Rekap (.csv)</span>
                  </button>
                )}
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="surface-warm-recessed p-5 rounded-2xl text-center space-y-1.5">
                <p className="text-xs font-semibold text-stone-800">
                  Belum Ada Pengumpulan Kuis atau Misi Lab Baru pada Sesi Ini
                </p>
                <p className="text-[11px] text-stone-600 max-w-xl mx-auto">
                  Saat siswa mengerjakan Kuis Seru atau menuntaskan Misi Laboratorium Virtual di tab{' '}
                  <strong>Petualangan Belajar</strong>, nilai mereka akan langsung tampil di sini secara real-time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e6e2d8] text-[11px] font-mono text-stone-500">
                      <th className="py-2.5 pr-3">Siswa &amp; Simpul</th>
                      <th className="py-2.5 px-3">Modul Pembelajaran</th>
                      <th className="py-2.5 px-3 text-right">Skor Kuis</th>
                      <th className="py-2.5 px-3 text-center">Status Lab</th>
                      <th className="py-2.5 pl-3 text-right">Waktu Sinkronisasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece8df] text-xs">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-[#faf8f5] transition-colors">
                        <td className="py-3 pr-3">
                          <div className="font-semibold text-stone-900">
                            {sub.avatar} {sub.studentName}
                          </div>
                          <div className="text-[11px] font-mono text-stone-500">{sub.peerId}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-stone-800">{sub.moduleTitle}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                          <span
                            className={
                              sub.passed ? 'text-emerald-700' : 'text-amber-700'
                            }
                          >
                            {sub.quizScore}% ({sub.passed ? 'Lulus' : 'Remedial'})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px]">
                          {sub.simulationCompleted ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                              ✓ Lab Selesai
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                              Proses Baca
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-3 text-right font-mono text-stone-500 tabular-nums">
                          {sub.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>
        );
      })()}
    </motion.div>
  );
};
