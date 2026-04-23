import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { createScalarSamplerWGSL } from '../common/sampling-scalar.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createProjectVelocityShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(1) var<storage, read> velocitySource: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> pressureSource: array<f32>;
@group(0) @binding(3) var<storage, read_write> velocityTarget: array<vec4<f32>>;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    createScalarSamplerWGSL('pressureSource', 'readPressure', 'samplePressure'),
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

  let gradient = vec3<f32>(
    readPressure(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)) -
      readPressure(vec3<u32>(dec(id.x), id.y, id.z)),
    readPressure(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)) -
      readPressure(vec3<u32>(id.x, dec(id.y), id.z)),
    readPressure(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))) -
      readPressure(vec3<u32>(id.x, id.y, dec(id.z))),
  ) * 0.5;

  velocityTarget[index] = vec4<f32>(velocitySource[index].xyz - gradient, 0.0);
}
`,
  ])
}
