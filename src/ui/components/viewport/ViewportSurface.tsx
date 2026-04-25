import { useEffect, type CSSProperties } from 'react'
import type { ViewportBackgroundState } from '../../../editor/models/workspace'
import type { VolumeDisplayMode } from '../../../engine/render/volumetrics/volumeDisplayMode'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import type { VolumeResolution } from '../../../engine/simulation/common/volumeResolution'
import type { RendererDiagnostics, SimulationHandle } from '../../../engine/core/types/platform'
import { useViewportSurface } from '../../../features/viewport/useViewportSurface'
import { useSimulationBridge } from '../../../features/viewport/useSimulationBridge'
import { useSourceBridge } from '../../../features/viewport/useSourceBridge'
import { useRenderOutputBridge } from '../../../features/viewport/useRenderOutputBridge'
import { useEditorStore } from '../../hooks/useEditorStore'
import { useSnapshot } from 'valtio'
import { nodeStore, runtimeParamsFromNodeStore } from '../../../store/node-store/nodeStore'

interface ViewportSurfaceProps {
  background: ViewportBackgroundState
  diagnostics: RendererDiagnostics
  displayMode: VolumeDisplayMode
  overlays: string[]
  rendererBridge: RendererBridge
  runtimeKey: string
  resolution: VolumeResolution
  onHandleChange: (handle: SimulationHandle | null) => void
}

export function ViewportSurface({
  background,
  diagnostics,
  displayMode,
  overlays,
  rendererBridge,
  runtimeKey,
  resolution,
  onHandleChange,
}: ViewportSurfaceProps) {
  const runtimeParams = useEditorStore((s) => s.simulationState.runtimeParams)
  const qualitySettings = useEditorStore((s) => s.simulationState.qualitySettings)
  const nodeSnap = useSnapshot(nodeStore)
  const graphRuntimeParams = runtimeParamsFromNodeStore(nodeSnap, runtimeParams)
  const { containerRef, mountState, errorMessage, simulationHandle } = useViewportSurface(
    displayMode,
    rendererBridge,
    runtimeKey,
    resolution,
  )

  useSimulationBridge(simulationHandle, graphRuntimeParams, qualitySettings)
  useSourceBridge(simulationHandle)
  useRenderOutputBridge(simulationHandle)

  useEffect(() => {
    onHandleChange(simulationHandle)
  }, [simulationHandle, onHandleChange])

  const backgroundStyle: CSSProperties | undefined = background.imageDataUrl
    ? {
        backgroundImage: `url(${background.imageDataUrl})`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain',
        transform: `translate(${background.offsetX}px, ${background.offsetY}px) scale(${background.scale})`,
        transformOrigin: 'center center',
      }
    : undefined

  return (
    <div className="relative flex-1 overflow-hidden" style={{ backgroundColor: background.color }}>
      {backgroundStyle && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={backgroundStyle} />
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0" />

      {overlays.includes('guides') && <ViewportGuidesOverlay />}
      {overlays.includes('bounds') && <ViewportBoundsOverlay />}
      {overlays.includes('stats') && (
        <ViewportStatsOverlay
          diagnostics={diagnostics}
          displayMode={displayMode}
          mountState={mountState}
          resolution={resolution}
          worldSize={graphRuntimeParams.worldSize}
        />
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2">
        <span
          className={`h-1 w-1 ${mountState === 'live' ? 'bg-(--fenix-success)' : mountState === 'failed' ? 'bg-red-500' : 'bg-(--fenix-warning)'}`}
        />
        <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
          {mountState}
        </span>
        {errorMessage && (
          <span className="text-[9px] uppercase tracking-[0.2em] text-red-400">{errorMessage}</span>
        )}
      </div>
    </div>
  )
}

function ViewportGuidesOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
      <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />
      <div className="absolute left-1/3 top-0 h-full w-px bg-white/[0.045]" />
      <div className="absolute left-2/3 top-0 h-full w-px bg-white/[0.045]" />
      <div className="absolute left-0 top-1/3 h-px w-full bg-white/[0.045]" />
      <div className="absolute left-0 top-2/3 h-px w-full bg-white/[0.045]" />
    </div>
  )
}

function ViewportBoundsOverlay() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-(--fenix-accent)"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M30 27 L72 20 L80 65 L37 76 Z M22 37 L64 30 L72 74 L29 85 Z M30 27 L22 37 M72 20 L64 30 M80 65 L72 74 M37 76 L29 85"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.72"
        strokeWidth="0.35"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M22 85 L80 85 M22 85 L22 78 M51 85 L51 81 M80 85 L80 78"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.42"
        strokeWidth="0.3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function ViewportStatsOverlay({
  diagnostics,
  displayMode,
  mountState,
  resolution,
  worldSize,
}: {
  diagnostics: RendererDiagnostics
  displayMode: VolumeDisplayMode
  mountState: string
  resolution: VolumeResolution
  worldSize: number
}) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 min-w-44 border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-sm">
      <div className="flex justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
        <span>Backend</span>
        <span className="text-(--fenix-text)">{diagnostics.backend}</span>
      </div>
      <div className="mt-1 flex justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
        <span>Mode</span>
        <span className="text-(--fenix-text)">{displayMode}</span>
      </div>
      <div className="mt-1 flex justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
        <span>Volume</span>
        <span className="text-(--fenix-text)">
          {resolution.width}x{resolution.height}x{resolution.depth}
        </span>
      </div>
      <div className="mt-1 flex justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
        <span>World</span>
        <span className="text-(--fenix-text)">{worldSize.toFixed(0)}</span>
      </div>
      <div className="mt-1 flex justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
        <span>State</span>
        <span className="text-(--fenix-text)">{mountState}</span>
      </div>
    </div>
  )
}
