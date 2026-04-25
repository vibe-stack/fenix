import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { NodeShell } from './NodeShell'

export type EmitterNodeData = {
  emitterId: string
  label: string
}

export function EmitterNode({ id, data, selected }: NodeProps) {
  const d = data as EmitterNodeData
  const snap = useSnapshot(nodeStore)
  const emitter = snap.emitters.find((e) => e.id === d.emitterId)

  return (
    <NodeShell
      id={id}
      label={d.label as string}
      category="Emitter"
      selected={!!selected}
      hasInput={false}
      accentColor="#f97c3a"
    >
      {emitter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PropRow label="radius" value={emitter.props.radius.toFixed(2)} />
          <PropRow label="heat" value={emitter.props.heatYield.toFixed(2)} />
          <PropRow label="fuel" value={emitter.props.fuelYield.toFixed(2)} />
        </div>
      )}
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
