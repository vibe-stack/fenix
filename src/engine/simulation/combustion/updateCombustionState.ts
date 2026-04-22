import type { DenseScalarField } from '../fields/createDenseScalarField'

interface UpdateCombustionStateOptions {
  density: DenseScalarField
  temperature: DenseScalarField
  fuel: DenseScalarField
  stepSeconds: number
}

export function updateCombustionState({
  density,
  temperature,
  fuel,
  stepSeconds,
}: UpdateCombustionStateOptions) {
  const densityValues = density.values
  const temperatureValues = temperature.values
  const fuelValues = fuel.values

  for (let index = 0; index < densityValues.length; index += 1) {
    const availableFuel = fuelValues[index]
    const localDensity = densityValues[index]
    const localTemperature = temperatureValues[index]
    const burn = Math.min(
      availableFuel,
      Math.max(0, localTemperature * 0.42 + localDensity * 0.18) * stepSeconds * 1.8,
    )
    const cooling = (0.16 + localDensity * 0.08) * stepSeconds
    const smokeLift = burn * 0.34

    fuelValues[index] = clamp01(availableFuel - burn)
    temperatureValues[index] = clamp01(localTemperature + burn * 1.45 - cooling)
    densityValues[index] = clamp01(localDensity + smokeLift - stepSeconds * 0.026)
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}
