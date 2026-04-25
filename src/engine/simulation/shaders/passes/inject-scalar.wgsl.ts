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

export function createInjectScalarShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
`,
    EmitterSourceStructWGSL,
    /* wgsl */ `
@group(0) @binding(3) var<storage, read_write> densityField:     array<f32>;
@group(0) @binding(4) var<storage, read_write> temperatureField: array<f32>;
@group(0) @binding(5) var<storage, read_write> fuelField:        array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    EmitterEnvelopeWGSL,
    EmitterNoiseWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) { return; }

  let index  = flatten(id);
  let pos    = (vec3<f32>(id) + vec3<f32>(0.5)) /
               vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));

  var density     = densityField[index];
  var temperature = temperatureField[index];
  var fuel        = fuelField[index];

  for (var i = 0u; i < arrayLength(&emitterSources); i++) {
    let src  = emitterSources[i];
    let gate = activeGate(src);
    if (gate < 0.0001) { continue; }

    let offset = pos - src.positionRadius.xyz;
    let dist   = length(offset);
    let radius = src.positionRadius.w;
    if (dist > radius) { continue; }

    let weight  = sphereFalloff(dist, radius, 0.5);
    let noise   = emitterNoise(pos, src.noise.x, src._meta.y);
    let modulation = mix(1.0, noise, clamp(src.noise.y, 0.0, 1.0));
    let contribution = weight * modulation * params.deltaTime;

    density     = clamp01(density     + src.scalarYields.x * contribution);
    temperature = clamp01(temperature + src.scalarYields.y * contribution);
    fuel        = clamp01(fuel        + src.scalarYields.z * contribution);
  }

  densityField[index]     = density;
  temperatureField[index] = temperature;
  fuelField[index]        = fuel;
}
`,
  ])
}
