import { useEffect } from 'react'
import type { SimulationHandle } from '../../engine/core/types/platform'
import type { SimulationRuntimeParams } from '../../engine/simulation/runtime/combustion-volume-simulation/types'

export function useSimulationBridge(
  handle: SimulationHandle | null,
  params: SimulationRuntimeParams,
) {
  useEffect(() => {
    if (!handle) return
    handle.setWindDirection(params.wind[0], params.wind[1], params.wind[2])
    handle.setWindStrength(params.windStrength)
    handle.setBuoyancy(params.buoyancy)
    handle.setVorticityStrength(params.vorticityStrength)
  }, [handle, params.wind, params.windStrength, params.buoyancy, params.vorticityStrength])
}
