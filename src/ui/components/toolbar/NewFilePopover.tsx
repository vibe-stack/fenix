import { useState } from 'react'
import {
  clonePresetRuntimeParams,
  getNewFilePreset,
  newFilePresets,
  type NewFilePresetId,
} from '../../../editor/presets/newFilePresets'
import { useSimulationHandle } from '../../../features/viewport/SimulationHandleContext'
import { loadEmitterPreset } from '../../../store/node-store/nodeStore'
import { resetNodeGraph } from '../../../store/node-store/nodeGraphStore'
import { useEditorDispatch } from '../../hooks/useEditorStore'

export function NewFilePopover() {
  const dispatch = useEditorDispatch()
  const handle = useSimulationHandle()
  const [open, setOpen] = useState(false)

  function applyPreset(presetId: NewFilePresetId) {
    const preset = getNewFilePreset(presetId)

    loadEmitterPreset(preset)
    resetNodeGraph(preset.emitters.length)
    dispatch({
      type: 'simulation/set-runtime-params',
      params: clonePresetRuntimeParams(preset),
    })
    handle?.reset()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 items-center gap-1.5 px-3 text-[10px] uppercase tracking-[0.2em] transition-colors ${
          open
            ? 'text-(--fenix-accent-soft)'
            : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        <span className={`h-1.5 w-1.5 ${open ? 'bg-(--fenix-accent)' : 'bg-(--fenix-border)'}`} />
        New File
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-px w-104 border border-(--fenix-border) bg-(--fenix-panel) shadow-xl">
            <div className="border-b border-(--fenix-border) px-3 py-2">
              <span className="text-[9px] uppercase tracking-[0.28em] text-(--fenix-text-muted)">
                Preset Gallery
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 px-3 py-3">
              {newFilePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="group flex min-h-24 flex-col justify-between border border-(--fenix-border) bg-(--fenix-row) px-3 py-2 text-left transition-colors hover:border-(--fenix-accent) hover:bg-(--fenix-active)"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-(--fenix-text) group-hover:text-(--fenix-accent-soft)">
                    {preset.label}
                  </span>
                  <span className="text-[10px] leading-4 text-(--fenix-text-muted)">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-(--fenix-border) px-3 py-2 text-[10px] text-(--fenix-text-muted)">
              Replaces the current graph and resets the simulation volume.
            </div>
          </div>
        </>
      )}
    </div>
  )
}