interface StatusPillProps {
  label: string
  tone?: 'default' | 'success' | 'warning'
}

const toneClassMap: Record<NonNullable<StatusPillProps['tone']>, string> = {
  default: 'border-[var(--fenix-border)] bg-white/5 text-[var(--fenix-text-muted)]',
  success: 'border-emerald-400/30 bg-emerald-300/10 text-[var(--fenix-success)]',
  warning: 'border-amber-300/30 bg-amber-200/10 text-[var(--fenix-warning)]',
}

export function StatusPill({ label, tone = 'default' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${toneClassMap[tone]}`}
    >
      {label}
    </span>
  )
}
