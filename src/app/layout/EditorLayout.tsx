import { useCallback, useState } from 'react'
import { InspectorPanel } from '../../ui/components/inspectors/InspectorPanel'
import { NodeGraphPreview } from '../../ui/components/node-editor/NodeGraphPreview'
import { WorkspacePanel } from '../../ui/components/panels/WorkspacePanel'
import { TimelinePanel } from '../../ui/components/timeline/TimelinePanel'
import { TopToolbar } from '../../ui/components/toolbar/TopToolbar'
import { ViewportCanvasCard } from '../../ui/components/viewport/ViewportCanvasCard'
import type { RendererDiagnostics, SimulationHandle } from '../../engine/core/types/platform'
import type { RendererBridge } from '../../engine/render/renderer/createRendererBridge'
import { SimulationHandleContext } from '../../features/viewport/SimulationHandleContext'

interface EditorLayoutProps {
  diagnostics: RendererDiagnostics
  rendererBridge: RendererBridge
}

export function EditorLayout({ rendererBridge, diagnostics }: EditorLayoutProps) {
  const [simulationHandle, setSimulationHandle] = useState<SimulationHandle | null>(null)
  const onHandleChange = useCallback((h: SimulationHandle | null) => setSimulationHandle(h), [])

  return (
    <SimulationHandleContext value={simulationHandle}>
      <div className="flex h-screen flex-col overflow-hidden bg-(--fenix-bg)">
        <TopToolbar diagnostics={diagnostics} />

        <div className="flex flex-1 gap-px overflow-hidden bg-(--fenix-bg)">
          {/* Left sidebar */}
          <div className="flex w-52 shrink-0 flex-col overflow-y-auto bg-(--fenix-panel)">
            <WorkspacePanel />
            <NodeGraphPreview />
          </div>

          {/* Center — viewport + timeline */}
          <div className="flex flex-1 flex-col gap-px overflow-hidden">
            <ViewportCanvasCard
              diagnostics={diagnostics}
              rendererBridge={rendererBridge}
              onHandleChange={onHandleChange}
            />
            <TimelinePanel />
          </div>

          {/* Right inspector */}
          <div className="w-60 shrink-0 overflow-y-auto bg-(--fenix-panel)">
            <InspectorPanel />
          </div>
        </div>
      </div>
    </SimulationHandleContext>
  )
}
