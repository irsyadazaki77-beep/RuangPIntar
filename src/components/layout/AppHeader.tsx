import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PWAInstallButton } from '../PWAInstallButton';
import { StudentProfileModal } from './StudentProfileModal';
import {
  useMeshNetwork,
  type ActiveTab,
} from '../../context/MeshNetworkContext';

export const NAV_ITEMS: { id: ActiveTab; label: string; mobileLabel: string; iconEmoji: string }[] = [
  { id: 'pustaka', label: 'Petualangan Belajar', mobileLabel: 'Buku Belajar', iconEmoji: '📚' },
  { id: 'mesh', label: 'Teman Sekelas', mobileLabel: 'Teman Kelas', iconEmoji: '🤝' },
  { id: 'tutor', label: 'Sahabat Belajar AI', mobileLabel: 'Sahabat AI', iconEmoji: '🤖' },
  { id: 'guru', label: 'Ruang Guru', mobileLabel: 'Ruang Guru', iconEmoji: '🏫' },
];

interface Props {
  onSync: () => void;
  onReconnect?: () => void;
}

export const AppHeader: React.FC<Props> = ({ onSync, onReconnect }) => {
  const {
    activeTab,
    setActiveTab,
    studentProfile,
    isSyncing,
    openQrScanner,
    isOfflineActive,
    socketConnected,
  } = useMeshNetwork();
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-sky-100 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 sm:py-3">
          {/* Zone 1: Friendly Wordmark + 3T Badge */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('pustaka');
            }}
            className="flex items-center gap-2.5 group cursor-pointer shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-teal-500 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs group-hover:scale-105 transition-transform">
              RP
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-none group-hover:text-sky-700 transition-colors">
                RuangPintar
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 leading-tight">
                LMS Sahabat 3T · Bebas Kuota
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation links with rounded pill tabs & active motion */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-sky-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <span>{item.iconEmoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Connection Indicator + Student Profile + PWA + Quick Sync */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={socketConnected ? openQrScanner : onReconnect || openQrScanner}
              title={
                socketConnected
                  ? 'Terhubung langsung ke Laptop Guru (klik untuk pindah/scan QR)'
                  : isOfflineActive
                    ? 'Mode Luring aktif (klik untuk sambung ke Laptop Guru)'
                    : 'Belum tersambung ke Laptop Guru — klik untuk sambung ulang'
              }
              className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 ${
                socketConnected
                  ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100'
                  : isOfflineActive
                    ? 'border-amber-200 bg-amber-50/90 text-amber-900 hover:bg-amber-100'
                    : 'border-rose-200 bg-rose-50/90 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  socketConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : isOfflineActive
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
              />
              <span className="hidden lg:inline">
                {socketConnected
                  ? 'Terhubung Guru'
                  : isOfflineActive
                    ? 'Luring (HP)'
                    : 'Sambung Ulang'}
              </span>
              <span className="lg:hidden">QR</span>
            </button>

            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-xs font-semibold text-amber-950 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Klik untuk ubah profil siswa"
            >
              <span className="text-base">{studentProfile.avatar.split(' ')[0]}</span>
              <span className="hidden sm:inline font-bold max-w-[110px] truncate">{studentProfile.studentName}</span>
            </button>
            <PWAInstallButton />
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={isSyncing}
              onClick={onSync}
              className="min-h-[42px] px-3 sm:px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 disabled:opacity-50 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>📥</span>
              <span className="hidden sm:inline">{isSyncing ? 'Menyinkron...' : 'Terima Materi'}</span>
              <span className="sm:hidden">{isSyncing ? 'Unduh...' : 'Materi'}</span>
            </motion.button>
          </div>
        </div>
      </header>

      <StudentProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
};
