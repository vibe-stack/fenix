import type { VolumeDisplayMode } from '../volumetrics/volumeDisplayMode'
import type { RendererDiagnostics } from '../../core/types/platform'
import { detectWebGPUSupport } from '../../gpu/context/detectWebGPUSupport'
import type { ViewportRuntime } from './createViewportRuntime'
import type { VolumeResolution } from '../../simulation/common/volumeResolution'

export interface RendererBridge {
  readonly backendTarget: 'raw-webgpu-device'
  readonly diagnostics: RendererDiagnostics
  refresh(): Promise<RendererDiagnostics>
  createViewportRuntime(displayMode: VolumeDisplayMode, resolution: VolumeResolution): Promise<ViewportRuntime>
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
    backendTarget: 'raw-webgpu-device',
    get diagnostics() {
      return diagnostics
    },
    async refresh() {
      diagnostics = await detectWebGPUSupport()

      return diagnostics
    },
    async createViewportRuntime(displayMode, resolution) {
      const { createViewportRuntime } = await import('./createViewportRuntime')

      return createViewportRuntime({
        displayMode,
        resolution,
      })
    },
  }
}
