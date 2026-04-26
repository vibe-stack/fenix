import { createScalarEmitter, createVelocityEmitter, createLight, type NewFilePreset } from './types'

// Smoke grenade cluster: real M18 smoke grenades vent from a hole in the side under pressure.
// They do NOT form smooth rising orbs — the smoke jets out sideways and low, then billows up.
// Key characteristics:
// 1. Each grenade has a directional jet (not radial) — smoke exits the canister at an angle
// 2. The smoke is DENSE and low — it hugs the ground before rising
// 3. Different grenades have different vent directions (they land at different angles)
// 4. The cloud spreads along the ground before billowing up in wind
// 5. High vorticityDensityMask is correct for cold smoke — keep it
// Fix: replace smooth round emitters with narrow venting jets + ground spill
export const smokeGrenadeClusterPreset: NewFilePreset = {
  id: 'smoke-grenade-cluster',
  label: 'Smoke Grenade Cluster',
  description: 'Three staggered smoke grenades venting asymmetrically, pooling low before rising in crosswind.',
  emitters: [
    // Grenade A — vents to the left-forward, dense low jet
    createScalarEmitter('Grenade A Vent', {
      positionX: 0.34, positionY: 0.058, positionZ: 0.56,
      radius: 0.036,
      startTime: 0,
      duration: 8.5,
      densityRate: 3.2,
      heatRate: 0.02,
      fuelRate: 0,
      noiseScale: 38,
      noiseMix: 0.95,
      seed: 1213,
    }),
    createVelocityEmitter('Grenade A Jet', {
      positionX: 0.34, positionY: 0.058, positionZ: 0.56,
      radius: 0.048,
      startTime: 0,
      duration: 8.5,
      mode: 'directional',
      speed: 13.5,
      directionX: -0.45, directionY: 0.55, directionZ: 0.28,
      falloff: 0.84,
      tightness: 0.42,
      seed: 1215,
    }),
    // Grenade B — vents right-forward, slightly different angle and timing
    createScalarEmitter('Grenade B Vent', {
      positionX: 0.5, positionY: 0.058, positionZ: 0.44,
      radius: 0.039,
      startTime: 1.1,
      duration: 9.0,
      densityRate: 3.45,
      heatRate: 0.02,
      fuelRate: 0,
      noiseScale: 36,
      noiseMix: 0.93,
      seed: 1229,
    }),
    createVelocityEmitter('Grenade B Jet', {
      positionX: 0.5, positionY: 0.058, positionZ: 0.44,
      radius: 0.054,
      startTime: 1.1,
      duration: 9.0,
      mode: 'directional',
      speed: 15.5,
      directionX: 0.38, directionY: 0.62, directionZ: -0.18,
      falloff: 0.82,
      tightness: 0.4,
      seed: 1231,
    }),
    // Grenade C — vents more upward, grenade landed more upright
    createScalarEmitter('Grenade C Vent', {
      positionX: 0.66, positionY: 0.058, positionZ: 0.57,
      radius: 0.033,
      startTime: 2.2,
      duration: 8.0,
      densityRate: 3.0,
      heatRate: 0.02,
      fuelRate: 0,
      noiseScale: 40,
      noiseMix: 0.94,
      seed: 1237,
    }),
    createVelocityEmitter('Grenade C Jet', {
      positionX: 0.66, positionY: 0.058, positionZ: 0.57,
      radius: 0.045,
      startTime: 2.2,
      duration: 8.0,
      mode: 'directional',
      speed: 12,
      directionX: -0.18, directionY: 0.82, directionZ: 0.14,
      falloff: 0.84,
      tightness: 0.36,
      seed: 1239,
    }),
    // Ground pooling — dense smoke sinking and pooling along the ground before lifting
    createVelocityEmitter('Ground Pool Spread', {
      positionX: 0.5, positionY: 0.052, positionZ: 0.52,
      radius: 0.45,
      startTime: 0.4,
      duration: 9999,
      mode: 'radial',
      speed: 5.2,
      directionX: 0, directionY: 0, directionZ: 0,
      falloff: 0.8,
      tightness: 0.1,
      seed: 1249,
    }),
    // Slow billow once the cloud builds mass — breaks the flat carpet into rolling billows
    createVelocityEmitter('Cloud Billow', {
      positionX: 0.5, positionY: 0.1, positionZ: 0.52,
      radius: 0.52,
      startTime: 2.5,
      duration: 9999,
      mode: 'turbulent',
      speed: 5.8,
      directionX: 0, directionY: 1, directionZ: 0,
      falloff: 0.9,
      tightness: 0.055,
      seed: 1259,
    }),
  ],
  graphEdges: [
    { source: 0, target: 1 },
    { source: 1, target: 'combustion' },
    { source: 2, target: 3 },
    { source: 3, target: 'combustion' },
    { source: 4, target: 5 },
    { source: 5, target: 'combustion' },
    { source: 6, target: 'combustion' },
    { source: 7, target: 'combustion' },
  ],
  lights: [
    createLight('Flat Overcast', {
      lightType: 'directional',
      dirX: -0.2, dirY: 0.96, dirZ: 0.18,
      posX: 0.5, posY: 0.86, posZ: 0.5,
      intensity: 1.35,
      colorR: 0.92, colorG: 0.95, colorB: 1.0,
    }),
  ],
  runtimeParams: {
    wind: [0.055, 0, -0.015],
    windStrength: 0.2,
    gravity: [0, -1, 0],
    gravityStrength: 0.48,
    buoyancy: 0.58,
    vorticityStrength: 2.15,
    vorticityConstantMask: 0.3,
    vorticityVelocityMask: 0.4,
    vorticityHeatMask: 0,
    vorticityDensityMask: 0.44,
    worldSize: 28,
  },
  renderOutput: {
    displayMode: 'density',
    stepCount: 450,
    scatteringForward: 0.28,
    scatteringBack: -0.13,
  },
}
