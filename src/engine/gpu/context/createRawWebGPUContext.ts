export interface RawWebGPUContext {
  adapter: GPUAdapter
  device: GPUDevice
  context: GPUCanvasContext
  format: GPUTextureFormat
}

const REQUIRED_STORAGE_BUFFERS_PER_STAGE = 9

export async function createRawWebGPUContext(
  canvas: HTMLCanvasElement,
): Promise<RawWebGPUContext> {
  if (!navigator.gpu) {
    throw new Error('WebGPU is unavailable in this browser.')
  }

  const adapter = await navigator.gpu.requestAdapter()

  if (!adapter) {
    throw new Error('The browser exposed WebGPU but did not grant an adapter.')
  }

  const supportedStorageBuffers = adapter.limits.maxStorageBuffersPerShaderStage

  if (supportedStorageBuffers < REQUIRED_STORAGE_BUFFERS_PER_STAGE) {
    throw new Error(
      `This WebGPU adapter exposes only ${supportedStorageBuffers} storage buffers per shader stage, but the current GPU solver requires ${REQUIRED_STORAGE_BUFFERS_PER_STAGE}.`,
    )
  }

  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBuffersPerShaderStage: REQUIRED_STORAGE_BUFFERS_PER_STAGE,
    },
  })
  const context = canvas.getContext('webgpu') as GPUCanvasContext | null

  if (!context) {
    throw new Error('Failed to acquire a WebGPU canvas context.')
  }

  const format = navigator.gpu.getPreferredCanvasFormat()

  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  })

  return {
    adapter,
    device,
    context,
    format,
  }
}
