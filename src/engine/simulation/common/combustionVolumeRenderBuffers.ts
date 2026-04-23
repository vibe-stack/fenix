export interface CombustionVolumeRenderBuffers {
  density: GPUBuffer
  temperature: GPUBuffer
  fuel: GPUBuffer
  reaction: GPUBuffer
  activeBrickFlags?: GPUBuffer
  activeBrickInfo?: GPUBuffer
}
