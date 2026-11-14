import React, { useState } from 'react';
import { QrCode, ArrowRight, BookOpen } from 'lucide-react';
import {
  useMeshNetwork,
  DEFAULT_AVATARS,
  STUDENT_PROFILE_KEY,
} from '../../context/MeshNetworkContext';

function stripAvatarEmoji(label: string): string {
  const parts = label.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : label;
}

export const StudentOnboardingModal: React.FC = () => {
  const {
    needsOnboarding,
    setNeedsOnboarding,
    studentProfile,
    setStudentProfile,
    setStatusBanner,
    openQrScanner,
  } = useMeshNetwork();

  const [nameInput, setNameInput] = useState<string>('');
  const [avatarInput, setAvatarInput] = useState<string>(studentProfile.avatar || DEFAULT_AVATARS[0]);

  if (!needsOnboarding) return null;

  const saveAndClose = (finalName: string, openScannerAfter = false) => {
    const updated = {
      ...studentProfile,
      studentName: finalName.trim() || 'Siswa RuangPintar',
      avatar: avatarInput,
    };
    setStudentProfile(updated);
    try {
      window.localStorage.setItem(STUDENT_PROFILE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
    setNeedsOnboarding(false);
    setStatusBanner(`Selamat datang di kelas, ${updated.studentName}.`);
    if (openScannerAfter) {
      openQrScanner();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAndClose(nameInput || studentProfile.studentName, false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="h-1.5 w-full bg-[#1D4ED8]" />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-semibold text-[#1D4ED8]">
              <BookOpen className="w-3.5 h-3.5" />
              <span>RuangPintar Kelas 3T</span>
            </div>
            <h2 id="onboarding-title" className="font-display text-xl font-bold text-slate-900">
              Siapkan Identitas Belajarmu
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Isi nama dan pilih kelompok lencana agar nilai kuis serta progres belajarmu tersimpan rapi di kelas tanpa tertukar dengan teman lain.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="onboarding-name" className="block text-xs font-semibold text-slate-800 mb-1.5">
                Nama Lengkap atau Panggilan
              </label>
              <input
                id="onboarding-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={32}
                autoFocus
                placeholder="Contoh: Hendrikus D. / Siti A."
                className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] bg-white text-slate-900"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-800 mb-2">
                Pilih Lencana Kelompok Nusantara
              </span>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_AVATARS.map((av) => {
                  const cleanLabel = stripAvatarEmoji(av);
                  const selected = avatarInput === av;
                  return (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatarInput(av)}
                      className={`min-h-[42px] px-3 py-2 text-xs font-medium rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        selected
                          ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8] font-semibold ring-1 ring-[#1D4ED8]'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          selected ? 'bg-[#1D4ED8]' : 'bg-slate-300'
                        }`}
                      />
                      <span className="truncate">{cleanLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full min-h-[46px] px-4 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Mulai Belajar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => saveAndClose(nameInput || studentProfile.studentName, true)}
                className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <QrCode className="w-4 h-4 text-[#1D4ED8]" />
                <span>Simpan &amp; Pindai QR Laptop Guru</span>
              </button>

              <button
                type="button"
                onClick={() => saveAndClose(studentProfile.studentName, false)}
                className="w-full py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Lewati langkah ini
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
