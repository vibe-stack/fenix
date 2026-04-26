import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import type { EmitterNodeProps } from '../../../../engine/graph/schema/nodeProps'
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
      accentColor="#f97c3a"
    >
      {emitter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {emitterSummaryRows(emitter.props).map((row) => (
            <PropRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      )}
    </NodeShell>
  )
}

function emitterSummaryRows(props: EmitterNodeProps): { label: string; value: string }[] {
  const rows = [{ label: 'radius', value: props.radius.toFixed(2) }]

  if (props.kind === 'scalar') {
    rows.push(
      { label: 'density', value: props.densityRate.toFixed(1) },
      { label: 'heat', value: props.heatRate.toFixed(1) },
      { label: 'fuel', value: props.fuelRate.toFixed(1) },
    )
    return rows
  }

  if (props.kind === 'velocity') {
    rows.push(
      { label: 'mode', value: props.mode },
      { label: 'speed', value: props.speed.toFixed(0) },
      { label: 'falloff', value: props.falloff.toFixed(2) },
    )
    return rows
  }

  if (props.kind === 'burst') {
    rows.push(
      { label: 'density', value: props.densityAmount.toFixed(2) },
      { label: 'heat', value: props.heatAmount.toFixed(2) },
      { label: 'expand', value: props.expansionSpeed.toFixed(0) },
    )
    return rows
  }

  rows.push({ label: 'intensity', value: props.intensity.toFixed(2) })
  return rows
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--fenix-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--fenix-text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
