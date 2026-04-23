export const ActiveBrickMaskWGSL = /* wgsl */ `
struct BrickInfo {
  counts: vec4<u32>,
  params: vec4<u32>,
}

fn activeBrickIndexForCoord(coord: vec3<u32>) -> u32 {
  let brickSize = max(brickInfo.params.x, 1u);
  let brickCoord = min(coord / vec3<u32>(brickSize), brickInfo.counts.xyz - vec3<u32>(1u));
  return brickCoord.x + brickInfo.counts.x * (brickCoord.y + brickInfo.counts.y * brickCoord.z);
}

fn isActiveCoord(coord: vec3<u32>) -> bool {
  let brickSize = max(brickInfo.params.x, 1u);
  let brickCoord = min(coord / vec3<u32>(brickSize), brickInfo.counts.xyz - vec3<u32>(1u));
  let index = brickCoord.x + brickInfo.counts.x * (brickCoord.y + brickInfo.counts.y * brickCoord.z);
  return activeBrickFlags[index] != 0u;
}
`
