import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Cpu } from 'lucide-react';
import type { SimulationType } from '../utils/edgeEngine';

const MicrohydroSimulation = lazy(() =>
  import('./simulations/MicrohydroSimulation').then((m) => ({ default: m.MicrohydroSimulation }))
);
const MangroveSimulation = lazy(() =>
  import('./simulations/MangroveSimulation').then((m) => ({ default: m.MangroveSimulation }))
);
const NavigationSimulation = lazy(() =>
  import('./simulations/NavigationSimulation').then((m) => ({ default: m.NavigationSimulation }))
);
const SolarPvSimulation = lazy(() =>
  import('./simulations/SolarPvSimulation').then((m) => ({ default: m.SolarPvSimulation }))
);
const AgroforestrySimulation = lazy(() =>
  import('./simulations/AgroforestrySimulation').then((m) => ({ default: m.AgroforestrySimulation }))
);
const DesalinationSimulation = lazy(() =>
  import('./simulations/DesalinationSimulation').then((m) => ({ default: m.DesalinationSimulation }))
);

interface Props {
  simulationType: SimulationType;
  moduleTitle: string;
  onMissionComplete?: (simulationType: SimulationType) => void;
}

const SimulationSkeleton: React.FC = () => (
  <div className="blueprint-stage p-8 rounded-2xl border border-slate-800 space-y-6 animate-pulse text-cyan-300">
    <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-cyan-400 animate-spin" />
        </div>
        <div className="space-y-1">
          <div className="h-4 w-48 bg-cyan-900/60 rounded" />
          <div className="h-3 w-32 bg-slate-800 rounded" />
        </div>
      </div>
      <div className="h-8 w-28 bg-cyan-900/40 rounded-xl" />
    </div>

    <div className="h-64 w-full bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-xs font-mono tracking-wider font-semibold text-cyan-400">
          MEMUAT MODUL LABORATORIUM VIRTUAL 3T...
        </p>
        <p className="text-[11px] font-mono text-slate-500">
          Memisahkan Pecahan Bundle JS (Code-Splitting Active)
        </p>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <div className="h-16 bg-slate-900/60 rounded-xl border border-slate-800" />
      <div className="h-16 bg-slate-900/60 rounded-xl border border-slate-800" />
      <div className="h-16 bg-slate-900/60 rounded-xl border border-slate-800" />
    </div>
  </div>
);

export const InteractiveSimulations: React.FC<Props> = ({
  simulationType,
  onMissionComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleComplete = useCallback(() => {
    if (onMissionComplete) {
      onMissionComplete(simulationType);
    }
  }, [onMissionComplete, simulationType]);

  const renderSimulation = () => {
    switch (simulationType) {
      case 'microhydro':
        return (
          <MicrohydroSimulation
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onMissionComplete={handleComplete}
          />
        );
      case 'mangrove':
        return (
          <MangroveSimulation
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onMissionComplete={handleComplete}
          />
        );
      case 'solar':
        return (
          <SolarPvSimulation
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onMissionComplete={handleComplete}
          />
        );
      case 'agroforestry':
        return (
          <AgroforestrySimulation
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onMissionComplete={handleComplete}
          />
        );
      case 'desalination':
        return (
          <DesalinationSimulation
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onMissionComplete={handleComplete}
          />
        );
      case 'navigation':
      default:
        return (
          <NavigationSimulation
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onMissionComplete={handleComplete}
          />
        );
    }
  };

  return <Suspense fallback={<SimulationSkeleton />}>{renderSimulation()}</Suspense>;
};
