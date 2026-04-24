import { useEditorStore } from '../../hooks/useEditorStore'
import { SimulationParamsSection } from './SimulationParamsSection'
import { DomainSection } from './DomainSection'
import { ViewportSection } from './ViewportSection'
import { Panel } from '../panels/Panel'
import { StatRow } from '../common/StatRow'

export function InspectorPanel() {
  const graphState = useEditorStore((s) => s.graphState)
  const selectedNode = graphState.nodeCatalog.find((n) => n.id === graphState.selectedNodeId)

  return (
    <div>
      {selectedNode ? (
        <NodeInspector nodeId={selectedNode.id} label={selectedNode.label} category={selectedNode.category} />
      ) : (
        <GlobalInspector />
      )}
    </div>
  )
}

function GlobalInspector() {
  return (
    <>
      <SimulationParamsSection />
      <DomainSection />
      <ViewportSection />
    </>
  )
}

interface NodeInspectorProps {
  nodeId: string
  label: string
  category: string
}

function NodeInspector({ nodeId: _nodeId, label, category }: NodeInspectorProps) {
  return (
    <Panel title={label}>
      <StatRow label="Category" value={category} />
      <div className="px-3 py-4 text-[10px] text-(--fenix-text-muted)">
        No editable properties yet. Select parameters will appear here as node types are implemented.
      </div>
    </Panel>
  )
}
