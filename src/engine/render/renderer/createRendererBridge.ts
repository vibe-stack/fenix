import type { RendererDiagnostics } from '../../core/types/platform'
import { detectWebGPUSupport } from '../../gpu/context/detectWebGPUSupport'
import type { ViewportRuntime } from './createViewportRuntime'

export interface RendererBridge {
  readonly backendTarget: 'three-webgpu'
  readonly diagnostics: RendererDiagnostics
  refresh(): Promise<RendererDiagnostics>
  createViewportRuntime(): Promise<ViewportRuntime>
}

export function createRendererBridge(): RendererBridge {
  let diagnostics: RendererDiagnostics = {
    supportState: 'checking',
    backend: 'webgpu',
    adapterName: 'Probing browser adapter',
    message: 'Checking browser WebGPU capabilities for the viewport runtime.',
    featureCount: 0,
  }

  return {
    backendTarget: 'three-webgpu',
    get diagnostics() {
      return diagnostics
    },
    async refresh() {
      diagnostics = await detectWebGPUSupport()

      return diagnostics
    },
    async createViewportRuntime() {
      const { createViewportRuntime } = await import('./createViewportRuntime')

      return createViewportRuntime({
        resolveDiagnostics: () => diagnostics,
      })
    },
  }
}
