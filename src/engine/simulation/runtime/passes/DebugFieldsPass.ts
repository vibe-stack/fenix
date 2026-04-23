import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createComputeDebugFieldsShader } from '../../shaders/passes/compute-debug-fields.wgsl'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class DebugFieldsPass {
  private readonly resources: ReturnType<typeof createComputeResources>

  constructor(device: GPUDevice, volumeInfo: GPUBuffer, velocity: GPUBuffer, velocityMagnitude: GPUBuffer) {
    const pipeline = createComputePipeline(
      device,
      'compute-simulation-debug-fields',
      'compute-simulation-debug-fields-shader',
      createComputeDebugFieldsShader(),
    )
    this.resources = createComputeResources(device, pipeline, 'debug-fields-bind-group', [
      volumeInfo,
      velocity,
      velocityMagnitude,
    ])
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution) {
    dispatchVolume(encoder, 'compute-simulation-debug-fields-pass', this.resources, resolution)
  }
}
