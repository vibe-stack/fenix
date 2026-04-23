import { WORKGROUP_SIZE } from '../constants'

const TURBULENCE_LATERAL_FORCE = 12.35

export function createBuoyancyShader() {
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
    @group(0) @binding(2) var<storage, read> densityField: array<f32>;
    @group(0) @binding(3) var<storage, read> temperatureField: array<f32>;
    @group(0) @binding(4) var<storage, read_write> velocityField: array<vec4<f32>>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn swirlNoise(position: vec3<f32>, time: f32) -> vec2<f32> {
      let angleA = position.x * 10.7 + position.y * 6.1 + position.z * 8.3 + time * 1.9;
      let angleB = position.x * -8.9 + position.y * 7.4 + position.z * 9.7 - time * 1.6;
      return vec2<f32>(sin(angleA) + 0.5 * cos(angleB), cos(angleA * 0.8) - 0.5 * sin(angleB * 1.1));
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = flatten(id);
      var velocity = velocityField[index].xyz;
      let temperature = temperatureField[index];
      let density = densityField[index];
      let dt = params.deltaTime;
      let buoyancy = max(0.0, temperature * 3.6 - density * 0.55);
      let normalized = (vec3<f32>(id) + vec3<f32>(0.5)) /
        vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));
      let centerOffset = normalized.xz - vec2<f32>(0.5, 0.5);
      let radialDistance = length(centerOffset);
      let plumeMask = (1.0 - smoothstep(0.08, 0.34, radialDistance)) *
        (1.0 - smoothstep(0.0, 0.65, normalized.y));
      let swirl = swirlNoise(normalized, params.time) * (buoyancy * dt * ${TURBULENCE_LATERAL_FORCE} * plumeMask);

      velocity *= 1.0 - dt * 0.08;
      velocity.x += swirl.x;
      velocity.y = clamp(velocity.y + buoyancy * dt, -2.0, 8.0);
      velocity.z += swirl.y;

      if (id.x == 0u || id.x == volumeInfo.width - 1u || id.z == 0u || id.z == volumeInfo.depth - 1u) {
        velocity.x = 0.0;
        velocity.z = 0.0;
      }
      if (id.y == 0u) {
        velocity.y = max(velocity.y, 0.0);
      }

      velocityField[index] = vec4<f32>(velocity, 0.0);
    }
  `
}
