interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  decimals?: number
  onChange: (value: number) => void
}

export function SliderRow({ label, value, min, max, step = 0.01, decimals = 2, onChange }: SliderRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="w-20 shrink-0 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-0.5 flex-1 cursor-pointer appearance-none bg-(--fenix-row) accent-(--fenix-accent)"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value.toFixed(decimals)}
        onChange={(e) => {
          const nextValue = Number(e.target.value)
          if (!Number.isFinite(nextValue)) {
            return
          }
          onChange(Math.max(min, Math.min(max, nextValue)))
        }}
        className="w-20 shrink-0 rounded border border-(--fenix-row) bg-(--fenix-panel) px-2 py-1 text-right text-[11px] tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
      />
    </div>
  )
}
