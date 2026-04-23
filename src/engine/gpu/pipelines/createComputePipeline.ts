export function createComputePipeline(
  device: GPUDevice,
  label: string,
  shaderLabel: string,
  code: string,
): GPUComputePipeline {
  return device.createComputePipeline({
    label,
    layout: 'auto',
    compute: {
      module: device.createShaderModule({ label: shaderLabel, code }),
      entryPoint: 'main',
    },
  })
}
