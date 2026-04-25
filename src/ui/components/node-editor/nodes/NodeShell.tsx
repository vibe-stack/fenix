import { Handle, Position } from '@xyflow/react'

interface NodeShellProps {
  id: string
  label: string
  category: string
  selected: boolean
  hasInput?: boolean
  hasOutput?: boolean
  accentColor?: string
  children?: React.ReactNode
}

export function NodeShell({
  id,
  label,
  category,
  selected,
  hasInput = true,
  hasOutput = true,
  accentColor = 'var(--fenix-accent)',
  children,
}: NodeShellProps) {
  const isSelected = selected

  return (
    <div
      style={{
        background: 'var(--fenix-panel)',
        border: `1px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 6,
        minWidth: 160,
        boxShadow: isSelected
          ? `0 0 0 1px ${accentColor}33, 0 4px 20px rgba(0,0,0,0.6)`
          : '0 2px 12px rgba(0,0,0,0.5)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: isSelected ? `${accentColor}1a` : 'var(--fenix-section-head)',
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          borderRadius: '5px 5px 0 0',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: accentColor,
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fenix-text)', lineHeight: 1.2 }}>
            {label}
          </div>
          <div style={{ fontSize: 9, color: 'var(--fenix-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 1 }}>
            {category}
          </div>
        </div>
      </div>

      {/* Body */}
      {children && (
        <div style={{ padding: '6px 10px 8px', fontSize: 10, color: 'var(--fenix-text-muted)' }}>
          {children}
        </div>
      )}

      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: 'var(--fenix-text-muted)',
            border: '2px solid var(--fenix-panel)',
            width: 10,
            height: 10,
          }}
        />
      )}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: accentColor,
            border: '2px solid var(--fenix-panel)',
            width: 10,
            height: 10,
          }}
        />
      )}
    </div>
  )
}
