import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'
import type { DenseScalarField } from '../fields/createDenseScalarField'
import type { DenseVectorField } from '../fields/createDenseVectorField'
import { sampleScalarTrilinear } from '../fields/sampleDenseFields'

interface AdvectScalarFieldOptions {
  domain: DenseVolumeDomain
  source: DenseScalarField
  velocity: DenseVectorField
  target: DenseScalarField
  stepSeconds: number
  dissipation: number
}

export function advectScalarField({
  domain,
  source,
  velocity,
  target,
  stepSeconds,
  dissipation,
}: AdvectScalarFieldOptions) {
  for (let z = 0; z < domain.depth; z += 1) {
    for (let y = 0; y < domain.height; y += 1) {
      for (let x = 0; x < domain.width; x += 1) {
        const index = domain.index(x, y, z)
        const sampleX = x + 0.5 - velocity.x[index] * stepSeconds
        const sampleY = y + 0.5 - velocity.y[index] * stepSeconds
        const sampleZ = z + 0.5 - velocity.z[index] * stepSeconds

        target.values[index] =
          sampleScalarTrilinear(domain, source.values, sampleX, sampleY, sampleZ) * dissipation
      }
    }
  }
}
