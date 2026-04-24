interface StatRowProps {
  label: string
  value: string
}

export function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 odd:bg-(--fenix-row-alt)">
      <span className="text-[9px] uppercase tracking-[0.22em] text-(--fenix-text-muted)">{label}</span>
      <span className="text-[10px] tabular-nums text-(--fenix-text)">{value}</span>
    </div>
  )
}
