import React from 'react';
import { useMeshNetwork } from '../../context/MeshNetworkContext';

export const AppFooter: React.FC = () => {
  const { isOfflineActive, setSimulatedOfflineMode, setActiveTab } = useMeshNetwork();

  return (
    <footer className="border-t border-slate-200 bg-white mt-10 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="font-medium">
          <span className="font-display font-bold text-slate-900">RuangPintar</span> · Pustaka Luring &amp; Jaringan Kelas Nusantara (SQLite · IndexedDB · WebRTC)
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => setSimulatedOfflineMode((prev) => !prev)}
            className="hover:text-amber-700 transition-colors cursor-pointer whitespace-nowrap font-mono text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700"
          >
            {isOfflineActive ? 'Matikan Simulasi Offline' : 'Uji Mode Offline Lokal'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pustaka')}
            className="hover:text-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap font-semibold"
          >
            Materi Kelas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mesh')}
            className="hover:text-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap font-semibold"
          >
            Jaringan Kelas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tutor')}
            className="hover:text-[#1D4ED8] transition-colors cursor-pointer whitespace-nowrap font-semibold"
          >
            Tanya Pintar
          </button>
        </div>
      </div>
    </footer>
  );
};
