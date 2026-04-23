import type { VolumeResolution } from '../common/volumeResolution'
import {
  createScalarFieldBuffers,
  createStorageBuffer,
  destroyScalarFieldBuffers,
  halveResolution,
  voxelCountFor,
} from './combustion-volume-simulation/buffers'
import {
  GPU_BUFFER_COPY_DST,
  GPU_BUFFER_UNIFORM,
  PRESSURE_POST_SMOOTH_FINE,
  PRESSURE_POST_SMOOTH_MID,
  PRESSURE_PRE_SMOOTH_FINE,
  PRESSURE_PRE_SMOOTH_MID,
  PRESSURE_SMOOTH_COARSE,
} from './combustion-volume-simulation/constants'
import { runClearPass, runPressureSmoothSequence, runVolumePass } from './combustion-volume-simulation/dispatch'
import { createCombustionSimulationPipelines } from './combustion-volume-simulation/pipelines'
import { createPressureLevel, destroyPressureLevel } from './combustion-volume-simulation/pressure'
import {
  createBuoyancyResources,
  createClearResources,
  createCombustionResources,
  createDivergenceResources,
  createProjectionResources,
  createProlongationResources,
  createRestrictionResources,
  createScalarAdvectionResources,
  createSourceInjectionResources,
  createVelocityAdvectionResources,
} from './combustion-volume-simulation/resources'
import type { CombustionVolumeSimulation } from './combustion-volume-simulation/types'

export type { CombustionVolumeSimulation } from './combustion-volume-simulation/types'

