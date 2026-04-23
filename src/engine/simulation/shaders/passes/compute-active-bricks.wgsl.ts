import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createComputeActiveBricksShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    /* wgsl */ `
struct BrickInfo {
  counts: vec4<u32>,
  params: vec4<u32>,
}

@group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(1) var<uniform> brickInfo: BrickInfo;
@group(0) @binding(2) var<storage, read> densityField: array<f32>;
@group(0) @binding(3) var<storage, read> temperatureField: array<f32>;
@group(0) @binding(4) var<storage, read> reactionField: array<f32>;
@group(0) @binding(5) var<storage, read_write> activeBrickFlags: array<u32>;
`,
    IndexingWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) brickId: vec3<u32>) {
  if (brickId.x >= brickInfo.counts.x || brickId.y >= brickInfo.counts.y || brickId.z >= brickInfo.counts.z) {
    return;
  }

  let brickSize = brickInfo.params.x;
  let brickIndex = brickId.x + brickInfo.counts.x * (brickId.y + brickInfo.counts.y * brickId.z);
  let base = brickId * vec3<u32>(brickSize);
  var activeFlag = 0u;

  for (var z = 0u; z < brickSize; z += 1u) {
    for (var y = 0u; y < brickSize; y += 1u) {
      for (var x = 0u; x < brickSize; x += 1u) {
        let coord = base + vec3<u32>(x, y, z);
        if (coord.x < volumeInfo.width && coord.y < volumeInfo.height && coord.z < volumeInfo.depth) {
          let fieldIndex = flatten(coord);
          let fieldEnergy = densityField[fieldIndex] + temperatureField[fieldIndex] * 0.7 + reactionField[fieldIndex] * 0.9;
          if (fieldEnergy > 0.012) {
            activeFlag = 1u;
          }
        }
      }
    }
  }

  activeBrickFlags[brickIndex] = activeFlag;
}
`,
  ])
}
