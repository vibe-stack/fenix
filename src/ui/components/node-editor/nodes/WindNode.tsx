import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { NodeShell } from './NodeShell'

export function WindNode({ id, selected }: NodeProps) {
  const snap = useSnapshot(nodeStore)
  const { wind } = snap

  return (
    <NodeShell
      id={id}
      label="Wind"
      category="Force"
      selected={!!selected}
      accentColor="#5fd0ff"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PropRow label="strength" value={wind.strength.toFixed(2)} />
        <PropRow
          label="dir"
          value={`${wind.directionX.toFixed(2)}, ${wind.directionY.toFixed(2)}, ${wind.directionZ.toFixed(2)}`}
        />
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
