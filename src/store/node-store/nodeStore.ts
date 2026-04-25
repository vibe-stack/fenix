import { proxy } from 'valtio'
import { cinematicExplosionSources } from '../../engine/simulation/runtime/passes/explosionSources'
import type { EmitterNodeProps, CombustionNodeProps, AdvectionNodeProps, RenderOutputNodeProps } from '../../engine/graph/schema/nodeProps'

export type NodeType = 'emitter' | 'combustion' | 'advection' | 'render-output'

export interface EmitterInstance {
  id: string
  label: string
  props: EmitterNodeProps
}

export interface NodeStoreState {
  selectedId: string | null
  emitters: EmitterInstance[]
  combustion: CombustionNodeProps
  advection: AdvectionNodeProps
  renderOutput: RenderOutputNodeProps
}

function emitterFromSource(source: typeof cinematicExplosionSources[number], index: number): EmitterInstance {
  return {
    id: `emitter-${index}`,
    label: index === 0 ? 'Primary Detonation' : `Source ${index + 1}`,
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
      heatPatchiness: source.heatPatchiness,
      patchScale: source.patchScale,
      coreHeat: source.coreHeat,
      coreLift: source.coreLift,
      seed: source.seed,
    },
  }
}

export const nodeStore = proxy<NodeStoreState>({
  selectedId: null,

  emitters: cinematicExplosionSources.map((s, i) => emitterFromSource(s, i)),

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
    displayMode: 'temperature',
    stepCount: 400,
    lightDirX: -0.34,
    lightDirY: 0.88,
    lightDirZ: 0.31,
    scatteringForward: 0.32,
    scatteringBack: -0.18,
  },
})

let emitterCounter = nodeStore.emitters.length

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
      heatPatchiness: 0.6,
      patchScale: 8,
      coreHeat: 0.3,
      coreLift: 8,
      seed: Math.floor(Math.random() * 65536),
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

// Helpers for working with selected node
export type SelectedKind =
  | { kind: 'emitter'; instance: EmitterInstance }
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
  return null
}
