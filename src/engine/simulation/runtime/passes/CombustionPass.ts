import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createCombustionUpdateShader } from '../../shaders/passes/combustion-update.wgsl'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class CombustionPass {
  private readonly resources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
  ) {
    const pipeline = createComputePipeline(
      device,
      'update-combustion-state',
      'update-combustion-state-shader',
      createCombustionUpdateShader(),
    )
    this.resources = fields.map((field) =>
      createComputeResources(device, pipeline, `${field.density.label}-combustion`, [
        simulationParams,
        volumeInfo,
        field.density,
        field.temperature,
        field.fuel,
        field.reaction,
      ]),
    ) as typeof this.resources
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution, scalarSet: number) {
    dispatchVolume(encoder, 'update-combustion-state-pass', this.resources[scalarSet], resolution)
  }
}
