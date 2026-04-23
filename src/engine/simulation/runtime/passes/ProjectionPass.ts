import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import { createProjectVelocityShader } from '../../shaders/passes/project-velocity.wgsl'
import type { PressureLevel } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchVolume } from '../shared/createVolumeDispatch'

export class ProjectionPass {
  private readonly fromA: ReturnType<typeof createComputeResources>
  private readonly fromB: ReturnType<typeof createComputeResources>

  constructor(
    device: GPUDevice,
    level: PressureLevel,
    velocitySource: GPUBuffer,
    velocityTarget: GPUBuffer,
  ) {
    const pipeline = createComputePipeline(
      device,
      'project-velocity-local',
      'project-velocity-local-shader',
      createProjectVelocityShader(),
    )
    this.fromA = createComputeResources(device, pipeline, 'project-from-pressure-a', [
      level.volumeInfoBuffer,
      velocitySource,
      level.pressureA,
      velocityTarget,
    ])
    this.fromB = createComputeResources(device, pipeline, 'project-from-pressure-b', [
      level.volumeInfoBuffer,
      velocitySource,
      level.pressureB,
      velocityTarget,
    ])
  }

  dispatch(encoder: GPUCommandEncoder, level: PressureLevel, pressureBuffer: 'a' | 'b') {
    dispatchVolume(
      encoder,
      'project-velocity-pass',
      pressureBuffer === 'a' ? this.fromA : this.fromB,
      level.resolution,
    )
  }
}
