import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import type { RenderOutputNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'

const DISPLAY_MODES = ['temperature', 'density', 'fuel'] as const

export function RenderOutputNodeInspector() {
  const snap = useSnapshot(nodeStore)
  const props = snap.renderOutput

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
      <SliderRow label="Light X" value={props.lightDirX} min={-1} max={1} step={0.01} onChange={(v) => set('lightDirX', v)} />
      <SliderRow label="Light Y" value={props.lightDirY} min={-1} max={1} step={0.01} onChange={(v) => set('lightDirY', v)} />
      <SliderRow label="Light Z" value={props.lightDirZ} min={-1} max={1} step={0.01} onChange={(v) => set('lightDirZ', v)} />

      <SectionDivider label="Scattering" />
      <SliderRow label="Forward g" value={props.scatteringForward} min={0} max={0.95} step={0.01} onChange={(v) => set('scatteringForward', v)} />
      <SliderRow label="Back g" value={props.scatteringBack} min={-0.95} max={0} step={0.01} onChange={(v) => set('scatteringBack', v)} />
    </Panel>
  )
}
