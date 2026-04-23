import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createAdvectVelocitySemiLagrangianShader } from '../../shaders/passes/advect-velocity-semilagrangian.wgsl'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class VelocityAdvectionPass {
  private readonly resources: ReturnType<typeof createComputeResources>

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    velocitySource: GPUBuffer,
    velocityTarget: GPUBuffer,
  ) {
    const pipeline = createComputePipeline(
      device,
      'advect-velocity-field',
      'advect-velocity-field-shader',
      createAdvectVelocitySemiLagrangianShader(),
    )
    this.resources = createComputeResources(device, pipeline, 'velocity-advection-bind-group', [
      simulationParams,
      volumeInfo,
      velocitySource,
      velocityTarget,
    ])
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution) {
    dispatchVolume(encoder, 'advect-velocity-field-pass', this.resources, resolution)
  }
}
