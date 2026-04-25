import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { NodeShell } from './NodeShell'

export function GravityNode({ id, selected }: NodeProps) {
  const snap = useSnapshot(nodeStore)
  const { gravity } = snap

  return (
    <NodeShell
      id={id}
      label="Gravity"
      category="Force"
      selected={!!selected}
      accentColor="#8cc46f"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PropRow label="strength" value={gravity.strength.toFixed(2)} />
        <PropRow label="buoyancy" value={gravity.buoyancy.toFixed(2)} />
        <PropRow
          label="dir"
          value={`${gravity.directionX.toFixed(2)}, ${gravity.directionY.toFixed(2)}, ${gravity.directionZ.toFixed(2)}`}
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
