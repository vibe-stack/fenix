import { createRendererBridge, type RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { createAppState } from '../../state/app/createAppState'
import { createGraphState } from '../../state/graph/createGraphState'
import { createProjectState } from '../../state/project/createProjectState'
import { createSimulationState } from '../../state/simulation/createSimulationState'
import { createViewportState } from '../../state/viewport/createViewportState'
import type { EditorSnapshot } from '../../models/workspace'

export interface EditorBootstrap {
  initialSnapshot: EditorSnapshot
  rendererBridge: RendererBridge
}

export function createEditorBootstrap(): EditorBootstrap {
  return {
    initialSnapshot: {
      appState: createAppState(),
      graphState: createGraphState(),
      projectState: createProjectState(),
      simulationState: createSimulationState(),
      viewportState: createViewportState(),
    },
    rendererBridge: createRendererBridge(),
  }
}
