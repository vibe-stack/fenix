import { proxy } from 'valtio'
import type { XYPosition } from '@xyflow/react'

export interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface NodeGraphStoreState {
  nodePositions: Record<string, XYPosition>
  edges: GraphEdge[]
}

const defaultPositions: Record<string, XYPosition> = {
  'emitter-0':     { x: 60, y: 80 },
  'emitter-1':     { x: 60, y: 220 },
  'emitter-2':     { x: 60, y: 360 },
  combustion:      { x: 340, y: 200 },
  advection:       { x: 580, y: 200 },
  'render-output': { x: 820, y: 200 },
}

const defaultEdges: GraphEdge[] = [
  { id: 'e0-comb',  source: 'emitter-0', target: 'combustion' },
  { id: 'e1-comb',  source: 'emitter-1', target: 'combustion' },
  { id: 'e2-comb',  source: 'emitter-2', target: 'combustion' },
  { id: 'comb-adv', source: 'combustion', target: 'advection' },
  { id: 'adv-ro',   source: 'advection',  target: 'render-output' },
]

export const nodeGraphStore = proxy<NodeGraphStoreState>({
  nodePositions: { ...defaultPositions },
  edges: defaultEdges,
})

export function setNodePosition(id: string, position: XYPosition) {
  nodeGraphStore.nodePositions[id] = position
}

export function removeNodeFromGraph(id: string) {
  delete nodeGraphStore.nodePositions[id]
  nodeGraphStore.edges = nodeGraphStore.edges.filter(
    (e) => e.source !== id && e.target !== id,
  )
}

export function addEdge(edge: GraphEdge) {
  // Prevent duplicate connections on the same source→target pair
  const exists = nodeGraphStore.edges.some(
    (e) => e.source === edge.source && e.target === edge.target,
  )
  if (!exists) {
    nodeGraphStore.edges.push(edge)
  }
}

export function removeEdges(ids: Set<string>) {
  nodeGraphStore.edges = nodeGraphStore.edges.filter((e) => !ids.has(e.id))
}
