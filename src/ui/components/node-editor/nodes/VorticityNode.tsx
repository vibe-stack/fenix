import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { NodeShell } from './NodeShell'

export function VorticityNode({ id, selected }: NodeProps) {
  const snap = useSnapshot(nodeStore)
  const { vorticity } = snap

  return (
    <NodeShell
      id={id}
      label="Vorticity"
      category="Force"
      selected={!!selected}
      accentColor="#ff9f5f"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PropRow label="strength" value={vorticity.strength.toFixed(2)} />
        <PropRow label="heat mask" value={(vorticity.heatMask ?? 0.8).toFixed(2)} />
        <PropRow label="smoke mask" value={(vorticity.densityMask ?? 0.35).toFixed(2)} />
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
