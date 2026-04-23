import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'
import { pressureBindingsWGSL, readPressureWGSL } from './pressure-jacobi.wgsl'

export function createPressureResidualShader() {
  return joinWGSL([
    VolumeInfoWGSL,
    pressureBindingsWGSL('residualTarget'),
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
    residualTarget[index] = 0.0;
    return;
  }

  let neighborSum =
    readPressure(vec3<u32>(inc(id.x, volumeInfo.width - 1u), id.y, id.z)) +
    readPressure(vec3<u32>(dec(id.x), id.y, id.z)) +
    readPressure(vec3<u32>(id.x, inc(id.y, volumeInfo.height - 1u), id.z)) +
    readPressure(vec3<u32>(id.x, dec(id.y), id.z)) +
    readPressure(vec3<u32>(id.x, id.y, inc(id.z, volumeInfo.depth - 1u))) +
    readPressure(vec3<u32>(id.x, id.y, dec(id.z)));
  let laplacian = neighborSum - pressureSource[index] * 6.0;

  residualTarget[index] = divergenceSource[index] - laplacian;
}
`,
  ])
}
