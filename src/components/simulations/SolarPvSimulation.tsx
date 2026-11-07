import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles } from 'lucide-react';
import {
  calculateSolarPvOutput,
  evaluateSimulationMission,
} from '../../utils/edgeEngine';

interface SolarPvSimulationProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onMissionComplete?: () => void;
}

export const SolarPvSimulation: React.FC<SolarPvSimulationProps> = ({
  isPlaying,
  onTogglePlay,
  onMissionComplete,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [panelCapacityWp, setPanelCapacityWp] = useState<number>(1200);
  const [peakSunHours, setPeakSunHours] = useState<number>(5.0);
  const [batteryCapacityKWh, setBatteryCapacityKWh] = useState<number>(5.0);

  const solarOut = calculateSolarPvOutput({
    panelCapacityWp,
    peakSunHours,
    batteryCapacityKWh,
  });

  const mission = evaluateSimulationMission('solar', {
    dailyHarvestKWh: solarOut.dailyHarvestKWh,
    autonomyHours: solarOut.autonomyHours,
  });

  React.useEffect(() => {
    if (mission.completed && onMissionComplete) {
      onMissionComplete();
    }
  }, [mission.completed, onMissionComplete]);

  const applySolarStage = (stage: number) => {
    setActiveStage(stage);
    if (stage === 1) {
      setPanelCapacityWp(1200);
      setPeakSunHours(5.0);
      setBatteryCapacityKWh(5.0);
    } else if (stage === 2) {
      setPanelCapacityWp(800);
      setPeakSunHours(3.2);
      setBatteryCapacityKWh(3.0);
    } else {
      setPanelCapacityWp(1800);
      setPeakSunHours(5.4);
      setBatteryCapacityKWh(7.5);
    }
  };

  const batteryFillPct = Math.min(100, Math.round((solarOut.autonomyHours / 32) * 100));

  return (
    <section
      aria-label="Simulasi Interaktif PLTS Off-Grid dan Baterai LiFePO4"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e6e2d8]">
        <div>
          <p className="text-xs font-medium text-amber-700">
            Laboratorium Virtual Hidup Elektrifikasi Kepulauan · Teknik Energi Surya
          </p>
          <h3 className="text-base font-bold text-stone-900 mt-0.5">
            Simulator PLTS Off-Grid Atap Sekolah &amp; Siklus Baterai LiFePO4
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Tahapan Eksperimen PLTS"
            className="flex items-center gap-1 p-1 bg-[#f4f1ea] rounded-lg"
          >
            <button
              type="button"
              onClick={() => applySolarStage(1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 1
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 1: Siang Cerah
            </button>
            <button
              type="button"
              onClick={() => applySolarStage(2)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 2
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 2: Cuaca Berawan
            </button>
            <button
              type="button"
              onClick={() => applySolarStage(3)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 3
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 3: Kemandirian 24 Jam (Target Misi)
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
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
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
                mission.completed ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 blueprint-stage text-slate-100 rounded-xl p-5 flex flex-col justify-between border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono pb-3 border-b border-slate-800">
            <span>Arsitektur Array Fotovoltaik → MPPT → Bank LiFePO4 48V</span>
            <span className="tabular-nums text-amber-400">
              ● {solarOut.statusLabel}
            </span>
          </div>

          <svg
            viewBox="0 0 600 220"
            className="w-full h-52 my-3"
            role="img"
            aria-label="Diagram alur energi surya menuju MPPT, baterai LiFePO4, dan laboratorium komputer sekolah"
          >
            <circle cx="65" cy="42" r="22" fill="#f59e0b" opacity="0.9" />
            <line
              x1="88"
              y1="56"
              x2="145"
              y2="92"
              stroke="#fde047"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.8s linear infinite' : 'none',
              }}
            />
            <line
              x1="74"
              y1="66"
              x2="125"
              y2="108"
              stroke="#fde047"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.8s linear infinite' : 'none',
              }}
            />
            <text x="65" y="85" textAnchor="middle" fill="#fde047" fontSize="10" fontFamily="monospace">
              PSH {peakSunHours} jam
            </text>

            <polygon
              points="115,115 215,75 230,95 130,135"
              fill="#0284c7"
              stroke="#7dd3fc"
              strokeWidth="2"
            />
            <text x="172" y="155" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontFamily="monospace" fontWeight="bold">
              Panel {panelCapacityWp} Wp
            </text>

            <line
              x1="222"
              y1="105"
              x2="290"
              y2="105"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeDasharray="8 5"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.65s linear infinite' : 'none',
              }}
            />

            <rect x="290" y="78" width="76" height="54" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" rx="5" />
            <text x="328" y="102" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              MPPT 97%
            </text>
            <text x="328" y="118" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
              48V DC Bus
            </text>

            <line
              x1="366"
              y1="105"
              x2="425"
              y2="105"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="8 5"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.75s linear infinite' : 'none',
              }}
            />

            <rect x="425" y="62" width="145" height="92" fill="#0f172a" stroke="#10b981" strokeWidth="2" rx="6" />
            <text x="497" y="84" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontFamily="monospace" fontWeight="bold">
              LiFePO4 ({batteryCapacityKWh} kWh)
            </text>
            <rect x="442" y="96" width="110" height="18" fill="#1e293b" stroke="#334155" rx="3" />
            <rect
              x="444"
              y="98"
              width={Math.max(12, Math.round((batteryFillPct / 100) * 106))}
              height="14"
              fill="#10b981"
              rx="2"
            />
            <text x="497" y="135" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace">
              Otonomi: {solarOut.autonomyHours} Jam ({solarOut.laptopsSupported} Laptop)
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Panen Energi Harian</span>
              <span className="text-base font-mono font-semibold text-amber-400 tabular-nums">
                {solarOut.dailyHarvestKWh} kWh/hr
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Kapasitas Pakai (DoD 85%)</span>
              <span className="text-base font-mono font-semibold text-sky-400 tabular-nums">
                {solarOut.usableBatteryKWh} kWh
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Ketahanan Tanpa Surya</span>
              <span className="text-base font-mono font-semibold text-emerald-400 tabular-nums">
                {solarOut.autonomyHours} Jam ({solarOut.laptopsSupported} unit)
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 surface-warm-recessed p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-wp">Kapasitas Array Panel Surya (Wp)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {panelCapacityWp} Wp
                </span>
              </div>
              <input
                id="slider-wp"
                type="range"
                min={400}
                max={2800}
                step={100}
                value={panelCapacityWp}
                onChange={(e) => setPanelCapacityWp(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-psh">Lama Penyinaran Efektif (Peak Sun Hours)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {peakSunHours} jam/hari
                </span>
              </div>
              <input
                id="slider-psh"
                type="range"
                min={2.5}
                max={6.4}
                step={0.2}
                value={peakSunHours}
                onChange={(e) => setPeakSunHours(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-batt">Kapasitas Bank Baterai LiFePO4</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {batteryCapacityKWh} kWh
                </span>
              </div>
              <input
                id="slider-batt"
                type="range"
                min={2.0}
                max={12.0}
                step={0.5}
                value={batteryCapacityKWh}
                onChange={(e) => setBatteryCapacityKWh(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2ddd2] flex items-center justify-between gap-3">
            <p className="text-xs text-stone-600">
              Rumus: <code className="font-mono text-stone-900">E = Wp × PSH × 0,82</code>
            </p>
            <button
              type="button"
              onClick={() => applySolarStage(1)}
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
