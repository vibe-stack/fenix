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
const LIGHT_DATA_FLOATS = MAX_RENDER_LIGHTS * 12
const CAMERA_DATA_FLOATS = 44 + LIGHT_DATA_FLOATS

const DEFAULT_LIGHT_DIRECTION: readonly [number, number, number] = [-0.34, 0.88, 0.31]

function sanitizeRenderLights(inputLights: readonly RenderLight[]): RenderLight[] {
  const nextLights = inputLights
    .slice(0, MAX_RENDER_LIGHTS)
    .map((light) => {
      const directionLength = Math.hypot(light.direction[0], light.direction[1], light.direction[2])
      const direction = directionLength > 0.0001
        ? [light.direction[0] / directionLength, light.direction[1] / directionLength, light.direction[2] / directionLength] as const
        : DEFAULT_LIGHT_DIRECTION

      return {
        type: light.type,
        direction,
        position: [light.position[0], light.position[1], light.position[2]] as const,
        color: [
          Math.max(light.color[0], 0),
          Math.max(light.color[1], 0),
          Math.max(light.color[2], 0),
        ] as const,
        intensity: Math.max(light.intensity, 0),
      }
    })

  return nextLights
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
  const defaultStepCount = voxelCount >= 4_000_000 ? 200 : voxelCount >= 1_800_000 ? 400 : 180
  let stepCount = defaultStepCount
  let lights: RenderLight[] = []
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
      // reserved vec4
      cameraData[36] = 0
      cameraData[37] = 0
      cameraData[38] = 0
      cameraData[39] = 0
      // scatter vec4, z = active light count
      cameraData[40] = scatteringForward
      cameraData[41] = scatteringBack
      cameraData[42] = lights.length
      cameraData[43] = 0

      for (let lightIndex = 0; lightIndex < MAX_RENDER_LIGHTS; lightIndex += 1) {
        const baseOffset = 44 + lightIndex * 12
        const light = lights[lightIndex]

        if (light) {
          cameraData[baseOffset] = light.direction[0]
          cameraData[baseOffset + 1] = light.direction[1]
          cameraData[baseOffset + 2] = light.direction[2]
          cameraData[baseOffset + 3] = light.type === 'point' ? 1 : 0
          cameraData[baseOffset + 4] = light.position[0]
          cameraData[baseOffset + 5] = light.position[1]
          cameraData[baseOffset + 6] = light.position[2]
          cameraData[baseOffset + 7] = light.intensity
          cameraData[baseOffset + 8] = light.color[0]
          cameraData[baseOffset + 9] = light.color[1]
          cameraData[baseOffset + 10] = light.color[2]
          cameraData[baseOffset + 11] = 0
        } else {
          cameraData.fill(0, baseOffset, baseOffset + 12)
        }
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
      if (params.stepCount !== undefined) stepCount = params.stepCount
      if (params.lights !== undefined) lights = sanitizeRenderLights(params.lights)
      if (params.scatteringForward !== undefined) scatteringForward = params.scatteringForward
      if (params.scatteringBack !== undefined) scatteringBack = params.scatteringBack
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

    // All 4 fields packed so one trilinear pass reads everything at once
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

      var s: VoxelSample;

      let d_x00 = mix(densityField[i000], densityField[i100], f.x);
      let d_x10 = mix(densityField[i010], densityField[i110], f.x);
      let d_x01 = mix(densityField[i001], densityField[i101], f.x);
      let d_x11 = mix(densityField[i011], densityField[i111], f.x);
      s.density = mix(mix(d_x00, d_x10, f.y), mix(d_x01, d_x11, f.y), f.z);

      let t_x00 = mix(temperatureField[i000], temperatureField[i100], f.x);
      let t_x10 = mix(temperatureField[i010], temperatureField[i110], f.x);
      let t_x01 = mix(temperatureField[i001], temperatureField[i101], f.x);
      let t_x11 = mix(temperatureField[i011], temperatureField[i111], f.x);
      s.temperature = mix(mix(t_x00, t_x10, f.y), mix(t_x01, t_x11, f.y), f.z);

      let fu_x00 = mix(fuelField[i000], fuelField[i100], f.x);
      let fu_x10 = mix(fuelField[i010], fuelField[i110], f.x);
      let fu_x01 = mix(fuelField[i001], fuelField[i101], f.x);
      let fu_x11 = mix(fuelField[i011], fuelField[i111], f.x);
      s.fuel = mix(mix(fu_x00, fu_x10, f.y), mix(fu_x01, fu_x11, f.y), f.z);

      let r_x00 = mix(reactionField[i000], reactionField[i100], f.x);
      let r_x10 = mix(reactionField[i010], reactionField[i110], f.x);
      let r_x01 = mix(reactionField[i001], reactionField[i101], f.x);
      let r_x11 = mix(reactionField[i011], reactionField[i111], f.x);
      s.reaction = mix(mix(r_x00, r_x10, f.y), mix(r_x01, r_x11, f.y), f.z);

      return s;
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
      let warmTint = clamp(temperature * 0.5, 0.0, 1.0);
      let cloudBrightness = clamp(pow(max(lightAmount, 0.0), 1.65) * 0.48 + density * 0.06, 0.0, 1.0);
      return mix(
        vec3<f32>(0.010, 0.011, 0.013),
        vec3<f32>(0.13, 0.135, 0.14) + warmTint * vec3<f32>(0.14, 0.055, 0.012),
        clamp(cloudBrightness + temperature * 0.08, 0.0, 1.0),
      );
    }

    fn ihash3(p: vec3<i32>) -> f32 {
      var h = p.x * 1664525 + p.y * 1013904223 + p.z * 22695477;
      h ^= h >> 16;
      h *= 0x45d9f3b;
      h ^= h >> 16;
      return f32(h & 0x7fffffff) * (1.0 / 2147483648.0);
    }

    fn smoothNoise(p: vec3<f32>) -> f32 {
      let c = floor(p);
      let f = fract(p);
      let s = f * f * (3.0 - 2.0 * f);
      let ci = vec3<i32>(c);
      let a = ihash3(ci);
      let b = ihash3(ci + vec3<i32>(1, 0, 0));
      let c0 = ihash3(ci + vec3<i32>(0, 1, 0));
      let d = ihash3(ci + vec3<i32>(1, 1, 0));
      let e = ihash3(ci + vec3<i32>(0, 0, 1));
      let g = ihash3(ci + vec3<i32>(1, 0, 1));
      let h = ihash3(ci + vec3<i32>(0, 1, 1));
      let k = ihash3(ci + vec3<i32>(1, 1, 1));
      let x0 = mix(mix(a, b, s.x), mix(c0, d, s.x), s.y);
      let x1 = mix(mix(e, g, s.x), mix(h, k, s.x), s.y);
      return mix(x0, x1, s.z);
    }

    fn hashNoise(p: vec3<f32>) -> f32 {
      return ihash3(vec3<i32>(floor(p)));
    }

    fn phaseHG(cosTheta: f32, g: f32) -> f32 {
      let g2 = g * g;
      let denom = pow(max(1.0 + g2 - 2.0 * g * cosTheta, 0.001), 1.5);
      return (1.0 - g2) / (12.566370614359172 * denom);
    }

    fn lightDirectionAt(index: u32, samplePosition: vec3<f32>, sampleDimensions: vec3<f32>) -> vec3<f32> {
      let direction = camera.lights[index].directionType.xyz;
      if (camera.lights[index].directionType.w > 0.5) {
        let pointPosition = camera.lights[index].positionIntensity.xyz * sampleDimensions;
        return normalize(max(abs(pointPosition - samplePosition), vec3<f32>(0.0001)) * sign(pointPosition - samplePosition));
      }
      return normalize(select(vec3<f32>(-0.34, 0.88, 0.31), direction, dot(direction, direction) > 0.0001));
    }

    fn lightIntensityAt(index: u32, samplePosition: vec3<f32>, sampleDimensions: vec3<f32>) -> f32 {
      let intensity = max(camera.lights[index].positionIntensity.w, 0.0);
      if (camera.lights[index].directionType.w > 0.5) {
        let pointPosition = camera.lights[index].positionIntensity.xyz * sampleDimensions;
        let distance = length(pointPosition - samplePosition) / max(length(sampleDimensions), 0.0001);
        return intensity / (1.0 + distance * 8.0 + distance * distance * 30.0);
      }
      return intensity;
    }

    fn lightColor(index: u32) -> vec3<f32> {
      return camera.lights[index].color.xyz;
    }

    fn lightAmount(color: vec3<f32>) -> f32 {
      return max(color.x, max(color.y, color.z));
    }
          cameraData[baseOffset + 7] = 0
        } else {
          cameraData.fill(0, baseOffset, baseOffset + 8)
        }
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
      if (params.stepCount !== undefined) stepCount = params.stepCount
      if (params.lights !== undefined) lights = sanitizeRenderLights(params.lights)
      if (params.scatteringForward !== undefined) scatteringForward = params.scatteringForward
      if (params.scatteringBack !== undefined) scatteringBack = params.scatteringBack
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
      directionIntensity: vec4<f32>,
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

    // All 4 fields packed so one trilinear pass reads everything at once
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

    // Returns voxel-space distance (same units as voxDelta) to just past the next brick
    // boundary. voxPos and voxRayDir are both in voxel coordinates.
    // voxRayDir has magnitude |voxRayDir| voxels per unit-t; tx/ty/tz are parametric t,
    // so we multiply by |voxRayDir| to get voxel-space distance.
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
      // parametric t → voxel distance, then +0.5 vox to land inside the next brick
      return min(tx, min(ty, tz)) * length(voxRayDir) + 0.5;
    }

    // Single trilinear pass for all 4 fields — 8 index lookups, 4x reads each = 32 reads
    // vs the old 4 separate functions doing 32 reads each = 128 reads total.
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

      var s: VoxelSample;

      // Density
      let d_x00 = mix(densityField[i000], densityField[i100], f.x);
      let d_x10 = mix(densityField[i010], densityField[i110], f.x);
      let d_x01 = mix(densityField[i001], densityField[i101], f.x);
      let d_x11 = mix(densityField[i011], densityField[i111], f.x);
      s.density = mix(mix(d_x00, d_x10, f.y), mix(d_x01, d_x11, f.y), f.z);

      // Temperature
      let t_x00 = mix(temperatureField[i000], temperatureField[i100], f.x);
      let t_x10 = mix(temperatureField[i010], temperatureField[i110], f.x);
      let t_x01 = mix(temperatureField[i001], temperatureField[i101], f.x);
      let t_x11 = mix(temperatureField[i011], temperatureField[i111], f.x);
      s.temperature = mix(mix(t_x00, t_x10, f.y), mix(t_x01, t_x11, f.y), f.z);

      // Fuel
      let fu_x00 = mix(fuelField[i000], fuelField[i100], f.x);
      let fu_x10 = mix(fuelField[i010], fuelField[i110], f.x);
      let fu_x01 = mix(fuelField[i001], fuelField[i101], f.x);
      let fu_x11 = mix(fuelField[i011], fuelField[i111], f.x);
      s.fuel = mix(mix(fu_x00, fu_x10, f.y), mix(fu_x01, fu_x11, f.y), f.z);

      // Reaction
      let r_x00 = mix(reactionField[i000], reactionField[i100], f.x);
      let r_x10 = mix(reactionField[i010], reactionField[i110], f.x);
      let r_x01 = mix(reactionField[i001], reactionField[i101], f.x);
      let r_x11 = mix(reactionField[i011], reactionField[i111], f.x);
      s.reaction = mix(mix(r_x00, r_x10, f.y), mix(r_x01, r_x11, f.y), f.z);

      return s;
    }

    // Nearest-neighbour density only — used for shadow ray and GI probes where
    // sub-voxel accuracy is invisible but trilinear cost matters.
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
      let warmTint = clamp(temperature * 0.5, 0.0, 1.0);
      let cloudBrightness = clamp(pow(max(lightAmount, 0.0), 1.65) * 0.48 + density * 0.06, 0.0, 1.0);
      return mix(
        vec3<f32>(0.010, 0.011, 0.013),
        vec3<f32>(0.13, 0.135, 0.14) + warmTint * vec3<f32>(0.14, 0.055, 0.012),
        clamp(cloudBrightness + temperature * 0.08, 0.0, 1.0),
      );
    }

    // Integer hash — no sin/transcendentals, pure bitwise ops, extremely fast on GPU.
    fn ihash3(p: vec3<i32>) -> f32 {
      var h = p.x * 1664525 + p.y * 1013904223 + p.z * 22695477;
      h ^= h >> 16;
      h *= 0x45d9f3b;
      h ^= h >> 16;
      return f32(h & 0x7fffffff) * (1.0 / 2147483648.0);
    }

    fn smoothNoise(p: vec3<f32>) -> f32 {
      let c = floor(p);
      let f = fract(p);
      let s = f * f * (3.0 - 2.0 * f);
      let ci = vec3<i32>(c);
      let a = ihash3(ci);
      let b = ihash3(ci + vec3<i32>(1, 0, 0));
      let c0 = ihash3(ci + vec3<i32>(0, 1, 0));
      let d = ihash3(ci + vec3<i32>(1, 1, 0));
      let e = ihash3(ci + vec3<i32>(0, 0, 1));
      let g = ihash3(ci + vec3<i32>(1, 0, 1));
      let h = ihash3(ci + vec3<i32>(0, 1, 1));
      let k = ihash3(ci + vec3<i32>(1, 1, 1));
      let x0 = mix(mix(a, b, s.x), mix(c0, d, s.x), s.y);
      let x1 = mix(mix(e, g, s.x), mix(h, k, s.x), s.y);
      return mix(x0, x1, s.z);
    }

    fn hashNoise(p: vec3<f32>) -> f32 {
      return ihash3(vec3<i32>(floor(p)));
    }

    fn phaseHG(cosTheta: f32, g: f32) -> f32 {
      let g2 = g * g;
      let denom = pow(max(1.0 + g2 - 2.0 * g * cosTheta, 0.001), 1.5);
      return (1.0 - g2) / (12.566370614359172 * denom);
    }

    fn lightDirection(index: u32) -> vec3<f32> {
      let raw = camera.lights[index].directionIntensity.xyz;
      return normalize(select(vec3<f32>(-0.34, 0.88, 0.31), raw, dot(raw, raw) > 0.0001));
    }

    fn lightIntensity(index: u32) -> f32 {
      return max(camera.lights[index].directionIntensity.w, 0.0);
    }

    fn lightColor(index: u32) -> vec3<f32> {
      return camera.lights[index].color.xyz;
    }

    fn lightAmount(color: vec3<f32>) -> f32 {
      return max(color.x, max(color.y, color.z));
    }

    fn thermalPocketPattern(
      position: vec3<f32>,
      time: f32,
      density: f32,
      reaction: f32,
      hotGas: f32,
    ) -> vec3<f32> {
      let flow = position * 0.082 + vec3<f32>(time * 0.09, time * 0.18, -time * 0.06);
      let bulk = smoothNoise(flow + vec3<f32>(reaction * 2.1, density * 0.9, hotGas * 0.55));
      let pocket = hashNoise(floor(flow * 2.4) + vec3<f32>(17.0, 9.0, 13.0));
      let vent = hashNoise(floor(flow * vec3<f32>(1.2, 2.6, 1.4)) + vec3<f32>(5.0, 21.0, 11.0));
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
      let broad = smoothNoise(flow + vec3<f32>(density * 1.8, reaction * 2.2, hotGas * 1.1));
      let crisp = hashNoise(floor(flow * 4.2) + vec3<f32>(7.0, 19.0, 3.0));
      let streak = hashNoise(floor(flow * vec3<f32>(2.4, 4.8, 2.6)) + vec3<f32>(23.0, 11.0, 29.0));
      return clamp(broad * 0.58 + crisp * 0.24 + streak * 0.18, 0.0, 1.0);
    }

    fn sampleSmokeLightTransmittance(
      samplePosition: vec3<f32>,
      sampleDimensions: vec3<f32>,
      lightStep: vec3<f32>,
      detailedDensity: f32,
      hotGas: f32,
    ) -> f32 {
      // 3 nearest-neighbour density taps (was 4 trilinear — saves ~24 buffer reads).
      // Taps still span a wide cone; nearest is fine for a shadow estimate.
      let p1 = clamp(samplePosition + lightStep * 0.8,  vec3<f32>(0.0), sampleDimensions);
      let p2 = clamp(samplePosition + lightStep * 2.0,  vec3<f32>(0.0), sampleDimensions);
      let p3 = clamp(samplePosition + lightStep * 3.8,  vec3<f32>(0.0), sampleDimensions);
      let d1 = max(readDensityNearest(p1) - 0.004, 0.0);
      let d2 = max(readDensityNearest(p2) - 0.004, 0.0);
      let d3 = max(readDensityNearest(p3) - 0.004, 0.0);
      let opticalDepth = detailedDensity * 0.22 + d1 * 0.68 + d2 * 0.42 + d3 * 0.22 - hotGas * 0.12;
      return exp(-max(opticalDepth, 0.0) * 1.8);
    }

    // 4 nearest-neighbour GI probes (was 10 trilinear = ~80 reads; now 4 nearest = 4 reads).
    // Fire-to-smoke GI operates at a scale where sub-voxel interpolation is invisible.
    fn gatherEmissiveRadiance(
      samplePosition: vec3<f32>,
      sampleDimensions: vec3<f32>,
      density: f32,
    ) -> vec3<f32> {
      let r = sampleDimensions * 0.05;
      let transmit = exp(-density * 2.6);
      var radiance = vec3<f32>(0.0);

      let offsets = array<vec3<f32>, 4>(
        vec3<f32>( r.x,  r.y,  0.0),
        vec3<f32>(-r.x,  r.y,  0.0),
        vec3<f32>( 0.0, -r.y,  r.z),
        vec3<f32>( 0.0, -r.y, -r.z),
      );
      for (var i = 0u; i < 4u; i++) {
        let p = clamp(samplePosition + offsets[i], vec3<f32>(0.0), sampleDimensions);
        let coord = vec3<u32>(floor(p));
        let idx = flatten(coord);
        let pTemp  = temperatureField[idx];
        let pFuel  = fuelField[idx];
        let pReact = reactionField[idx];
        let pHot = clamp(pTemp * 1.4 + pFuel * 0.3 + pReact * 0.5, 0.0, 1.0);
        if (pHot > 0.04) {
          let emissive = firePalette(clamp(pTemp * 0.88 + pReact * 0.1, 0.0, 1.0));
          radiance += emissive * pHot * transmit;
        }
      }
      return radiance * 0.25;
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

      let stepCount = u32(camera.renderMode.y);
      let invExtent = 1.0 / (camera.volumeHalfExtents.xyz * 2.0);
      let sampleDimensions = sampleBounds();

      // March entirely in voxel space — brick-skip math is exact here,
      // no world↔voxel conversion error possible.
      // voxRayDir: voxels advanced per unit of t (same t as world-space ray)
      let voxRayDir = rayDirection * invExtent * sampleDimensions;
      // voxDelta: voxel-space step size for one standard step
      let voxDelta = length(voxRayDir) * (bounds.y - bounds.x) / max(f32(stepCount), 1.0);
      // world-space step size for one standard voxel-space step
      let worldDelta = (bounds.y - bounds.x) / max(f32(stepCount), 1.0);

      let activeLightCount = u32(clamp(camera.scatter.z, 0.0, f32(${MAX_RENDER_LIGHTS})));
      let primaryLightDirection = lightDirection(0u);
      let primaryLightIntensity = lightIntensity(0u);
      let primaryLightColor = lightColor(0u) * primaryLightIntensity;
      let sampleLightStep = primaryLightDirection * sampleDimensions * 0.036;
      let lightViewCos = clamp(dot(primaryLightDirection, -rayDirection), -1.0, 1.0);
      let forwardScatter = phaseHG(lightViewCos, camera.scatter.x) * 18.0 * primaryLightIntensity;
      let backwardScatter = phaseHG(lightViewCos, camera.scatter.y) * 8.0 * primaryLightIntensity;

      // Start voxel position
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

        // uvw from voxel position — exact, no rounding error
        let uvw = samplePosition / sampleDimensions;

        if (isActiveSample(samplePosition)) {
          // One merged trilinear pass — 32 reads instead of the old 128
          let s = sampleAllFields(samplePosition);
          let density = max(s.density - 0.005, 0.0);
          let temperature = s.temperature;
          let fuel = s.fuel;
          let reaction = s.reaction;
          let hotGas = clamp(temperature * 1.55 + fuel * 0.26 + reaction * 0.44, 0.0, 1.0);

          if (density > 0.001 || hotGas > 0.018) {
            if (density < 0.014 && hotGas < 0.05) {
              voxStep = voxDelta * 1.9;
            } else {
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
            let contributionWeight = clamp(detailedDensity * 1.65 + hotGas * 2.1, 0.0, 1.0);

            let densityGrad = densityGradient(samplePosition);
            let gradLength = max(length(densityGrad), 0.0001);
            var smokeNormal = vec3<f32>(0.0, 1.0, 0.0);
            if (gradLength > 0.00011) {
              smokeNormal = -densityGrad / gradLength;
            }

            let heightAmbient = smoothstep(0.02, 0.95, uvw.y);
            let lightTransmission = sampleSmokeLightTransmittance(
              samplePosition,
              sampleDimensions,
              sampleLightStep,
              detailedDensity,
              hotGas,
            );
            let rimFacing = 1.0 - clamp(dot(smokeNormal, -rayDirection), 0.0, 1.0);
            let contourLight = pow(rimFacing, 5.2) * lightTransmission * 0.14;
            let skyAmbient = mix(
              vec3<f32>(0.008, 0.009, 0.012),
              vec3<f32>(0.055, 0.065, 0.08),
              heightAmbient,
            );
            let phaseLight = lightTransmission * (0.08 + forwardScatter * 0.62 + backwardScatter * 0.08);
            let gradientBias = clamp(dot(smokeNormal, primaryLightDirection) * 0.25 + 0.25, 0.0, 0.5);
            let directionalLight = lightTransmission * gradientBias;
            var totalLightColor = primaryLightColor * (directionalLight + phaseLight + contourLight);
            for (var lightIndex = 1u; lightIndex < ${MAX_RENDER_LIGHTS}u; lightIndex += 1u) {
              if (lightIndex >= activeLightCount) {
                break;
              }
              let fillDirection = lightDirection(lightIndex);
              let fillIntensity = lightIntensity(lightIndex);
              let fillColor = lightColor(lightIndex) * fillIntensity;
              let fillViewCos = clamp(dot(fillDirection, -rayDirection), -1.0, 1.0);
              let fillPhase = phaseHG(fillViewCos, camera.scatter.x) * 7.0 * fillIntensity;
              let fillGradient = clamp(dot(smokeNormal, fillDirection) * 0.22 + 0.22, 0.0, 0.42) * fillIntensity;
              let fillContour = pow(rimFacing, 4.2) * 0.04 * fillIntensity;
              totalLightColor += fillColor * (fillGradient + fillPhase + fillContour);
            }
            let totalLight = lightAmount(totalLightColor);
            let emissiveGI = gatherEmissiveRadiance(samplePosition, sampleDimensions, detailedDensity);
            let cloudDetail = clamp(gradLength * 7.0 + abs(microDetail - 0.5) * 2.2 + reaction * 0.24, 0.0, 1.0);
            let smokeBase = smokePalette(detailedDensity, temperature, totalLight);
            let creviceShade = 1.0 - cloudDetail * (1.0 - lightTransmission) * mix(0.34, 0.64, coolingPocket);
            let sootShadow = 1.0 - smoothstep(0.16, 0.82, totalLight) * 0.46;
            let pocketShadow = 1.0 - coolingPocket * (0.18 + cloudDetail * 0.24);
            let sootColor = mix(
              vec3<f32>(0.008, 0.008, 0.01),
              vec3<f32>(0.09, 0.085, 0.08),
              clamp(totalLight * 0.32 + temperature * 0.08, 0.0, 1.0),
            );
            let warmSmoke = smokeBase + vec3<f32>(0.16, 0.055, 0.016) * hotPocket * hotGas;
            let phaseSmoke = mix(warmSmoke, sootColor, coolingPocket * 0.84);
            let localHeat = clamp(temperature * 0.76 + fuel * 0.16 + reaction * 0.18, 0.0, 1.0);
            let localHotSoot = smoothstep(0.1, 0.68, localHeat) *
              smoothstep(0.04, 0.56, detailedDensity) *
              smoothstep(0.18, 0.86, thermalPattern.x + bodyPocket * 0.24) *
              (1.0 - coolingPocket * 0.55);
            let emberColor = firePalette(clamp(localHeat * 0.88 + localHotSoot * 0.1, 0.0, 1.0));
            let smokeIllumination = emberColor * localHotSoot *
              (0.72 + forwardScatter * 0.44 + (1.0 - lightTransmission) * 1.82) *
              (0.82 + detailedDensity * 1.92 + hotGas * 0.32);
            let smokeLighting =
              skyAmbient * (1.0 + localHotSoot * 0.42 + heatCore * 0.18) +
              totalLightColor +
              emissiveGI * (0.82 + coolingPocket * 0.44) * (1.0 - hotPocket * 0.35);
            let heatedSmoke = phaseSmoke * smokeLighting * creviceShade * sootShadow * pocketShadow + smokeIllumination;
            let heatIsland = smoothstep(0.04, 0.42, hotGas) * mix(0.45, 1.45, hotPocket);
            let fireWindow = smoothstep(0.18, 0.72, hotGas + fuel * 0.18 + reaction * 0.16) *
              mix(0.38, 0.82, hotPocket);
            let crackMask = heatIsland *
              smoothstep(0.32, 0.92, thermalPattern.y + bodyPocket * 0.26 + reaction * 0.08) *
              (1.0 - smoothstep(0.86, 2.6, detailedDensity)) *
              (1.0 - coolingPocket * 0.5);
            let flameHeat = clamp(temperature * 0.86 + fuel * 0.1 + reaction * 0.08, 0.0, 1.0);
            let coreVisibility = exp(-detailedDensity * mix(1.6, 0.52, hotPocket));
            let coreRadiance = firePalette(flameHeat) * (flameHeat * (fuel * 0.42 + 0.38)) *
              (reaction * 0.9 + 1.56) *
              (1.64 + forwardScatter * 1.22) *
              mix(0.88, 2.26, hotPocket) *
              crackMask;
            let topFade = 1.0 - smoothstep(0.88, 0.995, uvw.y);

            // stepDistance in world units for opacity integral
            let stepDistance = worldDelta * mix(1.08, 0.76, contributionWeight);
            voxStep = voxDelta * mix(1.08, 0.76, contributionWeight);

            let smokeMass = detailedDensity * (1.24 + cloudDetail * 0.54 + coolingPocket * 0.18);
            let smokeOpacity = (1.0 - exp(-smokeMass * stepDistance * 3.1)) * topFade;
            let coreOcclusion = exp(-smokeMass * mix(1.45, 0.52, hotPocket));
            let heatBloom = clamp(localHotSoot * 0.72 + fireWindow * 0.34 + hotGas * 0.18, 0.0, 1.0);
            let heatReach = 1.0 - exp(-smokeMass * mix(0.82, 0.38, hotPocket));
            let smokeLightCoupling = clamp(
              heatReach * (2.1 + detailedDensity * 2.45 + localHotSoot * 1.04 + (1.0 - lightTransmission) * 1.82),
              0.0,
              6.2,
            );
            let coreSmokeLight = coreRadiance * smokeLightCoupling;
            let directCoreLeak = coreRadiance * coreOcclusion * coreVisibility *
              smoothstep(0.0, 0.22, 1.0 - detailedDensity) *
              mix(0.05, 0.18, fireWindow);

            var compositeColor = heatedSmoke + coreSmokeLight + directCoreLeak;
            var opacity = max(smokeOpacity, detailedDensity * 0.08 * topFade);

            let fireAlpha = 1.0 - exp(-hotGas * (fuel + reaction * 0.22 + 0.12) * stepDistance * mix(4.0, 7.0, hotPocket));
            opacity = max(opacity, fireAlpha * 0.05 * topFade * mix(0.28, 0.56, coreVisibility));

            if (camera.renderMode.x < 0.5) {
              let directCoreGlow = smoothstep(0.06, 0.58, hotGas + fuel * 0.12 + reaction * 0.1) *
                (1.0 - smoothstep(0.18, 0.8, detailedDensity)) *
                mix(0.44, 0.92, hotPocket) * coreVisibility;
              let hotSmokeGlow = localHotSoot * 0.74;

              compositeColor = mix(
                heatedSmoke + coreSmokeLight,
                heatedSmoke + coreSmokeLight + emberColor * (hotSmokeGlow + directCoreGlow * 0.92) + directCoreLeak,
                clamp(heatBloom * 1.28 + directCoreGlow * 0.22, 0.0, 0.82),
              );
              opacity = max(opacity, smokeOpacity * mix(1.0, 1.12, heatBloom));
            }

            if (camera.renderMode.x > 0.5 && camera.renderMode.x < 1.5) {
              compositeColor = mix(
                vec3<f32>(0.01, 0.01, 0.012),
                vec3<f32>(0.86, 0.88, 0.92),
                clamp(detailedDensity * 1.3, 0.0, 1.0),
              );
              opacity = 1.0 - exp(-detailedDensity * stepDistance * 10.5);
            } else if (camera.renderMode.x >= 1.5) {
              compositeColor = mix(
                vec3<f32>(0.03, 0.01, 0.0),
                vec3<f32>(1.0, 0.72, 0.22),
                clamp(fuel * 1.25, 0.0, 1.0),
              );
              opacity = 1.0 - exp(-fuel * stepDistance * 9.0);
            }

            accumulatedColor += (1.0 - accumulatedAlpha) * compositeColor * opacity;
            accumulatedAlpha += (1.0 - accumulatedAlpha) * opacity;
            }
          } else {
            voxStep = voxDelta * 1.35;
          }
        } else {
          // Inactive brick — jump to next brick boundary in voxel space (exact, no conversion)
          voxStep = max(voxelDistToNextBrick(samplePosition, voxRayDir), voxDelta);
        }

        // voxStep is in voxel-distance units; normalize voxRayDir to advance correctly
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
