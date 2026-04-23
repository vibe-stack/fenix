import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import { createClearStorageBufferShader } from '../../shaders/passes/clear-storage-buffer.wgsl'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchLinear } from '../shared/createVolumeDispatch'

export class ClearPass {
  private readonly device: GPUDevice
  private readonly pipeline: GPUComputePipeline

  constructor(device: GPUDevice) {
    this.device = device
    this.pipeline = createComputePipeline(
      device,
      'clear-storage-buffer',
      'clear-storage-buffer-shader',
      createClearStorageBufferShader(),
    )
  }

  clear(encoder: GPUCommandEncoder, buffer: GPUBuffer, itemCount: number) {
    const resources = createComputeResources(this.device, this.pipeline, `${buffer.label}-clear`, [buffer])

    dispatchLinear(encoder, 'clear-storage-buffer-pass', resources, itemCount)
  }
}
