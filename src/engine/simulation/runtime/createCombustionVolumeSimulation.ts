import type { CombustionVolumeRenderBuffers } from '../common/combustionVolumeRenderBuffers'
import type { VolumeResolution } from '../common/volumeResolution'

export interface CombustionVolumeSimulation {
  readonly resolution: VolumeResolution
  step(encoder: GPUCommandEncoder, elapsedSeconds: number, stepSeconds: number): void
  getRenderBuffers(): CombustionVolumeRenderBuffers
  dispose(): void
}

interface ComputeResources {
  bindGroup: GPUBindGroup
  pipeline: GPUComputePipeline
}

type ScalarFieldBuffers = CombustionVolumeRenderBuffers

const WORKGROUP_SIZE = 4
const PRESSURE_ITERATIONS = 14
const GPU_BUFFER_UNIFORM = 0x0040
const GPU_BUFFER_STORAGE = 0x0080
const GPU_BUFFER_COPY_SRC = 0x0004
const GPU_BUFFER_COPY_DST = 0x0008

export function createCombustionVolumeSimulation(
  device: GPUDevice,
): CombustionVolumeSimulation {
  const resolution: VolumeResolution = { width: 48, height: 72, depth: 48 }
  const voxelCount = resolution.width * resolution.height * resolution.depth
  const volumeMeta = new Uint32Array([
    resolution.width,
    resolution.height,
    resolution.depth,
    voxelCount,
  ])
  const volumeInfoBuffer = createStaticBuffer(device, 'volume-info', volumeMeta)
  const simulationParamsBuffer = device.createBuffer({
    label: 'simulation-params',
    size: 16,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })
  const scalarA = createScalarFieldBuffers(device, 'scalar-a', voxelCount)
  const scalarB = createScalarFieldBuffers(device, 'scalar-b', voxelCount)
  const velocityCurrent = createStorageBuffer(device, 'velocity-current', voxelCount * 16)
  const velocityScratch = createStorageBuffer(device, 'velocity-scratch', voxelCount * 16)
  const divergence = createStorageBuffer(device, 'divergence', voxelCount * 4)
  const pressureA = createStorageBuffer(device, 'pressure-a', voxelCount * 4)
  const pressureB = createStorageBuffer(device, 'pressure-b', voxelCount * 4)

  const clearPipeline = device.createComputePipeline({
    label: 'clear-storage-buffer',
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: 'clear-storage-buffer-shader',
        code: createClearShader(),
      }),
      entryPoint: 'main',
    },
  })
  const sourcePipeline = device.createComputePipeline({
    label: 'apply-combustion-sources',
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: 'apply-combustion-sources-shader',
        code: createSourceShader(),
      }),
      entryPoint: 'main',
    },
  })
  const velocityAdvectPipeline = device.createComputePipeline({
    label: 'advect-velocity-field',
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: 'advect-velocity-field-shader',
        code: createVelocityAdvectionShader(),
      }),
      entryPoint: 'main',
    },
  })
  const scalarAdvectPipeline = device.createComputePipeline({
    label: 'advect-scalar-fields',
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: 'advect-scalar-fields-shader',
        code: createScalarAdvectionShader(),
      }),
      entryPoint: 'main',
    },
  })
  const divergencePipeline = device.createComputePipeline({
    label: 'compute-divergence',
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: 'compute-divergence-shader',
        code: createDivergenceShader(),
      }),
      entryPoint: 'main',
    },
  })
  const pressurePipeline = device.createComputePipeline({
    label: 'solve-pressure',
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: 'solve-pressure-shader',
        code: createPressureShader(),
      }),
      entryPoint: 'main',
    },
  })
  const projectPipeline = device.createComputePipeline({
    label: 'project-velocity',
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: 'project-velocity-shader',
        code: createProjectionShader(),
      }),
      entryPoint: 'main',
    },
  })
  const sourcePassA = createSourceResources(
    device,
    sourcePipeline,
    simulationParamsBuffer,
    volumeInfoBuffer,
    scalarA,
    velocityCurrent,
  )
  const sourcePassB = createSourceResources(
    device,
    sourcePipeline,
    simulationParamsBuffer,
    volumeInfoBuffer,
    scalarB,
    velocityCurrent,
  )
  const velocityAdvectPass = createVelocityAdvectionResources(
    device,
    velocityAdvectPipeline,
    simulationParamsBuffer,
    volumeInfoBuffer,
    velocityCurrent,
    velocityScratch,
  )
  const scalarAdvectAtoB = createScalarAdvectionResources(
    device,
    scalarAdvectPipeline,
    simulationParamsBuffer,
    volumeInfoBuffer,
    scalarA,
    velocityCurrent,
    scalarB,
  )
  const scalarAdvectBtoA = createScalarAdvectionResources(
    device,
    scalarAdvectPipeline,
    simulationParamsBuffer,
    volumeInfoBuffer,
    scalarB,
    velocityCurrent,
    scalarA,
  )
  const divergencePass = createDivergenceResources(
    device,
    divergencePipeline,
    volumeInfoBuffer,
    velocityScratch,
    divergence,
  )
  const pressureAB = createPressureResources(
    device,
    pressurePipeline,
    volumeInfoBuffer,
    divergence,
    pressureA,
    pressureB,
  )
  const pressureBA = createPressureResources(
    device,
    pressurePipeline,
    volumeInfoBuffer,
    divergence,
    pressureB,
    pressureA,
  )
  const projectFromA = createProjectionResources(
    device,
    projectPipeline,
    volumeInfoBuffer,
    velocityScratch,
    pressureA,
    velocityCurrent,
  )
  const projectFromB = createProjectionResources(
    device,
    projectPipeline,
    volumeInfoBuffer,
    velocityScratch,
    pressureB,
    velocityCurrent,
  )
  const clearResources = [
    createClearResources(device, clearPipeline, scalarA.density),
    createClearResources(device, clearPipeline, scalarA.temperature),
    createClearResources(device, clearPipeline, scalarA.fuel),
    createClearResources(device, clearPipeline, scalarA.turbulence),
    createClearResources(device, clearPipeline, scalarB.density),
    createClearResources(device, clearPipeline, scalarB.temperature),
    createClearResources(device, clearPipeline, scalarB.fuel),
    createClearResources(device, clearPipeline, scalarB.turbulence),
    createClearResources(device, clearPipeline, velocityCurrent),
    createClearResources(device, clearPipeline, velocityScratch),
    createClearResources(device, clearPipeline, divergence),
    createClearResources(device, clearPipeline, pressureA),
    createClearResources(device, clearPipeline, pressureB),
  ]
  const clearPressureA = createClearResources(device, clearPipeline, pressureA)
  const clearPressureB = createClearResources(device, clearPipeline, pressureB)

  const initializeEncoder = device.createCommandEncoder({
    label: 'initialize-combustion-simulation',
  })

  for (const resource of clearResources) {
    runClearPass(initializeEncoder, resource, voxelCount)
  }

  device.queue.submit([initializeEncoder.finish()])

  let currentScalarSet = 0
  let initialized = false
  let lastElapsedSeconds = 0

  return {
    resolution,
    step(encoder, elapsedSeconds, stepSeconds) {
      if (!initialized) {
        initialized = true
        lastElapsedSeconds = elapsedSeconds
      }

      const effectiveStep = Math.max(1 / 120, Math.min(stepSeconds, 1 / 30))
      const timeData = new Float32Array([
        elapsedSeconds,
        effectiveStep,
        lastElapsedSeconds,
        currentScalarSet,
      ])

      device.queue.writeBuffer(simulationParamsBuffer, 0, timeData)

      runClearPass(encoder, clearPressureA, voxelCount)
      runClearPass(encoder, clearPressureB, voxelCount)

      runSourcePass(encoder, currentScalarSet === 0 ? sourcePassA : sourcePassB, resolution)
      runVelocityAdvectionPass(encoder, velocityAdvectPass, resolution)
      runDivergencePass(encoder, divergencePass, resolution)

      let pressureSourceIsA = false

      for (let iteration = 0; iteration < PRESSURE_ITERATIONS; iteration += 1) {
        runPressurePass(encoder, pressureSourceIsA ? pressureBA : pressureAB, resolution)
        pressureSourceIsA = !pressureSourceIsA
      }

      runProjectionPass(
        encoder,
        pressureSourceIsA ? projectFromB : projectFromA,
        resolution,
      )
      runScalarAdvectionPass(
        encoder,
        currentScalarSet === 0 ? scalarAdvectAtoB : scalarAdvectBtoA,
        resolution,
      )

      currentScalarSet = currentScalarSet === 0 ? 1 : 0
      lastElapsedSeconds = elapsedSeconds
    },
    getRenderBuffers() {
      return currentScalarSet === 0 ? scalarA : scalarB
    },
    dispose() {
      volumeInfoBuffer.destroy()
      simulationParamsBuffer.destroy()
      destroyScalarFieldBuffers(scalarA)
      destroyScalarFieldBuffers(scalarB)
      velocityCurrent.destroy()
      velocityScratch.destroy()
      divergence.destroy()
      pressureA.destroy()
      pressureB.destroy()
    },
  }
}

