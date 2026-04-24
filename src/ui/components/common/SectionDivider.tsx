interface SectionDividerProps {
  label: string
}

export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-2 px-3 pb-1 pt-3">
      <span className="text-[8px] uppercase tracking-[0.3em] text-(--fenix-accent-soft)">{label}</span>
      <div className="h-px flex-1 bg-(--fenix-border)" />
    </div>
  )
}
