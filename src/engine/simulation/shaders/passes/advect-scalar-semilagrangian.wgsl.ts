import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ActiveBrickMaskWGSL } from '../common/active-brick-mask.wgsl'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { createScalarSamplerWGSL } from '../common/sampling-scalar.wgsl'
import { createVelocitySamplerWGSL } from '../common/sampling-velocity.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'

export function createAdvectScalarSemiLagrangianShader() {
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
    scalarDecayWGSL(),
    /* wgsl */ `
@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) {
    return;
  }

  if (!isActiveCoord(id)) {
    let index = flatten(id);
    densityTarget[index] = 0.0;
    temperatureTarget[index] = 0.0;
    fuelTarget[index] = 0.0;
    reactionTarget[index] = 0.0;
    return;
  }

  let coord = vec3<f32>(id) + vec3<f32>(0.5);
  let backPosition = coord - sampleVelocity(coord - vec3<f32>(0.5)) * params.deltaTime;
  writeDecayedScalars(id, backPosition - vec3<f32>(0.5));
}
`,
  ])
}

export function scalarAdvectionBindingsWGSL() {
  return /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
@group(0) @binding(2) var<storage, read> densitySource: array<f32>;
@group(0) @binding(3) var<storage, read> temperatureSource: array<f32>;
@group(0) @binding(4) var<storage, read> fuelSource: array<f32>;
@group(0) @binding(5) var<storage, read> reactionSource: array<f32>;
@group(0) @binding(6) var<storage, read> velocityField: array<vec4<f32>>;
@group(0) @binding(7) var<storage, read_write> densityTarget: array<f32>;
@group(0) @binding(8) var<storage, read_write> temperatureTarget: array<f32>;
@group(0) @binding(9) var<storage, read_write> fuelTarget: array<f32>;
@group(0) @binding(10) var<storage, read_write> reactionTarget: array<f32>;
@group(0) @binding(11) var<storage, read> activeBrickFlags: array<u32>;
@group(0) @binding(12) var<uniform> brickInfo: BrickInfo;
`
}

export function scalarDecayWGSL() {
  return /* wgsl */ `
fn writeDecayedScalars(id: vec3<u32>, samplePosition: vec3<f32>) {
  let index = flatten(id);
  let normalizedY = (f32(id.y) + 0.5) / f32(volumeInfo.height);
  let cooling = params.deltaTime * (0.018 + normalizedY * 0.055);
  let smokeLoss = params.deltaTime * (0.01 + normalizedY * 0.032);

  densityTarget[index] = clamp01(max(0.0, sampleDensity(samplePosition) * (1.0 - smokeLoss)));
  temperatureTarget[index] = clamp01(max(0.0, sampleTemperature(samplePosition) - cooling));
  fuelTarget[index] = clamp01(max(0.0, sampleFuel(samplePosition) - params.deltaTime * 0.025));
  reactionTarget[index] = clamp01(max(0.0, sampleReaction(samplePosition) - params.deltaTime * 0.72));
}
`
}
