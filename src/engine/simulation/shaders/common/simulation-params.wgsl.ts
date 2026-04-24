export const SimulationParamsWGSL = /* wgsl */ `
struct SimulationParams {
  time: f32,
  deltaTime: f32,
  previousTime: f32,
  scalarSetIndex: f32,
  wind: vec4<f32>,
}
`
