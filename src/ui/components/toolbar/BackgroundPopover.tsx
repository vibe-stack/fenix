import { useRef, useState } from 'react'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

export function BackgroundPopover() {
  const dispatch = useEditorDispatch()
  const bg = useEditorStore((s) => s.viewportState.background)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const hasImage = Boolean(bg.imageDataUrl)
  const isActive = open || hasImage || bg.color !== '#0d0a09'

  function handleUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        dispatch({ type: 'viewport/set-background-image', imageDataUrl: reader.result, imageName: file.name })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 items-center gap-1.5 px-3 text-[10px] tracking-[0.12em] transition-colors ${
          isActive
            ? 'text-(--fenix-accent-soft)'
            : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        <span
          className="h-2.5 w-2.5 rounded-sm border"
          style={{
            backgroundColor: bg.color,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        />
        BG
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            ref={panelRef}
            className="absolute right-0 top-full z-50 mt-px w-60"
            style={{
              background: 'var(--fenix-panel)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[9px] uppercase tracking-[0.28em] text-(--fenix-text-muted)">Canvas Background</span>
            </div>

            <div className="space-y-3 px-3 py-3">
              {/* Color picker */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.18em] text-(--fenix-text-muted)">Color</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-(--fenix-text-muted)">{bg.color}</span>
                  <label className="relative cursor-pointer">
                    <span
                      className="block h-5 w-8 rounded-sm"
                      style={{
                        backgroundColor: bg.color,
                        outline: '1px solid rgba(255,255,255,0.12)',
                      }}
                    />
                    <input
                      type="color"
                      value={bg.color}
                      onChange={(e) => dispatch({ type: 'viewport/set-background-color', color: e.target.value })}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

              {/* Upload / clear row */}
              <div className="flex items-center gap-2">
                <label
                  className="flex h-7 flex-1 cursor-pointer items-center justify-center text-[10px] tracking-[0.12em] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text)"
                  style={{ background: 'var(--fenix-row)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0]
                      if (f) handleUpload(f)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                {hasImage && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'viewport/set-background-image', imageDataUrl: null, imageName: null })}
                    className="h-7 px-2 text-[10px] tracking-[0.12em] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text)"
                  >
                    Clear
                  </button>
                )}
              </div>

              {bg.imageName && (
                <p className="truncate text-[10px] text-(--fenix-text-muted)">{bg.imageName}</p>
              )}

              {hasImage && (
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['Offset X', bg.offsetX, (v: number) => dispatch({ type: 'viewport/set-background-offset', offsetX: Math.round(v), offsetY: bg.offsetY })],
                    ['Offset Y', bg.offsetY, (v: number) => dispatch({ type: 'viewport/set-background-offset', offsetX: bg.offsetX, offsetY: Math.round(v) })],
                    ['Scale', bg.scale, (v: number) => dispatch({ type: 'viewport/set-background-scale', scale: Math.max(0.1, Math.min(5, Math.round(v * 100) / 100)) })],
                  ] as const).map(([label, value, onChange]) => (
                    <label key={label} className="flex flex-col gap-1">
                      <span className="text-[9px] uppercase tracking-[0.18em] text-(--fenix-text-muted)">{label}</span>
                      <input
                        type="number"
                        step={label === 'Scale' ? 0.05 : 1}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        className="h-6 w-full px-1.5 text-[10px] tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
                        style={{ background: 'var(--fenix-bg)', border: '1px solid rgba(255,255,255,0.08)' }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
