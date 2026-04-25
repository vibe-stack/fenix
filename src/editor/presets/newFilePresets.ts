export type { NewFilePreset, PresetEmitter, PresetLight } from './types'

import { blankPreset } from './preset-blank'
import { nuclearDetonationPreset } from './preset-nuclear-detonation'
import { campfirePreset } from './preset-campfire'
import { oilWellFirePreset } from './preset-oil-well-fire'
import { artilleryBurstPreset } from './preset-artillery-burst'
import { steadySmokeCrosswindPreset } from './preset-steady-smoke-crosswind'
import { industrialSmokestacksPreset } from './preset-industrial-smokestacks'
import { smokeGrenadeClusterPreset } from './preset-smoke-grenade-cluster'
import { warehouseFirePreset } from './preset-warehouse-fire'
import { fuelTankExplosionPreset } from './preset-fuel-tank-explosion'
import { gasLineRupturePreset } from './preset-gas-line-rupture'
import { artillerySalvoPreset } from './preset-artillery-salvo'
import { demolitionDustPreset } from './preset-demolition-dust'
import { volcanicEruptionPreset } from './preset-volcanic-eruption'
import type { NewFilePreset } from './types'
import { cloneRuntimeParams } from './types'

export const newFilePresets: readonly NewFilePreset[] = [
  blankPreset,
  campfirePreset,
  steadySmokeCrosswindPreset,
  industrialSmokestacksPreset,
  smokeGrenadeClusterPreset,
  demolitionDustPreset,
  warehouseFirePreset,
  oilWellFirePreset,
  gasLineRupturePreset,
  artilleryBurstPreset,
  artillerySalvoPreset,
  fuelTankExplosionPreset,
  nuclearDetonationPreset,
  volcanicEruptionPreset,
]

export type NewFilePresetId = (typeof newFilePresets)[number]['id']

export const defaultNewFilePresetId: NewFilePresetId = 'nuclear-detonation'

export function getNewFilePreset(id: string): NewFilePreset {
  const preset = newFilePresets.find((entry) => entry.id === id)
  if (!preset) throw new Error(`Unknown new-file preset: ${id}`)
  return preset
}

export function clonePresetRuntimeParams(preset: NewFilePreset) {
  return cloneRuntimeParams(preset.runtimeParams)
}
