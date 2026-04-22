import { Panel } from '../panels/Panel'
import type { ViewportShadingMode } from '../../../editor/models/workspace'
import type { RendererDiagnostics } from '../../../engine/core/types/platform'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { ViewportSurface } from './ViewportSurface'

interface ViewportCanvasCardProps {
  diagnostics: RendererDiagnostics
  rendererBridge: RendererBridge
}

export function ViewportCanvasCard({
  diagnostics,
  rendererBridge,
}: ViewportCanvasCardProps) {
  const dispatch = useEditorDispatch()
  const projectState = useEditorStore((snapshot) => snapshot.projectState)
  const simulationState = useEditorStore((snapshot) => snapshot.simulationState)
  const viewportState = useEditorStore((snapshot) => snapshot.viewportState)
  const statusTone = diagnostics.supportState === 'ready' ? 'success' : 'warning'
  const runtimeKey = `${diagnostics.backend}:${diagnostics.supportState}`
  const shadingModes: ViewportShadingMode[] = ['temperature', 'density', 'velocity']

  return (
    <Panel
      title="Viewport"
      subtitle="Three.js scene ownership now lives in an engine runtime instead of a React placeholder surface."
      status={diagnostics.supportState}
      statusTone={statusTone}
      className="flex-1"
    >
      <div className="space-y-4">
        <ViewportSurface rendererBridge={rendererBridge} runtimeKey={runtimeKey} />

        <div className="grid gap-3 xl:grid-cols-[1.6fr_0.8fr]">
          <div className="rounded-[24px] border border-white/6 bg-black/12 p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--fenix-accent-soft)]">
              Renderer Bridge
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--fenix-text)]">
              {diagnostics.supportState === 'ready'
                ? 'WebGPU path active'
                : 'Compatibility renderer path active'}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--fenix-text-muted)]">
              {diagnostics.message} The viewport is now mounted through an engine runtime that owns
              renderer initialization, camera setup, controls, and frame execution separately from
              the React panel shell.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/6 bg-black/12 p-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--fenix-text-muted)]">
              Adapter
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--fenix-text)]">
              {diagnostics.adapterName}
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-[var(--fenix-text-muted)]">
              Backend Target
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--fenix-text)]">
              {rendererBridge.backendTarget}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Domain" value={simulationState.domainResolution.join(' x ')} />
          <MetricCard label="Sparse Bricks" value={`${simulationState.sparseBrickSize} vox`} />
          <MetricCard label="Shading" value={viewportState.shadingMode} />
          <MetricCard label="Project Units" value={projectState.units} />
        </div>

        <div className="flex flex-wrap gap-2">
          {shadingModes.map((shadingMode) => {
            const isActive = shadingMode === viewportState.shadingMode

            return (
              <button
                key={shadingMode}
                type="button"
                onClick={() => {
                  dispatch({
                    type: 'viewport/set-shading-mode',
                    shadingMode,
                  })
                }}
                className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.22em] transition ${
                  isActive
                    ? 'border-[var(--fenix-border-strong)] bg-[rgba(255,122,61,0.14)] text-[var(--fenix-accent-soft)]'
                    : 'border-white/8 bg-black/12 text-[var(--fenix-text-muted)]'
                }`}
              >
                {shadingMode}
              </button>
            )
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <ArchitectureCard
            title="Simulation"
            body="Runtime logic is represented separately from UI state so the eventual solver can execute without React ownership."
          />
          <ArchitectureCard
            title="Rendering"
            body="A dedicated viewport runtime now owns scene, camera, controls, resize handling, and renderer execution."
          />
          <ArchitectureCard
            title="Export"
            body="Export paths remain unimplemented, but the layout already reserves room for offline assets and sequence workflows."
          />
        </div>
      </div>
    </Panel>
  )
}

interface MetricCardProps {
  label: string
  value: string
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-[22px] border border-white/7 bg-black/18 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--fenix-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-base font-medium text-[var(--fenix-text)]">{value}</p>
    </div>
  )
}

interface ArchitectureCardProps {
  title: string
  body: string
}

function ArchitectureCard({ title, body }: ArchitectureCardProps) {
  return (
    <div className="rounded-[24px] border border-white/6 bg-white/4 p-4">
      <p className="text-sm font-semibold text-[var(--fenix-text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--fenix-text-muted)]">{body}</p>
    </div>
  )
}
