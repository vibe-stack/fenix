import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createCombustionUpdateShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read_write> densityField: array<f32>;
@group(0) @binding(3) var<storage, read_write> temperatureField: array<f32>;
@group(0) @binding(4) var<storage, read_write> fuelField: array<f32>;
@group(0) @binding(5) var<storage, read_write> reactionField: array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  let dt = params.deltaTime;
  let normalizedY = (f32(id.y) + 0.5) / f32(volumeInfo.height);
  let ignition = smoothstep(0.1, 0.55, temperatureField[index]);
  let burn = min(fuelField[index], fuelField[index] * ignition * dt * 2.4);
  let smokeYield = burn * (0.24 + 0.16 * (1.0 - ignition));
  let heatLoss = dt * (0.025 + normalizedY * 0.075);
  let densityLoss = dt * densityField[index] * (0.025 + normalizedY * 0.08);
  let reactionDecay = reactionField[index] * (1.0 - dt * 0.2);

  fuelField[index] = clamp01(fuelField[index] - burn);
  temperatureField[index] = clamp01(temperatureField[index] + burn * 2.35 - heatLoss);
  densityField[index] = clamp01(max(0.0, densityField[index] + smokeYield - densityLoss));
  reactionField[index] = clamp01(max(reactionDecay, burn * 8.0));
}
`,
  ])
}
