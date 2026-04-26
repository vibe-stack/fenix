import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'
import {
  EmitterSourceStructWGSL,
  EmitterEnvelopeWGSL,
  EmitterNoiseWGSL,
} from './inject-source-common.wgsl'

export function createInjectIgniterShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
`,
    EmitterSourceStructWGSL,
    /* wgsl */ `
@group(0) @binding(3) var<storage, read_write> reactionField:    array<f32>;
@group(0) @binding(4) var<storage, read_write> temperatureField: array<f32>;
@group(0) @binding(5) var<storage, read> fuelField: array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    EmitterNoiseWGSL,
    EmitterEnvelopeWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) { return; }

  let index = flatten(id);
  let pos   = (vec3<f32>(id) + vec3<f32>(0.5)) /
              vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));

  var reaction    = reactionField[index];
  var temperature = temperatureField[index];

  for (var i = 0u; i < arrayLength(&emitterSources); i++) {
    let src  = emitterSources[i];
    if (!isReactionInjectSource(src)) { continue; }

    let gate = activeGate(src);
    if (gate < 0.0001) { continue; }

    let dist   = length(pos - src.positionRadius.xyz);
    let radius = src.positionRadius.w;
    if (dist > select(radius, sourceOuterLimit(radius), isBurstSource(src))) { continue; }

    let weight    = select(sphereFalloff(dist, radius, 0.6), eruptiveSourceFalloff(pos, dist, src, 0.6), isBurstSource(src));
    let intensity = src.noise.z;  // packed into noise.z slot

    let fuelAvailability = select(smoothstep(0.02, 0.22, fuelField[index]), 1.0, isBurstSource(src));
    let releaseRate = select(1.6, 1.0 / sourceDuration(src), isBurstSource(src));
    let ignitionSeed = intensity * weight * fuelAvailability * params.deltaTime * releaseRate;
    reaction    = clamp01(reaction + ignitionSeed);
    temperature = clamp01(temperature + intensity * weight * params.deltaTime * 4.0);
  }

  reactionField[index]    = reaction;
  temperatureField[index] = temperature;
}
`,
  ])
}
