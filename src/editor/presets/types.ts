import type { SimulationRuntimeParams } from '../../engine/simulation/runtime/combustion-volume-simulation/types'
import type { EmitterNodeProps, LightNodeProps, RenderOutputNodeProps } from '../../engine/graph/schema/nodeProps'

export interface PresetEmitter {
  label: string
  props: EmitterNodeProps
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

export function createScalarEmitter(label: string, props: import('../../engine/graph/schema/nodeProps').ScalarEmitterNodeProps): PresetEmitter {
  return { label, props: { kind: 'scalar', ...props } }
}

export function createVelocityEmitter(label: string, props: import('../../engine/graph/schema/nodeProps').VelocityEmitterNodeProps): PresetEmitter {
  return { label, props: { kind: 'velocity', ...props } }
}

export function createIgniterEmitter(label: string, props: import('../../engine/graph/schema/nodeProps').IgniterEmitterNodeProps): PresetEmitter {
  return { label, props: { kind: 'igniter', ...props } }
}

export function createLight(label: string, props: LightNodeProps): PresetLight {
  return { label, props }
}

export function cloneRuntimeParams(params: SimulationRuntimeParams): SimulationRuntimeParams {
  return {
    ...params,
    wind: [params.wind[0], params.wind[1], params.wind[2]],
    gravity: [params.gravity[0], params.gravity[1], params.gravity[2]],
  }
}
