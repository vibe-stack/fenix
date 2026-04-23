export function createClearStorageBufferShader() {
  return /* wgsl */ `
@group(0) @binding(0) var<storage, read_write> clearTarget: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= arrayLength(&clearTarget)) {
    return;
  }

  clearTarget[id.x] = 0.0;
}
`
}
