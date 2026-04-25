import type { NodeTypes } from '@xyflow/react'
import { EmitterNode } from './EmitterNode'
import { CombustionNode } from './CombustionNode'
import { AdvectionNode } from './AdvectionNode'
import { WindNode } from './WindNode'
import { VorticityNode } from './VorticityNode'
import { GravityNode } from './GravityNode'
import { LightNode } from './LightNode'
import { RenderOutputNode } from './RenderOutputNode'

export const graphNodeTypes: NodeTypes = {
  emitter: EmitterNode,
  combustion: CombustionNode,
  advection: AdvectionNode,
  wind: WindNode,
  vorticity: VorticityNode,
  gravity: GravityNode,
  light: LightNode,
  'render-output': RenderOutputNode,
}
