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
@group(0) @binding(2) var<storage, read_write> temperatureField: array<f32>;
@group(0) @binding(3) var<storage, read_write> fuelField: array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let normalized = (vec3<f32>(id) + vec3<f32>(0.5)) /
    vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));
  let index = flatten(id);
  let radialMask = 1.0 - smoothstep(0.0825, 0.11, length(normalized.xz - vec2<f32>(0.5)));
  let verticalMask = 1.0 - smoothstep(0.0, 0.14, normalized.y);
  let emitterMask = radialMask * verticalMask;

  if (emitterMask <= 0.0) {
    return;
  }

  fuelField[index] = clamp01(fuelField[index] + emitterMask * params.deltaTime * 1.9);
  temperatureField[index] = clamp01(temperatureField[index] + emitterMask * params.deltaTime * 2.6);
}
`,
  ])
}
