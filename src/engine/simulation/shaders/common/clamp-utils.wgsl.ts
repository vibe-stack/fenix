export const ClampUtilsWGSL = /* wgsl */ `
fn clamp01(value: f32) -> f32 {
  return clamp(value, 0.0, 1.0);
}

fn insideVolume(coord: vec3<u32>) -> bool {
  return coord.x < volumeInfo.width &&
    coord.y < volumeInfo.height &&
    coord.z < volumeInfo.depth;
}

fn dec(value: u32) -> u32 {
  if (value == 0u) {
    return 0u;
  }

  return value - 1u;
}

fn inc(value: u32, maxValue: u32) -> u32 {
  return min(value + 1u, maxValue);
}
`
