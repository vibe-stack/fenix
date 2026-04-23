import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import { createComputeActiveBricksShader } from '../../shaders/passes/compute-active-bricks.wgsl'
import type { SparseBrickLayout } from '../../sparse/createSparseBrickLayout'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class ActiveBricksPass {
  private readonly resources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]

  constructor(
    device: GPUDevice,
    volumeInfo: GPUBuffer,
    brickInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
    activeBrickFlags: readonly [GPUBuffer, GPUBuffer],
  ) {
    const pipeline = createComputePipeline(
      device,
      'compute-active-sparse-bricks',
      'compute-active-sparse-bricks-shader',
      createComputeActiveBricksShader(),
    )

    this.resources = fields.map((field, index) =>
      createComputeResources(device, pipeline, `${field.density.label}-active-bricks`, [
        volumeInfo,
        brickInfo,
        field.density,
        field.temperature,
        field.reaction,
        activeBrickFlags[index],
      ]),
    ) as typeof this.resources
  }

  dispatch(encoder: GPUCommandEncoder, layout: SparseBrickLayout, scalarSet: number) {
    dispatchVolume(encoder, 'compute-active-sparse-bricks-pass', this.resources[scalarSet], {
      width: layout.brickCountX,
      height: layout.brickCountY,
      depth: layout.brickCountZ,
    })
  }
}
