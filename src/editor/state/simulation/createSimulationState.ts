import type { SimulationState } from '../../models/workspace'
import {
  clonePresetRuntimeParams,
  defaultNewFilePresetId,
  getNewFilePreset,
} from '../../presets/newFilePresets'
import { simulationDefaults } from '../../../engine/simulation/config/simulationDefaults'

const defaultPreset = getNewFilePreset(defaultNewFilePresetId)

export function createSimulationState(): SimulationState {
  return {
    ...simulationDefaults,
    profile: 'Combustion Authoring Baseline',
    runtimeParams: clonePresetRuntimeParams(defaultPreset),
  }
}
