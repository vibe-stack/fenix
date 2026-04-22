import type { GraphState } from '../../models/workspace'
import { foundationalNodeTypes } from '../../../engine/graph/schema/nodeTypes'

export function createGraphState(): GraphState {
  return {
    activeGraph: 'main-sim',
    selectedNodeId: 'combustion',
    nodeCatalog: foundationalNodeTypes,
  }
}
