import type { EmitterSource } from '../../simulation/emitters/emitterSource'
import type { RenderLight } from '../../render/lighting/renderLight'
import type { SimulationQualitySettings } from '../../simulation/runtime/combustion-volume-simulation/types'

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
  setGravityDirection(x: number, y: number, z: number): void
  setGravityStrength(v: number): void
  setBuoyancy(v: number): void
  setVorticityStrength(v: number): void
  setWorldSize(v: number): void
  setSimulationQuality(settings: Partial<SimulationQualitySettings>): void
  updateSources(sources: readonly EmitterSource[]): void
  setRenderParams(params: { stepCount?: number; lights?: readonly RenderLight[]; scatteringForward?: number; scatteringBack?: number }): void
  /** Advance simulation by deltaSeconds and render a frame at the given time, used for offline export. */
  renderOffscreenFrame(elapsedSeconds: number, deltaSeconds: number): void
  /** Returns the GPU canvas element used for rendering. */
  getCanvas(): HTMLCanvasElement | null
}
