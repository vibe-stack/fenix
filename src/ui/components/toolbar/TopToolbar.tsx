import { StatusPill } from '../common/StatusPill'
import type { RendererDiagnostics } from '../../../engine/core/types/platform'
import { useEditorStore } from '../../hooks/useEditorStore'

interface TopToolbarProps {
  diagnostics: RendererDiagnostics
}

export function TopToolbar({ diagnostics }: TopToolbarProps) {
  const appState = useEditorStore((snapshot) => snapshot.appState)
  const projectState = useEditorStore((snapshot) => snapshot.projectState)
  const tone = diagnostics.supportState === 'ready' ? 'success' : 'warning'

  return (
    <header className="rounded-[30px] border border-[var(--fenix-border)] bg-[linear-gradient(135deg,rgba(49,34,28,0.94),rgba(26,18,15,0.92))] px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[var(--fenix-accent-soft)]">
            Browser Volumetrics Platform
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--fenix-text)]">
              {appState.productName}
            </h1>
            <StatusPill label={projectState.savedRevision} />
            <StatusPill label={diagnostics.backend.toUpperCase()} tone={tone} />
          </div>
          <p className="mt-2 text-sm text-[var(--fenix-text-muted)]">
            {appState.branchLabel} focusing on an editor-first shell with engine seams intact.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ToolbarAction
            label="Project"
            value={projectState.name}
            detail="Store-backed workspace title"
          />
          <ToolbarAction
            label="Runtime"
            value={diagnostics.supportState === 'ready' ? 'Adapter ready' : 'Fallback path'}
            detail={diagnostics.message}
          />
          <ToolbarAction
            label="Mode"
            value={appState.workspaceStage}
            detail="Editor store online"
          />
        </div>
      </div>
    </header>
  )
}

interface ToolbarActionProps {
  label: string
  value: string
  detail: string
}

function ToolbarAction({ label, value, detail }: ToolbarActionProps) {
  return (
    <div className="rounded-[22px] border border-white/7 bg-black/15 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--fenix-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--fenix-text)]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--fenix-text-muted)]">{detail}</p>
    </div>
  )
}
