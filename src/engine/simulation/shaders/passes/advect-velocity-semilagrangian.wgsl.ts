import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { createVelocitySamplerWGSL } from '../common/sampling-velocity.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createAdvectVelocitySemiLagrangianShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read> velocitySource: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> velocityTarget: array<vec4<f32>>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    createVelocitySamplerWGSL('velocitySource'),
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  if (isBoundary(id)) {
    velocityTarget[index] = vec4<f32>(0.0);
    return;
  }

  let coord = vec3<f32>(id) + vec3<f32>(0.5);
  let backPosition = coord - sampleVelocity(coord - vec3<f32>(0.5)) * params.deltaTime;
  let advectedVelocity = sampleVelocity(backPosition - vec3<f32>(0.5)) *
    (1.0 - params.deltaTime * 0.08);

  velocityTarget[index] = vec4<f32>(advectedVelocity, 0.0);
}
`,
  ])
}
