import type { VolumeResolution } from './volumeResolution'

export interface CombustionVolumeRenderFrame {
  resolution: VolumeResolution
  density: Float32Array
  temperature: Float32Array
  fuel: Float32Array
  reaction: Float32Array
}
