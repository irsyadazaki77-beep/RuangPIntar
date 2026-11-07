import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Share2,
  Download,
  RefreshCw,
  ArrowRight,
  Wifi,
  Play,
  Pause,
  Grid,
  Trophy,
  History,
} from 'lucide-react';
import type {
  LearningModule,
  PeerNode,
  ChunkTransferEvent,
  SwarmMetrics,
} from '../utils/edgeEngine';
import { getSubjectTheme } from '../utils/subjectTheme';

interface Props {
  modules: LearningModule[];
  peers: PeerNode[];
  transferHistory: ChunkTransferEvent[];
  metrics: SwarmMetrics;
  activeWebRtcChannelsCount: number;
  onTriggerPeerTransfer: (moduleId: string, targetPeerId: string, chunksCount: number) => Promise<void>;
  onResetPeerChunks: (moduleId: string, targetPeerId: string) => Promise<void>;
  isSyncing: boolean;
}

type MeshInspectorTab = 'matriks' | 'klasemen' | 'riwayat';

const meshContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const meshItemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const MESH_EDGES = [
  { id: 'edge-1-2', x1: 120, y1: 155, x2: 580, y2: 155, dur: '2.2s', color: '#38bdf8' },
  { id: 'edge-1-3', x1: 120, y1: 155, x2: 165, y2: 295, dur: '1.6s', color: '#0ea5e9' },
  { id: 'edge-1-5', x1: 120, y1: 155, x2: 350, y2: 330, dur: '1.8s', color: '#38bdf8' },
  { id: 'edge-2-4', x1: 580, y1: 155, x2: 535, y2: 295, dur: '1.7s', color: '#0ea5e9' },
  { id: 'edge-2-5', x1: 580, y1: 155, x2: 350, y2: 330, dur: '1.9s', color: '#38bdf8' },
  { id: 'edge-3-5', x1: 165, y1: 295, x2: 350, y2: 330, dur: '1.4s', color: '#38bdf8' },
  { id: 'edge-4-5', x1: 535, y1: 295, x2: 350, y2: 330, dur: '1.5s', color: '#38bdf8' },
];

