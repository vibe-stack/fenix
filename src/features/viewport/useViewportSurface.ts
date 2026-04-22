import type { VolumeDisplayMode } from '../../engine/render/volumetrics/volumeDisplayMode'
import { useEffect, useRef, useState } from 'react'
import type { ViewportMountState } from '../../engine/core/types/platform'
import type { RendererBridge } from '../../engine/render/renderer/createRendererBridge'

export function useViewportSurface(
  displayMode: VolumeDisplayMode,
  rendererBridge: RendererBridge,
  runtimeKey: string,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mountState, setMountState] = useState<ViewportMountState>('booting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    let isActive = true
    let runtimeCleanup: (() => void) | null = null

    setMountState('booting')
    setErrorMessage(null)

    void rendererBridge
      .createViewportRuntime(displayMode)
      .then((runtime) => {
        if (!isActive) {
          runtime.dispose()

          return
        }

        runtimeCleanup = () => runtime.dispose()

        return runtime.mount(container)
      })
      .then(() => {
        if (isActive) {
          setMountState('live')
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setMountState('failed')
          setErrorMessage(error instanceof Error ? error.message : 'Viewport runtime failed to initialize.')
        }
      })

    return () => {
      isActive = false
      runtimeCleanup?.()
    }
  }, [displayMode, rendererBridge, runtimeKey])

  return {
    containerRef,
    mountState,
    errorMessage,
  }
}
