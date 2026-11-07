import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles } from 'lucide-react';
import {
  calculateMangroveMitigation,
  evaluateSimulationMission,
} from '../../utils/edgeEngine';

interface MangroveSimulationProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onMissionComplete?: () => void;
}

export const MangroveSimulation: React.FC<MangroveSimulationProps> = ({
  isPlaying,
  onTogglePlay,
  onMissionComplete,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [beltWidth, setBeltWidth] = useState<number>(85);
  const [treeDensity, setTreeDensity] = useState<number>(30);
  const [coastLengthKm, setCoastLengthKm] = useState<number>(1.5);

  const mangroveOut = calculateMangroveMitigation({
    beltWidthMeters: beltWidth,
    treeDensityPer100Sqm: treeDensity,
    coastlineLengthKm: coastLengthKm,
  });

  const mission = evaluateSimulationMission('mangrove', {
    waveEnergyReductionPct: mangroveOut.waveEnergyReductionPct,
    annualCarbonSequesteredTons: mangroveOut.annualCarbonSequesteredTons,
  });

  React.useEffect(() => {
    if (mission.completed && onMissionComplete) {
      onMissionComplete();
    }
  }, [mission.completed, onMissionComplete]);

  const applyMangroveStage = (stage: number) => {
    setActiveStage(stage);
    if (stage === 1) {
      setBeltWidth(30);
      setTreeDensity(16);
      setCoastLengthKm(1.0);
    } else if (stage === 2) {
      setBeltWidth(85);
      setTreeDensity(30);
      setCoastLengthKm(1.5);
    } else {
      setBeltWidth(145);
      setTreeDensity(45);
      setCoastLengthKm(2.5);
    }
  };

  const mangroveBoxWidth = Math.min(240, Math.max(60, beltWidth * 1.35));

  return (
    <section
      aria-label="Simulasi Interaktif Mitigasi Gelombang dan Karbon Biru Mangrove"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e6e2d8]">
        <div>
          <p className="text-xs font-medium text-emerald-700">
            Laboratorium Virtual Hidup Ekologi Pesisir · Biologi Kepulauan
          </p>
          <h3 className="text-base font-bold text-stone-900 mt-0.5">
            Simulator Redaman Ombak &amp; Sekuestrasi Karbon Biru
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Tahapan Eksperimen Sabuk Mangrove"
            className="flex items-center gap-1 p-1 bg-[#f4f1ea] rounded-lg"
          >
            <button
              type="button"
              onClick={() => applyMangroveStage(1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 1
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 1: Rawan Abrasi
            </button>
            <button
              type="button"
              onClick={() => applyMangroveStage(2)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 2
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 2: Sabuk Desa
            </button>
            <button
              type="button"
              onClick={() => applyMangroveStage(3)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 3
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 3: Konservasi Inti (Target Misi)
            </button>
          </div>

          <button
            type="button"
            onClick={onTogglePlay}
            className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-[#f4f1ea] hover:bg-[#e9e4d8] rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Jeda Animasi' : 'Putar Animasi'}</span>
          </button>
        </div>
      </div>

      <div
        className={`rounded-xl p-3.5 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          mission.completed
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : 'surface-warm-recessed border-[#e6e2d8] text-stone-800'
        }`}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {mission.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span>
              {mission.missionTitle} {mission.completed ? '— MISI TUNTAS (+150 XP)!' : ''}
            </span>
          </div>
          <p className="text-xs text-stone-600">{mission.targetDescription}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right font-mono text-xs tabular-nums">
            <div className="font-semibold text-stone-900">{mission.currentProgressText}</div>
            <div className="text-[11px] text-stone-500">Progres Misi: {mission.progressPct}%</div>
          </div>
          <div className="w-24 h-2.5 bg-stone-200 rounded-full overflow-hidden">
            <motion.div
              initial={false}
              animate={{ width: `${mission.progressPct}%` }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${
                mission.completed ? 'bg-emerald-600' : 'bg-sky-700'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 blueprint-stage text-slate-100 rounded-xl p-5 flex flex-col justify-between border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono pb-3 border-b border-slate-800">
            <span>Profil Redaman Gelombang Pasang &amp; Penguncian Karbon Anoksik</span>
            <span className="tabular-nums text-emerald-400">
              ● {mangroveOut.protectionGrade}
            </span>
          </div>

          <svg
            viewBox="0 0 600 220"
            className="w-full h-52 my-3"
            role="img"
            aria-label="Animasi gelombang laut diredam oleh akar tunjang mangrove dan penyimpanan karbon biru"
          >
            <rect x="20" y="95" width="230" height="90" fill="#0369a1" opacity="0.5" />
            <polygon points="20,185 200,150 580,120 580,205 20,205" fill="#334155" />

            <path
              d="M 25 95 Q 60 52 95 95 T 165 95 T 230 100"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4"
              strokeDasharray="12 6"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.9s linear infinite' : 'none',
              }}
            />
            <text x="115" y="48" textAnchor="middle" fill="#38bdf8" fontSize="11" fontFamily="monospace">
              Energi Ombak Datang 100%
            </text>

            <rect
              x="225"
              y="62"
              width={mangroveBoxWidth}
              height="95"
              fill="#065f46"
              opacity="0.82"
              stroke="#10b981"
              strokeWidth="1.5"
              rx="6"
            />
            <text
              x={225 + mangroveBoxWidth / 2}
              y="95"
              textAnchor="middle"
              fill="#ecfdf5"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              Sabuk Rhizophora ({beltWidth}m)
            </text>

            {[0, 1, 2, 3].map((pIdx) => (
              <circle
                key={pIdx}
                cx={245 + pIdx * Math.max(14, mangroveBoxWidth / 4.5)}
                cy={122}
                r="4"
                fill="#34d399"
                className="sim-animate-sink"
                style={{
                  animation: isPlaying
                    ? `carbonSink ${1.4 + pIdx * 0.25}s ease-in-out infinite`
                    : 'none',
                }}
              />
            ))}

            {[0, 1, 2].map((rIdx) => {
              const rootX = 240 + rIdx * Math.max(22, mangroveBoxWidth / 3.4);
              return (
                <g key={`root-${rIdx}`}>
                  <path
                    d={`M ${rootX} 152 Q ${rootX + 12} 112 ${rootX + 24} 152`}
                    fill="none"
                    stroke="#a7f3d0"
                    strokeWidth="2"
                    opacity="0.7"
                  />
                  <ellipse
                    cx={rootX + 12}
                    cy={138}
                    rx="6"
                    ry="3"
                    fill="#fde047"
                    className="sim-animate-fish"
                    style={{
                      animation: isPlaying
                        ? `fishSwim ${1.8 + rIdx * 0.3}s ease-in-out infinite`
                        : 'none',
                    }}
                  />
                </g>
              );
            })}

            <path
              d={`M ${230 + mangroveBoxWidth} 112 Q ${260 + mangroveBoxWidth} 106 ${295 + mangroveBoxWidth} 112`}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
            />
            <text x="515" y="96" textAnchor="middle" fill="#34d399" fontSize="11" fontFamily="monospace">
              Redaman: -{mangroveOut.waveEnergyReductionPct}%
            </text>
            <text x="410" y="185" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace">
              Lapisan Lumpur Anoksik: {mangroveOut.annualCarbonSequesteredTons} ton CO₂e/thn
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Redaman Energi Ombak</span>
              <span className="text-base font-mono font-semibold text-emerald-400 tabular-nums">
                {mangroveOut.waveEnergyReductionPct}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Serapan Karbon Biru</span>
              <span className="text-base font-mono font-semibold text-sky-400 tabular-nums">
                {mangroveOut.annualCarbonSequesteredTons} ton CO₂e/thn
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Biomassa Juvenil Ikan</span>
              <span className="text-base font-mono font-semibold text-white tabular-nums">
                {mangroveOut.juvenileFishBiomassKgPerYr.toLocaleString('id-ID')} kg/thn
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 surface-warm-recessed p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-belt">Lebar Sabuk Hutan Mangrove</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {beltWidth} meter
                </span>
              </div>
              <input
                id="slider-belt"
                type="range"
                min={15}
                max={200}
                step={5}
                value={beltWidth}
                onChange={(e) => setBeltWidth(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-density">Kerapatan Pohon Rhizophora</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {treeDensity} pohon / 100 m²
                </span>
              </div>
              <input
                id="slider-density"
                type="range"
                min={10}
                max={60}
                step={2}
                value={treeDensity}
                onChange={(e) => setTreeDensity(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-coast">Panjang Garis Pantai Desa</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {coastLengthKm} km
                </span>
              </div>
              <input
                id="slider-coast"
                type="range"
                min={0.5}
                max={5}
                step={0.5}
                value={coastLengthKm}
                onChange={(e) => setCoastLengthKm(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2ddd2] flex items-center justify-between gap-3">
            <p className="text-xs text-stone-600">
              Sedimen lumpur anaerob mengunci karbon organik hingga ratusan tahun.
            </p>
            <button
              type="button"
              onClick={() => applyMangroveStage(2)}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-[#e0dbd0] hover:bg-stone-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset Parameter
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
