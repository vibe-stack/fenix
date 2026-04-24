import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createInjectSourceShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;

struct ExplosionSource {
  positionRadius: vec4<f32>,
  timing: vec4<f32>,
  yields: vec4<f32>,
  impulse: vec4<f32>,
  shape: vec4<f32>,
  random: vec4<f32>,
}

@group(0) @binding(2) var<storage, read> explosionSources: array<ExplosionSource>;
@group(0) @binding(3) var<storage, read_write> densityField: array<f32>;
@group(0) @binding(4) var<storage, read_write> temperatureField: array<f32>;
@group(0) @binding(5) var<storage, read_write> fuelField: array<f32>;
@group(0) @binding(6) var<storage, read_write> reactionField: array<f32>;
@group(0) @binding(7) var<storage, read_write> velocityField: array<vec4<f32>>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
fn sourcePulse(blastSource: ExplosionSource) -> f32 {
  let age = params.time - blastSource.timing.x;
  let duration = max(blastSource.timing.y + blastSource.timing.z + blastSource.timing.w, 0.001);
  let normalizedAge = clamp(age / duration, 0.0, 1.0);
  let pulseGate = step(0.0, age) * step(age, duration);
  let attack = smoothstep(0.0, 0.12, normalizedAge);
  let decay = exp(-max(normalizedAge - 0.08, 0.0) * 1.85);
  return pulseGate * attack * decay;
}

