import React, { useState } from 'react';
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
} from 'lucide-react';
import type {
  LearningModule,
  CacheEntry,
  SwarmMetrics,
} from '../utils/edgeEngine';
import { getSubjectTheme } from '../utils/subjectTheme';

interface Props {
  modules: LearningModule[];
  cacheEntries: CacheEntry[];
  metrics: SwarmMetrics;
  gatewayTetheringOnline: boolean;
  isPinVerified: boolean;
  onVerifyPin: (pin: string) => Promise<{ ok: boolean; error?: string }>;
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
  gatewayTetheringOnline,
  isPinVerified,
  onVerifyPin,
  onChangePin,
  onLockHost,
  onToggleGatewayTethering,
  onPublishModule,
  onSeedCacheEntry,
}) => {
  // PIN Gate state
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

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
    setPinError(null);
    setIsVerifyingPin(true);
    const res = await onVerifyPin(pinInput);
    setIsVerifyingPin(false);
    if (!res.ok) {
      setPinError(res.error || 'PIN Simpul Guru tidak sesuai.');
      return;
    }
    setPinInput('');
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
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan PIN (contoh: 1945)"
                    className="w-full px-3.5 py-2.5 text-sm font-mono tracking-widest bg-[#faf8f5] border border-[#d6d1c4] rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-700 transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setPinInput('1945')}
                    className="px-3 py-2.5 text-xs font-mono font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Isi 1945
                  </button>
                </div>
              </div>

              {pinError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {pinError}
                </p>
              )}

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isVerifyingPin}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isVerifyingPin ? 'Memverifikasi PIN...' : 'Buka Panel Kendali Simpul Guru'}
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
              <span className="text-emerald-700 font-semibold">
                Otorisasi PIN Guru: Terverifikasi (x-host-pin)
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
    </motion.div>
  );
};
