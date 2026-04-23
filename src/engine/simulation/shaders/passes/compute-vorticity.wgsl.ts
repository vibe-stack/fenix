import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createComputeVorticityShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(1) var<storage, read> velocityField: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> vorticityField: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> vorticityMagnitudeField: array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
fn readVelocity(coord: vec3<u32>) -> vec3<f32> {
  return velocityField[flatten(clampCoord(coord))].xyz;
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  if (isBoundary(id)) {
    vorticityField[index] = vec4<f32>(0.0);
    vorticityMagnitudeField[index] = 0.0;
    return;
  }

  let x0 = readVelocity(vec3<u32>(dec(id.x), id.y, id.z));
  let x1 = readVelocity(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z));
  let y0 = readVelocity(vec3<u32>(id.x, dec(id.y), id.z));
  let y1 = readVelocity(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z));
  let z0 = readVelocity(vec3<u32>(id.x, id.y, dec(id.z)));
  let z1 = readVelocity(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u)));
  let curl = vec3<f32>(
    (y1.z - y0.z) - (z1.y - z0.y),
    (z1.x - z0.x) - (x1.z - x0.z),
    (x1.y - x0.y) - (y1.x - y0.x),
  ) * 0.5;

  vorticityField[index] = vec4<f32>(curl, 0.0);
  vorticityMagnitudeField[index] = length(curl);
}
`,
  ])
}
