import { useCallback, useState } from 'react'
import { InspectorPanel } from '../../ui/components/inspectors/InspectorPanel'
import { NodeGraphEditor } from '../../ui/components/node-editor/NodeGraphEditor'
import { TimelinePanel } from '../../ui/components/timeline/TimelinePanel'
import { TopToolbar } from '../../ui/components/toolbar/TopToolbar'
import { ViewportCanvasCard } from '../../ui/components/viewport/ViewportCanvasCard'
import { usePanelResize } from '../../ui/hooks/usePanelResize'
import { useVerticalPanelResize } from '../../ui/hooks/useVerticalPanelResize'
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
  const graph = usePanelResize(520, 240, 900)
  const timeline = useVerticalPanelResize(40, 40, 320)

  return (
    <SimulationHandleContext value={simulationHandle}>
      <div className="flex h-screen flex-col overflow-hidden bg-(--fenix-bg)">
        <TopToolbar diagnostics={diagnostics} />

        <div className="flex flex-1 overflow-hidden bg-(--fenix-bg)">
          {/* Left — viewport + timeline */}
          <div className="flex flex-1 flex-col gap-px overflow-hidden">
            <ViewportCanvasCard
              diagnostics={diagnostics}
              rendererBridge={rendererBridge}
              onHandleChange={onHandleChange}
            />
            <div
              onMouseDown={timeline.onMouseDown}
              style={{
                height: 4,
                flexShrink: 0,
                cursor: 'row-resize',
                background: 'var(--fenix-bg)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--fenix-accent)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--fenix-bg)' }}
            />
            <TimelinePanel height={timeline.height} />
          </div>

          {/* Resize handle between canvas and graph */}
          <div
            onMouseDown={graph.onMouseDown}
            style={{
              width: 4,
              flexShrink: 0,
              cursor: 'col-resize',
              background: 'var(--fenix-bg)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--fenix-accent)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--fenix-bg)' }}
          />

          {/* Center — node graph */}
          <div
            style={{ width: graph.width, flexShrink: 0 }}
            className="flex flex-col overflow-hidden bg-(--fenix-panel)"
          >
            <div
              className="flex shrink-0 items-center px-3"
              style={{
                height: 32,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'var(--fenix-section-head)',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fenix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Node Graph
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <NodeGraphEditor />
            </div>
          </div>

          {/* Right — inspector */}
          <div className="w-78 shrink-0 overflow-y-auto bg-(--fenix-panel)" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
            <InspectorPanel />
          </div>
        </div>
      </div>
    </SimulationHandleContext>
  )
}
