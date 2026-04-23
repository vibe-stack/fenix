import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ActiveBrickMaskWGSL } from '../common/active-brick-mask.wgsl'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { createScalarSamplerWGSL } from '../common/sampling-scalar.wgsl'
import { createVelocitySamplerWGSL } from '../common/sampling-velocity.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'
import { scalarAdvectionBindingsWGSL } from './advect-scalar-semilagrangian.wgsl'

export function createAdvectScalarMacCormackShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    ActiveBrickMaskWGSL,
    scalarAdvectionBindingsWGSL(),
    IndexingWGSL,
    ClampUtilsWGSL,
    createVelocitySamplerWGSL('velocityField'),
    createScalarSamplerWGSL('densitySource', 'readDensity', 'sampleDensity'),
    createScalarSamplerWGSL('temperatureSource', 'readTemperature', 'sampleTemperature'),
    createScalarSamplerWGSL('fuelSource', 'readFuel', 'sampleFuel'),
    createScalarSamplerWGSL('reactionSource', 'readReaction', 'sampleReaction'),
    macCormackScalarWGSL('Density', 'sampleDensity'),
    macCormackScalarWGSL('Temperature', 'sampleTemperature'),
    macCormackScalarWGSL('Fuel', 'sampleFuel'),
    macCormackScalarWGSL('Reaction', 'sampleReaction'),
    writeMacCormackWGSL(),
  ])
}

function macCormackScalarWGSL(name: string, sampleName: string) {
  return /* wgsl */ `
fn advect${name}(coord: vec3<f32>) -> f32 {
  let velocity = sampleVelocity(coord - vec3<f32>(0.5));
  let backPosition = coord - velocity * params.deltaTime;
  let samplePosition = backPosition - vec3<f32>(0.5);
  let predicted = ${sampleName}(samplePosition);
  let forwardVelocity = sampleVelocity(samplePosition);
  let recoveredPosition = backPosition + forwardVelocity * params.deltaTime;
  let recovered = ${sampleName}(recoveredPosition - vec3<f32>(0.5));
  let original = ${sampleName}(coord - vec3<f32>(0.5));
  let corrected = predicted + 0.5 * (original - recovered);
  return clamp(corrected, min(original, predicted), max(original, predicted));
}
`
}

function writeMacCormackWGSL() {
  return /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  let index = flatten(id);
  if (!isActiveCoord(id)) {
    densityTarget[index] = 0.0;
    temperatureTarget[index] = 0.0;
    fuelTarget[index] = 0.0;
    reactionTarget[index] = 0.0;
    return;
  }

  let coord = vec3<f32>(id) + vec3<f32>(0.5);
  let normalizedY = (f32(id.y) + 0.5) / f32(volumeInfo.height);
  let cooling = params.deltaTime * (0.018 + normalizedY * 0.055);
  let smokeLoss = params.deltaTime * (0.01 + normalizedY * 0.032);

  densityTarget[index] = clamp01(max(0.0, advectDensity(coord) * (1.0 - smokeLoss)));
  temperatureTarget[index] = clamp01(max(0.0, advectTemperature(coord) - cooling));
  fuelTarget[index] = clamp01(max(0.0, advectFuel(coord) - params.deltaTime * 0.025));
  reactionTarget[index] = clamp01(max(0.0, advectReaction(coord) - params.deltaTime * 0.72));
}
`
}
