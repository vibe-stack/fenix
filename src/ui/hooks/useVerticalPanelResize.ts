import { useCallback, useRef, useState } from 'react'

export function useVerticalPanelResize(initialHeight: number, min = 40, max = 320) {
  const [height, setHeight] = useState(initialHeight)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startY.current = e.clientY
    startHeight.current = height

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      // Handle is on the top edge of the bottom panel: dragging up grows it.
      const delta = startY.current - ev.clientY
      setHeight(Math.max(min, Math.min(max, startHeight.current + delta)))
    }

    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [height, min, max])

  return { height, onMouseDown }
}
