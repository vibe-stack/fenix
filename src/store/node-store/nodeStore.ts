import { proxy } from 'valtio'
import {
  defaultNewFilePresetId,
  getNewFilePreset,
  type NewFilePreset,
} from '../../editor/presets/newFilePresets'
import type {
  EmitterNodeProps,
  ScalarEmitterNodeProps,
  VelocityEmitterNodeProps,
  IgniterEmitterNodeProps,
  CombustionNodeProps,
  AdvectionNodeProps,
  LightNodeProps,
  RenderOutputNodeProps,
} from '../../engine/graph/schema/nodeProps'
import type { EmitterSource } from '../../engine/simulation/emitters/emitterSource'

export interface EmitterInstance {
  id: string
  label: string
  props: EmitterNodeProps
}

export interface LightInstance {
  id: string
  label: string
  props: LightNodeProps
}

export interface NodeStoreState {
  selectedId: string | null
  emitters: EmitterInstance[]
  lights: LightInstance[]
  combustion: CombustionNodeProps
  advection: AdvectionNodeProps
  renderOutput: RenderOutputNodeProps
}

/** Convert store props → GPU EmitterSource for upload. */
export function emitterPropsToSource(props: EmitterNodeProps): EmitterSource {
  if (props.kind === 'scalar') {
    return {
      kind: 'scalar',
      position: [props.positionX, props.positionY, props.positionZ],
      radius: props.radius,
      startTime: props.startTime,
      duration: props.duration,
      densityRate: props.densityRate,
      heatRate: props.heatRate,
      fuelRate: props.fuelRate,
      noiseScale: props.noiseScale,
      noiseMix: props.noiseMix,
      seed: props.seed,
    }
  }
  if (props.kind === 'velocity') {
    return {
      kind: 'velocity',
      position: [props.positionX, props.positionY, props.positionZ],
      radius: props.radius,
      startTime: props.startTime,
      duration: props.duration,
      mode: props.mode,
      speed: props.speed,
      direction: [props.directionX, props.directionY, props.directionZ],
      falloff: props.falloff,
      seed: props.seed,
    }
  }
  return {
    kind: 'igniter',
    position: [props.positionX, props.positionY, props.positionZ],
    radius: props.radius,
    startTime: props.startTime,
    duration: props.duration,
    intensity: props.intensity,
    seed: props.seed,
  }
}

function emittersFromPreset(preset: NewFilePreset): EmitterInstance[] {
  return preset.emitters.map((e, i) => ({ id: `emitter-${i}`, label: e.label, props: e.props }))
}

function lightsFromPreset(preset: NewFilePreset): LightInstance[] {
  return preset.lights.map((l, i) => ({ id: `light-${i}`, label: l.label, props: { ...l.props } }))
}

const defaultPreset = getNewFilePreset(defaultNewFilePresetId)

export const nodeStore = proxy<NodeStoreState>({
  selectedId: null,
  emitters: emittersFromPreset(defaultPreset),
  lights: lightsFromPreset(defaultPreset),
  combustion: {
    burnRateMin: 4.2,
    burnRateMax: 8.6,
    heatEmissionMin: 2.1,
    heatEmissionMax: 3.25,
    baseCoolingRate: 0.018,
    heightCoolingRate: 0.052,
    smokeYieldMin: 0.16,
    smokeYieldMax: 0.58,
    reactionDecayHot: 0.68,
    reactionDecayCool: 0.22,
  },
  advection: { mode: 'maccormack' },
  renderOutput: {
    displayMode: 'temperature',
    stepCount: 400,
    scatteringForward: 0.32,
    scatteringBack: -0.18,
    ...defaultPreset.renderOutput,
  },
})

let emitterCounter = nodeStore.emitters.length
let lightCounter = nodeStore.lights.length

export function loadEmitterPreset(preset: NewFilePreset) {
  nodeStore.selectedId = null
  nodeStore.emitters = emittersFromPreset(preset)
  emitterCounter = nodeStore.emitters.length
}

