import type { EmitterSource } from './emitterSource'

const KIND_SCALAR = 0
const KIND_VELOCITY = 1
const KIND_IGNITER = 2

const VELOCITY_MODE_INDEX = { radial: 0, directional: 1, turbulent: 2 } as const

/** Floats per source — must match the EmitterSource struct in every inject shader. */
export const FLOATS_PER_EMITTER = 32

/**
 * Packs an array of EmitterSources into a flat Float32Array for GPU upload.
 * Layout (8 vec4s per source):
 *   [0]  positionRadius: xyz=position, w=radius
 *   [1]  timing:         x=startTime,  y=duration, zw=0
 *   [2]  scalarYields:   x=densityRate, y=heatRate, z=fuelRate, w=0
 *   [3]  velocity:       x=speed, y=modeIndex, z=falloff, w=0
 *   [4]  direction:      xyz=direction, w=0
 *   [5]  noise:          x=noiseScale, y=noiseMix, z=intensity, w=0
 *   [6]  padding
 *   [7]  _meta:           x=kind(0/1/2), y=seed, zw=0
 */
export function packEmitterSources(sources: readonly EmitterSource[]): Float32Array {
  const data = new Float32Array(sources.length * FLOATS_PER_EMITTER)

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i]
    const o = i * FLOATS_PER_EMITTER

    data[o + 0] = src.position[0]
    data[o + 1] = src.position[1]
    data[o + 2] = src.position[2]
    data[o + 3] = src.radius

    data[o + 4] = src.startTime
    data[o + 5] = src.duration

    data[o + 29] = src.seed

    if (src.kind === 'scalar') {
      data[o + 8] = src.densityRate
      data[o + 9] = src.heatRate
      data[o + 10] = src.fuelRate
      data[o + 20] = src.noiseScale
      data[o + 21] = src.noiseMix
      data[o + 28] = KIND_SCALAR
    } else if (src.kind === 'velocity') {
      data[o + 12] = src.speed
      data[o + 13] = VELOCITY_MODE_INDEX[src.mode]
      data[o + 14] = src.falloff
      data[o + 16] = src.direction[0]
      data[o + 17] = src.direction[1]
      data[o + 18] = src.direction[2]
      data[o + 28] = KIND_VELOCITY
    } else {
      data[o + 22] = src.intensity
      data[o + 28] = KIND_IGNITER
    }
  }

  return data
}
