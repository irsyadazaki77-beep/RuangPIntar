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
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e6e2d8]">
        <div>
          <p className="text-xs font-medium text-sky-800">
            Laboratorium Virtual Hidup Tanpa Kuota · Fisika Energi Terbarukan
          </p>
          <h3 className="text-base font-bold text-stone-900 mt-0.5">
            Simulator Hidrodinamika Turbin Mikrohidro (PLTMH)
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Tahapan Eksperimen Terpandu Mikrohidro"
            className="flex items-center gap-1 p-1 bg-[#f4f1ea] rounded-lg"
          >
            <button
              type="button"
              onClick={() => applyStage(1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 1
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 1: Aliran Normal
            </button>
            <button
              type="button"
              onClick={() => applyStage(2)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 2
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 2: Musim Kemarau
            </button>
            <button
              type="button"
              onClick={() => applyStage(3)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 3
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 3: Optimasi Desa (Target Misi)
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
              <Sparkles className="w-4 h-4 text-sky-700 shrink-0" />
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

            <path
              d="M 400 145 Q 442 115 482 145"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.7s linear infinite' : 'none',
              }}
            />

            <rect x="478" y="128" width="94" height="60" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" rx="4" />
            <text x="525" y="145" textAnchor="middle" fill="#ecfdf5" fontSize="10" fontWeight="bold">
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
                  rx="1.5"
                  fill={isLit ? '#fde047' : '#065f46'}
                  stroke="#047857"
                  strokeWidth="0.8"
                />
              );
            })}
            <text x="525" y="179" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontFamily="monospace">
              {hydroOut.housesPowered} Rumah Menyala
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Daya Hidrolik Teoritis</span>
              <span className="text-base font-mono font-semibold text-white tabular-nums">
                {hydroOut.theoreticalPowerKW} kW
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Daya Listrik Bersih</span>
              <span className="text-base font-mono font-semibold text-sky-400 tabular-nums">
                {hydroOut.netElectricalPowerKW} kW
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Kapasitas Hunian (450 VA)</span>
              <span className="text-base font-mono font-semibold text-emerald-400 tabular-nums">
                {hydroOut.housesPowered} Rumah ({hydroOut.dailyEnergyKWh} kWh/hr)
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 surface-warm-recessed p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-head">Tinggi Jatuh Efektif Air (Head H)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {headMeters} meter
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
                className="w-full accent-sky-700 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-stone-500 font-mono mt-0.5">
                <span>5 m (Sungai Landai)</span>
                <span>60 m (Jeram Curam)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-flow">Debit Aliran Sungai (Flow Q)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {flowLiters} Liter/detik ({(flowLiters / 1000).toFixed(3)} m³/s)
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
                className="w-full accent-sky-700 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-stone-500 font-mono mt-0.5">
                <span>15 L/s (Kemarau)</span>
                <span>150 L/s (Musim Hujan)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-eta">Efisiensi Total Turbin &amp; Generator (η)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {efficiencyPct}%
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
                className="w-full accent-sky-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2ddd2] flex items-center justify-between gap-3">
            <p className="text-xs text-stone-600 leading-relaxed">
              Persamaan: <code className="font-mono text-stone-900">P = 9,81 × Q × H × η</code>
            </p>
            <button
              type="button"
              onClick={() => applyStage(1)}
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
