import type { SimulationQualitySettings } from './types'

export const WORKGROUP_SIZE = 4
export const TILE_SIZE = WORKGROUP_SIZE + 2

export interface PressureIterationSchedule {
  finePre: number
  finePost: number
  midPre: number
  midPost: number
  coarse: number
}

export function pressureIterationScheduleFor(
  qualitySettings: SimulationQualitySettings,
): PressureIterationSchedule {
  return {
    finePre: qualitySettings.finePreIterations,
    finePost: qualitySettings.finePostIterations,
    midPre: qualitySettings.midPreIterations,
    midPost: qualitySettings.midPostIterations,
    coarse: qualitySettings.coarseIterations,
  }
}

export const GPU_BUFFER_UNIFORM = 0x0040
export const GPU_BUFFER_STORAGE = 0x0080
export const GPU_BUFFER_COPY_SRC = 0x0004
export const GPU_BUFFER_COPY_DST = 0x0008
