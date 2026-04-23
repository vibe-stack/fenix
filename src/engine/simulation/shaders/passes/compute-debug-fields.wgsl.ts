import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createComputeDebugFieldsShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(1) var<storage, read> velocityField: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> velocityMagnitudeField: array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  velocityMagnitudeField[flatten(id)] = length(velocityField[flatten(id)].xyz);
}
`,
  ])
}
