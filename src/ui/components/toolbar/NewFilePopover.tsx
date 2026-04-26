import { useState } from 'react'
import {
  clonePresetRuntimeParams,
  getNewFilePreset,
  newFilePresets,
} from '../../../editor/presets/newFilePresets'
import { defaultSimulationQualitySettings } from '../../../engine/simulation/runtime/combustion-volume-simulation/types'
import { useSimulationHandle } from '../../../features/viewport/SimulationHandleContext'
import {
  loadEmitterPreset,
  loadLightPreset,
  loadRuntimeNodePreset,
  nodeStore,
} from '../../../store/node-store/nodeStore'
import { resetNodeGraph } from '../../../store/node-store/nodeGraphStore'
import { useEditorDispatch } from '../../hooks/useEditorStore'

export function NewFilePopover() {
  const dispatch = useEditorDispatch()
  const handle = useSimulationHandle()
  const [open, setOpen] = useState(false)

  function applyPreset(presetId: string) {
    const preset = getNewFilePreset(presetId)

    loadEmitterPreset(preset)
    loadLightPreset(preset)
    loadRuntimeNodePreset(preset)
    resetNodeGraph(preset)
    Object.assign(nodeStore.renderOutput, {
      displayMode: 'temperature',
      stepCount: 400,
      scatteringForward: 0.32,
      scatteringBack: -0.18,
      ...preset.renderOutput,
    })
    dispatch({
      type: 'simulation/set-runtime-params',
      params: clonePresetRuntimeParams(preset),
    })
    dispatch({
      type: 'simulation/set-quality-settings',
      settings: defaultSimulationQualitySettings,
    })
    handle?.reset()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 items-center gap-1.5 px-3 text-[10px] tracking-[0.12em] transition-colors ${
          open
            ? 'text-(--fenix-accent-soft)'
            : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        New file
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute right-0 top-full z-50 mt-px w-96"
            style={{
              background: 'var(--fenix-panel)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[9px] uppercase tracking-[0.28em] text-(--fenix-text-muted)">
                Preset Gallery
              </span>
            </div>

            <div className="max-h-[min(70vh,640px)] overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {newFilePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className="group flex min-h-20 flex-col justify-between p-3 text-left transition-colors"
                    style={{
                      background: 'var(--fenix-row)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget
                      el.style.background = 'var(--fenix-active)'
                      el.style.borderColor = 'rgba(255,122,61,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget
                      el.style.background = 'var(--fenix-row)'
                      el.style.borderColor = 'rgba(255,255,255,0.04)'
                    }}
                  >
                    <span className="text-[10px] tracking-[0.08em] text-(--fenix-text) group-hover:text-(--fenix-accent-soft)">
                      {preset.label}
                    </span>
                    <span className="mt-2 text-[10px] leading-4 text-(--fenix-text-muted)">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-3 py-2 text-[10px] text-(--fenix-text-muted)" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              Replaces the current graph and resets the simulation volume.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
