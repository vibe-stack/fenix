export type { NewFilePreset, PresetEmitter, PresetLight } from './types'

import { blankPreset } from './preset-blank'
import { nuclearDetonationPreset } from './preset-nuclear-detonation'
import { campfirePreset } from './preset-campfire'
import { oilWellFirePreset } from './preset-oil-well-fire'
import { artilleryBurstPreset } from './preset-artillery-burst'
import { volcanicEruptionPreset } from './preset-volcanic-eruption'
import type { NewFilePreset } from './types'
import { cloneRuntimeParams } from './types'

export const newFilePresets: readonly NewFilePreset[] = [
  blankPreset,
  nuclearDetonationPreset,
  campfirePreset,
  oilWellFirePreset,
  artilleryBurstPreset,
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
