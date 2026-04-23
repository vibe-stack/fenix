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
  source([0.5, 0.11, 0.5], 0.18, 0.03, 0.72, 1.1, 26.0, 12.0, 1.0, 28.0, 6.0),
  source([0.39, 0.12, 0.45], 0.12, 0.08, 0.64, 0.8, 21.0, 8.5, 0.96, 20.0, 4.0),
  source([0.61, 0.12, 0.56], 0.12, 0.1, 0.64, 0.8, 20.0, 8.0, 0.95, 20.0, 4.0),
  source([0.48, 0.13, 0.35], 0.1, 0.13, 0.6, 0.55, 18.0, 7.0, 0.86, 18.0, 3.2),
  source([0.54, 0.14, 0.66], 0.11, 0.16, 0.62, 0.6, 17.0, 7.0, 0.84, 17.0, 3.4),
  source([0.5, 0.22, 0.5], 0.2, 0.85, 1.35, 5.8, 8.0, 2.6, 0.72, 8.0, 12.0),
  source([0.38, 0.28, 0.55], 0.14, 1.05, 1.3, 4.5, 5.4, 1.5, 0.5, 5.0, 8.8),
  source([0.62, 0.31, 0.46], 0.15, 1.12, 1.34, 4.8, 5.0, 1.3, 0.46, 4.8, 9.2),
  source([0.49, 0.42, 0.39], 0.13, 1.55, 1.55, 4.0, 3.8, 0.9, 0.36, 3.4, 7.0),
  source([0.54, 0.45, 0.62], 0.13, 1.68, 1.55, 4.2, 3.6, 0.8, 0.34, 3.2, 7.2),
  source([0.5, 0.58, 0.5], 0.18, 2.15, 1.95, 6.5, 2.4, 0.4, 0.22, 1.8, 5.8),
  source([0.39, 0.66, 0.53], 0.13, 2.55, 1.85, 4.8, 1.6, 0.2, 0.14, 1.2, 3.8),
  source([0.61, 0.7, 0.47], 0.13, 2.85, 1.9, 4.6, 1.4, 0.18, 0.12, 1.1, 3.5),
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
