import type { VolumeResolution } from '../../simulation/common/volumeResolution'

export interface VolumeWorldBounds {
  center: {
    x: number
    y: number
    z: number
  }
  halfExtents: {
    x: number
    y: number
    z: number
  }
}

export function getVolumeWorldBounds(resolution: VolumeResolution): VolumeWorldBounds {
  const volumeScale = 13.5
  const maxHorizontalResolution = Math.max(resolution.width, resolution.depth)
  const halfExtents = {
    x: 2.05 * volumeScale * (resolution.width / maxHorizontalResolution),
    y: 2.05 * volumeScale * (resolution.height / maxHorizontalResolution),
    z: 2.05 * volumeScale * (resolution.depth / maxHorizontalResolution),
  }

  return {
    center: {
      x: 0,
      y: halfExtents.y - 0.25,
      z: 0,
    },
    halfExtents,
  }
}
