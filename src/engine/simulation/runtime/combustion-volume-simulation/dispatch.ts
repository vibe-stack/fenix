import type { VolumeResolution } from '../../common/volumeResolution'
import { WORKGROUP_SIZE } from './constants'
import type { ComputeResources, PressureBufferId, PressureLevel } from './types'

export function runPressureSmoothSequence(
  encoder: GPUCommandEncoder,
  level: PressureLevel,
  iterations: number,
  startingBuffer: PressureBufferId,
): PressureBufferId {
  let activeBuffer = startingBuffer

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    runVolumePass(
      encoder,
      'smooth-pressure-pass',
      activeBuffer === 'a' ? level.smoothAB : level.smoothBA,
      level.resolution,
    )
    activeBuffer = activeBuffer === 'a' ? 'b' : 'a'
  }

  return activeBuffer
}

export function runClearPass(
  encoder: GPUCommandEncoder,
  resources: ComputeResources,
  voxelCount: number,
) {
  const pass = encoder.beginComputePass({ label: 'clear-storage-buffer-pass' })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(Math.ceil(voxelCount / 256))
  pass.end()
}

export function runVolumePass(
  encoder: GPUCommandEncoder,
  label: string,
  resources: ComputeResources,
  resolution: VolumeResolution,
) {
  const pass = encoder.beginComputePass({ label })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(
    Math.ceil(resolution.width / WORKGROUP_SIZE),
    Math.ceil(resolution.height / WORKGROUP_SIZE),
    Math.ceil(resolution.depth / WORKGROUP_SIZE),
  )
  pass.end()
}
