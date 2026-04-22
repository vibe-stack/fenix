import { useEffect, useState } from 'react'
import type { RendererDiagnostics } from '../../engine/core/types/platform'
import type { RendererBridge } from '../../engine/render/renderer/createRendererBridge'

export function useViewportDiagnostics(rendererBridge: RendererBridge) {
  const [diagnostics, setDiagnostics] = useState<RendererDiagnostics>(rendererBridge.diagnostics)

  useEffect(() => {
    let isMounted = true

    void rendererBridge.refresh().then((nextDiagnostics) => {
      if (isMounted) {
        setDiagnostics(nextDiagnostics)
      }
    })

    return () => {
      isMounted = false
    }
  }, [rendererBridge])

  return diagnostics
}
