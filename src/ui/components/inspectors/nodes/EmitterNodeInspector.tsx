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
        <SliderRow label="X" value={props.positionX} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionX', v)} />
        <SliderRow label="Y" value={props.positionY} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionY', v)} />
        <SliderRow label="Z" value={props.positionZ} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('positionZ', v)} />
        <SliderRow label="Radius" value={props.radius} min={0.005} max={0.8} step={0.005} onChange={(v) => set('radius', v)} />

        <SectionDivider label="Timing" />
        <SliderRow label="Start" value={props.startTime} min={0} max={20} step={0.05} decimals={2} onChange={(v) => set('startTime', v)} />
        <SliderRow label="Lead" value={props.smokeLeadTime} min={0} max={12} step={0.05} decimals={2} onChange={(v) => set('smokeLeadTime', v)} />
        <SliderRow label="Blast" value={props.blastDuration} min={0.01} max={8} step={0.01} decimals={2} onChange={(v) => set('blastDuration', v)} />
        <SliderRow label="Plume" value={props.plumeDuration} min={0.1} max={20} step={0.05} decimals={2} onChange={(v) => set('plumeDuration', v)} />

        <SectionDivider label="Yields" />
        <SliderRow label="Density" value={props.densityYield} min={0} max={48} step={0.1} decimals={1} onChange={(v) => set('densityYield', v)} />
        <SliderRow label="Heat" value={props.heatYield} min={0} max={64} step={0.1} decimals={1} onChange={(v) => set('heatYield', v)} />
        <SliderRow label="Fuel" value={props.fuelYield} min={0} max={48} step={0.1} decimals={1} onChange={(v) => set('fuelYield', v)} />
        <SliderRow label="Reaction" value={props.reactionYield} min={0} max={24} step={0.1} decimals={1} onChange={(v) => set('reactionYield', v)} />

        <SectionDivider label="Impulse" />
        <SliderRow label="Radial" value={props.radialImpulse} min={-80} max={240} step={0.5} decimals={1} onChange={(v) => set('radialImpulse', v)} />
        <SliderRow label="Lift" value={props.liftImpulse} min={-80} max={80} step={0.5} decimals={1} onChange={(v) => set('liftImpulse', v)} />
        <SliderRow label="Turbulence" value={props.turbulence} min={0} max={48} step={0.1} decimals={1} onChange={(v) => set('turbulence', v)} />
        <SliderRow label="Crumble" value={props.crumbleStrength} min={-48} max={48} step={0.1} decimals={1} onChange={(v) => set('crumbleStrength', v)} />
        <SliderRow label="Implosion" value={props.implosionStrength} min={0} max={64} step={0.25} decimals={2} onChange={(v) => set('implosionStrength', v)} />

        <SectionDivider label="Lift Direction" />
        <SliderRow label="Dir X" value={props.liftDirX} min={-1} max={1} step={0.01} onChange={(v) => set('liftDirX', v)} />
        <SliderRow label="Dir Y" value={props.liftDirY} min={-1} max={1} step={0.01} onChange={(v) => set('liftDirY', v)} />
        <SliderRow label="Dir Z" value={props.liftDirZ} min={-1} max={1} step={0.01} onChange={(v) => set('liftDirZ', v)} />

        <SectionDivider label="Shape" />
        <SliderRow label="Patchiness" value={props.heatPatchiness} min={0} max={1} step={0.01} onChange={(v) => set('heatPatchiness', v)} />
        <SliderRow label="Patch Scale" value={props.patchScale} min={0.25} max={128} step={0.25} decimals={2} onChange={(v) => set('patchScale', v)} />
        <SliderRow label="Core Heat" value={props.coreHeat} min={-8} max={16} step={0.05} decimals={2} onChange={(v) => set('coreHeat', v)} />
        <SliderRow label="Core Lift" value={props.coreLift} min={-48} max={48} step={0.25} decimals={2} onChange={(v) => set('coreLift', v)} />

        <SectionDivider label="Behavior" />
        <SliderRow label="Expand" value={props.expansionRate} min={0} max={3} step={0.01} decimals={2} onChange={(v) => set('expansionRate', v)} />
        <SliderRow label="Sustain" value={props.sustain} min={0} max={3} step={0.01} decimals={2} onChange={(v) => set('sustain', v)} />
        <SliderRow label="Mushroom" value={props.mushroomStrength} min={0} max={4} step={0.01} decimals={2} onChange={(v) => set('mushroomStrength', v)} />
      </Panel>
    </>
  )
}
