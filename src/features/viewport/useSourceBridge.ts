import { useEffect } from 'react'
import { subscribe } from 'valtio'
import type { SimulationHandle } from '../../engine/core/types/platform'
import { nodeStore, emitterPropsToSource } from '../../store/node-store/nodeStore'
import type { EmitterSource } from '../../engine/simulation/emitters/emitterSource'

function emittersToSources(): readonly EmitterSource[] {
  return nodeStore.emitters.map((e) => emitterPropsToSource(e.props))
}

export function useSourceBridge(handle: SimulationHandle | null) {
  useEffect(() => {
    if (!handle) return
    handle.updateSources(emittersToSources())
    const unsub = subscribe(nodeStore, () => {
      handle.updateSources(emittersToSources())
    })
    return unsub
  }, [handle])
}
