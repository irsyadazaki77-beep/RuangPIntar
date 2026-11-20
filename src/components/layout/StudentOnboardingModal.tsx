import React, { useState } from 'react';
import { QrCode, ArrowRight, GraduationCap, UserCheck, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useMeshNetwork,
  DEFAULT_AVATARS,
  STUDENT_PROFILE_KEY,
} from '../../context/MeshNetworkContext';

function stripAvatarEmoji(label: string): string {
  const parts = label.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : label;
}

/**
 * Non-blocking inline identity setup bar (no arrival popup overlay).
 * Students can immediately browse modules or configure their name & class tier inline.
 */
export const StudentOnboardingModal: React.FC = () => {
  const {
    needsOnboarding,
    setNeedsOnboarding,
    studentProfile,
    setStudentProfile,
    setStatusBanner,
    openQrScanner,
    setActiveTab,
  } = useMeshNetwork();

  const [expanded, setExpanded] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [roleInput, setRoleInput] = useState<'STUDENT' | 'TEACHER'>(
    studentProfile.userRole || 'STUDENT'
  );
  const [tierInput, setTierInput] = useState<'ALL' | 'SD' | 'SMP' | 'SMA'>(
    studentProfile.educationTier || 'ALL'
  );
  const [avatarInput, setAvatarInput] = useState<string>(studentProfile.avatar || DEFAULT_AVATARS[0]);

  if (!needsOnboarding) return null;

  const saveAndClose = (finalName: string, openScannerAfter = false) => {
    const updated = {
      ...studentProfile,
      studentName: finalName.trim() || (roleInput === 'TEACHER' ? 'Guru Kelas' : 'Siswa RuangPintar'),
      avatar: avatarInput,
      userRole: roleInput,
      educationTier: roleInput === 'TEACHER' ? ('ALL' as const) : tierInput,
    };
    setStudentProfile(updated);
    try {
      window.localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
    setNeedsOnboarding(false);
    if (roleInput === 'TEACHER') {
      setActiveTab('guru');
      setStatusBanner(`Mode Guru aktif — silakan verifikasi PIN di Ruang Guru, ${updated.studentName}.`);
    } else {
      setActiveTab('pustaka');
      setStatusBanner(
        `Identitas tersimpan untuk ${updated.studentName}${
          tierInput !== 'ALL' ? ` (Jenjang ${tierInput})` : ''
        }.`
      );
    }
    if (openScannerAfter) {
      openQrScanner();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAndClose(nameInput || studentProfile.studentName, false);
  };

  return (
    <section
      aria-label="Pengaturan Identitas Awal"
      className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
              Lengkapi nama &amp; jenjang belajarmu agar nilai kuis tercatat rapi di kelas
            </p>
            <p className="text-[11px] text-slate-600 truncate">
              Saat ini aktif sebagai <span className="font-semibold text-slate-800">{studentProfile.studentName}</span> — kamu tetap bisa langsung membaca modul di bawah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>{expanded ? 'Tutup Form' : 'Atur Identitas'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => saveAndClose(studentProfile.studentName, false)}
            aria-label="Tutup pengingat identitas"
            className="min-h-[36px] w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3 space-y-1.5">
            <span className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Peran di Kelas
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setRoleInput('STUDENT')}
                className={`min-h-[40px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  roleInput === 'STUDENT'
                    ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Siswa</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleInput('TEACHER')}
                className={`min-h-[40px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  roleInput === 'TEACHER'
                    ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>Guru</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label htmlFor="onboarding-name" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              {roleInput === 'TEACHER' ? 'Nama Pengajar' : 'Nama Lengkap / Panggilan'}
            </label>
            <input
              id="onboarding-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={32}
              placeholder={roleInput === 'TEACHER' ? 'Ibu Wilhelmina / Pak Frans' : 'Hendrikus D. / Siti A.'}
              className="w-full min-h-[40px] px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] bg-white text-slate-900"
            />
          </div>

          {roleInput === 'STUDENT' ? (
            <div className="md:col-span-3 space-y-1.5">
              <span className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                Jenjang &amp; Kelompok
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  aria-label="Pilih Jenjang Kelas"
                  value={tierInput}
                  onChange={(e) => setTierInput(e.target.value as 'ALL' | 'SD' | 'SMP' | 'SMA')}
                  className="min-h-[40px] px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                >
                  <option value="ALL">Semua Jenjang</option>
                  <option value="SD">SD (1–6)</option>
                  <option value="SMP">SMP (7–9)</option>
                  <option value="SMA">SMA / SMK</option>
                </select>
                <select
                  aria-label="Pilih Lencana Kelompok"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  className="min-h-[40px] px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                >
                  {DEFAULT_AVATARS.map((av) => (
                    <option key={av} value={av}>
                      {stripAvatarEmoji(av)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="md:col-span-3 text-[11px] text-slate-600 leading-relaxed pb-1">
              Menyimpan sebagai Guru akan mengarahkan langsung ke tab Ruang Guru untuk verifikasi PIN lokal.
            </div>
          )}

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 min-h-[40px] px-3.5 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <span>Simpan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => saveAndClose(nameInput || studentProfile.studentName, true)}
              title="Simpan & Pindai QR Laptop Guru"
              className="min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>QR Guru</span>
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
