export function createVelocitySamplerWGSL(sourceName: string) {
  return /* wgsl */ `
fn readVelocity(coord: vec3<u32>) -> vec3<f32> {
  return ${sourceName}[flatten(clampCoord(coord))].xyz;
}

fn sampleVelocity(position: vec3<f32>) -> vec3<f32> {
  let maxPosition = vec3<f32>(
    f32(volumeInfo.width - 1u),
    f32(volumeInfo.height - 1u),
    f32(volumeInfo.depth - 1u),
  );
  let clamped = clamp(position, vec3<f32>(0.0), maxPosition);
  let base = vec3<u32>(floor(clamped));
  let upper = min(base + vec3<u32>(1u), vec3<u32>(maxPosition));
  let fraction = fract(clamped);
  let c000 = readVelocity(base);
  let c100 = readVelocity(vec3<u32>(upper.x, base.y, base.z));
  let c010 = readVelocity(vec3<u32>(base.x, upper.y, base.z));
  let c110 = readVelocity(vec3<u32>(upper.x, upper.y, base.z));
  let c001 = readVelocity(vec3<u32>(base.x, base.y, upper.z));
  let c101 = readVelocity(vec3<u32>(upper.x, base.y, upper.z));
  let c011 = readVelocity(vec3<u32>(base.x, upper.y, upper.z));
  let c111 = readVelocity(upper);
  let x00 = mix(c000, c100, fraction.x);
  let x10 = mix(c010, c110, fraction.x);
  let x01 = mix(c001, c101, fraction.x);
  let x11 = mix(c011, c111, fraction.x);
  return mix(mix(x00, x10, fraction.y), mix(x01, x11, fraction.y), fraction.z);
}
`
}
