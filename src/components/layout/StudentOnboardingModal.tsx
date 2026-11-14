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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17232F]/65 backdrop-blur-xs"
    >
      <div className="bg-[#FFFDF8] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-[#DED4BE]">
        <div className="h-1.5 w-full bg-[#163A5F]" />
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE9DC] border border-[#DED4BE] text-[11px] font-semibold text-[#163A5F]">
              <BookOpen className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Buku Saku RuangPintar</span>
            </div>
            <h2 id="onboarding-title" className="font-display text-xl font-bold text-[#17232F]">
              Siapkan Identitas Belajarmu
            </h2>
            <p className="text-xs text-[#4A5562] leading-relaxed">
              Isi nama dan pilih kelompok lencana agar nilai kuis serta progres belajarmu tersimpan rapi di kelas tanpa tertukar dengan teman lain.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="onboarding-name" className="block text-xs font-semibold text-[#17232F] mb-1.5">
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
                className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-[#DED4BE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#163A5F] bg-[#FFFDF8] text-[#17232F]"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#17232F] mb-2">
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
                          ? 'border-[#163A5F] bg-[#EDF3F7] text-[#163A5F] font-semibold ring-1 ring-[#163A5F]'
                          : 'border-[#DED4BE] bg-[#FFFDF8] hover:bg-[#EFE9DC]/60 text-[#17232F]'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          selected ? 'bg-[#C85A32]' : 'bg-[#DED4BE]'
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
                className="w-full min-h-[46px] px-4 py-2.5 text-sm font-semibold text-[#FFFDF8] bg-[#163A5F] hover:bg-[#1E4D7B] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Mulai Belajar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => saveAndClose(nameInput || studentProfile.studentName, true)}
                className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold text-[#163A5F] bg-[#EFE9DC] hover:bg-[#E5DEC9] border border-[#DED4BE] rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <QrCode className="w-4 h-4 text-[#C85A32]" />
                <span>Simpan &amp; Pindai QR Laptop Guru</span>
              </button>

              <button
                type="button"
                onClick={() => saveAndClose(studentProfile.studentName, false)}
                className="w-full py-1.5 text-[11px] font-medium text-[#5A6572] hover:text-[#17232F] cursor-pointer"
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
