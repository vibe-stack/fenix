import { Panel } from '../panels/Panel'
import type { SimulationProfile } from '../../../editor/models/workspace'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

const simulationProfiles: SimulationProfile[] = [
  'Combustion Authoring Baseline',
  'Sparse Smoke Blocking',
  'Explosive Burst Draft',
]

export function InspectorPanel() {
  const dispatch = useEditorDispatch()
  const graphState = useEditorStore((snapshot) => snapshot.graphState)
  const projectState = useEditorStore((snapshot) => snapshot.projectState)
  const simulationState = useEditorStore((snapshot) => snapshot.simulationState)
  const viewportState = useEditorStore((snapshot) => snapshot.viewportState)
  const selectedNode = graphState.nodeCatalog.find(
    (node) => node.id === graphState.selectedNodeId,
  )

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Inspector"
        subtitle="Project, graph, and viewport details are surfaced from the editor store instead of being tucked into component-local state."
        status="baseline"
      >
        <DefinitionList
          rows={[
            ['Author', projectState.author],
            ['Revision', projectState.savedRevision],
            ['Units', projectState.units],
            ['Viewport', viewportState.activeCamera],
            ['Selected Node', selectedNode?.label ?? 'None'],
            ['Overlays', viewportState.overlays.join(', ')],
          ]}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {['bounds', 'guides', 'stats'].map((overlay) => {
            const isActive = viewportState.overlays.includes(overlay)

            return (
              <button
                key={overlay}
                type="button"
                onClick={() => {
                  dispatch({
                    type: 'viewport/toggle-overlay',
                    overlay,
                  })
                }}
                className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.2em] transition ${
                  isActive
                    ? 'border-[var(--fenix-border-strong)] bg-[rgba(255,122,61,0.14)] text-[var(--fenix-accent-soft)]'
                    : 'border-white/8 bg-black/12 text-[var(--fenix-text-muted)]'
                }`}
              >
                {overlay}
              </button>
            )
          })}
        </div>
      </Panel>

      <Panel
        title="Simulation Config"
        subtitle="Simulation presets are now command-driven so the editor shell starts behaving like a real tool."
        status={`${simulationState.stepRateHz} hz`}
      >
        <DefinitionList
          rows={[
            ['Profile', simulationState.profile],
            ['Solver', simulationState.solver],
            ['Domain', simulationState.domainResolution.join(' x ')],
            ['Brick Size', `${simulationState.sparseBrickSize} voxels`],
            ['Buoyancy', simulationState.temperatureBuoyancy.toFixed(2)],
            ['Caching', simulationState.cacheStrategy],
          ]}
        />

        <div className="mt-4 grid gap-2">
          {simulationProfiles.map((profile) => {
            const isActive = profile === simulationState.profile

            return (
              <button
                key={profile}
                type="button"
                onClick={() => {
                  dispatch({
                    type: 'simulation/set-profile',
                    profile,
                  })
                }}
                className={`rounded-[18px] border px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-[var(--fenix-border-strong)] bg-[rgba(255,122,61,0.12)]'
                    : 'border-white/6 bg-black/12 hover:border-[var(--fenix-border)]'
                }`}
              >
                <p className="text-sm font-medium text-[var(--fenix-text)]">{profile}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--fenix-text-muted)]">
                  {isActive ? 'Current simulation authoring profile.' : 'Switch simulation preset.'}
                </p>
              </button>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

interface DefinitionListProps {
  rows: Array<[string, string]>
}

function DefinitionList({ rows }: DefinitionListProps) {
  return (
    <dl className="space-y-3">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-start justify-between gap-3 rounded-[18px] border border-white/6 bg-black/12 px-4 py-3"
        >
          <dt className="text-xs uppercase tracking-[0.22em] text-[var(--fenix-text-muted)]">
            {label}
          </dt>
          <dd className="text-right text-sm font-medium text-[var(--fenix-text)]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
