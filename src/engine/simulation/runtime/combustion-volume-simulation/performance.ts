import type { VolumeResolution } from '../../common/volumeResolution'
import type { ScalarAdvectionMode, SimulationQualitySettings } from './types'

export interface SimulationPerformanceSchedule {
  scalarAdvectionMode: ScalarAdvectionMode
  pressureInterval: number
  vorticityInterval: number
}

export function createSimulationPerformanceSchedule(
  _resolution: VolumeResolution,
  qualitySettings: SimulationQualitySettings,
  requestedScalarMode: ScalarAdvectionMode,
): SimulationPerformanceSchedule {
  return {
    scalarAdvectionMode: requestedScalarMode,
    pressureInterval: qualitySettings.pressureInterval,
    vorticityInterval: qualitySettings.vorticityInterval,
  }
}
