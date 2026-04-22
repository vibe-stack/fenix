export interface Vector3 {
  x: number
  y: number
  z: number
}

export function createVector3(x = 0, y = 0, z = 0): Vector3 {
  return { x, y, z }
}

export function addVector3(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }
}

export function subtractVector3(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }
}

export function scaleVector3(vector: Vector3, scalar: number): Vector3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar,
  }
}

export function dotVector3(a: Vector3, b: Vector3) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function crossVector3(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

export function lengthVector3(vector: Vector3) {
  return Math.hypot(vector.x, vector.y, vector.z)
}

export function normalizeVector3(vector: Vector3): Vector3 {
  const length = lengthVector3(vector)

  if (length <= 1e-6) {
    return createVector3()
  }

  return scaleVector3(vector, 1 / length)
}
