import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles } from 'lucide-react';
import {
  calculateMicrohydroOutput,
  evaluateSimulationMission,
} from '../../utils/edgeEngine';

interface MicrohydroSimulationProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onMissionComplete?: () => void;
}

export const MicrohydroSimulation: React.FC<MicrohydroSimulationProps> = ({
  isPlaying,
  onTogglePlay,
  onMissionComplete,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [headMeters, setHeadMeters] = useState<number>(22);
  const [flowLiters, setFlowLiters] = useState<number>(65);
  const [efficiencyPct, setEfficiencyPct] = useState<number>(75);

  const hydroOut = calculateMicrohydroOutput({
    headMeters,
    flowLitersPerSec: flowLiters,
    efficiencyPct,
  });

  const mission = evaluateSimulationMission('microhydro', {
    netElectricalPowerKW: hydroOut.netElectricalPowerKW,
    housesPowered: hydroOut.housesPowered,
  });

  React.useEffect(() => {
    if (mission.completed && onMissionComplete) {
      onMissionComplete();
    }
  }, [mission.completed, onMissionComplete]);

  const flowDurationSec = Math.max(0.35, Number((1.8 - flowLiters / 110).toFixed(2)));
  const spinDurationSec = Math.max(
    0.4,
    Number((2.4 - Math.min(2.0, hydroOut.netElectricalPowerKW / 12)).toFixed(2))
  );
  const litWindowsCount = Math.min(6, Math.max(1, Math.floor(hydroOut.housesPowered / 5)));

  const applyStage = (stage: number) => {
    setActiveStage(stage);
    if (stage === 1) {
      setHeadMeters(22);
      setFlowLiters(65);
      setEfficiencyPct(75);
    } else if (stage === 2) {
      setHeadMeters(14);
      setFlowLiters(35);
      setEfficiencyPct(68);
    } else {
      setHeadMeters(32);
      setFlowLiters(85);
      setEfficiencyPct(80);
    }
  };

  return (
    <section
      aria-label="Simulasi Interaktif Pembangkit Listrik Mikrohidro"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-200">
        <div>
          <p className="text-xs font-bold text-sky-800 flex items-center gap-1.5">
            <span>🔬</span>
            <span>Laboratorium Virtual Tanpa Kuota · Fisika Energi Terbarukan</span>
          </p>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
            Simulator Aliran Sungai &amp; Turbin Pembangkit Mikrohidro (PLTMH)
          </h3>
        </div>

        {/* Quick Guide / Learning Mission Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="group"
            aria-label="Pilihan Tahap Belajar Cepat"
            className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl"
          >
            <button
              type="button"
              onClick={() => applyStage(1)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                activeStage === 1
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahap 1: Aliran Normal
            </button>
            <button
              type="button"
              onClick={() => applyStage(2)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                activeStage === 2
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahap 2: Musim Kemarau
            </button>
            <button
              type="button"
              onClick={() => applyStage(3)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                activeStage === 3
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahap 3: Misi Desa (+150 XP)
            </button>
          </div>

          <button
            type="button"
            onClick={onTogglePlay}
            className="min-h-[40px] px-4 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
            <span>{isPlaying ? 'Jeda Aliran' : 'Putar Aliran'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Learning Mission Box */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs ${
          mission.completed
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300 text-emerald-950'
            : 'bg-gradient-to-r from-sky-50/80 via-indigo-50/40 to-white border-sky-200 text-slate-800'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold">
            {mission.completed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>MISI LAB TUNTAS (+150 XP)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PANDUAN CEPAT / MISI BELAJAR</span>
              </span>
            )}
            <span className="text-slate-900 font-bold">{mission.missionTitle}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            🎯 <strong>Petunjuk:</strong> {mission.targetDescription}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right text-xs">
            <div className="font-bold text-slate-900">{mission.currentProgressText}</div>
            <div className="text-[11px] text-slate-500 font-semibold">Progres: {mission.progressPct}%</div>
          </div>
          <div className="w-24 sm:w-28 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <motion.div
              initial={false}
              animate={{ width: `${mission.progressPct}%` }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${
                mission.completed
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 blueprint-stage text-slate-100 rounded-xl p-5 flex flex-col justify-between border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono pb-3 border-b border-slate-800">
            <span>Penampang Hidrodinamika Pipa Pesat &amp; Putaran Turbin</span>
            <span className="tabular-nums text-emerald-400">
              ● {hydroOut.statusLabel}
            </span>
          </div>

          <svg
            viewBox="0 0 600 250"
            className="w-full h-56 my-3"
            role="img"
            aria-label="Animasi aliran air pipa pesat memutar turbin Pelton dan menyalakan lampu rumah desa"
          >
            <polygon
              points="20,40 160,40 310,185 580,185 580,235 20,235"
              fill="#1e293b"
              stroke="#334155"
              strokeWidth="1.5"
            />
            <rect x="65" y="18" width="75" height="32" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.2" rx="3" />
            <text x="102" y="38" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace">
              Bak Penenang
            </text>

            <line x1="42" y1="25" x2="42" y2="180" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="48" y="108" fill="#38bdf8" fontSize="11" fontFamily="monospace">
              H = {headMeters} m
            </text>

            <line
              x1="135"
              y1="42"
              x2="310"
              y2="172"
              stroke="#0c4a6e"
              strokeWidth={Math.max(8, Math.min(16, flowLiters / 9))}
              strokeLinecap="round"
            />
            <line
              x1="135"
              y1="42"
              x2="310"
              y2="172"
              stroke="#38bdf8"
              strokeWidth={Math.max(4, Math.min(10, flowLiters / 14))}
              strokeLinecap="round"
              strokeDasharray="10 8"
              className="sim-animate-flow"
              style={{
                animation: isPlaying
                  ? `hydroDashFlow ${flowDurationSec}s linear infinite`
                  : 'none',
              }}
            />
            <text x="235" y="94" fill="#e2e8f0" fontSize="11" fontFamily="monospace">
              Debit Q = {flowLiters} L/s
            </text>

            <rect x="305" y="130" width="95" height="58" fill="#0f172a" stroke="#64748b" strokeWidth="2" rx="4" />

            <g
              style={{
                transformOrigin: '336px 160px',
                animation: isPlaying
                  ? `turbineSpin ${spinDurationSec}s linear infinite`
                  : 'none',
              }}
              className="sim-animate-spin"
            >
              <circle cx="336" cy="160" r="17" fill="#0284c7" stroke="#bae6fd" strokeWidth="2" />
              <line x1="336" y1="141" x2="336" y2="179" stroke="#e0f2fe" strokeWidth="2" />
              <line x1="317" y1="160" x2="355" y2="160" stroke="#e0f2fe" strokeWidth="2" />
              <line x1="323" y1="147" x2="349" y2="173" stroke="#e0f2fe" strokeWidth="1.5" />
              <line x1="349" y1="147" x2="323" y2="173" stroke="#e0f2fe" strokeWidth="1.5" />
              <circle cx="336" cy="160" r="5" fill="#f8fafc" />
            </g>

            <text x="377" y="154" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
              η={efficiencyPct}%
            </text>
            <text x="377" y="169" textAnchor="middle" fill="#f8fafc" fontSize="9" fontFamily="monospace">
              ELC 50Hz
            </text>

            {/* Reactive Village Glow based on net generated power */}
            <circle
              cx="525"
              cy="158"
              r="48"
              fill="#fde047"
              opacity={Math.min(0.4, (hydroOut.netElectricalPowerKW / 15) * 0.4)}
            />

            <rect
              x="478"
              y="128"
              width="94"
              height="60"
              fill={hydroOut.netElectricalPowerKW > 8 ? '#065f46' : '#064e3b'}
              stroke={hydroOut.netElectricalPowerKW > 8 ? '#34d399' : '#10b981'}
              strokeWidth="2"
              rx="6"
            />
            <text x="525" y="145" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontWeight="bold">
              {hydroOut.netElectricalPowerKW} kW Listrik
            </text>
            {[0, 1, 2, 3, 4, 5].map((wIdx) => {
              const isLit = wIdx < litWindowsCount;
              return (
                <rect
                  key={wIdx}
                  x={489 + wIdx * 13}
                  y={152}
                  width="9"
                  height="11"
                  rx="2"
                  fill={isLit ? '#fde047' : '#065f46'}
                  stroke={isLit ? '#eab308' : '#047857'}
                  strokeWidth="1"
                />
              );
            })}
            <text x="525" y="179" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace" fontWeight="bold">
              💡 {hydroOut.housesPowered} Rumah Menyala
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Daya Teoritis</span>
              <span className="text-sm sm:text-base font-bold text-white tabular-nums">
                {hydroOut.theoreticalPowerKW} kW
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Daya Listrik Nyata</span>
              <span className="text-sm sm:text-base font-bold text-sky-400 tabular-nums">
                {hydroOut.netElectricalPowerKW} kW
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Desa Terlistriki</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
                {hydroOut.housesPowered} Rumah
              </span>
            </div>
          </div>
        </div>

        {/* Right: Sliders with Large Intuitive Human Labels */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xs">
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-head">Ketinggian Air Terjun (Head H)</label>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[11px]">
                  {headMeters} m · {headMeters >= 30 ? '🏔️ Sangat Tinggi' : headMeters >= 18 ? '⛰️ Sedang' : '🌊 Landai'}
                </span>
              </div>
              <input
                id="slider-head"
                type="range"
                min={5}
                max={60}
                step={1}
                value={headMeters}
                onChange={(e) => setHeadMeters(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>5 m (Landai)</span>
                <span>60 m (Curam)</span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-flow">Kecepatan Aliran Air Sungai (Debit Q)</label>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[11px]">
                  {flowLiters} L/s ({(flowLiters / 1000).toFixed(2)} m³/s) · {flowLiters >= 80 ? '🌊 Sangat Deras' : flowLiters >= 50 ? '💧 Sedang' : '🍂 Pelan'}
                </span>
              </div>
              <input
                id="slider-flow"
                type="range"
                min={15}
                max={150}
                step={5}
                value={flowLiters}
                onChange={(e) => setFlowLiters(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>15 L/s (Kemarau)</span>
                <span>150 L/s (Banjir/Hujan)</span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-eta">Efisiensi Kualitas Turbin (η)</label>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px]">
                  {efficiencyPct}% · {efficiencyPct >= 75 ? '⚡ Sangat Bagus' : '⚙️ Standar'}
                </span>
              </div>
              <input
                id="slider-eta"
                type="range"
                min={45}
                max={88}
                step={1}
                value={efficiencyPct}
                onChange={(e) => setEfficiencyPct(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>45% (Turbin Kayu)</span>
                <span>88% (Turbin Presisi)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Rumus Lapangan: <code className="font-bold text-slate-900">P = 9,81 × Q × H × η</code>
            </p>
            <button
              type="button"
              onClick={() => applyStage(1)}
              className="min-h-[36px] px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
            >
              Ulangi Posisi Awal
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
