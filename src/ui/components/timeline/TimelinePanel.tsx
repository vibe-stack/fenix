import { useEditorStore } from '../../hooks/useEditorStore'

export function TimelinePanel() {
  const simulationState = useEditorStore((snapshot) => snapshot.simulationState)

  return (
    <div className="flex h-10 shrink-0 items-center gap-px bg-(--fenix-panel)">
      {/* Playback controls */}
      <div className="flex items-center gap-px px-3">
        {(['⏮', '◀', '■', '▶', '⏭'] as const).map((sym) => (
          <button
            key={sym}
            type="button"
            className="flex h-7 w-7 items-center justify-center text-[10px] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text)"
          >
            {sym}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-(--fenix-bg)" />

      {/* Frame counter */}
      <div className="flex items-center gap-2 px-3">
        <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">Frame</span>
        <span className="tabular-nums text-xs text-(--fenix-text)">0001</span>
      </div>

      <div className="h-4 w-px bg-(--fenix-bg)" />

      {/* Timeline track — placeholder scrubber area */}
      <div className="relative flex flex-1 items-center px-3">
        <div className="h-0.5 w-full bg-(--fenix-row)">
          <div className="h-full w-1/12 bg-(--fenix-accent)" />
        </div>
        <div
          className="absolute left-[calc(1/12*100%+12px)] top-1/2 h-3 w-0.5 -translate-y-1/2 bg-(--fenix-accent)"
          style={{ pointerEvents: 'none' }}
        />
      </div>

      <div className="h-4 w-px bg-(--fenix-bg)" />

      {/* Sim cadence */}
      <div className="flex items-center gap-2 px-3">
        <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">Rate</span>
        <span className="tabular-nums text-xs text-(--fenix-text)">{simulationState.stepRateHz} Hz</span>
      </div>

      <div className="h-4 w-px bg-(--fenix-bg)" />

      {/* Domain */}
      <div className="flex items-center gap-2 px-3">
        <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">Domain</span>
        <span className="tabular-nums text-xs text-(--fenix-text)">
          {simulationState.domainResolution.join('×')}
        </span>
      </div>
    </div>
  )
}
