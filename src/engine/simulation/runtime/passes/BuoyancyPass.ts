import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createApplyBuoyancyShader } from '../../shaders/passes/apply-buoyancy.wgsl'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class BuoyancyPass {
  private readonly resources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
    velocity: GPUBuffer,
    activeBrickFlags: readonly [GPUBuffer, GPUBuffer],
    activeBrickInfo: GPUBuffer,
  ) {
    const pipeline = createComputePipeline(
      device,
      'apply-buoyancy-force',
      'apply-buoyancy-force-shader',
      createApplyBuoyancyShader(),
    )
    this.resources = fields.map((field, index) =>
      createComputeResources(device, pipeline, `${field.density.label}-buoyancy`, [
        simulationParams,
        volumeInfo,
        field.density,
        field.temperature,
        velocity,
        activeBrickFlags[index],
        activeBrickInfo,
      ]),
    ) as typeof this.resources
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution, scalarSet: number) {
    dispatchVolume(encoder, 'apply-buoyancy-force-pass', this.resources[scalarSet], resolution)
  }
}
