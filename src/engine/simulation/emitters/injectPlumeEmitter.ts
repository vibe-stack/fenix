import { fbm3D } from '../../core/math/noise'
import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'
import type { DenseScalarField } from '../fields/createDenseScalarField'
import type { DenseVectorField } from '../fields/createDenseVectorField'

interface InjectPlumeEmitterOptions {
  domain: DenseVolumeDomain
  density: DenseScalarField
  temperature: DenseScalarField
  fuel: DenseScalarField
  velocity: DenseVectorField
  elapsedSeconds: number
  stepSeconds: number
}

export function injectPlumeEmitter({
  domain,
  density,
  temperature,
  fuel,
  velocity,
  elapsedSeconds,
  stepSeconds,
}: InjectPlumeEmitterOptions) {
  const emitterHeight = Math.max(6, Math.floor(domain.height * 0.24))

  for (let z = 1; z < domain.depth - 1; z += 1) {
    const normalizedZ = (z + 0.5) / domain.depth
    const localZ = normalizedZ * 2 - 1

    for (let y = 1; y < emitterHeight; y += 1) {
      const normalizedY = (y + 0.5) / domain.height
      const plumeFade = 1 - smoothstep(0.16, 0.34, normalizedY)

      for (let x = 1; x < domain.width - 1; x += 1) {
        const normalizedX = (x + 0.5) / domain.width
        const localX = normalizedX * 2 - 1
        const index = domain.index(x, y, z)
        const radialDistance = Math.hypot(localX, localZ)
        const radius = 0.13 + normalizedY * 0.09

        if (radialDistance > radius * 2.4) {
          continue
        }

        const phase = elapsedSeconds * 1.3 + normalizedY * 8.5
        const noise = fbm3D(
          localX * 3.2 + elapsedSeconds * 0.75,
          normalizedY * 5.6 - elapsedSeconds * 1.25,
          localZ * 3.2 + elapsedSeconds * 0.42,
          3,
        )
        const column = Math.exp(-((radialDistance * radialDistance) / Math.max(radius * radius, 0.0001)))
        const pulse = 0.84 + 0.16 * Math.sin(phase + localX * 3.6 - localZ * 2.8)
        const source = column * plumeFade * (0.68 + noise * 0.32) * pulse * stepSeconds
        const swirl = (noise - 0.5) * 2

        density.values[index] = clamp01(density.values[index] + source * 2.1)
        temperature.values[index] = clamp01(temperature.values[index] + source * 2.7)
        fuel.values[index] = clamp01(fuel.values[index] + source * 2.35)
        velocity.y[index] = clamp(velocity.y[index] + source * 5.4, -3.5, 7.2)
        velocity.x[index] = clamp(velocity.x[index] + (-localZ * 1.5 + swirl * 0.4) * source, -2.8, 2.8)
        velocity.z[index] = clamp(velocity.z[index] + (localX * 1.5 - swirl * 0.4) * source, -2.8, 2.8)
      }
    }
  }
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)

  return t * t * (3 - 2 * t)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}
