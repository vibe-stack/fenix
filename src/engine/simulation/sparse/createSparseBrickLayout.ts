import type { VolumeResolution } from '../common/volumeResolution'

export interface SparseBrickLayout {
  brickSize: number
  brickCountX: number
  brickCountY: number
  brickCountZ: number
  brickCount: number
}

export function createSparseBrickLayout(
  resolution: VolumeResolution,
  brickSize = 8,
): SparseBrickLayout {
  const brickCountX = Math.ceil(resolution.width / brickSize)
  const brickCountY = Math.ceil(resolution.height / brickSize)
  const brickCountZ = Math.ceil(resolution.depth / brickSize)

  return {
    brickSize,
    brickCountX,
    brickCountY,
    brickCountZ,
    brickCount: brickCountX * brickCountY * brickCountZ,
  }
}

export function packSparseBrickLayout(layout: SparseBrickLayout) {
  return new Uint32Array([
    layout.brickCountX,
    layout.brickCountY,
    layout.brickCountZ,
    layout.brickCount,
    layout.brickSize,
    0,
    0,
    0,
  ])
}
