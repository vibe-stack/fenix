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
  const viewportBackground = viewportState.background
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

      <Panel title="Canvas Background">
        <div className="space-y-3 px-3 py-3">
          <div className="flex items-center gap-2">
            <label className="flex h-8 flex-1 cursor-pointer items-center justify-center border border-(--fenix-border) bg-(--fenix-row) px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-(--fenix-text) transition-colors hover:border-(--fenix-accent) hover:text-(--fenix-accent-soft)">
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const input = event.currentTarget
                  const file = input.files?.[0]

                  if (!file) {
                    return
                  }

                  void readFileAsDataUrl(file)
                    .then((imageDataUrl) => {
                      dispatch({
                        type: 'viewport/set-background-image',
                        imageDataUrl,
                        imageName: file.name,
                      })
                    })
                    .catch((error: unknown) => {
                      console.error(error)
                    })
                    .finally(() => {
                      input.value = ''
                    })
                }}
              />
            </label>

            <button
              type="button"
              disabled={!viewportBackground.imageDataUrl}
              onClick={() => {
                dispatch({
                  type: 'viewport/set-background-image',
                  imageDataUrl: null,
                  imageName: null,
                })
              }}
              className="h-8 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text) disabled:cursor-not-allowed disabled:opacity-35"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-(--fenix-text-muted)">
              Image
            </span>
            <span className="truncate text-right text-xs text-(--fenix-text)">
              {viewportBackground.imageName ?? 'None loaded'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
                Offset X
              </span>
              <input
                type="number"
                step={1}
                value={viewportBackground.offsetX}
                onChange={(event) => {
                  dispatch({
                    type: 'viewport/set-background-offset',
                    offsetX: clampViewportOffset(Number(event.target.value)),
                    offsetY: viewportBackground.offsetY,
                  })
                }}
                className="h-8 w-full border border-(--fenix-border) bg-(--fenix-bg) px-2 text-xs tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
                Offset Y
              </span>
              <input
                type="number"
                step={1}
                value={viewportBackground.offsetY}
                onChange={(event) => {
                  dispatch({
                    type: 'viewport/set-background-offset',
                    offsetX: viewportBackground.offsetX,
                    offsetY: clampViewportOffset(Number(event.target.value)),
                  })
                }}
                className="h-8 w-full border border-(--fenix-border) bg-(--fenix-bg) px-2 text-xs tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
                Scale
              </span>
              <input
                type="number"
                min={0.1}
                max={5}
                step={0.05}
                value={viewportBackground.scale}
                onChange={(event) => {
                  dispatch({
                    type: 'viewport/set-background-scale',
                    scale: clampViewportScale(Number(event.target.value)),
                  })
                }}
                className="h-8 w-full border border-(--fenix-border) bg-(--fenix-bg) px-2 text-xs tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
              />
            </label>
          </div>
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

function clampViewportOffset(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(value)
}

function clampViewportScale(value: number) {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.max(0.1, Math.min(5, Math.round(value * 100) / 100))
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)

        return
      }

      reject(new Error('Image upload returned an unexpected result.'))
    })

    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('Image upload failed.'))
    })

    reader.readAsDataURL(file)
  })
}
