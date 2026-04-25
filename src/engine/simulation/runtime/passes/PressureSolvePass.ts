import { createComputePipeline } from '../../../gpu/pipelines/createComputePipeline'
import type { VolumeResolution } from '../../common/volumeResolution'
import { createClearStorageBufferShader } from '../../shaders/passes/clear-storage-buffer.wgsl'
import { createPressureJacobiShader } from '../../shaders/passes/pressure-jacobi.wgsl'
import { createPressureProlongationShader } from '../../shaders/passes/pressure-prolongation.wgsl'
import { createPressureResidualShader } from '../../shaders/passes/pressure-residual.wgsl'
import { createPressureRestrictionShader } from '../../shaders/passes/pressure-restriction.wgsl'
import { createStaticBuffer, createStorageBuffer, halveResolution, voxelCountFor } from '../combustion-volume-simulation/buffers'
import { type PressureIterationSchedule } from '../combustion-volume-simulation/constants'
import type { ComputeResources, PressureBufferId, PressureLevel } from '../combustion-volume-simulation/types'
import { createComputeResources } from '../shared/createComputeResources'
import { dispatchLinear, dispatchVolume } from '../shared/createVolumeDispatch'

export class PressureSolvePass {
  readonly fine: PressureLevel
  readonly mid: PressureLevel
  readonly coarse: PressureLevel

  private readonly restrictFineToMid: ComputeResources
  private readonly restrictMidToCoarse: ComputeResources
  private readonly prolongateCoarse: Record<PressureBufferId, ComputeResources>
  private readonly prolongateMid: Record<PressureBufferId, ComputeResources>
  private iterations: PressureIterationSchedule

  constructor(device: GPUDevice, resolution: VolumeResolution, iterations: PressureIterationSchedule) {
    const clear = createComputePipeline(device, 'clear-storage-buffer', 'clear-storage-buffer-shader', createClearStorageBufferShader())
    const residual = createComputePipeline(device, 'compute-pressure-residual-local', 'pressure-residual-shader', createPressureResidualShader())
    const jacobi = createComputePipeline(device, 'smooth-pressure-local', 'pressure-jacobi-shader', createPressureJacobiShader())
    const restrict = createComputePipeline(device, 'restrict-pressure-residual', 'pressure-restriction-shader', createPressureRestrictionShader())
    const prolongate = createComputePipeline(device, 'prolongate-pressure', 'pressure-prolongation-shader', createPressureProlongationShader())

    this.fine = createLevel(device, 'fine', resolution, clear, residual, jacobi)
  this.iterations = iterations
    this.mid = createLevel(device, 'mid', halveResolution(resolution), clear, residual, jacobi)
    this.coarse = createLevel(device, 'coarse', halveResolution(this.mid.resolution), clear, residual, jacobi)
    this.restrictFineToMid = createComputeResources(device, restrict, 'restrict-fine-to-mid', [
      this.fine.volumeInfoBuffer,
      this.mid.volumeInfoBuffer,
      this.fine.divergence,
      this.mid.divergence,
    ])
    this.restrictMidToCoarse = createComputeResources(device, restrict, 'restrict-mid-to-coarse', [
      this.mid.volumeInfoBuffer,
      this.coarse.volumeInfoBuffer,
      this.mid.divergence,
      this.coarse.divergence,
    ])
    this.prolongateCoarse = {
      a: createProlongation(device, prolongate, this.coarse, this.mid, this.coarse.pressureA),
      b: createProlongation(device, prolongate, this.coarse, this.mid, this.coarse.pressureB),
    }
    this.prolongateMid = {
      a: createProlongation(device, prolongate, this.mid, this.fine, this.mid.pressureA),
      b: createProlongation(device, prolongate, this.mid, this.fine, this.mid.pressureB),
    }
  }

  setIterationSchedule(iterations: PressureIterationSchedule) {
    this.iterations = iterations
  }

  clear(encoder: GPUCommandEncoder) {
    for (const level of [this.fine, this.mid, this.coarse]) {
      dispatchLinear(encoder, 'clear-pressure-a-pass', level.clearPressureA, level.voxelCount)
    }
  }