function createScalarFieldBuffers(
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

function destroyScalarFieldBuffers(buffers: ScalarFieldBuffers) {
  buffers.density.destroy()
  buffers.temperature.destroy()
  buffers.fuel.destroy()
  buffers.turbulence.destroy()
}

function createClearResources(
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

function createSourceResources(
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
      label: `${fields.density.label ?? 'fields'}-source-bind-group`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: simulationParamsBuffer } },
        { binding: 1, resource: { buffer: volumeInfoBuffer } },
        { binding: 2, resource: { buffer: fields.density } },
        { binding: 3, resource: { buffer: fields.temperature } },
        { binding: 4, resource: { buffer: fields.fuel } },
        { binding: 5, resource: { buffer: fields.turbulence } },
        { binding: 6, resource: { buffer: velocityBuffer } },
      ],
    }),
  }
}

function createVelocityAdvectionResources(
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

function createScalarAdvectionResources(
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

function createDivergenceResources(
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

function createPressureResources(
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
      label: `${pressureSource.label ?? 'pressure'}-pressure-bind-group`,
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

function createProjectionResources(
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

function runClearPass(
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

function runSourcePass(
  encoder: GPUCommandEncoder,
  resources: ComputeResources,
  resolution: VolumeResolution,
) {
  const pass = encoder.beginComputePass({ label: 'apply-combustion-sources-pass' })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(
    Math.ceil(resolution.width / WORKGROUP_SIZE),
    Math.ceil(resolution.height / WORKGROUP_SIZE),
    Math.ceil(resolution.depth / WORKGROUP_SIZE),
  )
  pass.end()
}

function runVelocityAdvectionPass(
  encoder: GPUCommandEncoder,
  resources: ComputeResources,
  resolution: VolumeResolution,
) {
  const pass = encoder.beginComputePass({ label: 'advect-velocity-field-pass' })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(
    Math.ceil(resolution.width / WORKGROUP_SIZE),
    Math.ceil(resolution.height / WORKGROUP_SIZE),
    Math.ceil(resolution.depth / WORKGROUP_SIZE),
  )
  pass.end()
}

function runScalarAdvectionPass(
  encoder: GPUCommandEncoder,
  resources: ComputeResources,
  resolution: VolumeResolution,
) {
  const pass = encoder.beginComputePass({ label: 'advect-scalar-fields-pass' })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(
    Math.ceil(resolution.width / WORKGROUP_SIZE),
    Math.ceil(resolution.height / WORKGROUP_SIZE),
    Math.ceil(resolution.depth / WORKGROUP_SIZE),
  )
  pass.end()
}

function runDivergencePass(
  encoder: GPUCommandEncoder,
  resources: ComputeResources,
  resolution: VolumeResolution,
) {
  const pass = encoder.beginComputePass({ label: 'compute-divergence-pass' })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(
    Math.ceil(resolution.width / WORKGROUP_SIZE),
    Math.ceil(resolution.height / WORKGROUP_SIZE),
    Math.ceil(resolution.depth / WORKGROUP_SIZE),
  )
  pass.end()
}

function runPressurePass(
  encoder: GPUCommandEncoder,
  resources: ComputeResources,
  resolution: VolumeResolution,
) {
  const pass = encoder.beginComputePass({ label: 'solve-pressure-pass' })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(
    Math.ceil(resolution.width / WORKGROUP_SIZE),
    Math.ceil(resolution.height / WORKGROUP_SIZE),
    Math.ceil(resolution.depth / WORKGROUP_SIZE),
  )
  pass.end()
}

function runProjectionPass(
  encoder: GPUCommandEncoder,
  resources: ComputeResources,
  resolution: VolumeResolution,
) {
  const pass = encoder.beginComputePass({ label: 'project-velocity-pass' })

  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.dispatchWorkgroups(
    Math.ceil(resolution.width / WORKGROUP_SIZE),
    Math.ceil(resolution.height / WORKGROUP_SIZE),
    Math.ceil(resolution.depth / WORKGROUP_SIZE),
  )
  pass.end()
}

function createStaticBuffer(
  device: GPUDevice,
  label: string,
  data: Uint32Array,
) {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })

  device.queue.writeBuffer(buffer, 0, data)

  return buffer
}

function createStorageBuffer(
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

function createClearShader() {
  return /* wgsl */ `
    @group(0) @binding(0) var<storage, read_write> clearBuffer: array<u32>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let index = id.x;

      if (index >= arrayLength(&clearBuffer)) {
        return;
      }

      clearBuffer[index] = 0u;
    }
  `
}

function createSourceShader() {
  return /* wgsl */ `
    struct SimulationParams {
      time: f32,
      deltaTime: f32,
      previousTime: f32,
      scalarSetIndex: f32,
    }

    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> params: SimulationParams;
    @group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(2) var<storage, read_write> densityField: array<f32>;
    @group(0) @binding(3) var<storage, read_write> temperatureField: array<f32>;
    @group(0) @binding(4) var<storage, read_write> fuelField: array<f32>;
    @group(0) @binding(5) var<storage, read_write> turbulenceField: array<f32>;
    @group(0) @binding(6) var<storage, read_write> velocityField: array<vec4<f32>>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn clamp01(value: f32) -> f32 {
      return clamp(value, 0.0, 1.0);
    }

    fn hash33(position: vec3<f32>) -> f32 {
      return fract(sin(dot(position, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = flatten(id);
      let dt = params.deltaTime;
      let coord = vec3<f32>(id) + vec3<f32>(0.5);
      let normalized = coord / vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));
      let local = normalized * 2.0 - vec3<f32>(1.0);
      let radialDistance = length(local.xz);
      let plumeFade = 1.0 - smoothstep(0.14, 0.34, normalized.y);
      let sourceEnabled = select(1.0, 0.0, normalized.y > 0.28);
      let baseNoise = hash33(vec3<f32>(
        local.x * 5.0 + params.time * 0.72,
        normalized.y * 7.0 - params.time * 0.46,
        local.z * 5.0 + params.time * 0.28,
      ));
      let swirlNoise = hash33(vec3<f32>(
        local.z * 6.1 - params.time * 0.65,
        normalized.y * 8.8,
        local.x * 6.1 + params.time * 0.85,
      ));
      let emberNoise = hash33(vec3<f32>(
        local.x * 11.0 - params.time * 2.2,
        normalized.y * 13.0 + params.time * 0.9,
        local.z * 11.0 + params.time * 1.4,
      ));
      let pulse = 0.74 + 0.26 * max(0.0, sin(params.time * 10.5 + local.x * 7.2 - local.z * 5.4));
      let lobeAngle = params.time * 1.45 + normalized.y * 9.0 + baseNoise * 3.14159;
      let lobeOffset = vec2<f32>(cos(lobeAngle), sin(lobeAngle)) * (0.06 + normalized.y * 0.32);
      let sideLobeDistance = length(local.xz - lobeOffset);
      let counterLobeDistance = length(local.xz + lobeOffset * vec2<f32>(0.82, 0.82));
      let coreColumn = exp(-pow(radialDistance / (0.085 + normalized.y * 0.08), 2.0));
      let sideColumn = exp(-pow(sideLobeDistance / (0.075 + normalized.y * 0.18), 2.0));
      let counterColumn = exp(-pow(counterLobeDistance / (0.07 + normalized.y * 0.2), 2.0));
      let smokeShelf = exp(-pow(radialDistance / (0.16 + normalized.y * 0.28), 2.0)) * smoothstep(0.22, 0.78, normalized.y);
      let source = (coreColumn * 1.2 + sideColumn * 0.82 + counterColumn * 0.68)
        * plumeFade
        * (0.58 + baseNoise * 0.42)
        * sourceEnabled
        * dt
        * 2.7;
      let smokeSource = smokeShelf * (0.24 + emberNoise * 0.46) * dt * 0.95;
      let swirl = (swirlNoise - 0.5) * 2.0;

      var density = densityField[index];
      var temperature = temperatureField[index];
      var fuel = fuelField[index];
      var turbulence = turbulenceField[index];
      var velocity = velocityField[index].xyz;

      density = clamp01(density + source * 0.95 + smokeSource - dt * 0.013);
      temperature = clamp01(temperature + source * (1.9 + pulse * 0.45));
      fuel = clamp01(fuel + coreColumn * plumeFade * sourceEnabled * dt * (1.7 + pulse * 0.35));
      turbulence = clamp01(max(turbulence * 0.955, abs(swirl) * source * 2.1 + smokeSource * 0.75));

      let burn = min(fuel, max(0.0, temperature * 0.44 + density * 0.18) * dt * 1.45);
      fuel = clamp01(fuel - burn);
      temperature = clamp01(temperature + burn * 1.32 - dt * (0.09 + density * 0.075));
      density = clamp01(density + burn * 0.42 + smokeSource * 0.42);
      turbulence = clamp01(max(turbulence, burn * 0.88 + baseNoise * 0.16 + emberNoise * 0.08));

      let horizontalBurst = (0.35 + normalized.y * 1.35) * (0.65 + turbulence * 0.7);
      let radialLift = max(0.0, 1.0 - radialDistance * (1.7 - normalized.y * 0.4));
      velocity.y = clamp(velocity.y + (temperature * 2.15 - density * 0.38 + radialLift * pulse * 0.9) * dt * 2.6, -4.0, 8.8);
      velocity.x = velocity.x * 0.985 + (-local.z * (1.15 + normalized.y * 0.9) + swirl * 1.05 + lobeOffset.x * 2.6) * source * horizontalBurst;
      velocity.z = velocity.z * 0.985 + (local.x * (1.15 + normalized.y * 0.9) - swirl * 1.05 + lobeOffset.y * 2.6) * source * horizontalBurst;

      if (id.x == 0u || id.y == 0u || id.z == 0u || id.x == volumeInfo.width - 1u || id.y == volumeInfo.height - 1u || id.z == volumeInfo.depth - 1u) {
        velocity = vec3<f32>(0.0);
      }

      densityField[index] = density;
      temperatureField[index] = temperature;
      fuelField[index] = fuel;
      turbulenceField[index] = turbulence;
      velocityField[index] = vec4<f32>(velocity, 0.0);
    }
  `
}

function createVelocityAdvectionShader() {
  return /* wgsl */ `
    struct SimulationParams {
      time: f32,
      deltaTime: f32,
      previousTime: f32,
      scalarSetIndex: f32,
    }

    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> params: SimulationParams;
    @group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(2) var<storage, read> velocitySource: array<vec4<f32>>;
    @group(0) @binding(3) var<storage, read_write> velocityTarget: array<vec4<f32>>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn readVelocity(coord: vec3<u32>) -> vec3<f32> {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return velocitySource[flatten(clamped)].xyz;
    }

    fn sampleVelocity(position: vec3<f32>) -> vec3<f32> {
      let maxPosition = vec3<f32>(vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
      let fraction = fract(clamped);
      let c000 = readVelocity(base);
      let c100 = readVelocity(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readVelocity(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readVelocity(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readVelocity(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readVelocity(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readVelocity(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readVelocity(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = flatten(id);

      if (id.x == 0u || id.y == 0u || id.z == 0u || id.x == volumeInfo.width - 1u || id.y == volumeInfo.height - 1u || id.z == volumeInfo.depth - 1u) {
        velocityTarget[index] = vec4<f32>(0.0);
        return;
      }

      let coord = vec3<f32>(id) + vec3<f32>(0.5);
      let backPosition = coord - sampleVelocity(coord - vec3<f32>(0.5)) * params.deltaTime;
      let advectedVelocity = sampleVelocity(backPosition - vec3<f32>(0.5)) * 0.992;

      velocityTarget[index] = vec4<f32>(advectedVelocity, 0.0);
    }
  `
}

function createScalarAdvectionShader() {
  return /* wgsl */ `
    struct SimulationParams {
      time: f32,
      deltaTime: f32,
      previousTime: f32,
      scalarSetIndex: f32,
    }

    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> params: SimulationParams;
    @group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(2) var<storage, read> densitySource: array<f32>;
    @group(0) @binding(3) var<storage, read> temperatureSource: array<f32>;
    @group(0) @binding(4) var<storage, read> fuelSource: array<f32>;
    @group(0) @binding(5) var<storage, read> turbulenceSource: array<f32>;
    @group(0) @binding(6) var<storage, read> velocityField: array<vec4<f32>>;
    @group(0) @binding(7) var<storage, read_write> densityTarget: array<f32>;
    @group(0) @binding(8) var<storage, read_write> temperatureTarget: array<f32>;
    @group(0) @binding(9) var<storage, read_write> fuelTarget: array<f32>;
    @group(0) @binding(10) var<storage, read_write> turbulenceTarget: array<f32>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn clamp01(value: f32) -> f32 {
      return clamp(value, 0.0, 1.0);
    }

    fn hash33(position: vec3<f32>) -> f32 {
      return fract(sin(dot(position, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453);
    }

    fn readVelocity(coord: vec3<u32>) -> vec3<f32> {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return velocityField[flatten(clamped)].xyz;
    }

    fn sampleVelocity(position: vec3<f32>) -> vec3<f32> {
      let maxPosition = vec3<f32>(vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
      let fraction = fract(clamped);
      let c000 = readVelocity(base);
      let c100 = readVelocity(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readVelocity(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readVelocity(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readVelocity(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readVelocity(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readVelocity(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readVelocity(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    fn readDensity(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return densitySource[flatten(clamped)];
    }

    fn readTemperature(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return temperatureSource[flatten(clamped)];
    }

    fn readFuel(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return fuelSource[flatten(clamped)];
    }

    fn readTurbulence(coord: vec3<u32>) -> f32 {
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, volumeInfo.width - 1u),
        clamp(coord.y, 0u, volumeInfo.height - 1u),
        clamp(coord.z, 0u, volumeInfo.depth - 1u),
      );
      return turbulenceSource[flatten(clamped)];
    }

    fn sampleDensity(position: vec3<f32>) -> f32 {
      let maxPosition = vec3<f32>(vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
      let fraction = fract(clamped);
      let c000 = readDensity(base);
      let c100 = readDensity(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readDensity(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readDensity(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readDensity(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readDensity(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readDensity(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readDensity(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    fn sampleTemperature(position: vec3<f32>) -> f32 {
      let maxPosition = vec3<f32>(vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
      let fraction = fract(clamped);
      let c000 = readTemperature(base);
      let c100 = readTemperature(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readTemperature(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readTemperature(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readTemperature(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readTemperature(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readTemperature(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readTemperature(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    fn sampleFuel(position: vec3<f32>) -> f32 {
      let maxPosition = vec3<f32>(vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
      let fraction = fract(clamped);
      let c000 = readFuel(base);
      let c100 = readFuel(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readFuel(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readFuel(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readFuel(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readFuel(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readFuel(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readFuel(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    fn sampleTurbulence(position: vec3<f32>) -> f32 {
      let maxPosition = vec3<f32>(vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
      let fraction = fract(clamped);
      let c000 = readTurbulence(base);
      let c100 = readTurbulence(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readTurbulence(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readTurbulence(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readTurbulence(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readTurbulence(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readTurbulence(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readTurbulence(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = id.x + volumeInfo.width * (id.y + volumeInfo.height * id.z);
      let coord = vec3<f32>(id) + vec3<f32>(0.5);
      let normalized = coord / vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));
      let backPosition = coord - sampleVelocity(coord - vec3<f32>(0.5)) * params.deltaTime;
      var samplePosition = backPosition - vec3<f32>(0.5);
      let sampledTurbulence = sampleTurbulence(samplePosition);
      let curlPhase = params.time * 0.9 + normalized.y * 8.6;
      let jitter = hash33(vec3<f32>(
        normalized.x * 9.4 + params.time * 0.25,
        normalized.y * 11.7 - params.time * 0.42,
        normalized.z * 9.4 + params.time * 0.31,
      ));
      let swirlVector = vec3<f32>(
        sin(curlPhase + normalized.z * 7.4 + jitter * 3.0),
        cos(curlPhase * 0.75 + normalized.x * 5.9),
        cos(curlPhase + normalized.x * 7.4 - jitter * 3.0),
      );
      samplePosition += swirlVector * (0.08 + sampledTurbulence * 0.55) * (0.45 + normalized.y * 1.5);

      let density = sampleDensity(samplePosition);
      let temperature = sampleTemperature(samplePosition);
      let fuel = sampleFuel(samplePosition);
      let turbulence = sampleTurbulence(samplePosition);
      let smokeBloom = smoothstep(0.18, 0.85, normalized.y) * turbulence * max(0.0, jitter - 0.38);

      densityTarget[index] = clamp01(density * 0.995 + smokeBloom * 0.075);
      temperatureTarget[index] = clamp01(temperature * 0.988);
      fuelTarget[index] = clamp01(fuel * 0.992);
      turbulenceTarget[index] = clamp01(turbulence * 0.982 + smokeBloom * 0.18);
    }
  `
}

function createDivergenceShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(1) var<storage, read> velocitySource: array<vec4<f32>>;
    @group(0) @binding(2) var<storage, read_write> divergenceTarget: array<f32>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn velocity(coord: vec3<u32>) -> vec3<f32> {
      return velocitySource[flatten(coord)].xyz;
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = flatten(id);

      if (id.x == 0u || id.y == 0u || id.z == 0u || id.x == volumeInfo.width - 1u || id.y == volumeInfo.height - 1u || id.z == volumeInfo.depth - 1u) {
        divergenceTarget[index] = 0.0;
        return;
      }

      let divergenceX = velocity(vec3<u32>(id.x + 1u, id.y, id.z)).x - velocity(vec3<u32>(id.x - 1u, id.y, id.z)).x;
      let divergenceY = velocity(vec3<u32>(id.x, id.y + 1u, id.z)).y - velocity(vec3<u32>(id.x, id.y - 1u, id.z)).y;
      let divergenceZ = velocity(vec3<u32>(id.x, id.y, id.z + 1u)).z - velocity(vec3<u32>(id.x, id.y, id.z - 1u)).z;

      divergenceTarget[index] = (divergenceX + divergenceY + divergenceZ) * 0.5;
    }
  `
}

function createPressureShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(1) var<storage, read> divergenceSource: array<f32>;
    @group(0) @binding(2) var<storage, read> pressureSource: array<f32>;
    @group(0) @binding(3) var<storage, read_write> pressureTarget: array<f32>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn pressure(coord: vec3<u32>) -> f32 {
      return pressureSource[flatten(coord)];
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = flatten(id);

      if (id.x == 0u || id.y == 0u || id.z == 0u || id.x == volumeInfo.width - 1u || id.y == volumeInfo.height - 1u || id.z == volumeInfo.depth - 1u) {
        pressureTarget[index] = 0.0;
        return;
      }

      let neighborSum =
        pressure(vec3<u32>(id.x + 1u, id.y, id.z)) +
        pressure(vec3<u32>(id.x - 1u, id.y, id.z)) +
        pressure(vec3<u32>(id.x, id.y + 1u, id.z)) +
        pressure(vec3<u32>(id.x, id.y - 1u, id.z)) +
        pressure(vec3<u32>(id.x, id.y, id.z + 1u)) +
        pressure(vec3<u32>(id.x, id.y, id.z - 1u));

      pressureTarget[index] = (neighborSum - divergenceSource[index]) / 6.0;
    }
  `
}

function createProjectionShader() {
  return /* wgsl */ `
    struct VolumeInfo {
      width: u32,
      height: u32,
      depth: u32,
      voxelCount: u32,
    }

    @group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
    @group(0) @binding(1) var<storage, read> velocitySource: array<vec4<f32>>;
    @group(0) @binding(2) var<storage, read> pressureSource: array<f32>;
    @group(0) @binding(3) var<storage, read_write> velocityTarget: array<vec4<f32>>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn pressure(coord: vec3<u32>) -> f32 {
      return pressureSource[flatten(coord)];
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = flatten(id);

      if (id.x == 0u || id.y == 0u || id.z == 0u || id.x == volumeInfo.width - 1u || id.y == volumeInfo.height - 1u || id.z == volumeInfo.depth - 1u) {
        velocityTarget[index] = vec4<f32>(0.0);
        return;
      }

      var velocity = velocitySource[index].xyz;
      let gradientX = pressure(vec3<u32>(id.x + 1u, id.y, id.z)) - pressure(vec3<u32>(id.x - 1u, id.y, id.z));
      let gradientY = pressure(vec3<u32>(id.x, id.y + 1u, id.z)) - pressure(vec3<u32>(id.x, id.y - 1u, id.z));
      let gradientZ = pressure(vec3<u32>(id.x, id.y, id.z + 1u)) - pressure(vec3<u32>(id.x, id.y, id.z - 1u));

      velocity -= vec3<f32>(gradientX, gradientY, gradientZ) * 0.5;
      velocityTarget[index] = vec4<f32>(velocity, 0.0);
    }
  `
}
