import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import type { LightNodeProps } from '../../../../engine/graph/schema/nodeProps'
import { Panel } from '../../panels/Panel'
import { SliderRow } from '../../common/SliderRow'
import { SectionDivider } from '../../common/SectionDivider'

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function toHexChannel(value: number) {
  return Math.round(clamp01(value) * 255).toString(16).padStart(2, '0')
}

function toHexColor(props: LightNodeProps) {
  return `#${toHexChannel(props.colorR)}${toHexChannel(props.colorG)}${toHexChannel(props.colorB)}`
}

function fromHexColor(hex: string) {
  return {
    colorR: parseInt(hex.slice(1, 3), 16) / 255,
    colorG: parseInt(hex.slice(3, 5), 16) / 255,
    colorB: parseInt(hex.slice(5, 7), 16) / 255,
  }
}

export function LightNodeInspector({ id }: { id: string }) {
  const snap = useSnapshot(nodeStore)
  const index = snap.lights.findIndex((light) => light.id === id)
  if (index === -1) return null

  const props = snap.lights[index].props
  const label = snap.lights[index].label

  function set<K extends keyof LightNodeProps>(key: K, value: LightNodeProps[K]) {
    nodeStore.lights[index].props[key] = value
  }

  return (
    <Panel title={label}>
      <SectionDivider label="Type" />
      <div className="flex gap-px px-3 py-2">
        {(['directional', 'point'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => set('lightType', type)}
            className={`flex-1 py-1.5 text-[9px] uppercase tracking-[0.2em] transition-colors ${
              props.lightType === type
                ? 'bg-(--fenix-active) text-(--fenix-accent-soft)'
                : 'bg-(--fenix-row) text-(--fenix-text-muted) hover:text-(--fenix-text)'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <SectionDivider label="Direction" />
      <SliderRow label="Dir X" value={props.dirX} min={-1} max={1} step={0.01} onChange={(v) => set('dirX', v)} />
      <SliderRow label="Dir Y" value={props.dirY} min={-1} max={1} step={0.01} onChange={(v) => set('dirY', v)} />
      <SliderRow label="Dir Z" value={props.dirZ} min={-1} max={1} step={0.01} onChange={(v) => set('dirZ', v)} />

      <SectionDivider label="Position" />
      <SliderRow label="Pos X" value={props.posX} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('posX', v)} />
      <SliderRow label="Pos Y" value={props.posY} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('posY', v)} />
      <SliderRow label="Pos Z" value={props.posZ} min={-0.5} max={1.5} step={0.01} onChange={(v) => set('posZ', v)} />

      <SectionDivider label="Output" />
      <SliderRow label="Intensity" value={props.intensity} min={0} max={8} step={0.01} decimals={2} onChange={(v) => set('intensity', v)} />
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="w-20 shrink-0 text-[9px] uppercase tracking-[0.22em] text-(--fenix-text-muted)">
          Color
        </span>
        <input
          type="color"
          value={toHexColor(props)}
          onChange={(event) => {
            const next = fromHexColor(event.currentTarget.value)
            set('colorR', next.colorR)
            set('colorG', next.colorG)
            set('colorB', next.colorB)
          }}
          className="h-8 w-12 cursor-pointer border border-(--fenix-row) bg-(--fenix-panel) p-0"
        />
        <span className="text-[10px] tabular-nums text-(--fenix-text)">{toHexColor(props).toUpperCase()}</span>
      </div>
    </Panel>
  )
}