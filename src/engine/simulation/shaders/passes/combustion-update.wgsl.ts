import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ActiveBrickMaskWGSL } from '../common/active-brick-mask.wgsl'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createCombustionUpdateShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    ActiveBrickMaskWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read_write> densityField: array<f32>;
@group(0) @binding(3) var<storage, read_write> temperatureField: array<f32>;
@group(0) @binding(4) var<storage, read_write> fuelField: array<f32>;
@group(0) @binding(5) var<storage, read_write> reactionField: array<f32>;
@group(0) @binding(6) var<storage, read> activeBrickFlags: array<u32>;
@group(0) @binding(7) var<uniform> brickInfo: BrickInfo;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
fn thermalCluster(coord: vec3<f32>, time: f32) -> f32 {
  let p = coord + vec3<f32>(time * 2.2, time * 5.2, -time * 1.7);
  let body = 0.5 + 0.5 * sin(dot(p, vec3<f32>(0.071, 0.093, -0.064)) + sin(p.y * 0.057) * 1.8);
  let pocket = 0.5 + 0.5 * sin(dot(p, vec3<f32>(0.143, -0.081, 0.119)) + sin(p.x * 0.11 + p.z * 0.07) * 1.2);
  let rising = 0.5 + 0.5 * sin(p.x * 0.18 + p.y * 0.13 - p.z * 0.16 + time * 1.4);

  return clamp(body * 0.46 + pocket * 0.34 + rising * 0.2, 0.0, 1.0);
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  if (!isActiveCoord(id)) {
    return;
  }

  let index = flatten(id);
  let dt = params.deltaTime;
  let normalizedY = (f32(id.y) + 0.5) / f32(volumeInfo.height);
  let cluster = thermalCluster(vec3<f32>(id), params.time);
  let hotPocket = smoothstep(0.58, 0.92, cluster + reactionField[index] * 0.22);
  let coolingPocket = smoothstep(0.42, 0.82, 1.0 - cluster) *
    smoothstep(0.08, 0.68, densityField[index]) *
    (1.0 - smoothstep(0.54, 0.94, reactionField[index]));
  let ignition = smoothstep(0.1, 0.55, temperatureField[index]);
  let burn = min(fuelField[index], fuelField[index] * ignition * dt * mix(2.6, 5.4, hotPocket));
  let smokeYield = burn * mix(0.08, 0.42, coolingPocket + (1.0 - ignition) * 0.45);
  let heatLoss = dt * (0.012 + normalizedY * 0.042) * mix(1.55, 0.34, hotPocket) *
    mix(1.0, 1.85, coolingPocket);
  let densityLoss = dt * densityField[index] * (0.02 + normalizedY * 0.07);
  let coolingSmoke = densityField[index] * temperatureField[index] * coolingPocket * dt * 0.18;
  let reactionDecay = reactionField[index] * (1.0 - dt * mix(0.32, 0.08, hotPocket));

  fuelField[index] = clamp01(fuelField[index] - burn);
  temperatureField[index] = clamp01(temperatureField[index] + burn * mix(2.8, 4.2, hotPocket) - heatLoss);
  densityField[index] = clamp01(max(0.0, densityField[index] + smokeYield + coolingSmoke - densityLoss));
  reactionField[index] = clamp01(max(reactionDecay, burn * mix(7.0, 12.0, hotPocket)));
}
`,
  ])
}