export function loadLightPreset(preset: NewFilePreset) {
  nodeStore.selectedId = null
  nodeStore.lights = lightsFromPreset(preset)
  lightCounter = nodeStore.lights.length
}

function defaultScalarProps(): ScalarEmitterNodeProps {
  return {
    positionX: 0.5, positionY: 0.1, positionZ: 0.5,
    radius: 0.06,
    startTime: 0,
    duration: 9999,
    densityRate: 2,
    heatRate: 4,
    fuelRate: 3,
    noiseScale: 8,
    noiseMix: 0.4,
    seed: Math.floor(Math.random() * 65536),
  }
}

function defaultVelocityProps(): VelocityEmitterNodeProps {
  return {
    positionX: 0.5, positionY: 0.1, positionZ: 0.5,
    radius: 0.08,
    startTime: 0,
    duration: 0.3,
    mode: 'radial',
    speed: 30,
    directionX: 0, directionY: 1, directionZ: 0,
    falloff: 0.5,
    seed: Math.floor(Math.random() * 65536),
  }
}

function defaultIgniterProps(): IgniterEmitterNodeProps {
  return {
    positionX: 0.5, positionY: 0.1, positionZ: 0.5,
    radius: 0.05,
    startTime: 0,
    duration: 0.1,
    intensity: 0.8,
    seed: Math.floor(Math.random() * 65536),
  }
}

export function addScalarEmitter(label = 'Scalar Emitter'): string {
  const id = `emitter-${emitterCounter++}`
  nodeStore.emitters.push({ id, label, props: { kind: 'scalar', ...defaultScalarProps() } })
  return id
}

export function addVelocityEmitter(label = 'Velocity Emitter'): string {
  const id = `emitter-${emitterCounter++}`
  nodeStore.emitters.push({ id, label, props: { kind: 'velocity', ...defaultVelocityProps() } })
  return id
}

export function addIgniterEmitter(label = 'Igniter'): string {
  const id = `emitter-${emitterCounter++}`
  nodeStore.emitters.push({ id, label, props: { kind: 'igniter', ...defaultIgniterProps() } })
  return id
}

export function addLight(label = 'Light'): string {
  const id = `light-${lightCounter++}`
  nodeStore.lights.push({
    id,
    label,
    props: {
      lightType: 'directional',
      dirX: -0.34, dirY: 0.88, dirZ: 0.31,
      posX: 0.5, posY: 0.4, posZ: 0.5,
      intensity: 1.2,
      colorR: 1, colorG: 0.94, colorB: 0.88,
    },
  })
  return id
}

export function removeEmitter(id: string) {
  const idx = nodeStore.emitters.findIndex((e) => e.id === id)
  if (idx !== -1) nodeStore.emitters.splice(idx, 1)
  if (nodeStore.selectedId === id) nodeStore.selectedId = null
}

export function removeLight(id: string) {
  const idx = nodeStore.lights.findIndex((l) => l.id === id)
  if (idx !== -1) nodeStore.lights.splice(idx, 1)
  if (nodeStore.selectedId === id) nodeStore.selectedId = null
}

export type SelectedKind =
  | { kind: 'emitter'; instance: EmitterInstance }
  | { kind: 'light'; instance: LightInstance }
  | { kind: 'combustion' }
  | { kind: 'advection' }
  | { kind: 'render-output' }
  | null

export function resolveSelected(store: NodeStoreState): SelectedKind {
  const id = store.selectedId
  if (!id) return null
  if (id === 'combustion') return { kind: 'combustion' }
  if (id === 'advection') return { kind: 'advection' }
  if (id === 'render-output') return { kind: 'render-output' }
  const emitter = store.emitters.find((e) => e.id === id)
  if (emitter) return { kind: 'emitter', instance: emitter }
  const light = store.lights.find((l) => l.id === id)
  if (light) return { kind: 'light', instance: light }
  return null
}
