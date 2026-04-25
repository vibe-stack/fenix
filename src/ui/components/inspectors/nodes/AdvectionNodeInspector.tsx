import { useSnapshot } from 'valtio'
import { nodeStore } from '../../../../store/node-store/nodeStore'
import { Panel } from '../../panels/Panel'
import { SectionDivider } from '../../common/SectionDivider'

export function AdvectionNodeInspector() {
  const snap = useSnapshot(nodeStore)
  const { mode } = snap.advection

  const options = [
    { value: 'maccormack', label: 'MacCormack', desc: 'Higher accuracy, better small-scale detail' },
    { value: 'semi-lagrangian', label: 'Semi-Lagrangian', desc: 'Faster, more dissipative' },
  ] as const

  return (
    <Panel title="Advection">
      <SectionDivider label="Solver Mode" />
      <div className="flex flex-col gap-px">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { nodeStore.advection.mode = opt.value }}
            className={`px-3 py-2.5 text-left transition-colors ${
              mode === opt.value
                ? 'bg-(--fenix-active)'
                : 'hover:bg-(--fenix-row)'
            }`}
          >
            <p className={`text-xs font-medium ${mode === opt.value ? 'text-(--fenix-accent-soft)' : 'text-(--fenix-text)'}`}>
              {opt.label}
            </p>
            <p className="mt-0.5 text-[9px] text-(--fenix-text-muted)">{opt.desc}</p>
          </button>
        ))}
      </div>
    </Panel>
  )
}
