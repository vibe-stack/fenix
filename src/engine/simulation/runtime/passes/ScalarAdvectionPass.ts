import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createAdvectScalarMacCormackShader } from '../../shaders/passes/advect-scalar-maccormack.wgsl'
import { createAdvectScalarSemiLagrangianShader } from '../../shaders/passes/advect-scalar-semilagrangian.wgsl'
import type { ScalarAdvectionMode, ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class ScalarAdvectionPass {
  private readonly semiResources: ReturnType<typeof createPairResources>
  private readonly maccormackResources: ReturnType<typeof createPairResources>

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
    velocity: GPUBuffer,
  ) {
    const semiPipeline = createComputePipeline(
      device,
      'advect-scalar-fields-semilagrangian',
      'advect-scalar-fields-semilagrangian-shader',
      createAdvectScalarSemiLagrangianShader(),
    )
    const maccormackPipeline = createComputePipeline(
      device,
      'advect-scalar-fields-maccormack',
      'advect-scalar-fields-maccormack-shader',
      createAdvectScalarMacCormackShader(),
    )

    this.semiResources = createPairResources(device, semiPipeline, simulationParams, volumeInfo, fields, velocity)
    this.maccormackResources = createPairResources(device, maccormackPipeline, simulationParams, volumeInfo, fields, velocity)
  }

  dispatch(
    encoder: GPUCommandEncoder,
    resolution: VolumeResolution,
    scalarSet: number,
    mode: ScalarAdvectionMode,
  ) {
    const resources = mode === 'semi-lagrangian' ? this.semiResources : this.maccormackResources

    dispatchVolume(encoder, `advect-scalar-fields-${mode}-pass`, resources[scalarSet], resolution)
  }
}

function createPairResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  simulationParams: GPUBuffer,
  volumeInfo: GPUBuffer,
  fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
  velocity: GPUBuffer,
) {
  return [
    createScalarResources(device, pipeline, simulationParams, volumeInfo, fields[0], velocity, fields[1]),
    createScalarResources(device, pipeline, simulationParams, volumeInfo, fields[1], velocity, fields[0]),
  ] as const
}

function createScalarResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  simulationParams: GPUBuffer,
  volumeInfo: GPUBuffer,
  source: ScalarFieldBuffers,
  velocity: GPUBuffer,
  target: ScalarFieldBuffers,
) {
  return createComputeResources(device, pipeline, `${source.density.label}-scalar-advection`, [
    simulationParams,
    volumeInfo,
    source.density,
    source.temperature,
    source.fuel,
    source.reaction,
    velocity,
    target.density,
    target.temperature,
    target.fuel,
    target.reaction,
  ])
}
