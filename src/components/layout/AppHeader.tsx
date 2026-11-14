import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Share2,
  MessageSquareText,
  GraduationCap,
  DownloadCloud,
  QrCode,
} from 'lucide-react';
import { PWAInstallButton } from '../PWAInstallButton';
import { StudentProfileModal } from './StudentProfileModal';
import { BrandLogo } from './BrandLogo';
import {
  useMeshNetwork,
  type ActiveTab,
} from '../../context/MeshNetworkContext';

export const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  mobileLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'pustaka', label: 'Materi Kelas', mobileLabel: 'Materi', Icon: BookOpen },
  { id: 'mesh', label: 'Jaringan Kelas', mobileLabel: 'Kelas', Icon: Share2 },
  { id: 'tutor', label: 'Tanya Pintar', mobileLabel: 'Tanya AI', Icon: MessageSquareText },
  { id: 'guru', label: 'Ruang Guru', mobileLabel: 'Guru', Icon: GraduationCap },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3">
          {/* Zone 1: Brand Mark + Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('pustaka');
            }}
            className="flex items-center group cursor-pointer shrink-0"
          >
            <BrandLogo />
          </a>

          {/* Zone 2: Clean Segmented Navigation (Desktop) */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200"
          >
            {NAV_ITEMS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`relative min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Connection Indicator + Profile + Sync */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={socketConnected ? openQrScanner : onReconnect || openQrScanner}
              title={
                socketConnected
                  ? 'Terhubung ke Laptop Guru (klik untuk pindai QR kelas lain)'
                  : isOfflineActive
                    ? 'Mode Luring aktif (klik untuk sambungkan ke Laptop Guru)'
                    : 'Belum tersambung ke Laptop Guru — klik untuk sambung ulang'
              }
              className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 ${
                socketConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : isOfflineActive
                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
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
                    ? 'Luring Lokal'
                    : 'Sambung Ulang'}
              </span>
              <QrCode className="w-3.5 h-3.5 lg:hidden shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="min-h-[40px] px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-900 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              title="Ubah profil siswa"
            >
              <span className="w-6 h-6 rounded-lg bg-[#1D4ED8] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                {getInitials(studentProfile.studentName)}
              </span>
              <span className="hidden sm:inline font-semibold max-w-[100px] truncate">
                {studentProfile.studentName}
              </span>
            </button>

            <PWAInstallButton />

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={isSyncing}
              onClick={onSync}
              className="min-h-[40px] px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <DownloadCloud className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{isSyncing ? 'Menyinkron...' : 'Terima Materi'}</span>
              <span className="sm:hidden">{isSyncing ? 'Proses...' : 'Unduh'}</span>
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
