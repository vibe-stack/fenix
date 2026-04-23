import type { VolumeResolution } from '../../common/volumeResolution'

export interface SimulationPassContext {
  encoder: GPUCommandEncoder
  resolution: VolumeResolution
}
