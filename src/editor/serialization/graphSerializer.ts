import type { EmitterNodeProps, LightNodeProps, CombustionNodeProps, AdvectionNodeProps, RenderOutputNodeProps } from '../../engine/graph/schema/nodeProps'
import type { SimulationRuntimeParams } from '../../engine/simulation/runtime/combustion-volume-simulation/types'

export const GRAPH_FILE_VERSION = 2

export interface SerializedEmitter {
  id: string
  label: string
  props: EmitterNodeProps
}

export interface SerializedLight {
  id: string
  label: string
  props: LightNodeProps
}

export interface SerializedGraph {
  version: number
  runtimeParams: SimulationRuntimeParams
  emitters: SerializedEmitter[]
  lights: SerializedLight[]
  combustion: CombustionNodeProps
  advection: AdvectionNodeProps
  renderOutput: RenderOutputNodeProps
}

export function serializeGraph(
  runtimeParams: SimulationRuntimeParams,
  emitters: SerializedEmitter[],
  lights: SerializedLight[],
  combustion: CombustionNodeProps,
  advection: AdvectionNodeProps,
  renderOutput: RenderOutputNodeProps,
): SerializedGraph {
  return {
    version: GRAPH_FILE_VERSION,
    runtimeParams: { ...runtimeParams, wind: [...runtimeParams.wind] as [number, number, number] },
    emitters: emitters.map((e) => ({ id: e.id, label: e.label, props: { ...e.props } })),
    lights: lights.map((l) => ({ id: l.id, label: l.label, props: { ...l.props } })),
    combustion: { ...combustion },
    advection: { ...advection },
    renderOutput: { ...renderOutput },
  }
}

export function downloadGraphAsJson(graph: SerializedGraph, filename = 'fenix-graph.json') {
  const json = JSON.stringify(graph, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function parseGraphJson(raw: string): SerializedGraph {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('File is not valid JSON.')
  }

  if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid graph file.')
  const obj = parsed as Record<string, unknown>

  if (obj['version'] === 1) {
    throw new Error(
      'This file was saved with an older version of Fenix and is not compatible with the new emitter model. Please recreate the effect using the new emitter types.',
    )
  }

  if (obj['version'] !== GRAPH_FILE_VERSION) {
    throw new Error(
      `Unsupported graph version: ${obj['version']}. Expected ${GRAPH_FILE_VERSION}.`,
    )
  }

  if (!Array.isArray(obj['emitters'])) throw new Error('Missing emitters array.')
  if (!Array.isArray(obj['lights'])) throw new Error('Missing lights array.')
  if (typeof obj['runtimeParams'] !== 'object') throw new Error('Missing runtimeParams.')
  if (typeof obj['combustion'] !== 'object') throw new Error('Missing combustion node.')
  if (typeof obj['advection'] !== 'object') throw new Error('Missing advection node.')
  if (typeof obj['renderOutput'] !== 'object') throw new Error('Missing renderOutput node.')

  const graph = obj as unknown as SerializedGraph
  if (typeof graph.runtimeParams.worldSize !== 'number') {
    graph.runtimeParams.worldSize = 10
  }
  return graph
}
