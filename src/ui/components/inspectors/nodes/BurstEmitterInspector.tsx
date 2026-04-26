import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import type { BurstEmitterNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'

export function BurstEmitterInspector({ id }: { id: string }) {
  const snap = useSnapshot(nodeStore)
  const index = snap.emitters.findIndex((e) => e.id === id)
  if (index === -1) return null

  const props = snap.emitters[index].props
  if (props.kind !== 'burst') return null

  function set<K extends keyof BurstEmitterNodeProps>(key: K, value: BurstEmitterNodeProps[K]) {
    const e = nodeStore.emitters[index]
    if (e.props.kind === 'burst') (e.props as BurstEmitterNodeProps)[key] = value
  }

  return (
    <Panel title={snap.emitters[index].label}>
      <SectionDivider label="Position" />
      <SliderRow label="X" value={props.positionX} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionX', v)} />
      <SliderRow label="Y" value={props.positionY} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionY', v)} />
      <SliderRow label="Z" value={props.positionZ} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionZ', v)} />
      <SliderRow label="Radius" value={props.radius} min={0.01} max={0.7} step={0.005} onChange={(v) => set('radius', v)} />

      <SectionDivider label="Timing" />
      <SliderRow label="Start" value={props.startTime} min={0} max={30} step={0.05} decimals={2} onChange={(v) => set('startTime', v)} />
      <SliderRow label="Duration" value={props.duration} min={0.02} max={3} step={0.01} decimals={2} onChange={(v) => set('duration', v)} />

      <SectionDivider label="Amounts" />
      <SliderRow label="Density" value={props.densityAmount} min={0} max={3} step={0.01} onChange={(v) => set('densityAmount', v)} />
      <SliderRow label="Heat" value={props.heatAmount} min={0} max={3} step={0.01} onChange={(v) => set('heatAmount', v)} />
      <SliderRow label="Fuel" value={props.fuelAmount} min={0} max={3} step={0.01} onChange={(v) => set('fuelAmount', v)} />
      <SliderRow label="Reaction" value={props.reactionAmount} min={0} max={2} step={0.01} onChange={(v) => set('reactionAmount', v)} />

      <SectionDivider label="Impulse" />
      <SliderRow label="Expand" value={props.expansionSpeed} min={0} max={220} step={1} decimals={0} onChange={(v) => set('expansionSpeed', v)} />
      <SliderRow label="Lift" value={props.liftSpeed} min={-80} max={160} step={1} decimals={0} onChange={(v) => set('liftSpeed', v)} />
      <SliderRow label="Turbulence" value={props.turbulenceSpeed} min={0} max={160} step={1} decimals={0} onChange={(v) => set('turbulenceSpeed', v)} />
      <SliderRow label="Falloff" value={props.falloff} min={0} max={1} step={0.01} onChange={(v) => set('falloff', v)} />

      <SectionDivider label="Noise" />
      <SliderRow label="Scale" value={props.noiseScale} min={0} max={64} step={0.5} decimals={1} onChange={(v) => set('noiseScale', v)} />
      <SliderRow label="Mix" value={props.noiseMix} min={0} max={1} step={0.01} onChange={(v) => set('noiseMix', v)} />
    </Panel>
  )
}
