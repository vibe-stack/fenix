import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createComputeVorticityShader } from '../../shaders/passes/compute-vorticity.wgsl'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class VorticityPass {
  private readonly resources: ReturnType<typeof createComputeResources>

  constructor(
    device: GPUDevice,
    volumeInfo: GPUBuffer,
    velocity: GPUBuffer,
    vorticity: GPUBuffer,
    vorticityMagnitude: GPUBuffer,
  ) {
    const pipeline = createComputePipeline(
      device,
      'compute-vorticity-field',
      'compute-vorticity-field-shader',
      createComputeVorticityShader(),
    )
    this.resources = createComputeResources(device, pipeline, 'compute-vorticity-bind-group', [
      volumeInfo,
      velocity,
      vorticity,
      vorticityMagnitude,
    ])
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution) {
    dispatchVolume(encoder, 'compute-vorticity-field-pass', this.resources, resolution)
  }
}
