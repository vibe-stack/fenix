import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createPressureJacobiShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    pressureBindingsWGSL('pressureTarget'),
    IndexingWGSL,
    ClampUtilsWGSL,
    readPressureWGSL(),
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  if (isBoundary(id)) {
    pressureTarget[index] = 0.0;
    return;
  }

  let neighborSum =
    readPressure(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)) +
    readPressure(vec3<u32>(dec(id.x), id.y, id.z)) +
    readPressure(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)) +
    readPressure(vec3<u32>(id.x, dec(id.y), id.z)) +
    readPressure(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))) +
    readPressure(vec3<u32>(id.x, id.y, dec(id.z)));

  pressureTarget[index] = (neighborSum - divergenceSource[index]) / 6.0;
}
`,
  ])
}

export function pressureBindingsWGSL(targetName: string) {
  return /* wgsl */ `
@group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(1) var<storage, read> divergenceSource: array<f32>;
@group(0) @binding(2) var<storage, read> pressureSource: array<f32>;
@group(0) @binding(3) var<storage, read_write> ${targetName}: array<f32>;
`
}

export function readPressureWGSL() {
  return /* wgsl */ `
fn readPressure(coord: vec3<u32>) -> f32 {
  return pressureSource[flatten(clampCoord(coord))];
}
`
}
