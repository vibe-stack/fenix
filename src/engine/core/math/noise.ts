function fract(value: number) {
  return value - Math.floor(value)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))

  return t * t * (3 - 2 * t)
}

function hash3(x: number, y: number, z: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123)
}

export function valueNoise3D(x: number, y: number, z: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const z1 = z0 + 1

  const tx = smoothstep(0, 1, x - x0)
  const ty = smoothstep(0, 1, y - y0)
  const tz = smoothstep(0, 1, z - z0)

  const c000 = hash3(x0, y0, z0)
  const c100 = hash3(x1, y0, z0)
  const c010 = hash3(x0, y1, z0)
  const c110 = hash3(x1, y1, z0)
  const c001 = hash3(x0, y0, z1)
  const c101 = hash3(x1, y0, z1)
  const c011 = hash3(x0, y1, z1)
  const c111 = hash3(x1, y1, z1)

  const x00 = lerp(c000, c100, tx)
  const x10 = lerp(c010, c110, tx)
  const x01 = lerp(c001, c101, tx)
  const x11 = lerp(c011, c111, tx)
  const y0Blend = lerp(x00, x10, ty)
  const y1Blend = lerp(x01, x11, ty)

  return lerp(y0Blend, y1Blend, tz)
}

export function fbm3D(
  x: number,
  y: number,
  z: number,
  octaves = 4,
) {
  let amplitude = 0.5
  let frequency = 1
  let sum = 0
  let normalization = 0

  for (let index = 0; index < octaves; index += 1) {
    sum += valueNoise3D(x * frequency, y * frequency, z * frequency) * amplitude
    normalization += amplitude
    frequency *= 2
    amplitude *= 0.5
  }

  return normalization > 0 ? sum / normalization : 0
}
