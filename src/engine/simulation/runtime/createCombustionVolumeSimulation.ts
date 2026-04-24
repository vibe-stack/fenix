import type { VolumeResolution } from '../common/volumeResolution'
import { createSparseBrickLayout, packSparseBrickLayout } from '../sparse/createSparseBrickLayout'
import {
  createStaticBuffer,
  createScalarFieldBuffers,
  createStorageBuffer,
  destroyScalarFieldBuffers,
  voxelCountFor,
} from './combustion-volume-simulation/buffers'
import { GPU_BUFFER_COPY_DST, GPU_BUFFER_UNIFORM } from './combustion-volume-simulation/constants'
import { createSimulationPerformanceSchedule } from './combustion-volume-simulation/performance'
import type {
  CombustionVolumeSimulation,
  PressureBufferId,
  ScalarAdvectionMode,
} from './combustion-volume-simulation/types'
import { ActiveBricksPass } from './passes/ActiveBricksPass'
import { BuoyancyPass } from './passes/BuoyancyPass'
import { ClearPass } from './passes/ClearPass'
import { CombustionPass } from './passes/CombustionPass'
import { DebugFieldsPass } from './passes/DebugFieldsPass'
import { DivergencePass } from './passes/DivergencePass'
import { PressureSolvePass } from './passes/PressureSolvePass'
import { ProjectionPass } from './passes/ProjectionPass'
import { ScalarAdvectionPass } from './passes/ScalarAdvectionPass'
import { SourceInjectionPass } from './passes/SourceInjectionPass'
import { VelocityAdvectionPass } from './passes/VelocityAdvectionPass'
import { VorticityConfinementPass } from './passes/VorticityConfinementPass'
import { VorticityPass } from './passes/VorticityPass'

export type { CombustionVolumeSimulation } from './combustion-volume-simulation/types'

export interface CombustionVolumeSimulationOptions {
  scalarAdvectionMode?: ScalarAdvectionMode
  resolution?: VolumeResolution
  wind?: readonly [number, number, number]
  windStrength?: number
}

