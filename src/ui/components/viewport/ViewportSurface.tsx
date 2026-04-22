import type { ViewportMountState } from '../../../engine/core/types/platform'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { useViewportSurface } from '../../../features/viewport/useViewportSurface'

interface ViewportSurfaceProps {
  rendererBridge: RendererBridge
  runtimeKey: string
}

export function ViewportSurface({ rendererBridge, runtimeKey }: ViewportSurfaceProps) {
  const { containerRef, mountState, errorMessage } = useViewportSurface(rendererBridge, runtimeKey)

  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-[30px] border border-[var(--fenix-border)] bg-[radial-gradient(circle_at_top,rgba(255,122,61,0.16),transparent_26%),linear-gradient(180deg,#1a1411_0%,#120d0b_100%)]">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),transparent_22%,transparent_72%,rgba(0,0,0,0.38))]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
        <ViewportOverlayPill label="Scene Host" value={labelForState(mountState)} />
        {errorMessage ? <ViewportOverlayPill label="Error" value={errorMessage} /> : null}
      </div>
    </div>
  )
}

interface ViewportOverlayPillProps {
  label: string
  value: string
}

function ViewportOverlayPill({ label, value }: ViewportOverlayPillProps) {
  return (
    <div className="max-w-[18rem] rounded-full border border-white/8 bg-black/28 px-3 py-2 backdrop-blur">
      <p className="text-[9px] uppercase tracking-[0.26em] text-[var(--fenix-text-muted)]">{label}</p>
      <p className="mt-1 text-xs font-medium text-[var(--fenix-text)]">{value}</p>
    </div>
  )
}

function labelForState(mountState: ViewportMountState) {
  switch (mountState) {
    case 'booting':
      return 'Booting renderer'
    case 'live':
      return 'Live preview'
    case 'failed':
      return 'Runtime failed'
  }
}
