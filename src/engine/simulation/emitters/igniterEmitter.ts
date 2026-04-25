/** Seeds the reaction field to ignite nearby fuel. One-shot. */
export interface IgniterEmitter {
  readonly kind: 'igniter'
  position: readonly [number, number, number]
  radius: number
  startTime: number
  /** How long the ignition spark persists (typically 0.05–0.3s). */
  duration: number
  /** Peak reaction intensity written into the field (0–1). */
  intensity: number
  seed: number
}
