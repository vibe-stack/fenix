import { useSnapshot } from 'valtio'
import { Panel } from '../panels/Panel'
import { nodeStore } from '../../../store/node-store/nodeStore'

const FIXED_NODES = [
  { id: 'combustion', label: 'Combustion', category: 'Combustion' },
  { id: 'advection', label: 'Advection', category: 'Solvers' },
  { id: 'render-output', label: 'Render Output', category: 'Output' },
] as const

function NodeRow({ id, label, category, selectedId }: { id: string; label: string; category: string; selectedId: string | null }) {
  const isActive = id === selectedId
  return (
    <button
      type="button"
      onClick={() => { nodeStore.selectedId = isActive ? null : id }}
      className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors ${
        isActive ? 'bg-(--fenix-active)' : 'hover:bg-(--fenix-row)'
      }`}
    >
      <div>
        <p className={`text-xs font-medium ${isActive ? 'text-(--fenix-accent-soft)' : 'text-(--fenix-text)'}`}>
          {label}
        </p>
        <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
          {category}
        </p>
      </div>
      {isActive && <span className="h-1 w-1 bg-(--fenix-accent)" />}
    </button>
  )
}

export function NodeGraphPreview() {
  const snap = useSnapshot(nodeStore)

  return (
    <Panel title="Node Graph">
      <div>
        <p className="px-3 pt-2.5 pb-1 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
          Emitters
        </p>
        {snap.emitters.map((emitter) => (
          <NodeRow
            key={emitter.id}
            id={emitter.id}
            label={emitter.label}
            category="Emitters"
            selectedId={snap.selectedId}
          />
        ))}
        <div className="mx-3 my-1.5 border-t border-(--fenix-border)" />
        {FIXED_NODES.map((node) => (
          <NodeRow
            key={node.id}
            id={node.id}
            label={node.label}
            category={node.category}
            selectedId={snap.selectedId}
          />
        ))}
      </div>
    </Panel>
  )
}
