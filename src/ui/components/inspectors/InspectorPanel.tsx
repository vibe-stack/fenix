import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../store/node-store/nodeStore'
import { SimulationParamsSection } from './SimulationParamsSection'
import { DomainSection } from './DomainSection'
import { ViewportSection } from './ViewportSection'
import { EmitterNodeInspector } from './nodes/EmitterNodeInspector'
import { CombustionNodeInspector } from './nodes/CombustionNodeInspector'
import { AdvectionNodeInspector } from './nodes/AdvectionNodeInspector'
import { LightNodeInspector } from './nodes/LightNodeInspector'
import { RenderOutputNodeInspector } from './nodes/RenderOutputNodeInspector'

export function InspectorPanel() {
  const snap = useSnapshot(nodeStore)

  return (
    <div>
      <NodeInspector selectedId={snap.selectedId} />
      <SimulationParamsSection />
      <DomainSection />
      <ViewportSection />
    </div>
  )
}

function NodeInspector({ selectedId }: { selectedId: string | null }) {
  if (!selectedId) return null
  if (selectedId === 'combustion') return <CombustionNodeInspector />
  if (selectedId === 'advection') return <AdvectionNodeInspector />
  if (selectedId === 'render-output') return <RenderOutputNodeInspector />
  if (selectedId.startsWith('light-')) return <LightNodeInspector id={selectedId} />
  if (selectedId.startsWith('emitter-')) return <EmitterNodeInspector id={selectedId} />
  return null
}
