import type { OrbitCameraSnapshot } from '../../scene/camera/createOrbitCameraController'
import type { CombustionVolumeRenderBuffers } from '../../simulation/common/combustionVolumeRenderBuffers'
import type { VolumeResolution } from '../../simulation/common/volumeResolution'
import { MAX_RENDER_LIGHTS, type RenderLight } from '../lighting/renderLight'
import type { VolumeDisplayMode } from '../volumetrics/volumeDisplayMode'

export interface RaymarchRenderParams {
  stepCount?: number
  lights?: readonly RenderLight[]
  scatteringForward?: number
  scatteringBack?: number
}

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
  setRenderParams(params: RaymarchRenderParams): void
  dispose(): void
}

const GPU_BUFFER_UNIFORM = 0x0040
const GPU_BUFFER_COPY_DST = 0x0008
const CAMERA_CORE_FLOATS = 44
const LIGHT_FLOATS = MAX_RENDER_LIGHTS * 12
const CAMERA_DATA_FLOATS = CAMERA_CORE_FLOATS + LIGHT_FLOATS
const DEFAULT_LIGHT_DIRECTION: readonly [number, number, number] = [-0.34, 0.88, 0.31]

const DEFAULT_LIGHTS: readonly RenderLight[] = [
  {
    type: 'directional',
    direction: DEFAULT_LIGHT_DIRECTION,
    position: [0, 0, 0],
    color: [1.0, 0.95, 0.88],
    intensity: 1.25,
  },
]

function normalize3(x: number, y: number, z: number): readonly [number, number, number] {
  const length = Math.hypot(x, y, z)

  if (length <= 0.0001) {
    return DEFAULT_LIGHT_DIRECTION
  }

  return [x / length, y / length, z / length]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function sanitizeRenderLights(inputLights: readonly RenderLight[] | undefined): RenderLight[] {
  const sourceLights = inputLights ?? DEFAULT_LIGHTS

  return sourceLights.slice(0, MAX_RENDER_LIGHTS).map((light) => ({
    type: light.type,
    direction: normalize3(light.direction[0], light.direction[1], light.direction[2]),
    position: [light.position[0], light.position[1], light.position[2]],
    color: [
      Math.max(light.color[0], 0),
      Math.max(light.color[1], 0),
      Math.max(light.color[2], 0),
    ],
    intensity: Math.max(light.intensity, 0),
  }))
}

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
  const defaultStepCount = voxelCount >= 4_000_000 ? 220 : voxelCount >= 1_800_000 ? 400 : 180

  let stepCount = defaultStepCount
  let lights = sanitizeRenderLights(undefined)
  let scatteringForward = 0.32
  let scatteringBack = -0.18

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

  device.queue.writeBuffer(
    resolutionBuffer,
    0,
    new Float32Array([resolution.width, resolution.height, resolution.depth, 0]),
  )

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
      cameraData[36] = 0
      cameraData[37] = 0
      cameraData[38] = 0
      cameraData[39] = 0
      cameraData[40] = scatteringForward
      cameraData[41] = scatteringBack
      cameraData[42] = lights.length
      cameraData[43] = 0

      for (let index = 0; index < MAX_RENDER_LIGHTS; index += 1) {
        const light = lights[index]
        const base = CAMERA_CORE_FLOATS + index * 12

        if (!light) {
          cameraData.fill(0, base, base + 12)
          continue
        }

        cameraData[base] = light.direction[0]
        cameraData[base + 1] = light.direction[1]
        cameraData[base + 2] = light.direction[2]
        cameraData[base + 3] = light.type === 'point' ? 1 : 0
        cameraData[base + 4] = light.position[0]
        cameraData[base + 5] = light.position[1]
        cameraData[base + 6] = light.position[2]
        cameraData[base + 7] = light.intensity
        cameraData[base + 8] = light.color[0]
        cameraData[base + 9] = light.color[1]
        cameraData[base + 10] = light.color[2]
        cameraData[base + 11] = 0
      }

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
    setRenderParams(params) {
      if (params.stepCount !== undefined) {
        stepCount = Math.max(32, Math.round(params.stepCount))
      }
      if (params.lights !== undefined) {
        lights = sanitizeRenderLights(params.lights)
      }
      if (params.scatteringForward !== undefined) {
        scatteringForward = clamp(params.scatteringForward, 0, 0.98)
      }
      if (params.scatteringBack !== undefined) {
        scatteringBack = clamp(params.scatteringBack, -0.98, 0)
      }
    },
    dispose() {
      cameraBuffer.destroy()
      resolutionBuffer.destroy()
    },
  }
}

