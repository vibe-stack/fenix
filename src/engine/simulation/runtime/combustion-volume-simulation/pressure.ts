import type { VolumeResolution } from '../../common/volumeResolution'
import { createStaticBuffer, createStorageBuffer, voxelCountFor } from './buffers'
import type { PressureLevel } from './types'
import {
  createClearResources,
  createPressureSmoothResources,
  createResidualResources,
} from './resources'

export function createPressureLevel(
  device: GPUDevice,
  label: string,
  resolution: VolumeResolution,
  clearPipeline: GPUComputePipeline,
  residualPipeline: GPUComputePipeline,
  pressureSmoothPipeline: GPUComputePipeline,
): PressureLevel {
  const voxelCount = voxelCountFor(resolution)
  const volumeInfoBuffer = createStaticBuffer(
    device,
    `${label}-volume-info`,
    new Uint32Array([resolution.width, resolution.height, resolution.depth, voxelCount]),
  )
  const divergence = createStorageBuffer(device, `${label}-divergence`, voxelCount * 4)
  const pressureA = createStorageBuffer(device, `${label}-pressure-a`, voxelCount * 4)
  const pressureB = createStorageBuffer(device, `${label}-pressure-b`, voxelCount * 4)

  return {
    resolution,
    voxelCount,
    volumeInfoBuffer,
    divergence,
    pressureA,
    pressureB,
    clearDivergence: createClearResources(device, clearPipeline, divergence),
    clearPressureA: createClearResources(device, clearPipeline, pressureA),
    clearPressureB: createClearResources(device, clearPipeline, pressureB),
    residualFromA: createResidualResources(
      device,
      residualPipeline,
      volumeInfoBuffer,
      divergence,
      pressureA,
      pressureB,
    ),
    residualFromB: createResidualResources(
      device,
      residualPipeline,
      volumeInfoBuffer,
      divergence,
      pressureB,
      pressureA,
    ),
    smoothAB: createPressureSmoothResources(
      device,
      pressureSmoothPipeline,
      volumeInfoBuffer,
      divergence,
      pressureA,
      pressureB,
    ),
    smoothBA: createPressureSmoothResources(
      device,
      pressureSmoothPipeline,
      volumeInfoBuffer,
      divergence,
      pressureB,
      pressureA,
    ),
  }
}

export function destroyPressureLevel(level: PressureLevel) {
  level.volumeInfoBuffer.destroy()
  level.divergence.destroy()
  level.pressureA.destroy()
  level.pressureB.destroy()
}
