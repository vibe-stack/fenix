import { WORKGROUP_SIZE } from '../constants'

const TURBULENCE_DECAY = 0.2
const TURBULENCE_FROM_BURN = 8

export function createCombustionShader() {
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

      let index = flatten(id);
      let dt = params.deltaTime;
      let normalizedY = (f32(id.y) + 0.5) / f32(volumeInfo.height);

      var density = densityField[index];
      var temperature = temperatureField[index];
      var fuel = fuelField[index];
      var reaction = turbulenceField[index];

      let ignition = smoothstep(0.1, 0.55, temperature);
      let availableFuel = fuel * ignition;
      let burn = min(fuel, availableFuel * dt * 2.4);
      let smokeYield = burn * (0.24 + 0.16 * (1.0 - ignition));
      let heatLoss = dt * (0.08 + normalizedY * 0.22);

      fuel = clamp01(fuel - burn);
      temperature = clamp01(temperature + burn * 1.85 - heatLoss);
      density = clamp01(max(0.0, density + smokeYield - dt * density * (0.025 + normalizedY * 0.08)));
      reaction = clamp01(max(reaction * (1.0 - dt * ${TURBULENCE_DECAY}), burn * ${TURBULENCE_FROM_BURN}));

      densityField[index] = density;
      temperatureField[index] = temperature;
      fuelField[index] = fuel;
      turbulenceField[index] = reaction;
    }
  `
}
