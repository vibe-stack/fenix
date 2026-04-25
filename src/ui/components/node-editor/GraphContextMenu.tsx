import { useEffect, useRef } from 'react'

interface MenuItem {
  label: string
  sublabel?: string
  action: () => void
}

interface GraphContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function GraphContextMenu({ x, y, items, onClose }: GraphContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handler)
    window.addEventListener('keydown', keyHandler)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        background: 'var(--fenix-panel)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        padding: '4px 0',
        minWidth: 180,
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
      }}
    >
      <div style={{ padding: '4px 10px 6px', fontSize: 9, color: 'var(--fenix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        Add Node
      </div>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => { item.action(); onClose() }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '6px 10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--fenix-text)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--fenix-row)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
        >
          <div style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</div>
          {item.sublabel && (
            <div style={{ fontSize: 9, color: 'var(--fenix-text-muted)', marginTop: 1 }}>{item.sublabel}</div>
          )}
        </button>
      ))}
    </div>
  )
}
