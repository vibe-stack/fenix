import type { NodeTypes } from '@xyflow/react'
import { EmitterNode } from './EmitterNode'
import { CombustionNode } from './CombustionNode'
import { AdvectionNode } from './AdvectionNode'
import { LightNode } from './LightNode'
import { RenderOutputNode } from './RenderOutputNode'

export const graphNodeTypes: NodeTypes = {
  emitter: EmitterNode,
  combustion: CombustionNode,
  advection: AdvectionNode,
  light: LightNode,
  'render-output': RenderOutputNode,
}
