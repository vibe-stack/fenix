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
fn scalarThermalNoise(position: vec3<f32>) -> f32 {
  let p = position + vec3<f32>(params.time * 1.7, -params.time * 3.1, params.time * 1.1);
  let a = 0.5 + 0.5 * sin(dot(p, vec3<f32>(0.097, 0.061, -0.083)));
  let b = 0.5 + 0.5 * sin(dot(p, vec3<f32>(-0.043, 0.137, 0.071)) + sin(p.y * 0.079) * 1.6);
  return clamp(a * 0.58 + b * 0.42, 0.0, 1.0);
}

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
  let density = advectDensity(coord);
  let temperature = advectTemperature(coord);
  let fuel = advectFuel(coord);
  let reaction = advectReaction(coord);
  let thermalNoise = scalarThermalNoise(coord);
  let hotReservoir = smoothstep(0.22, 0.78, temperature + fuel * 0.2 + reaction * 0.26);
  let coolingPocket = smoothstep(0.44, 0.9, 1.0 - thermalNoise) *
    smoothstep(0.08, 0.74, density) *
    (1.0 - hotReservoir * 0.72);
  let cooling = params.deltaTime * (0.016 + normalizedY * 0.052) *
    mix(1.28, 0.58, hotReservoir) *
    mix(0.86, 1.9, coolingPocket);
  let smokeLoss = params.deltaTime * (0.008 + normalizedY * 0.026) *
    mix(0.75, 1.38, thermalNoise);
  let coldBreakup = params.deltaTime * density *
    (1.0 - smoothstep(0.2, 0.86, hotReservoir)) *
    smoothstep(0.18, 0.72, density) *
    smoothstep(0.34, 0.92, thermalNoise) *
    0.34;
  let thermalClearing = params.deltaTime * density * hotReservoir * mix(0.1, 0.72, thermalNoise);

  densityTarget[index] = clamp01(max(0.0, density * (1.0 - smokeLoss) - thermalClearing - coldBreakup));
  temperatureTarget[index] = clamp01(max(0.0, temperature - cooling));
  fuelTarget[index] = clamp01(max(0.0, fuel - params.deltaTime * mix(0.012, 0.034, thermalNoise)));
  reactionTarget[index] = clamp01(max(0.0, reaction - params.deltaTime * mix(0.46, 0.82, thermalNoise)));
}
`
}
