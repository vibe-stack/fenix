import type { SimulationHandle } from '../../../engine/core/types/platform'

interface PlaybackControlsProps {
  handle: SimulationHandle | null
  isPlaying: boolean
  onPlayPause: () => void
  onReset: () => void
}

export function PlaybackControls({ handle, isPlaying, onPlayPause, onReset }: PlaybackControlsProps) {
  const disabled = !handle

  return (
    <div className="flex items-center gap-px px-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onReset}
        title="Reset"
        className="flex h-7 w-7 items-center justify-center text-[10px] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text) disabled:opacity-30"
      >
        ⏮
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onPlayPause}
        title={isPlaying ? 'Pause' : 'Play'}
        className={`flex h-7 w-7 items-center justify-center text-[10px] transition-colors disabled:opacity-30 ${
          isPlaying
            ? 'text-(--fenix-accent) hover:text-(--fenix-accent-soft)'
            : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        {isPlaying ? '■' : '▶'}
      </button>
    </div>
  )
}
