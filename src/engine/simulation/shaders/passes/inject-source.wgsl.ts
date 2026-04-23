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
  let duration = max(blastSource.timing.y, 0.001);
  let normalizedAge = clamp(age / duration, 0.0, 1.0);
  let pulseGate = step(0.0, age) * step(age, duration);
  let attack = smoothstep(0.0, 0.12, normalizedAge);
  let decay = exp(-max(normalizedAge - 0.08, 0.0) * 2.35);
  return pulseGate * attack * decay;
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
    let radius = blastSource.positionRadius.w;
    let offset = normalized - blastSource.positionRadius.xyz;
    let distanceRatio = length(offset / vec3<f32>(1.0, 0.82, 1.0)) / max(radius, 0.001);
    let core = exp(-distanceRatio * distanceRatio * 3.5) * sourcePulse(blastSource);

    if (core > 0.0001) {
      let age = params.time - blastSource.timing.x;
      let normalizedAge = clamp(age / max(blastSource.timing.y, 0.001), 0.0, 1.0);
      let hotFlash = core * (1.0 - smoothstep(0.22, 0.95, normalizedAge));
      let smokeRelease = core * smoothstep(0.14, 0.82, normalizedAge);
      let shock = exp(-abs(distanceRatio - 0.84) * 10.0) * core;
      let direction = normalize(offset + vec3<f32>(0.0, 0.12, 0.0));
      let heatVent = smoothstep(9.0, 20.0, blastSource.yields.y) * core;
      density = clamp01(max(0.0, density - heatVent * params.deltaTime * 3.2) +
        smokeRelease * blastSource.yields.x * params.deltaTime);
      temperature = clamp01(temperature + (core * 0.42 + hotFlash * 1.08) * blastSource.yields.y * params.deltaTime);
      fuel = clamp01(fuel + (core * 0.35 + hotFlash * 0.9) * blastSource.yields.z * params.deltaTime);
      reaction = clamp01(max(reaction, max(core * 0.35, hotFlash) * blastSource.yields.w));
      velocity += direction * shock * blastSource.impulse.x * params.deltaTime;
      velocity.y += core * blastSource.impulse.y * params.deltaTime;
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
