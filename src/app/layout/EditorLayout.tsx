import { InspectorPanel } from '../../ui/components/inspectors/InspectorPanel'
import { NodeGraphPreview } from '../../ui/components/node-editor/NodeGraphPreview'
import { WorkspacePanel } from '../../ui/components/panels/WorkspacePanel'
import { TimelinePanel } from '../../ui/components/timeline/TimelinePanel'
import { TopToolbar } from '../../ui/components/toolbar/TopToolbar'
import { ViewportCanvasCard } from '../../ui/components/viewport/ViewportCanvasCard'
import type { RendererDiagnostics } from '../../engine/core/types/platform'
import type { RendererBridge } from '../../engine/render/renderer/createRendererBridge'

interface EditorLayoutProps {
  diagnostics: RendererDiagnostics
  rendererBridge: RendererBridge
}

export function EditorLayout({ rendererBridge, diagnostics }: EditorLayoutProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <TopToolbar diagnostics={diagnostics} />

      <section className="grid flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <WorkspacePanel />
          <NodeGraphPreview />
        </div>

        <div className="flex min-h-[620px] flex-col gap-4">
          <ViewportCanvasCard diagnostics={diagnostics} rendererBridge={rendererBridge} />
          <TimelinePanel />
        </div>

        <InspectorPanel />
      </section>
    </main>
  )
}
