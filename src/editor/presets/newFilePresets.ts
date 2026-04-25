import type { SimulationRuntimeParams } from '../../engine/simulation/runtime/combustion-volume-simulation/types'
import {
  cinematicExplosionSources,
  type ExplosionSource,
} from '../../engine/simulation/runtime/passes/explosionSources'

export type NewFilePresetId = 'blank' | 'single-explosion' | 'campfire' | 'large-explosion'

export interface PresetEmitter {
  label: string
  source: ExplosionSource
}

export interface NewFilePreset {
  id: NewFilePresetId
  label: string
  description: string
  emitters: readonly PresetEmitter[]
  runtimeParams: SimulationRuntimeParams
}

const neutralRuntimeParams: SimulationRuntimeParams = {
  wind: [0, 0, 0],
  windStrength: 0,
  buoyancy: 3.6,
  vorticityStrength: 2.15,
}

const singleExplosionSource: ExplosionSource = {
  position: [0.5, 0.11, 0.5],
  radius: 0.118,
  startTime: 0,
  smokeLeadTime: 0.04,
  blastDuration: 0.24,
  plumeDuration: 8.5,
  densityYield: 0.7,
  heatYield: 28,
  fuelYield: 6.8,
  reactionYield: 3.8,
  radialImpulse: 122,
  liftDirection: [0, 1, 0],
  liftImpulse: 22,
  heatPatchiness: 0.9,
  patchScale: 52,
  coreHeat: 6,
  coreLift: 18,
  turbulence: 10,
  crumbleStrength: 8,
  implosionStrength: 8,
  expansionRate: 1.08,
  sustain: 0.18,
  mushroomStrength: 1.05,
  seed: 401,
}

const campfireSource: ExplosionSource = {
  position: [0.5, 0.065, 0.5],
  radius: 0.055,
  startTime: 0,
  smokeLeadTime: 0,
  blastDuration: 8,
  plumeDuration: 20,
  densityYield: 0.75,
  heatYield: 5.8,
  fuelYield: 6.4,
  reactionYield: 1.2,
  radialImpulse: 3,
  liftDirection: [0, 1, 0],
  liftImpulse: 6,
  heatPatchiness: 0.38,
  patchScale: 16,
  coreHeat: 2.6,
  coreLift: 3.6,
  turbulence: 2.8,
  crumbleStrength: 1.4,
  implosionStrength: 0,
  expansionRate: 0.35,
  sustain: 1.2,
  mushroomStrength: 0.2,
  seed: 607,
}

function cloneRuntimeParams(params: SimulationRuntimeParams): SimulationRuntimeParams {
  return {
    ...params,
    wind: [params.wind[0], params.wind[1], params.wind[2]],
  }
}

function createEmitter(label: string, source: ExplosionSource): PresetEmitter {
  return { label, source }
}

export const newFilePresets: readonly NewFilePreset[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Open an empty graph with neutral fluid motion.',
    emitters: [],
    runtimeParams: cloneRuntimeParams(neutralRuntimeParams),
  },
  {
    id: 'single-explosion',
    label: 'Single Explosion',
    description: 'One upward shroom blast with no wind bias.',
    emitters: [createEmitter('Shroom Core', singleExplosionSource)],
    runtimeParams: {
      wind: [0, 0, 0],
      windStrength: 0,
      buoyancy: 4.4,
      vorticityStrength: 2.6,
    },
  },
  {
    id: 'campfire',
    label: 'Campfire',
    description: 'A sustained flame-and-smoke source with gentle lift.',
    emitters: [createEmitter('Fire Column', campfireSource)],
    runtimeParams: {
      wind: [0, 0, 0],
      windStrength: 0,
      buoyancy: 2.4,
      vorticityStrength: 0.85,
    },
  },
  {
    id: 'large-explosion',
    label: 'Large Explosion',
    description: 'The original multi-source cinematic detonation graph.',
    emitters: cinematicExplosionSources.map((source, index) =>
      createEmitter(index === 0 ? 'Primary Detonation' : `Source ${index + 1}`, source),
    ),
    runtimeParams: cloneRuntimeParams(neutralRuntimeParams),
  },
]

export const defaultNewFilePresetId: NewFilePresetId = 'single-explosion'

export function getNewFilePreset(id: NewFilePresetId): NewFilePreset {
  const preset = newFilePresets.find((entry) => entry.id === id)

  if (!preset) {
    throw new Error(`Unknown new-file preset: ${id}`)
  }

  return preset
}

export function clonePresetRuntimeParams(preset: NewFilePreset): SimulationRuntimeParams {
  return cloneRuntimeParams(preset.runtimeParams)
}