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
@group(0) @binding(5) var<storage, read_write> activeBrickFlags: array<atomic<u32>>;
`,
    IndexingWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) brickId: vec3<u32>) {
  if (brickId.x >= brickInfo.counts.x || brickId.y >= brickInfo.counts.y || brickId.z >= brickInfo.counts.z) {
    return;
  }

  let brickSize = brickInfo.params.x;
  let base = brickId * vec3<u32>(brickSize);
  var activeFlag = 0u;
  var peakEnergy = 0.0;

  let stride = max(brickSize / 4u, 1u);
  for (var z = 0u; z < brickSize; z += stride) {
    for (var y = 0u; y < brickSize; y += stride) {
      for (var x = 0u; x < brickSize; x += stride) {
        let coord = base + vec3<u32>(x, y, z);
        if (coord.x < volumeInfo.width && coord.y < volumeInfo.height && coord.z < volumeInfo.depth) {
          let fieldIndex = flatten(coord);
          let fieldEnergy = densityField[fieldIndex] + temperatureField[fieldIndex] * 0.7 + reactionField[fieldIndex] * 0.9;
          peakEnergy = max(peakEnergy, fieldEnergy);
          if (fieldEnergy > 0.012) {
            activeFlag = 1u;
          }
        }
      }
    }
  }

  let center = min(base + vec3<u32>(brickSize / 2u), vec3<u32>(volumeInfo.width - 1u, volumeInfo.height - 1u, volumeInfo.depth - 1u));
  let centerIndex = flatten(center);
  let centerEnergy = densityField[centerIndex] + temperatureField[centerIndex] * 0.7 + reactionField[centerIndex] * 0.9;
  peakEnergy = max(peakEnergy, centerEnergy);
  if (centerEnergy > 0.012) {
    activeFlag = 1u;
  }

  if (activeFlag == 0u) {
    return;
  }

  let dilationRadius = select(0i, 1i, peakEnergy > 0.05 || centerEnergy > 0.035);

  for (var z = -dilationRadius; z <= dilationRadius; z += 1i) {
    for (var y = -dilationRadius; y <= dilationRadius; y += 1i) {
      for (var x = -dilationRadius; x <= dilationRadius; x += 1i) {
        let neighbor = vec3<u32>(
          u32(clamp(i32(brickId.x) + x, 0i, i32(brickInfo.counts.x) - 1i)),
          u32(clamp(i32(brickId.y) + y, 0i, i32(brickInfo.counts.y) - 1i)),
          u32(clamp(i32(brickId.z) + z, 0i, i32(brickInfo.counts.z) - 1i)),
        );
        let neighborIndex = neighbor.x + brickInfo.counts.x * (neighbor.y + brickInfo.counts.y * neighbor.z);
        atomicStore(&activeBrickFlags[neighborIndex], 1u);
      }
    }
  }
}
`,
  ])
}
