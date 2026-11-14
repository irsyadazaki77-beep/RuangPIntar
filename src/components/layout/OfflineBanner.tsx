import React from 'react';
import { QrCode, BookOpenCheck } from 'lucide-react';
import { useMeshNetwork } from '../../context/MeshNetworkContext';

export const OfflineBanner: React.FC = () => {
  const { isOfflineActive, openQrScanner } = useMeshNetwork();

  if (!isOfflineActive) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#163A5F] text-[#FFFDF8] px-4 py-2 text-xs sm:text-[13px] border-b border-[#0E2944]"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-[#FFFDF8]/15 flex items-center justify-center shrink-0">
            <BookOpenCheck className="w-3.5 h-3.5 text-[#F2B857]" />
          </span>
          <span className="font-semibold">
            Mode Pustaka Mandiri:
            <span className="font-normal text-[#DFD8C8] ml-1.5">
              Semua buku, catatan, dan laboratorium sains tetap bisa dibuka tanpa kuota internet.
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={openQrScanner}
          className="min-h-[34px] px-3 py-1 text-xs font-semibold bg-[#FFFDF8] text-[#163A5F] hover:bg-[#EFE9DC] rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <QrCode className="w-3.5 h-3.5 text-[#C85A32]" />
          <span>Pindai QR Kelas</span>
        </button>
      </div>
    </div>
  );
};
