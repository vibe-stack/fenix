import type { RendererDiagnostics } from '../../../engine/core/types/platform'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { useEditorStore } from '../../hooks/useEditorStore'
import { ViewportSurface } from './ViewportSurface'

interface ViewportCanvasCardProps {
  diagnostics: RendererDiagnostics
  rendererBridge: RendererBridge
}

export function ViewportCanvasCard({ diagnostics, rendererBridge }: ViewportCanvasCardProps) {
  const viewportState = useEditorStore((snapshot) => snapshot.viewportState)
  const runtimeKey = `${diagnostics.backend}:${diagnostics.supportState}:${viewportState.shadingMode}`

  return (
    <ViewportSurface
      displayMode={viewportState.shadingMode}
      rendererBridge={rendererBridge}
      runtimeKey={runtimeKey}
    />
  )
}
