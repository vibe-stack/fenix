import type { RendererDiagnostics } from '../../core/types/platform'

interface GPUAdapterLike {
  features?: Iterable<string>
  info?: {
    description?: string
    vendor?: string
  }
}

type NavigatorWithGPU = Navigator & {
  gpu?: {
    requestAdapter(): Promise<GPUAdapterLike | null>
  }
}

function createFallbackDiagnostics(message: string): RendererDiagnostics {
  return {
    supportState: 'fallback',
    backend: 'cpu-fallback',
    adapterName: 'No WebGPU adapter',
    message,
    featureCount: 0,
  }
}

export async function detectWebGPUSupport(): Promise<RendererDiagnostics> {
  if (typeof navigator === 'undefined') {
    return createFallbackDiagnostics('Navigator is unavailable in the current runtime.')
  }

  const runtimeNavigator = navigator as NavigatorWithGPU

  if (!runtimeNavigator.gpu) {
    return createFallbackDiagnostics('WebGPU is unavailable in this browser, so the editor stays in shell mode.')
  }

  try {
    const adapter = await runtimeNavigator.gpu.requestAdapter()

    if (!adapter) {
      return createFallbackDiagnostics('WebGPU exists but no adapter was granted by the browser.')
    }

    const adapterName =
      adapter.info?.description?.trim() ||
      adapter.info?.vendor?.trim() ||
      'WebGPU adapter ready'
    const featureCount = adapter.features ? Array.from(adapter.features).length : 0

    return {
      supportState: 'ready',
      backend: 'webgpu',
      adapterName,
      message: `WebGPU adapter acquired with ${featureCount} reported feature${featureCount === 1 ? '' : 's'}.`,
      featureCount,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'WebGPU probing failed for an unknown reason.'

    return createFallbackDiagnostics(message)
  }
}
