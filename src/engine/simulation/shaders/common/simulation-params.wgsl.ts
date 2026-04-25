export const SimulationParamsWGSL = /* wgsl */ `
struct SimulationParams {
  time: f32,
  deltaTime: f32,
  previousTime: f32,
  scalarSetIndex: f32,
  wind: vec4<f32>,        // xyz = direction, w = strength
  gravity: vec4<f32>,     // xyz = direction, w = density-coupled acceleration
  buoyancy: f32,          // temperature lift scale
  vorticityStrength: f32, // vorticity confinement scale
  dx: f32,                // meters per voxel (worldSize / max(width, depth))
  worldSize: f32,         // physical domain size in meters
}
`