export function createCombustionVolumeSimulation(
  device: GPUDevice,
  options: CombustionVolumeSimulationOptions = {},
): CombustionVolumeSimulation {
  const resolution = options.resolution ?? { width: 128, height: 256, depth: 128 }
  const voxelCount = voxelCountFor(resolution)
  const sparseLayout = createSparseBrickLayout(resolution)
  const simulationParamsBuffer = device.createBuffer({
    label: 'simulation-params',
    size: 48,
    usage: GPU_BUFFER_UNIFORM | GPU_BUFFER_COPY_DST,
  })
  const scalarA = createScalarFieldBuffers(device, 'scalar-a', voxelCount)
  const scalarB = createScalarFieldBuffers(device, 'scalar-b', voxelCount)
  const scalarFields = [scalarA, scalarB] as const
  const velocityCurrent = createStorageBuffer(device, 'velocity-current', voxelCount * 16)
  const velocityScratch = createStorageBuffer(device, 'velocity-scratch', voxelCount * 16)
  const vorticity = createStorageBuffer(device, 'vorticity-field', voxelCount * 16)
  const vorticityMagnitude = createStorageBuffer(device, 'vorticity-magnitude', voxelCount * 4)
  const confinementForceMagnitude = createStorageBuffer(device, 'confinement-force-magnitude', voxelCount * 4)
  const velocityMagnitude = createStorageBuffer(device, 'velocity-magnitude', voxelCount * 4)
  const activeBrickFlagsA = createStorageBuffer(
    device,
    'active-sparse-brick-flags-a',
    sparseLayout.brickCount * 4,
  )
  const activeBrickFlagsB = createStorageBuffer(
    device,
    'active-sparse-brick-flags-b',
    sparseLayout.brickCount * 4,
  )
  const activeBrickFlags = [activeBrickFlagsA, activeBrickFlagsB] as const
  const activeBrickInfo = createStaticBuffer(
    device,
    'active-sparse-brick-info',
    packSparseBrickLayout(sparseLayout),
  )
  const pressureSolve = new PressureSolvePass(device, resolution)
  const volumeInfo = pressureSolve.fine.volumeInfoBuffer
  const sourceInjection = new SourceInjectionPass(
    device,
    simulationParamsBuffer,
    volumeInfo,
    scalarFields,
    velocityCurrent,
  )
  const velocityAdvection = new VelocityAdvectionPass(
    device,
    simulationParamsBuffer,
    volumeInfo,
    velocityCurrent,
    velocityScratch,
  )
  const scalarAdvection = new ScalarAdvectionPass(
    device,
    simulationParamsBuffer,
    volumeInfo,
    scalarFields,
    velocityScratch,
    activeBrickFlags,
    activeBrickInfo,
  )
  const buoyancyPass = new BuoyancyPass(
    device,
    simulationParamsBuffer,
    volumeInfo,
    scalarFields,
    velocityScratch,
    activeBrickFlags,
    activeBrickInfo,
  )
  const vorticityPass = new VorticityPass(
    device,
    volumeInfo,
    velocityScratch,
    vorticity,
    vorticityMagnitude,
  )
  const confinement = new VorticityConfinementPass(
    device,
    simulationParamsBuffer,
    volumeInfo,
    vorticity,
    vorticityMagnitude,
    velocityScratch,
    confinementForceMagnitude,
  )
  const combustion = new CombustionPass(
    device,
    simulationParamsBuffer,
    volumeInfo,
    scalarFields,
    activeBrickFlags,
    activeBrickInfo,
  )
  const divergence = new DivergencePass(device, volumeInfo, velocityScratch, pressureSolve.fine.divergence)
  const projection = new ProjectionPass(device, pressureSolve.fine, velocityScratch, velocityCurrent)
  const debugFields = new DebugFieldsPass(device, volumeInfo, velocityCurrent, velocityMagnitude)
  const activeBricks = new ActiveBricksPass(
    device,
    volumeInfo,
    activeBrickInfo,
    scalarFields,
    activeBrickFlags,
  )
  const clear = new ClearPass(device)
  const initEncoder = device.createCommandEncoder({ label: 'initialize-combustion-simulation' })

  clearScalarSet(initEncoder, clear, scalarA, voxelCount)
  clearScalarSet(initEncoder, clear, scalarB, voxelCount)
  clear.clear(initEncoder, velocityCurrent, voxelCount * 4)
  clear.clear(initEncoder, velocityScratch, voxelCount * 4)
  clear.clear(initEncoder, vorticity, voxelCount * 4)
  clear.clear(initEncoder, vorticityMagnitude, voxelCount)
  clear.clear(initEncoder, confinementForceMagnitude, voxelCount)
  clear.clear(initEncoder, velocityMagnitude, voxelCount)
  clear.clear(initEncoder, activeBrickFlagsA, sparseLayout.brickCount)
  clear.clear(initEncoder, activeBrickFlagsB, sparseLayout.brickCount)
  pressureSolve.clear(initEncoder)
  device.queue.submit([initEncoder.finish()])

  let currentScalarSet = 0
  let scalarAdvectionMode = options.scalarAdvectionMode ?? 'maccormack'
  let performanceSchedule = createSimulationPerformanceSchedule(resolution, scalarAdvectionMode)
  let initialized = false
  let simulationStartSeconds = 0
  let lastElapsedSeconds = 0
  let lastPressureBuffer: PressureBufferId = 'a'
  let debugRequested = false
  let simulationStepIndex = 0
  const shouldRunDebugEachFrame = voxelCount < 1_800_000
  let wind: [number, number, number] = options.wind ? [options.wind[0], options.wind[1], options.wind[2]] : [0.18, 0.0, -0.07]
  let windStrength = options.windStrength ?? 0.74
  let buoyancy = 3.6
  let vorticityStrength = 2.15

  function doReset(atSeconds: number) {
    currentScalarSet = 0
    simulationStepIndex = 0
    lastPressureBuffer = 'a'
    initialized = false
    simulationStartSeconds = atSeconds
    lastElapsedSeconds = atSeconds
    const enc = device.createCommandEncoder({ label: 'reset-combustion-simulation' })
    clearScalarSet(enc, clear, scalarA, voxelCount)
    clearScalarSet(enc, clear, scalarB, voxelCount)
    clear.clear(enc, velocityCurrent, voxelCount * 4)
    clear.clear(enc, velocityScratch, voxelCount * 4)
    clear.clear(enc, vorticity, voxelCount * 4)
    clear.clear(enc, vorticityMagnitude, voxelCount)
    clear.clear(enc, confinementForceMagnitude, voxelCount)
    clear.clear(enc, velocityMagnitude, voxelCount)
    clear.clear(enc, activeBrickFlagsA, sparseLayout.brickCount)
    clear.clear(enc, activeBrickFlagsB, sparseLayout.brickCount)
    pressureSolve.clear(enc)
    device.queue.submit([enc.finish()])
  }

  return {
    resolution,
    step(encoder, elapsedSeconds, stepSeconds) {
      if (!initialized) {
        initialized = true
        simulationStartSeconds = elapsedSeconds
        lastElapsedSeconds = elapsedSeconds
      }

      const effectiveStep = Math.max(1 / 120, Math.min(stepSeconds, 1 / 30))
      const localTime = elapsedSeconds - simulationStartSeconds
      const previousLocalTime = lastElapsedSeconds - simulationStartSeconds
      device.queue.writeBuffer(
        simulationParamsBuffer,
        0,
        new Float32Array([
          localTime,
          effectiveStep,
          previousLocalTime,
          currentScalarSet,
          wind[0],
          wind[1],
          wind[2],
          windStrength,
          buoyancy,
          vorticityStrength,
          0, 0, // padding
        ]),
      )

      const nextScalarSet = currentScalarSet === 0 ? 1 : 0

      sourceInjection.dispatch(encoder, resolution, currentScalarSet)
      clear.clear(encoder, activeBrickFlags[currentScalarSet], sparseLayout.brickCount)
      activeBricks.dispatch(encoder, sparseLayout, currentScalarSet)
      velocityAdvection.dispatch(encoder, resolution)
      scalarAdvection.dispatch(
        encoder,
        resolution,
        currentScalarSet,
        performanceSchedule.scalarAdvectionMode,
      )
      clear.clear(encoder, activeBrickFlags[nextScalarSet], sparseLayout.brickCount)
      activeBricks.dispatch(encoder, sparseLayout, nextScalarSet)
      buoyancyPass.dispatch(encoder, resolution, nextScalarSet)

      if (simulationStepIndex % performanceSchedule.vorticityInterval === 0) {
        vorticityPass.dispatch(encoder, resolution)
        confinement.dispatch(encoder, resolution)
      }

      combustion.dispatch(encoder, resolution, nextScalarSet)

      if (simulationStepIndex % performanceSchedule.pressureInterval === 0) {
        pressureSolve.clear(encoder)
        divergence.dispatch(encoder, pressureSolve.fine.resolution)
        lastPressureBuffer = pressureSolve.solve(encoder)
      }

      projection.dispatch(encoder, pressureSolve.fine, lastPressureBuffer)

      if (shouldRunDebugEachFrame || debugRequested) {
        debugFields.dispatch(encoder, resolution)
        debugRequested = false
      }
      currentScalarSet = nextScalarSet
      lastElapsedSeconds = elapsedSeconds
      simulationStepIndex += 1
    },
    getRenderBuffers() {
      return {
        ...scalarFields[currentScalarSet],
        activeBrickFlags: activeBrickFlags[currentScalarSet],
        activeBrickInfo,
      }
    },
    getDebugBuffers() {
      const fields = scalarFields[currentScalarSet]

      debugRequested = true

      return {
        ...fields,
        velocityMagnitude,
        divergence: pressureSolve.fine.divergence,
        pressure: lastPressureBuffer === 'a' ? pressureSolve.fine.pressureA : pressureSolve.fine.pressureB,
        vorticityMagnitude,
        confinementForceMagnitude,
      }
    },
    getScalarAdvectionMode() {
      return scalarAdvectionMode
    },
    setScalarAdvectionMode(mode) {
      scalarAdvectionMode = mode
      performanceSchedule = createSimulationPerformanceSchedule(resolution, scalarAdvectionMode)
    },
    getRuntimeParams() {
      return { wind: [...wind] as [number, number, number], windStrength, buoyancy, vorticityStrength }
    },
    setRuntimeParams(params) {
      if (params.wind !== undefined) wind = [params.wind[0], params.wind[1], params.wind[2]]
      if (params.windStrength !== undefined) windStrength = params.windStrength
      if (params.buoyancy !== undefined) buoyancy = params.buoyancy
      if (params.vorticityStrength !== undefined) vorticityStrength = params.vorticityStrength
    },
    reset() {
      doReset(lastElapsedSeconds)
    },
    dispose() {
      simulationParamsBuffer.destroy()
      destroyScalarFieldBuffers(scalarA)
      destroyScalarFieldBuffers(scalarB)
      velocityCurrent.destroy()
      velocityScratch.destroy()
      vorticity.destroy()
      vorticityMagnitude.destroy()
      confinementForceMagnitude.destroy()
      velocityMagnitude.destroy()
      activeBrickFlagsA.destroy()
      activeBrickFlagsB.destroy()
      activeBrickInfo.destroy()
      sourceInjection.dispose()
      pressureSolve.dispose()
    },
  }
}

function clearScalarSet(
  encoder: GPUCommandEncoder,
  clear: ClearPass,
  fields: ReturnType<typeof createScalarFieldBuffers>,
  voxelCount: number,
) {
  clear.clear(encoder, fields.density, voxelCount)
  clear.clear(encoder, fields.temperature, voxelCount)
  clear.clear(encoder, fields.fuel, voxelCount)
  clear.clear(encoder, fields.reaction, voxelCount)
}
