import React, { useState } from 'react';
import {
  Megaphone,
  Send,
  Zap,
  HardDrive,
  KeyRound,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  BookOpen,
  Database,
  Users,
  Clock,
} from 'lucide-react';
import type {
  LearningModule,
  SwarmMetrics,
  ClassroomBroadcast,
} from '../../utils/edgeEngine';
import { HostQrConnector } from '../HostQrConnector';

export interface TeacherOverviewTabProps {
  modules: LearningModule[];
  metrics: SwarmMetrics;
  cacheCount: number;
  pendingQueueCount: number;
  classroomBroadcast: ClassroomBroadcast | null;
  gatewayTetheringOnline: boolean;
  onToggleGatewayTethering: () => Promise<void>;
  onDistributeToAll?: (moduleId: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  onBroadcastClassroom?: (payload: {
    message: string;
    focusModuleId?: string;
    examMode: boolean;
    clear?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onTriggerBackup?: () => Promise<{ ok: boolean; message?: string; error?: string }>;
  onChangePin: (
    currentPin: string,
    newPin: string
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
}

export const TeacherOverviewTab: React.FC<TeacherOverviewTabProps> = ({
  modules,
  metrics,
  cacheCount,
  pendingQueueCount,
  classroomBroadcast,
  gatewayTetheringOnline,
  onToggleGatewayTethering,
  onDistributeToAll,
  onBroadcastClassroom,
  onTriggerBackup,
  onChangePin,
}) => {
  const [distributeModuleId, setDistributeModuleId] = useState<string>(modules[0]?.id || '');
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributeStatus, setDistributeStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const [broadcastMessage, setBroadcastMessage] = useState<string>(
    classroomBroadcast?.message || ''
  );
  const [broadcastFocusModId, setBroadcastFocusModId] = useState<string>(
    classroomBroadcast?.focusModuleId || ''
  );
  const [broadcastExamMode, setBroadcastExamMode] = useState<boolean>(
    Boolean(classroomBroadcast?.examMode)
  );
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinChangeStatus, setPinChangeStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onBroadcastClassroom) return;
    setIsSendingBroadcast(true);
    setBroadcastStatus(null);
    const res = await onBroadcastClassroom({
      message: broadcastMessage.trim(),
      focusModuleId: broadcastFocusModId || undefined,
      examMode: broadcastExamMode,
    });
    setIsSendingBroadcast(false);
    setBroadcastStatus(
      res.ok
        ? { ok: true, text: 'Arahan kelas dikirim secara langsung ke semua perangkat siswa.' }
        : { ok: false, text: res.error || 'Gagal mengirim arahan kelas.' }
    );
  };

  const handleClearBroadcast = async () => {
    if (!onBroadcastClassroom) return;
    setIsSendingBroadcast(true);
    const res = await onBroadcastClassroom({ message: '', examMode: false, clear: true });
    setIsSendingBroadcast(false);
    if (res.ok) {
      setBroadcastMessage('');
      setBroadcastFocusModId('');
      setBroadcastExamMode(false);
      setBroadcastStatus({ ok: true, text: 'Pengumuman & mode ujian dinonaktifkan.' });
    }
  };

  const handleDistribute = async () => {
    if (!onDistributeToAll || !distributeModuleId) return;
    setIsDistributing(true);
    setDistributeStatus(null);
    const res = await onDistributeToAll(distributeModuleId);
    setIsDistributing(false);
    setDistributeStatus(
      res.ok
        ? { ok: true, text: res.message || 'Modul berhasil disebarkan ke seluruh siswa.' }
        : { ok: false, text: res.error || 'Gagal menyebarkan modul.' }
    );
  };

  const handleBackup = async () => {
    if (!onTriggerBackup) return;
    setIsBackingUp(true);
    setBackupStatus(null);
    const res = await onTriggerBackup();
    setIsBackingUp(false);
    setBackupStatus(
      res.ok
        ? { ok: true, text: res.message || 'Cadangan database SQLite berhasil disimpan.' }
        : { ok: false, text: res.error || 'Gagal membuat cadangan database.' }
    );
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeStatus(null);
    setIsChangingPin(true);
    const res = await onChangePin(currentPin, newPin);
    setIsChangingPin(false);
    if (!res.ok) {
      setPinChangeStatus({ ok: false, text: res.error || 'Gagal memperbarui PIN.' });
      return;
    }
    setPinChangeStatus({
      ok: true,
      text: res.message || 'PIN Guru diperbarui dengan enkripsi scrypt.',
    });
    setCurrentPin('');
    setNewPin('');
  };

  return (
    <div className="space-y-6">
      {/* Compact KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <Users className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Perangkat Siswa</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {metrics.studentPeersCount}
          </div>
          <div className="text-[11px] font-mono text-[#059669] tabular-nums">
            Offload Mesh {metrics.meshOffloadPercentage}%
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <BookOpen className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Katalog Modul</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{modules.length}</div>
          <div className="text-[11px] font-mono text-[#64748B] tabular-nums">
            Hemat {metrics.ispQuotaSavedMB.toFixed(1)} MB kuota
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <Database className="w-3.5 h-3.5 text-[#059669]" />
            <span>Arsip Tanya-Jawab</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{cacheCount}</div>
          <div className="text-[11px] font-mono text-[#059669] tabular-nums">
            {metrics.cacheHitRatioPct}% Hit Instan (0 ms)
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <Clock className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Antrean AI Luring</span>
          </div>
          <div className="text-2xl font-bold text-[#0F172A] tabular-nums">{pendingQueueCount}</div>
          <div className="text-[11px] font-mono text-[#64748B]">
            {pendingQueueCount > 0 ? 'Menunggu tethering guru' : 'Semua terjawab'}
          </div>
        </div>
      </div>

      {/* Two-Column Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Broadcast & Exam Mode */}
        <form
          onSubmit={handleBroadcastSubmit}
          className="lg:col-span-7 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
                  Arahan Kelas &amp; Mode Ujian Real-Time
                </h2>
                <p className="text-xs text-[#64748B]">
                  Kirim pengumuman, arahkan modul fokus, atau aktifkan kunci soal acak saat evaluasi.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="teacher-broadcast-msg"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Pesan Arahan untuk Seluruh Siswa
              </label>
              <textarea
                id="teacher-broadcast-msg"
                rows={2}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Contoh: Silakan buka Modul Fisika Mikrohidro dan selesaikan kuis sebelum pukul 10.30 WITA."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/30 focus:border-[#1D4ED8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="teacher-broadcast-mod"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Arahkan ke Modul Fokus (Opsional)
                </label>
                <select
                  id="teacher-broadcast-mod"
                  value={broadcastFocusModId}
                  onChange={(e) => setBroadcastFocusModId(e.target.value)}
                  className="w-full min-h-[42px] px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/30"
                >
                  <option value="">— Tanpa fokus modul khusus —</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <label className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 flex items-center justify-between gap-2 cursor-pointer">
                  <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <Lock className="w-3.5 h-3.5 text-rose-600" />
                    <span>Aktifkan Mode Ujian (Acak Soal + Tutup AI)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={broadcastExamMode}
                    onChange={(e) => setBroadcastExamMode(e.target.checked)}
                    className="w-4 h-4 accent-[#1D4ED8] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="submit"
              disabled={isSendingBroadcast}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingBroadcast ? 'Mengirim...' : 'Siarkan ke Kelas'}</span>
            </button>

            <button
              type="button"
              disabled={isSendingBroadcast}
              onClick={handleClearBroadcast}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Nonaktifkan Arahan
            </button>
          </div>

          {broadcastStatus && (
            <div
              className={`text-xs font-medium px-3.5 py-2.5 rounded-xl border flex items-center gap-2 ${
                broadcastStatus.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {broadcastStatus.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{broadcastStatus.text}</span>
            </div>
          )}
        </form>

        {/* Right: Quick Controls (Distribute-All, Tethering, Backup, PIN) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1-Click Distribute Module */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#1D4ED8]" />
              <h3 className="text-sm font-bold text-[#0F172A]">
                Sebar Modul 1-Klik ke Semua Siswa
              </h3>
            </div>
            <p className="text-xs text-[#64748B]">
              Sinkronkan penuh pecahan modul terpilih ke seluruh perangkat siswa aktif lewat jaringan lokal.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                aria-label="Pilih modul untuk disebar ke semua siswa"
                value={distributeModuleId}
                onChange={(e) => setDistributeModuleId(e.target.value)}
                className="flex-1 min-h-[42px] px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-slate-900"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isDistributing || !distributeModuleId}
                onClick={handleDistribute}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                {isDistributing ? 'Menyebar...' : 'Sebar Sekarang'}
              </button>
            </div>
            {distributeStatus && (
              <p
                className={`text-xs font-medium px-3 py-2 rounded-lg border ${
                  distributeStatus.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {distributeStatus.text}
              </p>
            )}
          </div>

          {/* Tethering, SQLite Backup & PIN Security */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 space-y-3.5">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Kendali Gateway &amp; Keamanan Server
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onToggleGatewayTethering}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  gatewayTetheringOnline
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                    : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                }`}
              >
                {gatewayTetheringOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-600" />
                    <span>Tethering AI: Aktif</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-600" />
                    <span>Mode Luring Total</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isBackingUp}
                onClick={handleBackup}
                className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 text-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <HardDrive className="w-4 h-4 text-[#1D4ED8]" />
                <span>{isBackingUp ? 'Mencadangkan...' : 'Cadangkan SQLite'}</span>
              </button>
            </div>

            {backupStatus && (
              <p
                className={`text-xs font-medium px-3 py-2 rounded-lg border ${
                  backupStatus.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {backupStatus.text}
              </p>
            )}

            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowChangePin((prev) => !prev)}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showChangePin ? 'Tutup Form Ganti PIN Guru' : 'Ubah PIN Akses Simpul Guru'}</span>
              </button>

              {showChangePin && (
                <form onSubmit={handlePinSubmit} className="mt-3 space-y-2.5 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="password"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="PIN Saat Ini"
                      required
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="PIN Baru (4-12 karakter)"
                      required
                      minLength={4}
                      maxLength={12}
                      className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isChangingPin}
                    className="px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isChangingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}
                  </button>
                  {pinChangeStatus && (
                    <p
                      className={`text-xs font-medium ${
                        pinChangeStatus.ok ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {pinChangeStatus.text}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zero-Config LAN QR Connector */}
      <HostQrConnector />
    </div>
  );
};
