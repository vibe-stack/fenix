import { createBuoyancyShader } from './shaders/createBuoyancyShader'
import { createClearShader } from './shaders/createClearShader'
import { createCombustionShader } from './shaders/createCombustionShader'
import {
  createLocalDivergenceShader,
  createLocalPressureSmoothShader,
  createLocalProjectionShader,
  createLocalResidualShader,
  createProlongationShader,
  createRestrictionShader,
} from './shaders/createPressureShaders'
import { createScalarAdvectionShader } from './shaders/createScalarAdvectionShader'
import { createSourceInjectionShader } from './shaders/createSourceInjectionShader'
import { createVelocityAdvectionShader } from './shaders/createVelocityAdvectionShader'

export interface CombustionSimulationPipelines {
  clear: GPUComputePipeline
  sourceInjection: GPUComputePipeline
  combustion: GPUComputePipeline
  buoyancy: GPUComputePipeline
  velocityAdvection: GPUComputePipeline
  scalarAdvection: GPUComputePipeline
  divergence: GPUComputePipeline
  pressureSmooth: GPUComputePipeline
  residual: GPUComputePipeline
  restrict: GPUComputePipeline
  prolongate: GPUComputePipeline
  projection: GPUComputePipeline
}

export function createCombustionSimulationPipelines(
  device: GPUDevice,
): CombustionSimulationPipelines {
  return {
    clear: createPipeline(device, 'clear-storage-buffer', 'clear-storage-buffer-shader', createClearShader()),
    sourceInjection: createPipeline(device, 'inject-combustion-sources', 'inject-combustion-sources-shader', createSourceInjectionShader()),
    combustion: createPipeline(device, 'update-combustion-state', 'update-combustion-state-shader', createCombustionShader()),
    buoyancy: createPipeline(device, 'apply-buoyancy-force', 'apply-buoyancy-force-shader', createBuoyancyShader()),
    velocityAdvection: createPipeline(device, 'advect-velocity-field', 'advect-velocity-field-shader', createVelocityAdvectionShader()),
    scalarAdvection: createPipeline(device, 'advect-scalar-fields', 'advect-scalar-fields-shader', createScalarAdvectionShader()),
    divergence: createPipeline(device, 'compute-divergence-local', 'compute-divergence-local-shader', createLocalDivergenceShader()),
    pressureSmooth: createPipeline(device, 'smooth-pressure-local', 'smooth-pressure-local-shader', createLocalPressureSmoothShader()),
    residual: createPipeline(device, 'compute-pressure-residual-local', 'compute-pressure-residual-local-shader', createLocalResidualShader()),
    restrict: createPipeline(device, 'restrict-pressure-residual', 'restrict-pressure-residual-shader', createRestrictionShader()),
    prolongate: createPipeline(device, 'prolongate-pressure', 'prolongate-pressure-shader', createProlongationShader()),
    projection: createPipeline(device, 'project-velocity-local', 'project-velocity-local-shader', createLocalProjectionShader()),
  }
}

function createPipeline(
  device: GPUDevice,
  label: string,
  shaderLabel: string,
  code: string,
): GPUComputePipeline {
  return device.createComputePipeline({
    label,
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        label: shaderLabel,
        code,
      }),
      entryPoint: 'main',
    },
  })
}
