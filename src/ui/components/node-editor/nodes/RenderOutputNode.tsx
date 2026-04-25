import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { nodeGraphStore } from '../../../../store/node-store/nodeGraphStore'
import { NodeShell } from './NodeShell'

export function RenderOutputNode({ id, selected }: NodeProps) {
  const snap = useSnapshot(nodeStore)
  const graphSnap = useSnapshot(nodeGraphStore)
  const connectedLights = graphSnap.edges.filter((edge) => edge.target === 'render-output' && edge.source.startsWith('light-')).length

  return (
    <NodeShell
      id={id}
      label="Render Output"
      category="Output"
      selected={!!selected}
      hasOutput={false}
      accentColor="#a855f7"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PropRow label="display" value={snap.renderOutput.displayMode} />
        <PropRow label="steps" value={String(snap.renderOutput.stepCount)} />
        <PropRow label="lights" value={String(connectedLights)} />
      </div>
    </NodeShell>
  )
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--fenix-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--fenix-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