export function createCombustionVolumeSimulation(
  device: GPUDevice,
): CombustionVolumeSimulation {
  const resolution: VolumeResolution = { width: 48, height: 80, depth: 48 }
  const midResolution = halveResolution(resolution)
  const coarseResolution = halveResolution(midResolution)
  const pipelines = createCombustionSimulationPipelines(device)
  const simulationParamsBuffer = device.createBuffer({
    label: 'simulation-params',
    size: 16,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })

  const scalarA = createScalarFieldBuffers(device, 'scalar-a', voxelCountFor(resolution))
  const scalarB = createScalarFieldBuffers(device, 'scalar-b', voxelCountFor(resolution))
  const velocityCurrent = createStorageBuffer(
    device,
    'velocity-current',
    voxelCountFor(resolution) * 16,
  )
  const velocityScratch = createStorageBuffer(
    device,
    'velocity-scratch',
    voxelCountFor(resolution) * 16,
  )
  const finePressure = createPressureLevel(
    device,
    'fine',
    resolution,
    pipelines.clear,
    pipelines.residual,
    pipelines.pressureSmooth,
  )
  const midPressure = createPressureLevel(
    device,
    'mid',
    midResolution,
    pipelines.clear,
    pipelines.residual,
    pipelines.pressureSmooth,
  )
  const coarsePressure = createPressureLevel(
    device,
    'coarse',
    coarseResolution,
    pipelines.clear,
    pipelines.residual,
    pipelines.pressureSmooth,
  )

  const sourceInjectionA = createSourceInjectionResources(
    device,
    pipelines.sourceInjection,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarA,
  )
  const sourceInjectionB = createSourceInjectionResources(
    device,
    pipelines.sourceInjection,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarB,
  )
  const combustionPassA = createCombustionResources(
    device,
    pipelines.combustion,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarA,
  )
  const combustionPassB = createCombustionResources(
    device,
    pipelines.combustion,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarB,
  )
  const buoyancyPassA = createBuoyancyResources(
    device,
    pipelines.buoyancy,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarA,
    velocityCurrent,
  )
  const buoyancyPassB = createBuoyancyResources(
    device,
    pipelines.buoyancy,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarB,
    velocityCurrent,
  )
  const velocityAdvectPass = createVelocityAdvectionResources(
    device,
    pipelines.velocityAdvection,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    velocityCurrent,
    velocityScratch,
  )
  const scalarAdvectAtoB = createScalarAdvectionResources(
    device,
    pipelines.scalarAdvection,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarA,
    velocityCurrent,
    scalarB,
  )
  const scalarAdvectBtoA = createScalarAdvectionResources(
    device,
    pipelines.scalarAdvection,
    simulationParamsBuffer,
    finePressure.volumeInfoBuffer,
    scalarB,
    velocityCurrent,
    scalarA,
  )
  const divergencePass = createDivergenceResources(
    device,
    pipelines.divergence,
    finePressure.volumeInfoBuffer,
    velocityScratch,
    finePressure.divergence,
  )
  const restrictFineToMid = createRestrictionResources(
    device,
    pipelines.restrict,
    finePressure.volumeInfoBuffer,
    midPressure.volumeInfoBuffer,
    finePressure.divergence,
    midPressure.divergence,
  )
  const restrictMidToCoarse = createRestrictionResources(
    device,
    pipelines.restrict,
    midPressure.volumeInfoBuffer,
    coarsePressure.volumeInfoBuffer,
    midPressure.divergence,
    coarsePressure.divergence,
  )
  const prolongateCoarseAToMid = createProlongationResources(
    device,
    pipelines.prolongate,
    coarsePressure.volumeInfoBuffer,
    midPressure.volumeInfoBuffer,
    coarsePressure.pressureA,
    midPressure.pressureA,
  )
  const prolongateCoarseBToMid = createProlongationResources(
    device,
    pipelines.prolongate,
    coarsePressure.volumeInfoBuffer,
    midPressure.volumeInfoBuffer,
    coarsePressure.pressureB,
    midPressure.pressureA,
  )
  const prolongateMidAToFine = createProlongationResources(
    device,
    pipelines.prolongate,
    midPressure.volumeInfoBuffer,
    finePressure.volumeInfoBuffer,
    midPressure.pressureA,
    finePressure.pressureA,
  )
  const prolongateMidBToFine = createProlongationResources(
    device,
    pipelines.prolongate,
    midPressure.volumeInfoBuffer,
    finePressure.volumeInfoBuffer,
    midPressure.pressureB,
    finePressure.pressureA,
  )
  const projectFineFromA = createProjectionResources(
    device,
    pipelines.projection,
    finePressure.volumeInfoBuffer,
    velocityScratch,
    finePressure.pressureA,
    velocityCurrent,
  )
  const projectFineFromB = createProjectionResources(
    device,
    pipelines.projection,
    finePressure.volumeInfoBuffer,
    velocityScratch,
    finePressure.pressureB,
    velocityCurrent,
  )

  const initClears = [
    createClearResources(device, pipelines.clear, scalarA.density),
    createClearResources(device, pipelines.clear, scalarA.temperature),
    createClearResources(device, pipelines.clear, scalarA.fuel),
    createClearResources(device, pipelines.clear, scalarA.turbulence),
    createClearResources(device, pipelines.clear, scalarB.density),
    createClearResources(device, pipelines.clear, scalarB.temperature),
    createClearResources(device, pipelines.clear, scalarB.fuel),
    createClearResources(device, pipelines.clear, scalarB.turbulence),
    createClearResources(device, pipelines.clear, velocityCurrent),
    createClearResources(device, pipelines.clear, velocityScratch),
    finePressure.clearDivergence,
    finePressure.clearPressureA,
    finePressure.clearPressureB,
    midPressure.clearDivergence,
    midPressure.clearPressureA,
    midPressure.clearPressureB,
    coarsePressure.clearDivergence,
    coarsePressure.clearPressureA,
    coarsePressure.clearPressureB,
  ]
  const initEncoder = device.createCommandEncoder({
    label: 'initialize-combustion-simulation',
  })

  for (const resource of initClears) {
    const voxelCount = resource === midPressure.clearDivergence || resource === midPressure.clearPressureA || resource === midPressure.clearPressureB
      ? midPressure.voxelCount
      : resource === coarsePressure.clearDivergence || resource === coarsePressure.clearPressureA || resource === coarsePressure.clearPressureB
        ? coarsePressure.voxelCount
        : finePressure.voxelCount

    runClearPass(initEncoder, resource, voxelCount)
  }

  device.queue.submit([initEncoder.finish()])

  let currentScalarSet = 0
  let initialized = false
  let lastElapsedSeconds = 0

  return {
    resolution,
    step(encoder, elapsedSeconds, stepSeconds) {
      if (!initialized) {
        initialized = true
        lastElapsedSeconds = elapsedSeconds
      }

      const effectiveStep = Math.max(1 / 120, Math.min(stepSeconds, 1 / 30))
      const timeData = new Float32Array([
        elapsedSeconds,
        effectiveStep,
        lastElapsedSeconds,
        currentScalarSet,
      ])

      device.queue.writeBuffer(simulationParamsBuffer, 0, timeData)

      runClearPass(encoder, finePressure.clearPressureA, finePressure.voxelCount)
      runClearPass(encoder, finePressure.clearPressureB, finePressure.voxelCount)
      runClearPass(encoder, midPressure.clearDivergence, midPressure.voxelCount)
      runClearPass(encoder, midPressure.clearPressureA, midPressure.voxelCount)
      runClearPass(encoder, midPressure.clearPressureB, midPressure.voxelCount)
      runClearPass(encoder, coarsePressure.clearDivergence, coarsePressure.voxelCount)
      runClearPass(encoder, coarsePressure.clearPressureA, coarsePressure.voxelCount)
      runClearPass(encoder, coarsePressure.clearPressureB, coarsePressure.voxelCount)

      runVolumePass(
        encoder,
        'inject-combustion-sources-pass',
        currentScalarSet === 0 ? sourceInjectionA : sourceInjectionB,
        resolution,
      )
      runVolumePass(
        encoder,
        'update-combustion-state-pass',
        currentScalarSet === 0 ? combustionPassA : combustionPassB,
        resolution,
      )
      runVolumePass(
        encoder,
        'apply-buoyancy-force-pass',
        currentScalarSet === 0 ? buoyancyPassA : buoyancyPassB,
        resolution,
      )
      runVolumePass(
        encoder,
        'advect-velocity-field-pass',
        velocityAdvectPass,
        resolution,
      )
      runVolumePass(
        encoder,
        'compute-divergence-pass',
        divergencePass,
        finePressure.resolution,
      )

      const finePreSmoothBuffer = runPressureSmoothSequence(
        encoder,
        finePressure,
        PRESSURE_PRE_SMOOTH_FINE,
        'a',
      )
      runVolumePass(
        encoder,
        'compute-pressure-residual-pass',
        finePreSmoothBuffer === 'a' ? finePressure.residualFromA : finePressure.residualFromB,
        finePressure.resolution,
      )
      runVolumePass(
        encoder,
        'restrict-pressure-pass',
        restrictFineToMid,
        midPressure.resolution,
      )

      const midPreSmoothBuffer = runPressureSmoothSequence(
        encoder,
        midPressure,
        PRESSURE_PRE_SMOOTH_MID,
        'a',
      )
      runVolumePass(
        encoder,
        'compute-pressure-residual-pass',
        midPreSmoothBuffer === 'a' ? midPressure.residualFromA : midPressure.residualFromB,
        midPressure.resolution,
      )
      runVolumePass(
        encoder,
        'restrict-pressure-pass',
        restrictMidToCoarse,
        coarsePressure.resolution,
      )

      const coarseBuffer = runPressureSmoothSequence(
        encoder,
        coarsePressure,
        PRESSURE_SMOOTH_COARSE,
        'a',
      )
      runVolumePass(
        encoder,
        'prolongate-pressure-pass',
        coarseBuffer === 'a' ? prolongateCoarseAToMid : prolongateCoarseBToMid,
        midPressure.resolution,
      )

      const midBuffer = runPressureSmoothSequence(
        encoder,
        midPressure,
        PRESSURE_POST_SMOOTH_MID,
        midPreSmoothBuffer,
      )
      runVolumePass(
        encoder,
        'prolongate-pressure-pass',
        midBuffer === 'a' ? prolongateMidAToFine : prolongateMidBToFine,
        finePressure.resolution,
      )

      const fineBuffer = runPressureSmoothSequence(
        encoder,
        finePressure,
        PRESSURE_POST_SMOOTH_FINE,
        finePreSmoothBuffer,
      )
      runVolumePass(
        encoder,
        'project-velocity-pass',
        fineBuffer === 'a' ? projectFineFromA : projectFineFromB,
        finePressure.resolution,
      )
      runVolumePass(
        encoder,
        'advect-scalar-fields-pass',
        currentScalarSet === 0 ? scalarAdvectAtoB : scalarAdvectBtoA,
        resolution,
      )

      currentScalarSet = currentScalarSet === 0 ? 1 : 0
      lastElapsedSeconds = elapsedSeconds
    },
    getRenderBuffers() {
      return currentScalarSet === 0 ? scalarA : scalarB
    },
    dispose() {
      simulationParamsBuffer.destroy()
      destroyScalarFieldBuffers(scalarA)
      destroyScalarFieldBuffers(scalarB)
      velocityCurrent.destroy()
      velocityScratch.destroy()
      destroyPressureLevel(finePressure)
      destroyPressureLevel(midPressure)
      destroyPressureLevel(coarsePressure)
    },
  }
}

