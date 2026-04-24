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
const CAMERA_DATA_FLOATS = 36

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
  const stepCount = voxelCount >= 4_000_000 ? 200 : voxelCount >= 1_800_000 ? 120 : 160
  const cameraBuffer = device.createBuffer({
    label: 'volume-camera-buffer',
    size: Float32Array.BYTES_PER_ELEMENT * CAMERA_DATA_FLOATS,
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

  const cameraData = new Float32Array(CAMERA_DATA_FLOATS)

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
      cameraData[0] = camera.position.x
      cameraData[1] = camera.position.y
      cameraData[2] = camera.position.z
      cameraData[3] = 0
      cameraData[4] = camera.right.x
      cameraData[5] = camera.right.y
      cameraData[6] = camera.right.z
      cameraData[7] = 0
      cameraData[8] = camera.up.x
      cameraData[9] = camera.up.y
      cameraData[10] = camera.up.z
      cameraData[11] = 0
      cameraData[12] = camera.forward.x
      cameraData[13] = camera.forward.y
      cameraData[14] = camera.forward.z
      cameraData[15] = 0
      cameraData[16] = 0
      cameraData[17] = volumeCenterY
      cameraData[18] = 0
      cameraData[19] = 0
      cameraData[20] = volumeHalfExtents.x
      cameraData[21] = volumeHalfExtents.y
      cameraData[22] = volumeHalfExtents.z
      cameraData[23] = 0
      cameraData[24] = renderWidth
      cameraData[25] = renderHeight
      cameraData[26] = camera.aspect
      cameraData[27] = camera.tanHalfFovY
      cameraData[28] = displayModeValue
      cameraData[29] = stepCount
      cameraData[30] = elapsedSeconds
      cameraData[31] = 0
      cameraData[32] = camera.target.x
      cameraData[33] = camera.target.y
      cameraData[34] = camera.target.z
      cameraData[35] = 0

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

    fn maxCoordU() -> vec3<u32> {
      return vec3<u32>(
        u32(resolution.width) - 1u,
        u32(resolution.height) - 1u,
        u32(resolution.depth) - 1u,
      );
    }

    fn sampleBounds() -> vec3<f32> {
      return vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0);
    }

    fn clampCoord(coord: vec3<u32>) -> vec3<u32> {
      let maxCoord = maxCoordU();
      return vec3<u32>(
        clamp(coord.x, 0u, maxCoord.x),
        clamp(coord.y, 0u, maxCoord.y),
        clamp(coord.z, 0u, maxCoord.z),
      );
    }

    fn brickSizeU() -> u32 {
      return max(brickInfo.params.x, 1u);
    }

    fn brickSizeF() -> f32 {
      return f32(brickSizeU());
    }

    fn activeBrickIndexForCoord(coord: vec3<u32>) -> u32 {
      let brickCoord = min(coord / vec3<u32>(brickSizeU()), brickInfo.counts.xyz - vec3<u32>(1u));
      return brickCoord.x + brickInfo.counts.x * (brickCoord.y + brickInfo.counts.y * brickCoord.z);
    }

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + u32(resolution.width) * (coord.y + u32(resolution.height) * coord.z);
    }

    fn readDensity(coord: vec3<u32>) -> f32 {
      return densityField[flatten(clampCoord(coord))];
    }

    fn readTemperature(coord: vec3<u32>) -> f32 {
      return temperatureField[flatten(clampCoord(coord))];
    }

    fn readFuel(coord: vec3<u32>) -> f32 {
      return fuelField[flatten(clampCoord(coord))];
    }

    fn readReaction(coord: vec3<u32>) -> f32 {
      return reactionField[flatten(clampCoord(coord))];
    }

    fn isActiveSample(position: vec3<f32>) -> bool {
      let coord = vec3<u32>(floor(clamp(position, vec3<f32>(0.0), sampleBounds())));
      return activeBrickFlags[activeBrickIndexForCoord(coord)] != 0u;
    }

    fn distanceToNextBrickBoundary(position: vec3<f32>, direction: vec3<f32>) -> f32 {
      let epsilon = 0.001;
      let far = 1e9;
      let brickExtent = brickSizeF();
      let probe = clamp(position + sign(direction) * epsilon, vec3<f32>(0.0), sampleBounds());
      let brickCoord = floor(probe / brickExtent);
      let boundary = vec3<f32>(
        select(brickCoord.x * brickExtent, (brickCoord.x + 1.0) * brickExtent, direction.x > 0.0),
        select(brickCoord.y * brickExtent, (brickCoord.y + 1.0) * brickExtent, direction.y > 0.0),
        select(brickCoord.z * brickExtent, (brickCoord.z + 1.0) * brickExtent, direction.z > 0.0),
      );
      let tx = select(far, (boundary.x - position.x) / direction.x, abs(direction.x) > 0.00001);
      let ty = select(far, (boundary.y - position.y) / direction.y, abs(direction.y) > 0.00001);
      let tz = select(far, (boundary.z - position.z) / direction.z, abs(direction.z) > 0.00001);
      return max(min(tx, min(ty, tz)) + epsilon, epsilon);
    }

    fn sampleDensity(position: vec3<f32>) -> f32 {
      let dimensions = sampleBounds();
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
      let maxCoord = maxCoordU();
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
      let dimensions = sampleBounds();
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
      let dimensions = sampleBounds();
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
      let dimensions = sampleBounds();
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
      let warmTint = clamp(temperature * 0.5, 0.0, 1.0);
      let cloudBrightness = clamp(lightAmount * 0.55 + density * 0.12, 0.0, 1.0);
      return mix(
        vec3<f32>(0.018, 0.02, 0.024),
        vec3<f32>(0.16, 0.17, 0.18) + warmTint * vec3<f32>(0.16, 0.065, 0.02),
        clamp(cloudBrightness + temperature * 0.12, 0.0, 1.0),
      );
    }

    fn hashNoise3D(position: vec3<f32>) -> f32 {
      return fract(sin(dot(position, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    fn valueNoise3D(position: vec3<f32>) -> f32 {
      let cell = floor(position);
      let fraction = fract(position);
      let smoooth = fraction * fraction * (vec3<f32>(3.0) - 2.0 * fraction);
      let c000 = hashNoise3D(cell);
      let c100 = hashNoise3D(cell + vec3<f32>(1.0, 0.0, 0.0));
      let c010 = hashNoise3D(cell + vec3<f32>(0.0, 1.0, 0.0));
      let c110 = hashNoise3D(cell + vec3<f32>(1.0, 1.0, 0.0));
      let c001 = hashNoise3D(cell + vec3<f32>(0.0, 0.0, 1.0));
      let c101 = hashNoise3D(cell + vec3<f32>(1.0, 0.0, 1.0));
      let c011 = hashNoise3D(cell + vec3<f32>(0.0, 1.0, 1.0));
      let c111 = hashNoise3D(cell + vec3<f32>(1.0, 1.0, 1.0));
      let x00 = mix(c000, c100, smoooth.x);
      let x10 = mix(c010, c110, smoooth.x);
      let x01 = mix(c001, c101, smoooth.x);
      let x11 = mix(c011, c111, smoooth.x);
      let y0 = mix(x00, x10, smoooth.y);
      let y1 = mix(x01, x11, smoooth.y);
      return mix(y0, y1, smoooth.z);
    }

    fn thermalPocketPattern(
      position: vec3<f32>,
      time: f32,
      density: f32,
      reaction: f32,
      hotGas: f32,
    ) -> vec3<f32> {
      let flow = position * 0.082 + vec3<f32>(time * 0.09, time * 0.18, -time * 0.06);
      let bulk = valueNoise3D(flow + vec3<f32>(reaction * 2.1, density * 0.9, hotGas * 0.55));
      let pocket = hashNoise3D(floor(flow * 2.4) + vec3<f32>(17.0, 9.0, 13.0));
      let vent = hashNoise3D(floor(flow * vec3<f32>(1.2, 2.6, 1.4)) + vec3<f32>(5.0, 21.0, 11.0));
      let cluster = clamp(bulk * 0.62 + pocket * 0.2 + vent * 0.1 + reaction * 0.06, 0.0, 1.0);
      let ridge = 1.0 - abs((bulk * 0.72 + vent * 0.28) * 2.0 - 1.0);
      let cellular = abs(bulk - pocket);

      return vec3<f32>(cluster, ridge, cellular);
    }

    fn cloudMicroDetail(
      position: vec3<f32>,
      time: f32,
      density: f32,
      reaction: f32,
      hotGas: f32,
    ) -> f32 {
      let flow = position * 0.21 + vec3<f32>(-time * 0.035, time * 0.028, time * 0.018);
      let broad = valueNoise3D(flow + vec3<f32>(density * 1.8, reaction * 2.2, hotGas * 1.1));
      let crisp = hashNoise3D(floor(flow * 4.2) + vec3<f32>(7.0, 19.0, 3.0));
      let streak = hashNoise3D(floor(flow * vec3<f32>(2.4, 4.8, 2.6)) + vec3<f32>(23.0, 11.0, 29.0));
      return clamp(broad * 0.58 + crisp * 0.24 + streak * 0.18, 0.0, 1.0);
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
      let sampleDimensions = sampleBounds();
      let sampleRayDirection = rayDirection * invExtent * sampleDimensions;
      let lightDirection = normalize(vec3<f32>(-0.42, 0.78, 0.36));
      let fillDirection = normalize(vec3<f32>(0.55, 0.32, -0.62));
      let forwardScatter = pow(clamp(dot(-rayDirection, lightDirection), 0.0, 1.0), 1.05) * 0.62 + 0.52;
      var positionRay = camera.position.xyz + rayDirection * bounds.x;
      var travelled = 0.0;
      var accumulatedColor = vec3<f32>(0.0);
      var accumulatedAlpha = 0.0;

      for (var index = 0u; index < stepCount && travelled <= rayLength; index += 1u) {
        if (accumulatedAlpha > 0.985) {
          break;
        }

        var stepDistance = delta;
        let uvw = (positionRay - boxMin) * invExtent;

        if (all(uvw >= vec3<f32>(0.0)) && all(uvw <= vec3<f32>(1.0))) {
          let samplePosition = uvw * sampleDimensions;
          if (isActiveSample(samplePosition)) {
            let density = max(sampleDensity(samplePosition) - 0.005, 0.0);
            let temperature = sampleTemperature(samplePosition);
            let fuel = sampleFuel(samplePosition);
            let reaction = sampleReaction(samplePosition);
            let hotGas = clamp(temperature * 1.55 + fuel * 0.26 + reaction * 0.44, 0.0, 1.0);

            if (density > 0.001 || hotGas > 0.018) {
              let microDetail = cloudMicroDetail(samplePosition, camera.renderMode.z, density, reaction, hotGas);
              let thermalPattern = thermalPocketPattern(samplePosition, camera.renderMode.z, density, reaction, hotGas);
              let heatCore = smoothstep(0.1, 0.78, hotGas * 0.92 + reaction * 0.5);
              let heatBreakup = smoothstep(0.34, 0.84, thermalPattern.x * 0.78 + thermalPattern.y * 0.22 + reaction * 0.08);
              let hotPocket = clamp(heatCore * mix(0.72, 1.18, heatBreakup), 0.0, 1.0);
              let coolCore = smoothstep(0.04, 0.7, density) *
                (1.0 - smoothstep(0.34, 0.82, hotGas + reaction * 0.28));
              let coolingPocket = coolCore * smoothstep(0.48, 0.92, 1.0 - thermalPattern.x + thermalPattern.z * 0.28);
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
              let rimLight = pow(1.0 - clamp(dot(smokeNormal, -rayDirection), 0.0, 1.0), 5.7);
              let heightAmbient = smoothstep(0.02, 0.95, uvw.y);
              let lightProbePosition = clamp(uvw + lightDirection * 0.03, vec3<f32>(0.0), vec3<f32>(1.0));
              var shadowProbe = 0.0;
              if (detailedDensity > 0.004) {
                shadowProbe = sampleDensity(lightProbePosition * sampleDimensions);
              }
              let lightTransmission = 1.0 - clamp(shadowProbe * 0.22, 0.0, 0.38);
              let cloudDetail = clamp(gradLength * 7.5 + abs(microDetail - 0.5) * 2.4 + reaction * 0.26, 0.0, 1.0);
              let totalLight = lightTransmission * (keyDiffuse * 0.95 + fillDiffuse * 0.32) + rimLight * 0.42;
              let smokeBase = smokePalette(detailedDensity, temperature, totalLight);
              let ambientLight = vec3<f32>(0.26, 0.28, 0.31) * (0.22 + heightAmbient * 0.18);
              let silverLining = vec3<f32>(0.42, 0.45, 0.48) * rimLight * (0.12 + cloudDetail * 0.22 + bodyPocket * 0.08);
              let warmRim = vec3<f32>(1.0, 0.48, 0.16) * rimLight * (0.06 + temperature * 0.22);
              let creviceShade = 1.0 - cloudDetail * (1.0 - lightTransmission) * mix(0.34, 0.64, coolingPocket);
              let sootShadow = 1.0 - smoothstep(0.16, 0.82, totalLight) * 0.52;
              let pocketShadow = 1.0 - coolingPocket * (0.18 + cloudDetail * 0.26);
              let sootColor = mix(
                vec3<f32>(0.008, 0.008, 0.01),
                vec3<f32>(0.09, 0.085, 0.08),
                clamp(totalLight * 0.35 + temperature * 0.08, 0.0, 1.0),
              );
              let warmSmoke = smokeBase + vec3<f32>(0.16, 0.055, 0.016) * hotPocket * hotGas;
              let phaseSmoke = mix(warmSmoke, sootColor, coolingPocket * 0.84);
              let smokeColor = phaseSmoke * (0.5 + totalLight * 0.28) * creviceShade * sootShadow * pocketShadow +
                ambientLight * detailedDensity * 0.18 + silverLining + warmRim * 0.34;
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
          } else {
            stepDistance = max(distanceToNextBrickBoundary(samplePosition, sampleRayDirection), delta);
          }
        }

        positionRay += rayDirection * stepDistance;
        travelled += stepDistance;
      }

      if (accumulatedAlpha < 0.01) {
        discard;
      }

      let finalColor = pow(accumulatedColor, vec3<f32>(0.92));

      return vec4<f32>(finalColor * accumulatedAlpha, accumulatedAlpha);
    }
  `
}
