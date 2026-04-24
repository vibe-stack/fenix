interface NumberRowProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}

export function NumberRow({ label, value, min, max, step = 1, onChange }: NumberRowProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-20 border border-(--fenix-border) bg-(--fenix-bg) px-2 text-right text-[10px] tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
      />
    </div>
  )
}
