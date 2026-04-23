export interface ExplosionSource {
  position: readonly [number, number, number]
  radius: number
  startTime: number
  duration: number
  densityYield: number
  heatYield: number
  fuelYield: number
  reactionYield: number
  radialImpulse: number
  liftImpulse: number
}

export const cinematicExplosionSources: readonly ExplosionSource[] = [
  source([0.5, 0.11, 0.5], 0.2, 0.03, 0.74, 0.44, 45.0, 20.0, 1.0, 36.0, 5.8),
  source([0.4, 0.13, 0.45], 0.13, 0.14, 0.62, 0.24, 30.0, 11.0, 0.92, 20.0, 3.2),
  source([0.61, 0.14, 0.57], 0.13, 0.2, 0.62, 0.24, 29.0, 10.5, 0.9, 20.0, 3.2),
  source([0.5, 0.25, 0.5], 0.22, 1.0, 1.45, 4.1, 17.0, 5.0, 0.92, 8.0, 12.5),
  source([0.46, 0.43, 0.42], 0.16, 1.72, 1.65, 3.5, 8.5, 1.8, 0.54, 3.6, 7.5),
  source([0.55, 0.61, 0.58], 0.18, 2.55, 1.95, 5.0, 4.6, 0.8, 0.34, 1.8, 5.8),
]

export function packExplosionSources(sources: readonly ExplosionSource[]) {
  const floatsPerSource = 16
  const data = new Float32Array(sources.length * floatsPerSource)

  sources.forEach((source, index) => {
    const offset = index * floatsPerSource

    data.set([...source.position, source.radius], offset)
    data.set([source.startTime, source.duration, 0, 0], offset + 4)
    data.set([
      source.densityYield,
      source.heatYield,
      source.fuelYield,
      source.reactionYield,
    ], offset + 8)
    data.set([source.radialImpulse, source.liftImpulse, 0, 0], offset + 12)
  })

  return data
}

function source(
  position: readonly [number, number, number],
  radius: number,
  startTime: number,
  duration: number,
  densityYield: number,
  heatYield: number,
  fuelYield: number,
  reactionYield: number,
  radialImpulse: number,
  liftImpulse: number,
): ExplosionSource {
  return {
    position,
    radius,
    startTime,
    duration,
    densityYield,
    heatYield,
    fuelYield,
    reactionYield,
    radialImpulse,
    liftImpulse,
  }
}
