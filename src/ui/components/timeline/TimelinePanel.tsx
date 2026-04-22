import { Panel } from '../panels/Panel'
import { formatFrameBudget } from '../../../engine/core/time/clock'
import { useEditorStore } from '../../hooks/useEditorStore'

const milestones = [
  'Editor shell and architecture seams',
  'Viewport host with Three.js scene lifecycle',
  'Graph editing, validation, and serialization',
  'Simulation compiler plus GPU resource planning',
  'Sparse volumetric runtime and renderer integration',
]

export function TimelinePanel() {
  const simulationState = useEditorStore((snapshot) => snapshot.simulationState)

  return (
    <Panel
      title="Build Timeline"
      subtitle="The first implementation pass sets the runway for the real engine work instead of spending time on a disposable visual gimmick."
      status={formatFrameBudget(simulationState.stepRateHz)}
    >
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {milestones.map((milestone, index) => (
            <div
              key={milestone}
              className={`flex items-center gap-3 rounded-[20px] border px-4 py-3 ${
                index <= 1
                  ? 'border-[var(--fenix-border)] bg-[rgba(255,122,61,0.08)]'
                  : 'border-white/6 bg-black/12'
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--fenix-border)] text-xs font-semibold text-[var(--fenix-accent-soft)]">
                {index + 1}
              </span>
              <p className="text-sm text-[var(--fenix-text)]">{milestone}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[24px] border border-[var(--fenix-border)] bg-[linear-gradient(180deg,rgba(255,122,61,0.08),rgba(255,255,255,0.02))] p-4">
          <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--fenix-accent-soft)]">
            Runtime Cadence
          </p>
          <p className="mt-3 text-2xl font-semibold text-[var(--fenix-text)]">
            {simulationState.stepRateHz} Hz target
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--fenix-text-muted)]">
            Budgeting around {formatFrameBudget(simulationState.stepRateHz)} establishes the right
            framing for fixed-step simulation scheduling before the GPU solver exists.
          </p>
        </div>
      </div>
    </Panel>
  )
}
