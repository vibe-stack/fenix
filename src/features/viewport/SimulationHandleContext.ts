import { createContext, useContext } from 'react'
import type { SimulationHandle } from '../../engine/core/types/platform'

export const SimulationHandleContext = createContext<SimulationHandle | null>(null)

export function useSimulationHandle(): SimulationHandle | null {
  return useContext(SimulationHandleContext)
}
