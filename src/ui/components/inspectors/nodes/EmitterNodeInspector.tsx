import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { ScalarEmitterInspector } from './ScalarEmitterInspector'
import { VelocityEmitterInspector } from './VelocityEmitterInspector'
import { IgniterEmitterInspector } from './IgniterEmitterInspector'

export function EmitterNodeInspector({ id }: { id: string }) {
  const snap = useSnapshot(nodeStore)
  const emitter = snap.emitters.find((e) => e.id === id)
  if (!emitter) return null

  if (emitter.props.kind === 'scalar') return <ScalarEmitterInspector id={id} />
  if (emitter.props.kind === 'velocity') return <VelocityEmitterInspector id={id} />
  return <IgniterEmitterInspector id={id} />
}
