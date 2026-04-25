import { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type NodeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeStore } from '../../../store/node-store/nodeStore'
import { addEmitter, removeEmitter } from '../../../store/node-store/nodeStore'
import { addEdge, removeEdges, removeNodeFromGraph, setNodePosition } from '../../../store/node-store/nodeGraphStore'
import { graphNodeTypes } from './nodes/nodeTypes'
import { useGraphNodes } from './useGraphNodes'
import { GraphContextMenu } from './GraphContextMenu'

// Fixed nodes cannot be deleted
const FIXED_NODE_IDS = new Set(['combustion', 'advection', 'render-output'])

interface ContextMenuState {
  screenX: number
  screenY: number
  flowX: number
  flowY: number
}

export function NodeGraphEditor() {
  const { nodes, edges } = useGraphNodes()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        setNodePosition(change.id, change.position)
      }
    }
  }, [])

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const toRemove = new Set<string>()
    for (const change of changes) {
      if (change.type === 'remove') toRemove.add(change.id)
    }
    if (toRemove.size > 0) removeEdges(toRemove)
  }, [])

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    addEdge({
      id: `${connection.source}->${connection.target}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
    })
  }, [])

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    nodeStore.selectedId = nodeStore.selectedId === node.id ? null : node.id
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return
    const id = nodeStore.selectedId
    if (!id || FIXED_NODE_IDS.has(id)) return
    removeEmitter(id)
    removeNodeFromGraph(id)
  }, [])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    // Convert screen position to flow canvas coordinates via the ReactFlow container
    const container = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setContextMenu({
      screenX: e.clientX,
      screenY: e.clientY,
      flowX: e.clientX - container.left,
      flowY: e.clientY - container.top,
    })
  }, [])

  const contextMenuItems = contextMenu
    ? [
        {
          label: 'Emitter Source',
          sublabel: 'Seeds density, heat and fuel',
          action: () => {
            const id = addEmitter(`Emitter ${Date.now().toString(36).slice(-4)}`)
            setNodePosition(id, { x: contextMenu.flowX, y: contextMenu.flowY })
          },
        },
      ]
    : []

  return (
    <div
      style={{ width: '100%', height: '100%', outline: 'none' }}
      onKeyDown={onKeyDown}
      onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).focus()}
      // biome-ignore lint: div needs tabIndex to receive keyboard events
      tabIndex={-1}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onContextMenu={onContextMenu}
        onPaneClick={() => setContextMenu(null)}
        nodeTypes={graphNodeTypes}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--fenix-bg)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          style={{
            background: 'var(--fenix-panel)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6,
          }}
        />
      </ReactFlow>

      {contextMenu && (
        <GraphContextMenu
          x={contextMenu.screenX}
          y={contextMenu.screenY}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
