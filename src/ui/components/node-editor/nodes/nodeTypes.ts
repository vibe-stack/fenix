import type { NodeTypes } from '@xyflow/react'
import { EmitterNode } from './EmitterNode'
import { CombustionNode } from './CombustionNode'
import { AdvectionNode } from './AdvectionNode'
import { RenderOutputNode } from './RenderOutputNode'

export const graphNodeTypes: NodeTypes = {
  emitter: EmitterNode,
  combustion: CombustionNode,
  advection: AdvectionNode,
  'render-output': RenderOutputNode,
}