export const MeshTopologyView: React.FC<Props> = ({
  modules,
  peers,
  transferHistory,
  metrics,
  activeWebRtcChannelsCount,
  onTriggerPeerTransfer,
  onResetPeerChunks,
  isSyncing,
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(
    modules[0]?.id || 'mod-fisika-mikrohidro'
  );
  const [selectedTargetPeerId, setSelectedTargetPeerId] = useState<string>('peer-siswa-05');
  const [animatePackets, setAnimatePackets] = useState<boolean>(true);
  const [activeInspectorTab, setActiveInspectorTab] = useState<MeshInspectorTab>('matriks');

  const activeModule = modules.find((m) => m.id === selectedModuleId) || modules[0];
  const activeTheme = getSubjectTheme(activeModule.subject);
  const studentPeers = peers.filter((p) => p.role === 'PEER');

  const nodePositions: Record<string, { x: number; y: number; shortLabel: string }> = {
    'host-guru-01': { x: 350, y: 58, shortLabel: 'Laptop Guru (Host 192.168.43.1)' },
    'peer-siswa-01': { x: 120, y: 155, shortLabel: 'Peer 01 · Yohanes' },
    'peer-siswa-02': { x: 580, y: 155, shortLabel: 'Peer 02 · Maria' },
    'peer-siswa-03': { x: 165, y: 295, shortLabel: 'Peer 03 · Lukas' },
    'peer-siswa-04': { x: 535, y: 295, shortLabel: 'Peer 04 · Siti' },
    'peer-siswa-05': { x: 350, y: 330, shortLabel: 'Peer 05 · Hendrikus (Anda)' },
  };

  const targetPeer = peers.find((p) => p.id === selectedTargetPeerId) || studentPeers[0];
  const targetHeldChunks = targetPeer?.moduleChunks[activeModule.id] || [];
  const targetPct = Math.round((targetHeldChunks.length / activeModule.totalChunks) * 100);

  return (
    <motion.div
      variants={meshContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Focused 2-Zone Sandbox: Topology Stage (7 cols) + Peer Scheduler Deck (5 cols) */}
      <motion.section
        variants={meshItemVariants}
        aria-label="Topologi Jaringan Mesh WebRTC P2P"
        className="bento-card overflow-hidden"
      >
        <div className={`h-1.5 w-full ${activeTheme.ribbonGradient}`} />
        <div className="p-6 sm:p-7 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                <span className={`font-bold ${activeTheme.accentText}`}>
                  Protokol: WebRTC SCTP DataChannel
                </span>
                <span aria-hidden="true">·</span>
                <span>Penjadwalan: Peer-First Rarest Chunk</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">
                  Kanal Terhubung: {Math.max(1, activeWebRtcChannelsCount)} Aktif
                </span>
              </div>
              <h1
                className="text-xl sm:text-2xl font-bold text-slate-900"
                style={{ textWrap: 'balance' }}
              >
                Topologi Pertukaran Pecahan Data P2P &amp; Pencegahan Bottleneck Router
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
                Peramban siswa yang telah mengunduh pecahan materi otomatis menjadi{' '}
                <em>seeder peer</em> bagi perangkat teman sekelasnya melalui jaringan WiFi lokal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div>
                <label
                  htmlFor="mesh-module-select"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  Modul Aktif di Swarm
                </label>
                <select
                  id="mesh-module-select"
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-600"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.title.slice(0, 36)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="mesh-peer-select"
                  className="block text-[11px] font-semibold text-slate-600 mb-1"
                >
                  Target Perangkat Siswa Penerima
                </label>
                <select
                  id="mesh-peer-select"
                  value={selectedTargetPeerId}
                  onChange={(e) => setSelectedTargetPeerId(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-600"
                >
                  {studentPeers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.localIp})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Two-Column Topology Canvas + Warm Recessed Control Deck */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Interactive Blueprint SVG WebRTC Mesh Graph */}
            <div className="lg:col-span-7 blueprint-stage text-slate-100 rounded-xl p-5 flex flex-col justify-between border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300 pb-3 border-b border-slate-800">
                <span>Graf Pertukaran DataChannel Kelas (Subnet 192.168.43.0/24)</span>
                <div className="flex items-center gap-3">
                  <span className="text-sky-400 tabular-nums font-semibold">
                    Offload Antar-Siswa: {metrics.meshOffloadPercentage}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setAnimatePackets((prev) => !prev)}
                    className="px-2.5 py-1 text-[11px] font-sans font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {animatePackets ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{animatePackets ? 'Jeda Paket' : 'Putar Paket'}</span>
                  </button>
                </div>
              </div>

              <svg
                viewBox="0 0 700 390"
                className="w-full h-76 my-2"
                role="img"
                aria-label="Visualisasi jaringan mesh P2P dengan animasi paket data antar-siswa"
              >
                {MESH_EDGES.map((edge) => (
                  <g key={edge.id}>
                    <line
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      stroke={edge.color}
                      strokeWidth="2"
                      strokeDasharray="7 6"
                      strokeOpacity="0.6"
                      className="sim-animate-flow"
                      style={{
                        animation: animatePackets ? `hydroDashFlow 0.9s linear infinite` : 'none',
                      }}
                    />
                    {animatePackets && (
                      <circle r="4" fill="#38bdf8" opacity="0.95">
                        <animateMotion
                          dur={edge.dur}
                          repeatCount="indefinite"
                          path={`M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`}
                        />
                      </circle>
                    )}
                  </g>
                ))}

                {/* Host Seed Lines */}
                <line x1="350" y1="58" x2="120" y2="155" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="350" y1="58" x2="580" y2="155" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="350" y1="58" x2="350" y2="330" stroke="#475569" strokeWidth="1.2" strokeDasharray="2 4" />

                {/* Highlight recent transfer vector */}
                {transferHistory[0] &&
                  nodePositions[transferHistory[0].fromPeerId] &&
                  nodePositions[transferHistory[0].toPeerId] && (
                    <g>
                      <line
                        x1={nodePositions[transferHistory[0].fromPeerId].x}
                        y1={nodePositions[transferHistory[0].fromPeerId].y}
                        x2={nodePositions[transferHistory[0].toPeerId].x}
                        y2={nodePositions[transferHistory[0].toPeerId].y}
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeDasharray="10 5"
                        style={{
                          animation: animatePackets ? 'hydroDashFlow 0.55s linear infinite' : 'none',
                        }}
                      />
                      {animatePackets && (
                        <circle r="5.5" fill="#34d399">
                          <animateMotion
                            dur="0.95s"
                            repeatCount="indefinite"
                            path={`M ${nodePositions[transferHistory[0].fromPeerId].x} ${
                              nodePositions[transferHistory[0].fromPeerId].y
                            } L ${nodePositions[transferHistory[0].toPeerId].x} ${
                              nodePositions[transferHistory[0].toPeerId].y
                            }`}
                          />
                        </circle>
                      )}
                      <text
                        x={
                          (nodePositions[transferHistory[0].fromPeerId].x +
                            nodePositions[transferHistory[0].toPeerId].x) /
                          2
                        }
                        y={
                          (nodePositions[transferHistory[0].fromPeerId].y +
                            nodePositions[transferHistory[0].toPeerId].y) /
                            2 -
                          10
                        }
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        Pecahan #{transferHistory[0].chunkIndex} ({transferHistory[0].sizeKB} KB · 0 Kuota)
                      </text>
                    </g>
                  )}

                {/* Render All Peers */}
                {peers.map((p) => {
                  const pos = nodePositions[p.id] || { x: 350, y: 200, shortLabel: p.name };
                  const heldCount = (p.moduleChunks[activeModule?.id || ''] || []).length;
                  const total = activeModule?.totalChunks || 16;
                  const isHost = p.role === 'HOST';
                  const isSelectedTarget = p.id === selectedTargetPeerId;
                  const fillRatio = Math.min(1, heldCount / total);

                  return (
                    <g
                      key={p.id}
                      onClick={() => {
                        if (!isHost) setSelectedTargetPeerId(p.id);
                      }}
                      className={!isHost ? 'cursor-pointer' : ''}
                    >
                      {isSelectedTarget && (
                        <rect
                          x={pos.x - 94}
                          y={pos.y - 31}
                          width="188"
                          height="62"
                          rx="12"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeOpacity="0.55"
                          className="animate-packet-glow"
                          style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                        />
                      )}
                      <rect
                        x={pos.x - 90}
                        y={pos.y - 27}
                        width="180"
                        height="54"
                        rx="10"
                        fill={isHost ? '#0f172a' : isSelectedTarget ? '#0c4a6e' : '#1e293b'}
                        stroke={isHost ? '#f59e0b' : isSelectedTarget ? '#38bdf8' : '#64748b'}
                        strokeWidth={isSelectedTarget || isHost ? '2.2' : '1.4'}
                      />
                      <text
                        x={pos.x}
                        y={pos.y - 8}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {pos.shortLabel}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + 8}
                        textAnchor="middle"
                        fill={heldCount === total ? '#34d399' : '#38bdf8'}
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {p.localIp} · {heldCount}/{total} pecahan
                      </text>
                      {/* Mini Progress Track inside Node */}
                      <rect
                        x={pos.x - 74}
                        y={pos.y + 16}
                        width="148"
                        height="4"
                        rx="2"
                        fill="#0f172a"
                      />
                      <rect
                        x={pos.x - 74}
                        y={pos.y + 16}
                        width={Math.round(148 * fillRatio)}
                        height="4"
                        rx="2"
                        fill={heldCount === total ? '#10b981' : '#38bdf8'}
                      />
                    </g>
                  );
                })}
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800 text-xs text-slate-300 font-mono">
                <span>Aliran Biru: Paket DataChannel Antar-Siswa</span>
                <span>Aliran Hijau: Paket Pecahan Terakhir</span>
                <span>Garis Abu: Seed Awal Guru</span>
              </div>
            </div>

            {/* Right: Subject-Tinted Swarm Scheduler Deck */}
            <div
              className={`lg:col-span-5 ${activeTheme.softBg} border ${activeTheme.softBorder} rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5`}
            >
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Kendali Simulasi &amp; Eksekusi Transfer P2P Mesh
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Algoritma <strong>Peer-First Offloading</strong> mencari pecahan data di perangkat
                    teman sekelas sebelum meminta ke laptop guru.
                  </p>
                </div>

                {/* Target Peer Status Block */}
                <div className="bg-white/90 rounded-xl p-4 border border-slate-200/80 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{targetPeer?.name}</span>
                    <span className="font-mono text-slate-500 tabular-nums">{targetPeer?.localIp}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-600">Kelengkapan Pecahan Modul:</span>
                      <span className={`font-bold ${activeTheme.accentText}`}>
                        {targetHeldChunks.length} / {activeModule.totalChunks} ({targetPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${targetPct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${activeTheme.progressGradient}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1 text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-slate-500 block">Diunduh via Mesh:</span>
                      <strong className="text-slate-900 text-sm">{targetPeer?.downloadedMB} MB</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Dibagikan ke Teman:</span>
                      <strong className="text-emerald-700 text-sm">{targetPeer?.uploadedMB} MB</strong>
                    </div>
                  </div>
                </div>

                {/* Action Controls */}
                <div className="space-y-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={isSyncing}
                    onClick={() => onTriggerPeerTransfer(activeModule.id, selectedTargetPeerId, 4)}
                    className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTheme.primaryBtn}`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Tarik 4 Pecahan Berikutnya dari Peer Tetangga (WebRTC)</span>
                  </motion.button>

                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      disabled={isSyncing}
                      onClick={() => onTriggerPeerTransfer(activeModule.id, selectedTargetPeerId, 16)}
                      className="py-2 px-3 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Sinkronisasi Penuh 100%</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      disabled={isSyncing}
                      onClick={() => onResetPeerChunks(activeModule.id, selectedTargetPeerId)}
                      className="py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Kosongkan Pecahan Peer</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Wifi className={`w-4 h-4 ${activeTheme.accentText}`} />
                  <span>Penghematan Beban Router Lokal: {metrics.routerBottleneckReductionPct}%</span>
                </div>
                <p>
                  Total {metrics.peerToPeerOffloadedMB} MB data disajikan antar-perangkat siswa tanpa
                  membebani kartu jaringan laptop guru.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Bottom Section: Flat High-Density Mesh Telemetry Inspector */}
      <motion.section
        variants={meshItemVariants}
        aria-label="Inspektor Data Jaringan Mesh P2P"
        className="bento-card p-6 sm:p-7 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div
            role="tablist"
            aria-label="Tab Inspektor Telemetri Mesh"
            className="flex items-center gap-1.5 frosted-glass-bar p-1.5 rounded-2xl overflow-x-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeInspectorTab === 'matriks'}
              onClick={() => setActiveInspectorTab('matriks')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeInspectorTab === 'matriks'
                  ? activeTheme.activeTabGradient
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matriks Bitfield Pecahan (0–15)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeInspectorTab === 'klasemen'}
              onClick={() => setActiveInspectorTab('klasemen')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeInspectorTab === 'klasemen'
                  ? activeTheme.activeTabGradient
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Klasemen Seeder Kelas ({studentPeers.length} Peer)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeInspectorTab === 'riwayat'}
              onClick={() => setActiveInspectorTab('riwayat')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                activeInspectorTab === 'riwayat'
                  ? activeTheme.activeTabGradient
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Paket WebRTC ({transferHistory.length})</span>
            </button>
          </div>

          <div className="text-xs font-mono text-slate-600 tabular-nums">
            Modul: <strong className={activeTheme.accentText}>{activeModule.code}</strong> ·{' '}
            {activeModule.chunkSizeKB} KB/pecahan · Total {activeModule.sizeMB} MB
          </div>
        </div>

        {/* TAB 1: Matrix Bitfield Pecahan Data Seluruh Simpul Kelas */}
        {activeInspectorTab === 'matriks' && (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Matriks Distribusi Pecahan Data Real-Time ({activeModule.code} — {activeModule.totalChunks} Pecahan)
              </h2>
              <p className="text-xs text-stone-600">
                Setiap sel menunjukkan ketersediaan pecahan terenkripsi (SHA-256) di memori peramban masing-masing perangkat.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e6e2d8] text-[11px] font-mono text-stone-500">
                    <th className="py-2.5 pr-4 font-semibold">Simpul Perangkat (IP Lokal)</th>
                    <th className="py-2.5 px-2 font-semibold">Peran</th>
                    <th className="py-2.5 px-2 font-semibold">Pecahan Tersimpan (0–15)</th>
                    <th className="py-2.5 px-2 text-right font-semibold">Unggahan P2P</th>
                    <th className="py-2.5 pl-2 text-right font-semibold">Unduhan P2P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece8df] text-xs">
                  {peers.map((peer) => {
                    const held = peer.moduleChunks[activeModule.id] || [];
                    return (
                      <tr key={peer.id} className="hover:bg-[#faf8f5] transition-colors">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-stone-900">{peer.name}</div>
                          <div className="text-[11px] font-mono text-stone-500">
                            {peer.localIp} · {peer.deviceType} · Latensi {peer.latencyMs} ms
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-[11px] text-stone-700">
                          {peer.role === 'HOST' ? 'HOST SEEDER' : 'PEER SWARM'}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: activeModule.totalChunks }, (_, idx) => {
                              const hasChunk = held.includes(idx);
                              return (
                                <span
                                  key={idx}
                                  title={`Pecahan #${idx}`}
                                  className={`w-5 h-5 rounded-xs font-mono text-[10px] flex items-center justify-center tabular-nums transition-colors ${
                                    hasChunk
                                      ? peer.role === 'HOST'
                                        ? 'bg-stone-900 text-white'
                                        : 'bg-sky-700 text-white'
                                      : 'bg-[#f4f1ea] text-stone-400'
                                  }`}
                                >
                                  {idx}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                          {peer.uploadedMB.toFixed(1)} MB
                        </td>
                        <td className="py-3 pl-2 text-right font-mono text-stone-700 tabular-nums">
                          {peer.downloadedMB.toFixed(1)} MB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Classroom P2P Seeder Contributor Leaderboard */}
        {activeInspectorTab === 'klasemen' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Klasemen Kontributor Seeder P2P Kelas (Gotong Royong Tanpa Kuota)
                </h2>
                <p className="text-xs text-stone-600">
                  Klik baris siswa untuk menjadikannya target simulasi transfer pada graf di atas.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-semibold tabular-nums">
                Total Offload Antar-Siswa: {metrics.peerToPeerOffloadedMB} MB
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {[...studentPeers]
                .sort((a, b) => b.uploadedMB - a.uploadedMB)
                .map((peer, idx) => {
                  const isCurrentUser = peer.id === 'peer-siswa-05';
                  const maxUpload = Math.max(1, ...studentPeers.map((p) => p.uploadedMB));
                  const barPct = Math.min(100, Math.round((peer.uploadedMB / maxUpload) * 100));
                  return (
                    <div
                      key={peer.id}
                      onClick={() => setSelectedTargetPeerId(peer.id)}
                      className={`rounded-xl p-4 border transition-colors cursor-pointer flex flex-col justify-between space-y-2.5 ${
                        isCurrentUser
                          ? 'bg-sky-50/60 border-sky-300'
                          : selectedTargetPeerId === peer.id
                          ? 'bg-[#f4f1ea] border-stone-400'
                          : 'bg-[#faf8f5] border-[#e6e2d8] hover:border-stone-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-stone-700">Peringkat #{idx + 1}</span>
                          <span className="text-stone-500">{peer.localIp}</span>
                        </div>
                        <div className="text-xs font-bold text-stone-900 leading-snug">
                          {peer.name}
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#e6e2d8]">
                        <div className="flex justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-stone-500">Dibagikan:</span>
                          <strong className="text-emerald-700">{peer.uploadedMB.toFixed(1)} MB</strong>
                        </div>
                        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${barPct}%` }}
                            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 3: Real-time WebRTC Transfer Ledger */}
        {activeInspectorTab === 'riwayat' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Riwayat Pertukaran Pecahan Data WebRTC DataChannel
                </h2>
                <p className="text-xs text-stone-600">
                  Bukti audit bahwa distribusi konten berlangsung murni di jaringan WiFi lokal dengan konsumsi kuota provider 0 KB.
                </p>
              </div>
              <span className="text-xs font-mono text-stone-500 tabular-nums">
                Menampilkan {transferHistory.length} paket terakhir
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e6e2d8] text-[11px] font-mono text-stone-500">
                    <th className="py-2.5 pr-3">Waktu</th>
                    <th className="py-2.5 px-3">Modul &amp; Pecahan</th>
                    <th className="py-2.5 px-3">Rute Pertukaran (Pengirim → Penerima)</th>
                    <th className="py-2.5 px-3 text-right">Ukuran Paket</th>
                    <th className="py-2.5 pl-3 text-right">Kuota Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece8df] text-xs">
                  {transferHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#faf8f5] transition-colors">
                      <td className="py-3 pr-3 font-mono text-stone-500 tabular-nums whitespace-nowrap">
                        {tx.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-stone-900">{tx.moduleTitle}</span>
                        <span className="mx-1.5 text-stone-400">·</span>
                        <span className="font-mono text-sky-800 tabular-nums">
                          Pecahan #{tx.chunkIndex} ({tx.chunkHash})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-stone-800">{tx.fromPeerName}</span>
                          <span className="text-[11px] font-mono text-stone-500">
                            ({tx.fromPeerRole === 'PEER' ? 'Offload Siswa' : 'Seed Guru'})
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-medium text-stone-900">{tx.toPeerName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-800 tabular-nums">
                        {tx.sizeKB.toLocaleString('id-ID')} KB
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                        0 KB (Lokal)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};