fn hash31(p: vec3<f32>) -> f32 {
  return fract(sin(dot(p, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453123);
}

fn valueNoise(p: vec3<f32>) -> f32 {
  let cell = floor(p);
  let local = fract(p);
  let u = local * local * (3.0 - 2.0 * local);
  let c000 = hash31(cell + vec3<f32>(0.0, 0.0, 0.0));
  let c100 = hash31(cell + vec3<f32>(1.0, 0.0, 0.0));
  let c010 = hash31(cell + vec3<f32>(0.0, 1.0, 0.0));
  let c110 = hash31(cell + vec3<f32>(1.0, 1.0, 0.0));
  let c001 = hash31(cell + vec3<f32>(0.0, 0.0, 1.0));
  let c101 = hash31(cell + vec3<f32>(1.0, 0.0, 1.0));
  let c011 = hash31(cell + vec3<f32>(0.0, 1.0, 1.0));
  let c111 = hash31(cell + vec3<f32>(1.0, 1.0, 1.0));
  let x00 = mix(c000, c100, u.x);
  let x10 = mix(c010, c110, u.x);
  let x01 = mix(c001, c101, u.x);
  let x11 = mix(c011, c111, u.x);
  let y0 = mix(x00, x10, u.y);
  let y1 = mix(x01, x11, u.y);
  return mix(y0, y1, u.z);
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  let normalized = (vec3<f32>(id) + vec3<f32>(0.5)) /
    vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));
  var density = densityField[index];
  var temperature = temperatureField[index];
  var fuel = fuelField[index];
  var reaction = reactionField[index];
  var velocity = velocityField[index].xyz;

  for (var sourceIndex = 0u; sourceIndex < arrayLength(&explosionSources); sourceIndex += 1u) {
    let blastSource = explosionSources[sourceIndex];
    let age = params.time - blastSource.timing.x;
    let smokeLeadTime = max(blastSource.timing.y, 0.0);
    let blastDuration = max(blastSource.timing.z, 0.001);
    let plumeDuration = max(blastSource.timing.w, 0.001);
    let totalDuration = smokeLeadTime + blastDuration + plumeDuration;
    let ignitionAge = age - smokeLeadTime;
    let blastAge = clamp(ignitionAge / blastDuration, 0.0, 1.0);
    let plumeAge = clamp((ignitionAge - blastDuration) / plumeDuration, 0.0, 1.0);
    let preSmokeGate = step(0.0, age) * step(age, smokeLeadTime);
    let blastGate = step(0.0, ignitionAge) * step(ignitionAge, blastDuration);
    let plumeGate = step(0.0, ignitionAge - blastDuration) * step(age, totalDuration);
    let normalizedAge = clamp(age / max(totalDuration, 0.001), 0.0, 1.0);
    let radius = blastSource.positionRadius.w;
    let smokeExpansion = smoothstep(0.0, 1.0, clamp(age / max(smokeLeadTime, 0.001), 0.0, 1.0));
    let blastExpansion = smoothstep(0.0, 0.78, blastAge);
    let plumeExpansion = smoothstep(0.0, 1.0, plumeAge);
    let expansion = clamp(max(smokeExpansion * 0.48, max(blastExpansion, plumeExpansion * 0.92)), 0.0, 1.0);
    let effectiveRadius = radius * mix(0.2, 1.08, expansion);
    let offset = normalized - blastSource.positionRadius.xyz;
    let distanceRatio = length(offset / vec3<f32>(1.0, 0.82, 1.0)) / max(effectiveRadius, 0.001);
    let pulse = sourcePulse(blastSource);
    let core = exp(-distanceRatio * distanceRatio * mix(5.2, 2.8, expansion)) * pulse;

    if (core > 0.0001) {
      let patchScale = max(blastSource.shape.x, 1.0);
      let thermalNoise = valueNoise(normalized * patchScale + vec3<f32>(blastSource.random.x, params.time * 0.8, -blastSource.random.x * 0.37));
      let detailNoise = valueNoise(normalized * patchScale * 2.25 + vec3<f32>(-params.time * 1.3, blastSource.random.x * 0.71, params.time * 0.55));
      let plumeNoisePosition = vec3<f32>(
        normalized.x * patchScale * 0.9,
        normalized.y * patchScale * 0.28 - params.time * 1.8,
        normalized.z * patchScale * 0.9,
      );
      let plumeNoise = valueNoise(plumeNoisePosition + vec3<f32>(blastSource.random.x * 0.23, params.time * 0.36, -blastSource.random.x * 0.41));
      let plumeDetail = valueNoise(plumeNoisePosition * 2.15 + vec3<f32>(params.time * 0.52, -blastSource.random.x * 0.17, params.time * 0.21));
      let heatPatchiness = clamp(blastSource.shape.w, 0.0, 1.0);
      let heatMask = mix(1.0, smoothstep(0.28, 0.94, thermalNoise * 0.72 + detailNoise * 0.28), heatPatchiness);
      let plumeHeatMask = mix(
        1.0,
        smoothstep(0.24, 0.9, plumeNoise * 0.68 + plumeDetail * 0.32),
        heatPatchiness,
      );
      let smokeMask = mix(0.82, 1.36, 1.0 - heatMask) * mix(0.84, 1.22, detailNoise);
      let flashPulse = blastGate * sin(blastAge * 3.14159265);
      let hotFlash = core * flashPulse * heatMask;
      let shellRadius = mix(0.36, 1.02, blastExpansion);
      let shock = exp(-abs(distanceRatio - shellRadius) * 13.5) * flashPulse * mix(0.55, 1.15, detailNoise);
      let smokeShell = smoothstep(0.18, 0.92, distanceRatio) *
        (1.0 - smoothstep(1.08, 1.62, distanceRatio));
      let plumeSmokeShell = smoothstep(0.28, 0.86, distanceRatio) *
        (1.0 - smoothstep(1.0, 1.52, distanceRatio));
      let hotClear = smoothstep(0.12, 0.82, hotFlash + heatMask * flashPulse * 0.45);
      let preSmoke = core * preSmokeGate * smokeShell * smokeMask * mix(0.12, 0.64, smokeExpansion);
      let direction = (offset + vec3<f32>(0.0, 0.12, 0.0)) / max(length(offset + vec3<f32>(0.0, 0.12, 0.0)), 0.0001);
      let horizontalRatio = length(offset.xz) / max(effectiveRadius, 0.001);
      let updraftCore = exp(-horizontalRatio * horizontalRatio * 18.0) *
        smoothstep(-0.12, 0.55, offset.y / max(radius, 0.001)) *
        (1.0 - smoothstep(0.42, 1.0, distanceRatio)) *
        plumeHeatMask *
        (blastGate * smoothstep(0.18, 0.75, blastAge) * 0.5 + plumeGate * exp(-plumeAge * 3.0));
      let plumeSootMask = smoothstep(0.38, 0.94, 1.0 - plumeHeatMask + plumeDetail * 0.28);
      let sootInCore = updraftCore * plumeSootMask *
        (blastGate * smoothstep(0.2, 0.82, blastAge) + plumeGate * exp(-plumeAge * 2.2));
      let coolingSmoke = core *
        (blastGate * smoothstep(0.12, 0.78, blastAge) * smokeShell +
          plumeGate * (1.0 - plumeAge * 0.45) * plumeSmokeShell) *
        smokeMask *
        (1.0 - hotClear * 0.56);
      let smokeRelease = max(preSmoke * (1.0 - hotClear * 0.45), coolingSmoke * 0.82) +
        sootInCore * smokeMask * 0.24;
      let radialPatch = smoothstep(0.42, 0.98, detailNoise) * shock;
      let crumblePocket = smoothstep(0.42, 0.92, 1.0 - heatMask + detailNoise * 0.22) *
        core *
        (blastGate * smoothstep(0.18, 0.7, blastAge) + plumeGate * exp(-plumeAge * 2.6));
      let curlKick = normalize(vec3<f32>(
        thermalNoise - 0.5,
        detailNoise - thermalNoise,
        0.5 - detailNoise,
      ) + vec3<f32>(0.0001));
      let heatVent = smoothstep(5.0, 15.0, blastSource.yields.y) *
        (hotFlash * 1.35 + updraftCore * 0.28) *
        (0.45 + heatMask * 0.55);
      density = clamp01(max(0.0, density - heatVent * params.deltaTime * 7.2) +
        smokeRelease * blastSource.yields.x * params.deltaTime);
      temperature = clamp01(temperature + (hotFlash * 1.18 + updraftCore * blastSource.shape.y * 0.08) *
        blastSource.yields.y * params.deltaTime);
      fuel = clamp01(fuel + (hotFlash * 0.92 + updraftCore * 0.24 + core * plumeGate * (1.0 - plumeAge) * plumeHeatMask * 0.28) *
        blastSource.yields.z * params.deltaTime);
      reaction = clamp01(max(reaction, max(hotFlash, updraftCore * 0.34) * blastSource.yields.w));
      velocity += direction * shock * blastSource.impulse.x * params.deltaTime;
      velocity += curlKick * (radialPatch * blastSource.impulse.z + crumblePocket * blastSource.impulse.w) * params.deltaTime;
      velocity += curlKick * updraftCore * (1.0 - plumeHeatMask) * blastSource.impulse.w * params.deltaTime * 0.32;
      velocity += direction * coolingSmoke * blastSource.impulse.x * params.deltaTime * 0.18;
      velocity += params.wind.xyz * coolingSmoke * params.wind.w * params.deltaTime * 0.9;
      velocity.y += (core * blastSource.impulse.y * (flashPulse * 0.32 + plumeGate * (1.0 - plumeAge) * 0.36) +
        updraftCore * blastSource.shape.z * 0.42 + coolingSmoke * blastSource.impulse.y * 0.22) * params.deltaTime;
    }
  }

  densityField[index] = density;
  temperatureField[index] = temperature;
  fuelField[index] = fuel;
  reactionField[index] = reaction;
  velocityField[index] = vec4<f32>(clamp(velocity, vec3<f32>(-10.0), vec3<f32>(10.0)), 0.0);
}
`,
  ])
}
