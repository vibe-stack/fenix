import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'
import type { DenseVectorField } from '../fields/createDenseVectorField'
import { sampleScalarTrilinear } from '../fields/sampleDenseFields'

interface AdvectVelocityFieldOptions {
  domain: DenseVolumeDomain
  source: DenseVectorField
  transportVelocity: DenseVectorField
  target: DenseVectorField
  stepSeconds: number
  dissipation: number
}

export function advectVelocityField({
  domain,
  source,
  transportVelocity,
  target,
  stepSeconds,
  dissipation,
}: AdvectVelocityFieldOptions) {
  for (let z = 0; z < domain.depth; z += 1) {
    for (let y = 0; y < domain.height; y += 1) {
      for (let x = 0; x < domain.width; x += 1) {
        const index = domain.index(x, y, z)
        const sampleX = x + 0.5 - transportVelocity.x[index] * stepSeconds
        const sampleY = y + 0.5 - transportVelocity.y[index] * stepSeconds
        const sampleZ = z + 0.5 - transportVelocity.z[index] * stepSeconds

        target.x[index] =
          sampleScalarTrilinear(domain, source.x, sampleX, sampleY, sampleZ) * dissipation
        target.y[index] =
          sampleScalarTrilinear(domain, source.y, sampleX, sampleY, sampleZ) * dissipation
        target.z[index] =
          sampleScalarTrilinear(domain, source.z, sampleX, sampleY, sampleZ) * dissipation
      }
    }
  }

  enforceBoundaryVelocity(domain, target)
}

export function enforceBoundaryVelocity(
  domain: DenseVolumeDomain,
  velocity: DenseVectorField,
) {
  for (let z = 0; z < domain.depth; z += 1) {
    for (let y = 0; y < domain.height; y += 1) {
      for (let x = 0; x < domain.width; x += 1) {
        if (!domain.isBoundaryCell(x, y, z)) {
          continue
        }

        const index = domain.index(x, y, z)

        velocity.x[index] = 0
        velocity.y[index] = 0
        velocity.z[index] = 0
      }
    }
  }
}
