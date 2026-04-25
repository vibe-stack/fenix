import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { NodeShell } from './NodeShell'

export function CombustionNode({ id, selected }: NodeProps) {
  const snap = useSnapshot(nodeStore)

  return (
    <NodeShell
      id={id}
      label="Combustion"
      category="Combustion"
      selected={!!selected}
      accentColor="#f0622a"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PropRow label="burn min" value={snap.combustion.burnRateMin.toFixed(1)} />
        <PropRow label="burn max" value={snap.combustion.burnRateMax.toFixed(1)} />
        <PropRow label="cooling" value={snap.combustion.baseCoolingRate.toFixed(3)} />
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
