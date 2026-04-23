import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createApplyVorticityConfinementShader } from '../../shaders/passes/apply-vorticity-confinement.wgsl'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class VorticityConfinementPass {
  private readonly resources: ReturnType<typeof createComputeResources>

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    vorticity: GPUBuffer,
    vorticityMagnitude: GPUBuffer,
    velocity: GPUBuffer,
    confinementMagnitude: GPUBuffer,
  ) {
    const pipeline = createComputePipeline(
      device,
      'apply-vorticity-confinement',
      'apply-vorticity-confinement-shader',
      createApplyVorticityConfinementShader(),
    )
    this.resources = createComputeResources(device, pipeline, 'vorticity-confinement-bind-group', [
      simulationParams,
      volumeInfo,
      vorticity,
      vorticityMagnitude,
      velocity,
      confinementMagnitude,
    ])
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution) {
    dispatchVolume(encoder, 'apply-vorticity-confinement-pass', this.resources, resolution)
  }
}
