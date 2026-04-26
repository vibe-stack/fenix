/** One-shot scalar, reaction, and pressure source. */
export interface BurstEmitter {
  readonly kind: 'burst'
  position: readonly [number, number, number]
  radius: number
  startTime: number
  /** Duration over which the total amounts are released. */
  duration: number
  densityAmount: number
  heatAmount: number
  fuelAmount: number
  reactionAmount: number
  /** Radial velocity impulse in voxels/s. */
  expansionSpeed: number
  /** Upward velocity bias in voxels/s. */
  liftSpeed: number
  /** Procedural velocity breakup in voxels/s. */
  turbulenceSpeed: number
  /** Falloff sharpness: 0 = broad, 1 = concentrated. */
  falloff: number
  noiseScale: number
  noiseMix: number
  seed: number
}
