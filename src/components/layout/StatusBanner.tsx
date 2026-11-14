import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Binary, CheckCircle2 } from 'lucide-react';
import { useMeshNetwork } from '../../context/MeshNetworkContext';

export const StatusBanner: React.FC = () => {
  const { statusBanner, setStatusBanner, lastBinaryPacketInfo } = useMeshNetwork();

  // Auto-dismiss status banner after 5s so it stays non-intrusive on mobile screens
  useEffect(() => {
    if (!statusBanner) return;
    const timer = window.setTimeout(() => {
      setStatusBanner(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [statusBanner, setStatusBanner]);

  return (
    <AnimatePresence mode="popLayout">
      {statusBanner && (
        <motion.div
          key={statusBanner}
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-950"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold">{statusBanner}</div>
              {lastBinaryPacketInfo && (
                <div className="text-[11px] font-mono text-[#1D4ED8] flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5 shrink-0" />
                  <span>{lastBinaryPacketInfo}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-800 hover:text-emerald-950 font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100/60 border border-emerald-200 transition-colors"
          >
            Tutup
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
