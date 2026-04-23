import { WORKGROUP_SIZE } from '../constants'

const TURBULENCE_ADVECT_DECAY = 4.35

export function createScalarAdvectionShader() {
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

    fn readReaction(coord: vec3<u32>) -> f32 {
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

    fn sampleReaction(position: vec3<f32>) -> f32 {
      let maxPosition = vec3<f32>(vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
      let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
      let base = vec3<u32>(floor(clamped));
      let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
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

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      if (id.x >= volumeInfo.width || id.y >= volumeInfo.height || id.z >= volumeInfo.depth) {
        return;
      }

      let index = flatten(id);
      let coord = vec3<f32>(id) + vec3<f32>(0.5);
      let normalizedY = (f32(id.y) + 0.5) / f32(volumeInfo.height);
      let backPosition = coord - sampleVelocity(coord - vec3<f32>(0.5)) * params.deltaTime;
      let samplePosition = backPosition - vec3<f32>(0.5);

      let density = sampleDensity(samplePosition);
      let temperature = sampleTemperature(samplePosition);
      let fuel = sampleFuel(samplePosition);
      let reaction = sampleReaction(samplePosition);
      let cooling = params.deltaTime * (0.04 + normalizedY * 0.14);
      let smokeLoss = params.deltaTime * (0.015 + normalizedY * 0.05);

      densityTarget[index] = clamp01(max(0.0, density - density * smokeLoss));
      temperatureTarget[index] = clamp01(max(0.0, temperature - cooling));
      fuelTarget[index] = clamp01(max(0.0, fuel - params.deltaTime * 0.025));
      turbulenceTarget[index] = clamp01(max(0.0, reaction - params.deltaTime * ${TURBULENCE_ADVECT_DECAY}));
    }
  `
}
