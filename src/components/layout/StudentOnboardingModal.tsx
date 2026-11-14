import React, { useState } from 'react';
import { QrCode, Sparkles, ArrowRight } from 'lucide-react';
import {
  useMeshNetwork,
  DEFAULT_AVATARS,
  STUDENT_PROFILE_KEY,
} from '../../context/MeshNetworkContext';

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
    setStatusBanner(`Selamat datang, ${updated.avatar} ${updated.studentName}!`);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-sky-200 space-y-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-[11px] font-bold text-sky-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Selamat Datang di RuangPintar 3T</span>
          </div>
          <h2 id="onboarding-title" className="text-lg font-bold text-slate-900">
            Kenalan dulu yuk sebelum belajar!
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Isi namamu supaya nilai kuis dan catatan belajarmu tersimpan rapi di kelas tanpa tertukar dengan teman lain.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="onboarding-name" className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Lengkap / Panggilan
            </label>
            <input
              id="onboarding-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={32}
              autoFocus
              placeholder="Contoh: Hendrikus D. / Siti A."
              className="w-full min-h-[44px] px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Ikon Avatar Kamu
            </span>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatarInput(av)}
                  className={`min-h-[42px] px-3 py-2 text-xs font-medium rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    avatarInput === av
                      ? 'border-sky-500 bg-sky-50 text-sky-950 font-bold ring-1 ring-sky-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-base">{av.split(' ')[0]}</span>
                  <span className="truncate">{av.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="w-full min-h-[46px] px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>Mulai Belajar Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => saveAndClose(nameInput || studentProfile.studentName, true)}
              className="w-full min-h-[42px] px-4 py-2 text-xs font-semibold text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Simpan &amp; Pindai QR Laptop Guru</span>
            </button>

            <button
              type="button"
              onClick={() => saveAndClose(studentProfile.studentName, false)}
              className="w-full py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Lewati dulu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
