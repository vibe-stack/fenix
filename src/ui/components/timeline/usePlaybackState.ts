import { useCallback, useEffect, useRef, useState } from 'react'
import type { SimulationHandle } from '../../../engine/core/types/platform'

export function usePlaybackState(handle: SimulationHandle | null) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [frameCount, setFrameCount] = useState(0)
  const frameRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  // Sync isPlaying with handle state whenever handle arrives
  useEffect(() => {
    if (!handle) {
      setIsPlaying(false)
      setFrameCount(0)
      frameRef.current = 0
      return
    }
    setIsPlaying(handle.getPlaybackState() === 'playing')
  }, [handle])

  // Live frame counter — increments only while playing
  useEffect(() => {
    if (!handle || !isPlaying) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const tick = () => {
      frameRef.current += 1
      setFrameCount(frameRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [handle, isPlaying])

  const togglePlayPause = useCallback(() => {
    if (!handle) return
    if (isPlaying) {
      handle.pause()
      setIsPlaying(false)
    } else {
      handle.play()
      setIsPlaying(true)
    }
  }, [handle, isPlaying])

  const reset = useCallback(() => {
    if (!handle) return
    handle.reset()
    frameRef.current = 0
    setFrameCount(0)
    // Stay paused after reset — user must explicitly press play
    handle.pause()
    setIsPlaying(false)
  }, [handle])

  return { isPlaying, frameCount, togglePlayPause, reset }
}
