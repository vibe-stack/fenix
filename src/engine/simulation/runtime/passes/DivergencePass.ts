import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createComputeDivergenceShader } from '../../shaders/passes/compute-divergence.wgsl'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class DivergencePass {
  private readonly resources: ReturnType<typeof createComputeResources>

  constructor(device: GPUDevice, volumeInfo: GPUBuffer, velocity: GPUBuffer, divergence: GPUBuffer) {
    const pipeline = createComputePipeline(
      device,
      'compute-divergence-local',
      'compute-divergence-local-shader',
      createComputeDivergenceShader(),
    )
    this.resources = createComputeResources(device, pipeline, 'divergence-bind-group', [
      volumeInfo,
      velocity,
      divergence,
    ])
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution) {
    dispatchVolume(encoder, 'compute-divergence-pass', this.resources, resolution)
  }
}
