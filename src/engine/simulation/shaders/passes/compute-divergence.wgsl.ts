import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createComputeDivergenceShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(1) var<storage, read> velocitySource: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> divergenceTarget: array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
fn readVelocity(coord: vec3<u32>) -> vec3<f32> {
  return velocitySource[flatten(clampCoord(coord))].xyz;
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  if (isBoundary(id)) {
    divergenceTarget[index] = 0.0;
    return;
  }

  let divergenceX = readVelocity(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)).x -
    readVelocity(vec3<u32>(dec(id.x), id.y, id.z)).x;
  let divergenceY = readVelocity(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)).y -
    readVelocity(vec3<u32>(id.x, dec(id.y), id.z)).y;
  let divergenceZ = readVelocity(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))).z -
    readVelocity(vec3<u32>(id.x, id.y, dec(id.z))).z;

  divergenceTarget[index] = (divergenceX + divergenceY + divergenceZ) * 0.5;
}
`,
  ])
}
