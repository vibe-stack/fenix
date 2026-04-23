export function createClearShader() {
  return /* wgsl */ `
    @group(0) @binding(0) var<storage, read_write> clearBuffer: array<u32>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let index = id.x;

      if (index >= arrayLength(&clearBuffer)) {
        return;
      }

      clearBuffer[index] = 0u;
    }
  `
}
