import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import type { EmitterNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'

export function EmitterNodeInspector({ id }: { id: string }) {
  const snap = useSnapshot(nodeStore)
  const index = snap.emitters.findIndex((e) => e.id === id)
  if (index === -1) return null

  const props = snap.emitters[index].props
  const label = snap.emitters[index].label

  function set<K extends keyof EmitterNodeProps>(key: K, value: EmitterNodeProps[K]) {
    nodeStore.emitters[index].props[key] = value
  }

  return (
    <>
      <Panel title={label}>
        <SectionDivider label="Position" />
        <SliderRow label="X" value={props.positionX} min={0} max={1} step={0.01} onChange={(v) => set('positionX', v)} />
        <SliderRow label="Y" value={props.positionY} min={0} max={1} step={0.01} onChange={(v) => set('positionY', v)} />
        <SliderRow label="Z" value={props.positionZ} min={0} max={1} step={0.01} onChange={(v) => set('positionZ', v)} />
        <SliderRow label="Radius" value={props.radius} min={0.01} max={0.5} step={0.005} onChange={(v) => set('radius', v)} />

        <SectionDivider label="Timing" />
        <SliderRow label="Start" value={props.startTime} min={0} max={10} step={0.1} decimals={1} onChange={(v) => set('startTime', v)} />
        <SliderRow label="Lead" value={props.smokeLeadTime} min={0} max={4} step={0.05} decimals={2} onChange={(v) => set('smokeLeadTime', v)} />
        <SliderRow label="Blast" value={props.blastDuration} min={0.05} max={2} step={0.05} decimals={2} onChange={(v) => set('blastDuration', v)} />
        <SliderRow label="Plume" value={props.plumeDuration} min={0.5} max={10} step={0.1} decimals={1} onChange={(v) => set('plumeDuration', v)} />

        <SectionDivider label="Yields" />
        <SliderRow label="Density" value={props.densityYield} min={0} max={14} step={0.1} decimals={1} onChange={(v) => set('densityYield', v)} />
        <SliderRow label="Heat" value={props.heatYield} min={0} max={18} step={0.1} decimals={1} onChange={(v) => set('heatYield', v)} />
        <SliderRow label="Fuel" value={props.fuelYield} min={0} max={16} step={0.1} decimals={1} onChange={(v) => set('fuelYield', v)} />
        <SliderRow label="Reaction" value={props.reactionYield} min={0} max={8} step={0.1} decimals={1} onChange={(v) => set('reactionYield', v)} />

        <SectionDivider label="Impulse" />
        <SliderRow label="Radial" value={props.radialImpulse} min={0} max={80} step={0.5} decimals={1} onChange={(v) => set('radialImpulse', v)} />
        <SliderRow label="Lift" value={props.liftImpulse} min={0} max={30} step={0.5} decimals={1} onChange={(v) => set('liftImpulse', v)} />
        <SliderRow label="Turbulence" value={props.turbulence} min={0} max={14} step={0.1} decimals={1} onChange={(v) => set('turbulence', v)} />
        <SliderRow label="Crumble" value={props.crumbleStrength} min={0} max={24} step={0.1} decimals={1} onChange={(v) => set('crumbleStrength', v)} />

        <SectionDivider label="Shape" />
        <SliderRow label="Patchiness" value={props.heatPatchiness} min={0} max={1} step={0.01} onChange={(v) => set('heatPatchiness', v)} />
        <SliderRow label="Patch Scale" value={props.patchScale} min={1} max={24} step={0.5} decimals={1} onChange={(v) => set('patchScale', v)} />
        <SliderRow label="Core Heat" value={props.coreHeat} min={0} max={0.8} step={0.01} onChange={(v) => set('coreHeat', v)} />
        <SliderRow label="Core Lift" value={props.coreLift} min={0} max={24} step={0.5} decimals={1} onChange={(v) => set('coreLift', v)} />
      </Panel>
    </>
  )
}
