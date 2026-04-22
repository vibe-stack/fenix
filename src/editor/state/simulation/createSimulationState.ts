import type { SimulationState } from '../../models/workspace'
import { simulationDefaults } from '../../../engine/simulation/config/simulationDefaults'

export function createSimulationState(): SimulationState {
  return {
    ...simulationDefaults,
    profile: 'Combustion Authoring Baseline',
  }
}
