import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ActiveBrickMaskWGSL } from '../common/active-brick-mask.wgsl'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createApplyBuoyancyShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    ActiveBrickMaskWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read> densityField: array<f32>;
@group(0) @binding(3) var<storage, read> temperatureField: array<f32>;
@group(0) @binding(4) var<storage, read_write> velocityField: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read> activeBrickFlags: array<u32>;
@group(0) @binding(6) var<uniform> brickInfo: BrickInfo;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  if (!isActiveCoord(id)) {
    return;
  }

  let index = flatten(id);
  let dt = params.deltaTime;
  let temperatureLift = temperatureField[index] * 3.6;
  let smokeWeight = densityField[index] * 0.55;
  var velocity = velocityField[index].xyz * (1.0 - dt * 0.08);

  velocity.y = clamp(velocity.y + (temperatureLift - smokeWeight) * dt, -2.0, 8.0);

  if (id.x == 0u || id.x == volumeInfo.width - 1u || id.z == 0u || id.z == volumeInfo.depth - 1u) {
    velocity.x = 0.0;
    velocity.z = 0.0;
  }
  if (id.y == 0u) {
    velocity.y = max(velocity.y, 0.0);
  }

  velocityField[index] = vec4<f32>(velocity, 0.0);
}
`,
  ])
}
