import type { DenseScalarField } from '../fields/createDenseScalarField'
import type { DenseVectorField } from '../fields/createDenseVectorField'

interface ApplyBuoyancyForceOptions {
  density: DenseScalarField
  temperature: DenseScalarField
  velocity: DenseVectorField
  stepSeconds: number
}

export function applyBuoyancyForce({
  density,
  temperature,
  velocity,
  stepSeconds,
}: ApplyBuoyancyForceOptions) {
  const densityValues = density.values
  const temperatureValues = temperature.values
  const velocityX = velocity.x
  const velocityY = velocity.y
  const velocityZ = velocity.z
  const horizontalDamping = Math.max(0, 1 - stepSeconds * 0.55)

  for (let index = 0; index < densityValues.length; index += 1) {
    const lift = (temperatureValues[index] * 1.9 - densityValues[index] * 0.42) * stepSeconds * 2.8

    velocityY[index] = clamp(velocityY[index] + lift, -4.5, 8.5)
    velocityX[index] *= horizontalDamping
    velocityZ[index] *= horizontalDamping
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