  solve(encoder: GPUCommandEncoder): PressureBufferId {
    const finePre = smooth(encoder, this.fine, this.iterations.finePre, 'a')
    dispatchVolume(encoder, 'compute-pressure-residual-pass', residualResources(this.fine, finePre), this.fine.resolution)
    dispatchVolume(encoder, 'restrict-pressure-pass', this.restrictFineToMid, this.mid.resolution)

    const midPre = smooth(encoder, this.mid, this.iterations.midPre, 'a')
    dispatchVolume(encoder, 'compute-pressure-residual-pass', residualResources(this.mid, midPre), this.mid.resolution)
    dispatchVolume(encoder, 'restrict-pressure-pass', this.restrictMidToCoarse, this.coarse.resolution)

    const coarse = smooth(encoder, this.coarse, this.iterations.coarse, 'a')
    dispatchVolume(encoder, 'prolongate-pressure-pass', this.prolongateCoarse[coarse], this.mid.resolution)

    const mid = smooth(encoder, this.mid, this.iterations.midPost, midPre)
    dispatchVolume(encoder, 'prolongate-pressure-pass', this.prolongateMid[mid], this.fine.resolution)

    return smooth(encoder, this.fine, this.iterations.finePost, finePre)
  }

  dispose() {
    destroyLevel(this.fine)
    destroyLevel(this.mid)
    destroyLevel(this.coarse)
  }
}

function createLevel(
  device: GPUDevice,
  label: string,
  resolution: VolumeResolution,
  clear: GPUComputePipeline,
  residual: GPUComputePipeline,
  jacobi: GPUComputePipeline,
): PressureLevel {
  const voxelCount = voxelCountFor(resolution)
  const volumeInfo = createStaticBuffer(device, `${label}-volume-info`, new Uint32Array([
    resolution.width,
    resolution.height,
    resolution.depth,
    voxelCount,
  ]))
  const divergence = createStorageBuffer(device, `${label}-divergence`, voxelCount * 4)
  const pressureA = createStorageBuffer(device, `${label}-pressure-a`, voxelCount * 4)
  const pressureB = createStorageBuffer(device, `${label}-pressure-b`, voxelCount * 4)

  return {
    resolution,
    voxelCount,
    volumeInfoBuffer: volumeInfo,
    divergence,
    pressureA,
    pressureB,
    clearDivergence: createComputeResources(device, clear, `${label}-clear-divergence`, [divergence]),
    clearPressureA: createComputeResources(device, clear, `${label}-clear-pressure-a`, [pressureA]),
    clearPressureB: createComputeResources(device, clear, `${label}-clear-pressure-b`, [pressureB]),
    residualFromA: createComputeResources(device, residual, `${label}-residual-a`, [volumeInfo, divergence, pressureA, pressureB]),
    residualFromB: createComputeResources(device, residual, `${label}-residual-b`, [volumeInfo, divergence, pressureB, pressureA]),
    smoothAB: createComputeResources(device, jacobi, `${label}-smooth-ab`, [volumeInfo, divergence, pressureA, pressureB]),
    smoothBA: createComputeResources(device, jacobi, `${label}-smooth-ba`, [volumeInfo, divergence, pressureB, pressureA]),
  }
}

function smooth(
  encoder: GPUCommandEncoder,
  level: PressureLevel,
  iterations: number,
  startingBuffer: PressureBufferId,
): PressureBufferId {
  let active = startingBuffer

  for (let index = 0; index < iterations; index += 1) {
    dispatchVolume(encoder, 'smooth-pressure-pass', active === 'a' ? level.smoothAB : level.smoothBA, level.resolution)
    active = active === 'a' ? 'b' : 'a'
  }

  return active
}

function createProlongation(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  coarse: PressureLevel,
  fine: PressureLevel,
  source: GPUBuffer,
) {
  return createComputeResources(device, pipeline, `${source.label}-prolongate`, [
    coarse.volumeInfoBuffer,
    fine.volumeInfoBuffer,
    source,
    fine.pressureA,
  ])
}

function residualResources(level: PressureLevel, source: PressureBufferId) {
  return source === 'a' ? level.residualFromA : level.residualFromB
}

function destroyLevel(level: PressureLevel) {
  level.volumeInfoBuffer.destroy()
  level.divergence.destroy()
  level.pressureA.destroy()
  level.pressureB.destroy()
}
