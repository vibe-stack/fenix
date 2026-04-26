/** Shared WGSL: EmitterSource struct, bindings, envelope, and noise. */
export const EmitterSourceStructWGSL = /* wgsl */ `
struct EmitterSource {
  positionRadius: vec4<f32>, // xyz=position, w=radius
  timing:         vec4<f32>, // x=startTime, y=duration, zw=0
  scalarYields:   vec4<f32>, // x=densityRate, y=heatRate, z=fuelRate, w=0
  velocity:       vec4<f32>, // x=speed, y=modeIndex, z=falloff, w=0
  direction:      vec4<f32>, // xyz=direction, w=0
  noise:          vec4<f32>, // x=noiseScale, y=noiseMix, z=intensity, w=0
  _pad:           vec4<f32>,
  _meta:           vec4<f32>, // x=kind(0/1/2), y=seed, zw=0
}

@group(0) @binding(2) var<storage, read> emitterSources: array<EmitterSource>;
`

/** Returns 0 outside the active window, 1 inside. */
export const EmitterEnvelopeWGSL = /* wgsl */ `
const SOURCE_KIND_SCALAR: f32 = 0.0;
const SOURCE_KIND_VELOCITY: f32 = 1.0;
const SOURCE_KIND_IGNITER: f32 = 2.0;
const SOURCE_KIND_BURST: f32 = 3.0;

fn activeGate(src: EmitterSource) -> f32 {
  let age = params.time - src.timing.x;
  return step(0.0, age) * step(age, src.timing.y);
}

fn isScalarSource(src: EmitterSource) -> bool {
  return src._meta.x == SOURCE_KIND_SCALAR;
}

fn isVelocitySource(src: EmitterSource) -> bool {
  return src._meta.x == SOURCE_KIND_VELOCITY;
}

fn isIgniterSource(src: EmitterSource) -> bool {
  return src._meta.x == SOURCE_KIND_IGNITER;
}

fn isBurstSource(src: EmitterSource) -> bool {
  return src._meta.x == SOURCE_KIND_BURST;
}

fn isScalarInjectSource(src: EmitterSource) -> bool {
  return isScalarSource(src) || isBurstSource(src);
}

fn isVelocityInjectSource(src: EmitterSource) -> bool {
  return isVelocitySource(src) || isBurstSource(src);
}

fn isReactionInjectSource(src: EmitterSource) -> bool {
  return isIgniterSource(src) || isBurstSource(src);
}

fn sourceAge(src: EmitterSource) -> f32 {
  return max(params.time - src.timing.x, 0.0);
}

fn sourceDuration(src: EmitterSource) -> f32 {
  return max(src.timing.y, 0.0001);
}

fn sphereFalloff(dist: f32, radius: f32, falloff: f32) -> f32 {
  let t = clamp(1.0 - dist / max(radius, 0.0001), 0.0, 1.0);
  return mix(step(0.0, t - 0.0001), t * t, falloff);
}

fn sourceFeather(targetRadius: f32) -> f32 {
  let voxelWidth = params.dx / max(params.worldSize, 0.0001);
  return max(targetRadius * 0.24, voxelWidth * 3.0);
}

fn sourceOuterLimit(targetRadius: f32) -> f32 {
  return targetRadius + sourceFeather(targetRadius);
}

fn eruptiveSourceFalloff(pos: vec3<f32>, dist: f32, src: EmitterSource, falloff: f32) -> f32 {
  let targetRadius = src.positionRadius.w;
  let growthSeconds = clamp(targetRadius * 5.5, 0.1, 0.75);
  let age = sourceAge(src);
  let growth = smoothstep(0.0, 1.0, clamp(age / growthSeconds, 0.0, 1.0));
  let feather = sourceFeather(targetRadius);

  let seed = src._meta.y;
  let coarse = emitterNoise(pos + vec3<f32>(age * 0.17, -age * 0.11, age * 0.07), 6.0, seed);
  let fine = emitterNoise(pos + vec3<f32>(-age * 0.33, age * 0.21, -age * 0.15), 18.0, seed + 41.0);
  let lobe = clamp(coarse * 0.72 + fine * 0.28, 0.0, 1.0);
  let reach = targetRadius * growth * mix(0.62, 1.0, smoothstep(0.2, 0.92, lobe));
  let front = 1.0 - smoothstep(reach - feather, reach + feather, dist);
  let coreRadius = max(targetRadius * (0.18 + growth * 0.38), feather);
  let core = sphereFalloff(dist, coreRadius, falloff) * (1.0 - growth * 0.35);
  let body = sphereFalloff(dist, max(reach + feather, feather), falloff) * front;

  return clamp(max(core, body) * mix(0.72, 1.2, lobe), 0.0, 1.0);
}
`

/** Simple value noise — fast, good enough for emission variation. */
export const EmitterNoiseWGSL = /* wgsl */ `
fn hash31(p: vec3<f32>) -> f32 {
  return fract(sin(dot(p, vec3<f32>(127.1, 311.7, 74.7))) * 43758.5453123);
}

fn valueNoise3(p: vec3<f32>) -> f32 {
  let c = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(c), hash31(c+vec3<f32>(1,0,0)), u.x),
        mix(hash31(c+vec3<f32>(0,1,0)), hash31(c+vec3<f32>(1,1,0)), u.x), u.y),
    mix(mix(hash31(c+vec3<f32>(0,0,1)), hash31(c+vec3<f32>(1,0,1)), u.x),
        mix(hash31(c+vec3<f32>(0,1,1)), hash31(c+vec3<f32>(1,1,1)), u.x), u.y),
    u.z,
  );
}

fn emitterNoise(pos: vec3<f32>, scale: f32, seed: f32) -> f32 {
  return valueNoise3(pos * max(scale, 0.1) + vec3<f32>(seed * 0.137, seed * 0.271, -seed * 0.193));
}
`
