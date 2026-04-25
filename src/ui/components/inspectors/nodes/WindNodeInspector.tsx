import { useSnapshot } from 'valtio'
import type { WindNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'
import { Panel } from '../../panels/Panel'

export function WindNodeInspector() {
  const snap = useSnapshot(nodeStore)
  const props = snap.wind

  function set<K extends keyof WindNodeProps>(key: K, value: WindNodeProps[K]) {
    nodeStore.wind[key] = value
  }

  return (
    <Panel title="Wind">
      <SectionDivider label="Force" />
      <SliderRow label="Strength" value={props.strength} min={-8} max={16} step={0.05} onChange={(v) => set('strength', v)} />

      <SectionDivider label="Direction" />
      <SliderRow label="X" value={props.directionX} min={-4} max={4} step={0.01} onChange={(v) => set('directionX', v)} />
      <SliderRow label="Y" value={props.directionY} min={-4} max={4} step={0.01} onChange={(v) => set('directionY', v)} />
      <SliderRow label="Z" value={props.directionZ} min={-4} max={4} step={0.01} onChange={(v) => set('directionZ', v)} />
    </Panel>
  )
}
