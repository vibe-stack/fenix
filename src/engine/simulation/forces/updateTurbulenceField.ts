import { fbm3D } from '../../core/math/noise'
import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'
import type { DenseScalarField } from '../fields/createDenseScalarField'
import type { DenseVectorField } from '../fields/createDenseVectorField'

interface UpdateTurbulenceFieldOptions {
  domain: DenseVolumeDomain
  velocity: DenseVectorField
  temperature: DenseScalarField
  turbulence: DenseScalarField
  elapsedSeconds: number
}

export function updateTurbulenceField({
  domain,
  velocity,
  temperature,
  turbulence,
  elapsedSeconds,
}: UpdateTurbulenceFieldOptions) {
  for (let z = 1; z < domain.depth - 1; z += 1) {
    const normalizedZ = z / (domain.depth - 1)
    const localZ = normalizedZ * 2 - 1

    for (let y = 1; y < domain.height - 1; y += 1) {
      const normalizedY = y / (domain.height - 1)

      for (let x = 1; x < domain.width - 1; x += 1) {
        const normalizedX = x / (domain.width - 1)
        const localX = normalizedX * 2 - 1
        const index = domain.index(x, y, z)
        const wx =
          (velocity.z[domain.index(x, y + 1, z)] - velocity.z[domain.index(x, y - 1, z)] -
            velocity.y[domain.index(x, y, z + 1)] +
            velocity.y[domain.index(x, y, z - 1)]) * 0.5
        const wy =
          (velocity.x[domain.index(x, y, z + 1)] - velocity.x[domain.index(x, y, z - 1)] -
            velocity.z[domain.index(x + 1, y, z)] +
            velocity.z[domain.index(x - 1, y, z)]) * 0.5
        const wz =
          (velocity.y[domain.index(x + 1, y, z)] - velocity.y[domain.index(x - 1, y, z)] -
            velocity.x[domain.index(x, y + 1, z)] +
            velocity.x[domain.index(x, y - 1, z)]) * 0.5
        const vorticity = Math.hypot(wx, wy, wz)
        const temperatureGradient = Math.abs(
          temperature.values[domain.index(x, y + 1, z)] -
            temperature.values[domain.index(x, y - 1, z)],
        )
        const noise = fbm3D(
          localX * 4.5 + elapsedSeconds * 0.6,
          normalizedY * 6.8 - elapsedSeconds * 0.85,
          localZ * 4.5 + elapsedSeconds * 0.45,
          3,
        )

        turbulence.values[index] = clamp01(
          vorticity * 0.18 + temperatureGradient * 0.45 + noise * 0.16,
        )
      }
    }
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
