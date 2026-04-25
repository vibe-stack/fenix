import { useCallback, useRef, useState } from 'react'

export function usePanelResize(initialWidth: number, min = 240, max = 900) {
  const [width, setWidth] = useState(initialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      // Handle is on the left edge of the panel — dragging left grows it, right shrinks
      const delta = startX.current - ev.clientX
      setWidth(Math.max(min, Math.min(max, startWidth.current + delta)))
    }

    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, min, max])

  return { width, onMouseDown }
}
