import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles, Award } from 'lucide-react';
import {
  calculateSolarPvOutput,
  evaluateSimulationMission,
} from '../../utils/edgeEngine';
import { playMissionCompleteSound } from '../../utils/soundEffects';

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
  const [panelCapacityWp, setPanelCapacityWp] = useState<number>(1800);
  const [peakSunHours, setPeakSunHours] = useState<number>(5.2);
  const [batteryCapacityKWh, setBatteryCapacityKWh] = useState<number>(7.5);
  const [tiltAngleDeg, setTiltAngleDeg] = useState<number>(14);
  const [surfaceCleanlinessPct, setSurfaceCleanlinessPct] = useState<number>(92);
  const soundPlayedRef = useRef<boolean>(false);

  const solarOut = calculateSolarPvOutput({
    panelCapacityWp,
    peakSunHours,
    batteryCapacityKWh,
  });

  // Calculate photovoltaic angle and optical cleanliness efficiencies (FASE 4)
  const tiltDeviation = Math.abs(tiltAngleDeg - 12);
  const tiltFactor = Math.max(0.65, 1 - (tiltDeviation / 45) * 0.3);
  const cleanlinessFactor = surfaceCleanlinessPct / 100;
  const systemEfficiencyPct = Math.min(95, Math.round(92 * tiltFactor * cleanlinessFactor));
  const effectiveHarvestKWh = Number((solarOut.dailyHarvestKWh * (systemEfficiencyPct / 82)).toFixed(2));

  const missionTargetEfficiency = 85;
  const isMissionSuccess = systemEfficiencyPct >= missionTargetEfficiency && effectiveHarvestKWh >= 6.5;

  const mission = evaluateSimulationMission('solar', {
    dailyHarvestKWh: effectiveHarvestKWh,
    autonomyHours: solarOut.autonomyHours,
  });

  const isCompleted = isMissionSuccess || mission.completed;

  useEffect(() => {
    if (isCompleted) {
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        playMissionCompleteSound();
      }
      if (onMissionComplete) {
        onMissionComplete();
      }
    } else {
      soundPlayedRef.current = false;
    }
  }, [isCompleted, onMissionComplete]);

  const applySolarStage = (stage: number) => {
    setActiveStage(stage);
    if (stage === 1) {
      setPanelCapacityWp(1800);
      setPeakSunHours(5.2);
      setBatteryCapacityKWh(7.5);
      setTiltAngleDeg(14);
      setSurfaceCleanlinessPct(92);
    } else if (stage === 2) {
      setPanelCapacityWp(1000);
      setPeakSunHours(3.5);
      setBatteryCapacityKWh(4.0);
      setTiltAngleDeg(38);
      setSurfaceCleanlinessPct(65);
    } else {
      setPanelCapacityWp(2200);
      setPeakSunHours(5.6);
      setBatteryCapacityKWh(9.0);
      setTiltAngleDeg(12);
      setSurfaceCleanlinessPct(98);
    }
  };

  const batteryFillPct = Math.min(100, Math.round((solarOut.autonomyHours / 32) * 100));

  return (
    <section
      aria-label="Simulasi Interaktif PLTS Off-Grid dan Baterai LiFePO4"
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-200">
        <div>
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <span>☀️</span>
            <span>Laboratorium Virtual Tanpa Kuota · Teknik Energi Surya Nusantara</span>
          </p>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
            Simulator PLTS Off-Grid Atap Sekolah &amp; Siklus Baterai LiFePO4
          </h3>
        </div>

        {/* Quick Guide / Learning Mission Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            role="group"
            aria-label="Pilihan Tahap Belajar PLTS"
            className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl"
          >
            <button
              type="button"
              onClick={() => applySolarStage(1)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                activeStage === 1
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahap 1: Siang Cerah
            </button>
            <button
              type="button"
              onClick={() => applySolarStage(2)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                activeStage === 2
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahap 2: Cuaca Berawan
            </button>
            <button
              type="button"
              onClick={() => applySolarStage(3)}
              className={`min-h-[40px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                activeStage === 3
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahap 3: Misi 24 Jam (+150 XP)
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

      {/* Prominent Learning Mission Box (Scaffolded Learning - FASE 4) */}
      <div
        className={`rounded-2xl p-5 border transition-all space-y-3.5 shadow-2xs ${
          isCompleted
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-300 text-emerald-950'
            : 'bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white border-amber-200 text-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1 shadow-2xs">
                <span>🎯</span>
                <span>Misi Sains Hari Ini</span>
              </span>
              <span className="text-slate-900 font-bold">Misi Efisiensi &amp; Panen PLTS 24 Jam</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              🎯 <strong>Misi:</strong> Sesuaikan sudut panel fotovoltaik dan kebersihan permukaan kaca agar efisiensi mencapai minimal 85% serta panen surya mencapai minimal 6,5 kWh/hari!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right text-xs">
              <div className="font-bold text-slate-900">
                Efisiensi: {systemEfficiencyPct}% · Panen: {effectiveHarvestKWh} kWh/hr
              </div>
              <div className="text-[11px] text-slate-500 font-semibold">
                Target: ≥85% Efisiensi &amp; ≥6,5 kWh
              </div>
            </div>
            <div className="w-24 sm:w-28 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
              <motion.div
                initial={false}
                animate={{ width: `${Math.min(100, Math.round((systemEfficiencyPct / 85) * 100))}%` }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={`h-full rounded-full ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Animated Success Badge & 2-Sentence Scientific Explanation */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2 pt-2 border-t border-emerald-200/80"
            >
              <div className="flex items-center gap-2 p-2.5 bg-emerald-100/90 border border-emerald-300/90 rounded-xl text-emerald-950 font-bold text-xs sm:text-sm shadow-2xs">
                <span className="text-lg">🎉</span>
                <span>Misi Berhasil! Listrik Desa Menyala Stabil!</span>
              </div>
              <div className="p-3 bg-white/95 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <span>💡</span>
                  <span>Penjelasan Ilmiah: Mengapa Kombinasi Parameter Ini Menghasilkan Daya Optimal?</span>
                </div>
                <p>
                  Sudut kemiringan panel fotovoltaik yang tepat memastikan sinar foton matahari datang tegak lurus (90°) terhadap permukaan sel surya, memaksimalkan absorpsi foton dan eksitasi elektron silikon. Dipadukan dengan permukaan kaca yang bersih bebas debu dan kerak air, refleksi dan hamburan optik terminimalisir sehingga efisiensi konversi sistem fotovoltaik mencapai performa puncak di atas 85%.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

        {/* Right: Sliders with Large Intuitive Human Labels */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xs">
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-wp">Kapasitas Array Panel Surya (Wp)</label>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px]">
                  {panelCapacityWp} Wp · {panelCapacityWp >= 1600 ? '☀️ Banyak Panel (Luas)' : panelCapacityWp >= 1000 ? '🌤️ Sedang' : '⛅ Minimal'}
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
                className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>400 Wp (Kecil)</span>
                <span>2800 Wp (Atap Penuh)</span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-psh">Penyinaran Mentari Efektif (PSH)</label>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 text-[11px]">
                  {peakSunHours} jam · {peakSunHours >= 5.0 ? '☀️ Terik Mentari Tropis' : peakSunHours >= 3.8 ? '🌤️ Berawan Tipis' : '🌧️ Mendung/Hujan'}
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
                className="w-full accent-orange-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>2.5 jam (Mendung)</span>
                <span>6.4 jam (Sangat Terik)</span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-batt">Kapasitas Bank Baterai LiFePO4</label>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px]">
                  {batteryCapacityKWh} kWh · {batteryCapacityKWh >= 6.0 ? '🔋 Cadangan 24 Jam Penuh' : '🪫 Cadangan Terbatas'}
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
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>2.0 kWh (3 Modul)</span>
                <span>12.0 kWh (Rak Penuh)</span>
              </div>
            </div>

            {/* FASE 4: Sudut Kemiringan Panel Fotovoltaik */}
            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-tilt">Sudut Kemiringan Panel (° Derajat)</label>
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${tiltDeviation <= 5 ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-amber-100 text-amber-900'}`}>
                  {tiltAngleDeg}° · {tiltDeviation <= 5 ? '📐 Sudut Optimal Khatulistiwa' : '⚠️ Refleksi Meningkat'}
                </span>
              </div>
              <input
                id="slider-tilt"
                type="range"
                min={0}
                max={45}
                step={1}
                value={tiltAngleDeg}
                onChange={(e) => setTiltAngleDeg(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>0° (Datar)</span>
                <span>12°-15° (Optimal)</span>
                <span>45° (Curam)</span>
              </div>
            </div>

            {/* FASE 4: Kebersihan Permukaan Kaca Sel Surya */}
            <div>
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-800 mb-1.5 gap-1">
                <label htmlFor="slider-clean">Kebersihan Permukaan Kaca Panel</label>
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${surfaceCleanlinessPct >= 85 ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-rose-100 text-rose-900'}`}>
                  {surfaceCleanlinessPct}% · {surfaceCleanlinessPct >= 85 ? '✨ Bersih Bebas Debu' : '🌫️ Tertutup Debu/Kerak'}
                </span>
              </div>
              <input
                id="slider-clean"
                type="range"
                min={50}
                max={100}
                step={2}
                value={surfaceCleanlinessPct}
                onChange={(e) => setSurfaceCleanlinessPct(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                <span>50% (Sangat Berdebu)</span>
                <span>100% (Kristal Bersih)</span>
              </div>
            </div>

            {/* Efficiency Summary Pill */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-semibold">Efisiensi Sistem Nyata:</span>
              <span className={`font-bold ${systemEfficiencyPct >= 85 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {systemEfficiencyPct}% {systemEfficiencyPct >= 85 ? '✓ (Target ≥85% Tercapai)' : '(Target ≥85%)'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Rumus: <code className="font-bold text-slate-900">E = Wp × PSH × η_sistem ({systemEfficiencyPct}%)</code>
            </p>
            <button
              type="button"
              onClick={() => applySolarStage(1)}
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
