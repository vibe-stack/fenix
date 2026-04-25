import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { NodeShell } from './NodeShell'

export type LightNodeData = {
  lightId: string
  label: string
}

export function LightNode({ id, data, selected }: NodeProps) {
  const d = data as LightNodeData
  const snap = useSnapshot(nodeStore)
  const light = snap.lights.find((entry) => entry.id === d.lightId)

  return (
    <NodeShell
      id={id}
      label={d.label}
      category="Lighting"
      selected={!!selected}
      hasInput={false}
      accentColor="#f4c95d"
    >
      {light && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PropRow label="type" value={light.props.lightType} />
          <PropRow label="intensity" value={light.props.intensity.toFixed(2)} />
          <PropRow label="color" value={`${Math.round(light.props.colorR * 255)} ${Math.round(light.props.colorG * 255)} ${Math.round(light.props.colorB * 255)}`} />
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