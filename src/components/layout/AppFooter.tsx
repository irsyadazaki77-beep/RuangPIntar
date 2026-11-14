import React from 'react';
import { useMeshNetwork } from '../../context/MeshNetworkContext';

export const AppFooter: React.FC = () => {
  const { isOfflineActive, setSimulatedOfflineMode, setActiveTab } = useMeshNetwork();

  return (
    <footer className="border-t border-[#DED4BE] bg-[#FFFDF8] mt-10 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5A6572]">
        <div className="font-medium">
          <span className="font-display font-bold text-[#17232F]">RuangPintar</span> · Pustaka Luring &amp; Jaringan Kelas Nusantara (SQLite · IndexedDB · WebRTC)
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => setSimulatedOfflineMode((prev) => !prev)}
            className="hover:text-[#9E3E22] transition-colors cursor-pointer whitespace-nowrap font-mono text-[11px] px-2.5 py-1 rounded-lg bg-[#EFE9DC] hover:bg-[#FAF0EC] text-[#17232F]"
          >
            {isOfflineActive ? 'Matikan Simulasi Offline' : 'Uji Mode Offline Lokal'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pustaka')}
            className="hover:text-[#163A5F] transition-colors cursor-pointer whitespace-nowrap font-semibold"
          >
            Materi Kelas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mesh')}
            className="hover:text-[#163A5F] transition-colors cursor-pointer whitespace-nowrap font-semibold"
          >
            Jaringan Kelas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tutor')}
            className="hover:text-[#163A5F] transition-colors cursor-pointer whitespace-nowrap font-semibold"
          >
            Tanya Pintar
          </button>
        </div>
      </div>
    </footer>
  );
};
