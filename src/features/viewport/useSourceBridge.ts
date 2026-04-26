import { useEffect } from 'react'
import { subscribe } from 'valtio'
import type { SimulationHandle } from '../../engine/core/types/platform'
import { nodeStore } from '../../store/node-store/nodeStore'
import { nodeGraphStore } from '../../store/node-store/nodeGraphStore'
import { resolveEmitterSources } from '../../store/node-store/sourceGraph'
import type { EmitterSource } from '../../engine/simulation/emitters/emitterSource'

function emittersToSources(): readonly EmitterSource[] {
  return resolveEmitterSources(nodeStore.emitters, nodeGraphStore.edges)
}

export function useSourceBridge(handle: SimulationHandle | null) {
  useEffect(() => {
    if (!handle) return
    handle.updateSources(emittersToSources())
    const unsub = subscribe(nodeStore, () => {
      handle.updateSources(emittersToSources())
    })
    const unsubGraph = subscribe(nodeGraphStore, () => {
      handle.updateSources(emittersToSources())
    })
    return () => {
      unsub()
      unsubGraph()
    }
  }, [handle])
}
