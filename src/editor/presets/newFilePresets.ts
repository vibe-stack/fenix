import type { SimulationRuntimeParams } from '../../engine/simulation/runtime/combustion-volume-simulation/types'
import type { LightNodeProps, RenderOutputNodeProps } from '../../engine/graph/schema/nodeProps'
import {
  cinematicExplosionSources,
  type ExplosionSource,
} from '../../engine/simulation/runtime/passes/explosionSources'

export type NewFilePresetId = 'blank' | 'single-explosion' | 'campfire' | 'large-explosion'

export interface PresetEmitter {
  label: string
  source: ExplosionSource
}

export interface PresetLight {
  label: string
  props: LightNodeProps
}

export interface NewFilePreset {
  id: NewFilePresetId
  label: string
  description: string
  emitters: readonly PresetEmitter[]
  lights: readonly PresetLight[]
  runtimeParams: SimulationRuntimeParams
  renderOutput: Partial<RenderOutputNodeProps>
}

const defaultRenderOutput: Partial<RenderOutputNodeProps> = {
  stepCount: 400,
  scatteringForward: 0.32,
  scatteringBack: -0.18,
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
  densityYield: 1.05,
  heatYield: 34,
  fuelYield: 8.8,
  reactionYield: 4.6,
  radialImpulse: 156,
  liftDirection: [0, 1, 0],
  liftImpulse: 84,
  heatPatchiness: 0.9,
  patchScale: 52,
  coreHeat: 8,
  coreLift: 62,
  turbulence: 12,
  crumbleStrength: 8,
  implosionStrength: 14,
  expansionRate: 1.18,
  sustain: 0.72,
  mushroomStrength: 3.8,
  smokeEntrainment: 4.8,
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
  smokeEntrainment: 0.6,
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

function createLight(label: string, props: LightNodeProps): PresetLight {
  return { label, props }
}

function tuneLargeExplosionSource(source: ExplosionSource, index: number): ExplosionSource {
  const hotSource = source.heatYield > 5
  const primary = index === 0

  return {
    ...source,
    implosionStrength: primary ? 12 : hotSource ? 6 : 2,
    expansionRate: primary ? 1.22 : hotSource ? 1.08 : 0.86,
    sustain: primary ? 0.52 : hotSource ? 0.28 : 0.08,
    mushroomStrength: primary ? 2.4 : hotSource ? 1.45 : 0.6,
    smokeEntrainment: primary ? 2.8 : hotSource ? 1.6 : 0.55,
  }
}

const defaultLights: readonly PresetLight[] = [
  createLight('Key Light', {
    lightType: 'directional',
    dirX: -0.34,
    dirY: 0.88,
    dirZ: 0.31,
    posX: 0.5,
    posY: 0.8,
    posZ: 0.5,
    intensity: 1.25,
    colorR: 1.0,
    colorG: 0.95,
    colorB: 0.88,
  }),
]

const singleExplosionLights: readonly PresetLight[] = [
  createLight('Key Light', {
    lightType: 'directional',
    dirX: -0.28,
    dirY: 0.92,
    dirZ: 0.24,
    posX: 0.5,
    posY: 0.85,
    posZ: 0.5,
    intensity: 1.5,
    colorR: 1.0,
    colorG: 0.93,
    colorB: 0.84,
  }),
  createLight('Blast Fill', {
    lightType: 'point',
    dirX: 0,
    dirY: -1,
    dirZ: 0,
    posX: 0.62,
    posY: 0.36,
    posZ: 0.38,
    intensity: 0.7,
    colorR: 1.0,
    colorG: 0.68,
    colorB: 0.42,
  }),
]

const campfireLights: readonly PresetLight[] = [
  createLight('Warm Key', {
    lightType: 'directional',
    dirX: -0.24,
    dirY: 0.95,
    dirZ: 0.18,
    posX: 0.5,
    posY: 0.82,
    posZ: 0.5,
    intensity: 1.35,
    colorR: 1.0,
    colorG: 0.84,
    colorB: 0.62,
  }),
  createLight('Fire Bounce', {
    lightType: 'point',
    dirX: 0,
    dirY: -1,
    dirZ: 0,
    posX: 0.52,
    posY: 0.12,
    posZ: 0.52,
    intensity: 0.42,
    colorR: 0.7,
    colorG: 0.46,
    colorB: 0.26,
  }),
]

const largeExplosionLights: readonly PresetLight[] = [
  createLight('Blast Key', {
    lightType: 'directional',
    dirX: -0.22,
    dirY: 0.96,
    dirZ: 0.16,
    posX: 0.5,
    posY: 0.9,
    posZ: 0.5,
    intensity: 1.8,
    colorR: 1.0,
    colorG: 0.92,
    colorB: 0.82,
  }),
  createLight('Blast Core Light', {
    lightType: 'point',
    dirX: 0,
    dirY: -1,
    dirZ: 0,
    posX: 0.56,
    posY: 0.22,
    posZ: 0.44,
    intensity: 0.96,
    colorR: 1.0,
    colorG: 0.64,
    colorB: 0.34,
  }),
  createLight('Cool Rim', {
    lightType: 'directional',
    dirX: 0.72,
    dirY: 0.34,
    dirZ: -0.6,
    posX: 0.5,
    posY: 0.75,
    posZ: 0.5,
    intensity: 0.42,
    colorR: 0.56,
    colorG: 0.72,
    colorB: 1.0,
  }),
]

export const newFilePresets: readonly NewFilePreset[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Open an empty graph with neutral fluid motion.',
    emitters: [],
    lights: defaultLights,
    runtimeParams: cloneRuntimeParams(neutralRuntimeParams),
    renderOutput: defaultRenderOutput,
  },
  {
    id: 'single-explosion',
    label: 'Single Explosion',
    description: 'One upward shroom blast with no wind bias.',
    emitters: [createEmitter('Shroom Core', singleExplosionSource)],
    lights: singleExplosionLights,
    runtimeParams: {
      wind: [0, 0, 0],
      windStrength: 0,
      buoyancy: 8.5,
      vorticityStrength: 6.5,
    },
    renderOutput: defaultRenderOutput,
  },
  {
    id: 'campfire',
    label: 'Campfire',
    description: 'A sustained flame-and-smoke source with gentle lift.',
    emitters: [createEmitter('Fire Column', campfireSource)],
    lights: campfireLights,
    runtimeParams: {
      wind: [0, 0, 0],
      windStrength: 0,
      buoyancy: 2.4,
      vorticityStrength: 0.85,
    },
    renderOutput: {
      stepCount: 320,
      scatteringForward: 0.28,
      scatteringBack: -0.12,
    },
  },
  {
    id: 'large-explosion',
    label: 'Large Explosion',
    description: 'The original multi-source cinematic detonation graph.',
    emitters: cinematicExplosionSources.map((source, index) =>
      createEmitter(index === 0 ? 'Primary Detonation' : `Source ${index + 1}`, tuneLargeExplosionSource(source, index)),
    ),
    lights: largeExplosionLights,
    runtimeParams: {
      wind: [0.08, 0, -0.04],
      windStrength: 0.55,
      buoyancy: 7.2,
      vorticityStrength: 5.8,
    },
    renderOutput: {
      stepCount: 440,
      scatteringForward: 0.36,
      scatteringBack: -0.2,
    },
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