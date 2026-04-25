import { useEffect } from 'react'
import { subscribe } from 'valtio'
import type { SimulationHandle } from '../../engine/core/types/platform'
import { nodeStore } from '../../store/node-store/nodeStore'
import type { ExplosionSource } from '../../engine/simulation/runtime/passes/explosionSources'

function emittersToSources(): readonly ExplosionSource[] {
  return nodeStore.emitters.map((e) => ({
    position: [e.props.positionX, e.props.positionY, e.props.positionZ] as const,
    radius: e.props.radius,
    startTime: e.props.startTime,
    smokeLeadTime: e.props.smokeLeadTime,
    blastDuration: e.props.blastDuration,
    plumeDuration: e.props.plumeDuration,
    densityYield: e.props.densityYield,
    heatYield: e.props.heatYield,
    fuelYield: e.props.fuelYield,
    reactionYield: e.props.reactionYield,
    radialImpulse: e.props.radialImpulse,
    liftDirection: [e.props.liftDirX, e.props.liftDirY, e.props.liftDirZ] as const,
    liftImpulse: e.props.liftImpulse,
    heatPatchiness: e.props.heatPatchiness,
    patchScale: e.props.patchScale,
    coreHeat: e.props.coreHeat,
    coreLift: e.props.coreLift,
    turbulence: e.props.turbulence,
    crumbleStrength: e.props.crumbleStrength,
    implosionStrength: e.props.implosionStrength,
    expansionRate: e.props.expansionRate,
    sustain: e.props.sustain,
    mushroomStrength: e.props.mushroomStrength,
    seed: e.props.seed,
  }))
}

export function useSourceBridge(handle: SimulationHandle | null) {
  useEffect(() => {
    if (!handle) return

    // Push immediately on mount
    handle.updateSources(emittersToSources())

    // Push on any emitter mutation
    const unsub = subscribe(nodeStore, () => {
      handle.updateSources(emittersToSources())
    })

    return unsub
  }, [handle])
}
