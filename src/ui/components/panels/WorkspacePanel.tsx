import { Panel } from './Panel'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

export function WorkspacePanel() {
  const appState = useEditorStore((snapshot) => snapshot.appState)
  const graphState = useEditorStore((snapshot) => snapshot.graphState)
  const projectState = useEditorStore((snapshot) => snapshot.projectState)
  const dispatch = useEditorDispatch()

  return (
    <Panel title="Scene">
      <div className="px-3 py-3">
        <label className="block">
          <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">
            Project
          </span>
          <input
            value={projectState.name}
            onChange={(event) => {
              dispatch({ type: 'project/set-name', name: event.currentTarget.value })
            }}
            className="mt-1.5 w-full bg-[#0d0a09] px-2 py-1.5 text-xs text-(--fenix-text) outline-none transition-colors focus:bg-[#181414]"
            placeholder="Project name"
          />
        </label>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">
            Stage
          </span>
          <span className="text-[10px] text-(--fenix-warning)">{appState.workspaceStage}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">
            Graph
          </span>
          <span className="text-[10px] text-(--fenix-text)">{graphState.activeGraph}</span>
        </div>
      </div>
    </Panel>
  )
}
