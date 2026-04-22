import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'

export interface DenseVectorField {
  domain: DenseVolumeDomain
  x: Float32Array
  y: Float32Array
  z: Float32Array
}

export function createDenseVectorField(
  domain: DenseVolumeDomain,
): DenseVectorField {
  return {
    domain,
    x: new Float32Array(domain.voxelCount),
    y: new Float32Array(domain.voxelCount),
    z: new Float32Array(domain.voxelCount),
  }
}

export function swapDenseVectorFieldValues(
  a: DenseVectorField,
  b: DenseVectorField,
) {
  const x = a.x
  const y = a.y
  const z = a.z

  a.x = b.x
  a.y = b.y
  a.z = b.z
  b.x = x
  b.y = y
  b.z = z
}
