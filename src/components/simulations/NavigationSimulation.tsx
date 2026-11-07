import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles } from 'lucide-react';
import { evaluateSimulationMission } from '../../utils/edgeEngine';

interface NavigationSimulationProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onMissionComplete?: () => void;
}

export const NavigationSimulation: React.FC<NavigationSimulationProps> = ({
  isPlaying,
  onTogglePlay,
  onMissionComplete,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [boatSpeedKnots, setBoatSpeedKnots] = useState<number>(9);
  const [currentSpeedKnots, setCurrentSpeedKnots] = useState<number>(3.5);
  const [straitWidthNm, setStraitWidthNm] = useState<number>(12);

  const navRatio = Math.min(0.95, currentSpeedKnots / Math.max(1, boatSpeedKnots));
  const correctionDeg = Number(((Math.asin(navRatio) * 180) / Math.PI).toFixed(1));
  const effectiveSpeedKnots = Number(
    Math.sqrt(Math.max(0.5, boatSpeedKnots ** 2 - currentSpeedKnots ** 2)).toFixed(2)
  );
  const crossingTimeMinutes = Math.round((straitWidthNm / effectiveSpeedKnots) * 60);

  const mission = evaluateSimulationMission('navigation', {
    effectiveSpeedKnots,
    crossingTimeMinutes,
  });

  React.useEffect(() => {
    if (mission.completed && onMissionComplete) {
      onMissionComplete();
    }
  }, [mission.completed, onMissionComplete]);

  const applyNavStage = (stage: number) => {
    setActiveStage(stage);
    if (stage === 1) {
      setBoatSpeedKnots(9);
      setCurrentSpeedKnots(3.5);
      setStraitWidthNm(12);
    } else if (stage === 2) {
      setBoatSpeedKnots(8);
      setCurrentSpeedKnots(4.5);
      setStraitWidthNm(16);
    } else {
      setBoatSpeedKnots(12.5);
      setCurrentSpeedKnots(3.0);
      setStraitWidthNm(11);
    }
  };

  return (
    <section
      aria-label="Simulasi Vektor Navigasi Selat Kepulauan"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e6e2d8]">
        <div>
          <p className="text-xs font-medium text-sky-800">
            Laboratorium Virtual Hidup Trigonometri Pelayaran · Matematika Maritim
          </p>
          <h3 className="text-base font-bold text-stone-900 mt-0.5">
            Kalkulator Vektor Haluan &amp; Koreksi Arus Selat
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Tahapan Eksperimen Navigasi"
            className="flex items-center gap-1 p-1 bg-[#f4f1ea] rounded-lg"
          >
            <button
              type="button"
              onClick={() => applyNavStage(1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 1
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 1: Selat Standar
            </button>
            <button
              type="button"
              onClick={() => applyNavStage(2)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 2
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 2: Arus Monsun Kuat
            </button>
            <button
              type="button"
              onClick={() => applyNavStage(3)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 3
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 3: Lintas Cepat (Target Misi)
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
            <span>Segitiga Vektor Kecepatan Kapal vs Arus Lintas Selat</span>
            <span className="tabular-nums text-sky-400">
              ● Koreksi α: {correctionDeg}° Melawan Arus
            </span>
          </div>

          <svg
            viewBox="0 0 600 200"
            className="w-full h-48 my-3"
            role="img"
            aria-label="Animasi segitiga vektor kecepatan kapal melawan arus samping"
          >
            <line
              x1="70"
              y1="150"
              x2="510"
              y2="150"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeDasharray="10 6"
              style={{
                animation: isPlaying ? 'hydroDashFlow 1.1s linear infinite' : 'none',
              }}
            />
            <line x1="70" y1="150" x2="510" y2="55" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 4" />
            <line
              x1="510"
              y1="55"
              x2="510"
              y2="150"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.9s linear infinite' : 'none',
              }}
            />
            <circle cx="70" cy="150" r="6" fill="#38bdf8" />
            <circle cx="510" cy="150" r="6" fill="#10b981" />

            <g
              className="sim-animate-sail"
              style={{
                animation: isPlaying
                  ? `vesselSail ${Math.max(2.2, Number((14 / Math.max(2, effectiveSpeedKnots)).toFixed(2)))}s linear infinite`
                  : 'none',
              }}
            >
              <polygon points="75,152 105,152 99,159 81,159" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.2" />
              <polygon points="90,132 90,150 103,148" fill="#38bdf8" />
              <polygon points="88,136 88,150 78,148" fill="#bae6fd" />
            </g>

            <text x="70" y="175" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
              Dermaga Asal (A)
            </text>
            <text x="415" y="175" fill="#10b981" fontSize="11" fontFamily="monospace">
              Dermaga Tujuan (B) · v_efektif={effectiveSpeedKnots} kt
            </text>
            <text x="275" y="88" fill="#38bdf8" fontSize="11" fontFamily="monospace">
              Haluan Koreksi α = {correctionDeg}° ({boatSpeedKnots} kt)
            </text>
            <text x="520" y="108" fill="#fbbf24" fontSize="11" fontFamily="monospace">
              Arus {currentSpeedKnots} kt
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Sudut Koreksi Haluan</span>
              <span className="text-base font-mono font-semibold text-sky-400 tabular-nums">
                {correctionDeg}°
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Kecepatan Lintas Efektif</span>
              <span className="text-base font-mono font-semibold text-emerald-400 tabular-nums">
                {effectiveSpeedKnots} knot
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Estimasi Waktu Tempuh</span>
              <span className="text-base font-mono font-semibold text-white tabular-nums">
                {crossingTimeMinutes} menit
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 surface-warm-recessed p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-boat">Kecepatan Kapal Terhadap Air (v_kapal)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {boatSpeedKnots} knot
                </span>
              </div>
              <input
                id="slider-boat"
                type="range"
                min={5}
                max={16}
                step={0.5}
                value={boatSpeedKnots}
                onChange={(e) => setBoatSpeedKnots(Number(e.target.value))}
                className="w-full accent-sky-700 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-current">Kecepatan Arus Samping Selat (v_arus)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {currentSpeedKnots} knot
                </span>
              </div>
              <input
                id="slider-current"
                type="range"
                min={0.5}
                max={4.5}
                step={0.5}
                value={currentSpeedKnots}
                onChange={(e) => setCurrentSpeedKnots(Number(e.target.value))}
                className="w-full accent-sky-700 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-strait">Lebar Selat Antarpulau (Jarak d)</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {straitWidthNm} Mil Laut (NM)
                </span>
              </div>
              <input
                id="slider-strait"
                type="range"
                min={4}
                max={25}
                step={1}
                value={straitWidthNm}
                onChange={(e) => setStraitWidthNm(Number(e.target.value))}
                className="w-full accent-sky-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2ddd2] flex items-center justify-between gap-3">
            <p className="text-xs text-stone-600">
              Rumus: <code className="font-mono text-stone-900">α = arcsin(v_arus / v_kapal)</code>
            </p>
            <button
              type="button"
              onClick={() => applyNavStage(1)}
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
