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

export type PlaybackState = 'playing' | 'paused'

export interface SimulationHandle {
  getPlaybackState(): PlaybackState
  play(): void
  pause(): void
  reset(): void
  setWindDirection(x: number, y: number, z: number): void
  setWindStrength(v: number): void
  setBuoyancy(v: number): void
  setVorticityStrength(v: number): void
}
