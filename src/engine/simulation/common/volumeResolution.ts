export interface VolumeResolution {
  width: number
  height: number
  depth: number
}

export function createVolumeResolution(
  width: number,
  height: number,
  depth: number,
): VolumeResolution {
  return { width, height, depth }
}

export function volumeVoxelCount({ width, height, depth }: VolumeResolution) {
  return width * height * depth
}
