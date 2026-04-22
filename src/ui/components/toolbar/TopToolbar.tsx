import type { RendererDiagnostics } from '../../../engine/core/types/platform'
import type { ViewportShadingMode } from '../../../editor/models/workspace'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

interface TopToolbarProps {
  diagnostics: RendererDiagnostics
}

const shadingModes: ViewportShadingMode[] = ['density', 'temperature', 'fuel']

export function TopToolbar({ diagnostics }: TopToolbarProps) {
  const dispatch = useEditorDispatch()
  const appState = useEditorStore((snapshot) => snapshot.appState)
  const projectState = useEditorStore((snapshot) => snapshot.projectState)
  const viewportState = useEditorStore((snapshot) => snapshot.viewportState)

  return (
    <header className="flex h-8 shrink-0 items-center gap-px bg-(--fenix-topbar)">
      {/* App identity */}
      <div className="flex items-center gap-3 px-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.36em] text-(--fenix-accent)">
          {appState.productName}
        </span>
        <span className="text-[11px] text-(--fenix-text-muted)">/</span>
        <span className="text-[11px] text-(--fenix-text)">{projectState.name}</span>
      </div>

      <div className="flex-1" />

      {/* Shading mode selector */}
      <div className="flex items-stretch gap-px">
        {shadingModes.map((mode) => {
          const isActive = mode === viewportState.shadingMode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => dispatch({ type: 'viewport/set-shading-mode', shadingMode: mode })}
              className={`h-8 px-4 text-[10px] uppercase tracking-[0.22em] transition-colors ${
                isActive
                  ? 'bg-(--fenix-active) text-(--fenix-accent)'
                  : 'bg-transparent text-(--fenix-text-muted) hover:text-(--fenix-text)'
              }`}
            >
              {mode}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      {/* GPU state */}
      <div className="flex items-center gap-2 px-4">
        <span
          className={`h-1.5 w-1.5 ${
            diagnostics.supportState === 'ready' ? 'bg-(--fenix-success)' : 'bg-(--fenix-warning)'
          }`}
        />
        <span className="text-[10px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
          {diagnostics.supportState === 'ready' ? diagnostics.adapterName : 'no gpu adapter'}
        </span>
      </div>
    </header>
  )
}
