import { WORKGROUP_SIZE } from '../constants'

export function createVelocityAdvectionShader() {
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
      let advectedVelocity = sampleVelocity(backPosition - vec3<f32>(0.5)) * (1.0 - params.deltaTime * 0.08);

      velocityTarget[index] = vec4<f32>(advectedVelocity, 0.0);
    }
  `
}
