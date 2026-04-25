import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import type { VelocityEmitterNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'

const MODES: VelocityEmitterNodeProps['mode'][] = ['radial', 'directional', 'turbulent']

export function VelocityEmitterInspector({ id }: { id: string }) {
  const snap = useSnapshot(nodeStore)
  const index = snap.emitters.findIndex((e) => e.id === id)
  if (index === -1) return null

  const props = snap.emitters[index].props
  if (props.kind !== 'velocity') return null

  function set<K extends keyof VelocityEmitterNodeProps>(key: K, value: VelocityEmitterNodeProps[K]) {
    const e = nodeStore.emitters[index]
    if (e.props.kind === 'velocity') (e.props as VelocityEmitterNodeProps)[key] = value
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
      <SliderRow label="Duration" value={props.duration} min={0.01} max={30} step={0.05} decimals={2} onChange={(v) => set('duration', v)} />

      <SectionDivider label="Velocity" />
      <div style={{ display: 'flex', gap: 4, padding: '2px 8px' }}>
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => set('mode', m)}
            style={{ flex: 1, opacity: props.mode === m ? 1 : 0.4, fontSize: 11 }}
          >
            {m}
          </button>
        ))}
      </div>
      <SliderRow label="Speed" value={props.speed} min={0} max={200} step={1} decimals={0} onChange={(v) => set('speed', v)} />
      <SliderRow label="Falloff" value={props.falloff} min={0} max={1} step={0.01} onChange={(v) => set('falloff', v)} />

      {props.mode === 'directional' && (
        <>
          <SectionDivider label="Direction" />
          <SliderRow label="X" value={props.directionX} min={-1} max={1} step={0.01} onChange={(v) => set('directionX', v)} />
          <SliderRow label="Y" value={props.directionY} min={-1} max={1} step={0.01} onChange={(v) => set('directionY', v)} />
          <SliderRow label="Z" value={props.directionZ} min={-1} max={1} step={0.01} onChange={(v) => set('directionZ', v)} />
        </>
      )}
    </Panel>
  )
}
