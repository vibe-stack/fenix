import type { CombustionVolumeRenderBuffers } from '../../common/combustionVolumeRenderBuffers'
import type { VolumeResolution } from '../../common/volumeResolution'

export type ScalarAdvectionMode = 'semi-lagrangian' | 'maccormack'

export interface SimulationRuntimeParams {
  wind: readonly [number, number, number]
  windStrength: number
  buoyancy: number
  vorticityStrength: number
  worldSize: number
}

import type { EmitterSource } from '../../emitters/emitterSource'

export interface CombustionVolumeSimulation {
  readonly resolution: VolumeResolution
  step(encoder: GPUCommandEncoder, elapsedSeconds: number, stepSeconds: number): void
  getRenderBuffers(): CombustionVolumeRenderBuffers
  getDebugBuffers(): SimulationDebugBuffers
  getScalarAdvectionMode(): ScalarAdvectionMode
  setScalarAdvectionMode(mode: ScalarAdvectionMode): void
  getRuntimeParams(): SimulationRuntimeParams
  setRuntimeParams(params: Partial<SimulationRuntimeParams>): void
  updateSources(sources: readonly EmitterSource[]): void
  reset(): void
  dispose(): void
}

export interface SimulationDebugBuffers extends CombustionVolumeRenderBuffers {
  velocityMagnitude: GPUBuffer
  divergence: GPUBuffer
  pressure: GPUBuffer
  vorticityMagnitude: GPUBuffer
  confinementForceMagnitude: GPUBuffer
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
