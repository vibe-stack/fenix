import { useEditorStore } from '../../hooks/useEditorStore'
import { useSimulationHandle } from '../../../features/viewport/SimulationHandleContext'
import { PlaybackControls } from './PlaybackControls'
import { usePlaybackState } from './usePlaybackState'

export function TimelinePanel() {
  const simulationState = useEditorStore((s) => s.simulationState)
  const handle = useSimulationHandle()
  const { isPlaying, frameCount, togglePlayPause, reset } = usePlaybackState(handle)

  return (
    <div className="flex h-10 shrink-0 items-center gap-px bg-(--fenix-panel)">
      <PlaybackControls
        handle={handle}
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        onReset={reset}
      />

      <div className="h-4 w-px bg-(--fenix-bg)" />

      <div className="flex items-center gap-2 px-3">
        <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">Frame</span>
        <span className="w-10 tabular-nums text-xs text-(--fenix-text)">{String(frameCount).padStart(4, '0')}</span>
      </div>

      <div className="h-4 w-px bg-(--fenix-bg)" />

      {/* Scrubber placeholder */}
      <div className="relative flex flex-1 items-center px-3">
        <div className="h-px w-full bg-(--fenix-row)" />
      </div>

      <div className="h-4 w-px bg-(--fenix-bg)" />

      <div className="flex items-center gap-2 px-3">
        <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">Rate</span>
        <span className="tabular-nums text-xs text-(--fenix-text)">{simulationState.stepRateHz} Hz</span>
      </div>

      <div className="h-4 w-px bg-(--fenix-bg)" />

      <div className="flex items-center gap-2 px-3">
        <span className="text-[9px] uppercase tracking-[0.24em] text-(--fenix-text-muted)">Domain</span>
        <span className="tabular-nums text-xs text-(--fenix-text)">
          {simulationState.domainResolution.join('×')}
        </span>
      </div>
    </div>
  )
}
