import type { SimulationRuntimeParams } from '../../engine/simulation/runtime/combustion-volume-simulation/types'
import type { LightNodeProps, RenderOutputNodeProps } from '../../engine/graph/schema/nodeProps'
import type { ExplosionSource } from '../../engine/simulation/runtime/passes/explosionSources'

export interface PresetEmitter {
  label: string
  source: ExplosionSource
}

export interface PresetLight {
  label: string
  props: LightNodeProps
}

export interface NewFilePreset {
  id: string
  label: string
  description: string
  emitters: readonly PresetEmitter[]
  lights: readonly PresetLight[]
  runtimeParams: SimulationRuntimeParams
  renderOutput: Partial<RenderOutputNodeProps>
}

export function createEmitter(label: string, source: ExplosionSource): PresetEmitter {
  return { label, source }
}

export function createLight(label: string, props: LightNodeProps): PresetLight {
  return { label, props }
}

export function cloneRuntimeParams(params: SimulationRuntimeParams): SimulationRuntimeParams {
  return { ...params, wind: [params.wind[0], params.wind[1], params.wind[2]] }
}
