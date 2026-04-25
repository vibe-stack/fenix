import { proxy } from 'valtio'
import type { ExplosionSource } from '../../engine/simulation/runtime/passes/explosionSources'
import {
  defaultNewFilePresetId,
  getNewFilePreset,
  type NewFilePreset,
} from '../../editor/presets/newFilePresets'
import type { EmitterNodeProps, CombustionNodeProps, AdvectionNodeProps, LightNodeProps, RenderOutputNodeProps } from '../../engine/graph/schema/nodeProps'

export type NodeType = 'emitter' | 'combustion' | 'advection' | 'light' | 'render-output'

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

function emitterFromSource(source: ExplosionSource, index: number, label: string): EmitterInstance {
  return {
    id: `emitter-${index}`,
    label,
    props: {
      positionX: source.position[0],
      positionY: source.position[1],
      positionZ: source.position[2],
      radius: source.radius,
      startTime: source.startTime,
      smokeLeadTime: source.smokeLeadTime,
      blastDuration: source.blastDuration,
      plumeDuration: source.plumeDuration,
      densityYield: source.densityYield,
      heatYield: source.heatYield,
      fuelYield: source.fuelYield,
      reactionYield: source.reactionYield,
      radialImpulse: source.radialImpulse,
      liftImpulse: source.liftImpulse,
      liftDirX: source.liftDirection[0],
      liftDirY: source.liftDirection[1],
      liftDirZ: source.liftDirection[2],
      turbulence: source.turbulence,
      crumbleStrength: source.crumbleStrength,
      implosionStrength: source.implosionStrength ?? 0,
      heatPatchiness: source.heatPatchiness,
      patchScale: source.patchScale,
      coreHeat: source.coreHeat,
      coreLift: source.coreLift,
      expansionRate: source.expansionRate ?? 1,
      sustain: source.sustain ?? 0,
      mushroomStrength: source.mushroomStrength ?? 1,
      smokeEntrainment: source.smokeEntrainment ?? 1,
      seed: source.seed,
    },
  }
}

function lightFromPreset(light: NewFilePreset['lights'][number], index: number): LightInstance {
  return {
    id: `light-${index}`,
    label: light.label,
    props: { ...light.props },
  }
}

function emittersFromPreset(preset: NewFilePreset): EmitterInstance[] {
  return preset.emitters.map((emitter, index) =>
    emitterFromSource(emitter.source, index, emitter.label),
  )
}

function lightsFromPreset(preset: NewFilePreset): LightInstance[] {
  return preset.lights.map((light, index) => lightFromPreset(light, index))
}

const defaultPreset = getNewFilePreset(defaultNewFilePresetId)
const defaultRenderOutput = {
  displayMode: 'temperature' as const,
  stepCount: 400,
  scatteringForward: 0.32,
  scatteringBack: -0.18,
}

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

  advection: {
    mode: 'maccormack',
  },

  renderOutput: {
    ...defaultRenderOutput,
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

export function addEmitter(label: string): string {
  const id = `emitter-${emitterCounter++}`
  nodeStore.emitters.push({
    id,
    label,
    props: {
      positionX: 0.5, positionY: 0.3, positionZ: 0.5,
      radius: 0.06,
      startTime: 0,
      smokeLeadTime: 0.4,
      blastDuration: 0.3,
      plumeDuration: 3.0,
      densityYield: 6,
      heatYield: 8,
      fuelYield: 6,
      reactionYield: 3,
      radialImpulse: 30,
      liftImpulse: 12,
      liftDirX: 0, liftDirY: 1, liftDirZ: 0,
      turbulence: 4,
      crumbleStrength: 6,
      implosionStrength: 0,
      heatPatchiness: 0.6,
      patchScale: 8,
      coreHeat: 0.3,
      coreLift: 8,
      expansionRate: 1,
      sustain: 0,
      mushroomStrength: 1,
      smokeEntrainment: 1,
      seed: Math.floor(Math.random() * 65536),
    },
  })
  return id
}

export function addLight(label: string): string {
  const id = `light-${lightCounter++}`
  nodeStore.lights.push({
    id,
    label,
    props: {
      lightType: 'directional',
      dirX: -0.34,
      dirY: 0.88,
      dirZ: 0.31,
      posX: 0.5,
      posY: 0.4,
      posZ: 0.5,
      intensity: 1.2,
      colorR: 1,
      colorG: 0.94,
      colorB: 0.88,
    },
  })
  return id
}

export function removeEmitter(id: string) {
  const idx = nodeStore.emitters.findIndex((e) => e.id === id)
  if (idx !== -1) {
    nodeStore.emitters.splice(idx, 1)
  }
  if (nodeStore.selectedId === id) {
    nodeStore.selectedId = null
  }
}

export function removeLight(id: string) {
  const idx = nodeStore.lights.findIndex((light) => light.id === id)
  if (idx !== -1) {
    nodeStore.lights.splice(idx, 1)
  }
  if (nodeStore.selectedId === id) {
    nodeStore.selectedId = null
  }
}

// Helpers for working with selected node
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
  const instance = store.emitters.find((e) => e.id === id)
  if (instance) return { kind: 'emitter', instance }
  const light = store.lights.find((entry) => entry.id === id)
  if (light) return { kind: 'light', instance: light }
  return null
}
