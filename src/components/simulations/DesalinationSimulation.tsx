import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles } from 'lucide-react';
import {
  calculateSolarDesalinationOutput,
  evaluateSimulationMission,
} from '../../utils/edgeEngine';

interface DesalinationSimulationProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onMissionComplete?: () => void;
}

export const DesalinationSimulation: React.FC<DesalinationSimulationProps> = ({
  isPlaying,
  onTogglePlay,
  onMissionComplete,
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [collectorAreaSqm, setCollectorAreaSqm] = useState<number>(16);
  const [solarRadiationKWh, setSolarRadiationKWh] = useState<number>(5.2);
  const [biocharStages, setBiocharStages] = useState<number>(2);

  const desalOut = calculateSolarDesalinationOutput({
    collectorAreaSqm,
    solarRadiationKWhPerSqm: solarRadiationKWh,
    biocharFilterStages: biocharStages,
  });

  const mission = evaluateSimulationMission('desalination', {
    dailyFreshwaterLiters: desalOut.dailyFreshwaterLiters,
    outputTdsPpm: desalOut.outputTdsPpm,
  });

  React.useEffect(() => {
    if (mission.completed && onMissionComplete) {
      onMissionComplete();
    }
  }, [mission.completed, onMissionComplete]);

  const applyDesalStage = (stage: number) => {
    setActiveStage(stage);
    if (stage === 1) {
      setCollectorAreaSqm(12);
      setSolarRadiationKWh(4.8);
      setBiocharStages(1);
    } else if (stage === 2) {
      setCollectorAreaSqm(18);
      setSolarRadiationKWh(5.2);
      setBiocharStages(2);
    } else {
      setCollectorAreaSqm(26);
      setSolarRadiationKWh(5.8);
      setBiocharStages(4);
    }
  };

  return (
    <section
      aria-label="Simulasi Interaktif Distilasi Surya Termal dan Filtrasi Biochar"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-[#e6e2d8]">
        <div>
          <p className="text-xs font-medium text-sky-800">
            Laboratorium Virtual Hidup Termodinamika Air Bersih · Fisika Terapan Pesisir
          </p>
          <h3 className="text-base font-bold text-stone-900 mt-0.5">
            Simulator Distilasi Surya (Solar Still) &amp; Filtrasi Biochar Kelapa
          </h3>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Tahapan Eksperimen Desalinasi"
            className="flex items-center gap-1 p-1 bg-[#f4f1ea] rounded-lg"
          >
            <button
              type="button"
              onClick={() => applyDesalStage(1)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 1
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 1: Bak Tunggal
            </button>
            <button
              type="button"
              onClick={() => applyDesalStage(2)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 2
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 2: Sekolah Pesisir
            </button>
            <button
              type="button"
              onClick={() => applyDesalStage(3)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeStage === 3
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tahap 3: Sentra Air Murni (Target Misi)
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
        className={`rounded-xl p-4 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          mission.completed
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/30'
            : 'surface-warm-recessed border-[#e6e2d8] text-stone-800'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-sky-100 text-sky-800 rounded-md">
              🎯 PANDUAN CEPAT / MISI BELAJAR
            </span>
            <span className="text-[11px] text-stone-500 font-medium">Langkah Praktik</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {mission.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-sky-700 shrink-0" />
            )}
            <span>
              {mission.missionTitle} {mission.completed ? '— 🎉 MISI TUNTAS (+150 XP)!' : ''}
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">{mission.targetDescription}</p>
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
            <span>Siklus Evaporasi-Kondensasi Kalor Laten &amp; Kolom Biochar</span>
            <span className="tabular-nums text-emerald-400">
              ● {desalOut.waterQualityStatus}
            </span>
          </div>

          <svg
            viewBox="0 0 600 220"
            className="w-full h-52 my-3"
            role="img"
            aria-label="Diagram bak distilasi surya memisahkan uap air tawar dari air laut dan kolom filter arang kelapa"
          >
            <polygon
              points="65,165 65,105 335,55 335,165"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <rect x="68" y="138" width="264" height="25" fill="#0369a1" opacity="0.85" />
            <rect x="68" y="156" width="264" height="9" fill="#020617" />
            <text x="200" y="153" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontFamily="monospace">
              Air Payau + Absorber Biochar ({collectorAreaSqm} m²)
            </text>

            {[0, 1, 2, 3].map((vIdx) => (
              <line
                key={vIdx}
                x1={115 + vIdx * 55}
                y1="135"
                x2={115 + vIdx * 55}
                y2="88"
                stroke="#7dd3fc"
                strokeWidth="2"
                strokeDasharray="4 4"
                style={{
                  animation: isPlaying ? 'hydroDashFlow 0.85s linear infinite' : 'none',
                }}
              />
            ))}

            <line
              x1="335"
              y1="125"
              x2="435"
              y2="125"
              stroke="#34d399"
              strokeWidth="3"
              strokeDasharray="7 4"
              style={{
                animation: isPlaying ? 'hydroDashFlow 0.7s linear infinite' : 'none',
              }}
            />

            <rect x="435" y="65" width="125" height="105" fill="#064e3b" stroke="#10b981" strokeWidth="2" rx="6" />
            <text x="497" y="92" textAnchor="middle" fill="#ecfdf5" fontSize="11" fontFamily="monospace" fontWeight="bold">
              {desalOut.dailyFreshwaterLiters} L/hari
            </text>
            <text x="497" y="114" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontFamily="monospace">
              Filter {biocharStages} Tingkat
            </text>
            <text x="497" y="134" textAnchor="middle" fill="#fde047" fontSize="10" fontFamily="monospace" fontWeight="bold">
              TDS: {desalOut.outputTdsPpm} ppm
            </text>
            <text x="497" y="154" textAnchor="middle" fill="#ecfdf5" fontSize="9" fontFamily="monospace">
              ({desalOut.studentsDrinkingQuota} Siswa Terpenuhi)
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Air Minum Dihasilkan</span>
              <span className="text-base font-mono font-semibold text-sky-400 tabular-nums">
                {desalOut.dailyFreshwaterLiters} L/hr
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Penolakan Garam NaCl</span>
              <span className="text-base font-mono font-semibold text-emerald-400 tabular-nums">
                {desalOut.salinityReductionPct}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Kemurnian Akhir (TDS)</span>
              <span className="text-base font-mono font-semibold text-white tabular-nums">
                {desalOut.outputTdsPpm} ppm ({desalOut.studentsDrinkingQuota} siswa)
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 surface-warm-recessed p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-collector">Luas Kolektor Basin Surya</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {collectorAreaSqm} m²{' '}
                  <span className="text-[11px] font-normal text-sky-700">
                    ({collectorAreaSqm >= 24 ? '☀️ Sangat Luas (Banyak Air)' : collectorAreaSqm >= 12 ? '☀️ Sedang' : '💧 Mini'})
                  </span>
                </span>
              </div>
              <input
                id="slider-collector"
                type="range"
                min={4}
                max={36}
                step={2}
                value={collectorAreaSqm}
                onChange={(e) => setCollectorAreaSqm(Number(e.target.value))}
                className="w-full accent-sky-700 cursor-pointer h-2 bg-stone-200 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-rad">Intensitas Panas Mentari Harian</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {solarRadiationKWh} kWh/m²/hari{' '}
                  <span className="text-[11px] font-normal text-sky-700">
                    ({solarRadiationKWh >= 5.5 ? '🔥 Sangat Terik (Uap Cepat)' : solarRadiationKWh >= 4.5 ? '☀️ Terang Biasa' : '☁️ Berawan'})
                  </span>
                </span>
              </div>
              <input
                id="slider-rad"
                type="range"
                min={3.4}
                max={6.4}
                step={0.2}
                value={solarRadiationKWh}
                onChange={(e) => setSolarRadiationKWh(Number(e.target.value))}
                className="w-full accent-sky-700 cursor-pointer h-2 bg-stone-200 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                <label htmlFor="slider-biochar">Jumlah Tingkat Filter Biochar Kelapa</label>
                <span className="font-mono font-semibold text-stone-900 tabular-nums">
                  {biocharStages} tingkat{' '}
                  <span className="text-[11px] font-normal text-emerald-700">
                    ({biocharStages >= 3 ? '🥥 Air Sangat Murni & Higienis' : '🥥 Penyaringan Standar'})
                  </span>
                </span>
              </div>
              <input
                id="slider-biochar"
                type="range"
                min={1}
                max={4}
                step={1}
                value={biocharStages}
                onChange={(e) => setBiocharStages(Number(e.target.value))}
                className="w-full accent-sky-700 cursor-pointer h-2 bg-stone-200 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#e2ddd2] flex items-center justify-between gap-3">
            <p className="text-xs text-stone-600">
              Kalor laten penguapan memisahkan H₂O murni dari garam laut.
            </p>
            <button
              type="button"
              onClick={() => applyDesalStage(2)}
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
