import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { nodeGraphStore } from '../../../../store/node-store/nodeGraphStore'
import type { RenderOutputNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'
import { StatRow } from '../../common/StatRow'
import { ToggleRow } from '../../common/ToggleRow'

const DISPLAY_MODES = ['temperature', 'density', 'fuel'] as const

export function RenderOutputNodeInspector() {
  const snap = useSnapshot(nodeStore)
  const graphSnap = useSnapshot(nodeGraphStore)
  const props = snap.renderOutput
  const connectedLights = graphSnap.edges.filter((edge) => edge.target === 'render-output' && edge.source.startsWith('light-')).length

  function set<K extends keyof RenderOutputNodeProps>(key: K, value: RenderOutputNodeProps[K]) {
    nodeStore.renderOutput[key] = value
  }

  return (
    <Panel title="Render Output">
      <SectionDivider label="Display" />
      <div className="flex gap-px px-3 py-2">
        {DISPLAY_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => set('displayMode', m)}
            className={`flex-1 py-1.5 text-[9px] uppercase tracking-[0.2em] transition-colors ${
              props.displayMode === m
                ? 'bg-(--fenix-active) text-(--fenix-accent-soft)'
                : 'bg-(--fenix-row) text-(--fenix-text-muted) hover:text-(--fenix-text)'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <SectionDivider label="Raymarch" />
      <SliderRow label="Steps" value={props.stepCount} min={64} max={512} step={8} decimals={0} onChange={(v) => set('stepCount', v)} />

      <SectionDivider label="Lighting" />
      <StatRow label="Connected" value={String(connectedLights)} />
      <StatRow label="Control" value="light nodes" />

      <SectionDivider label="Scattering" />
      <SliderRow label="Forward g" value={props.scatteringForward} min={0} max={0.95} step={0.01} onChange={(v) => set('scatteringForward', v)} />
      <SliderRow label="Back g" value={props.scatteringBack} min={-0.95} max={0} step={0.01} onChange={(v) => set('scatteringBack', v)} />

      <SectionDivider label="Bloom" />
      <ToggleRow label="Enabled" value={props.bloomEnabled} onChange={(v) => set('bloomEnabled', v)} />
      <SliderRow label="Threshold" value={props.bloomThreshold} min={0} max={1} step={0.01} onChange={(v) => set('bloomThreshold', v)} />
      <SliderRow label="Strength" value={props.bloomStrength} min={0} max={3} step={0.05} onChange={(v) => set('bloomStrength', v)} />
      <SliderRow label="Radius" value={props.bloomRadius} min={0} max={1} step={0.01} onChange={(v) => set('bloomRadius', v)} />
    </Panel>
  )
}
