import { Panel } from '../panels/Panel'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

export function NodeGraphPreview() {
  const dispatch = useEditorDispatch()
  const graphState = useEditorStore((snapshot) => snapshot.graphState)

  return (
    <Panel title="Node Graph">
      <div>
        {graphState.nodeCatalog.map((node) => {
          const isActive = node.id === graphState.selectedNodeId

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => dispatch({ type: 'graph/select-node', nodeId: node.id })}
              className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? 'bg-(--fenix-active)'
                  : 'hover:bg-(--fenix-row)'
              }`}
            >
              <div>
                <p
                  className={`text-xs font-medium ${
                    isActive ? 'text-(--fenix-accent-soft)' : 'text-(--fenix-text)'
                  }`}
                >
                  {node.label}
                </p>
                <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
                  {node.category}
                </p>
              </div>
              {isActive && (
                <span className="h-1 w-1 bg-(--fenix-accent)" />
              )}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
