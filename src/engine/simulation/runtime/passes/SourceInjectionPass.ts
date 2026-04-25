import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createInjectSourceShader } from '../../shaders/passes/inject-source.wgsl'
import { GPU_BUFFER_COPY_DST, GPU_BUFFER_STORAGE } from '../combustion-volume-simulation/constants'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'
import { packExplosionSources, type ExplosionSource } from './explosionSources'

export class SourceInjectionPass {
  private readonly device: GPUDevice
  private readonly pipeline: GPUComputePipeline
  private sourceBuffer: GPUBuffer
  private readonly fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers]
  private readonly simulationParams: GPUBuffer
  private readonly volumeInfo: GPUBuffer
  private readonly velocity: GPUBuffer
  private resources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]
  private currentSourceCount: number

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
    velocity: GPUBuffer,
    initialSources: readonly ExplosionSource[],
  ) {
    this.device = device
    this.simulationParams = simulationParams
    this.volumeInfo = volumeInfo
    this.fields = fields
    this.velocity = velocity

    this.pipeline = createComputePipeline(
      device,
      'inject-combustion-sources',
      'inject-combustion-sources-shader',
      createInjectSourceShader(),
    )

    const sourceData = packExplosionSources(initialSources)
    this.currentSourceCount = initialSources.length
    this.sourceBuffer = device.createBuffer({
      label: 'combustion-sources',
      size: Math.max(sourceData.byteLength, 112), // 7 vec4s per source; keep min allocation for empty lists
      usage: GPU_BUFFER_STORAGE | GPU_BUFFER_COPY_DST,
    })
    device.queue.writeBuffer(this.sourceBuffer, 0, sourceData)

    this.resources = this.buildResources()
  }

  updateSources(sources: readonly ExplosionSource[]) {
    const sourceData = packExplosionSources(sources)

    if (sources.length !== this.currentSourceCount) {
      // Resize buffer — rebuild bind groups
      this.sourceBuffer.destroy()
      this.sourceBuffer = this.device.createBuffer({
        label: 'combustion-sources',
        size: Math.max(sourceData.byteLength, 112),
        usage: GPU_BUFFER_STORAGE | GPU_BUFFER_COPY_DST,
      })
      this.currentSourceCount = sources.length
      this.resources = this.buildResources()
    }

    this.device.queue.writeBuffer(this.sourceBuffer, 0, sourceData)
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution, scalarSet: number) {
    dispatchVolume(encoder, 'inject-combustion-sources-pass', this.resources[scalarSet], resolution)
  }

  dispose() {
    this.sourceBuffer.destroy()
  }

  private buildResources() {
    return this.fields.map((field) =>
      createComputeResources(this.device, this.pipeline, `${field.fuel.label}-source-injection`, [
        this.simulationParams,
        this.volumeInfo,
        this.sourceBuffer,
        field.density,
        field.temperature,
        field.fuel,
        field.reaction,
        this.velocity,
      ]),
    ) as [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]
  }
}
