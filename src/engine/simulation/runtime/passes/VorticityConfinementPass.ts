import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createApplyVorticityConfinementShader } from '../../shaders/passes/apply-vorticity-confinement.wgsl'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class VorticityConfinementPass {
  private readonly resources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    vorticity: GPUBuffer,
    vorticityMagnitude: GPUBuffer,
    velocity: GPUBuffer,
    confinementMagnitude: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
  ) {
    const pipeline = createComputePipeline(
      device,
      'apply-vorticity-confinement',
      'apply-vorticity-confinement-shader',
      createApplyVorticityConfinementShader(),
    )
    this.resources = fields.map((field) =>
      createComputeResources(device, pipeline, `${field.density.label}-vorticity-confinement`, [
        simulationParams,
        volumeInfo,
        vorticity,
        vorticityMagnitude,
        velocity,
        confinementMagnitude,
        field.density,
        field.temperature,
        field.reaction,
      ]),
    ) as typeof this.resources
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution, scalarSet: number) {
    dispatchVolume(encoder, 'apply-vorticity-confinement-pass', this.resources[scalarSet], resolution)
  }
}
