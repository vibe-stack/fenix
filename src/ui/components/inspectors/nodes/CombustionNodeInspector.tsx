import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'
import type { CombustionNodeProps } from '../../../../engine/graph/schema/nodeProps'

export function CombustionNodeInspector() {
  const snap = useSnapshot(nodeStore)
  const props = snap.combustion

  function set<K extends keyof CombustionNodeProps>(key: K, value: CombustionNodeProps[K]) {
    (nodeStore.combustion as Record<string, unknown>)[key] = value
  }

  return (
    <Panel title="Combustion">
      <SectionDivider label="Burn" />
      <SliderRow label="Rate Min" value={props.burnRateMin} min={0.5} max={12} step={0.05} onChange={(v) => set('burnRateMin', v)} />
      <SliderRow label="Rate Max" value={props.burnRateMax} min={0.5} max={20} step={0.05} onChange={(v) => set('burnRateMax', v)} />

      <SectionDivider label="Heat" />
      <SliderRow label="Emit Min" value={props.heatEmissionMin} min={0} max={6} step={0.05} onChange={(v) => set('heatEmissionMin', v)} />
      <SliderRow label="Emit Max" value={props.heatEmissionMax} min={0} max={8} step={0.05} onChange={(v) => set('heatEmissionMax', v)} />

      <SectionDivider label="Cooling" />
      <SliderRow label="Base Rate" value={props.baseCoolingRate} min={0} max={0.1} step={0.001} decimals={3} onChange={(v) => set('baseCoolingRate', v)} />
      <SliderRow label="Height Rate" value={props.heightCoolingRate} min={0} max={0.2} step={0.001} decimals={3} onChange={(v) => set('heightCoolingRate', v)} />

      <SectionDivider label="Smoke" />
      <SliderRow label="Yield Min" value={props.smokeYieldMin} min={0} max={1} step={0.01} onChange={(v) => set('smokeYieldMin', v)} />
      <SliderRow label="Yield Max" value={props.smokeYieldMax} min={0} max={1} step={0.01} onChange={(v) => set('smokeYieldMax', v)} />

      <SectionDivider label="Reaction" />
      <SliderRow label="Decay Hot" value={props.reactionDecayHot} min={0} max={2} step={0.01} onChange={(v) => set('reactionDecayHot', v)} />
      <SliderRow label="Decay Cool" value={props.reactionDecayCool} min={0} max={2} step={0.01} onChange={(v) => set('reactionDecayCool', v)} />
    </Panel>
  )
}
