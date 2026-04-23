import type { ComputeResources } from '../combustion-volume-simulation/types'

export function createComputeResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  label: string,
  buffers: readonly GPUBuffer[],
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label,
      layout: pipeline.getBindGroupLayout(0),
      entries: buffers.map((buffer, binding) => ({
        binding,
        resource: { buffer },
      })),
    }),
  }
}
