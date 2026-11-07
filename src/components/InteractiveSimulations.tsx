import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, CheckCircle2, Sparkles } from 'lucide-react';
import {
  calculateMicrohydroOutput,
  calculateMangroveMitigation,
  calculateSolarPvOutput,
  calculateAgroforestryRetention,
  calculateSolarDesalinationOutput,
  evaluateSimulationMission,
  type SimulationType,
} from '../utils/edgeEngine';

interface Props {
  simulationType: SimulationType;
  moduleTitle: string;
  onMissionComplete?: (simulationType: SimulationType) => void;
}

export const InteractiveSimulations: React.FC<Props> = ({
  simulationType,
  onMissionComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeStage, setActiveStage] = useState<number>(1);

  // 1. Micro-hydro state
  const [headMeters, setHeadMeters] = useState<number>(22);
  const [flowLiters, setFlowLiters] = useState<number>(65);
  const [efficiencyPct, setEfficiencyPct] = useState<number>(75);

  // 2. Mangrove state
  const [beltWidth, setBeltWidth] = useState<number>(85);
  const [treeDensity, setTreeDensity] = useState<number>(30);
  const [coastLengthKm, setCoastLengthKm] = useState<number>(1.5);

  // 3. Navigation state
  const [boatSpeedKnots, setBoatSpeedKnots] = useState<number>(9);
  const [currentSpeedKnots, setCurrentSpeedKnots] = useState<number>(3.5);
  const [straitWidthNm, setStraitWidthNm] = useState<number>(12);

  // 4. Solar PV & LiFePO4 state
  const [panelCapacityWp, setPanelCapacityWp] = useState<number>(1200);
  const [peakSunHours, setPeakSunHours] = useState<number>(5.0);
  const [batteryCapacityKWh, setBatteryCapacityKWh] = useState<number>(5.0);

  // 5. Dryland Agroforestry & Spring Catchment state
  const [canopyCoverPct, setCanopyCoverPct] = useState<number>(55);
  const [stoneTerraceCount, setStoneTerraceCount] = useState<number>(10);
  const [rainfallMmPerYr, setRainfallMmPerYr] = useState<number>(950);

  // 6. Solar Thermal Desalination state
  const [collectorAreaSqm, setCollectorAreaSqm] = useState<number>(16);
  const [solarRadiationKWh, setSolarRadiationKWh] = useState<number>(5.2);
  const [biocharStages, setBiocharStages] = useState<number>(2);

  useEffect(() => {
    setActiveStage(1);
  }, [simulationType]);

  const hydroOut = calculateMicrohydroOutput({
    headMeters,
    flowLitersPerSec: flowLiters,
    efficiencyPct,
  });

  const mangroveOut = calculateMangroveMitigation({
    beltWidthMeters: beltWidth,
    treeDensityPer100Sqm: treeDensity,
    coastlineLengthKm: coastLengthKm,
  });

  const solarOut = calculateSolarPvOutput({
    panelCapacityWp,
    peakSunHours,
    batteryCapacityKWh,
  });

  const agroOut = calculateAgroforestryRetention({
    canopyCoverPct,
    stoneTerraceCount,
    rainfallMmPerYr,
  });

  const desalOut = calculateSolarDesalinationOutput({
    collectorAreaSqm,
    solarRadiationKWhPerSqm: solarRadiationKWh,
    biocharFilterStages: biocharStages,
  });

  const navRatio = Math.min(0.95, currentSpeedKnots / Math.max(1, boatSpeedKnots));
  const correctionDeg = Number(((Math.asin(navRatio) * 180) / Math.PI).toFixed(1));
  const effectiveSpeedKnots = Number(
    Math.sqrt(Math.max(0.5, boatSpeedKnots ** 2 - currentSpeedKnots ** 2)).toFixed(2)
  );
  const crossingTimeMinutes = Math.round((straitWidthNm / effectiveSpeedKnots) * 60);

  const mission = evaluateSimulationMission(simulationType, {
    netElectricalPowerKW: hydroOut.netElectricalPowerKW,
    housesPowered: hydroOut.housesPowered,
    waveEnergyReductionPct: mangroveOut.waveEnergyReductionPct,
    annualCarbonSequesteredTons: mangroveOut.annualCarbonSequesteredTons,
    effectiveSpeedKnots,
    crossingTimeMinutes,
    dailyHarvestKWh: solarOut.dailyHarvestKWh,
    autonomyHours: solarOut.autonomyHours,
    infiltrationRatePct: agroOut.infiltrationRatePct,
    springDrySeasonDebitLps: agroOut.springDrySeasonDebitLps,
    dailyFreshwaterLiters: desalOut.dailyFreshwaterLiters,
    outputTdsPpm: desalOut.outputTdsPpm,
  });

  useEffect(() => {
    if (mission.completed && onMissionComplete) {
      onMissionComplete(simulationType);
    }
  }, [mission.completed, simulationType, onMissionComplete]);

  if (simulationType === 'microhydro') {
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
              onClick={() => setIsPlaying((prev) => !prev)}
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
  }

  if (simulationType === 'mangrove') {
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
              onClick={() => setIsPlaying((prev) => !prev)}
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
  }

  if (simulationType === 'solar') {
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
              onClick={() => setIsPlaying((prev) => !prev)}
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
              {/* Sun & Photon Rays */}
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

              {/* Solar Panel Array */}
              <polygon
                points="115,115 215,75 230,95 130,135"
                fill="#0284c7"
                stroke="#7dd3fc"
                strokeWidth="2"
              />
              <text x="172" y="155" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontFamily="monospace" fontWeight="bold">
                Panel {panelCapacityWp} Wp
              </text>

              {/* DC Bus to MPPT */}
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

              {/* MPPT Charge Controller */}
              <rect x="290" y="78" width="76" height="54" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" rx="5" />
              <text x="328" y="102" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                MPPT 97%
              </text>
              <text x="328" y="118" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                48V DC Bus
              </text>

              {/* Line to LiFePO4 Battery Bank */}
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

              {/* LiFePO4 Battery Rack */}
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
  }

  if (simulationType === 'agroforestry') {
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
              onClick={() => setIsPlaying((prev) => !prev)}
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
              {/* Terraced Limestone Hill Slope */}
              <polygon
                points="20,65 180,65 390,155 580,155 580,210 20,210"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* Multi-Strata Trees (Scaled by Canopy Cover) */}
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

              {/* Stone Bund Terraces */}
              <rect x="130" y="60" width="16" height="12" fill="#94a3b8" rx="2" />
              <rect x="215" y="88" width="16" height="12" fill="#94a3b8" rx="2" />
              <rect x="300" y="118" width="16" height="12" fill="#94a3b8" rx="2" />

              {/* Underground Percolation Flow into Karst Aquifer */}
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

              {/* Village Spring Basin */}
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
  }

  if (simulationType === 'desalination') {
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
              onClick={() => setIsPlaying((prev) => !prev)}
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
              {/* Solar Basin Still Structure */}
              <polygon
                points="65,165 65,105 335,55 335,165"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="2"
              />
              {/* Black Biochar Absorber & Brackish Water Layer */}
              <rect x="68" y="138" width="264" height="25" fill="#0369a1" opacity="0.85" />
              <rect x="68" y="156" width="264" height="9" fill="#020617" />
              <text x="200" y="153" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontFamily="monospace">
                Air Payau + Absorber Biochar ({collectorAreaSqm} m²)
              </text>

              {/* Rising Water Vapor */}
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

              {/* Condensed Freshwater Pipe to Biochar Filter Column */}
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

              {/* Biochar Filtration & Remineralization Tank */}
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
                  <label htmlFor="slider-collector">Luas Kolektor Basin Distilasi Surya</label>
                  <span className="font-mono font-semibold text-stone-900 tabular-nums">
                    {collectorAreaSqm} m²
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
                  className="w-full accent-sky-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                  <label htmlFor="slider-rad">Intensitas Radiasi Termal Harian</label>
                  <span className="font-mono font-semibold text-stone-900 tabular-nums">
                    {solarRadiationKWh} kWh/m²/hari
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
                  className="w-full accent-sky-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-stone-700 mb-1.5">
                  <label htmlFor="slider-biochar">Jumlah Tingkat Kolom Filter Biochar Kelapa</label>
                  <span className="font-mono font-semibold text-stone-900 tabular-nums">
                    {biocharStages} tingkat adsorpsi
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
                  className="w-full accent-sky-700 cursor-pointer"
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
  }

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
            onClick={() => setIsPlaying((prev) => !prev)}
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
