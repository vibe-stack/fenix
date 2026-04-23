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
  const volumeScale = 8
  const maxHorizontalResolution = Math.max(resolution.width, resolution.depth)
  const volumeHalfExtents = {
    x: 2.05 * volumeScale * (resolution.width / maxHorizontalResolution),
    y: 2.05 * volumeScale * (resolution.height / maxHorizontalResolution),
    z: 2.05 * volumeScale * (resolution.depth / maxHorizontalResolution),
  }
  const volumeCenterY = volumeHalfExtents.y - 0.25
  const stepCount = 80
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

    const bindGroup = device.createBindGroup({
      label: `${buffers.density.label ?? 'density'}-raymarch-bind-group`,
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: cameraBuffer } },
        { binding: 1, resource: { buffer: resolutionBuffer } },
        { binding: 2, resource: { buffer: buffers.density } },
        { binding: 3, resource: { buffer: buffers.temperature } },
        { binding: 4, resource: { buffer: buffers.fuel } },
        { binding: 5, resource: { buffer: buffers.turbulence } },
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

    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
    }

    @group(0) @binding(0) var<uniform> camera: CameraData;
    @group(0) @binding(1) var<uniform> resolution: ResolutionData;
    @group(0) @binding(2) var<storage, read> densityField: array<f32>;
    @group(0) @binding(3) var<storage, read> temperatureField: array<f32>;
    @group(0) @binding(4) var<storage, read> fuelField: array<f32>;
    @group(0) @binding(5) var<storage, read> turbulenceField: array<f32>;

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

    fn readTurbulence(coord: vec3<u32>) -> f32 {
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
      return turbulenceField[flatten(clamped)];
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

    fn densityGradient(position: vec3<f32>) -> vec3<f32> {
      let offset = vec3<f32>(1.35, 1.35, 1.35);
      let dx = sampleDensity(position + vec3<f32>(offset.x, 0.0, 0.0)) - sampleDensity(position - vec3<f32>(offset.x, 0.0, 0.0));
      let dy = sampleDensity(position + vec3<f32>(0.0, offset.y, 0.0)) - sampleDensity(position - vec3<f32>(0.0, offset.y, 0.0));
      let dz = sampleDensity(position + vec3<f32>(0.0, 0.0, offset.z)) - sampleDensity(position - vec3<f32>(0.0, 0.0, offset.z));
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

    fn sampleTurbulence(position: vec3<f32>) -> f32 {
      let dimensions = vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0);
      let clamped = clamp(position, vec3<f32>(0.0), dimensions);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(dimensions));
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
      let ember = vec3<f32>(0.12, 0.02, 0.0);
      let red = vec3<f32>(0.88, 0.12, 0.016);
      let orange = vec3<f32>(1.0, 0.46, 0.055);
      let whiteHot = vec3<f32>(1.0, 0.82, 0.5);
      let redMix = smoothstep(0.02, 0.18, temperature);
      let orangeMix = smoothstep(0.14, 0.5, temperature);
      let whiteMix = smoothstep(0.72, 0.98, temperature);
      return mix(mix(mix(ember, red, redMix), orange, orangeMix), whiteHot, whiteMix);
    }

    fn smokePalette(density: f32, temperature: f32) -> vec3<f32> {
      let warmTint = clamp(temperature * 0.42, 0.0, 1.0);
      return mix(
        vec3<f32>(0.14, 0.145, 0.16),
        vec3<f32>(0.58, 0.54, 0.5) + warmTint * vec3<f32>(0.2, 0.11, 0.045),
        clamp(density * 0.72 + temperature * 0.28, 0.0, 1.0),
      );
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
      let lightDirection = normalize(vec3<f32>(-0.35, 0.82, 0.28));
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
          let density = max(sampleDensity(samplePosition) - 0.005, 0.0);

          if (density > 0.001) {
            let temperature = sampleTemperature(samplePosition);
            let fuel = sampleFuel(samplePosition);
            let turbulence = sampleTurbulence(samplePosition);
            let densityGrad = densityGradient(samplePosition);
            let gradLength = max(length(densityGrad), 0.0001);
            let smokeNormal = -densityGrad / gradLength;
            let diffuseLight = clamp(dot(smokeNormal, lightDirection) * 0.5 + 0.5, 0.0, 1.0);
            let rimLight = pow(1.0 - clamp(dot(smokeNormal, -rayDirection), 0.0, 1.0), 2.0);
            let heightAmbient = smoothstep(0.02, 0.95, uvw.y);
            let lightProbePosition = clamp(uvw + lightDirection * 0.03, vec3<f32>(0.0), vec3<f32>(1.0));
            let shadowProbe = sampleDensity(lightProbePosition * (vec3<f32>(resolution.width, resolution.height, resolution.depth) - vec3<f32>(1.0)));
            let lightTransmission = 1.0 - clamp(shadowProbe * 0.34, 0.0, 0.52);
            let forwardScatter = pow(clamp(dot(-rayDirection, lightDirection), 0.0, 1.0), 1.2) * 0.48 + 0.46;
            let smokeBase = smokePalette(density, temperature);
            let ambientLight = vec3<f32>(0.62, 0.67, 0.74) * (0.34 + heightAmbient * 0.38);
            let coolRim = vec3<f32>(0.38, 0.46, 0.56) * rimLight * (0.18 + turbulence * 0.18);
            let warmRim = vec3<f32>(1.0, 0.54, 0.2) * rimLight * (0.05 + temperature * 0.16);
            let smokeColor = smokeBase * (0.56 + lightTransmission * 0.28 + diffuseLight * 0.34) + ambientLight * density * 0.72 + coolRim + warmRim * 0.35;
            let fireColor = firePalette(temperature);
            let emissive = fireColor * (temperature * (fuel * 1.65 + 0.92)) * (turbulence * 0.32 + 0.72);
            let flameMix = clamp(temperature * 0.95 + fuel * 0.12 + turbulence * 0.04, 0.0, 0.52);
            let fireAlpha = 1.0 - exp(-temperature * (fuel + 0.06) * delta * 2.6);
            var compositeColor = mix(smokeColor, emissive, flameMix);
            // Taper opacity near the top so smoke exits gracefully rather than hitting a wall
            let topFade = 1.0 - smoothstep(0.72, 0.98, uvw.y);
            var opacity = (1.0 - exp(-density * delta * (1.1 + turbulence * 0.22) * 4.4)) * topFade;

            compositeColor += emissive * (forwardScatter * 0.22 + rimLight * 0.04);
            opacity = max(opacity, fireAlpha * 0.12 * topFade);

            if (camera.renderMode.x < 0.5) {
              let temperatureColor = firePalette(clamp(temperature * 0.88 + fuel * 0.16, 0.0, 1.0));
              compositeColor = mix(smokeColor * 0.45, temperatureColor, clamp(temperature * 1.1 + fuel * 0.18, 0.0, 1.0));
              compositeColor += temperatureColor * forwardScatter * 0.18;
            }

            if (camera.renderMode.x > 0.5 && camera.renderMode.x < 1.5) {
              compositeColor = mix(
                vec3<f32>(0.01, 0.01, 0.012),
                vec3<f32>(0.86, 0.88, 0.92),
                clamp(density * 1.3, 0.0, 1.0),
              );
              opacity = 1.0 - exp(-density * delta * 10.5);
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
