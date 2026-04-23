import type { RendererDiagnostics } from '../../core/types/platform'
import { createWebGPUUnavailableMessage } from './describeWebGPUPageContext'
import { requestWebGPUAdapter } from './requestWebGPUAdapter'

interface GPUAdapterLike {
  features?: Iterable<string>
  info?: {
    description?: string
    vendor?: string
  }
}

type NavigatorWithGPU = Navigator & {
  gpu?: GPU
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
    return createFallbackDiagnostics(createWebGPUUnavailableMessage())
  }

  try {
    const { adapter, requestMode, errorMessage } = await requestWebGPUAdapter(runtimeNavigator.gpu)

    if (!adapter) {
      return createFallbackDiagnostics(
        errorMessage
          ? `WebGPU exists but no adapter was granted after trying default, high-performance, and low-power requests. Last browser error: ${errorMessage}`
          : 'WebGPU exists but no adapter was granted after trying default, high-performance, and low-power requests.',
      )
    }

    const adapterName =
      (adapter as GPUAdapterLike).info?.description?.trim() ||
      (adapter as GPUAdapterLike).info?.vendor?.trim() ||
      'WebGPU adapter ready'
    const featureCount = adapter.features ? Array.from(adapter.features).length : 0
    const requestModeLabel = requestMode === 'default' ? 'default request' : `${requestMode} request`

    return {
      supportState: 'ready',
      backend: 'webgpu',
      adapterName,
      message: `WebGPU adapter acquired via ${requestModeLabel} with ${featureCount} reported feature${featureCount === 1 ? '' : 's'}.`,
      featureCount,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'WebGPU probing failed for an unknown reason.'

    return createFallbackDiagnostics(message)
  }
}
