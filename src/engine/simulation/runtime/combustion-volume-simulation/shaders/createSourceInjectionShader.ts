import { WORKGROUP_SIZE } from '../constants'

export function createSourceInjectionShader() {
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
    @group(0) @binding(2) var<storage, read_write> temperatureField: array<f32>;
    @group(0) @binding(3) var<storage, read_write> fuelField: array<f32>;

    fn flatten(coord: vec3<u32>) -> u32 {
      return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
    }

    fn clamp01(value: f32) -> f32 {
      return clamp(value, 0.0, 1.0);
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let normalized = (vec3<f32>(id) + vec3<f32>(0.5)) /
        vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));
      let index = flatten(id);
      let baseRadius = 0.11;
      let emitterHeight = 0.14;
      let localXZ = normalized.xz - vec2<f32>(0.5, 0.5);
      let radialMask = 1.0 - smoothstep(baseRadius * 0.75, baseRadius, length(localXZ));
      let verticalMask = 1.0 - smoothstep(0.0, emitterHeight, normalized.y);
      let emitterMask = radialMask * verticalMask;

      if (emitterMask <= 0.0) {
        return;
      }

      let dt = params.deltaTime;
      let injectedFuel = emitterMask * dt * 1.9;
      let injectedTemperature = emitterMask * dt * 2.6;

      fuelField[index] = clamp01(fuelField[index] + injectedFuel);
      temperatureField[index] = clamp01(temperatureField[index] + injectedTemperature);
    }
  `
}
