import { Panel } from './Panel'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

export function WorkspacePanel() {
  const projectState = useEditorStore((s) => s.projectState)
  const dispatch = useEditorDispatch()

  return (
    <Panel title="Scene">
      <div className="px-3 py-2">
        <label className="block">
          <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">Project</span>
          <input
            value={projectState.name}
            onChange={(e) => dispatch({ type: 'project/set-name', name: e.currentTarget.value })}
            className="mt-1 w-full bg-(--fenix-bg) px-2 py-1.5 text-xs text-(--fenix-text) outline-none transition-colors focus:bg-(--fenix-row)"
            placeholder="Untitled"
          />
        </label>
      </div>
    </Panel>
  )
}
