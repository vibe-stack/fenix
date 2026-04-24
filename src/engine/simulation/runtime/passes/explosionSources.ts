export interface ExplosionSource {
  /** Normalized domain-space center of the source, where each axis is 0..1. */
  position: readonly [number, number, number]
  /** Normalized source radius. The shader expands into this radius over the source lifetime. */
  radius: number
  /** Local simulation time, in seconds, when this source starts emitting pre-blast smoke. */
  startTime: number
  /** Seconds of mostly dark smoke emission before the flash/shock ignites. Use 0 for instant ignition. */
  smokeLeadTime: number
  /** Seconds for the hard radial shock and rapid heat-up. Shorter values feel more explosive. */
  blastDuration: number
  /** Seconds for residual fuel, lift, and smoke after the blast flash. This is not a heat hold. */
  plumeDuration: number
  /** Smoke mass added by the source. Good range: 2..14; higher values make darker clouds. */
  densityYield: number
  /** Flash heat added during blastDuration. Good range: 3..18; patch-masked, not uniform. */
  heatYield: number
  /** Combustible gas added by the source. Good range: 2..16; keeps hot pockets burning. */
  fuelYield: number
  /** Initial reaction intensity. Good range: 1..8; very high values saturate quickly. */
  reactionYield: number
  /** Expanding shell velocity. Good range: 15..80; pushes material away from the center. */
  radialImpulse: number
  /** Broad upward plume velocity. Good range: 0..30; usually lower than radialImpulse. */
  liftImpulse: number
  /** 0..1 mask strength that prevents the whole orb from heating uniformly. */
  heatPatchiness: number
  /** Noise frequency for thermal/density breakup. Larger values create smaller pockets. */
  patchScale: number
  /** Small residual heat bias near the updraft. Good range: 0..0.8; fuel carries most core fire. */
  coreHeat: number
  /** Narrow extra updraft force. Good range: 0..24; this no longer paints a heat cylinder. */
  coreLift: number
  /** Randomized lateral impulse strength used to shred the expanding shell. Good range: 2..14. */
  turbulence: number
  /** Early inward/outward shredding around cool smoke pockets. Good range: 4..24. */
  crumbleStrength: number
  /** Per-source random seed for stable but non-identical patches. */
  seed: number
}
const delay = 0
export const cinematicExplosionSources: readonly ExplosionSource[] = [
  source({
    position: [0.5, 0.11, 0.5],
    radius: 0.15,
    startTime: delay + 0.03,
    smokeLeadTime: 0.14,
    blastDuration: 0.42,
    plumeDuration: 2.4,
    densityYield: 8,
    heatYield: 18.0,
    fuelYield: 24.0,
    reactionYield: 7.2,
    radialImpulse: 72.0,
    liftImpulse: 24.0,
    heatPatchiness: 0.78,
    patchScale: 42.0,
    coreHeat: 25.72,
    coreLift: 3.0,
    turbulence: 12.0,
    crumbleStrength: 6.0,
    seed: 11.0,
  }),
  // source({
  //   position: [0.7, 0.1, 0.5],
  //   radius: 0.2,
  //   startTime: delay + 4.03,
  //   smokeLeadTime: 0.12,
  //   blastDuration: 0.36,
  //   plumeDuration: 1.4,
  //   densityYield: 12.4,
  //   heatYield: 14.0,
  //   fuelYield: 4.0,
  //   reactionYield: 4.05,
  //   radialImpulse: 48.0,
  //   liftImpulse: 22.0,
  //   heatPatchiness: 0.7,
  //   patchScale: 24.0,
  //   coreHeat: 0.35,
  //   coreLift: 12.0,
  //   turbulence: 6.0,
  //   crumbleStrength: 12.0,
  //   seed: 29.0,
  // }),
]

export function packExplosionSources(sources: readonly ExplosionSource[]) {
  const floatsPerSource = 24
  const data = new Float32Array(sources.length * floatsPerSource)

  sources.forEach((source, index) => {
    const offset = index * floatsPerSource

    data.set([...source.position, source.radius], offset)
    data.set([
      source.startTime,
      source.smokeLeadTime,
      source.blastDuration,
      source.plumeDuration,
    ], offset + 4)
    data.set([
      source.densityYield,
      source.heatYield,
      source.fuelYield,
      source.reactionYield,
    ], offset + 8)
    data.set([
      source.radialImpulse,
      source.liftImpulse,
      source.turbulence,
      source.crumbleStrength,
    ], offset + 12)
    data.set([
      source.patchScale,
      source.coreHeat,
      source.coreLift,
      source.heatPatchiness,
    ], offset + 16)
    data.set([source.seed, 0, 0, 0], offset + 20)
  })

  return data
}

function source(source: ExplosionSource): ExplosionSource {
  return source
}
