import { WORKGROUP_SIZE } from '../../runtime/combustion-volume-simulation/constants'
import { ClampUtilsWGSL } from '../common/clamp-utils.wgsl'
import { IndexingWGSL } from '../common/indexing.wgsl'
import { SimulationParamsWGSL } from '../common/simulation-params.wgsl'
import { VolumeInfoWGSL } from '../common/volume-info.wgsl'
import { joinWGSL } from '../common/wgsl'
import {
  EmitterSourceStructWGSL,
  EmitterEnvelopeWGSL,
  EmitterNoiseWGSL,
} from './inject-source-common.wgsl'

// modeIndex constants — must match VELOCITY_MODE_INDEX in packEmitterSources.ts
const MODE_RADIAL = 0
const MODE_DIRECTIONAL = 1
const MODE_TURBULENT = 2

export function createInjectVelocityShader() {
  return joinWGSL([
    SimulationParamsWGSL,
    VolumeInfoWGSL,
    /* wgsl */ `
@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<uniform> volumeInfo: VolumeInfo;
`,
    EmitterSourceStructWGSL,
    /* wgsl */ `
@group(0) @binding(3) var<storage, read_write> velocityField: array<vec4<f32>>;

const MODE_RADIAL:      f32 = ${MODE_RADIAL}.0;
const MODE_DIRECTIONAL: f32 = ${MODE_DIRECTIONAL}.0;
const MODE_TURBULENT:   f32 = ${MODE_TURBULENT}.0;
`,
    IndexingWGSL,
    ClampUtilsWGSL,
    EmitterNoiseWGSL,
    EmitterEnvelopeWGSL,
    /* wgsl */ `
fn turbulentDir(pos: vec3<f32>, seed: f32) -> vec3<f32> {
  let nx = emitterNoise(pos, 4.0, seed);
  let ny = emitterNoise(pos, 4.0, seed + 17.3);
  let nz = emitterNoise(pos, 4.0, seed + 31.7);
  return normalize(vec3<f32>(nx, ny, nz) - vec3<f32>(0.5));
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (!insideVolume(id)) { return; }

  let index = flatten(id);
  let pos   = (vec3<f32>(id) + vec3<f32>(0.5)) /
              vec3<f32>(f32(volumeInfo.width), f32(volumeInfo.height), f32(volumeInfo.depth));

  var vel = velocityField[index].xyz;

  for (var i = 0u; i < arrayLength(&emitterSources); i++) {
    let src  = emitterSources[i];
    if (!isVelocityInjectSource(src)) { continue; }

    let gate = activeGate(src);
    if (gate < 0.0001) { continue; }

    let offset = pos - src.positionRadius.xyz;
    let dist   = length(offset);
    let radius = src.positionRadius.w;
    if (dist > select(radius, sourceOuterLimit(radius), isBurstSource(src))) { continue; }

    let weight = select(sphereFalloff(dist, radius, src.velocity.z), eruptiveSourceFalloff(pos, dist, src, src.velocity.z), isBurstSource(src));
    let speed  = src.velocity.x;
    let mode   = src.velocity.y;

    var dir = vec3<f32>(0.0);
    if (isBurstSource(src)) {
      let radial = select(vec3<f32>(0.0, 1.0, 0.0), offset / max(dist, 0.0001), dist > 0.0001);
      let turbulent = turbulentDir(pos + vec3<f32>(params.time * 0.19, -params.time * 0.13, params.time * 0.07), src._meta.y + 83.0);
      let burstVelocity = radial * speed + vec3<f32>(0.0, src.velocity.y, 0.0) + turbulent * src.velocity.w;
      let impulse = burstVelocity * weight * params.deltaTime / sourceDuration(src);
      vel += impulse;
      continue;
    } else if (mode == MODE_RADIAL) {
      dir = select(vec3<f32>(0.0, 1.0, 0.0), offset / max(dist, 0.0001), dist > 0.0001);
    } else if (mode == MODE_DIRECTIONAL) {
      let d = src.direction.xyz;
      dir = select(vec3<f32>(0.0, 1.0, 0.0), normalize(d), dot(d, d) > 0.0001);
    } else {
      dir = turbulentDir(pos, src._meta.y);
    }

    let force = dir * speed * weight * params.deltaTime;
    let tightness = clamp(src.velocity.w, 0.0, 1.0) * weight;
    vel = mix(vel + force, dir * speed, tightness);
  }

  let voxelSpeedLimit = 80.0 / max(params.dx, 0.001);
  velocityField[index] = vec4<f32>(clamp(vel, vec3<f32>(-voxelSpeedLimit), vec3<f32>(voxelSpeedLimit)), 0.0);
}
`,
  ])
}
