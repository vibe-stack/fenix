import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'

export interface DenseScalarField {
  domain: DenseVolumeDomain
  values: Float32Array
}

export function createDenseScalarField(
  domain: DenseVolumeDomain,
  initialValue = 0,
): DenseScalarField {
  const values = new Float32Array(domain.voxelCount)

  if (initialValue !== 0) {
    values.fill(initialValue)
  }

  return {
    domain,
    values,
  }
}

export function fillDenseScalarField(
  field: DenseScalarField,
  value: number,
) {
  field.values.fill(value)
}

export function swapDenseScalarFieldValues(
  a: DenseScalarField,
  b: DenseScalarField,
) {
  const values = a.values

  a.values = b.values
  b.values = values
}
