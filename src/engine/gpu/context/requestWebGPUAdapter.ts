export type WebGPUAdapterRequestMode = 'default' | GPUPowerPreference

export interface RequestedWebGPUAdapter {
  adapter: GPUAdapter | null
  requestMode: WebGPUAdapterRequestMode | null
  errorMessage: string | null
}

const ADAPTER_REQUESTS: Array<{
  mode: WebGPUAdapterRequestMode
  options?: GPURequestAdapterOptions
}> = [
  { mode: 'default' },
  { mode: 'high-performance', options: { powerPreference: 'high-performance' } },
  { mode: 'low-power', options: { powerPreference: 'low-power' } },
]

export async function requestWebGPUAdapter(gpu: GPU): Promise<RequestedWebGPUAdapter> {
  let errorMessage: string | null = null

  for (const request of ADAPTER_REQUESTS) {
    try {
      const adapter = await gpu.requestAdapter(request.options)

      if (adapter) {
        return {
          adapter,
          requestMode: request.mode,
          errorMessage,
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'WebGPU adapter request failed.'
    }
  }

  return {
    adapter: null,
    requestMode: null,
    errorMessage,
  }
}