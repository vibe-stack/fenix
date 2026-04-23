import type { VolumeResolution } from '../../common/volumeResolution'
import {
  GPU_BUFFER_COPY_DST,
  GPU_BUFFER_COPY_SRC,
  GPU_BUFFER_STORAGE,
  GPU_BUFFER_UNIFORM,
} from './constants'
import type { ScalarFieldBuffers } from './types'

export function halveResolution(resolution: VolumeResolution): VolumeResolution {
  return {
    width: Math.max(4, Math.floor(resolution.width / 2)),
    height: Math.max(4, Math.floor(resolution.height / 2)),
    depth: Math.max(4, Math.floor(resolution.depth / 2)),
  }
}

export function voxelCountFor(resolution: VolumeResolution) {
  return resolution.width * resolution.height * resolution.depth
}

export function createStaticBuffer(
  device: GPUDevice,
  label: string,
  data: Uint32Array | Float32Array,
) {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })

  device.queue.writeBuffer(buffer, 0, data)

  return buffer
}

export function createStorageBuffer(
  device: GPUDevice,
  label: string,
  size: number,
) {
  return device.createBuffer({
    label,
    size,
    usage: GPU_BUFFER_STORAGE | GPU_BUFFER_COPY_DST | GPU_BUFFER_COPY_SRC,
  })
}

export function createScalarFieldBuffers(
  device: GPUDevice,
  label: string,
  voxelCount: number,
): ScalarFieldBuffers {
  return {
    density: createStorageBuffer(device, `${label}-density`, voxelCount * 4),
    temperature: createStorageBuffer(device, `${label}-temperature`, voxelCount * 4),
    fuel: createStorageBuffer(device, `${label}-fuel`, voxelCount * 4),
    turbulence: createStorageBuffer(device, `${label}-turbulence`, voxelCount * 4),
  }
}

export function destroyScalarFieldBuffers(buffers: ScalarFieldBuffers) {
  buffers.density.destroy()
  buffers.temperature.destroy()
  buffers.fuel.destroy()
  buffers.turbulence.destroy()
}
