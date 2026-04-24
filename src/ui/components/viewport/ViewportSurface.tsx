import type { CSSProperties } from 'react'
import type { ViewportBackgroundState } from '../../../editor/models/workspace'
import type { VolumeDisplayMode } from '../../../engine/render/volumetrics/volumeDisplayMode'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { useViewportSurface } from '../../../features/viewport/useViewportSurface'
import type { VolumeResolution } from '../../../engine/simulation/common/volumeResolution'

interface ViewportSurfaceProps {
  background: ViewportBackgroundState
  displayMode: VolumeDisplayMode
  rendererBridge: RendererBridge
  runtimeKey: string
  resolution: VolumeResolution
}

export function ViewportSurface({
  background,
  displayMode,
  rendererBridge,
  runtimeKey,
  resolution,
}: ViewportSurfaceProps) {
  const { containerRef, mountState, errorMessage } = useViewportSurface(
    displayMode,
    rendererBridge,
    runtimeKey,
    resolution,
  )
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
    <div className="relative flex-1 overflow-hidden bg-zinc-600/20">
      {backgroundStyle && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={backgroundStyle} />
        </div>
      )}

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
