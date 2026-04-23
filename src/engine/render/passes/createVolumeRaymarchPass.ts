import type { OrbitCameraSnapshot } from '../../scene/camera/createOrbitCameraController'
import type { CombustionVolumeRenderBuffers } from '../../simulation/common/combustionVolumeRenderBuffers'
import type { VolumeResolution } from '../../simulation/common/volumeResolution'
import type { VolumeDisplayMode } from '../volumetrics/volumeDisplayMode'

export interface VolumeRaymarchPass {
  render(
    encoder: GPUCommandEncoder,
    view: GPUTextureView,
    buffers: CombustionVolumeRenderBuffers,
    camera: OrbitCameraSnapshot,
    displayMode: VolumeDisplayMode,
    renderWidth: number,
    renderHeight: number,
    elapsedSeconds: number,
  ): void
  dispose(): void
}

const GPU_BUFFER_UNIFORM = 0x0040
const GPU_BUFFER_COPY_DST = 0x0008

export function createVolumeRaymarchPass(
  device: GPUDevice,
  format: GPUTextureFormat,
  resolution: VolumeResolution,
): VolumeRaymarchPass {
  const volumeScale = 13.5
  const maxHorizontalResolution = Math.max(resolution.width, resolution.depth)
  const volumeHalfExtents = {
    x: 2.05 * volumeScale * (resolution.width / maxHorizontalResolution),
    y: 2.05 * volumeScale * (resolution.height / maxHorizontalResolution),
    z: 2.05 * volumeScale * (resolution.depth / maxHorizontalResolution),
  }
  const volumeCenterY = volumeHalfExtents.y - 0.25
  const voxelCount = resolution.width * resolution.height * resolution.depth
  const stepCount = voxelCount >= 4_000_000 ? 88 : voxelCount >= 1_800_000 ? 112 : 144
  const cameraBuffer = device.createBuffer({
    label: 'volume-camera-buffer',
    size: 16 * 9,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })
  const resolutionBuffer = device.createBuffer({
    label: 'volume-resolution-buffer',
    size: 16,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })
  const resolutionData = new Float32Array([
    resolution.width,
    resolution.height,
    resolution.depth,
    0,
  ])

  device.queue.writeBuffer(resolutionBuffer, 0, resolutionData)

  const shaderModule = device.createShaderModule({
    label: 'raw-volume-raymarch-shader',
    code: createVolumeRaymarchShader(),
  })
  const pipeline = device.createRenderPipeline({
    label: 'raw-volume-raymarch-pipeline',
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vsMain',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fsMain',
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  })
  const bindGroupLayout = pipeline.getBindGroupLayout(0)
  const bindGroups = new WeakMap<GPUBuffer, GPUBindGroup>()

  const getBindGroup = (buffers: CombustionVolumeRenderBuffers) => {
    const existing = bindGroups.get(buffers.density)

    if (existing) {
      return existing
    }

    if (!buffers.activeBrickFlags || !buffers.activeBrickInfo) {
      throw new Error('Volume raymarch pass requires sparse active-brick render buffers.')
    }

    const bindGroup = device.createBindGroup({
      label: `${buffers.density.label ?? 'density'}-raymarch-bind-group`,
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: cameraBuffer } },
        { binding: 1, resource: { buffer: resolutionBuffer } },
        { binding: 2, resource: { buffer: buffers.density } },
        { binding: 3, resource: { buffer: buffers.temperature } },
        { binding: 4, resource: { buffer: buffers.fuel } },
        { binding: 5, resource: { buffer: buffers.reaction } },
        { binding: 6, resource: { buffer: buffers.activeBrickFlags } },
        { binding: 7, resource: { buffer: buffers.activeBrickInfo } },
      ],
    })

    bindGroups.set(buffers.density, bindGroup)

    return bindGroup
  }

  return {
    render(
      encoder,
      view,
      buffers,
      camera,
      displayMode,
      renderWidth,
      renderHeight,
      elapsedSeconds,
    ) {
      const displayModeValue = displayMode === 'density' ? 1 : displayMode === 'fuel' ? 2 : 0
      const cameraData = new Float32Array([
        camera.position.x,
        camera.position.y,
        camera.position.z,
        0,
        camera.right.x,
        camera.right.y,
        camera.right.z,
        0,
        camera.up.x,
        camera.up.y,
        camera.up.z,
        0,
        camera.forward.x,
        camera.forward.y,
        camera.forward.z,
        0,
        0,
        volumeCenterY,
        0,
        0,
        volumeHalfExtents.x,
        volumeHalfExtents.y,
        volumeHalfExtents.z,
        0,
        renderWidth,
        renderHeight,
        camera.aspect,
        camera.tanHalfFovY,
        displayModeValue,
        stepCount,
        elapsedSeconds,
        0,
        camera.target.x,
        camera.target.y,
        camera.target.z,
        0,
      ])

      device.queue.writeBuffer(cameraBuffer, 0, cameraData)

      const pass = encoder.beginRenderPass({
        label: 'raw-volume-raymarch-pass',
        colorAttachments: [
          {
            view,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      })

      pass.setPipeline(pipeline)
      pass.setBindGroup(0, getBindGroup(buffers))
      pass.draw(3)
      pass.end()
    },
    dispose() {
      cameraBuffer.destroy()
      resolutionBuffer.destroy()
    },
  }
}

function createVolumeRaymarchShader() {
  return /* wgsl */ `
    struct CameraData {
      position: vec4<f32>,
      right: vec4<f32>,
      up: vec4<f32>,
      forward: vec4<f32>,
      volumeCenter: vec4<f32>,
      volumeHalfExtents: vec4<f32>,
      renderInfo: vec4<f32>,
      renderMode: vec4<f32>,
      focalPoint: vec4<f32>,
    }

    struct ResolutionData {
      width: f32,
      height: f32,
      depth: f32,
      padding: f32,
    }

    struct BrickInfo {
      counts: vec4<u32>,
      params: vec4<u32>,
    }

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> camera: CameraData;
    @group(0) @binding(1) var<uniform> resolution: ResolutionData;
    @group(0) @binding(2) var<storage, read> densityField: array<f32>;
    @group(0) @binding(3) var<storage, read> temperatureField: array<f32>;
    @group(0) @binding(4) var<storage, read> fuelField: array<f32>;
    @group(0) @binding(5) var<storage, read> reactionField: array<f32>;
    @group(0) @binding(6) var<storage, read> activeBrickFlags: array<u32>;
    @group(0) @binding(7) var<uniform> brickInfo: BrickInfo;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + u32(resolution.width) * (coord.y + u32(resolution.height) * coord.z);
    }

    fn readDensity(coord: vec3<u32>) -> f32 {
      let maxCoord = vec3<u32>(
        u32(resolution.width) - 1u,
        u32(resolution.height) - 1u,
        u32(resolution.depth) - 1u,
      );
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, maxCoord.x),
        clamp(coord.y, 0u, maxCoord.y),
        clamp(coord.z, 0u, maxCoord.z),
      );
      return densityField[flatten(clamped)];
    }

    fn readTemperature(coord: vec3<u32>) -> f32 {
      let maxCoord = vec3<u32>(
        u32(resolution.width) - 1u,
        u32(resolution.height) - 1u,
        u32(resolution.depth) - 1u,
      );
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, maxCoord.x),
        clamp(coord.y, 0u, maxCoord.y),
        clamp(coord.z, 0u, maxCoord.z),
      );
      return temperatureField[flatten(clamped)];
    }

    fn readFuel(coord: vec3<u32>) -> f32 {
      let maxCoord = vec3<u32>(
        u32(resolution.width) - 1u,
        u32(resolution.height) - 1u,
        u32(resolution.depth) - 1u,
      );
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, maxCoord.x),
        clamp(coord.y, 0u, maxCoord.y),
        clamp(coord.z, 0u, maxCoord.z),
      );
      return fuelField[flatten(clamped)];
    }

    fn readReaction(coord: vec3<u32>) -> f32 {
      let maxCoord = vec3<u32>(
        u32(resolution.width) - 1u,
        u32(resolution.height) - 1u,
        u32(resolution.depth) - 1u,
      );
      let clamped = vec3<u32>(
        clamp(coord.x, 0u, maxCoord.x),
        clamp(coord.y, 0u, maxCoord.y),
        clamp(coord.z, 0u, maxCoord.z),
      );
      return reactionField[flatten(clamped)];
    }

    fn isActiveSample(position: vec3<f32>) -> bool {
      let maxCoord = vec3<u32>(
        u32(resolution.width) - 1u,
        u32(resolution.height) - 1u,
        u32(resolution.depth) - 1u,
      );
      let coord = vec3<u32>(floor(clamp(position, vec3<f32>(0.0), vec3<f32>(maxCoord))));
      let brickSize = max(brickInfo.params.x, 1u);
      let brickCoord = min(coord / vec3<u32>(brickSize), brickInfo.counts.xyz - vec3<u32>(1u));
      let brickIndex = brickCoord.x + brickInfo.counts.x * (brickCoord.y + brickInfo.counts.y * brickCoord.z);
      return activeBrickFlags[brickIndex] != 0u;
    }

    fn sampleDensity(position: vec3<f32>) -> f32 {
      let dimensions = vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0);
      let clamped = clamp(position, vec3<f32>(0.0), dimensions);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(dimensions));
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

    fn decU(value: u32) -> u32 {
      if (value == 0u) {
        return 0u;
      }

      return value - 1u;
    }

    fn incU(value: u32, maxValue: u32) -> u32 {
      return min(value + 1u, maxValue);
    }

    fn densityGradient(position: vec3<f32>) -> vec3<f32> {
      let maxCoord = vec3<u32>(
        u32(resolution.width) - 1u,
        u32(resolution.height) - 1u,
        u32(resolution.depth) - 1u,
      );
      let coord = vec3<u32>(round(clamp(position, vec3<f32>(0.0), vec3<f32>(maxCoord))));
      let dx = readDensity(vec3<u32>(incU(coord.x, maxCoord.x), coord.y, coord.z)) -
        readDensity(vec3<u32>(decU(coord.x), coord.y, coord.z));
      let dy = readDensity(vec3<u32>(coord.x, incU(coord.y, maxCoord.y), coord.z)) -
        readDensity(vec3<u32>(coord.x, decU(coord.y), coord.z));
      let dz = readDensity(vec3<u32>(coord.x, coord.y, incU(coord.z, maxCoord.z))) -
        readDensity(vec3<u32>(coord.x, coord.y, decU(coord.z)));
      return vec3<f32>(dx, dy, dz);
    }

    fn sampleTemperature(position: vec3<f32>) -> f32 {
      let dimensions = vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0);
      let clamped = clamp(position, vec3<f32>(0.0), dimensions);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(dimensions));
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
      let dimensions = vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0);
      let clamped = clamp(position, vec3<f32>(0.0), dimensions);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(dimensions));
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

    fn sampleReaction(position: vec3<f32>) -> f32 {
      let dimensions = vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0);
      let clamped = clamp(position, vec3<f32>(0.0), dimensions);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(dimensions));
      let fraction = fract(clamped);
      let c000 = readReaction(base);
      let c100 = readReaction(vec3<u32>(upper.x, base.y, base.z));
      let c010 = readReaction(vec3<u32>(base.x, upper.y, base.z));
      let c110 = readReaction(vec3<u32>(upper.x, upper.y, base.z));
      let c001 = readReaction(vec3<u32>(base.x, base.y, upper.z));
      let c101 = readReaction(vec3<u32>(upper.x, base.y, upper.z));
      let c011 = readReaction(vec3<u32>(base.x, upper.y, upper.z));
      let c111 = readReaction(upper);
      let x00 = mix(c000, c100, fraction.x);
      let x10 = mix(c010, c110, fraction.x);
      let x01 = mix(c001, c101, fraction.x);
      let x11 = mix(c011, c111, fraction.x);
      return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
    }

    fn intersectBox(origin: vec3<f32>, direction: vec3<f32>, boxMin: vec3<f32>, boxMax: vec3<f32>) -> vec2<f32> {
      let inverseDirection = 1.0 / direction;
      let tMinTemp = (boxMin - origin) * inverseDirection;
      let tMaxTemp = (boxMax - origin) * inverseDirection;
      let tMin = min(tMinTemp, tMaxTemp);
      let tMax = max(tMinTemp, tMaxTemp);
      let t0 = max(tMin.x, max(tMin.y, tMin.z));
      let t1 = min(tMax.x, min(tMax.y, tMax.z));
      return vec2<f32>(t0, t1);
    }

    fn firePalette(temperature: f32) -> vec3<f32> {
      let ember = vec3<f32>(0.18, 0.018, 0.0);
      let red = vec3<f32>(1.0, 0.075, 0.012);
      let orange = vec3<f32>(1.0, 0.42, 0.035);
      let whiteHot = vec3<f32>(1.0, 0.86, 0.56);
      let redMix = smoothstep(0.01, 0.11, temperature);
      let orangeMix = smoothstep(0.09, 0.38, temperature);
      let whiteMix = smoothstep(0.58, 0.92, temperature);
      return mix(mix(mix(ember, red, redMix), orange, orangeMix), whiteHot, whiteMix);
    }

    fn smokePalette(density: f32, temperature: f32, lightAmount: f32) -> vec3<f32> {
      let warmTint = clamp(temperature * 0.55, 0.0, 1.0);
      let cloudBrightness = clamp(lightAmount * 0.8 + density * 0.18, 0.0, 1.0);
      return mix(
        vec3<f32>(0.22, 0.225, 0.235),
        vec3<f32>(0.78, 0.76, 0.72) + warmTint * vec3<f32>(0.28, 0.12, 0.04),
        clamp(cloudBrightness + temperature * 0.18, 0.0, 1.0),
      );
    }

    fn thermalPocketPattern(position: vec3<f32>, time: f32) -> vec3<f32> {
      let p = position + vec3<f32>(time * 2.2, time * 5.2, -time * 1.7);
      let body = 0.5 + 0.5 * sin(dot(p, vec3<f32>(0.061, 0.082, -0.053)) + sin(p.y * 0.052) * 1.9);
      let pocket = 0.5 + 0.5 * sin(dot(p, vec3<f32>(0.134, -0.076, 0.112)) + sin(p.x * 0.105 + p.z * 0.069) * 1.25);
      let rising = 0.5 + 0.5 * sin(p.x * 0.17 + p.y * 0.12 - p.z * 0.15 + time * 1.45);
      let cluster = clamp(body * 0.48 + pocket * 0.34 + rising * 0.18, 0.0, 1.0);
      let cellular = abs(body - pocket);
      let ridge = 1.0 - abs(cluster * 2.0 - 1.0);

      return vec3<f32>(cluster, ridge, cellular);
    }

    fn cloudMicroDetail(position: vec3<f32>, time: f32) -> f32 {
      let low = sin(dot(position, vec3<f32>(0.23, 0.17, 0.29)) + time * 0.17);
      let mid = sin(dot(position, vec3<f32>(0.71, -0.39, 0.54)) + sin(position.y * 0.19) * 1.7);
      let high = sin(position.x * 1.37 + position.y * 0.63 - position.z * 1.11 + time * 0.09);
      let folded = abs(sin(position.x * 0.41 + sin(position.z * 0.27)) *
        sin(position.y * 0.36 - position.z * 0.31) *
        sin(dot(position, vec3<f32>(0.19, 0.47, -0.34))));
      let ridge = 1.0 - abs(folded * 2.0 - 1.0);
      return clamp(0.42 + low * 0.2 + mid * 0.16 + high * 0.08 + ridge * 0.34, 0.0, 1.0);
    }

    @vertex
    fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var positions = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -3.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(3.0, 1.0),
      );
      let position = positions[vertexIndex];
      var output: VertexOutput;
      output.position = vec4<f32>(position, 0.0, 1.0);
      output.uv = position * 0.5 + vec2<f32>(0.5);
      return output;
    }

    @fragment
    fn fsMain(input: VertexOutput) -> @location(0) vec4<f32> {
      let ndc = vec2<f32>(
        input.uv.x * 2.0 - 1.0,
        input.uv.y * 2.0 - 1.0,
      );
      let rayDirection = normalize(
        camera.forward.xyz +
        camera.right.xyz * ndc.x * camera.renderInfo.z * camera.renderInfo.w +
        camera.up.xyz * ndc.y * camera.renderInfo.w
      );
      let boxMin = camera.volumeCenter.xyz - camera.volumeHalfExtents.xyz;
      let boxMax = camera.volumeCenter.xyz + camera.volumeHalfExtents.xyz;
      var bounds = intersectBox(camera.position.xyz, rayDirection, boxMin, boxMax);

      if (bounds.x > bounds.y) {
        discard;
      }

      bounds.x = max(bounds.x, 0.0);

      let rayLength = bounds.y - bounds.x;
      let stepCount = u32(camera.renderMode.y);
      let delta = rayLength / max(f32(stepCount), 1.0);
      let invExtent = 1.0 / (camera.volumeHalfExtents.xyz * 2.0);
      let lightDirection = normalize(vec3<f32>(-0.42, 0.78, 0.36));
      let fillDirection = normalize(vec3<f32>(0.55, 0.32, -0.62));
      var positionRay = camera.position.xyz + rayDirection * bounds.x;
      var accumulatedColor = vec3<f32>(0.0);
      var accumulatedAlpha = 0.0;

      for (var index = 0u; index < stepCount; index += 1u) {
        if (accumulatedAlpha > 0.985) {
          break;
        }

        let uvw = (positionRay - boxMin) * invExtent;

        if (all(uvw >= vec3<f32>(0.0)) && all(uvw <= vec3<f32>(1.0))) {
          let samplePosition = uvw * (vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0));
          if (isActiveSample(samplePosition)) {
            let density = max(sampleDensity(samplePosition) - 0.005, 0.0);
            let temperature = sampleTemperature(samplePosition);
            let fuel = sampleFuel(samplePosition);
            let reaction = sampleReaction(samplePosition);
            let hotGas = clamp(temperature * 1.55 + fuel * 0.26 + reaction * 0.44, 0.0, 1.0);

            if (density > 0.001 || hotGas > 0.018) {
              let microDetail = cloudMicroDetail(samplePosition, camera.renderMode.z);
              let thermalPattern = thermalPocketPattern(samplePosition, camera.renderMode.z);
              let hotPocket = smoothstep(0.48, 0.9, thermalPattern.x + reaction * 0.28 + hotGas * 0.2);
              let coolingPocket = smoothstep(0.52, 0.92, 1.0 - thermalPattern.x + thermalPattern.z * 0.24) *
                smoothstep(0.04, 0.7, density) *
                (1.0 - smoothstep(0.5, 0.96, hotGas));
              let bodyPocket = smoothstep(0.22, 0.82, thermalPattern.y + microDetail * 0.32);
              let densityErosion = smoothstep(0.2, 0.78, microDetail + bodyPocket * 0.35 + reaction * 0.14 + hotGas * 0.08);
              let detailContrast = mix(0.46, 1.88, densityErosion) *
                mix(0.84, 1.42, bodyPocket) *
                mix(1.0, 1.26, coolingPocket);
              let detailedDensity = max(pow(density, 0.92) * detailContrast, 0.0);
              var densityGrad = vec3<f32>(0.0);
              if (detailedDensity > 0.002) {
                densityGrad = densityGradient(samplePosition);
              }
              let gradLength = max(length(densityGrad), 0.0001);
              let smokeNormal = -densityGrad / gradLength;
              let keyDiffuse = clamp(dot(smokeNormal, lightDirection) * 0.5 + 0.5, 0.0, 1.0);
              let fillDiffuse = clamp(dot(smokeNormal, fillDirection) * 0.5 + 0.5, 0.0, 1.0);
              let rimLight = pow(1.0 - clamp(dot(smokeNormal, -rayDirection), 0.0, 1.0), 1.7);
              let heightAmbient = smoothstep(0.02, 0.95, uvw.y);
              let lightProbePosition = clamp(uvw + lightDirection * 0.03, vec3<f32>(0.0), vec3<f32>(1.0));
              var shadowProbe = 0.0;
              if (detailedDensity > 0.004) {
                shadowProbe = sampleDensity(lightProbePosition * (vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0)));
              }
              let lightTransmission = 1.0 - clamp(shadowProbe * 0.22, 0.0, 0.38);
              let forwardScatter = pow(clamp(dot(-rayDirection, lightDirection), 0.0, 1.0), 1.05) * 0.62 + 0.52;
              let cloudDetail = clamp(gradLength * 7.5 + abs(microDetail - 0.5) * 2.4 + reaction * 0.26, 0.0, 1.0);
              let totalLight = lightTransmission * (keyDiffuse * 0.95 + fillDiffuse * 0.32) + rimLight * 0.42;
              let smokeBase = smokePalette(detailedDensity, temperature, totalLight);
              let ambientLight = vec3<f32>(0.7, 0.75, 0.82) * (0.52 + heightAmbient * 0.34);
              let silverLining = vec3<f32>(0.92, 0.96, 1.0) * rimLight * (0.34 + cloudDetail * 0.52 + bodyPocket * 0.18);
              let warmRim = vec3<f32>(1.0, 0.55, 0.19) * rimLight * (0.08 + temperature * 0.24);
              let creviceShade = 1.0 - cloudDetail * (1.0 - lightTransmission) * mix(0.34, 0.64, coolingPocket);
              let ashColor = vec3<f32>(0.34, 0.35, 0.36) * (0.82 + totalLight * 0.24);
              let warmSmoke = smokeBase + vec3<f32>(0.18, 0.07, 0.025) * hotPocket * hotGas;
              let phaseSmoke = mix(warmSmoke, ashColor, coolingPocket * 0.72);
              let smokeColor = phaseSmoke * (0.74 + totalLight * 0.55) * creviceShade +
                ambientLight * detailedDensity * 0.45 + silverLining + warmRim * 0.42;
              let fireColor = firePalette(temperature);
              let heatIsland = smoothstep(0.04, 0.42, hotGas) * mix(0.45, 1.45, hotPocket);
              let crackMask = heatIsland *
                (1.0 - smoothstep(1.22, 2.65, detailedDensity)) *
                (0.78 + reaction * 1.25 + bodyPocket * 0.38) *
                (1.0 - coolingPocket * 0.58);
              let emissive = fireColor * (temperature * (fuel * 1.35 + 1.15)) *
                (reaction * 1.55 + 2.35) * (1.0 + forwardScatter * 0.72) * mix(0.62, 1.55, hotPocket);
              let flameMix = clamp(crackMask * 1.36 + fuel * 0.16 + hotGas * 0.08, 0.0, 0.97);
              let fireAlpha = 1.0 - exp(-hotGas * (fuel + reaction * 0.34 + 0.16) * delta * mix(6.2, 12.5, hotPocket));
              var compositeColor = mix(smokeColor, emissive, flameMix);
              let topFade = 1.0 - smoothstep(0.88, 0.995, uvw.y);
              let heatClearing = clamp(1.0 - crackMask * 0.82 - hotGas * hotPocket * 0.2, 0.12, 1.0);
              var opacity = (1.0 - exp(-detailedDensity * delta * (1.28 + cloudDetail * 0.68) * 3.0)) *
                topFade * heatClearing;

              compositeColor += emissive * (forwardScatter * 0.62 + rimLight * 0.14);
              opacity = max(opacity, fireAlpha * 0.52 * topFade);

              if (camera.renderMode.x < 0.5) {
                let temperatureColor = firePalette(clamp(temperature * 0.88 + fuel * 0.16, 0.0, 1.0));
                compositeColor = mix(smokeColor * 0.72, temperatureColor, clamp(crackMask + fuel * 0.12, 0.0, 1.0));
                compositeColor += temperatureColor * forwardScatter * 0.35;
              }

              if (camera.renderMode.x > 0.5 && camera.renderMode.x < 1.5) {
                compositeColor = mix(
                  vec3<f32>(0.01, 0.01, 0.012),
                  vec3<f32>(0.86, 0.88, 0.92),
                  clamp(detailedDensity * 1.3, 0.0, 1.0),
                );
                opacity = 1.0 - exp(-detailedDensity * delta * 10.5);
              } else if (camera.renderMode.x >= 1.5) {
                compositeColor = mix(
                  vec3<f32>(0.03, 0.01, 0.0),
                  vec3<f32>(1.0, 0.72, 0.22),
                  clamp(fuel * 1.25, 0.0, 1.0),
                );
                opacity = 1.0 - exp(-fuel * delta * 9.0);
              }

              accumulatedColor += (1.0 - accumulatedAlpha) * compositeColor * opacity;
              accumulatedAlpha += (1.0 - accumulatedAlpha) * opacity;
            }
          }
        }

        positionRay += rayDirection * delta;
      }

      if (accumulatedAlpha < 0.01) {
        discard;
      }

      let finalColor = pow(accumulatedColor, vec3<f32>(0.92));

      return vec4<f32>(finalColor * accumulatedAlpha, accumulatedAlpha);
    }
  `
}
