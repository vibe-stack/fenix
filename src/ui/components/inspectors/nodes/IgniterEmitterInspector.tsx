import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import type { IgniterEmitterNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'

export function IgniterEmitterInspector({ id }: { id: string }) {
  const snap = useSnapshot(nodeStore)
  const index = snap.emitters.findIndex((e) => e.id === id)
  if (index === -1) return null

  const props = snap.emitters[index].props
  if (props.kind !== 'igniter') return null

  function set<K extends keyof IgniterEmitterNodeProps>(key: K, value: IgniterEmitterNodeProps[K]) {
    const e = nodeStore.emitters[index]
    if (e.props.kind === 'igniter') (e.props as IgniterEmitterNodeProps)[key] = value
  }

  return (
    <Panel title={snap.emitters[index].label}>
      <SectionDivider label="Position" />
      <SliderRow label="X" value={props.positionX} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionX', v)} />
      <SliderRow label="Y" value={props.positionY} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionY', v)} />
      <SliderRow label="Z" value={props.positionZ} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionZ', v)} />
      <SliderRow label="Radius" value={props.radius} min={0.005} max={0.4} step={0.005} onChange={(v) => set('radius', v)} />

      <SectionDivider label="Ignition" />
      <SliderRow label="Start" value={props.startTime} min={0} max={30} step={0.05} decimals={2} onChange={(v) => set('startTime', v)} />
      <SliderRow label="Duration" value={props.duration} min={0.01} max={5} step={0.01} decimals={2} onChange={(v) => set('duration', v)} />
      <SliderRow label="Intensity" value={props.intensity} min={0} max={1} step={0.01} onChange={(v) => set('intensity', v)} />
    </Panel>
  )
}
