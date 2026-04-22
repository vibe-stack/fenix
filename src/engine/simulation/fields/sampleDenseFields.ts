import type { DenseVolumeDomain } from '../domain/createDenseVolumeDomain'

export function sampleScalarTrilinear(
  domain: DenseVolumeDomain,
  values: Float32Array,
  x: number,
  y: number,
  z: number,
) {
  const localX = clamp(x - 0.5, 0, domain.width - 1)
  const localY = clamp(y - 0.5, 0, domain.height - 1)
  const localZ = clamp(z - 0.5, 0, domain.depth - 1)
  const x0 = Math.floor(localX)
  const y0 = Math.floor(localY)
  const z0 = Math.floor(localZ)
  const x1 = Math.min(x0 + 1, domain.width - 1)
  const y1 = Math.min(y0 + 1, domain.height - 1)
  const z1 = Math.min(z0 + 1, domain.depth - 1)
  const tx = localX - x0
  const ty = localY - y0
  const tz = localZ - z0

  const c000 = values[domain.index(x0, y0, z0)]
  const c100 = values[domain.index(x1, y0, z0)]
  const c010 = values[domain.index(x0, y1, z0)]
  const c110 = values[domain.index(x1, y1, z0)]
  const c001 = values[domain.index(x0, y0, z1)]
  const c101 = values[domain.index(x1, y0, z1)]
  const c011 = values[domain.index(x0, y1, z1)]
  const c111 = values[domain.index(x1, y1, z1)]

  const x00 = lerp(c000, c100, tx)
  const x10 = lerp(c010, c110, tx)
  const x01 = lerp(c001, c101, tx)
  const x11 = lerp(c011, c111, tx)
  const yBlend0 = lerp(x00, x10, ty)
  const yBlend1 = lerp(x01, x11, ty)

  return lerp(yBlend0, yBlend1, tz)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
