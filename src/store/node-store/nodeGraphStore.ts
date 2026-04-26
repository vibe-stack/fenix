import { proxy } from 'valtio'
import type { XYPosition } from '@xyflow/react'
import { defaultNewFilePresetId, getNewFilePreset } from '../../editor/presets/newFilePresets'
import type { NewFilePreset, PresetGraphEdge } from '../../editor/presets/types'

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

export interface SerializedNodeGraphState {
  nodePositions: Record<string, XYPosition>
  edges: GraphEdge[]
}

const fixedNodePositions: Record<string, XYPosition> = {
  combustion:      { x: 340, y: 200 },
  advection:       { x: 580, y: 200 },
  wind:            { x: 340, y: 56 },
  vorticity:       { x: 460, y: 56 },
  gravity:         { x: 580, y: 56 },
  'render-output': { x: 820, y: 200 },
}

const fixedEdges: GraphEdge[] = [
  { id: 'comb-adv', source: 'combustion', target: 'advection' },
  { id: 'wind-adv', source: 'wind', target: 'advection' },
  { id: 'vorticity-adv', source: 'vorticity', target: 'advection' },
  { id: 'gravity-adv', source: 'gravity', target: 'advection' },
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

function createLightPositions(lightCount: number): Record<string, XYPosition> {
  return Object.fromEntries(
    Array.from({ length: lightCount }, (_, index) => [
      `light-${index}`,
      {
        x: 610,
        y: 68 + index * 112,
      },
    ]),
  )
}

function presetGraphEdgesToGraphEdges(graphEdges: readonly PresetGraphEdge[] | undefined): GraphEdge[] {
  if (!graphEdges) return []

  return graphEdges.map((edge) => {
    const source = `emitter-${edge.source}`
    const target = edge.target === 'combustion' ? 'combustion' : `emitter-${edge.target}`

    return {
      id: `${source}->${target}`,
      source,
      target,
    }
  })
}

function createGraphState(
  emitterCount: number,
  lightCount: number,
  graphEdges?: readonly PresetGraphEdge[],
): NodeGraphStoreState {
  const emitterEdges = graphEdges
    ? presetGraphEdgesToGraphEdges(graphEdges)
    : Array.from({ length: emitterCount }, (_, index) => ({
        id: `emitter-${index}->combustion`,
        source: `emitter-${index}`,
        target: 'combustion',
      }))
  const lightEdges = Array.from({ length: lightCount }, (_, index) => ({
    id: `light-${index}->render-output`,
    source: `light-${index}`,
    target: 'render-output',
  }))

  return {
    nodePositions: {
      ...createEmitterPositions(emitterCount),
      ...createLightPositions(lightCount),
      ...fixedNodePositions,
    },
    edges: [...emitterEdges, ...lightEdges, ...fixedEdges],
  }
}

const defaultPreset = getNewFilePreset(defaultNewFilePresetId)
const defaultGraphState = createGraphState(
  defaultPreset.emitters.length,
  defaultPreset.lights.length,
  defaultPreset.graphEdges,
)

export const nodeGraphStore = proxy<NodeGraphStoreState>({
  nodePositions: defaultGraphState.nodePositions,
  edges: defaultGraphState.edges,
})

export function resetNodeGraph(preset: NewFilePreset): void
export function resetNodeGraph(emitterCount: number, lightCount: number): void
export function resetNodeGraph(presetOrEmitterCount: NewFilePreset | number, lightCount?: number) {
  const nextState = typeof presetOrEmitterCount === 'number'
    ? createGraphState(presetOrEmitterCount, lightCount ?? 0)
    : createGraphState(
        presetOrEmitterCount.emitters.length,
        presetOrEmitterCount.lights.length,
        presetOrEmitterCount.graphEdges,
      )

  nodeGraphStore.nodePositions = nextState.nodePositions
  nodeGraphStore.edges = nextState.edges
}

export function applyNodeGraphState(graph: SerializedNodeGraphState) {
  nodeGraphStore.nodePositions = { ...graph.nodePositions }
  nodeGraphStore.edges = graph.edges.map((edge) => ({ ...edge }))
}

export function snapshotNodeGraph(): SerializedNodeGraphState {
  return {
    nodePositions: Object.fromEntries(
      Object.entries(nodeGraphStore.nodePositions).map(([id, position]) => [
        id,
        { x: position.x, y: position.y },
      ]),
    ),
    edges: nodeGraphStore.edges.map((edge) => ({ ...edge })),
  }
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
