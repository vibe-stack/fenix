import { useEffect } from 'react'
import { subscribe } from 'valtio'
import type { SimulationHandle } from '../../engine/core/types/platform'
import { nodeStore } from '../../store/node-store/nodeStore'
import { nodeGraphStore } from '../../store/node-store/nodeGraphStore'
import type { RenderLight } from '../../engine/render/lighting/renderLight'

function collectConnectedLights(): RenderLight[] {
  const connectedLightIds = nodeGraphStore.edges
    .filter((edge) => edge.target === 'render-output' && edge.source.startsWith('light-'))
    .map((edge) => edge.source)

  return connectedLightIds
    .map((id) => nodeStore.lights.find((light) => light.id === id))
    .filter((light): light is NonNullable<typeof light> => light !== undefined)
    .map((light) => ({
      type: light.props.lightType,
      direction: [light.props.dirX, light.props.dirY, light.props.dirZ] as const,
      position: [light.props.posX, light.props.posY, light.props.posZ] as const,
      color: [light.props.colorR, light.props.colorG, light.props.colorB] as const,
      intensity: light.props.intensity,
    }))
}

function pushRenderParams(handle: SimulationHandle) {
  const ro = nodeStore.renderOutput
  handle.setRenderParams({
    stepCount: ro.stepCount,
    lights: collectConnectedLights(),
    scatteringForward: ro.scatteringForward,
    scatteringBack: ro.scatteringBack,
    bloomEnabled: ro.bloomEnabled,
    bloomThreshold: ro.bloomThreshold,
    bloomStrength: ro.bloomStrength,
    bloomRadius: ro.bloomRadius,
  })
}

export function useRenderOutputBridge(handle: SimulationHandle | null) {
  useEffect(() => {
    if (!handle) return

    // Push immediately on mount
    pushRenderParams(handle)

    // Subscribe at the root so nested light prop edits from the inspector are pushed.
    const unsubNodeStore = subscribe(nodeStore, () => {
      pushRenderParams(handle)
    })
    const unsubGraph = subscribe(nodeGraphStore, () => {
      pushRenderParams(handle)
    })

    return () => {
      unsubNodeStore()
      unsubGraph()
    }
  }, [handle])
}
