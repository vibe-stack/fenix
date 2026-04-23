import { Panel } from '../panels/Panel'
import type { SimulationProfile } from '../../../editor/models/workspace'
import { useMemo, useState } from 'react'
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
  const selectedNode = graphState.nodeCatalog.find((node) => node.id === graphState.selectedNodeId)
  const [domainDraft, setDomainDraft] = useState<[number, number, number]>(
    simulationState.domainResolution,
  )
  const domainVoxelCount = useMemo(
    () => domainDraft[0] * domainDraft[1] * domainDraft[2],
    [domainDraft],
  )
  const domainChanged = domainDraft.some(
    (value, index) => value !== simulationState.domainResolution[index],
  )

  return (
    <div>
      {/* Project properties */}
      <Panel title="Properties">
        <dl>
          {(
            [
              ['Author', projectState.author],
              ['Revision', projectState.savedRevision],
              ['Units', projectState.units],
              ['Camera', viewportState.activeCamera],
              ['Node', selectedNode?.label ?? 'None'],
            ] as Array<[string, string]>
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between px-3 py-2 odd:bg-(--fenix-row-alt)"
            >
              <dt className="text-[9px] uppercase tracking-[0.22em] text-(--fenix-text-muted)">
                {label}
              </dt>
              <dd className="text-xs text-(--fenix-text)">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      {/* Overlay toggles */}
      <Panel title="Overlays">
        <div className="flex flex-col gap-px">
          {['bounds', 'guides', 'stats'].map((overlay) => {
            const isActive = viewportState.overlays.includes(overlay)
            return (
              <button
                key={overlay}
                type="button"
                onClick={() => dispatch({ type: 'viewport/toggle-overlay', overlay })}
                className={`flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-(--fenix-active)' : 'hover:bg-(--fenix-row)'
                }`}
              >
                <span
                  className={`text-xs uppercase tracking-[0.2em] ${
                    isActive ? 'text-(--fenix-accent-soft)' : 'text-(--fenix-text-muted)'
                  }`}
                >
                  {overlay}
                </span>
                <span
                  className={`h-1 w-1 ${isActive ? 'bg-(--fenix-accent)' : 'bg-transparent'}`}
                />
              </button>
            )
          })}
        </div>
      </Panel>

      {/* Simulation config */}
      <Panel title="Simulation">
        <dl>
          {(
            [
              ['Profile', simulationState.profile],
              ['Solver', simulationState.solver],
              ['Domain', simulationState.domainResolution.join(' × ')],
              ['Brick', `${simulationState.sparseBrickSize} vox`],
              ['Buoyancy', simulationState.temperatureBuoyancy.toFixed(2)],
              ['Cache', simulationState.cacheStrategy],
              ['Rate', `${simulationState.stepRateHz} Hz`],
            ] as Array<[string, string]>
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between px-3 py-2 odd:bg-(--fenix-row-alt)"
            >
              <dt className="text-[9px] uppercase tracking-[0.22em] text-(--fenix-text-muted)">
                {label}
              </dt>
              <dd className="text-xs text-(--fenix-text)">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Domain">
        <div className="space-y-3 px-3 py-3">
          <div className="grid grid-cols-3 gap-2">
            {(['W', 'H', 'D'] as const).map((axis, index) => (
              <label key={axis} className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
                  {axis}
                </span>
                <input
                  type="number"
                  min={32}
                  max={512}
                  step={8}
                  value={domainDraft[index]}
                  onChange={(event) => {
                    const nextValue = clampDomainInput(Number(event.target.value))

                    setDomainDraft((current) => {
                      const next = [...current] as [number, number, number]

                      next[index] = nextValue

                      return next
                    })
                  }}
                  className="h-8 w-full border border-(--fenix-border) bg-(--fenix-bg) px-2 text-xs tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.18em] text-(--fenix-text-muted)">
              Voxels
            </span>
            <span className="text-xs tabular-nums text-(--fenix-text)">
              {domainVoxelCount.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            disabled={!domainChanged}
            onClick={() => {
              dispatch({
                type: 'simulation/set-domain-resolution',
                resolution: domainDraft,
              })
            }}
            className="h-8 w-full bg-(--fenix-accent) px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
          >
            Recompile
          </button>
        </div>
      </Panel>

      {/* Sim profile selection */}
      <Panel title="Sim Profile">
        <div className="flex flex-col gap-px">
          {simulationProfiles.map((profile) => {
            const isActive = profile === simulationState.profile
            return (
              <button
                key={profile}
                type="button"
                onClick={() => dispatch({ type: 'simulation/set-profile', profile })}
                className={`px-3 py-2.5 text-left text-xs transition-colors ${
                  isActive
                    ? 'bg-(--fenix-active) text-(--fenix-accent-soft)'
                    : 'text-(--fenix-text-muted) hover:bg-(--fenix-row) hover:text-(--fenix-text)'
                }`}
              >
                {profile}
              </button>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function clampDomainInput(value: number) {
  if (!Number.isFinite(value)) {
    return 32
  }

  return Math.max(32, Math.min(512, Math.round(value / 8) * 8))
}
