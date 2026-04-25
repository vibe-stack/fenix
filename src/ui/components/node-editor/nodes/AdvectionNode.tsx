import type { NodeProps } from '@xyflow/react'
import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { NodeShell } from './NodeShell'

export function AdvectionNode({ id, selected }: NodeProps) {
  const snap = useSnapshot(nodeStore)

  return (
    <NodeShell
      id={id}
      label="Advection"
      category="Solver"
      selected={!!selected}
      accentColor="#4a9eff"
    >
      <div style={{ color: 'var(--fenix-text)', fontSize: 10 }}>
        mode: <span style={{ color: 'var(--fenix-accent-soft)' }}>{snap.advection.mode}</span>
      </div>
    </NodeShell>
  )
}
