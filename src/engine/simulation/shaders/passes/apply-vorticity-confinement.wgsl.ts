import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createApplyVorticityConfinementShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read> vorticityField: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> vorticityMagnitudeField: array<f32>;
@group(0) @binding(4) var<storage, read_write> velocityField: array<vec4<f32>>;
@group(0) @binding(5) var<storage, read_write> confinementMagnitudeField: array<f32>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    /* wgsl */ `
fn readMagnitude(coord: vec3<u32>) -> f32 {
  return vorticityMagnitudeField[flatten(clampCoord(coord))];
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  if (isBoundary(id)) {
    confinementMagnitudeField[index] = 0.0;
    return;
  }

  let gradient = vec3<f32>(
    readMagnitude(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)) -
      readMagnitude(vec3<u32>(dec(id.x), id.y, id.z)),
    readMagnitude(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)) -
      readMagnitude(vec3<u32>(id.x, dec(id.y), id.z)),
    readMagnitude(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))) -
      readMagnitude(vec3<u32>(id.x, id.y, dec(id.z))),
  ) * 0.5;
  let direction = gradient / max(length(gradient), 0.0001);
  let force = cross(direction, vorticityField[index].xyz) * params.vorticityStrength * 1.45;
  var velocity = velocityField[index].xyz + force * params.deltaTime;
  let voxelSpeedLimit = 80.0 / max(params.dx, 0.001);
  velocity = clamp(velocity, vec3<f32>(-voxelSpeedLimit), vec3<f32>(voxelSpeedLimit));
  velocityField[index] = vec4<f32>(velocity, 0.0);
  confinementMagnitudeField[index] = length(force);
}
`,
  ])
}
