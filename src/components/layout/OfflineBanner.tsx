import React from 'react';
import { Sparkles, Wifi } from 'lucide-react';
import { useMeshNetwork } from '../../context/MeshNetworkContext';

export const OfflineBanner: React.FC = () => {
  const { isOfflineActive, openQrScanner } = useMeshNetwork();

  if (!isOfflineActive) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-200" />
          </span>
          <span className="font-semibold text-white tracking-wide">
            Mode Belajar Mandiri:
            <span className="font-normal text-sky-100 ml-1.5">
              Kamu tetap bisa membaca semua buku dan mencoba eksperimen sains tanpa kuota internet!
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openQrScanner}
            className="min-h-[36px] px-3.5 py-1 text-xs font-bold bg-white text-sky-900 hover:bg-sky-50 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>📷</span>
            <span>Hubungkan ke Guru (Scan QR)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
