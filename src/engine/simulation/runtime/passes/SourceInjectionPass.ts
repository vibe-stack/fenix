import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createInjectScalarShader } from '../../shaders/passes/inject-scalar.wgsl'
import { createInjectVelocityShader } from '../../shaders/passes/inject-velocity.wgsl'
import { createInjectIgniterShader } from '../../shaders/passes/inject-igniter.wgsl'
import { GPU_BUFFER_COPY_DST, GPU_BUFFER_STORAGE } from '../combustion-volume-simulation/constants'
import type { ScalarFieldBuffers } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'
import { packEmitterSources, FLOATS_PER_EMITTER } from '../../emitters/packEmitterSources'
import type { EmitterSource } from '../../emitters/emitterSource'

const MIN_BUFFER_BYTES = 128

function makeSourceBuffer(device: GPUDevice, data: Float32Array): GPUBuffer {
  const buf = device.createBuffer({
    label: 'emitter-sources',
    size: Math.max(data.byteLength, MIN_BUFFER_BYTES),
    usage: GPU_BUFFER_STORAGE | GPU_BUFFER_COPY_DST,
  })
  device.queue.writeBuffer(buf, 0, data)
  return buf
}

export class SourceInjectionPass {
  private readonly device: GPUDevice
  private readonly scalarPipeline: GPUComputePipeline
  private readonly velocityPipeline: GPUComputePipeline
  private readonly igniterPipeline: GPUComputePipeline

  private sourceBuffer: GPUBuffer
  private currentSourceCount = 0

  private readonly fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers]
  private readonly simulationParams: GPUBuffer
  private readonly volumeInfo: GPUBuffer
  private readonly velocity: GPUBuffer

  // Two scalar sets × three pass types = 6 resource sets
  private scalarResources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]
  private velocityResources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]
  private igniterResources: [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]

  constructor(
    device: GPUDevice,
    simulationParams: GPUBuffer,
    volumeInfo: GPUBuffer,
    fields: readonly [ScalarFieldBuffers, ScalarFieldBuffers],
    velocity: GPUBuffer,
    initialSources: readonly EmitterSource[],
  ) {
    this.device = device
    this.simulationParams = simulationParams
    this.volumeInfo = volumeInfo
    this.fields = fields
    this.velocity = velocity

    this.scalarPipeline = createComputePipeline(device, 'inject-scalar', 'inject-scalar-shader', createInjectScalarShader())
    this.velocityPipeline = createComputePipeline(device, 'inject-velocity', 'inject-velocity-shader', createInjectVelocityShader())
    this.igniterPipeline = createComputePipeline(device, 'inject-igniter', 'inject-igniter-shader', createInjectIgniterShader())

    const data = packEmitterSources(initialSources)
    this.currentSourceCount = initialSources.length
    this.sourceBuffer = makeSourceBuffer(device, data)

    this.scalarResources = this.buildScalarResources()
    this.velocityResources = this.buildVelocityResources()
    this.igniterResources = this.buildIgniterResources()
  }

  updateSources(sources: readonly EmitterSource[]) {
    const data = packEmitterSources(sources)
    if (sources.length !== this.currentSourceCount) {
      this.sourceBuffer.destroy()
      this.sourceBuffer = makeSourceBuffer(this.device, data)
      this.currentSourceCount = sources.length
      this.scalarResources = this.buildScalarResources()
      this.velocityResources = this.buildVelocityResources()
      this.igniterResources = this.buildIgniterResources()
    } else {
      this.device.queue.writeBuffer(this.sourceBuffer, 0, data)
    }
  }

  dispatch(encoder: GPUCommandEncoder, resolution: VolumeResolution, scalarSet: number) {
    dispatchVolume(encoder, 'inject-scalar-pass', this.scalarResources[scalarSet], resolution)
    dispatchVolume(encoder, 'inject-velocity-pass', this.velocityResources[scalarSet], resolution)
    dispatchVolume(encoder, 'inject-igniter-pass', this.igniterResources[scalarSet], resolution)
  }

  dispose() {
    this.sourceBuffer.destroy()
  }

  private buildScalarResources() {
    return this.fields.map((f) =>
      createComputeResources(this.device, this.scalarPipeline, `${f.fuel.label}-inject-scalar`, [
        this.simulationParams,
        this.volumeInfo,
        this.sourceBuffer,
        f.density,
        f.temperature,
        f.fuel,
      ]),
    ) as [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]
  }

  private buildVelocityResources() {
    return this.fields.map((f) =>
      createComputeResources(this.device, this.velocityPipeline, `${f.fuel.label}-inject-velocity`, [
        this.simulationParams,
        this.volumeInfo,
        this.sourceBuffer,
        this.velocity,
      ]),
    ) as [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]
  }

  private buildIgniterResources() {
    return this.fields.map((f) =>
      createComputeResources(this.device, this.igniterPipeline, `${f.fuel.label}-inject-igniter`, [
        this.simulationParams,
        this.volumeInfo,
        this.sourceBuffer,
        f.reaction,
        f.temperature,
      ]),
    ) as [ReturnType<typeof createComputeResources>, ReturnType<typeof createComputeResources>]
  }
}
