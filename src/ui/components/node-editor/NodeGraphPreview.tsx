import { Panel } from '../panels/Panel'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

export function NodeGraphPreview() {
  const dispatch = useEditorDispatch()
  const graphState = useEditorStore((snapshot) => snapshot.graphState)

  return (
    <Panel
      title="Node Graph"
      subtitle="Seeded with foundational authoring nodes and now wired to selection commands through the editor store."
      status={`${graphState.nodeCatalog.length} nodes`}
    >
      <div className="space-y-3">
        {graphState.nodeCatalog.map((node, index) => {
          const isActive = node.id === graphState.selectedNodeId

          return (
            <div key={node.id} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold ${
                    isActive
                      ? 'border-[var(--fenix-border-strong)] bg-[rgba(255,122,61,0.16)] text-[var(--fenix-accent-soft)]'
                      : 'border-white/8 bg-white/4 text-[var(--fenix-text-muted)]'
                  }`}
                >
                  {index + 1}
                </span>
                {index < graphState.nodeCatalog.length - 1 ? (
                  <span className="my-1 h-6 w-px bg-[linear-gradient(180deg,rgba(255,171,103,0.6),rgba(255,171,103,0.05))]" />
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  dispatch({
                    type: 'graph/select-node',
                    nodeId: node.id,
                  })
                }}
                className="flex-1 rounded-[20px] border border-white/6 bg-black/12 px-4 py-3 text-left transition hover:border-[var(--fenix-border)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--fenix-text)]">{node.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--fenix-accent-soft)]">
                      {node.category}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="rounded-full border border-amber-300/30 bg-amber-200/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[var(--fenix-warning)]">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--fenix-text-muted)]">
                  {node.description}
                </p>
              </button>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
