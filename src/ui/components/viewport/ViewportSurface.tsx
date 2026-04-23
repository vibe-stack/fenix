import type { VolumeDisplayMode } from '../../../engine/render/volumetrics/volumeDisplayMode'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { useViewportSurface } from '../../../features/viewport/useViewportSurface'
import type { VolumeResolution } from '../../../engine/simulation/common/volumeResolution'

interface ViewportSurfaceProps {
  displayMode: VolumeDisplayMode
  rendererBridge: RendererBridge
  runtimeKey: string
  resolution: VolumeResolution
}

export function ViewportSurface({ displayMode, rendererBridge, runtimeKey, resolution }: ViewportSurfaceProps) {
  const { containerRef, mountState, errorMessage } = useViewportSurface(
    displayMode,
    rendererBridge,
    runtimeKey,
    resolution,
  )

  return (
    <div className="relative flex-1 overflow-hidden bg-zinc-600/20">
      <div ref={containerRef} className="absolute inset-0" />
      {/* <div className="pointer-events-none absolute inset-0 opacity-35" /> */}

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
