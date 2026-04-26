import type { GraphEdge } from './nodeGraphStore'
import { emitterPropsToSource, type EmitterInstance } from './nodeStore'
import type { EmitterSource } from '../../engine/simulation/emitters/emitterSource'

function isEmitterId(id: string): boolean {
  return id.startsWith('emitter-')
}

function isMaterialEmitter(emitter: EmitterInstance): boolean {
  return emitter.props.kind === 'scalar' || emitter.props.kind === 'burst'
}

function sourceWithPosition(source: EmitterSource, position: readonly [number, number, number]): EmitterSource {
  return { ...source, position: [position[0], position[1], position[2]] } as EmitterSource
}

function sourceWithRadius(source: EmitterSource, radius: number): EmitterSource {
  return { ...source, radius } as EmitterSource
}

function buildDirectedEdges(edges: readonly GraphEdge[]): Map<string, string[]> {
  const outgoing = new Map<string, string[]>()

  for (const edge of edges) {
    const list = outgoing.get(edge.source) ?? []
    list.push(edge.target)
    outgoing.set(edge.source, list)
  }

  return outgoing
}

function hasPathToCombustion(id: string, outgoing: Map<string, string[]>): boolean {
  const visited = new Set<string>()
  const stack = [id]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || visited.has(current)) continue
    if (current === 'combustion') return true

    visited.add(current)
    for (const next of outgoing.get(current) ?? []) {
      stack.push(next)
    }
  }

  return false
}

function buildUndirectedEmitterEdges(edges: readonly GraphEdge[]): Map<string, string[]> {
  const links = new Map<string, string[]>()

  for (const edge of edges) {
    if (!isEmitterId(edge.source) || !isEmitterId(edge.target)) continue

    const from = links.get(edge.source) ?? []
    const to = links.get(edge.target) ?? []
    from.push(edge.target)
    to.push(edge.source)
    links.set(edge.source, from)
    links.set(edge.target, to)
  }

  return links
}

function nearestMaterialEmitter(
  id: string,
  emittersById: Map<string, EmitterInstance>,
  links: Map<string, string[]>,
): EmitterInstance | null {
  const start = emittersById.get(id)
  if (!start || isMaterialEmitter(start)) return null

  const visited = new Set<string>()
  const queue = [id]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)

    const emitter = emittersById.get(current)
    if (emitter && isMaterialEmitter(emitter)) return emitter

    for (const next of links.get(current) ?? []) {
      queue.push(next)
    }
  }

  return null
}

/**
 * Turns the visible graph into simulation sources.
 *
 * Direct emitter→combustion links are global sources. Emitter→emitter chains are
 * grouped sources: connected velocity and igniter nodes inherit the nearest
 * material source position, so forces and ignition act as channels of that
 * source instead of as unrelated free-floating injectors.
 */
export function resolveEmitterSources(
  emitters: readonly EmitterInstance[],
  edges: readonly GraphEdge[],
): readonly EmitterSource[] {
  const outgoing = buildDirectedEdges(edges)
  const links = buildUndirectedEmitterEdges(edges)
  const emittersById = new Map(emitters.map((emitter) => [emitter.id, emitter]))
  const activeIds = new Set(
    emitters
      .filter((emitter) => hasPathToCombustion(emitter.id, outgoing))
      .map((emitter) => emitter.id),
  )

  return emitters
    .filter((emitter) => activeIds.has(emitter.id))
    .map((emitter) => {
      let source = emitterPropsToSource(emitter.props)
      const anchor = nearestMaterialEmitter(emitter.id, emittersById, links)

      if (anchor) {
        const anchorSource = emitterPropsToSource(anchor.props)
        source = sourceWithPosition(source, anchorSource.position)
        if (source.kind === 'igniter') {
          source = sourceWithRadius(source, Math.max(source.radius, anchorSource.radius))
        }
      }

      return source
    })
}
