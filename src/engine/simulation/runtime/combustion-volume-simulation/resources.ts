import type { ComputeResources, ScalarFieldBuffers } from './types'

export function createClearResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  target: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${target.label ?? 'buffer'}-clear-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: target } }],
    }),
  }
}

export function createSourceInjectionResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  simulationParamsBuffer: GPUBuffer,
  volumeInfoBuffer: GPUBuffer,
  fields: ScalarFieldBuffers,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${fields.fuel.label ?? 'fields'}-inject-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: simulationParamsBuffer } },
        { binding: 1, resource: { buffer: volumeInfoBuffer } },
        { binding: 2, resource: { buffer: fields.temperature } },
        { binding: 3, resource: { buffer: fields.fuel } },
      ],
    }),
  }
}

export function createCombustionResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  simulationParamsBuffer: GPUBuffer,
  volumeInfoBuffer: GPUBuffer,
  fields: ScalarFieldBuffers,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${fields.density.label ?? 'fields'}-combustion-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: simulationParamsBuffer } },
        { binding: 1, resource: { buffer: volumeInfoBuffer } },
        { binding: 2, resource: { buffer: fields.density } },
        { binding: 3, resource: { buffer: fields.temperature } },
        { binding: 4, resource: { buffer: fields.fuel } },
        { binding: 5, resource: { buffer: fields.turbulence } },
      ],
    }),
  }
}

export function createBuoyancyResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  simulationParamsBuffer: GPUBuffer,
  volumeInfoBuffer: GPUBuffer,
  fields: ScalarFieldBuffers,
  velocityBuffer: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${velocityBuffer.label ?? 'velocity'}-buoyancy-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: simulationParamsBuffer } },
        { binding: 1, resource: { buffer: volumeInfoBuffer } },
        { binding: 2, resource: { buffer: fields.density } },
        { binding: 3, resource: { buffer: fields.temperature } },
        { binding: 4, resource: { buffer: velocityBuffer } },
      ],
    }),
  }
}

export function createVelocityAdvectionResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  simulationParamsBuffer: GPUBuffer,
  volumeInfoBuffer: GPUBuffer,
  velocitySource: GPUBuffer,
  velocityTarget: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${velocitySource.label ?? 'velocity'}-advect-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: simulationParamsBuffer } },
        { binding: 1, resource: { buffer: volumeInfoBuffer } },
        { binding: 2, resource: { buffer: velocitySource } },
        { binding: 3, resource: { buffer: velocityTarget } },
      ],
    }),
  }
}

export function createScalarAdvectionResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  simulationParamsBuffer: GPUBuffer,
  volumeInfoBuffer: GPUBuffer,
  sourceFields: ScalarFieldBuffers,
  velocityBuffer: GPUBuffer,
  targetFields: ScalarFieldBuffers,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${sourceFields.density.label ?? 'fields'}-scalar-advect-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: simulationParamsBuffer } },
        { binding: 1, resource: { buffer: volumeInfoBuffer } },
        { binding: 2, resource: { buffer: sourceFields.density } },
        { binding: 3, resource: { buffer: sourceFields.temperature } },
        { binding: 4, resource: { buffer: sourceFields.fuel } },
        { binding: 5, resource: { buffer: sourceFields.turbulence } },
        { binding: 6, resource: { buffer: velocityBuffer } },
        { binding: 7, resource: { buffer: targetFields.density } },
        { binding: 8, resource: { buffer: targetFields.temperature } },
        { binding: 9, resource: { buffer: targetFields.fuel } },
        { binding: 10, resource: { buffer: targetFields.turbulence } },
      ],
    }),
  }
}

export function createDivergenceResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  volumeInfoBuffer: GPUBuffer,
  velocitySource: GPUBuffer,
  divergenceTarget: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: 'divergence-bind-group',
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: volumeInfoBuffer } },
        { binding: 1, resource: { buffer: velocitySource } },
        { binding: 2, resource: { buffer: divergenceTarget } },
      ],
    }),
  }
}

export function createPressureSmoothResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  volumeInfoBuffer: GPUBuffer,
  divergenceSource: GPUBuffer,
  pressureSource: GPUBuffer,
  pressureTarget: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${pressureSource.label ?? 'pressure'}-smooth-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: volumeInfoBuffer } },
        { binding: 1, resource: { buffer: divergenceSource } },
        { binding: 2, resource: { buffer: pressureSource } },
        { binding: 3, resource: { buffer: pressureTarget } },
      ],
    }),
  }
}

export function createResidualResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  volumeInfoBuffer: GPUBuffer,
  divergenceSource: GPUBuffer,
  pressureSource: GPUBuffer,
  residualTarget: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${pressureSource.label ?? 'pressure'}-residual-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: volumeInfoBuffer } },
        { binding: 1, resource: { buffer: divergenceSource } },
        { binding: 2, resource: { buffer: pressureSource } },
        { binding: 3, resource: { buffer: residualTarget } },
      ],
    }),
  }
}

export function createRestrictionResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  sourceVolumeInfoBuffer: GPUBuffer,
  targetVolumeInfoBuffer: GPUBuffer,
  sourceBuffer: GPUBuffer,
  targetBuffer: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${sourceBuffer.label ?? 'source'}-restrict-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: sourceVolumeInfoBuffer } },
        { binding: 1, resource: { buffer: targetVolumeInfoBuffer } },
        { binding: 2, resource: { buffer: sourceBuffer } },
        { binding: 3, resource: { buffer: targetBuffer } },
      ],
    }),
  }
}

export function createProlongationResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  coarseVolumeInfoBuffer: GPUBuffer,
  fineVolumeInfoBuffer: GPUBuffer,
  coarsePressure: GPUBuffer,
  finePressure: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${coarsePressure.label ?? 'coarse'}-prolongate-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: coarseVolumeInfoBuffer } },
        { binding: 1, resource: { buffer: fineVolumeInfoBuffer } },
        { binding: 2, resource: { buffer: coarsePressure } },
        { binding: 3, resource: { buffer: finePressure } },
      ],
    }),
  }
}

export function createProjectionResources(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  volumeInfoBuffer: GPUBuffer,
  velocitySource: GPUBuffer,
  pressureSource: GPUBuffer,
  velocityTarget: GPUBuffer,
): ComputeResources {
  return {
    pipeline,
    bindGroup: device.createBindGroup({
      label: `${pressureSource.label ?? 'pressure'}-projection-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: volumeInfoBuffer } },
        { binding: 1, resource: { buffer: velocitySource } },
        { binding: 2, resource: { buffer: pressureSource } },
        { binding: 3, resource: { buffer: velocityTarget } },
      ],
    }),
  }
}
