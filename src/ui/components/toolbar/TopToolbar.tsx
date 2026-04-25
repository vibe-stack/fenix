import { useState } from 'react'
import type { RendererDiagnostics } from '../../../engine/core/types/platform'
import type { ViewportShadingMode } from '../../../editor/models/workspace'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { BackgroundPopover } from './BackgroundPopover'
import { ExportPopover } from './ExportPopover'
import { GraphFilePopover } from './GraphFilePopover'
import { NewFilePopover } from './NewFilePopover'

interface TopToolbarProps {
  diagnostics: RendererDiagnostics
}

const shadingModes: ViewportShadingMode[] = ['density', 'temperature', 'fuel']

export function TopToolbar({ diagnostics }: TopToolbarProps) {
  const dispatch = useEditorDispatch()
  const viewportState = useEditorStore((snapshot) => snapshot.viewportState)
  const [shadingOpen, setShadingOpen] = useState(false)

  return (
    <header className="flex h-8 shrink-0 items-center gap-px bg-(--fenix-topbar)">
      {/* App identity */}
      <div className="flex items-center px-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.36em] text-(--fenix-accent)">
          Fenix
        </span>
      </div>

      <div className="flex-1" />

      {/* Export — centered */}
      <ExportPopover />

      <div className="flex-1" />

      {/* Shading mode popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShadingOpen((o) => !o)}
          className={`flex h-8 items-center gap-1.5 px-3 text-[10px] tracking-[0.12em] transition-colors ${
            shadingOpen
              ? 'text-(--fenix-accent-soft)'
              : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              viewportState.shadingMode === 'density'
                ? 'bg-blue-400'
                : viewportState.shadingMode === 'temperature'
                  ? 'bg-(--fenix-accent)'
                  : 'bg-amber-400'
            }`}
          />
          {viewportState.shadingMode}
          <ChevronIcon />
        </button>

        {shadingOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShadingOpen(false)} />
            <div
              className="absolute right-0 top-full z-50 mt-px w-36"
              style={{
                background: 'var(--fenix-panel)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-[9px] uppercase tracking-[0.28em] text-(--fenix-text-muted)">Display mode</span>
              </div>
              <div className="py-1">
                {shadingModes.map((mode) => {
                  const isActive = mode === viewportState.shadingMode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'viewport/set-shading-mode', shadingMode: mode })
                        setShadingOpen(false)
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[10px] tracking-[0.08em] transition-colors"
                      style={{
                        color: isActive ? 'var(--fenix-accent-soft)' : 'var(--fenix-text-muted)',
                        background: isActive ? 'var(--fenix-active)' : 'transparent',
                      }}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          mode === 'density'
                            ? 'bg-blue-400'
                            : mode === 'temperature'
                              ? 'bg-(--fenix-accent)'
                              : 'bg-amber-400'
                        }`}
                      />
                      {mode}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <NewFilePopover />

      <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <GraphFilePopover />

      <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

      <BackgroundPopover />

      <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* GPU state */}
      <div className="flex items-center gap-2 px-4">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            diagnostics.supportState === 'ready' ? 'bg-(--fenix-success)' : 'bg-(--fenix-warning)'
          }`}
        />
        <span className="text-[10px] tracking-widest text-(--fenix-text-muted)">
          {diagnostics.supportState === 'ready' ? diagnostics.adapterName : 'no gpu adapter'}
        </span>
      </div>
    </header>
  )
}

function ChevronIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3l2 2 2-2" />
    </svg>
  )
}
