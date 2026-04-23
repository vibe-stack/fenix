export const IndexingWGSL = /* wgsl */ `
fn flatten(coord: vec3<u32>) -> u32 {
  return coord.x + volumeInfo.width * (coord.y + volumeInfo.height * coord.z);
}

fn clampCoord(coord: vec3<u32>) -> vec3<u32> {
  return vec3<u32>(
    clamp(coord.x, 0u, volumeInfo.width - 1u),
    clamp(coord.y, 0u, volumeInfo.height - 1u),
    clamp(coord.z, 0u, volumeInfo.depth - 1u),
  );
}

fn isBoundary(coord: vec3<u32>) -> bool {
  return coord.x == 0u || coord.y == 0u || coord.z == 0u ||
    coord.x == volumeInfo.width - 1u ||
    coord.y == volumeInfo.height - 1u ||
    coord.z == volumeInfo.depth - 1u;
}
`
