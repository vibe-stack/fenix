import { volumeVoxelCount } from '../common/volumeResolution'
import type { VolumeResolution } from '../common/volumeResolution'

export interface DenseVolumeDomain extends VolumeResolution {
  readonly voxelCount: number
  index(x: number, y: number, z: number): number
  clampX(value: number): number
  clampY(value: number): number
  clampZ(value: number): number
  isBoundaryCell(x: number, y: number, z: number): boolean
}

export function createDenseVolumeDomain(
  resolution: VolumeResolution,
): DenseVolumeDomain {
  const clampAxis = (value: number, limit: number) =>
    Math.max(0, Math.min(limit - 1, value | 0))

  return {
    ...resolution,
    voxelCount: volumeVoxelCount(resolution),
    index(x, y, z) {
      return x + resolution.width * (y + resolution.height * z)
    },
    clampX(value) {
      return clampAxis(value, resolution.width)
    },
    clampY(value) {
      return clampAxis(value, resolution.height)
    },
    clampZ(value) {
      return clampAxis(value, resolution.depth)
    },
    isBoundaryCell(x, y, z) {
      return (
        x === 0 ||
        y === 0 ||
        z === 0 ||
        x === resolution.width - 1 ||
        y === resolution.height - 1 ||
        z === resolution.depth - 1
      )
    },
  }
}
