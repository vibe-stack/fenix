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
  meta:           vec4<f32>, // x=kind(0/1/2), y=seed, zw=0
}

@group(0) @binding(2) var<storage, read> emitterSources: array<EmitterSource>;
`

/** Returns 0 outside the active window, 1 inside. */
export const EmitterEnvelopeWGSL = /* wgsl */ `
fn activeGate(src: EmitterSource) -> f32 {
  let age = params.time - src.timing.x;
  return step(0.0, age) * step(age, src.timing.y);
}

fn sphereFalloff(dist: f32, radius: f32, falloff: f32) -> f32 {
  let t = clamp(1.0 - dist / max(radius, 0.0001), 0.0, 1.0);
  return mix(step(0.0, t - 0.0001), t * t, falloff);
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
