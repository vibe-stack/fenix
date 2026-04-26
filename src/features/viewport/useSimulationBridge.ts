import { useEffect } from 'react'
import type { SimulationHandle } from '../../engine/core/types/platform'
import type {
  SimulationQualitySettings,
  SimulationRuntimeParams,
} from '../../engine/simulation/runtime/combustion-volume-simulation/types'

export function useSimulationBridge(
  handle: SimulationHandle | null,
  params: SimulationRuntimeParams,
  qualitySettings: SimulationQualitySettings,
) {
  useEffect(() => {
    if (!handle) return
    handle.setWindDirection(params.wind[0], params.wind[1], params.wind[2])
    handle.setWindStrength(params.windStrength)
    handle.setGravityDirection(params.gravity[0], params.gravity[1], params.gravity[2])
    handle.setGravityStrength(params.gravityStrength)
    handle.setBuoyancy(params.buoyancy)
    handle.setVorticityStrength(params.vorticityStrength)
    handle.setVorticityMask(
      params.vorticityConstantMask ?? 1,
      params.vorticityVelocityMask ?? 0.4,
      params.vorticityHeatMask ?? 0.8,
      params.vorticityDensityMask ?? 0.35,
    )
    handle.setWorldSize(params.worldSize)
    handle.setSimulationQuality(qualitySettings)
  }, [
    handle,
    params.wind,
    params.windStrength,
    params.gravity,
    params.gravityStrength,
    params.buoyancy,
    params.vorticityStrength,
    params.vorticityConstantMask,
    params.vorticityVelocityMask,
    params.vorticityHeatMask,
    params.vorticityDensityMask,
    params.worldSize,
    qualitySettings,
  ])
}
