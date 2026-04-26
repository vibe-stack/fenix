import { useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import {
  applyRuntimeNodeParams,
  nodeStore,
  runtimeParamsFromNodeStore,
} from '../../../store/node-store/nodeStore'
import {
  applyNodeGraphState,
  resetNodeGraph,
  snapshotNodeGraph,
} from '../../../store/node-store/nodeGraphStore'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'
import { useSimulationHandle } from '../../../features/viewport/SimulationHandleContext'
import {
  serializeGraph,
  downloadGraphAsJson,
  parseGraphJson,
  type SerializedGraph,
} from '../../../editor/serialization/graphSerializer'
import {
  clonePresetRuntimeParams,
  getNewFilePreset,
} from '../../../editor/presets/newFilePresets'
import { defaultSimulationQualitySettings } from '../../../engine/simulation/runtime/combustion-volume-simulation/types'
import {
  loadEmitterPreset,
  loadLightPreset,
  loadRuntimeNodePreset,
} from '../../../store/node-store/nodeStore'

export function NewFileButton() {
  const dispatch = useEditorDispatch()
  const handle = useSimulationHandle()

  function handleNew() {
    const preset = getNewFilePreset('blank')
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
  }

  return (
    <button
      type="button"
      onClick={handleNew}
      title="New blank simulation"
      className="flex h-8 items-center gap-1.5 px-3 text-[10px] tracking-[0.12em] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text)"
    >
      <NewIcon />
      New
    </button>
  )
}

export function OpenGraphButton() {
  const dispatch = useEditorDispatch()
  const handle = useSimulationHandle()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    setError(null)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const graph = parseGraphJson(ev.target?.result as string)
        applySerializedGraph(graph, dispatch, handle)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={error ?? 'Open graph from JSON'}
        className={`flex h-8 items-center gap-1.5 px-3 text-[10px] tracking-[0.12em] transition-colors ${
          error
            ? 'text-(--fenix-warning)'
            : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        <OpenIcon />
        Open
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}

export function SaveGraphButton() {
  const runtimeParams = useEditorStore((s) => s.simulationState.runtimeParams)
  const qualitySettings = useEditorStore((s) => s.simulationState.qualitySettings)
  const snap = useSnapshot(nodeStore)

  function handleSave() {
    const graphRuntimeParams = runtimeParamsFromNodeStore(snap, runtimeParams)
    const graph = serializeGraph(
      graphRuntimeParams,
      snap.emitters as SerializedGraph['emitters'],
      snap.lights as SerializedGraph['lights'],
      snap.combustion,
      snap.advection,
      snap.wind,
      snap.gravity,
      snap.vorticity,
      snap.renderOutput,
      qualitySettings,
      snapshotNodeGraph(),
    )
    downloadGraphAsJson(graph)
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      title="Save graph as JSON"
      className="flex h-8 items-center gap-1.5 px-3 text-[10px] tracking-[0.12em] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text)"
    >
      <SaveIcon />
      Save
    </button>
  )
}

function applySerializedGraph(
  graph: SerializedGraph,
  dispatch: ReturnType<typeof useEditorDispatch>,
  handle: ReturnType<typeof useSimulationHandle>,
) {
  nodeStore.selectedId = null
  nodeStore.emitters = graph.emitters.map((e) => ({ ...e, props: { ...e.props } }))
  nodeStore.lights = graph.lights.map((l) => ({ ...l, props: { ...l.props } }))
  nodeStore.combustion = { ...graph.combustion }
  nodeStore.advection = { ...graph.advection }
  nodeStore.wind = { ...graph.wind }
  nodeStore.gravity = { ...graph.gravity }
  nodeStore.vorticity = { ...graph.vorticity }
  Object.assign(nodeStore.renderOutput, graph.renderOutput)
  if (graph.graph) {
    applyNodeGraphState(graph.graph)
  } else {
    resetNodeGraph(graph.emitters.length, graph.lights.length)
  }
  dispatch({
    type: 'simulation/set-runtime-params',
    params: {
      ...graph.runtimeParams,
      wind: [...graph.runtimeParams.wind] as [number, number, number],
      gravity: [...graph.runtimeParams.gravity] as [number, number, number],
    },
  })
  dispatch({ type: 'simulation/set-quality-settings', settings: graph.simulationQuality })
  applyRuntimeNodeParams(runtimeParamsFromNodeStore(nodeStore, graph.runtimeParams))
  handle?.reset()
}

function NewIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="8" height="8" rx="0.5" />
      <path d="M5.5 4v3M4 5.5h3" />
    </svg>
  )
}

function OpenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M1.5 4.5V9.5h8V4.5H6L5 3H1.5v1.5" />
      <path d="M1.5 4.5h8" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="1.5" y="1.5" width="8" height="8" rx="0.5" />
      <path d="M3.5 1.5v3h4v-3" />
      <rect x="3" y="6" width="5" height="3.5" rx="0.5" />
    </svg>
  )
}
