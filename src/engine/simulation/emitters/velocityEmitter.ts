export type VelocityMode = 'radial' | 'directional' | 'turbulent'

/** Injects velocity into a sphere. Completely decoupled from scalar fields. */
export interface VelocityEmitter {
  readonly kind: 'velocity'
  position: readonly [number, number, number]
  radius: number
  startTime: number
  /** Duration of the velocity injection. Short = impulse, long = sustained jet. */
  duration: number
  mode: VelocityMode
  /** Speed in voxels/s (radial outward, or along direction, or turbulent magnitude). */
  speed: number
  /** Direction for 'directional' mode. Ignored for radial/turbulent. */
  direction: readonly [number, number, number]
  /** Falloff sharpness: 0 = flat top hat, 1 = gaussian. */
  falloff: number
  /** 0 = add to the existing field, 1 = locally replace it. */
  tightness?: number
  seed: number
}
