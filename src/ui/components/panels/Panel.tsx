import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  children: ReactNode
  className?: string
}

export function Panel({ title, children, className }: PanelProps) {
  return (
    <div className={className}>
      <div className="bg-(--fenix-section-head) px-3 py-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-(--fenix-text-muted)">
          {title}
        </p>
      </div>
      <div>{children}</div>
    </div>
  )
}
