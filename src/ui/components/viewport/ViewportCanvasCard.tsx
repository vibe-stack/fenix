import type { RendererDiagnostics, SimulationHandle } from '../../../engine/core/types/platform'
import type { RendererBridge } from '../../../engine/render/renderer/createRendererBridge'
import { useMemo } from 'react'
import { useEditorStore } from '../../hooks/useEditorStore'
import { ViewportSurface } from './ViewportSurface'

interface ViewportCanvasCardProps {
  diagnostics: RendererDiagnostics
  rendererBridge: RendererBridge
  onHandleChange: (handle: SimulationHandle | null) => void
}

export function ViewportCanvasCard({ diagnostics, rendererBridge, onHandleChange }: ViewportCanvasCardProps) {
  const viewportState = useEditorStore((snapshot) => snapshot.viewportState)
  const simulationState = useEditorStore((snapshot) => snapshot.simulationState)
  const [width, height, depth] = simulationState.domainResolution
  const runtimeKey = `${diagnostics.backend}:${diagnostics.supportState}:${viewportState.shadingMode}:${width}x${height}x${depth}`
  const resolution = useMemo(() => ({ width, height, depth }), [width, height, depth])

  return (
    <ViewportSurface
      background={viewportState.background}
      displayMode={viewportState.shadingMode}
      overlays={viewportState.overlays}
      rendererBridge={rendererBridge}
      runtimeKey={runtimeKey}
      resolution={resolution}
      onHandleChange={onHandleChange}
    />
  )
}
