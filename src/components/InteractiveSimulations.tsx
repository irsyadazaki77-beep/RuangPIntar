import React, { useState, useCallback } from 'react';
import type { SimulationType } from '../utils/edgeEngine';
import { MicrohydroSimulation } from './simulations/MicrohydroSimulation';
import { MangroveSimulation } from './simulations/MangroveSimulation';
import { NavigationSimulation } from './simulations/NavigationSimulation';
import { SolarPvSimulation } from './simulations/SolarPvSimulation';
import { AgroforestrySimulation } from './simulations/AgroforestrySimulation';
import { DesalinationSimulation } from './simulations/DesalinationSimulation';

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

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleComplete = useCallback(() => {
    if (onMissionComplete) {
      onMissionComplete(simulationType);
    }
  }, [onMissionComplete, simulationType]);

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
