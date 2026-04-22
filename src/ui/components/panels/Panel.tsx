import type { ReactNode } from 'react'
import { StatusPill } from '../common/StatusPill'

interface PanelProps {
  title: string
  subtitle?: string
  status?: string
  statusTone?: 'default' | 'success' | 'warning'
  children: ReactNode
  className?: string
}

export function Panel({
  title,
  subtitle,
  status,
  statusTone = 'default',
  children,
  className,
}: PanelProps) {
  return (
    <section
      className={`rounded-[26px] border border-[var(--fenix-border)] bg-[var(--fenix-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur ${className ?? ''}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--fenix-accent-soft)]">
            {title}
          </p>
          {subtitle ? (
            <h2 className="mt-2 text-sm leading-6 text-[var(--fenix-text-muted)]">
              {subtitle}
            </h2>
          ) : null}
        </div>
        {status ? <StatusPill label={status} tone={statusTone} /> : null}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
