import { useSnapshot } from 'valtio'
import type { VorticityNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'
import { Panel } from '../../panels/Panel'

export function VorticityNodeInspector() {
  const snap = useSnapshot(nodeStore)
  const props = snap.vorticity

  function set<K extends keyof VorticityNodeProps>(key: K, value: VorticityNodeProps[K]) {
    nodeStore.vorticity[key] = value
  }

  return (
    <Panel title="Vorticity">
      <SectionDivider label="Confinement" />
      <SliderRow label="Strength" value={props.strength} min={0} max={32} step={0.05} onChange={(v) => set('strength', v)} />
    </Panel>
  )
}