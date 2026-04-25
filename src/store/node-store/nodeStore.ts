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
