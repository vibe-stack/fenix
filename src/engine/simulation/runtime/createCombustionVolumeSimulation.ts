import type { VolumeResolution } from '../common/volumeResolution'
import {
  createScalarFieldBuffers,
  createStorageBuffer,
  destroyScalarFieldBuffers,
  voxelCountFor,
} from './combustion-volume-simulation/buffers'
import { GPU_BUFFER_COPY_DST, GPU_BUFFER_UNIFORM } from './combustion-volume-simulation/constants'
import type {
  CombustionVolumeSimulation,
  PressureBufferId,
  ScalarAdvectionMode,
} from './combustion-volume-simulation/types'
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
}

export function createCombustionVolumeSimulation(
  device: GPUDevice,
  options: CombustionVolumeSimulationOptions = {},
): CombustionVolumeSimulation {
  const resolution: VolumeResolution = { width: 48, height: 80, depth: 48 }
  const voxelCount = voxelCountFor(resolution)
  const simulationParamsBuffer = device.createBuffer({
    label: 'simulation-params',
    size: 16,
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
  const pressureSolve = new PressureSolvePass(device, resolution)
  const volumeInfo = pressureSolve.fine.volumeInfoBuffer
  const sourceInjection = new SourceInjectionPass(device, simulationParamsBuffer, volumeInfo, scalarFields)
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
  )
  const buoyancy = new BuoyancyPass(device, simulationParamsBuffer, volumeInfo, scalarFields, velocityScratch)
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
  const combustion = new CombustionPass(device, simulationParamsBuffer, volumeInfo, scalarFields)
  const divergence = new DivergencePass(device, volumeInfo, velocityScratch, pressureSolve.fine.divergence)
  const projection = new ProjectionPass(device, pressureSolve.fine, velocityScratch, velocityCurrent)
  const debugFields = new DebugFieldsPass(device, volumeInfo, velocityCurrent, velocityMagnitude)
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
  pressureSolve.clear(initEncoder)
  device.queue.submit([initEncoder.finish()])

  let currentScalarSet = 0
  let scalarAdvectionMode = options.scalarAdvectionMode ?? 'maccormack'
  let initialized = false
  let lastElapsedSeconds = 0
  let lastPressureBuffer: PressureBufferId = 'a'

  return {
    resolution,
    step(encoder, elapsedSeconds, stepSeconds) {
      if (!initialized) {
        initialized = true
        lastElapsedSeconds = elapsedSeconds
      }

      const effectiveStep = Math.max(1 / 120, Math.min(stepSeconds, 1 / 30))
      device.queue.writeBuffer(simulationParamsBuffer, 0, new Float32Array([
        elapsedSeconds,
        effectiveStep,
        lastElapsedSeconds,
        currentScalarSet,
      ]))

      const nextScalarSet = currentScalarSet === 0 ? 1 : 0

      pressureSolve.clear(encoder)
      sourceInjection.dispatch(encoder, resolution, currentScalarSet)
      velocityAdvection.dispatch(encoder, resolution)
      scalarAdvection.dispatch(encoder, resolution, currentScalarSet, scalarAdvectionMode)
      buoyancy.dispatch(encoder, resolution, nextScalarSet)
      vorticityPass.dispatch(encoder, resolution)
      confinement.dispatch(encoder, resolution)
      combustion.dispatch(encoder, resolution, nextScalarSet)
      divergence.dispatch(encoder, pressureSolve.fine.resolution)
      lastPressureBuffer = pressureSolve.solve(encoder)
      projection.dispatch(encoder, pressureSolve.fine, lastPressureBuffer)
      debugFields.dispatch(encoder, resolution)

      currentScalarSet = nextScalarSet
      lastElapsedSeconds = elapsedSeconds
    },
    getRenderBuffers() {
      return scalarFields[currentScalarSet]
    },
    getDebugBuffers() {
      const fields = scalarFields[currentScalarSet]

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
