import { useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { nodeStore, loadEmitterPreset, loadLightPreset } from '../../../store/node-store/nodeStore'
import { nodeGraphStore, resetNodeGraph } from '../../../store/node-store/nodeGraphStore'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { useSimulationHandle } from '../../../features/viewport/SimulationHandleContext'
import {
  serializeGraph,
  downloadGraphAsJson,
  parseGraphJson,
  type SerializedGraph,
} from '../../../editor/serialization/graphSerializer'

export function GraphFilePopover() {
  const dispatch = useEditorDispatch()
  const handle = useSimulationHandle()
  const runtimeParams = useEditorStore((s) => s.simulationState.runtimeParams)
  const snap = useSnapshot(nodeStore)
  const [open, setOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const graph = serializeGraph(
      runtimeParams,
      snap.emitters as SerializedGraph['emitters'],
      snap.lights as SerializedGraph['lights'],
      snap.combustion,
      snap.advection,
      snap.renderOutput,
    )
    downloadGraphAsJson(graph)
    setOpen(false)
  }

  function handleImportClick() {
    setImportError(null)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const graph = parseGraphJson(ev.target?.result as string)
        applySerializedGraph(graph)
        setOpen(false)
        setImportError(null)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Unknown error.')
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported after edits
    e.target.value = ''
  }

  function applySerializedGraph(graph: SerializedGraph) {
    nodeStore.selectedId = null
    nodeStore.emitters = graph.emitters.map((e) => ({ ...e, props: { ...e.props } }))
    nodeStore.lights = graph.lights.map((l) => ({ ...l, props: { ...l.props } }))
    nodeStore.combustion = { ...graph.combustion }
    nodeStore.advection = { ...graph.advection }
    Object.assign(nodeStore.renderOutput, graph.renderOutput)
    resetNodeGraph(graph.emitters.length, graph.lights.length)
    dispatch({ type: 'simulation/set-runtime-params', params: { ...graph.runtimeParams, wind: [...graph.runtimeParams.wind] as [number, number, number] } })
    handle?.reset()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setImportError(null) }}
        className={`flex h-8 items-center gap-1.5 px-3 text-[10px] tracking-[0.12em] transition-colors ${
          open
            ? 'text-(--fenix-accent-soft)'
            : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        Graph
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full z-50 mt-px w-64"
            style={{
              background: 'var(--fenix-panel)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[9px] uppercase tracking-[0.28em] text-(--fenix-text-muted)">
                Graph File
              </span>
            </div>

            <div className="flex flex-col gap-px p-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[10px] tracking-[0.08em] transition-colors"
                style={{ color: 'var(--fenix-text)', background: 'var(--fenix-row)', border: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fenix-active)'; e.currentTarget.style.borderColor = 'rgba(255,122,61,0.3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fenix-row)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
              >
                <DownloadIcon />
                Save graph as JSON
              </button>

              <button
                type="button"
                onClick={handleImportClick}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[10px] tracking-[0.08em] transition-colors"
                style={{ color: 'var(--fenix-text)', background: 'var(--fenix-row)', border: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--fenix-active)'; e.currentTarget.style.borderColor = 'rgba(255,122,61,0.3)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--fenix-row)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
              >
                <UploadIcon />
                Load graph from JSON
              </button>
            </div>

            {importError && (
              <div
                className="px-3 py-2 text-[10px] leading-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'var(--fenix-warning)' }}
              >
                {importError}
              </div>
            )}

            <div
              className="px-3 py-2 text-[10px] leading-4 text-(--fenix-text-muted)"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              Replaces the current graph. Exported files include all emitters, lights, and simulation parameters.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5.5 1v6M3 5l2.5 2.5L8 5" />
      <path d="M1 9.5h9" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5.5 7V1M3 3l2.5-2.5L8 3" />
      <path d="M1 9.5h9" />
    </svg>
  )
}
