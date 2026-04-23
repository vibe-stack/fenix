import type { CombustionVolumeRenderBuffers } from '../../common/combustionVolumeRenderBuffers'
import type { VolumeResolution } from '../../common/volumeResolution'

export interface CombustionVolumeSimulation {
  readonly resolution: VolumeResolution
  step(encoder: GPUCommandEncoder, elapsedSeconds: number, stepSeconds: number): void
  getRenderBuffers(): CombustionVolumeRenderBuffers
  dispose(): void
}

export interface ComputeResources {
  bindGroup: GPUBindGroup
  pipeline: GPUComputePipeline
}

export interface PressureLevel {
  resolution: VolumeResolution
  voxelCount: number
  volumeInfoBuffer: GPUBuffer
  divergence: GPUBuffer
  pressureA: GPUBuffer
  pressureB: GPUBuffer
  clearDivergence: ComputeResources
  clearPressureA: ComputeResources
  clearPressureB: ComputeResources
  residualFromA: ComputeResources
  residualFromB: ComputeResources
  smoothAB: ComputeResources
  smoothBA: ComputeResources
}

export type ScalarFieldBuffers = CombustionVolumeRenderBuffers
export type PressureBufferId = 'a' | 'b'
