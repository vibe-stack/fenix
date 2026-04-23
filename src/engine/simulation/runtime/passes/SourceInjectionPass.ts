import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createInjectSourceShader } from '../../shaders/passes/inject-source.wgsl'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class SourceInjectionPass {
  private readonly pipeline: GPUComputePipeline
  private readonly resources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
  ) {
    this.pipeline = createComputePipeline(
      device,
      'inject-combustion-sources',
      'inject-combustion-sources-shader',
      createInjectSourceShader(),
    )
    this.resources = fields.map((field) =>
      createComputeResources(device, this.pipeline, `${field.fuel.label}-source-injection`, [
        simulationParams,
        volumeInfo,
        field.temperature,
        field.fuel,
      ]),
    ) as typeof this.resources
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution, scalarSet: number) {
    dispatchVolume(encoder, 'inject-combustion-sources-pass', this.resources[scalarSet], resolution)
  }
}
