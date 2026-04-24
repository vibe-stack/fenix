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

fn localHotGas(coord: vec3<u32>) -> f32 {
  let sampleCoord = clampCoord(coord);
  let index = flatten(sampleCoord);
  return clamp(temperatureField[index] * 1.55 + fuelField[index] * 0.26 + reactionField[index] * 0.44, 0.0, 1.0);
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
  let neighborHeat = (
    localHotGas(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)) +
    localHotGas(vec3<u32>(dec(id.x), id.y, id.z)) +
    localHotGas(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)) +
    localHotGas(vec3<u32>(id.x, dec(id.y), id.z)) +
    localHotGas(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))) +
    localHotGas(vec3<u32>(id.x, id.y, dec(id.z)))
  ) * 0.16666667;
  let localHeatBefore = localHotGas(id);
  let radiativeGain = max(neighborHeat - localHeatBefore * 0.55, 0.0) *
    smoothstep(0.04, 0.76, densityField[index]) *
    (0.45 + (1.0 - cluster) * 0.55) *
    dt * 2.6;
  let hotPocket = smoothstep(0.58, 0.92, cluster + reactionField[index] * 0.22);
  let coolingPocket = smoothstep(0.42, 0.82, 1.0 - cluster) *
    smoothstep(0.08, 0.68, densityField[index]) *
    (1.0 - smoothstep(0.54, 0.94, reactionField[index]));
  let ignition = smoothstep(0.1, 0.55, temperatureField[index]);
  let burn = min(fuelField[index], fuelField[index] * ignition * dt * mix(4.2, 8.6, hotPocket));
  let hotSoot = smoothstep(0.24, 0.88, temperatureField[index] + reactionField[index] * 0.2) *
    smoothstep(0.36, 0.9, 1.0 - cluster + densityField[index] * 0.18);
  let smokeYield = burn * mix(0.16, 0.58, coolingPocket + (1.0 - ignition) * 0.5 + hotSoot * 0.45);
  let hotCooling = mix(1.3, 0.62, hotPocket);
  let heatLoss = dt * (0.018 + normalizedY * 0.052) * hotCooling *
    mix(1.0, 2.25, coolingPocket);
  let densityLoss = dt * densityField[index] * (0.02 + normalizedY * 0.07);
  let thermalClearing = densityField[index] *
    smoothstep(0.18, 0.82, temperatureField[index] + reactionField[index] * 0.22 + fuelField[index] * 0.1) *
    dt *
    mix(0.55, 2.45, hotPocket);
  let coolingSmoke = densityField[index] * temperatureField[index] * (coolingPocket + hotSoot * 0.32) * dt * 0.16;
  let reactionDecay = reactionField[index] * (1.0 - dt * mix(0.68, 0.22, hotPocket));

  fuelField[index] = clamp01(fuelField[index] - burn);
  temperatureField[index] = clamp01(temperatureField[index] + burn * mix(2.1, 3.25, hotPocket) + radiativeGain - heatLoss);
  densityField[index] = clamp01(max(0.0, densityField[index] + smokeYield + coolingSmoke - densityLoss - thermalClearing * 0.72));
  reactionField[index] = clamp01(max(reactionDecay, burn * mix(4.0, 7.5, hotPocket) + radiativeGain * 1.8));
}
`,
  ])
}
