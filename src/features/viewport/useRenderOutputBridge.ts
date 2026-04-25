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
  })
}

export function useRenderOutputBridge(handle: SimulationHandle | null) {
  useEffect(() => {
    if (!handle) return

    // Push immediately on mount
    pushRenderParams(handle)

    // Push whenever render output settings, lights, or graph light connections change.
    const unsubRenderOutput = subscribe(nodeStore.renderOutput, () => {
      pushRenderParams(handle)
    })
    const unsubLights = subscribe(nodeStore.lights, () => {
      pushRenderParams(handle)
    })
    const unsubGraph = subscribe(nodeGraphStore, () => {
      pushRenderParams(handle)
    })

    return () => {
      unsubRenderOutput()
      unsubLights()
      unsubGraph()
    }
  }, [handle])
}
