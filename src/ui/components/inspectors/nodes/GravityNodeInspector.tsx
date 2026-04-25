import { useSnapshot } from 'valtio'
import type { GravityNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'
import { Panel } from '../../panels/Panel'

export function GravityNodeInspector() {
  const snap = useSnapshot(nodeStore)
  const props = snap.gravity

  function set<K extends keyof GravityNodeProps>(key: K, value: GravityNodeProps[K]) {
    nodeStore.gravity[key] = value
  }

  return (
    <Panel title="Gravity">
      <SectionDivider label="Force" />
      <SliderRow label="Strength" value={props.strength} min={0} max={8} step={0.05} onChange={(v) => set('strength', v)} />
      <SliderRow label="Buoyancy" value={props.buoyancy} min={-12} max={24} step={0.05} onChange={(v) => set('buoyancy', v)} />

      <SectionDivider label="Direction" />
      <SliderRow label="X" value={props.directionX} min={-1} max={1} step={0.01} onChange={(v) => set('directionX', v)} />
      <SliderRow label="Y" value={props.directionY} min={-1} max={1} step={0.01} onChange={(v) => set('directionY', v)} />
      <SliderRow label="Z" value={props.directionZ} min={-1} max={1} step={0.01} onChange={(v) => set('directionZ', v)} />
    </Panel>
  )
}
