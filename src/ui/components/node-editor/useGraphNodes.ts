import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import type { Node, Edge } from '@xyflow/react'
import { nodeStore } from '../../../store/node-store/nodeStore'
import { nodeGraphStore } from '../../../store/node-store/nodeGraphStore'
import type { EmitterNodeData } from './nodes/EmitterNode'

export function useGraphNodes(): { nodes: Node[]; edges: Edge[] } {
  const snap = useSnapshot(nodeStore)
  const graphSnap = useSnapshot(nodeGraphStore)

  const nodes = useMemo<Node[]>(() => {
    const emitterNodes: Node[] = snap.emitters.map((emitter) => ({
      id: emitter.id,
      type: 'emitter',
      position: graphSnap.nodePositions[emitter.id] ?? { x: 60, y: 80 },
      selected: snap.selectedId === emitter.id,
      data: { emitterId: emitter.id, label: emitter.label } satisfies EmitterNodeData,
    }))

    const fixedNodes: Node[] = [
      {
        id: 'combustion',
        type: 'combustion',
        position: graphSnap.nodePositions['combustion'] ?? { x: 340, y: 200 },
        selected: snap.selectedId === 'combustion',
        data: {},
      },
      {
        id: 'advection',
        type: 'advection',
        position: graphSnap.nodePositions['advection'] ?? { x: 580, y: 200 },
        selected: snap.selectedId === 'advection',
        data: {},
      },
      {
        id: 'render-output',
        type: 'render-output',
        position: graphSnap.nodePositions['render-output'] ?? { x: 820, y: 200 },
        selected: snap.selectedId === 'render-output',
        data: {},
      },
    ]

    return [...emitterNodes, ...fixedNodes]
  }, [snap, graphSnap])

  const edges = useMemo<Edge[]>(() =>
    graphSnap.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1.5 },
      animated: false,
    })),
  [graphSnap.edges])

  return { nodes, edges }
}
