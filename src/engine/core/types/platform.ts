export type RuntimeBackend = 'webgpu' | 'cpu-fallback'
export type RuntimeSupportState = 'checking' | 'ready' | 'fallback'

export interface RendererDiagnostics {
  supportState: RuntimeSupportState
  backend: RuntimeBackend
  adapterName: string
  message: string
  featureCount: number
}

export type ViewportMountState = 'booting' | 'live' | 'failed'
