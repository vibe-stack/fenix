import type { VolumeResolution } from '../../common/volumeResolution'
import type { ScalarAdvectionMode } from './types'

export interface SimulationPerformanceSchedule {
  scalarAdvectionMode: ScalarAdvectionMode
  pressureInterval: number
  vorticityInterval: number
  activeBrickInterval: number
}

export function createSimulationPerformanceSchedule(
  resolution: VolumeResolution,
  requestedScalarMode: ScalarAdvectionMode,
): SimulationPerformanceSchedule {
  const voxelCount = resolution.width * resolution.height * resolution.depth

  if (voxelCount >= 4_000_000) {
    return {
      scalarAdvectionMode: 'semi-lagrangian',
      pressureInterval: 4,
      vorticityInterval: 4,
      activeBrickInterval: 1,
    }
  }

  if (voxelCount >= 1_800_000) {
    return {
      scalarAdvectionMode: requestedScalarMode,
      pressureInterval: 2,
      vorticityInterval: 3,
      activeBrickInterval: 1,
    }
  }

  return {
    scalarAdvectionMode: requestedScalarMode,
    pressureInterval: 1,
    vorticityInterval: 1,
    activeBrickInterval: 1,
  }
}
