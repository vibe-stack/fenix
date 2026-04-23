import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createPressureRestrictionShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> sourceInfo: VolumeInfo;
@group(0) @binding(1) var<uniform> targetInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read> sourceBuffer: array<f32>;
@group(0) @binding(3) var<storage, read_write> targetBuffer: array<f32>;

fn sourceIndex(coord: vec3<u32>) -> u32 {
  return coord.x + sourceInfo.width * (coord.y + sourceInfo.height * coord.z);
}

fn targetIndex(coord: vec3<u32>) -> u32 {
  return coord.x + targetInfo.width * (coord.y + targetInfo.height * coord.z);
}

fn readSource(coord: vec3<u32>) -> f32 {
  let clamped = min(coord, vec3<u32>(sourceInfo.width - 1u, sourceInfo.height - 1u, sourceInfo.depth - 1u));
  return sourceBuffer[sourceIndex(clamped)];
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= targetInfo.width || id.y >= targetInfo.height || id.z >= targetInfo.depth) {
    return;
  }

  let index = targetIndex(id);
  if (id.x == 0u || id.y == 0u || id.z == 0u ||
    id.x == targetInfo.width - 1u || id.y == targetInfo.height - 1u || id.z == targetInfo.depth - 1u) {
    targetBuffer[index] = 0.0;
    return;
  }

  let base = id * 2u;
  var sum = 0.0;
  for (var z = 0u; z < 2u; z += 1u) {
    for (var y = 0u; y < 2u; y += 1u) {
      for (var x = 0u; x < 2u; x += 1u) {
        sum += readSource(base + vec3<u32>(x, y, z));
      }
    }
  }
  targetBuffer[index] = sum * 0.125;
}
`,
  ])
}
