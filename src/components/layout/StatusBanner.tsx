import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Binary } from 'lucide-react';
import { useMeshNetwork } from '../../context/MeshNetworkContext';

export const StatusBanner: React.FC = () => {
  const { statusBanner, setStatusBanner, lastBinaryPacketInfo } = useMeshNetwork();

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
          className="bg-gradient-to-r from-emerald-50/95 via-teal-50/95 to-sky-50/95 border border-emerald-300/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-950 shadow-xs"
        >
          <div className="space-y-0.5">
            <div className="font-semibold">{statusBanner}</div>
            {lastBinaryPacketInfo && (
              <div className="text-[11px] font-mono text-sky-800 flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5 shrink-0" />
                <span>{lastBinaryPacketInfo}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-800 hover:text-emerald-950 font-mono font-semibold whitespace-nowrap shrink-0 cursor-pointer px-2.5 py-1 rounded-md bg-white/80 hover:bg-white border border-emerald-200/80 transition-colors"
          >
            Tutup
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
