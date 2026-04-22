import { Panel } from './Panel'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

const architectureLayers = [
  'Editor UI Layer',
  'Authoring / Graph Layer',
  'Simulation Compiler Layer',
  'GPU Simulation Runtime',
  'Volumetric Renderer',
  'Asset / Export Pipeline',
]

export function WorkspacePanel() {
  const appState = useEditorStore((snapshot) => snapshot.appState)
  const graphState = useEditorStore((snapshot) => snapshot.graphState)
  const projectState = useEditorStore((snapshot) => snapshot.projectState)
  const dispatch = useEditorDispatch()

  return (
    <Panel
      title="Workspace"
      subtitle="The workspace now reads from an editor store boundary instead of frozen bootstrap props."
      status={appState.workspaceStage}
      statusTone="warning"
    >
      <div className="space-y-5">
        <div className="rounded-[22px] border border-white/6 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--fenix-text-muted)]">
            Active Project
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--fenix-text)]">
            {projectState.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--fenix-text-muted)]">
            {appState.productName} is being framed as an editor plus engine, not a single-page
            prototype. Current focus: stable seams for viewport, graph, runtime, and export work.
          </p>
          <label className="mt-4 block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--fenix-text-muted)]">
              Project Name
            </span>
            <input
              value={projectState.name}
              onChange={(event) => {
                dispatch({
                  type: 'project/set-name',
                  name: event.currentTarget.value,
                })
              }}
              className="mt-2 w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-[var(--fenix-text)] outline-none transition focus:border-[var(--fenix-border-strong)]"
              placeholder="Project name"
            />
          </label>
          <p className="mt-3 text-xs leading-5 text-[var(--fenix-text-muted)]">
            Active graph: {graphState.activeGraph}
          </p>
        </div>

        <div className="space-y-2">
          {architectureLayers.map((layer, index) => (
            <div
              key={layer}
              className="flex items-center gap-3 rounded-2xl border border-white/6 bg-white/4 px-3 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--fenix-border-strong)] bg-[var(--fenix-bg-soft)] text-xs font-semibold text-[var(--fenix-accent-soft)]">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--fenix-text)]">{layer}</p>
                <p className="text-xs text-[var(--fenix-text-muted)]">
                  {index < 2
                    ? 'Shell scaffolded in this pass.'
                    : 'Reserved for dedicated engine/runtime implementation.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}
