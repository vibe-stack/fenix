import { useState } from 'react'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  decimals?: number
  onChange: (value: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatValue(value: number, decimals: number) {
  return Number.isFinite(value) ? value.toFixed(decimals) : ''
}

export function SliderRow({ label, value, min, max, step = 0.01, decimals = 2, onChange }: SliderRowProps) {
  const [draftValue, setDraftValue] = useState('')
  const [isEditingNumber, setIsEditingNumber] = useState(false)
  const inputValue = isEditingNumber ? draftValue : formatValue(value, decimals)

  function commitValue(nextValue: number) {
    if (!Number.isFinite(nextValue)) {
      return
    }

    const clampedValue = clamp(nextValue, min, max)
    onChange(clampedValue)
    return clampedValue
  }

  function commitDraftValue(rawValue: string) {
    if (rawValue.trim() === '') {
      setDraftValue(formatValue(value, decimals))
      return
    }

    const nextValue = Number(rawValue)
    const clampedValue = commitValue(nextValue)
    setDraftValue(formatValue(clampedValue ?? value, decimals))
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <span className="w-20 shrink-0 text-[9px] uppercase tracking-[0.2em] text-(--fenix-text-muted)">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const nextValue = commitValue(Number(e.target.value))
          if (nextValue !== undefined) {
            setDraftValue(formatValue(nextValue, decimals))
          }
        }}
        className="h-0.5 flex-1 cursor-pointer appearance-none bg-(--fenix-row) accent-(--fenix-accent)"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={inputValue}
        onFocus={() => {
          setDraftValue(formatValue(value, decimals))
          setIsEditingNumber(true)
        }}
        onChange={(e) => {
          const rawValue = e.target.value
          setDraftValue(rawValue)

          if (rawValue.trim() === '') {
            return
          }

          commitValue(Number(rawValue))
        }}
        onBlur={() => {
          commitDraftValue(draftValue)
          setIsEditingNumber(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
        className="h-6 w-20 shrink-0 rounded border border-(--fenix-row) bg-(--fenix-panel) px-2 text-right text-[11px] tabular-nums text-(--fenix-text) outline-none focus:border-(--fenix-accent)"
      />
    </div>
  )
}
