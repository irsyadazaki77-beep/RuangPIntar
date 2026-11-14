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
  const hostPeers = peers.filter((p) => p.role === 'HOST');

  // Dynamic radial classroom layout: Teacher Host at center, all students arranged around
  const nodePositions: Record<string, { x: number; y: number; shortLabel: string }> = {};
  hostPeers.forEach((h, idx) => {
    nodePositions[h.id] = {
      x: 350 + idx * 140,
      y: 195,
      shortLabel: h.name.slice(0, 26),
    };
  });

  const visibleStudents = studentPeers.slice(0, 12);
  visibleStudents.forEach((p, idx) => {
    const angle = -Math.PI / 2 + (idx * Math.PI * 2) / Math.max(1, visibleStudents.length);
    nodePositions[p.id] = {
      x: Math.round(350 + Math.cos(angle) * 245),
      y: Math.round(195 + Math.sin(angle) * 140),
      shortLabel: p.name.slice(0, 22),
    };
  });

  // Dynamic P2P edges connecting neighboring student peers in the mesh ring
  const dynamicMeshEdges = visibleStudents.flatMap((p, idx) => {
    if (visibleStudents.length < 2) return [];
    const nextPeer = visibleStudents[(idx + 1) % visibleStudents.length];
    const fromPos = nodePositions[p.id];
    const toPos = nodePositions[nextPeer.id];
    if (!fromPos || !toPos) return [];
    const edges = [
      {
        id: `ring-${p.id}-${nextPeer.id}`,
        x1: fromPos.x,
        y1: fromPos.y,
        x2: toPos.x,
        y2: toPos.y,
        dur: `${(1.4 + (idx % 4) * 0.25).toFixed(2)}s`,
        color: idx % 2 === 0 ? '#38bdf8' : '#0ea5e9',
      },
    ];
    if (visibleStudents.length >= 4 && idx < Math.floor(visibleStudents.length / 2)) {
      const oppPeer = visibleStudents[(idx + 2) % visibleStudents.length];
      const oppPos = nodePositions[oppPeer.id];
      if (oppPos) {
        edges.push({
          id: `cross-${p.id}-${oppPeer.id}`,
          x1: fromPos.x,
          y1: fromPos.y,
          x2: oppPos.x,
          y2: oppPos.y,
          dur: `${(1.8 + (idx % 3) * 0.2).toFixed(2)}s`,
          color: '#0284c7',
        });
      }
    }
    return edges;
  });

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
        <div className={`h-2 w-full ${activeTheme.ribbonGradient}`} />
        <div className="p-6 sm:p-7 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  🤝 Teman Sekelas yang Terhubung
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-emerald-700 font-bold">
                  Terhubung ke Guru: Aktif ({Math.max(1, activeWebRtcChannelsCount)} Jalur)
                </span>
              </div>
              <h1
                className="text-xl sm:text-2xl font-bold text-slate-900"
                style={{ textWrap: 'balance' }}
              >
                Teman Sekelas yang Terhubung — Berbagi Buku Tanpa Internet
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                HP atau laptop siswa yang sudah memiliki materi otomatis menjadi penyedia buku bagi teman sekelasnya.
                Semua siswa bisa belajar bersama dengan lancar tanpa perlu kuota internet!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div>
                <label
                  htmlFor="mesh-module-select"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Pilih Buku yang Dibagikan
                </label>
                <select
                  id="mesh-module-select"
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="min-h-[42px] px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
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
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Pilih Teman yang Dibantu
                </label>
                <select
                  id="mesh-peer-select"
                  value={selectedTargetPeerId}
                  onChange={(e) => setSelectedTargetPeerId(e.target.value)}
                  className="min-h-[42px] px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
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
                {dynamicMeshEdges.map((edge) => (
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

                {/* Dynamic Host Seed Lines */}
                {hostPeers[0] &&
                  nodePositions[hostPeers[0].id] &&
                  visibleStudents.map((sp) => {
                    const hostPos = nodePositions[hostPeers[0].id];
                    const spPos = nodePositions[sp.id];
                    if (!hostPos || !spPos) return null;
                    return (
                      <line
                        key={`seed-${sp.id}`}
                        x1={hostPos.x}
                        y1={hostPos.y}
                        x2={spPos.x}
                        y2={spPos.y}
                        stroke="#475569"
                        strokeWidth="1.2"
                        strokeDasharray="3 4"
                      />
                    );
                  })}

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
                {peers.slice(0, 13).map((p, idx) => {
                  const fallbackAngle = (idx * Math.PI * 2) / Math.max(1, peers.length);
                  const pos = nodePositions[p.id] || {
                    x: Math.round(350 + Math.cos(fallbackAngle) * 245),
                    y: Math.round(195 + Math.sin(fallbackAngle) * 140),
                    shortLabel: p.name.slice(0, 22),
                  };
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>🤝</span>
                    <span>Bantu Teman Melengkapi Buku</span>
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Kirim bagian buku langsung dari HP kamu ke teman sekelas melalui WiFi sekolah tanpa kuota internet.
                  </p>
                </div>

                {/* Target Peer Status Block */}
                <div className="bg-white/95 rounded-2xl p-4 border border-slate-200/90 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 text-sm">👤 {targetPeer?.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {targetPeer?.localIp}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">Buku di HP Teman:</span>
                      <span className={`font-bold ${activeTheme.accentText}`}>
                        {targetHeldChunks.length} / {activeModule.totalChunks} Bagian ({targetPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        style={{ width: `${targetPct}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${activeTheme.progressGradient}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-slate-500 block text-[11px]">Diterima dari Teman:</span>
                      <strong className="text-slate-900 text-sm">{targetPeer?.downloadedMB} MB</strong>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-emerald-700 block text-[11px] font-semibold">Dibagikan ke Kelas:</span>
                      <strong className="text-emerald-800 text-sm">{targetPeer?.uploadedMB} MB</strong>
                    </div>
                  </div>
                </div>

                {/* Action Controls: Touch target >= 44-48px */}
                <div className="space-y-2.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    disabled={isSyncing}
                    onClick={() => onTriggerPeerTransfer(activeModule.id, selectedTargetPeerId, 4)}
                    className="w-full min-h-[46px] py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 bg-sky-600 hover:bg-sky-500 text-white shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Kirim 4 Bagian Buku ke Teman (0 Kuota)</span>
                  </motion.button>

                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      disabled={isSyncing}
                      onClick={() => onTriggerPeerTransfer(activeModule.id, selectedTargetPeerId, 16)}
                      className="min-h-[44px] py-2 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>Lengkapi 100%</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      disabled={isSyncing}
                      onClick={() => onResetPeerChunks(activeModule.id, selectedTargetPeerId)}
                      className="min-h-[44px] py-2 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Mulai Ulang</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/80 text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span>Hemat Jaringan Kelas: {metrics.routerBottleneckReductionPct}% Lebih Cepat</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Total {metrics.peerToPeerOffloadedMB} MB buku berhasil dibagikan langsung antar-HP siswa tanpa membebani laptop guru.
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
