import type { SimulationState } from '../../models/workspace'
import { simulationDefaults } from '../../../engine/simulation/config/simulationDefaults'

export function createSimulationState(): SimulationState {
  return {
    ...simulationDefaults,
    profile: 'Combustion Authoring Baseline',
    runtimeParams: {
      wind: [0.8, -0.3, 0.2],
      windStrength: 2,
      buoyancy: 3.6,
      vorticityStrength: 2.15,
    },
  }
}
