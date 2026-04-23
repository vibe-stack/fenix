import type { VolumeResolution } from '../../common/volumeResolution'
import { WORKGROUP_SIZE } from '../combustion-volume-simulation/constants'
import type { ComputeResources } from '../combustion-volume-simulation/types'

export function dispatchVolume(
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

export function dispatchLinear(
  encoder: GPUCommandEncoder,
  label: string,
  resources: ComputeResources,
  itemCount: number,
) {
  const pass = encoder.beginComputePass({ label })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(Math.ceil(itemCount / 256))
  pass.end()
}
