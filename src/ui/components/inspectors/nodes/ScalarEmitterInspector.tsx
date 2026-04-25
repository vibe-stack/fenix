import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import type { ScalarEmitterNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'

export function ScalarEmitterInspector({ id }: { id: string }) {
  const snap = useSnapshot(nodeStore)
  const index = snap.emitters.findIndex((e) => e.id === id)
  if (index === -1) return null

  const props = snap.emitters[index].props
  if (props.kind !== 'scalar') return null

  function set<K extends keyof ScalarEmitterNodeProps>(key: K, value: ScalarEmitterNodeProps[K]) {
    const e = nodeStore.emitters[index]
    if (e.props.kind === 'scalar') (e.props as ScalarEmitterNodeProps)[key] = value
  }

  return (
    <Panel title={snap.emitters[index].label}>
      <SectionDivider label="Position" />
      <SliderRow label="X" value={props.positionX} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionX', v)} />
      <SliderRow label="Y" value={props.positionY} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionY', v)} />
      <SliderRow label="Z" value={props.positionZ} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionZ', v)} />
      <SliderRow label="Radius" value={props.radius} min={0.005} max={0.6} step={0.005} onChange={(v) => set('radius', v)} />

      <SectionDivider label="Timing" />
      <SliderRow label="Start" value={props.startTime} min={0} max={30} step={0.05} decimals={2} onChange={(v) => set('startTime', v)} />
      <SliderRow label="Duration" value={props.duration} min={0.1} max={9999} step={0.5} decimals={1} onChange={(v) => set('duration', v)} />

      <SectionDivider label="Emission" />
      <SliderRow label="Density/s" value={props.densityRate} min={0} max={20} step={0.1} decimals={1} onChange={(v) => set('densityRate', v)} />
      <SliderRow label="Heat/s" value={props.heatRate} min={0} max={20} step={0.1} decimals={1} onChange={(v) => set('heatRate', v)} />
      <SliderRow label="Fuel/s" value={props.fuelRate} min={0} max={20} step={0.1} decimals={1} onChange={(v) => set('fuelRate', v)} />

      <SectionDivider label="Noise" />
      <SliderRow label="Scale" value={props.noiseScale} min={0} max={64} step={0.5} decimals={1} onChange={(v) => set('noiseScale', v)} />
      <SliderRow label="Mix" value={props.noiseMix} min={0} max={1} step={0.01} onChange={(v) => set('noiseMix', v)} />
    </Panel>
  )
}
