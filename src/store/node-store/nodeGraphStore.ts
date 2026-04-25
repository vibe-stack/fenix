import { proxy } from 'valtio'
import type { XYPosition } from '@xyflow/react'
import { defaultNewFilePresetId, getNewFilePreset } from '../../editor/presets/newFilePresets'

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

const fixedNodePositions: Record<string, XYPosition> = {
  combustion:      { x: 340, y: 200 },
  advection:       { x: 580, y: 200 },
  'render-output': { x: 820, y: 200 },
}

const fixedEdges: GraphEdge[] = [
  { id: 'comb-adv', source: 'combustion', target: 'advection' },
  { id: 'adv-ro',   source: 'advection',  target: 'render-output' },
]

function createEmitterPositions(emitterCount: number): Record<string, XYPosition> {
  if (emitterCount === 0) {
    return {}
  }

  if (emitterCount === 1) {
    return { 'emitter-0': { x: 80, y: 200 } }
  }

  const columnCount = emitterCount > 10 ? 3 : emitterCount > 3 ? 2 : 1
  const columnOffsets = columnCount === 1 ? [60] : columnCount === 2 ? [45, 180] : [25, 135, 245]

  return Object.fromEntries(
    Array.from({ length: emitterCount }, (_, index) => {
      const columnIndex = index % columnCount
      const rowIndex = Math.floor(index / columnCount)

      return [
        `emitter-${index}`,
        {
          x: columnOffsets[columnIndex] ?? 60,
          y: 56 + rowIndex * 88,
        },
      ]
    }),
  )
}

function createGraphState(emitterCount: number): NodeGraphStoreState {
  const emitterEdges = Array.from({ length: emitterCount }, (_, index) => ({
    id: `emitter-${index}->combustion`,
    source: `emitter-${index}`,
    target: 'combustion',
  }))

  return {
    nodePositions: {
      ...createEmitterPositions(emitterCount),
      ...fixedNodePositions,
    },
    edges: [...emitterEdges, ...fixedEdges],
  }
}

const defaultGraphState = createGraphState(getNewFilePreset(defaultNewFilePresetId).emitters.length)

export const nodeGraphStore = proxy<NodeGraphStoreState>({
  nodePositions: defaultGraphState.nodePositions,
  edges: defaultGraphState.edges,
})

export function resetNodeGraph(emitterCount: number) {
  const nextState = createGraphState(emitterCount)

  nodeGraphStore.nodePositions = nextState.nodePositions
  nodeGraphStore.edges = nextState.edges
}

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
