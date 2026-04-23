import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createInjectSourceShader } from '../../shaders/passes/inject-source.wgsl'
import { GPU_BUFFER_COPY_DST, GPU_BUFFER_STORAGE } from '../combustion-volume-simulation/constants'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'
import { cinematicExplosionSources, packExplosionSources } from './explosionSources'

export class SourceInjectionPass {
  private readonly pipeline: GPUComputePipeline
  private readonly sourceBuffer: GPUBuffer
  private readonly resources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
    velocity: GPUBuffer,
  ) {
    this.pipeline = createComputePipeline(
      device,
      'inject-combustion-sources',
      'inject-combustion-sources-shader',
      createInjectSourceShader(),
    )
    const sourceData = packExplosionSources(cinematicExplosionSources)
    this.sourceBuffer = device.createBuffer({
      label: 'cinematic-explosion-sources',
      size: sourceData.byteLength,
      usage: GPU_BUFFER_STORAGE | GPU_BUFFER_COPY_DST,
    })

    device.queue.writeBuffer(this.sourceBuffer, 0, sourceData)
    this.resources = fields.map((field) =>
      createComputeResources(device, this.pipeline, `${field.fuel.label}-source-injection`, [
        simulationParams,
        volumeInfo,
        this.sourceBuffer,
        field.density,
        field.temperature,
        field.fuel,
        field.reaction,
        velocity,
      ]),
    ) as typeof this.resources
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution, scalarSet: number) {
    dispatchVolume(encoder, 'inject-combustion-sources-pass', this.resources[scalarSet], resolution)
  }

  dispose() {
    this.sourceBuffer.destroy()
  }
}
