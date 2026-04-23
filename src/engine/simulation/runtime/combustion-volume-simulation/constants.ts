import type { VolumeResolution } from '../../common/volumeResolution'

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
  resolution: VolumeResolution,
): PressureIterationSchedule {
  const voxelCount = resolution.width * resolution.height * resolution.depth

  if (voxelCount >= 4_000_000) {
    return { finePre: 1, finePost: 1, midPre: 1, midPost: 0, coarse: 2 }
  }

  if (voxelCount >= 1_800_000) {
    return { finePre: 2, finePost: 2, midPre: 2, midPost: 1, coarse: 6 }
  }

  return { finePre: 2, finePost: 3, midPre: 2, midPost: 3, coarse: 10 }
}

export const GPU_BUFFER_UNIFORM = 0x0040
export const GPU_BUFFER_STORAGE = 0x0080
export const GPU_BUFFER_COPY_SRC = 0x0004
export const GPU_BUFFER_COPY_DST = 0x0008
