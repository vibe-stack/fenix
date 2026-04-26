import { createScalarEmitter, createVelocityEmitter, createLight, type NewFilePreset } from './types'

// Steady smoke crosswind: a continuous smoke source (chimney, exhaust, burning material)
// with a persistent lateral wind. The "two merging smoke bombs" problem comes from:
// 1. The source emitter was too wide (radius 0.045 = big blob, not a point source)
// 2. The wind wasn't strong/directional enough to actually bend the plume
// 3. Only one source — a real crosswind plume has one clear source and a bent rising column
// Fix: narrow the source, add strong lateral wind that kicks in just above the source,
// and use turbulence at mid-height to break the column into realistic puffs.
export const steadySmokeCrosswindPreset: NewFilePreset = {
  id: 'steady-smoke-crosswind',
  label: 'Steady Smoke Crosswind',
  description: 'Single continuous smoke source bent by persistent crosswind into a long drifting plume.',
  emitters: [
    // Point source — tight, dense. Think chimney or exhaust pipe.
    createScalarEmitter('Smoke Source', {
      positionX: 0.28, positionY: 0.065, positionZ: 0.55,
      radius: 0.016,
      startTime: 0,
      duration: 9999,
      densityRate: 2.4,
      heatRate: 0.05,
      fuelRate: 0,
      noiseScale: 28,
      noiseMix: 0.85,
      seed: 1011,
    }),
    // Exit jet — gives the smoke initial upward momentum as it leaves the source
    createVelocityEmitter('Exit Jet', {
      positionX: 0.28, positionY: 0.068, positionZ: 0.55,
      radius: 0.022,
      startTime: 0,
      duration: 9999,
      mode: 'directional',
      speed: 18,
      directionX: 0.04, directionY: 1, directionZ: -0.02,
      falloff: 0.92,
      tightness: 0.65,
      seed: 1021,
    }),
    // Crosswind — starts just above the source exit. Bends the rising column sideways.
    // Wide, horizontally dominant. This is the main feature of the preset.
    createVelocityEmitter('Crosswind', {
      positionX: 0.5, positionY: 0.18, positionZ: 0.52,
      radius: 0.48,
      startTime: 0,
      duration: 9999,
      mode: 'directional',
      speed: 24,
      directionX: 0.92, directionY: 0.06, directionZ: -0.18,
      falloff: 0.86,
      tightness: 0.05,
      seed: 1027,
    }),
    // Gentle ground-level side drag — the wind also affects the smoke bed near the source
    createVelocityEmitter('Ground Drag', {
      positionX: 0.38, positionY: 0.075, positionZ: 0.53,
      radius: 0.18,
      startTime: 0.3,
      duration: 9999,
      mode: 'directional',
      speed: 8,
      directionX: 0.88, directionY: 0.1, directionZ: -0.15,
      falloff: 0.9,
      tightness: 0.06,
      seed: 1029,
    }),
    // Plume shear turbulence — breaks the bent column into realistic rolling puffs.
    // Positioned downstream in the bent plume direction.
    createVelocityEmitter('Plume Puff Shear', {
      positionX: 0.6, positionY: 0.22, positionZ: 0.48,
      radius: 0.24,
      startTime: 0.6,
      duration: 9999,
      mode: 'turbulent',
      speed: 5.5,
      directionX: 0, directionY: 1, directionZ: 0,
      falloff: 0.96,
      tightness: 0.05,
      seed: 1033,
    }),
  ],
  lights: [
    createLight('Overcast Diffuse', {
      lightType: 'directional',
      dirX: -0.32, dirY: 0.90, dirZ: 0.24,
      posX: 0.5, posY: 0.85, posZ: 0.5,
      intensity: 1.25,
      colorR: 0.90, colorG: 0.93, colorB: 1.0,
    }),
  ],
  runtimeParams: {
    wind: [0.12, 0, -0.032],
    windStrength: 0.58,
    gravity: [0, -1, 0],
    gravityStrength: 0.44,
    buoyancy: 0.6,
    vorticityStrength: 2.0,
    vorticityConstantMask: 0.35,
    vorticityVelocityMask: 0.45,
    vorticityHeatMask: 0.0,
    vorticityDensityMask: 0.4,
    worldSize: 18,
  },
  renderOutput: {
    displayMode: 'density',
    stepCount: 400,
    scatteringForward: 0.26,
    scatteringBack: -0.12,
  },
}
