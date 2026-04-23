import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { createScalarSamplerWGSL } from '../common/sampling-scalar.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createPressureProlongationShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(1) var<uniform> fineInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read> coarsePressure: array<f32>;
@group(0) @binding(3) var<storage, read_write> finePressure: array<f32>;

fn flatten(coord: vec3<u32>) -> u32 {
  return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
}

fn fineIndex(coord: vec3<u32>) -> u32 {
  return coord.x + fineInfo.width * (coord.y + fineInfo.height * coord.z);
}

fn clampCoord(coord: vec3<u32>) -> vec3<u32> {
  return min(coord, vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
}
`,
    createScalarSamplerWGSL('coarsePressure', 'readCoarse', 'sampleCoarse'),
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= fineInfo.width || id.y >= fineInfo.height || id.z >= fineInfo.depth) {
    return;
  }

  let index = fineIndex(id);
  if (id.x == 0u || id.y == 0u || id.z == 0u ||
    id.x == fineInfo.width - 1u || id.y == fineInfo.height - 1u || id.z == fineInfo.depth - 1u) {
    finePressure[index] = 0.0;
    return;
  }

  let coarsePosition = (vec3<f32>(id) + vec3<f32>(0.5)) * 0.5 - vec3<f32>(0.5);
  finePressure[index] += sampleCoarse(coarsePosition);
}
`,
  ])
}
