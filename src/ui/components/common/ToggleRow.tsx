interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-(--fenix-row)"
    >
      <span className="text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">{label}</span>
      <span
        className={`h-1.5 w-6 transition-colors ${value ? 'bg-(--fenix-accent)' : 'bg-(--fenix-border)'}`}
      />
    </button>
  )
}
