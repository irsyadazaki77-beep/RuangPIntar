import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles } from 'lucide-react';
import {
  calculateAgroforestryRetention,
  evaluateSimulationMission,
} from '../../utils/edgeEngine';

interface AgroforestrySimulationProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onMissionComplete?: () => void;
}

export const AgroforestrySimulation: React.FC<AgroforestrySimulationProps> = ({
  isPlaying,
  onTogglePlay,
  onMissionComplete,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [canopyCoverPct, setCanopyCoverPct] = useState<number>(55);
  const [stoneTerraceCount, setStoneTerraceCount] = useState<number>(10);
  const [rainfallMmPerYr, setRainfallMmPerYr] = useState<number>(950);

  const agroOut = calculateAgroforestryRetention({
    canopyCoverPct,
    stoneTerraceCount,
    rainfallMmPerYr,
  });

  const mission = evaluateSimulationMission('agroforestry', {
    infiltrationRatePct: agroOut.infiltrationRatePct,
    springDrySeasonDebitLps: agroOut.springDrySeasonDebitLps,
  });

  React.useEffect(() => {
    if (mission.completed && onMissionComplete) {
      onMissionComplete();
    }
  }, [mission.completed, onMissionComplete]);

  const applyAgroStage = (stage: number) => {
    setActiveStage(stage);
    if (stage === 1) {
      setCanopyCoverPct(25);
      setStoneTerraceCount(4);
      setRainfallMmPerYr(850);
    } else if (stage === 2) {
      setCanopyCoverPct(55);
      setStoneTerraceCount(10);
      setRainfallMmPerYr(950);
    } else {
      setCanopyCoverPct(80);
      setStoneTerraceCount(16);
      setRainfallMmPerYr(1150);
    }
  };

  return (
    <section
      aria-label="Simulasi Interaktif Agroforestri Lahan Kering dan Konservasi Mata Air"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e6e2d8]">
        <div>
          <p className="text-xs font-medium text-emerald-700">
            Laboratorium Virtual Hidup Ekohidrologi Lahan Kering · Biologi Kepulauan
          </p>
          <h3 className="text-base font-bold text-stone-900 mt-0.5">
            Simulator Infiltrasi Teras Batu &amp; Debit Mata Air Mamar (NTT)
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Tahapan Eksperimen Agroforestri"
            className="flex items-center gap-1 p-1 bg-[#f4f1ea] rounded-lg"
          >
            <button
              type="button"
              onClick={() => applyAgroStage(1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 1
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 1: Bukit Kritis
            </button>
            <button
              type="button"
              onClick={() => applyAgroStage(2)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 2
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 2: Kebun Mamar
            </button>
            <button
              type="button"
              onClick={() => applyAgroStage(3)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 3
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 3: Konservasi Penuh (Target Misi)
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
            <span>Penampang Hidrologi Lereng Teras Batu &amp; Akuifer Karst</span>
            <span className="tabular-nums text-emerald-400">
              ● {agroOut.hydrologyGrade}
            </span>
          </div>

          <svg
            viewBox="0 0 600 220"
            className="w-full h-52 my-3"
            role="img"
            aria-label="Diagram infiltrasi air hujan melalui tajuk pohon lontar-kelor dan teras batu menuju mata air desa"
          >
            <polygon
              points="20,65 180,65 390,155 580,155 580,210 20,210"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {[0, 1, 2, 3].map((tIdx) => {
              const xPos = 60 + tIdx * 75;
              const yPos = 65 + tIdx * 22;
              const radius = Math.max(10, Math.min(24, canopyCoverPct / 4));
              return (
                <g key={tIdx}>
                  <line x1={xPos} y1={yPos} x2={xPos} y2={yPos - 26} stroke="#a16207" strokeWidth="3" />
                  <circle cx={xPos} cy={yPos - 30} r={radius} fill="#059669" opacity="0.88" stroke="#34d399" strokeWidth="1.2" />
                </g>
              );
            })}

            <rect x="130" y="60" width="16" height="12" fill="#94a3b8" rx="2" />
            <rect x="215" y="88" width="16" height="12" fill="#94a3b8" rx="2" />
            <rect x="300" y="118" width="16" height="12" fill="#94a3b8" rx="2" />

            <path
              d="M 110 85 Q 190 165 435 168"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeDasharray="8 6"
              style={{
                animation: isPlaying ? 'hydroDashFlow 1.0s linear infinite' : 'none',
              }}
            />
            <text x="235" y="185" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace">
              Infiltrasi Akuifer Karst: {agroOut.infiltrationRatePct}% Air Meresap
            </text>

            <ellipse cx="495" cy="162" rx="62" ry="18" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.8" />
            <text x="495" y="166" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
              Mata Air {agroOut.springDrySeasonDebitLps} L/s
            </text>
            <text x="495" y="132" textAnchor="middle" fill="#34d399" fontSize="10" fontFamily="monospace">
              {agroOut.familiesWaterSupplied} KK Terlayani
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Laju Infiltrasi Tanah</span>
              <span className="text-base font-mono font-semibold text-emerald-400 tabular-nums">
                {agroOut.infiltrationRatePct}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Reduksi Erosi Limpasan</span>
              <span className="text-base font-mono font-semibold text-sky-400 tabular-nums">
                -{agroOut.runoffErosionReductionPct}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Debit Mata Air Kemarau</span>
              <span className="text-base font-mono font-semibold text-white tabular-nums">
                {agroOut.springDrySeasonDebitLps} L/s ({agroOut.familiesWaterSupplied} KK)
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 surface-warm-recessed p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-canopy">Tutupan Tajuk Agroforestri (Lontar-Kelor)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {canopyCoverPct}%
                </span>
              </div>
              <input
                id="slider-canopy"
                type="range"
                min={15}
                max={90}
                step={5}
                value={canopyCoverPct}
                onChange={(e) => setCanopyCoverPct(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-terrace">Jumlah Teras Batu Kontur (Sengkedan)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {stoneTerraceCount} jalur teras
                </span>
              </div>
              <input
                id="slider-terrace"
                type="range"
                min={2}
                max={20}
                step={1}
                value={stoneTerraceCount}
                onChange={(e) => setStoneTerraceCount(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-rain">Curah Hujan Tahunan Kepulauan</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {rainfallMmPerYr} mm/tahun
                </span>
              </div>
              <input
                id="slider-rain"
                type="range"
                min={550}
                max={1500}
                step={50}
                value={rainfallMmPerYr}
                onChange={(e) => setRainfallMmPerYr(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2ddd2] flex items-center justify-between gap-3">
            <p className="text-xs text-stone-600">
              Teras batu &amp; serasah menahan air hujan mengisi akuifer kapur.
            </p>
            <button
              type="button"
              onClick={() => applyAgroStage(2)}
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
