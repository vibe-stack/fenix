import { useRef, useState } from 'react'
import { useEditorDispatch, useEditorStore } from '../../hooks/useEditorStore'

export function BackgroundPopover() {
  const dispatch = useEditorDispatch()
  const bg = useEditorStore((s) => s.viewportState.background)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

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
        className={`flex h-8 items-center gap-1.5 px-3 text-[10px] uppercase tracking-[0.2em] transition-colors ${
          open || bg.imageDataUrl
            ? 'text-(--fenix-accent-soft)'
            : 'text-(--fenix-text-muted) hover:text-(--fenix-text)'
        }`}
      >
        <span className={`h-1.5 w-1.5 ${bg.imageDataUrl ? 'bg-(--fenix-accent)' : 'bg-(--fenix-border)'}`} />
        BG
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            ref={panelRef}
            className="absolute right-0 top-full z-50 mt-px w-56 border border-(--fenix-border) bg-(--fenix-panel) shadow-xl"
          >
            <div className="border-b border-(--fenix-border) px-3 py-2">
              <span className="text-[9px] uppercase tracking-[0.28em] text-(--fenix-text-muted)">Canvas Background</span>
            </div>

            <div className="space-y-3 px-3 py-3">
              {/* Upload / clear row */}
              <div className="flex items-center gap-2">
                <label className="flex h-7 flex-1 cursor-pointer items-center justify-center border border-(--fenix-border) bg-(--fenix-row) text-[10px] uppercase tracking-[0.16em] text-(--fenix-text) transition-colors hover:border-(--fenix-accent) hover:text-(--fenix-accent-soft)">
                  Upload
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
                <button
                  type="button"
                  disabled={!bg.imageDataUrl}
                  onClick={() => dispatch({ type: 'viewport/set-background-image', imageDataUrl: null, imageName: null })}
                  className="h-7 px-2 text-[10px] uppercase tracking-[0.16em] text-(--fenix-text-muted) transition-colors hover:text-(--fenix-text) disabled:opacity-30"
                >
                  Clear
                </button>
              </div>

              {bg.imageName && (
                <p className="truncate text-[10px] text-(--fenix-text-muted)">{bg.imageName}</p>
              )}

              {/* Offset + scale */}
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
                      className="h-6 w-full border border-(--fenix-border) bg-(--fenix-bg) px-1.5 text-[10px] tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
