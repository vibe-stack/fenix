import { useMemo, useState } from 'react'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { Panel } from '../panels/Panel'

export function DomainSection() {
  const dispatch = useEditorDispatch()
  const domainResolution = useEditorStore((s) => s.simulationState.domainResolution)
  const [draft, setDraft] = useState<[number, number, number]>(domainResolution)
  const voxelCount = useMemo(() => draft[0] * draft[1] * draft[2], [draft])
  const changed = draft.some((v, i) => v !== domainResolution[i])

  return (
    <Panel title="Domain">
      <div className="space-y-3 px-3 py-3">
        <div className="grid grid-cols-3 gap-2">
          {(['W', 'H', 'D'] as const).map((axis, i) => (
            <label key={axis} className="flex flex-col gap-1">
              <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">{axis}</span>
              <input
                type="number"
                min={32}
                max={512}
                step={8}
                value={draft[i]}
                onChange={(e) => {
                  const v = Math.max(32, Math.min(512, Math.round(Number(e.target.value) / 8) * 8))
                  setDraft((cur) => { const next = [...cur] as [number, number, number]; next[i] = v; return next })
                }}
                className="h-7 w-full border border-(--fenix-border) bg-(--fenix-bg) px-2 text-xs tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.18em] text-(--fenix-text-muted)">Voxels</span>
          <span className="text-xs tabular-nums text-(--fenix-text)">{voxelCount.toLocaleString()}</span>
        </div>

        <button
          type="button"
          disabled={!changed}
          onClick={() => dispatch({ type: 'simulation/set-domain-resolution', resolution: draft })}
          className="h-7 w-full bg-(--fenix-accent) px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
        >
          Recompile
        </button>
      </div>
    </Panel>
  )
}
