import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'
import type { DenseScalarField } from '../fields/createDenseScalarField'
import { fillDenseScalarField, swapDenseScalarFieldValues } from '../fields/createDenseScalarField'
import type { DenseVectorField } from '../fields/createDenseVectorField'
import { enforceBoundaryVelocity } from './advectVelocityField'

interface SolvePressureOptions {
  domain: DenseVolumeDomain
  velocity: DenseVectorField
  pressure: DenseScalarField
  pressureScratch: DenseScalarField
  divergence: DenseScalarField
  iterations: number
}

export function solvePressure({
  domain,
  velocity,
  pressure,
  pressureScratch,
  divergence,
  iterations,
}: SolvePressureOptions) {
  computeDivergence(domain, velocity, divergence.values)
  fillDenseScalarField(pressure, 0)
  fillDenseScalarField(pressureScratch, 0)

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    jacobiPressureIteration(domain, pressure.values, divergence.values, pressureScratch.values)
    swapDenseScalarFieldValues(pressure, pressureScratch)
  }

  projectVelocity(domain, velocity, pressure.values)
  enforceBoundaryVelocity(domain, velocity)
}

function computeDivergence(
  domain: DenseVolumeDomain,
  velocity: DenseVectorField,
  divergence: Float32Array,
) {
  for (let z = 0; z < domain.depth; z += 1) {
    for (let y = 0; y < domain.height; y += 1) {
      for (let x = 0; x < domain.width; x += 1) {
        const index = domain.index(x, y, z)

        if (domain.isBoundaryCell(x, y, z)) {
          divergence[index] = 0
          continue
        }

        const divergenceX =
          velocity.x[domain.index(x + 1, y, z)] - velocity.x[domain.index(x - 1, y, z)]
        const divergenceY =
          velocity.y[domain.index(x, y + 1, z)] - velocity.y[domain.index(x, y - 1, z)]
        const divergenceZ =
          velocity.z[domain.index(x, y, z + 1)] - velocity.z[domain.index(x, y, z - 1)]

        divergence[index] = (divergenceX + divergenceY + divergenceZ) * 0.5
      }
    }
  }
}

function jacobiPressureIteration(
  domain: DenseVolumeDomain,
  pressure: Float32Array,
  divergence: Float32Array,
  target: Float32Array,
) {
  for (let z = 0; z < domain.depth; z += 1) {
    for (let y = 0; y < domain.height; y += 1) {
      for (let x = 0; x < domain.width; x += 1) {
        const index = domain.index(x, y, z)

        if (domain.isBoundaryCell(x, y, z)) {
          target[index] = 0
          continue
        }

        const neighborSum =
          pressure[domain.index(x + 1, y, z)] +
          pressure[domain.index(x - 1, y, z)] +
          pressure[domain.index(x, y + 1, z)] +
          pressure[domain.index(x, y - 1, z)] +
          pressure[domain.index(x, y, z + 1)] +
          pressure[domain.index(x, y, z - 1)]

        target[index] = (neighborSum - divergence[index]) / 6
      }
    }
  }
}

function projectVelocity(
  domain: DenseVolumeDomain,
  velocity: DenseVectorField,
  pressure: Float32Array,
) {
  for (let z = 1; z < domain.depth - 1; z += 1) {
    for (let y = 1; y < domain.height - 1; y += 1) {
      for (let x = 1; x < domain.width - 1; x += 1) {
        const index = domain.index(x, y, z)
        const gradientX = pressure[domain.index(x + 1, y, z)] - pressure[domain.index(x - 1, y, z)]
        const gradientY = pressure[domain.index(x, y + 1, z)] - pressure[domain.index(x, y - 1, z)]
        const gradientZ = pressure[domain.index(x, y, z + 1)] - pressure[domain.index(x, y, z - 1)]

        velocity.x[index] -= gradientX * 0.5
        velocity.y[index] -= gradientY * 0.5
        velocity.z[index] -= gradientZ * 0.5
      }
    }
  }
}
