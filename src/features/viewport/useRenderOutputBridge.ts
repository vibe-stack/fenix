import { useEffect } from 'react'
import { subscribe } from 'valtio'
import type { SimulationHandle } from '../../engine/core/types/platform'
import { nodeStore } from '../../store/node-store/nodeStore'

function pushRenderParams(handle: SimulationHandle) {
  const ro = nodeStore.renderOutput
  handle.setRenderParams({
    stepCount: ro.stepCount,
    lightDirX: ro.lightDirX,
    lightDirY: ro.lightDirY,
    lightDirZ: ro.lightDirZ,
    scatteringForward: ro.scatteringForward,
    scatteringBack: ro.scatteringBack,
  })
}

export function useRenderOutputBridge(handle: SimulationHandle | null) {
  useEffect(() => {
    if (!handle) return

    // Push immediately on mount
    pushRenderParams(handle)

    // Push whenever renderOutput changes
    const unsub = subscribe(nodeStore.renderOutput, () => {
      pushRenderParams(handle)
    })

    return unsub
  }, [handle])
}
