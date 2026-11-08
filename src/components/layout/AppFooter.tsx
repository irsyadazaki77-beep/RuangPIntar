import React from 'react';
import { useMeshNetwork } from '../../context/MeshNetworkContext';

export const AppFooter: React.FC = () => {
  const { isOfflineActive, setSimulatedOfflineMode, setActiveTab } = useMeshNetwork();

  return (
    <footer className="border-t border-slate-200/80 bg-white/75 backdrop-blur-md mt-12">
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          RuangPintar Edge — Infrastruktur Pembelajaran Terdesentralisasi Wilayah 3T (SQLite + IndexedDB + WebRTC Binary + PWA)
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => setSimulatedOfflineMode((prev) => !prev)}
            className="hover:text-amber-700 transition-colors cursor-pointer whitespace-nowrap font-mono text-[11px] px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-50 text-slate-700"
          >
            {isOfflineActive ? 'Matikan Simulasi Offline' : 'Uji Mode Offline Lokal'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pustaka')}
            className="hover:text-sky-700 transition-colors cursor-pointer whitespace-nowrap font-medium"
          >
            Pustaka P2P
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mesh')}
            className="hover:text-sky-700 transition-colors cursor-pointer whitespace-nowrap font-medium"
          >
            Topologi WebRTC
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tutor')}
            className="hover:text-sky-700 transition-colors cursor-pointer whitespace-nowrap font-medium"
          >
            Gateway AI Lokal
          </button>
        </div>
      </div>
    </footer>
  );
};
