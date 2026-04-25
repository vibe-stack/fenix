/** Injects density, temperature, and/or fuel into a sphere at a constant rate. */
export interface ScalarEmitter {
  readonly kind: 'scalar'
  position: readonly [number, number, number]
  /** Normalized domain radius of the emitter sphere. */
  radius: number
  startTime: number
  /** How long the emitter stays active. Use a very large number for continuous. */
  duration: number
  /** Smoke mass per second. 0 = no density injection. */
  densityRate: number
  /** Temperature per second. 0 = no heat injection. */
  heatRate: number
  /** Combustible fuel per second. 0 = no fuel injection. */
  fuelRate: number
  /** Noise frequency for spatial variation inside the sphere (0 = uniform). */
  noiseScale: number
  /** 0 = uniform emission, 1 = fully noise-modulated. */
  noiseMix: number
  seed: number
}
