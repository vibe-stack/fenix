import type { VolumeDisplayMode } from '../../../engine/render/volumetrics/volumeDisplayMode'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { useViewportSurface } from '../../../features/viewport/useViewportSurface'

interface ViewportSurfaceProps {
  displayMode: VolumeDisplayMode
  rendererBridge: RendererBridge
  runtimeKey: string
}

export function ViewportSurface({ displayMode, rendererBridge, runtimeKey }: ViewportSurfaceProps) {
  const { containerRef, mountState, errorMessage } = useViewportSurface(
    displayMode,
    rendererBridge,
    runtimeKey,
  )

  return (
    <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(18,20,24,0.96),rgba(8,10,14,0.98))]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:30px_30px]" />

      {/* Corner status — runtime state only, no pills */}
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
