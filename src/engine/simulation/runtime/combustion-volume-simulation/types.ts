import type { CombustionVolumeRenderBuffers } from '../../common/combustionVolumeRenderBuffers'
import type { VolumeResolution } from '../../common/volumeResolution'

export type ScalarAdvectionMode = 'semi-lagrangian' | 'maccormack'

export interface SimulationQualitySettings {
  pressureInterval: number
  vorticityInterval: number
  finePreIterations: number
  finePostIterations: number
  midPreIterations: number
  midPostIterations: number
  coarseIterations: number
}

export const defaultSimulationQualitySettings: SimulationQualitySettings = {
  pressureInterval: 1,
  vorticityInterval: 1,
  finePreIterations: 2,
  finePostIterations: 3,
  midPreIterations: 2,
  midPostIterations: 3,
  coarseIterations: 10,
}

function clampInteger(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)))
}

export function createSimulationQualitySettings(
  overrides: Partial<SimulationQualitySettings> = {},
): SimulationQualitySettings {
  const merged = { ...defaultSimulationQualitySettings, ...overrides }

  return {
    pressureInterval: clampInteger(merged.pressureInterval, 1, 16),
    vorticityInterval: clampInteger(merged.vorticityInterval, 1, 16),
    finePreIterations: clampInteger(merged.finePreIterations, 0, 32),
    finePostIterations: clampInteger(merged.finePostIterations, 0, 32),
    midPreIterations: clampInteger(merged.midPreIterations, 0, 32),
    midPostIterations: clampInteger(merged.midPostIterations, 0, 32),
    coarseIterations: clampInteger(merged.coarseIterations, 0, 64),
  }
}

export interface SimulationRuntimeParams {
  wind: readonly [number, number, number]
  windStrength: number
  gravity: readonly [number, number, number]
  gravityStrength: number
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
  getQualitySettings(): SimulationQualitySettings
  setQualitySettings(settings: Partial<SimulationQualitySettings>): void
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