function createVolumeRaymarchShader() {
  return /* wgsl */ `
    struct RenderLightData {
      directionType: vec4<f32>,
      positionIntensity: vec4<f32>,
      color: vec4<f32>,
    }

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
      padding: vec4<f32>,
      scatter: vec4<f32>,
      lights: array<RenderLightData, ${MAX_RENDER_LIGHTS}>,
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

    struct VoxelSample {
      density: f32,
      temperature: f32,
      fuel: f32,
      reaction: f32,
    }

    @group(0) @binding(0) var<uniform> camera: CameraData;
    @group(0) @binding(1) var<uniform> resolution: ResolutionData;
    @group(0) @binding(2) var<storage, read> densityField: array<f32>;
    @group(0) @binding(3) var<storage, read> temperatureField: array<f32>;
    @group(0) @binding(4) var<storage, read> fuelField: array<f32>;
    @group(0) @binding(5) var<storage, read> reactionField: array<f32>;
    @group(0) @binding(6) var<storage, read> activeBrickFlags: array<u32>;
    @group(0) @binding(7) var<uniform> brickInfo: BrickInfo;

    fn sampleBounds() -> vec3<f32> {
      return vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0);
    }

    fn brickSizeU() -> u32 {
      return max(brickInfo.params.x, 1u);
    }

    fn activeBrickIndexForCoord(coord: vec3<u32>) -> u32 {
      let brickCoord = min(coord / vec3<u32>(brickSizeU()), brickInfo.counts.xyz - vec3<u32>(1u));
      return brickCoord.x + brickInfo.counts.x * (brickCoord.y + brickInfo.counts.y * brickCoord.z);
    }

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + u32(resolution.width) * (coord.y + u32(resolution.height) * coord.z);
    }

    fn isActiveSample(position: vec3<f32>) -> bool {
      let coord = vec3<u32>(floor(clamp(position, vec3<f32>(0.0), sampleBounds())));
      return activeBrickFlags[activeBrickIndexForCoord(coord)] != 0u;
    }

    fn voxelDistToNextBrick(voxPos: vec3<f32>, voxRayDir: vec3<f32>) -> f32 {
      let far = 1e9;
      let brickExtent = f32(brickSizeU());
      let brickCoord = floor(voxPos / brickExtent);
      let boundary = vec3<f32>(
        select(brickCoord.x * brickExtent, (brickCoord.x + 1.0) * brickExtent, voxRayDir.x > 0.0),
        select(brickCoord.y * brickExtent, (brickCoord.y + 1.0) * brickExtent, voxRayDir.y > 0.0),
        select(brickCoord.z * brickExtent, (brickCoord.z + 1.0) * brickExtent, voxRayDir.z > 0.0),
      );
      let tx = select(far, (boundary.x - voxPos.x) / voxRayDir.x, abs(voxRayDir.x) > 0.00001);
      let ty = select(far, (boundary.y - voxPos.y) / voxRayDir.y, abs(voxRayDir.y) > 0.00001);
      let tz = select(far, (boundary.z - voxPos.z) / voxRayDir.z, abs(voxRayDir.z) > 0.00001);
      return min(tx, min(ty, tz)) * length(voxRayDir) + 0.5;
    }

    fn sampleAllFields(position: vec3<f32>) -> VoxelSample {
      let dims = sampleBounds();
      let clamped = clamp(position, vec3<f32>(0.0), dims);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(dims));
      let f = fract(clamped);

      let i000 = flatten(base);
      let i100 = flatten(vec3<u32>(upper.x, base.y, base.z));
      let i010 = flatten(vec3<u32>(base.x, upper.y, base.z));
      let i110 = flatten(vec3<u32>(upper.x, upper.y, base.z));
      let i001 = flatten(vec3<u32>(base.x, base.y, upper.z));
      let i101 = flatten(vec3<u32>(upper.x, base.y, upper.z));
      let i011 = flatten(vec3<u32>(base.x, upper.y, upper.z));
      let i111 = flatten(upper);

      var sample: VoxelSample;

      let d_x00 = mix(densityField[i000], densityField[i100], f.x);
      let d_x10 = mix(densityField[i010], densityField[i110], f.x);
      let d_x01 = mix(densityField[i001], densityField[i101], f.x);
      let d_x11 = mix(densityField[i011], densityField[i111], f.x);
      sample.density = mix(mix(d_x00, d_x10, f.y), mix(d_x01, d_x11, f.y), f.z);

      let t_x00 = mix(temperatureField[i000], temperatureField[i100], f.x);
      let t_x10 = mix(temperatureField[i010], temperatureField[i110], f.x);
      let t_x01 = mix(temperatureField[i001], temperatureField[i101], f.x);
      let t_x11 = mix(temperatureField[i011], temperatureField[i111], f.x);
      sample.temperature = mix(mix(t_x00, t_x10, f.y), mix(t_x01, t_x11, f.y), f.z);

      let fu_x00 = mix(fuelField[i000], fuelField[i100], f.x);
      let fu_x10 = mix(fuelField[i010], fuelField[i110], f.x);
      let fu_x01 = mix(fuelField[i001], fuelField[i101], f.x);
      let fu_x11 = mix(fuelField[i011], fuelField[i111], f.x);
      sample.fuel = mix(mix(fu_x00, fu_x10, f.y), mix(fu_x01, fu_x11, f.y), f.z);

      let r_x00 = mix(reactionField[i000], reactionField[i100], f.x);
      let r_x10 = mix(reactionField[i010], reactionField[i110], f.x);
      let r_x01 = mix(reactionField[i001], reactionField[i101], f.x);
      let r_x11 = mix(reactionField[i011], reactionField[i111], f.x);
      sample.reaction = mix(mix(r_x00, r_x10, f.y), mix(r_x01, r_x11, f.y), f.z);

      return sample;
    }

    fn readDensityNearest(position: vec3<f32>) -> f32 {
      let coord = clamp(vec3<u32>(floor(position)), vec3<u32>(0u), vec3<u32>(sampleBounds()));
      return densityField[flatten(coord)];
    }

    fn densityGradient(position: vec3<f32>) -> vec3<f32> {
      let dims = sampleBounds();
      let maxCoord = vec3<u32>(dims);
      let coord = clamp(vec3<u32>(round(position)), vec3<u32>(0u), maxCoord);
      let xp = flatten(vec3<u32>(min(coord.x + 1u, maxCoord.x), coord.y, coord.z));
      let xn = flatten(vec3<u32>(select(coord.x - 1u, 0u, coord.x == 0u), coord.y, coord.z));
      let yp = flatten(vec3<u32>(coord.x, min(coord.y + 1u, maxCoord.y), coord.z));
      let yn = flatten(vec3<u32>(coord.x, select(coord.y - 1u, 0u, coord.y == 0u), coord.z));
      let zp = flatten(vec3<u32>(coord.x, coord.y, min(coord.z + 1u, maxCoord.z)));
      let zn = flatten(vec3<u32>(coord.x, coord.y, select(coord.z - 1u, 0u, coord.z == 0u)));
      return vec3<f32>(
        densityField[xp] - densityField[xn],
        densityField[yp] - densityField[yn],
        densityField[zp] - densityField[zn],
      );
    }

    fn intersectBox(origin: vec3<f32>, direction: vec3<f32>, boxMin: vec3<f32>, boxMax: vec3<f32>) -> vec2<f32> {
      let invDir = 1.0 / direction;
      let tMinTemp = (boxMin - origin) * invDir;
      let tMaxTemp = (boxMax - origin) * invDir;
      let tMin = min(tMinTemp, tMaxTemp);
      let tMax = max(tMinTemp, tMaxTemp);
      return vec2<f32>(
        max(tMin.x, max(tMin.y, tMin.z)),
        min(tMax.x, min(tMax.y, tMax.z)),
      );
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
      let warmTint = clamp(temperature * 0.38, 0.0, 1.0);
      let shade = clamp(pow(max(lightAmount, 0.0), 1.45) * 0.64 + density * 0.05, 0.0, 1.0);
      return mix(
        vec3<f32>(0.008, 0.009, 0.011),
        vec3<f32>(0.12, 0.126, 0.132) + warmTint * vec3<f32>(0.08, 0.028, 0.008),
        shade,
      );
    }

    fn phaseHG(cosTheta: f32, g: f32) -> f32 {
      let g2 = g * g;
      let denom = pow(max(1.0 + g2 - 2.0 * g * cosTheta, 0.001), 1.5);
      return (1.0 - g2) / (12.566370614359172 * denom);
    }

    fn lightDirection(index: u32, worldPosition: vec3<f32>) -> vec3<f32> {
      let kind = camera.lights[index].directionType.w;
      if (kind > 0.5) {
        return normalize(camera.lights[index].positionIntensity.xyz - worldPosition);
      }
      let raw = camera.lights[index].directionType.xyz;
      return normalize(select(vec3<f32>(-0.34, 0.88, 0.31), raw, dot(raw, raw) > 0.0001));
    }

    fn lightAttenuation(index: u32, worldPosition: vec3<f32>) -> f32 {
      let kind = camera.lights[index].directionType.w;
      if (kind <= 0.5) {
        return 1.0;
      }
      let toLight = camera.lights[index].positionIntensity.xyz - worldPosition;
      let distance = length(toLight);
      return 1.0 / (1.0 + distance * 0.09 + distance * distance * 0.02);
    }

    fn lightIntensity(index: u32) -> f32 {
      return max(camera.lights[index].positionIntensity.w, 0.0);
    }

    fn lightColor(index: u32) -> vec3<f32> {
      return camera.lights[index].color.xyz;
    }

    fn lightAmount(color: vec3<f32>) -> f32 {
      return max(color.x, max(color.y, color.z));
    }

    fn primaryLightTransmittance(
      samplePosition: vec3<f32>,
      sampleDimensions: vec3<f32>,
      lightStep: vec3<f32>,
      density: f32,
      hotGas: f32,
    ) -> f32 {
      let p1 = clamp(samplePosition + lightStep * 0.9, vec3<f32>(0.0), sampleDimensions);
      let p2 = clamp(samplePosition + lightStep * 2.0, vec3<f32>(0.0), sampleDimensions);
      let p3 = clamp(samplePosition + lightStep * 3.6, vec3<f32>(0.0), sampleDimensions);
      let d1 = max(readDensityNearest(p1) - 0.004, 0.0);
      let d2 = max(readDensityNearest(p2) - 0.004, 0.0);
      let d3 = max(readDensityNearest(p3) - 0.004, 0.0);
      let opticalDepth = density * 0.18 + d1 * 0.72 + d2 * 0.42 + d3 * 0.22 - hotGas * 0.08;
      return exp(-max(opticalDepth, 0.0) * 1.6);
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
      let ndc = vec2<f32>(input.uv.x * 2.0 - 1.0, input.uv.y * 2.0 - 1.0);
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

      let stepCount = u32(camera.renderMode.y);
      let invExtent = 1.0 / (camera.volumeHalfExtents.xyz * 2.0);
      let sampleDimensions = sampleBounds();
      let voxRayDir = rayDirection * invExtent * sampleDimensions;
      let voxDelta = length(voxRayDir) * (bounds.y - bounds.x) / max(f32(stepCount), 1.0);
      let worldDelta = (bounds.y - bounds.x) / max(f32(stepCount), 1.0);
      let activeLightCount = u32(clamp(camera.scatter.z, 0.0, f32(${MAX_RENDER_LIGHTS})));

      let primaryDirection = select(
        vec3<f32>(0.0, 1.0, 0.0),
        lightDirection(0u, camera.position.xyz),
        activeLightCount > 0u,
      );
      let sampleLightStep = primaryDirection * sampleDimensions * 0.036;

      var voxPos = (camera.position.xyz + rayDirection * bounds.x - boxMin) * invExtent * sampleDimensions;
      var voxTravelled = 0.0;
      let voxRayLength = length(voxRayDir) * (bounds.y - bounds.x);
      var accumulatedColor = vec3<f32>(0.0);
      var accumulatedAlpha = 0.0;

      for (var index = 0u; index < stepCount && voxTravelled <= voxRayLength; index += 1u) {
        if (accumulatedAlpha > 0.985) {
          break;
        }

        var voxStep = voxDelta;
        let samplePosition = voxPos;
        let uvw = samplePosition / sampleDimensions;

        if (isActiveSample(samplePosition)) {
          let sample = sampleAllFields(samplePosition);
          let density = max(sample.density - 0.004, 0.0);
          let temperature = sample.temperature;
          let fuel = sample.fuel;
          let reaction = sample.reaction;
          let hotGas = clamp(temperature * 1.45 + fuel * 0.22 + reaction * 0.38, 0.0, 1.0);

          if (density > 0.001 || hotGas > 0.018) {
            if (density < 0.012 && hotGas < 0.04) {
              voxStep = voxDelta * 1.8;
            } else {
              let densityGrad = densityGradient(samplePosition);
              let gradLength = max(length(densityGrad), 0.0001);
              let smokeNormal = select(vec3<f32>(0.0, 1.0, 0.0), -densityGrad / gradLength, gradLength > 0.00011);
              let detail = clamp(gradLength * 5.2 + hotGas * 0.28 + reaction * 0.18, 0.0, 1.0);
              let detailedDensity = max(pow(density, 0.96) * mix(0.82, 1.42, detail), 0.0);
              let worldPosition = mix(boxMin, boxMax, uvw);
              let topFade = 1.0 - smoothstep(0.9, 0.995, uvw.y);

              var totalLightColor = vec3<f32>(0.0);
              let primaryTransmission = select(
                1.0,
                primaryLightTransmittance(samplePosition, sampleDimensions, sampleLightStep, detailedDensity, hotGas),
                activeLightCount > 0u,
              );

              for (var lightIndex = 0u; lightIndex < ${MAX_RENDER_LIGHTS}u; lightIndex += 1u) {
                if (lightIndex >= activeLightCount) {
                  break;
                }

                let directionToLight = lightDirection(lightIndex, worldPosition);
                let power = lightIntensity(lightIndex) * lightAttenuation(lightIndex, worldPosition);
                let color = lightColor(lightIndex);
                let lightViewCos = clamp(dot(directionToLight, -rayDirection), -1.0, 1.0);
                let forwardScatter = phaseHG(lightViewCos, camera.scatter.x) * 5.0 * power;
                let backwardScatter = phaseHG(lightViewCos, camera.scatter.y) * 2.0 * power;
                let directional = clamp(dot(smokeNormal, directionToLight) * 0.5 + 0.5, 0.0, 1.0) * power;
                let scatterLight = (forwardScatter + backwardScatter) * mix(0.35, 0.8, hotGas);
                let transmission = select(primaryTransmission, 1.0, lightIndex > 0u);
                totalLightColor += color * transmission * (directional + scatterLight);
              }

              let totalLight = lightAmount(totalLightColor);
              let ambientAmount = select(0.012, 0.032 + totalLight * 0.06, activeLightCount > 0u);
              let ambientColor = vec3<f32>(0.006, 0.007, 0.009) * ambientAmount;
              let smokeBase = smokePalette(detailedDensity, temperature, totalLight);
              let coolness = smoothstep(0.05, 0.6, detailedDensity) * (1.0 - smoothstep(0.28, 0.78, hotGas));
              let sootColor = mix(
                vec3<f32>(0.01, 0.01, 0.012),
                vec3<f32>(0.08, 0.082, 0.086),
                clamp(totalLight * 0.3 + temperature * 0.04, 0.0, 1.0),
              );
              let litSmoke = mix(smokeBase, sootColor, coolness * 0.68) * (ambientColor + totalLightColor);
              let flameHeat = clamp(temperature * 0.9 + fuel * 0.14 + reaction * 0.16, 0.0, 1.0);
              let emissive = firePalette(flameHeat) * hotGas * (0.48 + fuel * 0.16 + reaction * 0.24);
              let contribution = clamp(detailedDensity * 1.35 + hotGas * 1.25, 0.0, 1.0);
              let stepDistance = worldDelta * mix(1.02, 0.76, contribution);
              voxStep = voxDelta * mix(1.02, 0.76, contribution);

              var compositeColor = litSmoke + emissive;
              var opacity = (1.0 - exp(-(detailedDensity * 3.0 + hotGas * 0.65) * stepDistance)) * topFade;

              if (camera.renderMode.x > 0.5 && camera.renderMode.x < 1.5) {
                compositeColor = mix(
                  vec3<f32>(0.01, 0.01, 0.012),
                  vec3<f32>(0.88, 0.9, 0.94),
                  clamp(detailedDensity * 1.4, 0.0, 1.0),
                );
                opacity = 1.0 - exp(-detailedDensity * stepDistance * 8.6);
              } else if (camera.renderMode.x >= 1.5) {
                compositeColor = mix(
                  vec3<f32>(0.04, 0.012, 0.0),
                  vec3<f32>(1.0, 0.72, 0.22),
                  clamp(fuel * 1.3, 0.0, 1.0),
                );
                opacity = 1.0 - exp(-fuel * stepDistance * 7.0);
              }

              accumulatedColor += (1.0 - accumulatedAlpha) * compositeColor * opacity;
              accumulatedAlpha += (1.0 - accumulatedAlpha) * opacity;
            }
          } else {
            voxStep = voxDelta * 1.35;
          }
        } else {
          voxStep = max(voxelDistToNextBrick(samplePosition, voxRayDir), voxDelta);
        }

        voxPos += normalize(voxRayDir) * voxStep;
        voxTravelled += voxStep;
      }

      if (accumulatedAlpha < 0.01) {
        discard;
      }

      let finalColor = pow(accumulatedColor, vec3<f32>(0.92));
      return vec4<f32>(finalColor, accumulatedAlpha);
    }
  `
}
