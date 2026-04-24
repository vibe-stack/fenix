export const SimulationParamsWGSL = /* wgsl */ `
struct SimulationParams {
  time: f32,
  deltaTime: f32,
  previousTime: f32,
  scalarSetIndex: f32,
  wind: vec4<f32>,        // xyz = direction, w = strength
  buoyancy: f32,          // temperature lift scale
  vorticityStrength: f32, // vorticity confinement scale
  _pad0: f32,
  _pad1: f32,
}
`
